import { fetch } from 'expo/fetch';

export function getApiBase(): string {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  return domain ? `https://${domain}` : 'http://localhost:3000';
}

/** Stream a free (unauthenticated) coaching response from the server. */
export async function streamFreeChat(
  content: string,
  onChunk: (text: string) => void,
): Promise<void> {
  const base = getApiBase();

  const response = await fetch(`${base}/api/chat/free`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    },
    body: JSON.stringify({ content }),
  });

  if (!response.ok) {
    throw new Error(`Server error: ${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response stream');

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const data = line.slice(6);
      try {
        const parsed = JSON.parse(data) as { content?: string; done?: boolean };
        if (parsed.content) onChunk(parsed.content);
      } catch {
        // Ignore malformed SSE frames
      }
    }
  }
}

/** Generic fetch helper for auth-required API endpoints. */
export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const base = getApiBase();
  const res = await globalThis.fetch(`${base}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<T>;
}
