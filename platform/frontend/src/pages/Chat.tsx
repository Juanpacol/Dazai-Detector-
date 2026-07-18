import { useState } from "react";

import { api } from "../api/client";
import type { ChatMessage, ChatResponse } from "../types";

const SUGGESTIONS = [
  "Why was TXN-000123 flagged?",
  "What time patterns exist in flagged transactions?",
  "Find cases similar to TXN-000123",
  "Give me a summary of high-risk activity",
];

export default function Chat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const send = async (question: string) => {
    if (!question.trim()) return;
    setMessages((prev) => [...prev, { role: "user", text: question }]);
    setInput("");
    setLoading(true);

    try {
      const response = await api.post<ChatResponse>("/chat", { question });
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: response.answer, sources: response.sources, intent: response.intent },
      ]);
    } catch (e) {
      setMessages((prev) => [...prev, { role: "assistant", text: `Error: ${(e as Error).message}` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => send(s)}
            className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600 hover:bg-slate-50"
          >
            {s}
          </button>
        ))}
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        {messages.length === 0 && (
          <p className="text-slate-500">Ask about a specific alert, a pattern, similar cases, or a summary.</p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "text-right" : "text-left"}>
            <div
              className={`inline-block max-w-[80%] rounded-lg px-4 py-2 text-sm ${
                m.role === "user" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-800"
              }`}
            >
              {m.text}
            </div>
            {m.sources && m.sources.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {m.sources.map((s) => (
                  <span key={s} className="rounded bg-blue-50 px-2 py-0.5 text-xs text-blue-700">
                    based on: {s}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
        {loading && <p className="text-slate-400">Thinking...</p>}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question..."
          className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <button type="submit" className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white">
          Send
        </button>
      </form>
    </div>
  );
}
