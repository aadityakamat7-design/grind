import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useOutletContext } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Lock, Eye, AlertTriangle } from "lucide-react";
import { maskPII } from "@/lib/grind";

export default function ChatThread() {
  const { threadId } = useParams();
  const { user } = useOutletContext();
  const [thread, setThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [body, setBody] = useState("");
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
        setMessages((prev) =>
          prev.some((m) => m.id === event.data.id) ? prev : [...prev, event.data]
        );
      }
    });
    return unsubscribe;
  }, [threadId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (loading)
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" /></div>;
  if (!thread) return <p className="text-center text-slate-500 py-20">Conversation not found.</p>;

  const isParent = user.app_role === "PARENT";
  const canSend = !isParent && (user.id === thread.teen_user_id || user.id === thread.buyer_user_id);

  const send = async () => {
    const raw = body.trim();
    if (!raw) return;
    const { text, flagged } = maskPII(raw, thread.is_confirmed);
    const senderName = user.id === thread.teen_user_id ? thread.teen_display_name : thread.buyer_name;

    // Optimistic: show the message instantly, then swap in the saved record.
    const tempId = `temp-${Date.now()}`;
    setMessages((prev) => [...prev, { id: tempId, thread_id: thread.id, sender_id: user.id, sender_name: senderName, body: text, flagged, pending: true }]);
    setBody("");
    setSending(true);
    try {
      const msg = await base44.entities.Message.create({
        thread_id: thread.id,
        sender_id: user.id,
        sender_name: senderName,
        body: text,
        flagged,
        pii_masked: text !== raw,
      });
      setMessages((prev) => {
        const withoutTemp = prev.filter((m) => m.id !== tempId);
        return withoutTemp.some((m) => m.id === msg.id) ? withoutTemp : [...withoutTemp, msg];
      });
      await base44.entities.MessageThread.update(thread.id, {
        last_message: text.slice(0, 80),
        last_message_at: new Date().toISOString(),
      });
    } catch {
      // Roll back and restore the draft so nothing is lost
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setBody(raw);
    }
    setSending(false);
  };

  return (
    <div className="flex flex-col" style={{ minHeight: "calc(100vh - 200px)" }}>
      <div className="pb-3 border-b border-slate-100 mb-4">
        <h1 className="font-extrabold text-slate-900">
          {isParent ? `${thread.teen_display_name} ↔ ${thread.buyer_name}` : (user.id === thread.teen_user_id ? thread.buyer_name : thread.teen_display_name)}
        </h1>
        <p className="text-xs text-slate-500">{thread.listing_title}</p>
        {!thread.is_confirmed && (
          <p className="text-[11px] text-amber-600 mt-1.5 flex items-center gap-1">
            <Lock className="w-3 h-3" /> Phone numbers, emails, and addresses are hidden until the booking is confirmed.
          </p>
        )}
        {isParent && (
          <p className="text-[11px] text-blue-600 mt-1 flex items-center gap-1">
            <Eye className="w-3 h-3" /> Read-only parent view
          </p>
        )}
      </div>

      <div className="flex-1 space-y-3">
        {messages.length === 0 && <p className="text-center text-sm text-slate-400 py-10">Say hi 👋</p>}
        {messages.map((m) => {
          const mine = m.sender_id === user.id;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${m.pending ? "opacity-60" : ""} ${mine ? "bg-blue-600 text-white rounded-br-md" : "bg-white border border-slate-100 text-slate-800 rounded-bl-md shadow-sm"}`}>
                {!mine && <p className={`text-[10px] font-bold mb-0.5 ${mine ? "text-blue-100" : "text-blue-600"}`}>{m.sender_name}</p>}
                <p className="whitespace-pre-wrap">{m.body}</p>
                {m.flagged && (
                  <p className={`text-[10px] mt-1 flex items-center gap-1 ${mine ? "text-blue-200" : "text-amber-600"}`}>
                    <AlertTriangle className="w-3 h-3" /> Flagged: possible contact info or off-platform request
                  </p>
                )}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {canSend && (
        <div className="sticky bottom-20 mt-4 flex gap-2 bg-slate-50 pt-2">
          <Input
            className="rounded-xl bg-white"
            placeholder="Type a message..."
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
          />
          <Button className="rounded-xl shrink-0" disabled={!body.trim() || sending} onClick={send}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}