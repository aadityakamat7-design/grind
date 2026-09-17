// Single source of truth for pricing bounds on the server side.
// The client mirrors these in src/lib/grind.js — keep both in sync when
// a value changes.

// California minimum wage — the price floor for all listings and job posts.
// For HOURLY listings this is the minimum per-hour rate; for FIXED listings
// this is the minimum flat price for the job. Update this single value when
// the state minimum wage changes.
export const CA_MINIMUM_WAGE = 16.90;

// Derived minimum — kept for backward compatibility with code that reads
// MIN_UNIT_PRICE. Always equals CA_MINIMUM_WAGE.
export const MIN_UNIT_PRICE = CA_MINIMUM_WAGE;

// Maximum allowed price: per-hour rate, flat price, and total charge.
export const MAX_UNIT_PRICE = 500;

// Hours selector options for hourly listings and bookings.
export const HOURS_OPTIONS = [1, 1.5, 2, 2.5, 3, 3.5, 4, 5, 6, 7, 8];

// Cap on estimated hours per booking — also enforced in createBooking.
export const MAX_ESTIMATED_HOURS = 8;