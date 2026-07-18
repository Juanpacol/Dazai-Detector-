// Single fetch wrapper — every page goes through here, never `fetch` directly.

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export interface ChatStreamEvent {
  type: string;
  payload: unknown;
}

export interface StreamChatHandlers {
  onEvent?: (event: ChatStreamEvent) => void;
  onFinal?: (payload: unknown) => void;
  onError?: (message: string) => void;
}

async function request(path: string, options?: RequestInit): Promise<Response> {
  const response = await fetch(`${BASE_URL}/api${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`${options?.method ?? "GET"} ${path} failed (${response.status}): ${body}`);
  }

  return response;
}

export const api = {
  get: async <T>(path: string) => (await request(path)).json() as Promise<T>,
  getText: async (path: string) => (await request(path)).text(),
  post: async <T>(path: string, body: unknown) =>
    (await request(path, { method: "POST", body: JSON.stringify(body) })).json() as Promise<T>,
  streamChat: (question: string, handlers: StreamChatHandlers) => {
    const url = new URL(`${BASE_URL}/api/chat/stream`);
    url.searchParams.set("question", question);

    const source = new EventSource(url.toString());
    let finished = false;
    const namedEvents = [
      "status",
      "intent_detected",
      "tool_call_started",
      "tool_result_received",
      "draft_answer",
      "verification_started",
      "verification_result",
      "error",
    ];

    const parse = (event: MessageEvent<string>): unknown => {
      try {
        return JSON.parse(event.data);
      } catch {
        return event.data;
      }
    };

    namedEvents.forEach((name) => {
      source.addEventListener(name, (event) => {
        const payload = parse(event as MessageEvent<string>);
        handlers.onEvent?.({ type: name, payload });
        if (name === "error") {
          finished = true;
          handlers.onError?.(typeof payload === "object" && payload && "message" in payload ? String((payload as { message?: string }).message) : "Streaming chat error");
          source.close();
        }
      });
    });

    source.addEventListener("final", (event) => {
      const payload = parse(event as MessageEvent<string>);
      finished = true;
      handlers.onFinal?.(payload);
      source.close();
    });

    source.onerror = () => {
      if (!finished) {
        finished = true;
        handlers.onError?.("Streaming connection interrupted");
      }
      source.close();
    };

    return () => source.close();
  },
};
