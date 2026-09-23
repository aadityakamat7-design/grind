import React, { useState, useMemo } from "react";
import { Search, X, ShieldCheck, BadgeCheck, AlertTriangle, Star } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import StatusBadge from "@/components/grind/StatusBadge";
import { money } from "@/lib/grind";

const ROLE_LABELS = { teen: "Teen", parent: "Parent", buyer: "Neighbor", admin: "Admin" };

export default function AdminUsers({ users, teens, buyers, parents, links, reports, listings, bookings }) {
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [selected, setSelected] = useState(null);

  const teenByUserId = useMemo(() => Object.fromEntries(teens.map((t) => [t.user_id, t])), [teens]);
  const buyerByUserId = useMemo(() => Object.fromEntries(buyers.map((b) => [b.user_id, b])), [buyers]);
  const parentByUserId = useMemo(() => Object.fromEntries(parents.map((p) => [p.user_id, p])), [parents]);

  const rows = useMemo(() => {
    return users.map((u) => {
      const teen = teenByUserId[u.id];
      const buyer = buyerByUserId[u.id];
      const parent = parentByUserId[u.id];
      const role = u.app_role || (teen ? "teen" : buyer ? "buyer" : parent ? "parent" : "—");
      const displayName = teen?.display_name || buyer?.full_name || parent?.full_name || u.full_name || u.email;
      return { ...u, role, displayName, teen, buyer, parent };
    });
  }, [users, teenByUserId, buyerByUserId, parentByUserId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((u) => {
      if (roleFilter !== "all" && u.role !== roleFilter) return false;
      if (!q) return true;
      return (u.email || "").toLowerCase().includes(q) || (u.displayName || "").toLowerCase().includes(q);
    });
  }, [rows, query, roleFilter]);

  const userReports = (selected ? reports.filter((r) => r.subject_id === selected.id || r.reporter_id === selected.id) : []);
  const userBookings = (selected ? bookings.filter((b) => b.teen_user_id === selected.id || b.buyer_user_id === selected.id || b.parent_user_id === selected.id) : []);
  const userListings = (selected ? listings.filter((l) => l.teen_user_id === selected.id) : []);
  const userLinks = (selected ? links.filter((l) => l.parent_user_id === selected.id || l.teen_user_id === selected.id) : []);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="rounded-xl pl-9" placeholder="Search by name or email…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <div className="flex gap-1.5">
          {["all", "teen", "parent", "buyer", "admin"].map((r) => (
            <button key={r} onClick={() => setRoleFilter(r)}
              className={`px-3 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${roleFilter === r ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
              {r === "all" ? "All" : ROLE_LABELS[r]}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 text-muted-foreground">
              <tr>
                <th className="text-left font-semibold px-4 py-3">Name</th>
                <th className="text-left font-semibold px-4 py-3">Email</th>
                <th className="text-left font-semibold px-4 py-3">Role</th>
                <th className="text-left font-semibold px-4 py-3 hidden sm:table-cell">Joined</th>
                <th className="text-left font-semibold px-4 py-3 hidden md:table-cell">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id} className="border-t border-border hover:bg-secondary/30 cursor-pointer" onClick={() => setSelected(u)}>
                  <td className="px-4 py-3 font-semibold text-foreground truncate max-w-[160px]">{u.displayName}</td>
                  <td className="px-4 py-3 text-muted-foreground truncate max-w-[200px]">{u.email}</td>
                  <td className="px-4 py-3"><span className="text-xs font-bold px-2 py-0.5 rounded-full bg-secondary">{ROLE_LABELS[u.role] || u.role}</span></td>
                  <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{u.created_date ? new Date(u.created_date).toLocaleDateString() : "—"}</td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    {u.teen?.status === "suspended" ? <StatusBadge status="denied" /> :
                     u.teen?.status === "active" ? <StatusBadge status="active" /> :
                     u.parent?.identity_status === "verified" ? <StatusBadge status="active" /> :
                     <StatusBadge status="pending" />}
                  </td>
                  <td className="px-4 py-3 text-right"><X className="w-4 h-4 text-muted-foreground rotate-45" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">No users match your search.</p>}
      </div>
      <p className="text-xs text-muted-foreground">{filtered.length} of {users.length} users</p>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="rounded-2xl max-w-lg max-h-[85vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader><DialogTitle>{selected.displayName}</DialogTitle></DialogHeader>
              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Email" value={selected.email} />
                  <Field label="Role" value={ROLE_LABELS[selected.role] || selected.role} />
                  <Field label="Joined" value={selected.created_date ? new Date(selected.created_date).toLocaleDateString() : "—"} />
                  <Field label="Onboarded" value={selected.onboarded ? "Yes" : "No"} />
                </div>

                {selected.teen && (
                  <div className="rounded-xl border border-border p-3 space-y-1.5">
                    <p className="font-bold text-foreground flex items-center gap-1.5"><BadgeCheck className="w-4 h-4 text-primary" /> Teen profile</p>
                    <Field label="Display name" value={selected.teen.display_name} />
                    <Field label="City" value={selected.teen.resolved_city || selected.teen.state || "—"} />
                    <Field label="Jobs completed" value={selected.teen.jobs_completed || 0} />
                    <Field label="Rating" value={selected.teen.avg_rating ? `${selected.teen.avg_rating.toFixed(1)}★ (${selected.teen.review_count} reviews)` : "No ratings"} />
                    <Field label="Identity" value={selected.teen.identity_status || "unverified"} />
                    <Field label="Connect" value={selected.teen.connect_status || "not_setup"} />
                    <Field label="Profile status" value={selected.teen.status} />
                    <Field label="Active listings" value={userListings.filter((l) => l.status === "published").length} />
                  </div>
                )}

                {selected.parent && (
                  <div className="rounded-xl border border-border p-3 space-y-1.5">
                    <p className="font-bold text-foreground flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-primary" /> Parent profile</p>
                    <Field label="Identity verified" value={selected.parent.is_identity_verified ? "Yes" : "No"} />
                    <Field label="Connect status" value={selected.parent.connect_status || "not_setup"} />
                    <Field label="Bank" value={selected.parent.bank_last4 ? `****${selected.parent.bank_last4}` : "—"} />
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Linked teens</p>
                      {userLinks.filter((l) => l.parent_user_id === selected.id).length === 0
                        ? <p className="text-xs text-muted-foreground">None</p>
                        : userLinks.filter((l) => l.parent_user_id === selected.id).map((l) => (
                          <div key={l.id} className="text-xs text-foreground">{l.teen_display_name} · {l.status}</div>
                        ))}
                    </div>
                  </div>
                )}

                {selected.buyer && (
                  <div className="rounded-xl border border-border p-3 space-y-1.5">
                    <p className="font-bold text-foreground flex items-center gap-1.5"><Star className="w-4 h-4 text-primary" /> Neighbor profile</p>
                    <Field label="City" value={selected.buyer.resolved_city || "—"} />
                    <Field label="Jobs completed" value={selected.buyer.jobs_completed || 0} />
                    <Field label="Rating" value={selected.buyer.avg_rating ? `${selected.buyer.avg_rating.toFixed(1)}★` : "No ratings"} />
                  </div>
                )}

                <div>
                  <p className="font-bold text-foreground mb-1.5 flex items-center gap-1.5"><AlertTriangle className="w-4 h-4 text-amber-500" /> Reports & flags</p>
                  {userReports.length === 0 ? <p className="text-xs text-muted-foreground">No reports filed.</p> : (
                    <div className="space-y-1.5">
                      {userReports.map((r) => (
                        <div key={r.id} className="text-xs bg-secondary rounded-lg p-2">
                          <span className="font-semibold capitalize">{r.reason}</span> · {r.status} · {r.details?.slice(0, 80) || "—"}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <p className="font-bold text-foreground mb-1.5">Bookings ({userBookings.length})</p>
                  {userBookings.length === 0 ? <p className="text-xs text-muted-foreground">No bookings.</p> : (
                    <div className="space-y-1.5 max-h-40 overflow-y-auto">
                      {userBookings.slice(0, 20).map((b) => (
                        <div key={b.id} className="text-xs bg-secondary rounded-lg p-2 flex justify-between">
                          <span className="truncate">{b.listing_title}</span>
                          <span className="font-semibold ml-2">{b.status}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium text-foreground">{value ?? "—"}</p>
    </div>
  );
}