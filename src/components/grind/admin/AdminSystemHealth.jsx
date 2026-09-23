import React, { useState, useMemo } from "react";
import { Activity, CheckCircle2, AlertTriangle, RefreshCw, Webhook, Server, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import StatCard from "@/components/grind/StatCard";

export default function AdminSystemHealth({ webhooks, onReload }) {
  const [refreshing, setRefreshing] = useState(false);

  const refresh = async () => {
    setRefreshing(true);
    await onReload?.();
    setRefreshing(false);
  };

  const failed = useMemo(() => webhooks.filter((w) => w.description?.toLowerCase().includes("fail") || w.description?.toLowerCase().includes("error")), [webhooks]);
  const eventTypes = useMemo(() => {
    const counts = {};
    webhooks.forEach((w) => { counts[w.event_type] = (counts[w.event_type] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [webhooks]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Recent system events and webhook deliveries.</p>
        <Button size="sm" variant="outline" className="rounded-full" disabled={refreshing} onClick={refresh}>
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${refreshing ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Webhook} label="Webhook events" value={webhooks.length} subtitle="total logged" accent="text-primary" />
        <StatCard icon={AlertTriangle} label="Failed deliveries" value={failed.length} subtitle={failed.length === 0 ? "all healthy" : "needs attention"} accent={failed.length > 0 ? "text-destructive" : "text-emerald-600"} />
        <StatCard icon={Activity} label="Event types" value={eventTypes.length} subtitle="unique types" accent="text-primary" />
        <StatCard icon={Server} label="Server errors" value="—" subtitle="see platform logs" accent="text-muted-foreground" />
      </div>

      <div className="bg-card rounded-2xl border border-border shadow-soft p-4">
        <h3 className="text-[14px] font-bold text-foreground mb-3 flex items-center gap-2">
          <Webhook className="w-4 h-4 text-primary" /> Recent webhook events
        </h3>
        {webhooks.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No webhook events logged.</p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {webhooks.map((w) => {
              const isFail = w.description?.toLowerCase().includes("fail") || w.description?.toLowerCase().includes("error");
              return (
                <div key={w.id} className="flex items-start gap-3 py-2 border-b border-border last:border-0">
                  {isFail ? <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" /> : <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground truncate">{w.event_type}</p>
                    <p className="text-xs text-muted-foreground truncate">{w.description}</p>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">{w.created_date ? new Date(w.created_date).toLocaleString() : "—"}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="bg-card rounded-2xl border border-border shadow-soft p-4">
        <h3 className="text-[14px] font-bold text-foreground mb-3 flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" /> Event type breakdown
        </h3>
        {eventTypes.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No events.</p>
        ) : (
          <div className="space-y-2">
            {eventTypes.map(([type, count]) => {
              const max = eventTypes[0][1] || 1;
              return (
                <div key={type} className="flex items-center gap-3">
                  <div className="w-48 text-xs text-muted-foreground truncate shrink-0">{type}</div>
                  <div className="flex-1 h-6 bg-secondary rounded-lg overflow-hidden">
                    <div className="h-full rounded-lg bg-primary/70" style={{ width: `${(count / max) * 100}%` }} />
                  </div>
                  <span className="text-xs font-bold text-foreground w-8 text-right shrink-0">{count}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="bg-secondary/50 rounded-2xl border border-border p-4">
        <h3 className="text-[14px] font-bold text-foreground mb-2 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-muted-foreground" /> Platform notes
        </h3>
        <ul className="text-xs text-muted-foreground space-y-1.5">
          <li>• Server error logs (500s) and runtime logs are available in the dashboard under <span className="font-semibold">Logs</span>.</li>
          <li>• Stripe webhook signing secrets are managed in <span className="font-semibold">Settings → Secrets</span>.</li>
          <li>• <span className="font-semibold">npm audit</span> / dependency status is not surfaced in-app — run locally or via CI for vulnerability scanning.</li>
        </ul>
      </div>
    </div>
  );
}