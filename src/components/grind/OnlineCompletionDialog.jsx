import React, { useState, useRef, useMemo, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Camera, X, Loader2, Timer, FileText } from "lucide-react";
import { Image } from "@/components/ui/image";

// Teen ends an online tutoring session. Requires a proof photo (screenshot of
// the video call, shared whiteboard, or worked practice problems), the actual
// session duration (auto-calculated from start to now, editable), and an
// optional note about what was covered.
//
// Photos are uploaded to PRIVATE storage — only booking participants can
// access them via signed URLs (getBookingDetail converts the URIs server-side).
//
// Sets teen_finished_at only — does NOT set buyer_finished_at or release
// payment. The buyer must separately confirm the session.
export default function OnlineCompletionDialog({ open, onOpenChange, booking, onDone }) {
  const [photos, setPhotos] = useState([]); // [{ uri, preview }]
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(30);
  const fileRef = useRef(null);

  const sessionStart = useMemo(() => {
    if (!booking.teen_started_at || !booking.buyer_started_at) return null;
    return new Date(Math.max(
      new Date(booking.teen_started_at).getTime(),
      new Date(booking.buyer_started_at).getTime()
    ));
  }, [booking.teen_started_at, booking.buyer_started_at]);

  const autoMinutes = useMemo(() => {
    if (!sessionStart) return 30;
    return Math.max(1, Math.round((Date.now() - sessionStart.getTime()) / 60000));
  }, [sessionStart]);

  // Reset and auto-calculate duration each time the dialog opens.
  useEffect(() => {
    if (open) {
      setDurationMinutes(autoMinutes);
      setPhotos([]);
      setNote("");
      setError("");
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFiles = async (files) => {
    setError("");
    if (!files || files.length === 0) return;
    if (photos.length + files.length > 3) {
      setError("You can upload up to 3 photos.");
      return;
    }
    setUploading(true);
    try {
      const newEntries = [];
      for (const file of Array.from(files)) {
        if (file.size > 10 * 1024 * 1024) {
          setError("Each photo must be under 10MB.");
          setUploading(false);
          return;
        }
        if (!file.type.startsWith("image/")) {
          setError("Only image files are allowed.");
          setUploading(false);
          return;
        }
        const preview = URL.createObjectURL(file);
        const res = await base44.integrations.Core.UploadPrivateFile({ file });
        newEntries.push({ uri: res.file_uri, preview });
      }
      setPhotos((prev) => [...prev, ...newEntries].slice(0, 3));
    } catch (err) {
      setError("Couldn't upload photo. Please try again.");
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const removePhoto = (entry) => {
    if (entry.preview) URL.revokeObjectURL(entry.preview);
    setPhotos((prev) => prev.filter((p) => p.uri !== entry.uri));
  };

  const finish = async () => {
    setUploading(true);
    setError("");
    try {
      await base44.functions.invoke("jobHandshake", {
        bookingId: booking.id,
        action: "finish",
        completionPhotos: photos.map((p) => p.uri),
        sessionDurationMinutes: Math.max(1, Math.min(480, Number(durationMinutes) || autoMinutes)),
        sessionNote: note.trim().slice(0, 500),
      });
      photos.forEach((p) => { if (p.preview) URL.revokeObjectURL(p.preview); });
      onOpenChange(false);
      setPhotos([]);
      setNote("");
      onDone?.();
    } catch (err) {
      setError(err.response?.data?.error || "Couldn't end the session. Please try again.");
    }
    setUploading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl max-w-md">
        <DialogHeader>
          <DialogTitle>End session & upload proof</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Upload a screenshot of the video call, shared whiteboard, or worked practice problems as proof the tutoring happened. Payment releases only after the neighbor confirms.
          </p>

          {photos.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {photos.map((entry) => (
                <div key={entry.uri} className="relative aspect-square rounded-xl overflow-hidden border border-border">
                  <Image src={entry.preview} alt="Proof" className="w-full h-full" fittingType="fill" />
                  <button
                    type="button"
                    onClick={() => removePhoto(entry)}
                    className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading || photos.length >= 3}
            className="w-full"
          >
            <div className="flex flex-col items-center gap-2 border border-dashed border-border rounded-xl p-6 hover:bg-accent transition-colors">
              {uploading ? (
                <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
              ) : (
                <Camera className="w-6 h-6 text-muted-foreground" />
              )}
              <span className="text-sm text-muted-foreground">
                {uploading ? "Uploading..." : photos.length >= 3 ? "Max 3 photos" : "Add proof photo"}
              </span>
            </div>
          </button>

          <div>
            <label className="text-sm font-semibold text-foreground flex items-center gap-1.5 mb-1.5">
              <Timer className="w-4 h-4" /> Actual session duration (minutes)
            </label>
            <input
              type="number"
              min={1}
              max={480}
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Auto-calculated from session start. Adjust if the system didn't capture it precisely.
            </p>
          </div>

          <div>
            <label className="text-sm font-semibold text-foreground flex items-center gap-1.5 mb-1.5">
              <FileText className="w-4 h-4" /> What was covered (optional)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder="e.g. Reviewed algebra equations and worked through 5 practice problems."
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>

          {error && <p className="text-xs text-destructive font-medium">{error}</p>}
          <Button className="w-full rounded-xl" disabled={uploading || photos.length === 0} onClick={finish}>
            {uploading ? "Ending..." : "End session"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}