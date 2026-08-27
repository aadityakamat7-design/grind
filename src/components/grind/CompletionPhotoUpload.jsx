import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Camera, X, Loader2 } from "lucide-react";
import { Image } from "@/components/ui/image";

// Teen uploads completion photos and marks the job finished. The photos are
// shown to the buyer for confirmation and to admins during dispute review.
export default function CompletionPhotoUpload({ open, onOpenChange, booking, onDone }) {
  const [photos, setPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef(null);

  const handleFiles = async (files) => {
    setError("");
    if (!files || files.length === 0) return;
    if (photos.length + files.length > 6) {
      setError("You can upload up to 6 photos.");
      return;
    }
    setUploading(true);
    try {
      const urls = [];
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
        const res = await base44.integrations.Core.UploadFile({ file });
        urls.push(res.file_url);
      }
      setPhotos((prev) => [...prev, ...urls].slice(0, 6));
    } catch (err) {
      setError("Couldn't upload photos. Please try again.");
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const removePhoto = (url) => setPhotos((prev) => prev.filter((p) => p !== url));

  const finish = async () => {
    setUploading(true);
    setError("");
    try {
      await base44.functions.invoke("jobHandshake", {
        bookingId: booking.id,
        action: "finish",
        completionPhotos: photos,
      });
      onOpenChange(false);
      setPhotos([]);
      onDone?.();
    } catch (err) {
      setError(err.response?.data?.error || "Couldn't finish the job. Please try again.");
    }
    setUploading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl max-w-md">
        <DialogHeader>
          <DialogTitle>Finish job & upload photos</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Upload photos showing the completed work. Your neighbor has 12 hours to confirm the job is done before payment is released to your parent.
          </p>
          {photos.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {photos.map((url) => (
                <div key={url} className="relative aspect-square rounded-xl overflow-hidden border border-border">
                  <Image src={url} alt="Proof" className="w-full h-full" fittingType="fill" />
                  <button
                    type="button"
                    onClick={() => removePhoto(url)}
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
            disabled={uploading || photos.length >= 6}
            className="w-full"
          >
            <div className="flex flex-col items-center gap-2 border border-dashed border-border rounded-xl p-6 hover:bg-accent transition-colors">
              {uploading ? (
                <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
              ) : (
                <Camera className="w-6 h-6 text-muted-foreground" />
              )}
              <span className="text-sm text-muted-foreground">
                {uploading ? "Uploading..." : photos.length >= 6 ? "Max 6 photos" : "Add photos"}
              </span>
            </div>
          </button>
          {error && <p className="text-xs text-destructive font-medium">{error}</p>}
          <Button className="w-full rounded-xl" disabled={uploading || photos.length === 0} onClick={finish}>
            {uploading ? "Finishing..." : "Finish job"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}