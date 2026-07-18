import { RotateCcw, Send, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { api } from "../api/client";
import { AgentBadge } from "../components/AgentBadge";
import { TypingIndicator } from "../components/TypingIndicator";
import type { ChatMessage, ChatResponse, Citation, ToolTrace } from "../types";

const SUGGESTIONS = [
  "Why was TXN-000123 flagged?",
  "What time patterns exist in flagged transactions?",
  "Find cases similar to TXN-000123",
  "Give me a summary of high-risk activity",
];

const HISTORY_KEY = "dazai-chat-history";

function loadHistory(): ChatMessage[] {
  try {
    const raw = sessionStorage.getItem(HISTORY_KEY);
    return raw ? (JSON.parse(raw) as ChatMessage[]) : [];
  } catch {
    return [];
  }
}

function citationLabel(citation: Citation): string {
  return `${citation.tool}${citation.field ? ` · ${citation.field}` : ""}`;
}

function updateAssistantMessage(
  messages: ChatMessage[],
  updater: (message: ChatMessage) => ChatMessage,
): ChatMessage[] {
  const next = [...messages];
  const index = [...next].reverse().findIndex((m) => m.role === "assistant");
  if (index === -1) return next;
  const actualIndex = next.length - 1 - index;
  next[actualIndex] = updater(next[actualIndex]);
  return next;
}

function assistantPlaceholder(): ChatMessage {
  return {
    role: "assistant",
    text: "",
    sources: [],
    citations: [],
    tool_trace: [],
    confidence: 0,
    latency_ms: 0,
    verified: false,
    ok: false,
    streaming: true,
    progress: ["Connecting to the assistant..."],
  };
}

function evidenceBadgeStyle(verified?: boolean, ok?: boolean) {
  if (ok === false) return "bg-amber-500/10 text-amber-200 ring-amber-500/20";
  if (verified) return "bg-emerald-500/10 text-emerald-200 ring-emerald-500/20";
  return "bg-white/[0.04] text-slate-400 ring-white/[0.08]";
}

export default function Chat() {
  const [messages, setMessages] = useState<ChatMessage[]>(loadHistory);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const closeStreamRef = useRef<null | (() => void)>(null);
  const finalizedRef = useRef(false);

  useEffect(() => {
    sessionStorage.setItem(HISTORY_KEY, JSON.stringify(messages));
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    return () => {
      closeStreamRef.current?.();
    };
  }, []);

  const finishWithResponse = (response: ChatResponse) => {
    finalizedRef.current = true;
    setMessages((prev) =>
      updateAssistantMessage(prev, (message) => ({
        ...message,
        text: response.answer,
        sources: response.sources,
        citations: response.citations,
        intent: response.intent,
        agent: response.agent,
        confidence: response.confidence,
        tool_trace: response.tool_trace,
        latency_ms: response.latency_ms,
        verified: response.verified,
        ok: response.ok,
        streaming: false,
        progress: [...(message.progress ?? []), response.verified ? "Verified answer." : "Answer returned."],
      })),
    );
    setLoading(false);
  };

  const send = async (question: string) => {
    if (!question.trim() || loading) return;

    closeStreamRef.current?.();
    finalizedRef.current = false;
    setMessages((prev) => [...prev, { role: "user", text: question }, assistantPlaceholder()]);
    setInput("");
    setLoading(true);

    const fallback = async () => {
      try {
        const response = await api.post<ChatResponse>("/chat", { question });
        finishWithResponse(response);
      } catch (error) {
        setMessages((prev) =>
          updateAssistantMessage(prev, (message) => ({
            ...message,
            text: `Couldn't reach the server. ${(error as Error).message}`,
            ok: false,
            failed: true,
            streaming: false,
            progress: [...(message.progress ?? []), "Request failed."],
          })),
        );
        setLoading(false);
      }
    };

    try {
      closeStreamRef.current = api.streamChat(question, {
        onEvent: (event) => {
          setMessages((prev) =>
            updateAssistantMessage(prev, (message) => {
              const progress = [...(message.progress ?? [])];

              switch (event.type) {
                case "status":
                  progress.push("Streaming started.");
                  return { ...message, progress };
                case "intent_detected": {
                  const payload = event.payload as { intent?: string; agent?: string };
                  progress.push(`Routed to ${payload.agent ?? "agent"} for ${payload.intent ?? "intent"}.`);
                  return { ...message, intent: payload.intent, agent: payload.agent, progress };
                }
                case "tool_call_started": {
                  const payload = event.payload as { tool?: string };
                  progress.push(`Calling ${payload.tool ?? "tool"}...`);
                  return { ...message, progress };
                }
                case "tool_result_received": {
                  const payload = event.payload as { tool?: string };
                  progress.push(`Received data from ${payload.tool ?? "tool"}.`);
                  return { ...message, progress };
                }
                case "draft_answer": {
                  const payload = event.payload as Partial<ChatResponse>;
                  progress.push("Draft answer ready.");
                  return {
                    ...message,
                    text: payload.answer ?? message.text,
                    sources: payload.sources ?? message.sources,
                    citations: payload.citations ?? message.citations,
                    confidence: payload.confidence ?? message.confidence,
                    tool_trace: payload.tool_trace ?? message.tool_trace,
                    progress,
                  };
                }
                case "verification_started":
                  progress.push("Verifying evidence.");
                  return { ...message, progress };
                case "verification_result": {
                  const payload = event.payload as { verified?: boolean; confidence?: number };
                  progress.push(payload.verified ? "Verified." : "Verification lowered confidence.");
                  return { ...message, verified: payload.verified, confidence: payload.confidence ?? message.confidence, progress };
                }
                case "error":
                  progress.push("Stream error.");
                  return { ...message, failed: true, ok: false, progress };
                default:
                  return message;
              }
            }),
          );
        },
        onFinal: (payload) => {
          finalizedRef.current = true;
          finishWithResponse(payload as ChatResponse);
        },
        onError: () => {
          if (!finalizedRef.current) {
            closeStreamRef.current?.();
            closeStreamRef.current = null;
            void fallback();
          }
        },
      });
    } catch {
      await fallback();
    }
  };

  const retry = () => {
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (lastUser) send(lastUser.text);
  };

  const clearHistory = () => {
    closeStreamRef.current?.();
    setMessages([]);
    sessionStorage.removeItem(HISTORY_KEY);
  };

  const renderCitations = (citations?: Citation[]) => {
    if (!citations?.length) return null;

    return (
      <details className="mt-3">
        <summary className="cursor-pointer text-xs text-slate-500 hover:text-slate-300">View evidence</summary>
        <div className="mt-2 grid gap-2">
          {citations.map((citation, index) => (
            <div key={`${citation.tool}-${citation.reference}-${index}`} className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3 text-xs text-slate-400">
              <div className="flex flex-wrap items-center gap-2">
                <span className="pill bg-accent-600/10 text-accent-300 ring-accent-600/20">{citation.source}</span>
                <span className="font-medium text-slate-200">{citationLabel(citation)}</span>
                {citation.value !== undefined && <span className="text-slate-500">value: {String(citation.value)}</span>}
              </div>
              {citation.snippet && <p className="mt-1 text-slate-500">{citation.snippet}</p>}
            </div>
          ))}
        </div>
      </details>
    );
  };

  const renderToolTrace = (toolTrace?: ToolTrace[]) => {
    if (!toolTrace?.length) return null;
    return (
      <details className="mt-2">
        <summary className="cursor-pointer text-xs text-slate-500 hover:text-slate-300">Tool trace</summary>
        <div className="mt-2 space-y-1 text-xs text-slate-500">
          {toolTrace.map((entry, index) => (
            <div key={`${entry.tool}-${index}`} className="rounded-lg bg-white/[0.03] px-3 py-2">
              <span className="font-medium text-slate-300">{entry.tool}</span> · {entry.action}
              {entry.latency_ms !== undefined && <span> · {entry.latency_ms}ms</span>}
              {entry.status && <span> · {entry.status}</span>}
            </div>
          ))}
        </div>
      </details>
    );
  };

  return (
    <div className="flex h-[calc(100vh-9rem)] flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => send(s)}
              disabled={loading}
              className="rounded-full bg-white/[0.03] px-3 py-1 text-xs text-slate-400 ring-1 ring-inset ring-white/[0.06] hover:text-slate-200 disabled:opacity-40"
            >
              {s}
            </button>
          ))}
        </div>
        {messages.length > 0 && (
          <button
            onClick={clearHistory}
            className="flex shrink-0 items-center gap-1 text-xs text-slate-500 hover:text-slate-300"
          >
            <Trash2 size={13} /> Clear
          </button>
        )}
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto rounded-2xl border border-white/[0.06] bg-ink-900 p-4">
        {messages.length === 0 && (
          <p className="text-sm text-slate-500">
            Ask about a specific alert, a pattern, similar cases, or a summary.
          </p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "flex justify-end" : "flex flex-col items-start gap-1"}>
            <div
              className={`inline-block max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                m.role === "user"
                  ? "bg-accent-600 text-white"
                  : m.failed
                    ? "bg-red-500/10 text-red-300 ring-1 ring-inset ring-red-500/20"
                    : m.ok === false
                      ? "bg-amber-500/10 text-amber-200 ring-1 ring-inset ring-amber-500/20"
                      : "bg-ink-800 text-slate-200"
              }`}
            >
              <p className="whitespace-pre-line">{m.text || (m.streaming ? "Thinking..." : "")}</p>
              {m.progress?.length ? (
                <ul className="mt-2 space-y-1 text-xs text-slate-500">
                  {m.progress.slice(-3).map((step, index) => (
                    <li key={`${step}-${index}`}>• {step}</li>
                  ))}
                </ul>
              ) : null}
              {m.failed && (
                <button
                  onClick={retry}
                  className="mt-2 flex items-center gap-1 text-xs font-medium text-red-300 hover:text-red-200"
                >
                  <RotateCcw size={12} /> Retry
                </button>
              )}
            </div>

            {m.role === "assistant" && (
              <div className="flex flex-wrap items-center gap-1.5 px-1">
                {m.agent && <AgentBadge agent={m.agent} />}
                {typeof m.confidence === "number" && (
                  <span className={`pill ring-1 ${evidenceBadgeStyle(m.verified, m.ok)}`}>
                    confidence {m.confidence.toFixed(2)}
                  </span>
                )}
                {typeof m.latency_ms === "number" && <span className="pill bg-white/[0.03] text-slate-500">latency {m.latency_ms}ms</span>}
                {m.sources?.map((s) => (
                  <span key={s} className="pill bg-white/[0.03] text-slate-500 ring-white/[0.06]">
                    based on: {s}
                  </span>
                ))}
              </div>
            )}

            {m.role === "assistant" && renderCitations(m.citations)}
            {m.role === "assistant" && renderToolTrace(m.tool_trace)}
          </div>
        ))}
        {loading && <TypingIndicator />}
        <div ref={bottomRef} />
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
          disabled={loading}
          placeholder="Ask a question..."
          className="flex-1 rounded-xl border border-white/[0.08] bg-ink-900 px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:border-accent-600/50 focus:outline-none disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="flex items-center gap-1.5 rounded-xl bg-accent-600 px-4 py-2.5 text-sm font-medium text-white shadow-glow hover:bg-accent-500 disabled:opacity-40"
        >
          <Send size={14} /> Send
        </button>
      </form>
    </div>
  );
}
