import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Upload, FileText, Trash2, Loader2, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Client { id: string; name: string; }
interface Document { id: string; file_name: string; status: string; created_at: string; chunk_index: number; role_tag: string | null; }

export default function KnowledgeBase() {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatResponse, setChatResponse] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [uploadRoleTag, setUploadRoleTag] = useState<string>("");
  const { toast } = useToast();

  useEffect(() => {
    supabase.from("clients" as any).select("id, name").order("name").then(({ data }) => {
      setClients((data as any[] || []) as Client[]);
    });
  }, []);

  const fetchDocuments = async () => {
    if (!selectedClientId) return;
    setLoading(true);
    const { data } = await supabase
      .from("documents" as any)
      .select("id, file_name, status, created_at, chunk_index, role_tag")
      .eq("client_id", selectedClientId)
      .eq("chunk_index", 0)
      .order("created_at", { ascending: false });
    setDocuments((data as any[] || []) as Document[]);
    setLoading(false);
  };

  useEffect(() => { fetchDocuments(); }, [selectedClientId]);

  const handleUpload = async (files: FileList | null) => {
    if (!files || !selectedClientId) return;
    setUploading(true);
    for (const file of Array.from(files)) {
      const ext = file.name.split(".").pop()?.toLowerCase();
      if (!["pdf", "txt"].includes(ext || "")) {
        toast({ variant: "destructive", title: "Format tidak didukung", description: `${file.name} - hanya PDF dan TXT.` });
        continue;
      }
      const path = `${selectedClientId}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage.from("knowledge").upload(path, file);
      if (uploadError) {
        toast({ variant: "destructive", title: "Upload gagal", description: uploadError.message });
        continue;
      }
      const insertData: any = {
        client_id: selectedClientId,
        file_name: file.name,
        file_path: path,
        status: "processing",
      };
      if (uploadRoleTag) insertData.role_tag = uploadRoleTag;
      const { data: docData } = await (supabase.from("documents" as any).insert(insertData) as any).select("id").single();
      
      // Trigger process-document edge function
      if (docData?.id) {
        supabase.functions.invoke("process-document", {
          body: { document_id: docData.id },
        }).then(({ error: procErr }: any) => {
          if (procErr) console.error("Process document error:", procErr);
          fetchDocuments();
        });
      }
      toast({ title: `${file.name} diupload, sedang diproses...` });
    }
    setUploading(false);
    fetchDocuments();
  };

  const handleDelete = async (doc: Document) => {
    await supabase.from("documents" as any).delete().eq("id", doc.id);
    toast({ title: "Dokumen dihapus" });
    fetchDocuments();
  };

  const handleTestChat = async () => {
    if (!chatInput.trim() || !selectedClientId) return;
    setChatLoading(true);
    setChatResponse("");
    try {
      const { data, error } = await supabase.functions.invoke("test-rag", {
        body: { client_id: selectedClientId, question: chatInput },
      });
      if (error) throw error;
      setChatResponse(data?.answer || "Tidak ada jawaban.");
    } catch (err: any) {
      setChatResponse("Error: " + (err.message || "Gagal menghubungi server."));
    } finally {
      setChatLoading(false);
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "ready": return <Badge className="bg-green-500/20 text-green-700 border-green-500/30">Ready</Badge>;
      case "processing": return <Badge className="bg-yellow-500/20 text-yellow-700 border-yellow-500/30">Processing</Badge>;
      default: return <Badge className="bg-red-500/20 text-red-700 border-red-500/30">Error</Badge>;
    }
  };

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-foreground">Knowledge Base</h1>

      <div className="mb-6 max-w-sm">
        <Select value={selectedClientId} onValueChange={setSelectedClientId}>
          <SelectTrigger><SelectValue placeholder="Pilih Client..." /></SelectTrigger>
          <SelectContent>
            {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {!selectedClientId && <p className="text-muted-foreground">Pilih client untuk mengelola knowledge base.</p>}

      {selectedClientId && (
        <div className="space-y-6">
          {/* Upload Zone */}
          <div
            className={`rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
              dragOver ? "border-primary bg-primary/5" : "border-border"
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); handleUpload(e.dataTransfer.files); }}
          >
            <Upload className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
            <p className="mb-2 text-sm text-muted-foreground">Drag & drop PDF/TXT di sini</p>
            <div className="mb-3 flex justify-center">
              <Select value={uploadRoleTag} onValueChange={setUploadRoleTag}>
                <SelectTrigger className="w-48 h-8 text-xs">
                  <SelectValue placeholder="Role Tag (opsional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Semua Role</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="warehouse">Warehouse</SelectItem>
                  <SelectItem value="owner">Owner</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <label className="cursor-pointer">
              <Button variant="outline" size="sm" disabled={uploading} asChild>
                <span>
                  {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Pilih File
                </span>
              </Button>
              <input type="file" accept=".pdf,.txt" multiple className="hidden" onChange={(e) => handleUpload(e.target.files)} />
            </label>
          </div>

          {/* Documents List */}
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <div className="rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                     <TableHead>File</TableHead>
                     <TableHead>Role</TableHead>
                     <TableHead>Status</TableHead>
                     <TableHead>Tanggal</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">Belum ada dokumen</TableCell>
                    </TableRow>
                  ) : (
                    documents.map((doc) => (
                      <TableRow key={doc.id}>
                        <TableCell className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" /> {doc.file_name}
                        </TableCell>
                        <TableCell>
                          {doc.role_tag ? (
                            <Badge variant="outline" className="text-xs">{doc.role_tag}</Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>{statusBadge(doc.status)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(doc.created_at).toLocaleDateString("id-ID")}
                        </TableCell>
                        <TableCell className="text-right">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Hapus dokumen?</AlertDialogTitle>
                                <AlertDialogDescription>File "{doc.file_name}" akan dihapus.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Batal</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(doc)}>Hapus</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Test Chatbox */}
          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="mb-3 text-sm font-semibold text-foreground">Test Bot Response</h3>
            <div className="flex gap-2">
              <Input
                placeholder="Ketik pertanyaan untuk test RAG..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleTestChat()}
              />
              <Button size="icon" onClick={handleTestChat} disabled={chatLoading}>
                {chatLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
            {chatResponse && (
              <div className="mt-3 rounded-md bg-muted p-3 text-sm text-foreground whitespace-pre-wrap">
                {chatResponse}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
