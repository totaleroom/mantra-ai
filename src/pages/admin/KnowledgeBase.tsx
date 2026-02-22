import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Upload, FileText, Trash2, Loader2, Send, Tag } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useClientsList, useDocuments } from "@/hooks/useAdminData";

interface Document {
  id: string;
  file_name: string;
  status: string;
  created_at: string;
  chunk_index: number;
  role_tag: string | null;
  client_id: string;
  client_name?: string;
}

const roleTagColors: Record<string, string> = {
  admin: "bg-blue-500/15 text-blue-700 border-blue-500/30",
  warehouse: "bg-amber-500/15 text-amber-700 border-amber-500/30",
  owner: "bg-purple-500/15 text-purple-700 border-purple-500/30",
};

export default function KnowledgeBase() {
  const [filterClientId, setFilterClientId] = useState("all");
  const [uploadClientId, setUploadClientId] = useState("");
  const [uploading, setUploading] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatResponse, setChatResponse] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [uploadRoleTag, setUploadRoleTag] = useState<string>("none");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: clients = [] } = useClientsList();
  const { data: documents = [], isLoading: loading } = useDocuments(filterClientId, clients);

  const invalidateDocs = () => queryClient.invalidateQueries({ queryKey: ["documents"] });

  const handleUpload = async (files: FileList | null) => {
    if (!files || !uploadClientId) {
      if (!uploadClientId) toast({ variant: "destructive", title: "Pilih target client dulu" });
      return;
    }
    setUploading(true);
    for (const file of Array.from(files)) {
      const ext = file.name.split(".").pop()?.toLowerCase();
      if (!["pdf", "txt"].includes(ext || "")) {
        toast({ variant: "destructive", title: "Format tidak didukung", description: `${file.name} - hanya PDF dan TXT.` });
        continue;
      }
      const path = `${uploadClientId}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage.from("knowledge").upload(path, file);
      if (uploadError) {
        toast({ variant: "destructive", title: "Upload gagal", description: uploadError.message });
        continue;
      }
      const insertData: any = {
        client_id: uploadClientId, file_name: file.name, file_path: path, status: "processing",
      };
      if (uploadRoleTag && uploadRoleTag !== "none") insertData.role_tag = uploadRoleTag;
      const { data: docData } = await (supabase.from("documents" as any).insert(insertData) as any).select("id").single();

      if (docData?.id) {
        supabase.functions.invoke("process-document", {
          body: { document_id: docData.id },
        }).then(() => invalidateDocs());
      }
      toast({ title: `${file.name} diupload, sedang diproses...` });
    }
    setUploading(false);
    invalidateDocs();
  };

  const handleDelete = async (doc: Document) => {
    await supabase.from("documents" as any).delete().eq("id", doc.id);
    toast({ title: "Dokumen dihapus" });
    invalidateDocs();
  };

  const handleUpdateRoleTag = async (doc: Document, newTag: string | null) => {
    await supabase.from("documents" as any).update({ role_tag: newTag } as any).eq("id", doc.id);
    toast({ title: "Role tag diperbarui" });
    invalidateDocs();
  };

  const handleTestChat = async () => {
    const targetClient = filterClientId !== "all" ? filterClientId : uploadClientId;
    if (!chatInput.trim() || !targetClient) {
      if (!targetClient) toast({ variant: "destructive", title: "Pilih client dulu" });
      return;
    }
    setChatLoading(true);
    setChatResponse("");
    try {
      const { data, error } = await supabase.functions.invoke("test-rag", {
        body: { client_id: targetClient, question: chatInput },
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
      case "ready": return <Badge className="bg-green-500/20 text-green-700 border-green-500/30 text-[10px]">Ready</Badge>;
      case "processing": return <Badge className="bg-yellow-500/20 text-yellow-700 border-yellow-500/30 text-[10px]">Processing</Badge>;
      default: return <Badge className="bg-red-500/20 text-red-700 border-red-500/30 text-[10px]">Error</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Knowledge Base</h1>

      {/* Upload Zone */}
      <div
        className={`rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
          dragOver ? "border-primary bg-primary/5" : "border-border"
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); handleUpload(e.dataTransfer.files); }}
      >
        <Upload className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
        <p className="mb-3 text-xs text-muted-foreground">Drag & drop PDF/TXT di sini</p>
        <div className="flex flex-wrap justify-center gap-2 mb-3">
          <Select value={uploadClientId} onValueChange={setUploadClientId}>
            <SelectTrigger className="w-48 h-8 text-xs">
              <SelectValue placeholder="Target Client" />
            </SelectTrigger>
            <SelectContent>
              {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={uploadRoleTag} onValueChange={setUploadRoleTag}>
            <SelectTrigger className="w-40 h-8 text-xs">
              <SelectValue placeholder="Role Tag (opsional)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Semua Role</SelectItem>
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

      {/* Filter */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Filter Client:</span>
        <Select value={filterClientId} onValueChange={setFilterClientId}>
          <SelectTrigger className="w-48 h-8 text-xs">
            <SelectValue placeholder="Semua Client" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Client</SelectItem>
            {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Document Cards */}
      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : documents.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-8">Belum ada dokumen</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(documents as Document[]).map((doc) => (
            <div key={doc.id} className="relative rounded-lg border border-border bg-card p-4 hover:bg-muted/30 transition-colors">
              <div className="absolute top-2 right-2">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
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
              </div>
              <Badge variant="secondary" className="text-[10px] mb-2">{doc.client_name}</Badge>
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-sm font-medium text-foreground truncate">{doc.file_name}</span>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-1 cursor-pointer">
                      <Tag className="h-3 w-3 text-muted-foreground" />
                      <Badge
                        variant="outline"
                        className={`text-[10px] cursor-pointer ${doc.role_tag ? (roleTagColors[doc.role_tag] || "bg-muted text-muted-foreground") : "bg-muted text-muted-foreground"}`}
                      >
                        {doc.role_tag || "No Tag"}
                      </Badge>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => handleUpdateRoleTag(doc, null)}>No Tag</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleUpdateRoleTag(doc, "admin")}>Admin</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleUpdateRoleTag(doc, "warehouse")}>Warehouse</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleUpdateRoleTag(doc, "owner")}>Owner</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                {statusBadge(doc.status)}
              </div>
              <p className="text-[10px] text-muted-foreground">
                {new Date(doc.created_at).toLocaleDateString("id-ID")}
              </p>
            </div>
          ))}
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
  );
}
