// Builds a teen's Verified Work Record from real, paid-out work only — never
// anything typed in by hand. Shared by the workRecord function (PDF + public
// verification page) and the weekly parent summary.
//
// Neighbors are anonymized as "Neighbor in <city>, <state>": no names, no
// addresses, ever.

const PAID_STATUS = 'completed';

function hoursOf(booking: any): number {
  const explicit = Number(booking.estimated_hours);
  if (Number.isFinite(explicit) && explicit > 0) return explicit;
  const minutes = Number(booking.session_duration_minutes);
  if (Number.isFinite(minutes) && minutes > 0) return Math.round((minutes / 60) * 10) / 10;
  return 2;
}

function newRecordId(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 8; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return `BW-${out}`;
}

export async function buildWorkRecord(svc, teenUserId: string, existing?: any) {
  const [bookings, profiles, listings] = await Promise.all([
    svc.Booking.filter(
      { teen_user_id: teenUserId, status: PAID_STATUS, payment_status: 'released' },
      '-scheduled_start',
      200,
    ),
    svc.TeenProfile.filter({ user_id: teenUserId }),
    svc.Listing.filter({ teen_user_id: teenUserId }),
  ]);

  const profile = profiles[0] || null;
  const categoryByListing = new Map<string, string>();
  for (const l of listings) categoryByListing.set(l.id, l.category);

  // Anonymized neighbor labels — city and state only.
  const buyerIds = [...new Set(bookings.map((b: any) => b.buyer_user_id).filter(Boolean))];
  const cities = new Map<string, string>();
  if (buyerIds.length) {
    try {
      const buyers = await svc.BuyerProfile.filter({ user_id: { $in: buyerIds } });
      for (const bp of buyers) {
        const city = bp.resolved_city || bp.zip || '';
        const state = (bp.state || 'CA').toUpperCase();
        cities.set(bp.user_id, city ? `Neighbor in ${city}, ${state}` : `Neighbor in ${state}`);
      }
    } catch (err) {
      console.error('workRecord buyer lookup failed:', err?.message);
    }
  }

  const jobs = bookings.map((b: any) => ({
    date: String(b.scheduled_start || b.created_date || '').slice(0, 10),
    title: b.listing_title || 'Job',
    category: categoryByListing.get(b.listing_id) || '',
    hours: hoursOf(b),
    neighbor_label: cities.get(b.buyer_user_id) || 'Neighbor',
  }));

  const categories = [...new Set(jobs.map((j) => j.category).filter(Boolean))];
  const hours_total = Math.round(jobs.reduce((s, j) => s + j.hours, 0) * 10) / 10;

  let reviews: any[] = [];
  try {
    const rows = await svc.Review.filter(
      { subject_id: teenUserId, direction: 'buyer_to_teen' },
      '-created_date',
      20,
    );
    reviews = rows
      .filter((r: any) => !r.hidden && r.text && String(r.text).trim().length > 0)
      .slice(0, 5)
      .map((r: any) => ({
        rating: r.rating,
        quote: String(r.text).trim().slice(0, 300),
        category: r.category || '',
        date: String(r.created_date || '').slice(0, 10),
      }));
  } catch (err) {
    console.error('workRecord review lookup failed:', err?.message);
  }

  const dates = jobs.map((j) => j.date).filter(Boolean).sort();

  return {
    record_id: existing?.record_id || newRecordId(),
    teen_user_id: teenUserId,
    teen_display_name: profile?.display_name || 'Blockwork teen',
    city: profile?.resolved_city || '',
    state: (profile?.state || 'CA').toUpperCase(),
    enabled: existing?.enabled !== false,
    jobs_completed: jobs.length,
    hours_total,
    categories,
    avg_rating: Number(profile?.avg_rating) || 0,
    review_count: Number(profile?.review_count) || 0,
    jobs,
    reviews,
    first_job_at: dates[0] || null,
    last_job_at: dates[dates.length - 1] || null,
    generated_at: new Date().toISOString(),
  };
}

export async function getOrBuildWorkRecord(svc, teenUserId: string) {
  const existing = (await svc.WorkRecord.filter({ teen_user_id: teenUserId }))[0] || null;
  const record = await buildWorkRecord(svc, teenUserId, existing);
  if (existing) {
    await svc.WorkRecord.update(existing.id, record);
    return { ...existing, ...record };
  }
  return await svc.WorkRecord.create(record);
}