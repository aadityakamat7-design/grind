import React, { useEffect } from "react";

// Reusable per-page SEO: sets <title>, meta description, canonical link,
// Open Graph + Twitter Card tags, and injects JSON-LD structured data.
// Meta tags are upserted in place (so the platform's injected tags are reused
// rather than duplicated); JSON-LD scripts are refreshed on each render.
const SITE_NAME = "Blockwork";
const DEFAULT_OG_IMAGE =
  "https://media.base44.com/images/public/6a5e69e14e9f3a6e92e2a0eb/9685a262a_generated_image.png";

function upsertMeta(attr, key, content) {
  if (!content) return;
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function upsertLink(rel, href) {
  if (!href) return;
  let el = document.head.querySelector(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

export default function Seo({ title, description, path = "/", image, jsonLd = [] }) {
  useEffect(() => {
    const fullTitle = title
      ? `${title} — ${SITE_NAME}`
      : `${SITE_NAME} — Local teen jobs, parent-approved`;
    document.title = fullTitle;

    const origin = window.location.origin;
    const canonical = new URL(path, origin).toString();
    const ogImage = image || DEFAULT_OG_IMAGE;

    upsertMeta("name", "description", description);
    upsertLink("canonical", canonical);

    upsertMeta("property", "og:title", fullTitle);
    upsertMeta("property", "og:description", description);
    upsertMeta("property", "og:url", canonical);
    upsertMeta("property", "og:type", "website");
    upsertMeta("property", "og:site_name", SITE_NAME);
    upsertMeta("property", "og:image", ogImage);
    upsertMeta("name", "twitter:card", "summary_large_image");
    upsertMeta("name", "twitter:title", fullTitle);
    upsertMeta("name", "twitter:description", description);
    upsertMeta("name", "twitter:image", ogImage);

    // Refresh JSON-LD: drop previously injected scripts, then add current ones.
    document.head
      .querySelectorAll('script[data-seo-jsonld="true"]')
      .forEach((s) => s.remove());
    const list = Array.isArray(jsonLd) ? jsonLd : [jsonLd];
    list.filter(Boolean).forEach((obj) => {
      const s = document.createElement("script");
      s.type = "application/ld+json";
      s.setAttribute("data-seo-jsonld", "true");
      s.textContent = JSON.stringify(obj);
      document.head.appendChild(s);
    });

    return () => {
      document.head
        .querySelectorAll('script[data-seo-jsonld="true"]')
        .forEach((s) => s.remove());
    };
  }, [title, description, path, image, JSON.stringify(jsonLd)]);

  return null;
}