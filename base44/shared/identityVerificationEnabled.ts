// Reads the admin-controlled identity-verification toggle from AppSetting.
// Defaults to ENABLED (true) when the setting is unset or on any read error,
// so the platform fails safe — identity verification is only skipped when an
// admin has explicitly turned it off for the pilot.
export async function isIdentityVerificationEnabled(base44): Promise<boolean> {
  try {
    const rows = await base44.asServiceRole.entities.AppSetting.filter({ key: 'identity_verification_enabled' });
    return rows[0]?.value !== 'false';
  } catch {
    return true;
  }
}