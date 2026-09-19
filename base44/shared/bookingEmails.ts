// Sends booking update emails to all parties (teen, parent, buyer) with a
// redirect link to the booking detail page. Called from every booking
// lifecycle function so users get email updates alongside in-app notifications.
//
// base44: the service-role client (from createClientFromRequest)
// opts: { booking, event, origin, excludeUserId? }
//   - booking: the Booking entity record (must include teen_user_id, buyer_user_id, parent_user_id, listing_title, etc.)
//   - event: one of the EVENT keys below
//   - origin: the app origin for building the booking link (e.g. https://app.base44.app)
//   - excludeUserId: optional — skip the user who triggered the action (they already know)

const EVENTS = {
  created: {
    teen: (b, link) => ({
      subject: `New booking request: "${b.listing_title}"`,
      body: `You have a new booking request from ${b.buyer_name} for "${b.listing_title}". We'll let you know once payment is confirmed.\n\nView the booking: ${link}`,
    }),
    buyer: (b, link) => ({
      subject: `Booking request sent: "${b.listing_title}"`,
      body: `Your booking request for "${b.listing_title}" with ${b.teen_display_name} has been sent. The teen's parent will review and approve it next.\n\nView the booking: ${link}`,
    }),
    parent: (b, link) => ({
      subject: `New booking for ${b.teen_display_name}: "${b.listing_title}"`,
      body: `${b.buyer_name} booked "${b.listing_title}" with ${b.teen_display_name}. You'll need to approve it once payment is confirmed.\n\nReview the booking: ${link}`,
    }),
  },
  payment_confirmed: {
    teen: (b, link) => ({
      subject: `Payment confirmed for "${b.listing_title}"`,
      body: `${b.buyer_name}'s payment for "${b.listing_title}" is now held in escrow. The job is waiting for parent approval.\n\nView the booking: ${link}`,
    }),
    buyer: (b, link) => ({
      subject: `Payment held in escrow for "${b.listing_title}"`,
      body: `Your payment for "${b.listing_title}" is safely held in escrow. The teen's parent will review and approve the booking next.\n\nView the booking: ${link}`,
    }),
    parent: (b, link) => ({
      subject: `Payment confirmed — please approve "${b.listing_title}"`,
      body: `${b.buyer_name}'s payment for "${b.listing_title}" is held in escrow. Please review and approve this booking so the job can proceed.\n\nReview and approve: ${link}`,
    }),
  },
  approved: {
    teen: (b, link) => ({
      subject: `Booking approved! "${b.listing_title}"`,
      body: `Your parent approved the booking for "${b.listing_title}" from ${b.buyer_name}. You can now start the job when you're ready.\n\nView the booking: ${link}`,
    }),
    buyer: (b, link) => ({
      subject: `Booking confirmed: "${b.listing_title}"`,
      body: `The parent approved your booking for "${b.listing_title}" with ${b.teen_display_name}. You can now start the job.\n\nView the booking: ${link}`,
    }),
    parent: (b, link) => ({
      subject: `You approved "${b.listing_title}"`,
      body: `You approved the booking for "${b.listing_title}". ${b.teen_display_name} and ${b.buyer_name} can now coordinate the job start.\n\nView the booking: ${link}`,
    }),
  },
  denied: {
    teen: (b, link) => ({
      subject: `Booking denied: "${b.listing_title}"`,
      body: `Your parent denied the booking for "${b.listing_title}" from ${b.buyer_name}. No action is needed from you.\n\nView the booking: ${link}`,
    }),
    buyer: (b, link) => ({
      subject: `Booking denied: "${b.listing_title}"`,
      body: `The parent denied your booking for "${b.listing_title}" with ${b.teen_display_name}. Your payment will be refunded.\n\nView the booking: ${link}`,
    }),
    parent: (b, link) => ({
      subject: `You denied "${b.listing_title}"`,
      body: `You denied the booking for "${b.listing_title}". The neighbor's payment has been refunded.\n\nView the booking: ${link}`,
    }),
  },
  started: {
    teen: (b, link) => ({
      subject: `Job started: "${b.listing_title}"`,
      body: `Both sides confirmed start — "${b.listing_title}" with ${b.buyer_name} is now in progress.\n\nView the booking: ${link}`,
    }),
    buyer: (b, link) => ({
      subject: `Job started: "${b.listing_title}"`,
      body: `Both sides confirmed start — "${b.listing_title}" with ${b.teen_display_name} is now in progress.\n\nView the booking: ${link}`,
    }),
    parent: (b, link) => ({
      subject: `Job started: "${b.listing_title}"`,
      body: `"${b.listing_title}" just started. ${b.teen_display_name} is on the job.\n\nView the booking: ${link}`,
    }),
  },
  teen_ready: {
    buyer: (b, link) => ({
      subject: `${b.teen_display_name} is ready to start`,
      body: `${b.teen_display_name} confirmed they're ready to start "${b.listing_title}". Press "Start job" to pay and hold the escrow.\n\nView the booking: ${link}`,
    }),
    parent: (b, link) => ({
      subject: `${b.teen_display_name} is ready to start`,
      body: `${b.teen_display_name} is ready to start "${b.listing_title}". Waiting for the neighbor to pay the escrow to begin.\n\nView the booking: ${link}`,
    }),
  },
  buyer_ready: {
    teen: (b, link) => ({
      subject: `${b.buyer_name} is ready to start`,
      body: `${b.buyer_name} paid the escrow for "${b.listing_title}". Press "Start job" to begin.\n\nView the booking: ${link}`,
    }),
  },
  finished: {
    buyer: (b, link) => ({
      subject: `${b.teen_display_name} finished the job`,
      body: `${b.teen_display_name} marked "${b.listing_title}" as done. Tap "Confirm done" to release payment, or "Report a problem" if the work isn't right.\n\nView the booking: ${link}`,
    }),
    parent: (b, link) => ({
      subject: `${b.teen_display_name} finished the job`,
      body: `"${b.listing_title}" — waiting for the neighbor to confirm the work is done before payment is released.\n\nView the booking: ${link}`,
    }),
    teen: (b, link) => ({
      subject: `You marked "${b.listing_title}" as done`,
      body: `You marked "${b.listing_title}" as finished. Waiting for ${b.buyer_name} to confirm before payment is released.\n\nView the booking: ${link}`,
    }),
  },
  completed: {
    teen: (b, link) => ({
      subject: `Job complete: "${b.listing_title}"`,
      body: `${b.buyer_name} confirmed the work on "${b.listing_title}" is done. Payment has been released to your parent's account.\n\nView the booking: ${link}`,
    }),
    buyer: (b, link) => ({
      subject: `Job complete: "${b.listing_title}"`,
      body: `You confirmed "${b.listing_title}" is done. Payment has been released to ${b.teen_display_name}'s parent.\n\nView the booking: ${link}`,
    }),
    parent: (b, link) => ({
      subject: `Job complete: "${b.listing_title}"`,
      body: `"${b.listing_title}" is complete. Payment has been released and will arrive in your bank account after the settlement period.\n\nView the booking: ${link}`,
    }),
  },
  disputed: {
    teen: (b, link) => ({
      subject: `Job flagged for review: "${b.listing_title}"`,
      body: `${b.buyer_name} reported an issue with "${b.listing_title}". Our team is reviewing it before any payment is released.\n\nView the booking: ${link}`,
    }),
    parent: (b, link) => ({
      subject: `Job flagged for review: "${b.listing_title}"`,
      body: `${b.buyer_name} reported an issue with "${b.listing_title}". Our team is reviewing it before any payment is released.\n\nView the booking: ${link}`,
    }),
    buyer: (b, link) => ({
      subject: `Your report is being reviewed: "${b.listing_title}"`,
      body: `Your report on "${b.listing_title}" has been submitted. Our team is reviewing it and will follow up.\n\nView the booking: ${link}`,
    }),
  },
  rescheduled: {
    teen: (b, link) => ({
      subject: `Booking rescheduled: "${b.listing_title}"`,
      body: `"${b.listing_title}" with ${b.buyer_name} has been rescheduled. Check the new time in the booking.\n\nView the booking: ${link}`,
    }),
    buyer: (b, link) => ({
      subject: `Booking rescheduled: "${b.listing_title}"`,
      body: `"${b.listing_title}" with ${b.teen_display_name} has been rescheduled. Check the new time in the booking.\n\nView the booking: ${link}`,
    }),
    parent: (b, link) => ({
      subject: `Booking rescheduled: "${b.listing_title}"`,
      body: `"${b.listing_title}" has been rescheduled. Check the new time in the booking.\n\nView the booking: ${link}`,
    }),
  },
  cancelled: {
    teen: (b, link) => ({
      subject: `Booking cancelled: "${b.listing_title}"`,
      body: `The booking for "${b.listing_title}" with ${b.buyer_name} has been cancelled.\n\nView the booking: ${link}`,
    }),
    buyer: (b, link) => ({
      subject: `Booking cancelled: "${b.listing_title}"`,
      body: `Your booking for "${b.listing_title}" with ${b.teen_display_name} has been cancelled.\n\nView the booking: ${link}`,
    }),
    parent: (b, link) => ({
      subject: `Booking cancelled: "${b.listing_title}"`,
      body: `The booking for "${b.listing_title}" has been cancelled.\n\nView the booking: ${link}`,
    }),
  },
};

export async function sendBookingEmail(base44, opts) {
  const { booking, event, origin, excludeUserId } = opts;
  const eventConfig = EVENTS[event];
  if (!eventConfig) {
    console.error(`sendBookingEmail: unknown event "${event}"`);
    return;
  }

  const link = `${origin || ''}/bookings/${booking.id}`;
  const parties = [
    { role: 'teen', userId: booking.teen_user_id },
    { role: 'buyer', userId: booking.buyer_user_id },
    { role: 'parent', userId: booking.parent_user_id },
  ];

  for (const { role, userId } of parties) {
    if (!userId || userId === excludeUserId) continue;
    const template = eventConfig[role];
    if (!template) continue;
    try {
      const users = await base44.asServiceRole.entities.User.filter({ id: userId });
      const user = users[0];
      if (!user?.email) continue;
      const { subject, body } = template(booking, link);
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: user.email,
        subject,
        body: `${body}\n\n— The Blockwork team`,
      });
    } catch (err) {
      console.error(`sendBookingEmail (${event} → ${role}) error:`, err.message);
    }
  }
}