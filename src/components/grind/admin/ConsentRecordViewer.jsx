import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, ShieldX, ChevronDown, ChevronRight, FileText, Globe, Monitor } from "lucide-react";

// Admin viewer for the full auditable consent record per parent-teen pair.
// Shows each itemized consent acknowledgment with timestamps, IP, user agent,
// the state rules shown, and revocation status.
export default function ConsentRecordViewer() {
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [records, setRecords] = useState({});
  const [loadingRecords, setLoadingRecords] = useState({});

  const load = async () => {
    try {
      const allLinks = await base44.entities.ParentTeenLink.list("-created_date", 200);
      setLinks(allLinks);
    } catch (err) {
      console.error("ConsentRecordViewer load failed:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const loadRecord = async (link) => {
    setLoadingRecords((prev) => ({ ...prev, [link.id]: true }));
    try {
      const data = await fetch(`/functions/getConsentRecord?linkId=${link.id}`).then(r => r.json());
      setRecords((prev) => ({ ...prev, [link.id]: data }));
    } catch (err) {
      console.error("Failed to load consent record:", err);
    } finally {
      setLoadingRecords((prev) => ({ ...prev, [link.id]: false }));
    }
  };

  const toggle = (link) => {
    const id = link.id;
    if (expanded === id) {
      setExpanded(null);
    } else {
      setExpanded(id);
      if (!records[id]) loadRecord(link);
    }
  };

  if (loading) {
    return (
      <div className="bg-card rounded-2xl border border-border p-6">
        <div className="h-6 w-48 rounded bg-muted skeleton-shimmer mb-4" />
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-muted skeleton-shimmer" />
          ))}
        </div>
      </div>
    );
  }

  if (links.length === 0) {
    return (
      <div className="bg-card rounded-2xl border border-border p-6 text-center">
        <p className="text-[14px] text-muted-foreground">No parent-teen links yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {links.map((link) => {
        const isExpanded = expanded === link.id;
        const record = records[link.id];
        const isLoading = loadingRecords[link.id];
        const latestConsent = record?.consentRecords?.[0];
        const isRevoked = !!link.consent_revoked_at;

        return (
          <div key={link.id} className="bg-card rounded-2xl border border-border shadow-soft overflow-hidden">
            <button
              onClick={() => toggle(link)}
              className="w-full flex items-center justify-between p-4 hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
                <div className="text-left min-w-0">
                  <p className="font-bold text-foreground text-[14px] truncate">
                    {link.teen_display_name || "Unknown teen"}
                  </p>
                  <p className="text-[12px] text-muted-foreground mt-0.5">
                    Consent v{link.consent_version || "—"} · {link.status === "confirmed" ? "Confirmed" : "Pending"}
                    {link.consented_at && ` · ${new Date(link.consented_at).toLocaleDateString()}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {isRevoked ? (
                  <Badge variant="destructive" className="rounded-full text-[10px]">
                    <ShieldX className="w-3 h-3 mr-1" /> Revoked
                  </Badge>
                ) : link.status === "confirmed" ? (
                  <Badge className="bg-emerald-100 text-emerald-700 rounded-full text-[10px]">
                    <ShieldCheck className="w-3 h-3 mr-1" /> Active
                  </Badge>
                ) : (
                  <Badge variant="outline" className="rounded-full text-[10px]">Pending</Badge>
                )}
              </div>
            </button>

            {isExpanded && (
              <div className="border-t border-border p-4 space-y-4 bg-muted/30">
                {isLoading && (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => <div key={i} className="h-8 rounded-lg bg-muted skeleton-shimmer" />)}
                  </div>
                )}

                {record && !isLoading && (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                      <div className="bg-white rounded-lg p-2 border border-border">
                        <p className="text-muted-foreground">Identity verified</p>
                        <p className="font-bold text-foreground">{link.identity_verified ? "✓ Yes" : "✗ No"}</p>
                      </div>
                      <div className="bg-white rounded-lg p-2 border border-border">
                        <p className="text-muted-foreground">Relationship attested</p>
                        <p className="font-bold text-foreground">{link.relationship_confirmed ? "✓ Yes" : "✗ No"}</p>
                      </div>
                      <div className="bg-white rounded-lg p-2 border border-border">
                        <p className="text-muted-foreground">State rules acknowledged</p>
                        <p className="font-bold text-foreground">{link.state_rules_acknowledged ? "✓ Yes" : "✗ No"}</p>
                      </div>
                      <div className="bg-white rounded-lg p-2 border border-border">
                        <p className="text-muted-foreground">Consent version</p>
                        <p className="font-bold text-foreground">v{link.consent_version || "—"}</p>
                      </div>
                    </div>

                    {latestConsent && (
                      <>
                        <div>
                          <p className="text-[12px] font-bold text-foreground mb-2 flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5" /> Itemized consent acknowledgments
                          </p>
                          <div className="space-y-1.5">
                            {latestConsent.consents?.map((c, idx) => (
                              <div key={idx} className="bg-white rounded-lg p-2.5 border border-border">
                                <div className="flex items-start gap-2">
                                  <span className={`text-[10px] font-bold mt-0.5 ${c.accepted ? "text-emerald-600" : "text-rose-600"}`}>
                                    {c.accepted ? "✓" : "✗"}
                                  </span>
                                  <div className="min-w-0">
                                    <p className="text-[11px] text-slate-700">{c.label}</p>
                                    <p className="text-[10px] text-muted-foreground mt-0.5">
                                      {c.accepted_at ? new Date(c.accepted_at).toLocaleString() : "Not acknowledged"}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div className="bg-white rounded-lg p-2.5 border border-border">
                            <p className="text-[10px] font-bold text-muted-foreground flex items-center gap-1 mb-1">
                              <Globe className="w-3 h-3" /> IP Address
                            </p>
                            <p className="text-[11px] text-foreground font-mono">{latestConsent.ip || "—"}</p>
                          </div>
                          <div className="bg-white rounded-lg p-2.5 border border-border">
                            <p className="text-[10px] font-bold text-muted-foreground flex items-center gap-1 mb-1">
                              <Monitor className="w-3 h-3" /> User Agent
                            </p>
                            <p className="text-[11px] text-foreground truncate" title={latestConsent.user_agent}>
                              {latestConsent.user_agent || "—"}
                            </p>
                          </div>
                        </div>

                        {latestConsent.state_rules_shown && (
                          <div className="bg-white rounded-lg p-2.5 border border-border">
                            <p className="text-[10px] font-bold text-muted-foreground mb-1">State rules shown at consent</p>
                            <pre className="text-[10px] text-slate-600 whitespace-pre-wrap max-h-32 overflow-y-auto">
                              {(() => {
                                try { return JSON.stringify(JSON.parse(latestConsent.state_rules_shown), null, 2); }
                                catch { return latestConsent.state_rules_shown; }
                              })()}
                            </pre>
                          </div>
                        )}

                        {latestConsent.status === "revoked" && (
                          <div className="bg-rose-50 border border-rose-200 rounded-lg p-2.5">
                            <p className="text-[11px] font-bold text-rose-700">Authorization revoked</p>
                            <p className="text-[10px] text-rose-600 mt-0.5">
                              {latestConsent.revoked_at ? new Date(latestConsent.revoked_at).toLocaleString() : ""}
                              {latestConsent.revoked_reason ? ` — ${latestConsent.revoked_reason}` : ""}
                            </p>
                          </div>
                        )}
                      </>
                    )}

                    {!latestConsent && (
                      <p className="text-[12px] text-muted-foreground">No consent records found for this link.</p>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}