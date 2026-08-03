import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import LinkTeenCard from "@/components/grind/parent/LinkTeenCard";

// Small, subtle "Link another student" hyperlink that opens the same linking
// flow in a dialog — a footer-level link, not a featured card or button.
export default function LinkTeenDialog({ onLinked }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
      >
        Link another student
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle>Link a student</DialogTitle>
            <DialogDescription>
              Enter the parent code your teen generated in their app to connect their account to yours.
            </DialogDescription>
          </DialogHeader>
          <LinkTeenCard
            onLinked={() => {
              setOpen(false);
              onLinked?.();
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}