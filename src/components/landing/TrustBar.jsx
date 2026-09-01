import React from "react";
import { motion } from "framer-motion";
import { ShieldCheck, BadgeCheck, Lock, MapPin, Users } from "lucide-react";

// A horizontal trust strip with divider lines — not a row of identical boxes.
// Wraps naturally on small screens; the dividers only show on sm+.
const ITEMS = [
  { icon: ShieldCheck, label: "Safe community" },
  { icon: BadgeCheck, label: "Verified users" },
  { icon: Lock, label: "Secure payments" },
  { icon: MapPin, label: "Local opportunities" },
  { icon: Users, label: "Built for teens & neighbors" },
];

export default function TrustBar() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-4">
      {ITEMS.map((item, i) => (
        <React.Fragment key={item.label}>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.05, duration: 0.4 }}
            className="flex items-center gap-2"
          >
            <item.icon className="w-4 h-4 text-primary shrink-0" />
            <span className="text-sm font-medium text-foreground/80">{item.label}</span>
          </motion.div>
          {i < ITEMS.length - 1 && (
            <span className="hidden sm:block w-px h-4 bg-border" aria-hidden />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}