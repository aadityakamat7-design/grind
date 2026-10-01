// Layered safety screening for every chat message. Three passes, cheapest first:
//
//   1. Rules (free, every message)          — deterministic patterns for contact
//      info, payment apps, meeting-elsewhere, secrecy, personal questions,
//      threats, sexual content and slurs.
//   2. OpenAI Moderation (free, every message when OPENAI_API_KEY is set) —
//      omni-moderation-latest catches sexual content (including involving
//      minors), harassment, hate, violence and self-harm.
//   3. LLM review (paid, only when unsure) — one small InvokeLLM call when the
//      rules and moderation disagree or land in the grey zone. Never every
//      message.
//
// Severity decides the outcome: low = mask the part and deliver, medium = hold
// for admin review, high = block. Senders are never told which rule matched.

export type SafetySeverity = 'none' | 'low' | 'medium' | 'high';
export type SafetyAction = 'delivered' | 'masked' | 'held' | 'blocked';

export interface SafetyVerdict {
  action: SafetyAction;
  severity: SafetySeverity;
  categories: string[];
  maskedText: string;
  reason: string;
  selfHarm: boolean;
  moderationUsed: boolean;
  llmUsed: boolean;
}

export const MASKED_CONTACT = '[contact info hidden]';

const SEVERITY_RANK: Record<SafetySeverity, number> = { none: 0, low: 1, medium: 2, high: 3 };

interface Rule {
  key: string;
  severity: SafetySeverity;
  re: RegExp;
  mask?: boolean;
}

// Number words spelled out ("five five five one two three...") count as a phone
// number, so digits-only patterns aren't enough on their own.
const NUMBER_WORDS = '(?:zero|oh|one|two|three|four|five|six|seven|eight|nine|ten)';

