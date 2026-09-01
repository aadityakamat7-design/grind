import React, { useState, useEffect, useRef, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { Send, ShieldCheck, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import ReactMarkdown from "react-markdown";

const AGENT_NAME = "safety_advisor";

const SUGGESTED_QUESTIONS = [
  "Is it safe to hire a teen I don't know?",
  "When do I pay for the job?",
  "Will the teen see my home address?",
  "What if something goes wrong?",
];

function FunctionDisplay({ toolCall }) {
  const [expanded, setExpanded] = useState(false);
  const status = toolCall.status;
  const isFailed = status === "failed" || status === "error";
  const isPending = ["pending", "running", "in_progress"].includes(status);

  let statusText = "Completed";
  if (isPending) statusText = "Working...";
  if (isFailed) statusText = "Failed";

  const hideDetails = toolCall.display_projection?.hide_details && toolCall.display_projection?.details_redacted;
  if (hideDetails) {
    return (
      <div className="mt-1.5 text-xs text-muted-foreground flex items-center gap-1.5">
        {isPending && <Loader2 className="w-3 h-3 animate-spin" />}
        <span>{isPending ? toolCall.display_projection?.active_label : isFailed ? toolCall.display_projection?.error_label : toolCall.display_projection?.label}</span>
      </div>
    );
  }

  let parsedResults = toolCall.results;
  if (typeof parsedResults === "string") {
    try { parsedResults = JSON.parse(parsedResults); } catch { /* keep raw */ }
  }

  return (
    <div className="mt-1.5 text-xs">
      <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors">
        {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : isFailed ? <span className="text-destructive">✕</span> : <span className="text-foreground">✓</span>}
        <span className="capitalize">{toolCall.name?.replace(/_/g, " ")}</span>
        <span className={isFailed ? "text-destructive" : "text-muted-foreground"}>· {statusText}</span>
        {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>
      {expanded && (
        <div className="mt-1.5 space-y-1 pl-1">
          {toolCall.arguments_string && (
            <div>
              <p className="font-medium text-foreground">Parameters:</p>
              <pre className="text-muted-foreground whitespace-pre-wrap break-words">{toolCall.arguments_string}</pre>
            </div>
          )}
          {parsedResults != null && (
            <div>
              <p className="font-medium text-foreground">Result:</p>
              <pre className="text-muted-foreground whitespace-pre-wrap break-words">{JSON.stringify(parsedResults, null, 2)}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MessageBubble({ message }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${isUser ? "bg-foreground text-background rounded-br-md" : "bg-card border border-border text-foreground rounded-bl-md shadow-soft"}`}>
        {!isUser && (
          <div className="flex items-center gap-1.5 mb-1 text-xs font-medium text-muted-foreground">
            <ShieldCheck className="w-3 h-3" /> Safety Advisor
          </div>
        )}
        {message.content && (isUser
          ? <p className="whitespace-pre-wrap">{message.content}</p>
          : <ReactMarkdown className="prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0.5 prose-headings:font-semibold prose-headings:text-foreground prose-strong:text-foreground">{message.content}</ReactMarkdown>
        )}
        {message.tool_calls?.map((tc, i) => <FunctionDisplay key={i} toolCall={tc} />)}
      </div>
    </div>
  );
}

export default function SafetyAdvisorChat({ listing, onClose }) {
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef(null);

  const initConversation = useCallback(async () => {
    try {
      const conv = await base44.agents.createConversation({
        agent_name: AGENT_NAME,
        metadata: {
          name: "Safety Advisor",
          description: listing ? `Safety Q&A for ${listing.title}` : "Safety protocols Q&A",
        },
      });
      setConversation(conv);
      setMessages(conv.messages || []);
      setLoading(false);

      // Seed with context about the listing so the advisor can give relevant answers
      if (listing) {
        const contextMsg = `I'm about to book a service: "${listing.title}" in the ${listing.category} category for ${listing.price} (${listing.price_model}). Can you walk me through the safety protocols before I finalize this booking?`;
        await base44.agents.addMessage(conv, { role: "user", content: contextMsg });
        setSending(true);
      }
    } catch (err) {
      console.error("Failed to init safety advisor conversation", err);
      setLoading(false);
    }
  }, [listing]);

  useEffect(() => { initConversation(); }, [initConversation]);

  useEffect(() => {
    if (!conversation?.id) return;
    const unsubscribe = base44.agents.subscribeToConversation(conversation.id, (data) => {
      setMessages(data.messages || []);
      setSending(false);
    });
    return () => unsubscribe();
  }, [conversation?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async (text) => {
    const content = (text ?? input).trim();
    if (!content || !conversation || sending) return;
    setInput("");
    setSending(true);
    try {
      await base44.agents.addMessage(conversation, { role: "user", content });
    } catch (err) {
      console.error("Failed to send message", err);
      setSending(false);
    }
  };

  if (loading)
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Starting safety advisor...</p>
      </div>
    );

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto space-y-3 px-1 pb-2" style={{ maxHeight: "calc(70vh - 140px)" }}>
        {messages.length === 0 && !sending && (
          <div className="text-center py-6">
            <div className="w-12 h-12 rounded-2xl bg-foreground flex items-center justify-center mx-auto mb-3">
              <ShieldCheck className="w-6 h-6 text-background" />
            </div>
            <p className="font-semibold text-foreground">Safety Advisor</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">
              Ask me anything about how Blockwork keeps you and the teen safe before you book.
            </p>
          </div>
        )}
        {messages.map((m, i) => <MessageBubble key={i} message={m} />)}
        {sending && messages.length > 0 && (
          <div className="flex justify-start">
            <div className="bg-card border border-border rounded-2xl rounded-bl-md px-4 py-3 shadow-soft">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {messages.length <= 1 && (
        <div className="flex flex-wrap gap-2 px-1 pb-2">
          {SUGGESTED_QUESTIONS.map((q) => (
            <button
              key={q}
              onClick={() => send(q)}
              className="text-xs px-3 py-1.5 rounded-full bg-secondary text-muted-foreground border border-border hover:bg-accent hover:text-foreground transition-colors"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-2 px-1 pt-2 border-t border-border">
        <Input
          className="rounded-xl bg-card"
          placeholder="Ask about safety..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
          disabled={sending}
        />
        <Button className="rounded-xl shrink-0" disabled={!input.trim() || sending} onClick={() => send()}>
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}