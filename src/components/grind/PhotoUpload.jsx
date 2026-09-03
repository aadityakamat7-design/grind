import React, { useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Image } from "@/components/ui/image";
import { Camera, Loader2, X } from "lucide-react";

// Reusable profile-photo uploader. Calls the UploadFile integration,
// then invokes onChange with the resulting URL (or "" to clear).
export default function PhotoUpload({ photoUrl, displayName, onChange }) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const handleFile = async (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be under 5 MB.");
      return;
    }
    setUploading(true);
    setError("");
    try {
      const res = await base44.integrations.Core.UploadFile({ file });
      onChange(res.file_url);
    } catch (err) {
      setError("Couldn't upload image. Please try again.");
    } finally {
      setUploading(false);
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
          {uploading ? "Uploading..." : photoUrl ? "Change photo" : "Add photo"}
        </button>
        {error && <p className="text-xs text-destructive mt-1">{error}</p>}
        <p className="text-xs text-muted-foreground mt-1">
          Visible to neighbors on your profile.
        </p>
      </div>
    </div>
  );
}