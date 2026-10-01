import React, { useRef, useState } from "react";
import { Image } from "@/components/ui/image";
import { Camera, Loader2, X } from "lucide-react";
import { uploadPhoto } from "@/lib/imageProcessing";

// Reusable profile-photo uploader. HEIC iPhone photos are converted to JPEG,
// resized, compressed, and stripped of location metadata before upload, with
// progress and one automatic retry — then onChange receives the public URL
// (or "" to clear).
export default function PhotoUpload({ photoUrl, displayName, onChange }) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");

  const handleFile = async (file) => {
    if (!file) return;
    setUploading(true);
    setError("");
    setProgress(0);
    try {
      const url = await uploadPhoto(file, { onProgress: setProgress });
      onChange(url);
    } catch (err) {
      setError(err.message || "Couldn't upload that photo. Please try again.");
    } finally {
      setUploading(false);
      setProgress(0);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const initial = displayName?.charAt(0)?.toUpperCase() || "?";

  return (
    <div className="flex items-center gap-4">
      <div className="relative shrink-0">
        {photoUrl ? (
          <Image
            src={photoUrl}
            alt={displayName || "Profile photo"}
            className="w-20 h-20 rounded-2xl"
            fittingType="fill"
          />
        ) : (
          <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-bold text-2xl">
            {initial}
          </div>
        )}
        {photoUrl && !uploading && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-soft"
            aria-label="Remove photo"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline disabled:opacity-50"
        >
          {uploading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Camera className="w-4 h-4" />
          )}
          {uploading ? "Uploading…" : photoUrl ? "Change photo" : "Add photo"}
        </button>
        {uploading && (
          <div className="h-1 rounded-full bg-border overflow-hidden mt-1.5 max-w-[160px]">
            <div className="h-full bg-primary transition-all duration-200" style={{ width: `${progress}%` }} />
          </div>
        )}
        {error && <p className="text-xs text-destructive mt-1">{error}</p>}
        <p className="text-xs text-muted-foreground mt-1">
          Visible to neighbors on your profile.
        </p>
      </div>
    </div>
  );
}