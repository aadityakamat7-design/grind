import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, FileText, X, Award, Clock, CheckCircle2, XCircle } from "lucide-react";

// Optional skill-credential upload shown inside the listing form for
// skill-based categories. Calls onChange({ file, label }) when a valid
// file + label are provided, or onChange(null) when incomplete.
// Existing credentials for the listing (edit mode) are shown with status.
export default function CredentialUpload({ listingId, onChange }) {
  const [file, setFile] = useState(null);
  const [label, setLabel] = useState("");
  const [existing, setExisting] = useState([]);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (listingId) {
      base44.entities.Credential.filter({ listing_id: listingId })
        .then(setExisting)
        .catch(() => {});
    }
  }, [listingId]);

  useEffect(() => {
    const ready = file && label.trim() ? { file, label: label.trim() } : null;
    onChangeRef.current?.(ready);
  }, [file, label]);

  const handleFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    // Client-side validation (mirrored server-side in createCredential)
    if (f.size > 10 * 1024 * 1024) {
      alert("File is too large. Maximum size is 10MB.");
      return;
    }
    const allowed = ["image/jpeg", "image/png", "image/gif", "image/webp", "application/pdf"];
    if (!allowed.includes(f.type)) {
      alert("Only images (JPG, PNG, GIF, WebP) and PDF files are allowed.");
      return;
    }
    setFile(f);
  };

  return (
    <div className="space-y-3 rounded-xl border border-border bg-secondary/50 p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Award className="w-4 h-4" />
        Verify your skill (optional)
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">
        Upload proof of your ability — a test score screenshot/PDF, a report card, a certificate, or an award photo. An admin reviews it before the "Verified skill" badge appears on your listing and profile.
      </p>

      {existing.length > 0 && (
        <div className="space-y-1.5">
          {existing.map((c) => (
            <div key={c.id} className="flex items-center gap-2 bg-card rounded-lg p-2 text-xs border border-border">
              {c.status === "approved" ? (
                <CheckCircle2 className="w-4 h-4 text-foreground shrink-0" />
              ) : c.status === "rejected" ? (
                <XCircle className="w-4 h-4 text-muted-foreground shrink-0" />
              ) : (
                <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
              )}
              <span className="font-medium text-foreground flex-1 truncate">{c.label}</span>
              <span className="text-muted-foreground capitalize">{c.status}</span>
            </div>
          ))}
        </div>
      )}

      <div>
        <Label>Credential label</Label>
        <Input
          className="rounded-xl mt-1"
          maxLength={100}
          placeholder="e.g. SAT Math: 780"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
      </div>
      <div>
        <input
          type="file"
          accept="image/*,application/pdf"
          onChange={handleFile}
          className="hidden"
          id="credential-file"
        />
        {file ? (
          <div className="flex items-center gap-2 border border-border rounded-xl p-3.5 bg-card">
            <FileText className="w-5 h-5 text-foreground shrink-0" />
            <span className="text-sm text-foreground flex-1 truncate">{file.name}</span>
            <button
              type="button"
              onClick={() => setFile(null)}
              className="text-muted-foreground hover:text-foreground shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => document.getElementById("credential-file").click()}
            className="w-full"
          >
            <div className="flex items-center gap-2 border border-dashed border-border rounded-xl p-3.5 hover:bg-accent transition-colors">
              <Upload className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Upload screenshot or PDF</span>
            </div>
          </button>
        )}
      </div>
    </div>
  );
}