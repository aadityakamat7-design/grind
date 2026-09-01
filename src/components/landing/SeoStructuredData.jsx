import React from "react";

// JSON-LD structured data for the public landing page. Rendered into the DOM
// (index.html meta tags are platform-managed) so search engines can understand
// Blockwork as a local teen-jobs marketplace. Helps rich-result eligibility
// and entity recognition without touching index.html.
const ORG_URL = "https://teenskickstart.base44.app";

export default function SeoStructuredData() {
  const organization = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Blockwork",
    url: ORG_URL,
    description:
      "A parent-approved local marketplace where neighborhood teens earn real paychecks doing outdoor work and online tutoring.",
  };

  const website = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Blockwork",
    url: ORG_URL,
  };

  const service = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "Blockwork teen jobs marketplace",
    serviceType: "Local teen jobs marketplace",
    provider: { "@type": "Organization", name: "Blockwork", url: ORG_URL },
    areaServed: "US",
    description:
      "Teens offer lawn care, car washing, pet sitting, tech help, tutoring, and odd jobs to neighbors — with a parent approving every booking and escrow-protected payments.",
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organization) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(website) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(service) }} />
    </>
  );
}