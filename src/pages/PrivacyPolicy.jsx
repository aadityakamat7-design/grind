import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="w-4 h-4" /> Back to home
        </Link>

        <h1 className="font-heading text-3xl font-bold text-foreground mb-2">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: July 29, 2026</p>

        <div className="prose prose-sm max-w-none text-muted-foreground [&_h2]:text-foreground [&_h2]:font-heading [&_h2]:font-semibold [&_h2]:mt-8 [&_h2]:mb-3 [&_p]:leading-relaxed [&_li]:leading-relaxed [&_strong]:text-foreground">
          <p className="text-base text-foreground bg-muted rounded-xl p-4 border border-border">
            <strong>Plain-language summary:</strong> We collect the information needed to run a safe marketplace for teens and their neighbors — names, dates of birth, emails, listings, messages, and limited location data during active jobs. We verify parent and teen identities using government IDs (processed by Stripe; we never store the raw images). We hold payments in escrow through Stripe. We do not sell your data. This policy explains what we collect, why, and your rights.
          </p>

          <h2>1. What Data We Collect and Why</h2>
          <p><strong>Account data:</strong> Name, email, date of birth, and role (teen, parent, or neighbor). Used to create and manage your account and verify age eligibility.</p>
          <p><strong>Profile data:</strong> Display name (first name + last initial for teens), bio, photo, skills, and service area. Used to show your profile to other users.</p>
          <p><strong>Teen private data:</strong> Date of birth, age, ZIP code, and approximate location. Exact coordinates are used only server-side for distance matching and are never shown to other users.</p>
          <p><strong>Identity verification data:</strong> Government ID images and a liveness check for parents and teens. These are processed by Stripe Identity; we store only the verification result and a masked reference — never the raw ID images or ID numbers.</p>
          <p><strong>Listing and job data:</strong> Job titles, descriptions, categories, prices, and photos. Used to display and match jobs.</p>
          <p><strong>Messages:</strong> The content of in-app messages between users. We scan messages to mask personal contact information before a booking is confirmed and to flag off-platform or unsafe requests.</p>
          <p><strong>Location data:</strong> When a job is in progress, the teen's live location is shared with their parent for safety. The neighbor does not see the teen's location. Location sharing stops when the job ends.</p>
          <p><strong>Payment data:</strong> We do not store your card or bank details. Payment processing is handled by Stripe. We store transaction records, escrow status, and masked bank references (last 4 digits) returned by Stripe.</p>
          <p><strong>Device and usage data:</strong> IP address, browser type, and basic analytics. Used for security, fraud prevention, and improving the platform.</p>

          <h2>2. Legal Bases for Processing</h2>
          <p>
            We process your data to: provide the service you requested (contract), comply with legal obligations including child safety and tax laws (legal obligation), protect the safety of minors and prevent fraud (legitimate interest), and with your consent where required (consent).
          </p>

          <h2>3. How Minors' Data Is Handled</h2>
          <p>
            <strong>Parental consent.</strong> We do not knowingly collect personal information from children under 13. For teens aged 13–17, we require verifiable parental consent before the account becomes active. A parent or guardian must link to the teen's account, pass identity verification, and attest the relationship.
          </p>
          <p>
            <strong>What parents can see.</strong> A linked parent can view the teen's profile, bookings, messages (read-only), earnings, and live location during active jobs. Parents can request deletion of a teen's data at any time.
          </p>
          <p>
            <strong>Minimization.</strong> We expose only the minimum information needed to operate safely. Teens are shown to neighbors by first name and last initial, approximate city, and service area — never exact address. Exact addresses are revealed to the teen and parent only after a booking is confirmed.
          </p>

          <h2>4. Payment Data Handling</h2>
          <p>
            All payment information is processed by Stripe, a PCI-compliant payment processor. We never see or store your full card number or bank account details. We receive only transaction results, masked references, and payout status from Stripe. See Stripe's privacy policy for how they handle payment data.
          </p>

          <h2>5. Third-Party Sharing</h2>
          <p>We share data with:</p>
          <ul>
            <li><strong>Stripe</strong> — for payments, identity verification, and payouts to parents.</li>
            <li><strong>Our hosting provider (Base44)</strong> — for app hosting, data storage, and infrastructure.</li>
            <li><strong>Analytics providers</strong> — for aggregate, de-identified usage statistics.</li>
          </ul>
          <p>
            We do not sell your personal data. We share data with authorities only when required by law or to protect the safety of a minor.
          </p>

          <h2>6. Cookies and Tracking</h2>
          <p>
            We use essential cookies to keep you logged in and remember your preferences. We may use analytics cookies to understand how the platform is used. We do not use cookies for targeted advertising.
          </p>

          <h2>7. Data Retention</h2>
          <p>
            We keep your data for as long as your account is active. After account closure, we retain transaction and identity-verification records for as long as required by law (typically 3–7 years for tax and safety purposes), then delete or anonymize them. Messages are deleted when the account is closed.
          </p>

          <h2>8. Security</h2>
          <p>
            We use encryption in transit and at rest, restrict access to authorized personnel only, and never store raw government ID images or payment credentials. Identity verification is delegated to Stripe Identity. No system is perfectly secure, but we take reasonable measures to protect your data — especially data belonging to minors.
          </p>

          <h2>9. Your Rights and Parental Rights</h2>
          <p>
            You (and, for teen accounts, your parent or guardian) have the right to:
          </p>
          <ul>
            <li><strong>Access</strong> the personal data we hold about you.</li>
            <li><strong>Correct</strong> inaccurate data.</li>
            <li><strong>Delete</strong> your account and associated data (subject to legal retention requirements).</li>
            <li><strong>Withdraw consent</strong> for processing that relies on consent.</li>
            <li><strong>Export</strong> your data in a portable format.</li>
          </ul>
          <p>
            Parents can exercise these rights on behalf of their linked teen. To make a request, use the in-app account deletion option or contact us at <a href="mailto:aaditya.kamat10@gmail.com" className="text-foreground font-medium hover:underline">aaditya.kamat10@gmail.com</a>.
          </p>

          <h2>10. Children's Privacy (COPPA)</h2>
          <p>
            We do not knowingly collect personal information from children under 13. If you believe a child under 13 has registered, contact us and we will promptly delete the account and associated data. For teens 13–17, we obtain verifiable parental consent through identity verification before activating the account, as described above.
          </p>

          <h2>11. Changes to This Policy</h2>
          <p>
            We may update this policy from time to time. We will notify users of material changes through the app or by email. Continued use after changes take effect means you accept the updated policy.
          </p>

          <h2>12. Contact</h2>
          <p>
            Questions or privacy requests? Contact us at <a href="mailto:aaditya.kamat10@gmail.com" className="text-foreground font-medium hover:underline">aaditya.kamat10@gmail.com</a>.
          </p>
        </div>
      </div>
    </div>
  );
}