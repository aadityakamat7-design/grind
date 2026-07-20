// AI compliance screening for neighbor-posted jobs.
// Every job is checked against federal FLSA rules and the specific
// child labor laws of the poster's state before it can be published.
import { base44 } from "@/api/base44Client";

export const US_STATES = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut",
  "Delaware", "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa",
  "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan",
  "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire",
  "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio",
  "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota",
  "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington", "West Virginia",
  "Wisconsin", "Wyoming", "District of Columbia",
];

export async function screenJob({ title, description, category, price, state }) {
  return base44.integrations.Core.InvokeLLM({
    prompt: `You are a strict child labor law compliance officer for "Grind", a marketplace where teenagers aged 13-17 perform casual local jobs for neighbors (federal FLSA "casual employment" context — yard work, babysitting, tutoring, etc.).

Evaluate whether the following job may legally and safely be performed by a teen worker in the U.S. state of ${state}. Apply BOTH:
1. Federal FLSA rules, including the Hazardous Occupations Orders — always block: roofing or any work at height (ladders, scaffolding, trees above shoulder height), power-driven machinery (saws, wood chippers, meat slicers), driving a motor vehicle as part of the job, excavation/demolition, electrical or plumbing work, handling chemicals/pesticides/herbicides, work involving alcohol, tobacco, cannabis, firearms, or adult content, and anything sexualized, exploitative, dangerous, or illegal.
2. ${state}-specific child labor law, including any stricter state rules on minimum ages for specific tasks (e.g., some states restrict power lawn mower use under 16), permitted hours, and supervision requirements.

Job to evaluate:
- Title: ${title}
- Description: ${description || "(none)"}
- Category: ${category}
- Pay: $${price}

Respond with:
- allowed: true only if a teen in some age range 13-17 may legally do this job in ${state}.
- minimum_age: the minimum teen age (13-17) that may perform it under ${state} law. Omit or use 13 if unrestricted.
- reason: if blocked, a clear, neighbor-friendly explanation citing the specific federal or ${state} rule that prohibits it. If allowed, a one-sentence confirmation.
- state_law_notes: brief ${state}-specific conditions the neighbor should know (age limits, hour limits, supervision). Keep under 40 words.`,
    add_context_from_internet: true,
    response_json_schema: {
      type: "object",
      properties: {
        allowed: { type: "boolean" },
        minimum_age: { type: "number" },
        reason: { type: "string" },
        state_law_notes: { type: "string" },
      },
      required: ["allowed", "reason"],
    },
  });
}