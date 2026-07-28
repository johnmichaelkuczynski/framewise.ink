import { Document } from "@workspace/api-client-react";

export interface PhotoAnalysis {
  appearance?: string;
  emotionalTone?: string;
  confidenceLevel?: string;
  formalitySignals?: string;
  communicationCues?: string;
  genderPatterns?: string;
}

export async function uploadPersonPhoto(
  personId: number,
  file: File,
): Promise<{ photoUrl: string; analysis: PhotoAnalysis | null }> {
  const formData = new FormData();
  formData.append("photo", file);
  const resp = await fetch(`/api/persons/${personId}/photo`, {
    method: "POST",
    body: formData,
    credentials: "include",
  });
  if (!resp.ok) throw new Error("Photo upload failed");
  return resp.json();
}

export async function uploadVirtualPersonPhoto(
  virtualPersonId: number,
  file: File,
): Promise<{ photoUrl: string; analysis: PhotoAnalysis | null }> {
  const formData = new FormData();
  formData.append("photo", file);
  const resp = await fetch(`/api/virtual-persons/${virtualPersonId}/photo`, {
    method: "POST",
    body: formData,
    credentials: "include",
  });
  if (!resp.ok) throw new Error("Photo upload failed");
  return resp.json();
}

export async function sendMessageStream(
  conversationId: number,
  content: string,
  onChunk: (text: string) => void,
  onDone: () => void
) {
  const resp = await fetch(`/api/conversations/${conversationId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
    credentials: "include",
  });
  
  if (!resp.body) {
    onDone();
    return;
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      
      for (const line of lines) {
        if (line.startsWith("data: ")) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.done) {
              onDone();
              return;
            }
            if (data.content) {
              onChunk(data.content);
            }
          } catch (e) {
            console.error("Failed to parse SSE JSON:", line);
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
    onDone();
  }
}

export async function uploadDocument(
  file: File, 
  personId?: number, 
  virtualPersonId?: number
): Promise<Document> {
  const formData = new FormData();
  formData.append("file", file);
  if (personId) formData.append("personId", String(personId));
  if (virtualPersonId) formData.append("virtualPersonId", String(virtualPersonId));
  
  const resp = await fetch("/api/documents", {
    method: "POST",
    body: formData,
    credentials: "include",
  });
  
  if (!resp.ok) {
    throw new Error("Failed to upload document");
  }
  
  return resp.json();
}