const RULES: Rule[] = [
  // ── Contact info and off-platform payment (low: mask and deliver) ──
  { key: 'phone_spelled', severity: 'low', mask: true, re: new RegExp(`(?:\\b${NUMBER_WORDS}\\b[\\s,.\\-]*){6,}`, 'i') },
  { key: 'phone', severity: 'low', mask: true, re: /(\+?\d[\d\-.\s()]{7,}\d)/g },
  { key: 'email', severity: 'low', mask: true, re: /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi },
  { key: 'social_handle', severity: 'low', mask: true, re: /\b(?:instagram|insta|snapchat|snap|tiktok|discord|whatsapp|kik|telegram|signal|be\\s?real)\b|\badd me\b|(?:^|\s)@[a-z0-9._]{3,}/gi },
  { key: 'payment_app', severity: 'low', mask: true, re: /\b(?:venmo|zelle|cash\s?app|paypal|apple cash|google pay|money order|western union)\b|\bpay (?:me|you|us) (?:directly|in cash|outside|cash)\b|\bcash (?:only|directly|outside)\b/gi },
  { key: 'address', severity: 'low', mask: true, re: /(\d{1,5}\s+[A-Za-z0-9.\s]{2,}\s(?:street|st|avenue|ave|road|rd|blvd|boulevard|lane|ln|drive|dr|court|ct|way|circle|terrace|place|pl)\b)/gi },

  // ── Meeting elsewhere, links, gifts, personal questions (medium: hold) ──
  { key: 'meet_elsewhere', severity: 'medium', re: /\bmeet me (?:at|in|by|near)\b|\bcome (?:inside|in|over)\b|\b(?:my|your) (?:place|house|home|apartment|room)\b|\b(?:at|in) (?:my|your) car\b|\boutside the app\b|\bpick me up\b/gi },
  { key: 'link', severity: 'medium', re: /(?:https?:\/\/|www\.)\S+|\b[a-z0-9-]{2,}\.(?:com|net|org|io|co|link|me)\b/gi },
  { key: 'gift_or_money', severity: 'medium', re: /\bgift ?card\b|\b(?:give|send|buy) (?:you )?(?:money|a gift|gifts|cash)\b|\bextra (?:money|cash) (?:if|for)\b|\bpay you extra (?:if|for)\b/gi },
  { key: 'personal_questions', severity: 'medium', re: /\bare you (?:home )?alone\b|\bwho(?:'s| is) (?:home )?with you\b|\b(?:what|which) school\b|\bhow old are you\b|\bwhat(?:'s| is) your age\b|\bare your parents (?:home|around|there)\b|\bwhen do you (?:get home|finish|get out)\b|\bwhat(?:'s| is) your (?:schedule|address|number)\b/gi },

  // ── Secrecy, threats, appearance and sexual content (high: block) ──
  { key: 'secrecy', severity: 'high', re: /\bdon'?t tell (?:your )?(?:parents?|mom|dad|mother|father|anyone)\b|\bour secret\b|\bkeep (?:this|it) (?:between us|secret|quiet)\b|\bdelete (?:this|these|the) (?:messages?|chat|texts?)\b|\bno ?one (?:has to|needs to|will) know\b/gi },
  { key: 'threat', severity: 'high', re: /\bi(?:'ll| will) (?:hurt|kill|beat|find|come for) you\b|\byou(?:'ll| will) regret\b|\bwatch your back\b|\bi know where you live\b|\bor else\b/gi },
  { key: 'appearance', severity: 'high', re: /\bwhat do you look like\b|\bare you (?:pretty|cute|hot|attractive|sexy)\b|\bwhat are you wearing\b|\bsend (?:me )?(?:a )?(?:pic|pics|photo|photos|selfie)\b|\byour body\b|\bhow (?:tall|short) are you\b/gi },
  { key: 'sexual', severity: 'high', re: /\b(?:sex|sexy|sexual|nude|nudes|porn|horny|hook ?up|make ?out|kiss me|touch me|virgin)\b|\b(?:blow|hand) ?job\b/gi },
  { key: 'slur', severity: 'high', re: /\b(?:f[a@]g|n[i1]gg|retard|tr[a@]nn|ch[i1]nk|sp[i1]c|k[i1]ke|wetback)\b/gi },
  { key: 'self_harm', severity: 'high', re: /\b(?:kill myself|kill my self|killing myself|suicid(?:e|al)|end my life|end it all|cut myself|cutting myself|self ?harm|want to die|wanna die|better off dead|hurt myself)\b/gi },
];

export interface RuleHit {
  key: string;
  severity: SafetySeverity;
  mask: boolean;
}

// Pass 1 — free, deterministic, runs on every message.
export function applyRules(body: string): { hits: RuleHit[]; maskedText: string } {
  const text = String(body || '');
  const hits: RuleHit[] = [];
  let maskedText = text;

  for (const rule of RULES) {
    // Fresh regex state per call — these are module-level and stateful with /g.
    const re = new RegExp(rule.re.source, rule.re.flags);
    if (!re.test(text)) continue;
    hits.push({ key: rule.key, severity: rule.severity, mask: !!rule.mask });
    if (rule.mask) {
      maskedText = maskedText.replace(new RegExp(rule.re.source, rule.re.flags), MASKED_CONTACT);
    }
  }
  return { hits, maskedText };
}

function worst(hits: RuleHit[]): SafetySeverity {
  return hits.reduce<SafetySeverity>(
    (acc, h) => (SEVERITY_RANK[h.severity] > SEVERITY_RANK[acc] ? h.severity : acc),
    'none',
  );
}

// Pass 2 — OpenAI's moderation endpoint. Free with an OpenAI key, and the only
// paid-vendor-free way to catch sexual content involving minors reliably.
// Returns null when no key is configured or the call fails, so a missing key
// degrades to rules-only instead of blocking every message.
export async function moderateText(text: string): Promise<{
  flagged: boolean;
  maxScore: number;
  categories: string[];
} | null> {
  const key = Deno.env.get('OPENAI_API_KEY');
  if (!key) return null;
  try {
    const res = await fetch('https://api.openai.com/v1/moderations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: 'omni-moderation-latest', input: String(text || '').slice(0, 4000) }),
    });
    if (!res.ok) {
      console.error('moderation HTTP error:', res.status, (await res.text()).slice(0, 300));
      return null;
    }
    const data = await res.json();
    const result = data?.results?.[0];
    if (!result) return null;
    const scores = Object.values(result.category_scores || {}).map((v) => Number(v) || 0);
    return {
      flagged: !!result.flagged,
      maxScore: scores.length ? Math.max(...scores) : 0,
      categories: Object.entries(result.categories || {})
        .filter(([, on]) => on)
        .map(([k]) => k),
    };
  } catch (err) {
    console.error('moderation call failed:', err?.message);
    return null;
  }
}

// OpenAI category → our severity. Anything involving a minor's body is high.
const MODERATION_SEVERITY: Record<string, SafetySeverity> = {
  'sexual/minors': 'high',
  sexual: 'high',
  'harassment/threatening': 'high',
  harassment: 'medium',
  hate: 'medium',
  'hate/threatening': 'high',
  violence: 'medium',
  'violence/graphic': 'medium',
  illicit: 'medium',
  'self-harm': 'high',
  'self-harm/intent': 'high',
  'self-harm/instructions': 'high',
};

function moderationSeverity(categories: string[]): SafetySeverity {
  let worstSev: SafetySeverity = 'none';
  for (const c of categories) {
    const sev = MODERATION_SEVERITY[c];
    if (sev && SEVERITY_RANK[sev] > SEVERITY_RANK[worstSev]) worstSev = sev;
  }
  return worstSev;
}

// Pass 3 — one small LLM classification, only for the grey zone. Returns null
// when the call fails so screening still completes on rules + moderation.
export async function classifyWithLlm(base44, text: string): Promise<{
  category: string;
  severity: SafetySeverity;
  reason: string;
} | null> {
  try {
    const out = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt:
        'You are a child-safety reviewer for a marketplace where teenagers do outdoor jobs and online tutoring for neighbors.\n' +
        'Classify the single message below. Categories:\n' +
        '- grooming: building inappropriate trust or romantic/sexual interest in a minor\n' +
        '- off_platform_contact: trying to move the conversation or payment off the platform\n' +
        '- scam: fraud, bait, or a request for money/goods unrelated to the job\n' +
        '- harassment: insults, intimidation, or hostility\n' +
        '- sexual_content: sexual or sexualized language\n' +
        '- self_harm: the sender expresses intent to harm themselves\n' +
        '- fine: a normal, work-related message\n' +
        'severity is "none" for fine, "medium" for off_platform_contact, scam or harassment, and "high" for grooming, sexual_content or self_harm.\n' +
        'Judge only the message text. Be strict about adults showing personal or romantic interest in a minor.\n\n' +
        `Message: """${String(text || '').slice(0, 1500)}"""`,
      response_json_schema: {
        type: 'object',
        properties: {
          category: {
            type: 'string',
            enum: ['grooming', 'off_platform_contact', 'scam', 'harassment', 'sexual_content', 'self_harm', 'fine'],
          },
          severity: { type: 'string', enum: ['none', 'medium', 'high'] },
          reason: { type: 'string' },
        },
        required: ['category', 'severity', 'reason'],
      },
    });
    const parsed = typeof out === 'string' ? JSON.parse(out) : out;
    const severity = (['none', 'medium', 'high'].includes(parsed?.severity) ? parsed.severity : 'none') as SafetySeverity;
    return { category: parsed?.category || 'fine', severity, reason: String(parsed?.reason || '').slice(0, 300) };
  } catch (err) {
    console.error('safety LLM classify failed:', err?.message);
    return null;
  }
}

