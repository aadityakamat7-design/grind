import React from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const FAQS = [
  {
    q: "How old do I need to be?",
    a: "Teens 13–17 can join with a parent or guardian. Blockwork is currently available in California only — we check California's rules automatically during sign-up.",
  },
  {
    q: "How do payments work?",
    a: "Neighbors pay Blockwork up front when they book — never the teen directly. We hold the money securely, and once the job is completed, Blockwork pays it out to the parent's account. No cash, no chasing payments.",
  },
  {
    q: "Is it safe?",
    a: "Yes. Adults verify their identity with a government ID and live selfie, parents approve every booking, contact details stay hidden until a booking is confirmed, and both sides rate each other after every job.",
  },
  {
    q: "How much does Blockwork charge?",
    a: "Joining is free. Blockwork takes a small service fee from each completed job to cover secure payments and safety features — teens keep the rest.",
  },
  {
    q: "How do I find jobs?",
    a: "List your services so neighbors can book you directly, or browse the local job board where neighbors post work they need done. Everything is within your own neighborhood.",
  },
];

export default function FaqSection() {
  return (
    <Accordion type="single" collapsible className="max-w-2xl mx-auto">
      {FAQS.map((f) => (
        <AccordionItem key={f.q} value={f.q} className="border-border">
          <AccordionTrigger className="text-left text-foreground font-medium hover:no-underline">
            {f.q}
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground leading-relaxed">{f.a}</AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}