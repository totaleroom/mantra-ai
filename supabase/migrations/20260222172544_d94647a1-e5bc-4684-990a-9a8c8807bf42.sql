
-- Task 1a: Update search_documents RPC with p_role_tag parameter
CREATE OR REPLACE FUNCTION public.search_documents(
  p_client_id uuid,
  p_query text,
  p_limit integer DEFAULT 3,
  p_role_tag text DEFAULT NULL
)
RETURNS TABLE(id uuid, content text, file_name text, chunk_index integer, rank real)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $function$
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
    AND (p_role_tag IS NULL OR d.role_tag = p_role_tag)
  ORDER BY rank DESC
  LIMIT p_limit;
$function$;

-- Task 3a: Add last_activity_at column to clients
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS last_activity_at timestamptz DEFAULT NULL;

-- Task 3a: Create trigger function to update last_activity_at
CREATE OR REPLACE FUNCTION public.update_client_last_activity()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  v_client_id uuid;
BEGIN
  SELECT client_id INTO v_client_id
  FROM public.wa_conversations
  WHERE id = NEW.conversation_id;

  IF v_client_id IS NOT NULL THEN
    UPDATE public.clients
    SET last_activity_at = NOW()
    WHERE id = v_client_id;
  END IF;

  RETURN NEW;
END;
$function$;

-- Task 3a: Create trigger on wa_messages
CREATE TRIGGER trg_update_client_last_activity
AFTER INSERT ON public.wa_messages
FOR EACH ROW
EXECUTE FUNCTION public.update_client_last_activity();
