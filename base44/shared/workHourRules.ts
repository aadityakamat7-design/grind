// Per-state work-hour rules for minors. Mirrors src/lib/stateWorkRules.js.
// The authoritative table lives in ./stateHourLimits.ts; this re-exports the
// lookup so existing callers (lookupTeenByCode) keep working. 18+ = no limits;
// unlisted states fall back to the conservative federal baseline (fails safe).
import { getHourLimits } from './stateHourLimits.ts';

export { getHourLimits };

// Back-compat wrapper. Prefer getHourLimits(state, age) directly.
export function getWorkHourRules(stateCode: string | null, age: number | null) {
  return getHourLimits(stateCode, age);
}