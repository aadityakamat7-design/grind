// Per-state work-hour rules for minors. Mirrors src/lib/stateWorkRules.js.
// The authoritative table lives in ./stateHourLimits.ts; this re-exports the
// lookup so existing callers (lookupTeenByCode) keep working. 18+ = no limits;
// unverified states (non-CA) return null — callers must fail closed (block).
import { getHourLimits } from './stateHourLimits.ts';

export { getHourLimits };

// Back-compat wrapper. Prefer getHourLimits(state, age) directly.
export function getWorkHourRules(stateCode: string | null, age: number | null) {
  return getHourLimits(stateCode, age);
}