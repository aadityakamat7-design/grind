import React from "react";

// Reusable FAQ section for public pages — renders real questions with
// proper h2/h3 structure for SEO. Each FAQ is a { q, a } pair.
export default function PublicFaq({ faqs, title = "Frequently asked questions", eyebrow }) {
  if (!faqs || faqs.length === 0) return null;
  return (
    <div className="mt-10">
      {eyebrow && <p className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.2em] mb-3">{eyebrow}</p>}
      <h2 className="text-xl font-bold text-foreground mb-4">{title}</h2>
      <div className="space-y-3">
        {faqs.map((f) => (
          <div key={f.q} className="bg-card rounded-2xl border border-border shadow-soft p-5">
            <h3 className="font-bold text-foreground text-sm">{f.q}</h3>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{f.a}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// Helper: builds FAQPage JSON-LD from a faqs array
export function faqJsonLd(faqs) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}

// Helper: builds BreadcrumbList JSON-LD from a crumbs array [{ name, path }]
export function breadcrumbJsonLd(crumbs) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: `https://blockwork.online${c.path}`,
    })),
  };
}