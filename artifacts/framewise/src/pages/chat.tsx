import { useState, useRef, useEffect } from "react";
import { Send, Copy, Bot, CheckCircle2, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useCreateConversation, useGetMe } from "@workspace/api-client-react";
import { sendMessageStream } from "@/lib/api";
import { cn } from "@/lib/utils";

async function sendFreeMessageStream(
  content: string,
  onChunk: (chunk: string) => void,
  onDone: () => void,
) {
  const resp = await fetch("/api/chat/free", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });
  if (!resp.ok || !resp.body) { onDone(); return; }
  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const parts = buf.split("\n\n");
    buf = parts.pop() ?? "";
    for (const part of parts) {
      if (!part.startsWith("data:")) continue;
      try {
        const json = JSON.parse(part.slice(5).trim());
        if (json.content) onChunk(json.content);
        if (json.done) { onDone(); return; }
      } catch { /* skip */ }
    }
  }
  onDone();
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export function Chat({ mode = "free", personId, virtualPersonId, conversationId: initialConversationId }: { mode?: "free" | "real" | "virtual", personId?: number, virtualPersonId?: number, conversationId?: number }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [conversationId, setConversationId] = useState<number | null>(initialConversationId ?? null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { data: user } = useGetMe();
  
  const createConversation = useCreateConversation();
  const createConversationMutate = useRef(createConversation.mutateAsync);
  createConversationMutate.current = createConversation.mutateAsync;

  // In free mode, unauthenticated users get the stateless /api/chat/free endpoint
  const isAnonymousFree = mode === "free" && !user;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isStreaming) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsStreaming(true);

    const assistantId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, { id: assistantId, role: "assistant", content: "" }]);

    const onChunk = (chunk: string) => {
      setMessages(prev =>
        prev.map(msg => msg.id === assistantId ? { ...msg, content: msg.content + chunk } : msg)
      );
    };
    const onDone = () => setIsStreaming(false);

    try {
      if (isAnonymousFree) {
        // No session — use stateless endpoint, nothing saved
        await sendFreeMessageStream(userMessage.content, onChunk, onDone);
      } else {
        let currentConvId = conversationId;
        if (!currentConvId) {
          const conv = await createConversationMutate.current({
            data: {
              mode,
              personId,
              virtualPersonId,
              title: userMessage.content.substring(0, 50) + "...",
            },
          });
          currentConvId = conv.id;
          setConversationId(conv.id);
        }
        await sendMessageStream(currentConvId, userMessage.content, onChunk, onDone);
      }
    } catch (err) {
      console.error(err);
      setIsStreaming(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex flex-col h-full bg-background relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 pointer-events-none opacity-5" style={{
        backgroundImage: 'radial-gradient(circle at center, white 1px, transparent 1px)',
        backgroundSize: '24px 24px'
      }}></div>

      <div className="flex-1 overflow-y-auto p-4 md:p-8 relative z-10 scroll-smooth">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center max-w-lg mx-auto">
            <div className="h-12 w-12 border border-border bg-card flex items-center justify-center rounded-lg mb-6 shadow-2xl">
              <Bot className="h-6 w-6 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-medium tracking-tight mb-2">Protocol Initiated</h2>
            <p className="text-muted-foreground text-sm">
              Enter the draft message or communication intent. The system will analyze the psychological vectors and output an optimized rephrasing designed to land perfectly with the target.
            </p>
            {isAnonymousFree && (
              <a href="/api/auth/google" className="mt-6 inline-flex items-center gap-2 text-xs font-mono text-muted-foreground border border-border rounded-md px-3 py-2 hover:bg-accent/50 transition-colors">
                <LogIn className="h-3.5 w-3.5" />
                Sign in to save conversations &amp; build profiles
              </a>
            )}
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-8 pb-12">
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <div className="p-4 md:p-6 bg-background/80 backdrop-blur-md border-t border-border z-20">
        <div className="max-w-3xl mx-auto relative">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your raw message or intent here..."
            className="pr-14 resize-none min-h-[60px] max-h-[200px] bg-card border-border font-mono text-sm shadow-xl focus-visible:ring-1 focus-visible:ring-primary/50 rounded-lg py-4"
            disabled={isStreaming}
          />
          <Button 
            size="icon" 
            className="absolute right-2 bottom-2 h-8 w-8 rounded-md hover:scale-105 transition-transform" 
            onClick={handleSubmit}
            disabled={!input.trim() || isStreaming}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] bg-accent text-accent-foreground px-5 py-3 rounded-lg rounded-tr-sm text-sm border border-border/50">
          <p className="whitespace-pre-wrap font-mono">{message.content}</p>
        </div>
      </div>
    );
  }

  // Parse assistant message format:
  // Usually the AI should respond with "Brief diagnosis" and "Optimized output"
  // Let's do a simple split if we detect markers, else just show it.
  
  let diagnosis = "";
  let optimized = message.content;

  const markers = ["**Optimized output**:", "**Optimized output**", "Optimized output:", "Optimized Output:"];
  let foundMarker = false;

  for (const marker of markers) {
    const idx = message.content.indexOf(marker);
    if (idx !== -1) {
      diagnosis = message.content.substring(0, idx).trim();
      optimized = message.content.substring(idx + marker.length).trim();
      foundMarker = true;
      break;
    }
  }

  if (!foundMarker) {
    // try to split by bold headers loosely
    const parts = message.content.split(/\*\*[^*]+\*\*:/);
    if (parts.length > 2) {
      diagnosis = parts[1].trim();
      optimized = parts[2].trim();
    }
  }

  return (
    <div className="flex gap-4 max-w-[95%]">
      <div className="flex-shrink-0 mt-1">
        <div className="h-8 w-8 border border-border bg-card rounded-md flex items-center justify-center">
          <Bot className="h-4 w-4 text-primary" />
        </div>
      </div>
      <div className="space-y-4 w-full">
        {diagnosis && (
          <div className="text-sm text-muted-foreground leading-relaxed border-l-2 border-border pl-4">
            <p className="whitespace-pre-wrap">{diagnosis}</p>
          </div>
        )}
        
        <div className="mono-box border border-primary/20 bg-primary/5 rounded-lg p-5 relative group">
          <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <CopyButton text={optimized} />
          </div>
          <div className="text-sm font-mono text-foreground leading-relaxed whitespace-pre-wrap">
            {optimized || "..."}
          </div>
        </div>
      </div>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button 
      onClick={handleCopy}
      className="p-1.5 bg-background border border-border rounded text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
      title="Copy output"
    >
      {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}
