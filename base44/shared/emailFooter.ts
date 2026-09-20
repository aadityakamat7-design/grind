// CAN-SPAM compliant email footer — appended to every notification email sent
// through the platform. Required by 16 CFR Part 316 (CAN-SPAM Act):
//   - A clear and conspicuous unsubscribe mechanism
//   - The sender's valid physical postal address
//
// The unsubscribe link points to the account settings page where users can
// manage their notification preferences. The physical mailing address below
// MUST be the actual business postal address — update it when the business
// moves. Using a placeholder address violates CAN-SPAM.

// TODO: Replace with the actual Blockwork business mailing address.
export const BUSINESS_MAILING_ADDRESS = 'Blockwork, Inc., 123 Main Street, Fremont, CA 94536';

export function emailFooter(origin?: string): string {
  const base = origin || '';
  return [
    '',
    '— The Blockwork team',
    '',
    '—————————————————',
    BUSINESS_MAILING_ADDRESS,
    `Manage your notifications: ${base}/account`,
    `You received this email because you have a Blockwork account. Reply to this email or visit ${base}/support if you have questions.`,
  ].join('\n');
}