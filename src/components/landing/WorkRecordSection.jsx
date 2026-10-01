import React from "react";
import { motion } from "framer-motion";
import { Award, ShieldCheck, FileText } from "lucide-react";

// Landing-page section for the Verified Work Record.
// Wording rule: "verified by Blockwork" — never "certified" or "accredited",
// and never a claim that colleges officially recognize it.
export default function WorkRecordSection() {
  const points = [
    { icon: FileText, text: "Every completed, paid job is listed with its date, category and hours." },
    { icon: ShieldCheck, text: "Every job was approved by a parent and paid through Blockwork — nothing is typed in by hand." },
    { icon: Award, text: "Download a clean PDF, or share a verification link a school or employer can check in one click." },
  ];

  return (
    <section className="relative z-10 max-w-6xl mx-auto px-6 pb-10 sm:pb-16">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.5 }}
        className="bg-card rounded-3xl border border-border shadow-elevated p-7 sm:p-10"
      >
        <div className="flex flex-col sm:flex-row gap-6 sm:gap-10 items-start">
          <div className="flex-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.2em] mb-3">
              Work Record
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground text-balance">
              Turn neighborhood jobs into real experience.
            </h2>
            <p className="text-muted-foreground mt-4 leading-relaxed">
              Every completed job builds your Blockwork Work Record, a verified history you can add to college
              applications, résumés, and job applications.
            </p>
            <p className="text-xs text-muted-foreground mt-4">
              Verified by Blockwork. List it under activities or work experience.
            </p>
          </div>
          <div className="w-full sm:w-80 space-y-3">
            {points.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-start gap-3 rounded-2xl bg-secondary p-3.5">
                <div className="w-8 h-8 rounded-lg bg-card flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
                <p className="text-[13px] text-foreground/85 leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </section>
  );
}