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
        <p className="text-sm text-muted-foreground mb-8">Last updated: August 27, 2026</p>

        <div className="prose prose-sm max-w-none text-muted-foreground [&_h2]:text-foreground [&_h2]:font-heading [&_h2]:font-semibold [&_h2]:mt-8 [&_h2]:mb-3 [&_p]:leading-relaxed [&_li]:leading-relaxed [&_strong]:text-foreground">
          <p className="text-base text-foreground bg-muted rounded-xl p-4 border border-border">
            <strong>Plain-language summary:</strong> We collect the information needed to run a safe marketplace for outdoor tasks and online tutoring — names, dates of birth, emails, listings, messages, and limited location data during active jobs. We verify parent and teen identities using government IDs (processed by Stripe; we never store the raw images). We hold payments in escrow through Stripe. We do not sell your data. This policy explains what we collect, why, and your rights.
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
            We use encryption in transit and at rest, restrict access to authorized personnel only, and never store raw government ID images or payment credentials. Identity verification is delegated to Stripe Identity. No system is perfectly secure, but we take reasonable measures to protect your data — especially data belonging to minors.
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
            Parents can exercise these rights on behalf of their linked teen. To make a request, use the in-app account deletion option or contact us at <a href="mailto:blockwork@teenskickstart.base44.app" className="text-foreground font-medium hover:underline">blockwork@teenskickstart.base44.app</a>.
          </p>

          <h2>11. Children's Privacy (COPPA)</h2>
          <p>
            We do not knowingly collect personal information from children under 13. If you believe a child under 13 has registered, contact us and we will promptly delete the account and associated data. For teens 13–17, we obtain verifiable parental consent through identity verification and itemized acknowledgment before activating the account, as described above and in the Terms of Service.
          </p>

          <h2>12. California and New York Privacy Rights</h2>
          <p>
            <strong>California (CCPA/CPRA).</strong> California residents have the right to know what personal data is collected, request deletion, correct inaccurate data, opt out of the sale or sharing of personal data, and not be discriminated against for exercising these rights. We do not sell or share personal data as defined by California law. To exercise your rights, contact us at the email below.
          </p>
          <p>
            <strong>New York.</strong> New York residents have similar rights to access, correct, and delete their personal data. For teen accounts, these rights are exercised by the parent or guardian on the teen's behalf.
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
            Questions or privacy requests? Contact us at <a href="mailto:blockwork@teenskickstart.base44.app" className="text-foreground font-medium hover:underline">blockwork@teenskickstart.base44.app</a>.
          </p>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}