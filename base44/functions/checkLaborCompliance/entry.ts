import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Minor-labor-law compliance checker. Takes a described scenario and returns a
// structured compliance assessment via InvokeLLM. This is a screening tool, not
// legal advice — it surfaces judgment calls as [REVIEW] flags rather than
// resolving them.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const {
      state,
      minor_age,
      school_status,
      activity,
      relationship,
      hours_context,
      industry_flags,
    } = await req.json();

    if (!state || minor_age == null || !activity) {
      return Response.json({ error: 'state, minor_age, and activity are required' }, { status: 400 });
    }

    const prompt = `You are a minor-labor-law compliance checker for a marketplace platform. Given a described scenario, you determine what child-labor rules apply and output a structured compliance assessment. You are a screening tool, not legal advice; surface judgment calls rather than resolving them.

=== INPUTS ===
- state: ${state}
- minor_age: ${minor_age}
- school_status: ${school_status || '(not provided)'}
- activity: ${activity}
- relationship: ${relationship || '(not provided)'}
- hours_context: ${hours_context || '(not provided)'}
- industry_flags: ${industry_flags || 'none'}

=== STEP 1 — CLASSIFICATION GATE (do this FIRST; it controls everything after) ===
Determine which bucket the activity falls into:
  (A) Self-employed seller / own business — minor sells their own goods or services on their own account. Child-labor employment rules generally DO NOT apply. Shift focus to contract capacity, tax, and platform-consent issues. Note this and largely stop.
  (B) Independent contractor — minor performs work for buyers but is genuinely independent. FLSA child-labor provisions generally do not reach true contractors, BUT apply the economic-reality test (and California's ABC test under AB5) to check for MISCLASSIFICATION. If the facts look like employment, treat as (C).
  (C) Employee — employer-style control exists. Full child-labor analysis applies.
  (D) Entertainment / agriculture — separate regulatory tracks; flag distinct rules.
Explicitly state which bucket, the facts that drove it, and your confidence. If the relationship facts are thin, say the classification is uncertain and flag for review.

=== STEP 2 — JURISDICTION LAYERING (only if bucket C, or D, or B-reclassified) ===
Federal FLSA is the floor. Where state law is MORE protective, state law governs; where less protective, FLSA governs. Apply the stricter of the two rule by rule.

=== STEP 3 — RULE APPLICATION (per state) ===
For the applicable jurisdiction, evaluate and report:
  - Minimum age for this activity/industry
  - Work permit / employment certificate: required? which type? who issues it? tied to a specific employer/address? renewal conditions?
  - Maximum hours: school day, school week, non-school day, non-school week
  - Nightwork restrictions (earliest/latest permitted hours, and how they change in summer or before a non-school day)
  - Prohibited / hazardous occupations for this age
  - Minimum wage that applies (state rate; note if a locality is higher; note no subminimum where applicable)
  - Any recent statutory changes affecting compliance, with effective dates
  - Parental-consent and recordkeeping obligations

=== CALIFORNIA REFERENCE (seed data — verify before relying on it) ===
- Nearly all minors under 18 still subject to compulsory education need a Permit to Employ and Work; requirement is year-round including summer; permit is tied to a specific employer at a specific address; a new permit is needed for a new job. (CA Labor Code §1299; Education Code §49160)
- Permit usually issued by the minor's school (school district superintendent when school is out); entertainment permits issued by the Labor Commissioner/DLSE.
- EXEMPT: self-employment (own business, selling crafts online, freelance), and minors who have graduated or passed the CA High School Proficiency Exam. Emancipated minors are still covered but may apply without parental permission.
- Hours (enrolled minor): school day 3 hrs; school week limits apply; non-school day up to 8 hrs; non-school week up to 48 hrs. Nightwork limits vary by age and by whether the next day is a school day, with a summer extension.
- Wage: no subminimum for minors; state minimum wage $16.90/hr as of Jan 1 2026; some cities set higher rates.
- Recent changes: AB 800 (rights info sheet B1-1, Aug 1 2024); AB 3234 (social-compliance-audit disclosure, Jan 1 2025); SB 294 (annual "Know Your Rights" notice, Feb 1 2026).

For any state other than California, do not assume California's rules transfer. Populate that state's rule set from its own labor code and DOL, or return [REVIEW] flags.

Rules for citations: cite the specific statute or agency source (e.g. "CA Labor Code §1299", "CA Education Code §49160", FLSA section, state DOL page). Never invent a citation — if you don't have the specific rule for a state, set that field to "[REVIEW: rule not verified for <state>]" rather than guessing.

Return your assessment as JSON matching this exact shape:
{
  "classification": "A|B|C|D",
  "classification_reasoning": "...",
  "child_labor_law_applies": true|false,
  "jurisdiction_applied": "federal FLSA | <state> | stricter-of",
  "requirements": [ { "requirement": "...", "detail": "...", "citation": "..." } ],
  "compliance_status": "likely compliant | non-compliant | insufficient info",
  "blocking_issues": [ "..." ],
  "review_flags": [ "[REVIEW: ...]" ],
  "citations": [ "statute / agency source" ]
}`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          classification: { type: 'string', enum: ['A', 'B', 'C', 'D'] },
          classification_reasoning: { type: 'string' },
          child_labor_law_applies: { type: 'boolean' },
          jurisdiction_applied: { type: 'string' },
          requirements: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                requirement: { type: 'string' },
                detail: { type: 'string' },
                citation: { type: 'string' },
              },
              required: ['requirement', 'detail', 'citation'],
            },
          },
          compliance_status: { type: 'string', enum: ['likely compliant', 'non-compliant', 'insufficient info'] },
          blocking_issues: { type: 'array', items: { type: 'string' } },
          review_flags: { type: 'array', items: { type: 'string' } },
          citations: { type: 'array', items: { type: 'string' } },
        },
        required: [
          'classification',
          'classification_reasoning',
          'child_labor_law_applies',
          'jurisdiction_applied',
          'requirements',
          'compliance_status',
          'blocking_issues',
          'review_flags',
          'citations',
        ],
      },
    });

    return Response.json({ assessment: result });
  } catch (error) {
    console.error('checkLaborCompliance error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});