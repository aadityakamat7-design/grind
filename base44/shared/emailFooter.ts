// CAN-SPAM compliant email footer — appended to every notification email sent
// through the platform. Required by 16 CFR Part 316 (CAN-SPAM Act):
//   - A clear and conspicuous unsubscribe mechanism for marketing emails
//   - The sender's valid contact information
//
// No physical mailing address is published. Contact is via email only.
// Marketing emails include a one-click unsubscribe link; transactional emails
// include a "manage notifications" link instead.

export function emailFooter(origin?: string, opts?: { isMarketing?: boolean; email?: string }): string {
  const base = origin || '';
  const lines = [
    '',
    '— The Blockwork team',
    '',
    '—————————————————',
    'Blockwork · support@blockwork.online',
  ];
  if (opts?.isMarketing && opts?.email) {
    lines.push(`Unsubscribe: ${base}/unsubscribe?email=${encodeURIComponent(opts.email)}`);
    lines.push('You received this email because you have a Blockwork account.');
  } else {
    lines.push(`Manage your notifications: ${base}/account`);
    lines.push(`You received this email because you have a Blockwork account. Reply to this email or visit ${base}/support if you have questions.`);
  }
  return lines.join('\n');
}