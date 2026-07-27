// Server-side hazard check for teen listings. Mirrors the client-side
// checkHazard in src/lib/grind.js so a malicious client can never bypass
// the safety screening by calling saveListing directly.

const HAZARD_RULES = [
  { keywords: ['roof', 'roofing', 'gutter'], reason: 'Roof and gutter work is prohibited for minors.' },
  { keywords: ['ladder', 'scaffold'], reason: 'Work requiring ladders or scaffolding is not allowed.' },
  { keywords: ['chainsaw', 'chain saw'], reason: 'Power saws are on the hazardous-occupations list for minors.' },
  { keywords: ['drive', 'driving', 'deliver by car', 'chauffeur'], reason: 'Driving as a service is not permitted for minors.' },
  { keywords: ['power washer', 'pressure washer'], reason: 'Pressure washing may be restricted for under-16.' },
  { keywords: ['chemical', 'pesticide', 'herbicide'], reason: 'Handling hazardous chemicals is prohibited.' },
  { keywords: ['electrical', 'wiring', 'circuit'], reason: 'Electrical work is prohibited for minors.' },
  { keywords: ['firearm', 'gun', 'weapon'], reason: 'Prohibited task.' },
];

export function checkHazard(text = '', age = 18) {
  const lower = text.toLowerCase();
  for (const rule of HAZARD_RULES) {
    if (rule.keywords.some((k) => lower.includes(k))) {
      return { flagged: true, reason: rule.reason };
    }
  }
  if (age < 16 && /(mower|leaf blower|trimmer|power tool|weed whacker)/.test(lower)) {
    return { flagged: true, reason: 'Power equipment (mowers, blowers, trimmers) is not allowed for under-16.' };
  }
  return { flagged: false, reason: '' };
}