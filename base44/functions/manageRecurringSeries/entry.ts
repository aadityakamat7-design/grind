import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import { nextOccurrenceDate } from '../../shared/recurringDates.ts';

// Pause, resume, skip, or cancel a recurring series.
// Either party (buyer, teen, or parent) can pause or skip.
// Only the buyer or parent can cancel.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { seriesId, action } = await req.json();
    if (!seriesId || !action) {
      return Response.json({ error: 'seriesId and action are required' }, { status: 400 });
    }

    const series = await base44.asServiceRole.entities.RecurringSeries.get(seriesId);
    if (!series) return Response.json({ error: 'Series not found' }, { status: 404 });

    // Authorization — only the buyer, teen, or parent of the series can manage it
    const isBuyer = series.buyer_user_id === user.id;
    const isTeen = series.teen_user_id === user.id;
    const isParent = series.parent_user_id === user.id;
    if (!isBuyer && !isTeen && !isParent) {
      return Response.json({ error: 'Not authorized' }, { status: 403 });
    }

    const now = new Date().toISOString();

    if (action === 'pause') {
      if (series.status !== 'active') {
        return Response.json({ error: 'Series is not active' }, { status: 400 });
      }
      await base44.asServiceRole.entities.RecurringSeries.update(seriesId, {
        status: 'paused', paused_at: now,
      });
      return Response.json({ success: true, status: 'paused' });
    }

    if (action === 'resume') {
      if (series.status !== 'paused') {
        return Response.json({ error: 'Series is not paused' }, { status: 400 });
      }
      // If next_occurrence_at is in the past, advance it
      let nextAt = series.next_occurrence_at ? new Date(series.next_occurrence_at) : new Date();
      if (nextAt < new Date()) {
        nextAt = nextOccurrenceDate(
          series.recurrence, new Date(),
          series.day_of_week, series.day_of_month, series.start_time,
        );
      }
      await base44.asServiceRole.entities.RecurringSeries.update(seriesId, {
        status: 'active', next_occurrence_at: nextAt.toISOString(), paused_at: null,
      });
      return Response.json({ success: true, status: 'active' });
    }

    if (action === 'skip') {
      if (series.status !== 'active') {
        return Response.json({ error: 'Series is not active' }, { status: 400 });
      }
      // Advance next_occurrence_at by one interval
      const currentNext = series.next_occurrence_at ? new Date(series.next_occurrence_at) : new Date();
      const after = nextOccurrenceDate(
        series.recurrence, currentNext,
        series.day_of_week, series.day_of_month, series.start_time,
      );
      await base44.asServiceRole.entities.RecurringSeries.update(seriesId, {
        next_occurrence_at: after.toISOString(),
      });
      return Response.json({ success: true, skipped: true });
    }

    if (action === 'cancel') {
      // Only the buyer or parent can cancel permanently
      if (!isBuyer && !isParent) {
        return Response.json({ error: 'Only the neighbor or parent can cancel the series' }, { status: 403 });
      }
      await base44.asServiceRole.entities.RecurringSeries.update(seriesId, {
        status: 'cancelled', cancelled_at: now,
      });
      return Response.json({ success: true, status: 'cancelled' });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('manageRecurringSeries error:', error.message);
    return Response.json({ error: 'Something went wrong' }, { status: 500 });
  }
});