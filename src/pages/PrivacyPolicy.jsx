import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import SiteFooter from "@/components/SiteFooter";
import Seo from "@/components/Seo";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Seo title="Privacy Policy" description="What Blockwork collects, why, and your rights — including minors' data, parental consent, and payment data processed by Stripe." path="/privacy" />
      <div className="max-w-3xl mx-auto px-6 py-16">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="w-4 h-4" /> Back to home
        </Link>

        <h1 className="font-heading text-3xl font-bold text-foreground mb-2">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: September 8, 2026</p>

        <div className="prose prose-sm max-w-none text-muted-foreground [&_h2]:text-foreground [&_h2]:font-heading [&_h2]:font-semibold [&_h2]:mt-8 [&_h2]:mb-3 [&_p]:leading-relaxed [&_li]:leading-relaxed [&_strong]:text-foreground">
          <p className="text-base text-foreground bg-muted rounded-xl p-4 border border-border">
            <strong>Plain-language summary:</strong> We collect the information needed to run a safe marketplace for outdoor tasks and online tutoring — names, dates of birth, emails, listings, messages, and limited location data during active jobs. We verify parent and teen identities using government IDs (processed by Stripe; we never store the raw images). We hold payments in escrow through Stripe. We do not sell your data. This policy explains what we collect, why, and your rights.
          </p>

          <p className="text-base text-foreground bg-muted rounded-xl p-4 border border-border">
            <strong>California only.</strong> Blockwork currently operates only in California. This policy applies solely to California residents and users. We do not currently offer services in any other state.
          </p>

          <h2>1. What Data We Collect and Why</h2>
          <p><strong>Account data:</strong> Name, email, date of birth, and role (teen, parent, or neighbor). Used to create and manage your account and verify age eligibility.</p>
          <p><strong>Profile data:</strong> Display name (first name + last initial for teens), bio, photo, skills, and service area. Used to show your profile to other users.</p>
          <p><strong>Teen private data:</strong> Date of birth, age, ZIP code, and approximate location. Exact coordinates are used only server-side for distance matching and are never shown to other users.</p>
          <p><strong>Identity verification data:</strong> Government ID images and a liveness check for parents and teens. These are processed by Stripe Identity; we store only the verification result and a masked reference — never the raw ID images or ID numbers.</p>
          <p><strong>Listing and job data:</strong> Job titles, descriptions, categories, prices, and photos. Used to display and match jobs. For outdoor jobs, the address is revealed to the teen and parent only after a booking is confirmed.</p>
          <p><strong>Messages:</strong> The content of in-app messages between users. We scan messages to mask personal contact information before a booking is confirmed and to flag off-platform or unsafe requests.</p>
          <p><strong>Location data:</strong> When an outdoor job is in progress, the teen's live location is shared with their parent for safety. The neighbor does not see the teen's location. Location sharing stops when the job ends. Online jobs do not share location.</p>
          <p><strong>Online session data:</strong> When a booking is for online tutoring or tech help, the platform generates a video session link. We log session metadata (start time, duration, participant IDs, and the session link) for safety, dispute resolution, and record-keeping. We do not record, store, or transcribe the audio or video of any session.</p>
          <p><strong>Completion photos:</strong> When a teen marks an outdoor job as finished, they upload photos showing the completed work. These are shown to the neighbor for confirmation and to administrators during dispute review. They are stored for the life of the booking and any related dispute, then deleted per our retention policy.</p>
          <p><strong>Payment data:</strong> We do not store your card or bank details. Payment processing is handled by Stripe. We store transaction records, escrow status, and masked bank references (last 4 digits) returned by Stripe.</p>
          <p><strong>Consent records:</strong> When a parent links to a teen, we record each itemized consent acknowledgment with a timestamp, the terms version, the parent's IP address, and user agent. This creates an auditable consent trail.</p>
          <p><strong>Device and usage data:</strong> IP address, browser type, and basic analytics. Used for security, fraud prevention, and improving the platform.</p>

          <h2>2. Legal Bases for Processing</h2>
          <p>
            We process your data to: provide the service you requested (contract), comply with legal obligations including child safety and tax laws (legal obligation), protect the safety of minors and prevent fraud (legitimate interest), and with your consent where required (consent).
          </p>

          <h2>3. How Minors' Data Is Handled</h2>
          <p>
            <strong>Parental consent.</strong> We do not knowingly collect personal information from children under 13. For teens aged 13–17, we require verifiable parental consent before the account becomes active. A parent or guardian must link to the teen's account, pass identity verification, and individually acknowledge each itemized consent described in the Terms of Service.
          </p>
          <p>
            <strong>What parents can see.</strong> A linked parent can view the teen's profile, bookings, messages (read-only), earnings, online session links, and live location during active outdoor jobs. Parents can request deletion of a teen's data at any time.
          </p>
          <p>
            <strong>Minimization.</strong> We expose only the minimum information needed to operate safely. Teens are shown to neighbors by first name and last initial, approximate city, and service area — never exact address. Exact addresses are revealed to the teen and parent only after a booking is confirmed. Online session links are visible only to the teen, the neighbor, and the teen's parent.
          </p>

          <h2>4. Payment Data Handling</h2>
          <p>
            All payment information is processed by Stripe, a PCI-compliant payment processor. We never see or store your full card number or bank account details. We receive only transaction results, masked references, and payout status from Stripe. See Stripe's privacy policy for how they handle payment data.
          </p>

          <h2>5. Online Session Data</h2>
          <p>
            For online tutoring and tech-help bookings, we generate a video session link and make it visible to the teen, the neighbor, and the teen's parent. We log session metadata (start time, duration, and participant IDs) but do not record, store, or transcribe the audio or video. Parents can see scheduled session times and the session link so they can monitor their teen's online activity. If a participant reports inappropriate conduct during a session, we may use the session metadata in our investigation.
          </p>

          <h2>6. Third-Party Sharing</h2>
          <p>We share data with:</p>
          <ul>
            <li><strong>Stripe</strong> — for payments, identity verification, and payouts to parents.</li>
            <li><strong>Our hosting provider (Base44)</strong> — for app hosting, data storage, and infrastructure.</li>
            <li><strong>Analytics providers</strong> — for aggregate, de-identified usage statistics.</li>
          </ul>
          <p>
            We do not sell your personal data. We share data with authorities only when required by law or to protect the safety of a minor.
          </p>

          <h2>7. Cookies and Tracking</h2>
          <p>
            We use essential cookies to keep you logged in and remember your preferences. We may use analytics cookies to understand how the platform is used. We do not use cookies for targeted advertising.
          </p>

          <h2>8. Data Retention</h2>
          <p>
            We keep your data for as long as your account is active. After account closure, we retain transaction, identity-verification, and consent records for as long as required by law (typically 3–7 years for tax and safety purposes), then delete or anonymize them. Messages are deleted when the account is closed. Completion photos are retained for the life of the booking and any related dispute, then deleted.
          </p>

          <h2>9. Security</h2>
          <p>
            We take reasonable, industry-standard measures to protect your data — especially data belonging to minors. No system is perfectly secure, and we cannot guarantee absolute security, but the measures below are genuinely implemented and actively maintained.
          </p>

          <h3>9.1 Encryption</h3>
          <p>
            <strong>In transit.</strong> All data sent between your device and Blockwork is encrypted using HTTPS/TLS. The platform enforces TLS on every request; there is no unencrypted (HTTP) path to application data. Our Content-Security-Policy blocks mixed-content loading so page resources are never fetched over an insecure connection.
          </p>
          <p>
            <strong>At rest.</strong> The database that stores your account, profile, booking, and message data is encrypted at rest by our hosting provider (Base44, backed by MongoDB Atlas), which manages transparent encryption of all stored data.
          </p>
          <p>
            <strong>Application-level field encryption.</strong> A field-encryption module (AES-GCM, key stored in a server-side environment variable, never in code) is available to encrypt the most sensitive fields — verified dates of birth, addresses, and identity-verification references — so they remain unreadable even with raw database access. Numeric location coordinates cannot be encrypted at the application level without breaking the distance-matching math that depends on them; those fields rely on the database's at-rest encryption plus row-level access controls. Full field-level encryption rollout to existing data is in progress and requires a coordinated migration of every read path.
          </p>

          <h3>9.2 Payment and Identity Data</h3>
          <p>
            <strong>Card and bank details are never seen or stored by Blockwork.</strong> All card data flows through Stripe's PCI-DSS Level 1 certified infrastructure. Our servers receive only a Stripe token or PaymentIntent ID — never raw card numbers, CVCs, or bank routing numbers. Bank details entered during Connect onboarding go directly to Stripe's hosted form, never through our backend. We store only masked references returned by Stripe (e.g., last four digits of a bank account).
          </p>
          <p>
            <strong>Raw government ID images and selfies are never stored.</strong> Identity verification is handled by Stripe Identity. We store only the verification result (verified / failed) and a masked session reference — never the ID images, ID numbers, or selfie photos. Stripe retains the full verification record on its side; we do not.
          </p>

          <h3>9.3 Access Controls</h3>
          <p>
            Data access is restricted per user by role, enforced on the server — not just in the UI. Every backend function verifies your identity and ownership before returning or modifying data. You can only ever see your own data and what your role permits:
          </p>
          <ul>
            <li>A parent sees their linked teen's profile, bookings, messages (read-only), earnings, and live location during active outdoor jobs.</li>
            <li>A teen sees their own profile, bookings, and earnings. Their parent sees the same.</li>
            <li>A neighbor sees their own bookings and the teen's public profile (first name + last initial, approximate city, service area) — never the teen's exact address or contact details until a booking is confirmed.</li>
            <li>Admins can review all data for safety, dispute resolution, and compliance.</li>
          </ul>
          <p>
            No endpoint returns another user's data by changing an ID in a request — ownership is validated server-side on every call. Role checks (e.g., "admin only") are enforced in the backend, not just hidden in the interface. All money operations — prices, fees, payouts, refunds — are computed server-side; the client never sends an amount that is trusted.
          </p>

          <h3>9.4 Minors' Data Protections</h3>
          <p>
            We minimize public exposure of teen data. Teens are shown to neighbors by first name and last initial only — never full name, exact address, or contact details. Exact job-site addresses are hidden until a booking is confirmed, then revealed only to the teen and their parent. Contact information in pre-booking messages is automatically masked (phone numbers, emails, and addresses are redacted server-side). Parents have visibility into their teen's bookings, earnings, online session links, and live location during active outdoor jobs.
          </p>

          <h3>9.5 Rate Limiting and Brute-Force Protection</h3>
          <p>
            Sensitive endpoints are rate-limited per IP address and per user account, with exponential backoff between attempts. The invite-code lookup (used to link a parent to a teen) is the most aggressively protected: after repeated failed attempts, the code is locked and the teen, their parent, and admins are alerted. Payment initiation, payout requests, and wallet cash-outs are also rate-limited to prevent rapid-fire probing. Login, registration, password reset, and OTP verification are rate-limited by our hosting platform's authentication infrastructure.
          </p>

          <h3>9.6 Monitoring, Logging, and Alerts</h3>
          <p>
            Security events are logged and monitored, including: failed invite-code attempts, locked invite codes, Stripe webhook signature verification failures, permission-denied errors, and critical payout blocks. Repeated failures from a single IP or account trigger automatic admin alerts. An immutable audit log records sensitive actions — payouts, booking approvals and denials, cash-out requests, and critical security events — with the actor, action, target, and timestamp. Audit log entries are admin-readable and are not modified after creation.
          </p>

          <h3>9.7 Data Retention</h3>
          <p>
            We keep your data only as long as needed. Account data is retained while your account is active. After account closure, transaction, identity-verification, and consent records are retained for as long as required by law (typically 3–7 years for tax and safety purposes), then deleted or anonymized. Messages are deleted when the account is closed. Completion photos are retained for the life of the booking and any related dispute, then deleted. Audit log entries are retained for the legally required period for financial and safety records.
          </p>

          <h3>9.8 Honest Limitations</h3>
          <p>
            No system is perfectly secure. Blockwork takes reasonable and industry-standard measures to protect your data, but we cannot guarantee absolute security or that our measures will never be circumvented. Security headers such as HSTS, X-Frame-Options, and X-Content-Type-Options are set at the hosting-platform level and may vary depending on platform configuration. If you believe you have found a security vulnerability, please report it responsibly to <a href="mailto:support@blockwork.online" className="text-foreground font-medium hover:underline">support@blockwork.online</a> and we will investigate promptly.
          </p>

          <h2>10. Your Rights and Parental Rights</h2>
          <p>
            You (and, for teen accounts, your parent or guardian) have the right to:
          </p>
          <ul>
            <li><strong>Access</strong> the personal data we hold about you.</li>
            <li><strong>Correct</strong> inaccurate data.</li>
            <li><strong>Delete</strong> your account and associated data (subject to legal retention requirements).</li>
            <li><strong>Withdraw consent</strong> for processing that relies on consent. Withdrawing parental consent suspends the teen's account.</li>
            <li><strong>Export</strong> your data in a portable format.</li>
          </ul>
          <p>
            Parents can exercise these rights on behalf of their linked teen. To make a request, use the in-app account deletion option or contact us at <a href="mailto:support@blockwork.online" className="text-foreground font-medium hover:underline">support@blockwork.online</a>.
          </p>

          <h2>11. Children's Privacy (COPPA)</h2>
          <p>
            We do not knowingly collect personal information from children under 13. If you believe a child under 13 has registered, contact us and we will promptly delete the account and associated data. For teens 13–17, we obtain verifiable parental consent through identity verification and itemized acknowledgment before activating the account, as described above and in the Terms of Service.
          </p>

          <h2>12. California Privacy Rights</h2>
          <p>
            <strong>California (CCPA/CPRA).</strong> California residents have the right to know what personal data is collected, request deletion, correct inaccurate data, opt out of the sale or sharing of personal data, and not be discriminated against for exercising these rights. We do not sell or share personal data as defined by California law. To exercise your rights, contact us at the email below.
          </p>
          <p>
            These rights are consistent with the rights described in Section 10 and do not limit any other rights you may have under applicable law.
          </p>

          <h2>13. Changes to This Policy</h2>
          <p>
            We may update this policy from time to time. We will notify users of material changes through the app or by email. Continued use after changes take effect means you accept the updated policy.
          </p>

          <h2>14. Contact</h2>
          <p>
            Questions or privacy requests? Contact us at <a href="mailto:support@blockwork.online" className="text-foreground font-medium hover:underline">support@blockwork.online</a>.
          </p>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}