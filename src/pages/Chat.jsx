import React, { useState, useEffect, useRef, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useParams, useOutletContext, useNavigate } from "react-router-dom";
import { maskPII } from "@/lib/grind";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Send, Lock, Eye } from "lucide-react";

export default function Chat() {
  const { threadId } = useParams();
  const { user } = useOutletContext();
  const navigate = useNavigate();
  const [thread, setThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  const load = useCallback(async () => {
    const [t, msgs] = await Promise.all([
      base44.entities.MessageThread.get(threadId),
      base44.entities.Message.filter({ thread_id: threadId }, "created_date", 200),
    ]);
    setThread(t);
    setMessages(msgs);
    setLoading(false);
  }, [threadId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const unsubscribe = base44.entities.Message.subscribe((event) => {
      if (event.type === "create" && event.data?.thread_id === threadId) {
        setMessages((m) => (m.some((x) => x.id === event.data.id) ? m : [...m, event.data]));
      }
    });
    return unsubscribe;
  }, [threadId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const isParent = user.app_role === "parent";

  const send = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    const { masked, wasMasked } = thread.is_confirmed ? { masked: text, wasMasked: false } : maskPII(text);
    const senderName =
      user.id === thread.teen_user_id ? thread.teen_name :
      user.id === thread.buyer_user_id ? thread.buyer_name : "Parent";
    const msg = await base44.entities.Message.create({
      thread_id: threadId,
      sender_user_id: user.id,
      sender_name: senderName,
      body: masked,
      pii_masked: wasMasked,
      flagged: wasMasked,
    });
    await base44.entities.MessageThread.update(threadId, {
      last_message: masked.slice(0, 60),
      last_message_at: new Date().toISOString(),
    });
    setMessages((m) => (m.some((x) => x.id === msg.id) ? m : [...m, msg]));
    setText("");
    setSending(false);
  };

  if (loading) return <div className="py-20 text-center text-muted-foreground">Loading…</div>;
  if (!thread) return <div className="py-20 text-center text-muted-foreground">Conversation not found.</div>;

  const other = user.app_role === "buyer" ? thread.teen_name : thread.buyer_name;

  return (
    <div className="flex flex-col" style={{ minHeight: "calc(100vh - 200px)" }}>
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => navigate(-1)}><ArrowLeft className="w-5 h-5 text-muted-foreground" /></button>
        <div>
          <div className="font-heading font-bold">{other}</div>
          <div className="text-xs text-muted-foreground">{thread.subject}</div>
        </div>
      </div>

      {!thread.is_confirmed && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-3 flex items-center gap-2 text-xs text-amber-800">
          <Lock className="w-3.5 h-3.5 shrink-0" />
          Phone numbers, emails, and addresses are masked until the booking is parent-approved.
        </div>
      )}
      <div className="bg-secondary rounded-xl p-3 mb-4 flex items-center gap-2 text-xs text-secondary-foreground">
        <Eye className="w-3.5 h-3.5 shrink-0" /> This conversation is visible to the teen's parent.
      </div>

      <div className="flex-1 space-y-3 mb-4">
        {messages.map((m) => {
          const mine = m.sender_user_id === user.id;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                mine ? "bg-primary text-primary-foreground rounded-br-md" : "bg-card border border-border rounded-bl-md"
              }`}>
                {!mine && <div className="text-[10px] font-semibold opacity-70 mb-0.5">{m.sender_name}</div>}
                {m.body}
                {m.pii_masked && (
                  <div className={`text-[10px] mt-1 ${mine ? "opacity-80" : "text-muted-foreground"}`}>
                    🔒 Personal info was masked
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {messages.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">Say hi! 👋</p>
        )}
        <div ref={bottomRef} />
      </div>

      {isParent ? (
        <p className="text-center text-xs text-muted-foreground">You're viewing as a parent (read-only).</p>
      ) : (
        <div className="flex gap-2 sticky bottom-20">
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Type a message…"
            className="rounded-full bg-card"
          />
          <Button size="icon" className="rounded-full shrink-0" onClick={send} disabled={sending || !text.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}