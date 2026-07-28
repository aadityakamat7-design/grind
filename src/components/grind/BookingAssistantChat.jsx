import React, { useState, useEffect, useRef, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Bot, X, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";

export default function BookingAssistantChat({ threadId, bookingId, user }) {
  const [open, setOpen] = useState(false);
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [loadingConv, setLoadingConv] = useState(false);
  const bottomRef = useRef(null);

  const ensureConversation = useCallback(async () => {
    setLoadingConv(true);
    try {
      const existing = await base44.agents.listConversations({ agent_name: "booking_assistant" });
      const match = existing.find((c) => c.metadata?.thread_id === threadId);
      if (match) {
        setConversation(match);
        setMessages(match.messages || []);
        return match;
      }
      const created = await base44.agents.createConversation({
        agent_name: "booking_assistant",
        metadata: { thread_id: threadId, booking_id: bookingId, name: "Booking Assistant" },
      });
      setConversation(created);
      setMessages([]);
      return created;
    } catch (err) {
      console.error("BookingAssistant conversation error:", err);
      return null;
    } finally {
      setLoadingConv(false);
    }
  }, [threadId, bookingId]);

  useEffect(() => {
    if (open && !conversation) ensureConversation();
  }, [open, conversation, ensureConversation]);

  useEffect(() => {
    if (!conversation?.id) return;
    const unsubscribe = base44.agents.subscribeToConversation(conversation.id, (data) => {
      setMessages(data.messages || []);
    });
    return () => unsubscribe();
  }, [conversation?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    const raw = input.trim();
    if (!raw || !conversation || busy) return;
    setInput("");
    setBusy(true);
    try {
      const updated = await base44.agents.addMessage(conversation, { role: "user", content: raw });
      setConversation(updated);
    } catch (err) {
      console.error("BookingAssistant send error:", err);
      setInput(raw);
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-24 right-4 z-40 flex items-center gap-2 rounded-full bg-foreground text-background px-4 py-3 shadow-floating text-sm font-medium active:scale-95 transition"
      >
        <Bot className="w-4 h-4" />
        <span className="hidden sm:inline">Booking Assistant</span>
      </button>
    );
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 sm:inset-y-0 sm:left-auto sm:w-[400px] flex flex-col bg-background border-t sm:border-t-0 sm:border-l border-border shadow-floating" style={{ maxHeight: "70vh" }}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-foreground flex items-center justify-center">
            <Bot className="w-4 h-4 text-background" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Booking Assistant</p>
            <p className="text-[11px] text-muted-foreground">Manage this booking</p>
          </div>
        </div>
        <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {loadingConv && (
          <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        )}
        {messages.length === 0 && !loadingConv && (
          <div className="text-center py-6">
            <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
              <Bot className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">Ask me about this booking</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-[260px] mx-auto">
              I can check status, reschedule, start or finish the job, and help parents approve.
            </p>
          </div>
        )}
        {messages.map((m, i) => {
          const isUser = m.role === "user";
          return (
            <div key={m.id || i} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm ${isUser ? "bg-foreground text-background rounded-br-md" : "bg-card border border-border text-foreground rounded-bl-md shadow-soft"}`}>
                {m.content && (isUser
                  ? <p className="whitespace-pre-wrap">{m.content}</p>
                  : <ReactMarkdown className="prose prose-sm max-w-none [&>*]:my-0 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">{m.content}</ReactMarkdown>
                )}
                {m.tool_calls?.map((tc, j) => {
                  const failed = ["failed", "error"].includes(tc.status) || /error|failed/i.test(String(tc.results || ""));
                  return (
                    <div key={j} className="mt-1.5 text-[11px] flex items-center gap-1.5 opacity-70">
                      {["pending", "running", "in_progress"].includes(tc.status) ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : failed ? (
                        <X className="w-3 h-3" />
                      ) : (
                        <span className="w-1.5 h-1.5 rounded-full bg-current" />
                      )}
                      <span>{tc.display_projection?.label || tc.display_projection?.active_label || tc.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
        {busy && (
          <div className="flex justify-start">
            <div className="bg-card border border-border rounded-2xl rounded-bl-md px-3.5 py-2.5 shadow-soft">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="px-3 py-3 border-t border-border bg-card">
        <div className="flex gap-2">
          <Input
            className="rounded-xl bg-background"
            placeholder="Ask about this booking..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
            disabled={busy || loadingConv}
          />
          <Button className="rounded-xl shrink-0" disabled={!input.trim() || busy || loadingConv} onClick={send}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}