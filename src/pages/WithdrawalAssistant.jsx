import React, { useState, useEffect, useRef, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Wallet, X, Loader2, ArrowLeft } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Link } from "react-router-dom";

const SUGGESTIONS = [
  "Where is my payout?",
  "How long until the money hits my bank?",
  "Cash out my wallet",
  "Why is my payout stuck?",
];

export default function WithdrawalAssistant() {
  const { user } = useOutletContext();
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [loadingConv, setLoadingConv] = useState(true);
  const bottomRef = useRef(null);

  const ensureConversation = useCallback(async () => {
    setLoadingConv(true);
    try {
      const existing = await base44.agents.listConversations({ agent_name: "withdrawal_assistant" });
      if (existing.length > 0) {
        setConversation(existing[0]);
        setMessages(existing[0].messages || []);
        return;
      }
      const created = await base44.agents.createConversation({
        agent_name: "withdrawal_assistant",
        metadata: { name: "Withdrawal Assistant" },
      });
      setConversation(created);
      setMessages([]);
    } catch (err) {
      console.error("WithdrawalAssistant conversation error:", err);
    } finally {
      setLoadingConv(false);
    }
  }, []);

  useEffect(() => { ensureConversation(); }, [ensureConversation]);

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

  const send = async (text) => {
    const raw = (text ?? input).trim();
    if (!raw || !conversation || busy) return;
    setInput("");
    setBusy(true);
    try {
      const updated = await base44.agents.addMessage(conversation, { role: "user", content: raw });
      setConversation(updated);
    } catch (err) {
      console.error("WithdrawalAssistant send error:", err);
      setInput(raw);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 4rem)" }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card">
        <Link to={user?.app_role === "teen" ? "/teen" : user?.app_role === "parent" ? "/parent" : "/buyer"} className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="w-9 h-9 rounded-full bg-foreground flex items-center justify-center">
          <Wallet className="w-4.5 h-4.5 text-background" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-foreground">Withdrawal Assistant</p>
          <p className="text-[11px] text-muted-foreground">Payouts, wallet cash-out & timelines</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {loadingConv && (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        )}
        {messages.length === 0 && !loadingConv && (
          <div className="text-center py-8">
            <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
              <Wallet className="w-7 h-7 text-muted-foreground" />
            </div>
            <p className="text-base font-bold text-foreground">Ask about your money</p>
            <p className="text-sm text-muted-foreground mt-1.5 max-w-[300px] mx-auto">
              I can check your payout status, retry stuck transfers, cash out your wallet, and explain timelines.
            </p>
            <div className="flex flex-col gap-2 mt-6 max-w-[320px] mx-auto">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="text-sm font-medium text-foreground bg-card border border-border rounded-xl px-4 py-2.5 hover:border-primary/40 hover:bg-accent transition text-left"
                >
                  {s}
                </button>
              ))}
            </div>
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

      {/* Input */}
      <div className="px-4 py-3 border-t border-border bg-card">
        <div className="flex gap-2">
          <Input
            className="rounded-xl bg-background"
            placeholder="Ask about your payouts or wallet..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
            disabled={busy || loadingConv}
          />
          <Button className="rounded-xl shrink-0" disabled={!input.trim() || busy || loadingConv} onClick={() => send()}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}