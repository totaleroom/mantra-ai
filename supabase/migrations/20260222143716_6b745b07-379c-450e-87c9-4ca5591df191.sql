
-- Add tsvector column for full-text search
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS ts_content tsvector;

-- Create index for full-text search performance
CREATE INDEX IF NOT EXISTS idx_documents_ts_content ON public.documents USING GIN(ts_content);

-- Create function to auto-update ts_content when content changes
CREATE OR REPLACE FUNCTION public.documents_ts_content_trigger()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.content IS NOT NULL THEN
    NEW.ts_content = to_tsvector('indonesian', NEW.content);
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS trg_documents_ts_content ON public.documents;
CREATE TRIGGER trg_documents_ts_content
BEFORE INSERT OR UPDATE OF content ON public.documents
FOR EACH ROW
EXECUTE FUNCTION public.documents_ts_content_trigger();

-- Create search function for RAG
CREATE OR REPLACE FUNCTION public.search_documents(
  p_client_id uuid,
  p_query text,
  p_limit integer DEFAULT 3
)
RETURNS TABLE(id uuid, content text, file_name text, chunk_index integer, rank real)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT 
    d.id,
    d.content,
    d.file_name,
    d.chunk_index,
    ts_rank(d.ts_content, plainto_tsquery('indonesian', p_query)) AS rank
  FROM public.documents d
  WHERE d.client_id = p_client_id
    AND d.status = 'ready'
    AND d.content IS NOT NULL
    AND d.ts_content @@ plainto_tsquery('indonesian', p_query)
  ORDER BY rank DESC
  LIMIT p_limit;
$$;
