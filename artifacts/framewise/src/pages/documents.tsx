import { useListDocuments, useDeleteDocument } from "@workspace/api-client-react";
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { UploadCloud, File, Trash2, Search, FileText } from "lucide-react";
import { Input } from "@/components/ui/input";
import { uploadDocument } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";
import { getListDocumentsQueryKey } from "@workspace/api-client-react";
import { formatDate } from "@/lib/utils";

export function Documents() {
  const { data: documents, isLoading } = useListDocuments();
  const deleteDoc = useDeleteDocument();
  const queryClient = useQueryClient();
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [filter, setFilter] = useState("");

  const handleUpload = async (file: File) => {
    try {
      setIsUploading(true);
      await uploadDocument(file);
      queryClient.invalidateQueries({ queryKey: getListDocumentsQueryKey() });
    } catch (err) {
      console.error(err);
      alert("Failed to upload document");
    } finally {
      setIsUploading(false);
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleUpload(e.dataTransfer.files[0]);
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("Delete this document?")) {
      deleteDoc.mutate({ id }, {
        onSuccess: () => queryClient.invalidateQueries({ queryKey: getListDocumentsQueryKey() })
      });
    }
  };

  const filteredDocs = documents?.filter(d => d.filename.toLowerCase().includes(filter.toLowerCase()));

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Intelligence Vault</h1>
          <p className="text-muted-foreground text-sm">Repository of uploaded context documents.</p>
        </div>
      </div>

      <div 
        className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
          isDragging ? 'border-primary bg-primary/5' : 'border-border bg-card/30'
        } ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              handleUpload(e.target.files[0]);
            }
          }}
          accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.webp,.gif"
        />
        <UploadCloud className={`h-10 w-10 mx-auto mb-4 ${isDragging ? 'text-primary' : 'text-muted-foreground'}`} />
        <p className="text-sm font-medium mb-1">Click to upload or drag and drop</p>
        <p className="text-xs text-muted-foreground font-mono">PDF, DOCX, TXT — or images (PNG, JPG, WEBP) for OCR text extraction.</p>
        {isUploading && <p className="text-primary text-xs mt-4 animate-pulse font-mono">Running OCR extraction via Vision AI...</p>}
      </div>

      <div className="flex items-center space-x-2 relative">
        <Search className="h-4 w-4 absolute left-3 text-muted-foreground" />
        <Input 
          placeholder="Filter documents..." 
          className="pl-9 font-mono text-sm bg-card" 
          value={filter}
          onChange={e => setFilter(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-16 bg-muted animate-pulse rounded border border-border" />)}
        </div>
      ) : !filteredDocs?.length ? (
        <div className="py-12 text-center text-muted-foreground border border-border rounded-lg bg-card/10">
          <FileText className="h-8 w-8 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No documents found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredDocs.map(doc => (
            <Card key={doc.id} className="bg-card/50 shadow-none border-border group overflow-hidden">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4 overflow-hidden">
                  <div className="h-10 w-10 bg-secondary rounded flex items-center justify-center flex-shrink-0 border border-border">
                    <File className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">{doc.filename}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono mt-1">
                      <span>{formatDate(doc.createdAt)}</span>
                      <span>•</span>
                      <span className="truncate">{doc.mimeType}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 pl-4">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    onClick={() => handleDelete(doc.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
