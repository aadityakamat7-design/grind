import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { BadgeCheck, Check, X, FileText } from "lucide-react";

// Admin review queue for pending skill credentials.
// Admins approve or reject (with a reason) — the badge only appears once approved.
export default function CredentialReviewQueue({ credentials = [], onDone }) {
  const [acting, setActing] = useState("");
  const [rejecting, setRejecting] = useState(null);
  const [reason, setReason] = useState("");

  const approve = async (id) => {
    setActing(id);
    try {
      await base44.functions.invoke("reviewCredential", {
        credentialId: id,
        decision: "approve",
      });
      onDone?.();
    } catch (err) {
      console.error("approve credential:", err);
    }
    setActing("");
  };

  const reject = async (id) => {
    setActing(id);
    try {
      await base44.functions.invoke("reviewCredential", {
        credentialId: id,
        decision: "reject",
        rejectionReason: reason,
      });
      setRejecting(null);
      setReason("");
      onDone?.();
    } catch (err) {
      console.error("reject credential:", err);
    }
    setActing("");
  };

  if (!credentials.length) return null;

  return (
    <div>
      <h2 className="font-bold text-foreground mb-3 flex items-center gap-2">
        <BadgeCheck className="w-4 h-4" /> Skill credentials ({credentials.length} pending)
      </h2>
      <div className="space-y-3">
        {credentials.map((c) => (
          <div key={c.id} className="bg-card rounded-2xl border border-border shadow-soft p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-foreground truncate">{c.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {c.teen_display_name || "Teen"} · {c.listing_title || "Listing"}
                </p>
              </div>
              {c.file_url && (
                <a href={c.file_url} target="_blank" rel="noopener noreferrer" className="shrink-0">
                  <Button variant="outline" size="sm" className="rounded-xl">
                    <FileText className="w-4 h-4 mr-1.5" /> View proof
                  </Button>
                </a>
              )}
            </div>
            {rejecting === c.id ? (
              <div className="mt-3 space-y-2">
                <Textarea
                  className="rounded-xl text-sm"
                  placeholder="Reason for rejection (shown to teen)"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={2}
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-xl"
                    onClick={() => { setRejecting(null); setReason(""); }}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="rounded-xl"
                    disabled={!reason.trim() || acting === c.id}
                    onClick={() => reject(c.id)}
                  >
                    Confirm reject
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2 mt-3">
                <Button
                  size="sm"
                  className="rounded-xl"
                  disabled={acting === c.id}
                  onClick={() => approve(c.id)}
                >
                  <Check className="w-4 h-4 mr-1.5" /> Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-xl"
                  disabled={acting === c.id}
                  onClick={() => setRejecting(c.id)}
                >
                  <X className="w-4 h-4 mr-1.5" /> Reject
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}