import React, { useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { ShieldCheck, AlertCircle, Camera, Loader2, IdCard } from "lucide-react";

// Photo-based ID verification: the user takes a photo of their government-issued
// ID; the AI analysis and profile update run server-side (verifyIdPhoto function).
export default function IdentityVerifyCard({ onVerified, role = "PARENT" }) {
  const fileRef = useRef(null);
  const [status, setStatus] = useState("idle"); // idle | analyzing | failed
  const [error, setError] = useState("");

  const handlePhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setStatus("analyzing");
    setError("");

    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    // AI analysis + verified-status update both run server-side
    const res = await base44.functions.invoke("verifyIdPhoto", { fileUrl: file_url, role });

    if (!res.data?.verified) {
      setError(res.data?.reason || "The photo doesn't appear to show a valid government-issued ID.");
      setStatus("failed");
      return;
    }
    onVerified?.();
  };

  if (status === "analyzing")
    return (
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-2">
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
          <p className="text-sm font-semibold text-slate-700">Analyzing your ID…</p>
        </div>
        <p className="text-xs text-slate-500">Our AI is checking that your ID is real. This takes a few seconds.</p>
      </div>
    );

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
      <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center">
        <IdCard className="w-7 h-7 text-blue-600" />
      </div>
      <div>
        <h3 className="font-bold text-slate-900">Verify your identity</h3>
        <p className="text-sm text-slate-500 mt-1">
          {role === "BUYER"
            ? "Because you'll be working with teens, every neighbor verifies who they are."
            : "To protect teens on KickStart, every parent verifies who they are."}{" "}
          Take a clear photo of your government-issued
          photo ID (driver's license, state ID, or passport) and our AI will verify it's real.
        </p>
      </div>
      <div className="bg-blue-50 rounded-xl p-3 text-xs text-blue-900 flex items-start gap-2">
        <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
        Make sure the whole ID is in frame, well lit, and the text is readable.
      </div>
      {(status === "failed" || error) && (
        <div className="flex items-start gap-2 bg-rose-50 border border-rose-200 rounded-xl p-3 text-sm text-rose-700">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error} Please retake the photo and try again.</span>
        </div>
      )}
      <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhoto} />
      <Button className="w-full rounded-xl" onClick={() => fileRef.current?.click()}>
        <Camera className="w-4 h-4 mr-2" />
        {status === "failed" ? "Retake photo of my ID" : "Take a photo of my ID"}
      </Button>
    </div>
  );
}