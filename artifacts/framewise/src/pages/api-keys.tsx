import { useEffect, useState } from "react";
import { Copy, KeyRound, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useGetMe } from "@workspace/api-client-react";

type ApiKeyRecord = {
  id: string;
  name: string;
  keyPrefix: string;
  createdAt: string;
  lastUsedAt: string | null;
};

export function ApiKeys() {
  const { data: user, isLoading: userLoading } = useGetMe({ query: { retry: false } });
  const [keys, setKeys] = useState<ApiKeyRecord[]>([]);
  const [name, setName] = useState("");
  const [newKey, setNewKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadKeys = async () => {
    const response = await fetch("/api/api-keys", { credentials: "include" });
    if (!response.ok) throw new Error("Could not load API keys");
    setKeys(await response.json());
  };

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    loadKeys()
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [user]);

  const createKey = async () => {
    if (!name.trim()) return;
    setError(null);
    const response = await fetch("/api/api-keys", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error ?? "Could not create API key");
      return;
    }
    setNewKey(data.key);
    setName("");
    await loadKeys();
  };

  const revokeKey = async (id: string) => {
    if (!window.confirm("Revoke this API key? Apps using it will immediately stop working.")) return;
    const response = await fetch(`/api/api-keys/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!response.ok) {
      setError("Could not revoke API key");
      return;
    }
    setKeys((current) => current.filter((key) => key.id !== id));
  };

  const endpoint = `${window.location.origin}/api/v1/coach`;

  if (userLoading) {
    return <div className="p-10 text-sm text-muted-foreground">Loading…</div>;
  }

  if (!user) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-xl border bg-card p-8 text-center">
          <KeyRound className="h-8 w-8 text-primary mx-auto mb-4" />
          <h1 className="text-xl font-semibold">Sign in to create API keys</h1>
          <p className="text-sm text-muted-foreground mt-2 mb-6">
            API keys connect your other apps to your FrameWise account.
          </p>
          <a href="/api/auth/google">
            <Button>Sign in with Google</Button>
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 md:p-10 space-y-8">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <KeyRound className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-semibold">API Keys</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Connect your other apps to FrameWise securely.
        </p>
      </div>

      <section className="rounded-xl border bg-card p-5 space-y-4">
        <div>
          <h2 className="font-medium">Create a new key</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Name it after the app that will use it.
          </p>
        </div>
        <div className="flex gap-2">
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && createKey()}
            placeholder="Example: Proposal Builder"
            maxLength={80}
          />
          <Button onClick={createKey} disabled={!name.trim()}>
            <Plus className="h-4 w-4 mr-2" />
            Create key
          </Button>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </section>

      {newKey && (
        <section className="rounded-xl border border-primary/40 bg-primary/5 p-5 space-y-3">
          <div>
            <h2 className="font-medium">Copy your key now</h2>
            <p className="text-xs text-muted-foreground mt-1">
              For security, FrameWise will never display this key again.
            </p>
          </div>
          <div className="flex gap-2">
            <code className="flex-1 overflow-x-auto rounded-md border bg-background px-3 py-2 text-xs">
              {newKey}
            </code>
            <Button variant="outline" size="icon" onClick={() => navigator.clipboard.writeText(newKey)}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setNewKey(null)}>
            I saved it
          </Button>
        </section>
      )}

      <section className="rounded-xl border bg-card overflow-hidden">
        <div className="p-5 border-b">
          <h2 className="font-medium">Active keys</h2>
        </div>
        {loading ? (
          <p className="p-5 text-sm text-muted-foreground">Loading keys…</p>
        ) : keys.length === 0 ? (
          <p className="p-5 text-sm text-muted-foreground">No API keys yet.</p>
        ) : (
          <div className="divide-y">
            {keys.map((key) => (
              <div key={key.id} className="p-5 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-medium truncate">{key.name}</p>
                  <code className="text-xs text-muted-foreground">{key.keyPrefix}</code>
                  <p className="text-xs text-muted-foreground mt-1">
                    Created {new Date(key.createdAt).toLocaleDateString()}
                    {key.lastUsedAt ? ` · Last used ${new Date(key.lastUsedAt).toLocaleString()}` : " · Never used"}
                  </p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => revokeKey(key.id)} title="Revoke key">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-xl border bg-card p-5 space-y-4">
        <div>
          <h2 className="font-medium">Use it from another app</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Send a POST request with your key in the Authorization header.
          </p>
        </div>
        <pre className="overflow-x-auto rounded-md bg-muted p-4 text-xs leading-5">{`curl "${endpoint}" \\
  -H "Authorization: Bearer YOUR_FRAMEWISE_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"content":"Rewrite this message so it lands well..."}'`}</pre>
        <p className="text-xs text-muted-foreground">
          Response: <code>{`{"output":"1. Brief diagnosis\\n...\\n2. Optimized output\\n..."}`}</code>
        </p>
      </section>
    </div>
  );
}