export interface ScreenOptions {
  base44: any;
  body: string;
  /** True when the sender is the minor on this thread — self-harm is support, not a violation. */
  senderIsMinor: boolean;
}

// The full layered verdict for one message.
export async function screenMessage({ base44, body, senderIsMinor }: ScreenOptions): Promise<SafetyVerdict> {
  const { hits, maskedText } = applyRules(body);
  const ruleSeverity = worst(hits);
  const categories = new Set<string>(hits.map((h) => h.key));
  const selfHarmByRule = hits.some((h) => h.key === 'self_harm');

  const moderation = await moderateText(body);
  let severity: SafetySeverity = ruleSeverity;
  if (moderation) {
    const modSeverity = moderationSeverity(moderation.categories);
    if (SEVERITY_RANK[modSeverity] > SEVERITY_RANK[severity]) severity = modSeverity;
    for (const c of moderation.categories) categories.add(`mod:${c}`);
  }

  // Borderline: nothing decisive from the rules, but moderation isn't clean —
  // or the rules found a low/medium signal that moderation thought was fine.
  // That's the only case that spends an LLM call.
  const borderline =
    moderation != null &&
    ((SEVERITY_RANK[ruleSeverity] === 0 && moderation.maxScore >= 0.15) ||
      (SEVERITY_RANK[ruleSeverity] === 1 && moderation.maxScore >= 0.35));
  let llmUsed = false;
  let llmReason = '';
  if (borderline) {
    const verdict = await classifyWithLlm(base44, body);
    llmUsed = true;
    if (verdict) {
      llmReason = verdict.reason;
      if (verdict.category !== 'fine') categories.add(`llm:${verdict.category}`);
      if (SEVERITY_RANK[verdict.severity] > SEVERITY_RANK[severity]) severity = verdict.severity;
      if (verdict.category === 'self_harm') severity = 'high';
    }
  }

  const selfHarm = selfHarmByRule || categories.has('mod:self-harm') || categories.has('llm:self_harm');

  // Self-harm from a teen is a cry for help, not misconduct: the message is
  // delivered, the teen sees the 988 lifeline, an admin is alerted, and the
  // parent is not told automatically.
  if (selfHarm && senderIsMinor) {
    return {
      action: 'delivered',
      severity: 'high',
      categories: [...categories],
      maskedText,
      reason: 'Teen self-harm disclosure — support shown, admin alerted, parent not notified automatically.',
      selfHarm: true,
      moderationUsed: !!moderation,
      llmUsed,
    };
  }

  let action: SafetyAction = 'delivered';
  if (severity === 'high') action = 'blocked';
  else if (severity === 'medium') action = 'held';
  else if (severity === 'low') action = 'masked';

  return {
    action,
    severity,
    categories: [...categories],
    maskedText: action === 'masked' ? maskedText : maskedText,
    reason: llmReason || (hits.length ? `Matched internal safety patterns (${hits.map((h) => h.key).join(', ')}).` : ''),
    selfHarm,
    moderationUsed: !!moderation,
    llmUsed,
  };
}

/** What the sender is told — deliberately never names the rule that matched. */
export function senderNotice(action: SafetyAction): string {
  if (action === 'masked') return 'For safety, contact info and payments stay in Blockwork.';
  if (action === 'held') return 'This message is being reviewed.';
  if (action === 'blocked') return 'This message was blocked by our safety monitor.';
  return '';
}