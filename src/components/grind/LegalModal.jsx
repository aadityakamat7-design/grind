import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// Renders the Terms of Service or Privacy Policy in a modal overlay so users
// can read them without leaving the current flow (e.g. signup).
export default function LegalModal({ type, open, onOpenChange }) {
  const isTerms = type === "terms";
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isTerms ? "Terms of Service" : "Privacy Policy"}</DialogTitle>
        </DialogHeader>
        <div className="text-sm text-muted-foreground space-y-4 leading-relaxed">
          {isTerms ? <TermsContent /> : <PrivacyContent />}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TermsContent() {
  return (
    <>
      <p className="text-foreground bg-muted rounded-xl p-3 border border-border">
        <strong>Plain-language summary:</strong> Blockwork is a marketplace where adult neighbors hire local California teens for everyday services. Every teen account (ages 13–17) is linked to a verified parent or guardian who approves jobs and receives payments. We hold your payment in escrow until the job is done, then pay the teen's parent. We are a venue — not a party to the work itself. Blockwork currently operates in California only.
      </p>
      <Section title="1. Eligibility and Age Requirements">
        <p><strong>Minimum age.</strong> You must be at least 13 years old to use Blockwork.</p>
        <p><strong>Teen users (13–17).</strong> Require a verified parent or guardian who links to the teen's account, verifies their identity, and attests the relationship before the teen can accept jobs.</p>
        <p><strong>Adult users (18+).</strong> May use the platform independently without a parent. Neighbors hiring teens and parents managing teen accounts must be at least 18.</p>
      </Section>
      <Section title="2. Accounts and Parental Consent">
        <p>You agree to provide accurate information when registering. You are responsible for keeping your password and account secure.</p>
        <p><strong>Teen accounts (13–17).</strong> Not active until a parent completes linking, identity verification, and relationship attestation. The parent controls payouts and can approve or deny any booking.</p>
      </Section>
      <Section title="3. Our Role — Marketplace Venue">
        <p>Blockwork is a venue that connects neighbors with teens and their parents. We are not a party to any agreement between a neighbor and a teen. We do not employ teens and are not responsible for the quality, safety, or legality of any service.</p>
      </Section>
      <Section title="4. Fees and Payments">
        <p><strong>Platform fee.</strong> A service fee is deducted from the teen's earnings before payout.</p>
        <p><strong>Escrow.</strong> Payment is charged through Stripe and held in escrow. Funds are released to the teen's parent only when both sides confirm the job is finished. If cancelled or denied, the neighbor is refunded.</p>
        <p><strong>Payouts.</strong> Earnings are paid to the parent's connected Stripe Connect account, not directly to the teen.</p>
      </Section>
      <Section title="5. Refunds and Disputes">
        <p>If a booking is denied by the parent or cancelled before the job starts, the neighbor is automatically refunded. Once a job is in progress, refunds are handled case by case.</p>
      </Section>
      <Section title="6. Acceptable Use">
        <p>You agree not to share contact information outside the platform before a booking is confirmed, request or perform illegal or dangerous services, post false or discriminatory content, harass others, or bypass payment or fees.</p>
      </Section>
      <Section title="7. Prohibited Services">
        <p>Heavy machinery, power tools restricted to adults, firearms, adult content, medical care requiring certification, transportation of people, and any service violating child labor laws.</p>
      </Section>
      <Section title="8. Termination">
        <p>You may close your account at any time. We may suspend or terminate any account that violates these terms or poses a safety risk.</p>
      </Section>
      <Section title="9. Disclaimers and Limitation of Liability">
        <p>Blockwork is provided "as is" without warranties. To the fullest extent permitted by law, we are not liable for indirect, incidental, or consequential damages arising from your use of the platform.</p>
      </Section>
      <Section title="10. Changes and Contact">
        <p>We may update these terms from time to time. Continued use after changes means you accept the updated terms. Questions? Contact us through in-app support.</p>
      </Section>
    </>
  );
}

function PrivacyContent() {
  return (
    <>
      <p className="text-foreground bg-muted rounded-xl p-3 border border-border">
        <strong>Plain-language summary:</strong> We collect the information needed to run a safe marketplace — names, dates of birth, emails, listings, messages, and limited location data during active jobs. We verify identities using government IDs (processed by Stripe; we never store raw images). We hold payments in escrow through Stripe. We do not sell your data.
      </p>
      <Section title="1. What Data We Collect">
        <p><strong>Account data:</strong> Name, email, date of birth, and role. Used to manage your account and verify age eligibility.</p>
        <p><strong>Profile data:</strong> Display name, bio, skills, and service area. Shown to other users.</p>
        <p><strong>Teen private data:</strong> Date of birth, age, ZIP, and approximate location. Exact coordinates are used only server-side and never shown to other users.</p>
        <p><strong>Identity verification:</strong> Government ID processed by Stripe Identity. We store only the verification result — never raw ID images or numbers.</p>
        <p><strong>Messages:</strong> Scanned to mask personal contact info before booking confirmation and to flag unsafe requests.</p>
        <p><strong>Location:</strong> During active jobs, the teen's live location is shared with their parent for safety. Stops when the job ends.</p>
        <p><strong>Payment data:</strong> Handled by Stripe. We store transaction records and masked bank references only.</p>
      </Section>
      <Section title="2. How Minors' Data Is Handled">
        <p>We do not knowingly collect data from children under 13. For teens 13–17, we require verifiable parental consent before the account is active. A linked parent can view the teen's profile, bookings, messages (read-only), earnings, and live location during jobs.</p>
      </Section>
      <Section title="3. Payment Data Handling">
        <p>All payment information is processed by Stripe, a PCI-compliant processor. We never see or store your full card or bank details.</p>
      </Section>
      <Section title="4. Third-Party Sharing">
        <p>We share data with Stripe (payments, identity verification, payouts), our hosting provider (Base44), and analytics providers (aggregate, de-identified). We do not sell your data.</p>
      </Section>
      <Section title="5. Data Retention and Security">
        <p>We keep your data while your account is active. After closure, we retain records as required by law, then delete or anonymize them. We use encryption in transit and at rest and never store raw ID images or payment credentials.</p>
      </Section>
      <Section title="6. Your Rights">
        <p>You have the right to access, correct, delete, and export your data, and to withdraw consent. Parents can exercise these rights on behalf of their linked teen.</p>
      </Section>
      <Section title="7. Changes and Contact">
        <p>We may update this policy from time to time. Questions? Contact us through in-app support.</p>
      </Section>
    </>
  );
}

function Section({ title, children }) {
  return (
    <div>
      <h3 className="font-semibold text-foreground mb-1.5">{title}</h3>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}