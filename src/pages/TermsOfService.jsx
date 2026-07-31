import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="w-4 h-4" /> Back to home
        </Link>

        <h1 className="font-heading text-3xl font-bold text-foreground mb-2">Terms of Service</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: July 29, 2026</p>

        <div className="prose prose-sm max-w-none text-muted-foreground [&_h2]:text-foreground [&_h2]:font-heading [&_h2]:font-semibold [&_h2]:mt-8 [&_h2]:mb-3 [&_p]:leading-relaxed [&_li]:leading-relaxed [&_strong]:text-foreground">
          <p className="text-base text-foreground bg-muted rounded-xl p-4 border border-border">
            <strong>Plain-language summary:</strong> KickStart is a marketplace where adult neighbors hire local teens for everyday services like tutoring, lawn care, and pet sitting. Every teen account is linked to a verified parent or guardian who approves jobs and receives payments. We hold your payment in escrow until the job is done, then pay the teen's parent. We are a venue — not a party to the work itself. These terms explain the rules for using KickStart.
          </p>

          <h2>1. Eligibility and Age Requirements</h2>
          <p>
            <strong>Minimum age.</strong> You must be at least 13 years old to use KickStart. Users under 13 are not permitted.
          </p>
          <p>
            <strong>Teen users (ages 13–17).</strong> Teens may register and create a profile only with verifiable parent or guardian consent. At signup, a teen provides their date of birth. A parent or guardian must then link to the teen's account, verify their own identity, and explicitly attest the relationship before the teen can accept jobs or receive payments. The parent is the legal and financial account holder.
          </p>
          <p>
            <strong>Adult users (18+).</strong> Neighbors hiring teens and parents managing teen accounts must be at least 18 years old and legally able to enter contracts.
          </p>

          <h2>2. Accounts and Parental Consent</h2>
          <p>
            You agree to provide accurate information when registering, including your real name, date of birth, and email address. You are responsible for keeping your password and account secure.
          </p>
          <p>
            <strong>Teen accounts.</strong> A teen account is not active until a parent or guardian completes the linking process: the parent enters the teen's invite code, passes identity verification (government ID + liveness check), and attests the parent-child relationship. The parent controls payout of earnings and can approve or deny any booking.
          </p>
          <p>
            <strong>Parent/guardian attestation.</strong> By linking to a teen account, the parent or guardian confirms: "I am the parent or legal guardian of the account holder. I consent to their use of KickStart, including listings and payment activity. I have read and agree to the Terms of Service and Privacy Policy on their behalf. I understand I am responsible for authorizing transactions made through this account."
          </p>

          <h2>3. Our Role — Marketplace Venue</h2>
          <p>
            KickStart is a venue that connects neighbors with teens and their parents. We are <strong>not</strong> a party to any agreement between a neighbor and a teen (or their parent). We do not employ teens, do not direct or control how work is performed, and are not responsible for the quality, safety, or legality of any service. You use KickStart at your own risk.
          </p>

          <h2>4. Fees and Payments</h2>
          <p>
            <strong>Platform fee.</strong> KickStart charges a service fee on each completed booking. The fee is deducted from the teen's earnings before payout to the parent. The current fee rate is shown at checkout and on the earnings screen.
          </p>
          <p>
            <strong>Escrow.</strong> When a job starts, the neighbor's payment (including any tip) is charged through Stripe and held in escrow. Funds are released to the teen's parent only when both the neighbor and the teen confirm the job is finished. If the job is cancelled or denied before it starts, the neighbor is refunded.
          </p>
          <p>
            <strong>Payouts.</strong> Earnings are paid to the parent's connected Stripe Connect account, not directly to the teen. The parent is responsible for any tax reporting and for distributing earnings to the teen as they see fit.
          </p>

          <h2>5. Refunds and Disputes</h2>
          <p>
            If a booking is denied by the parent or cancelled before the job starts, the neighbor is automatically refunded. Once a job is in progress, refunds are handled case by case. If you believe a job was not completed satisfactorily, contact us within 7 days. We may, at our discretion, refund the neighbor or withhold payout pending review.
          </p>
          <p>
            Because payments are held in escrow and released only on two-sided confirmation, one-sided disputes are rare. If one party confirms and the other does not within a reasonable window, the booking is flagged for manual review.
          </p>

          <h2>6. Acceptable Use</h2>
          <p>You agree not to:</p>
          <ul>
            <li>Share contact information (phone, email, address) outside the platform before a booking is confirmed.</li>
            <li>Request or perform services that are illegal, dangerous, or involve hazardous equipment prohibited for minors.</li>
            <li>Post false, misleading, or discriminatory content.</li>
            <li>Harass, threaten, or harm another user.</li>
            <li>Attempt to bypass payment, fees, or escrow.</li>
            <li>Use the service for anything other than its intended neighborhood-jobs purpose.</li>
          </ul>
          <p>
            We screen listings for safety hazards and may reject or remove any posting that violates these rules.
          </p>

          <h2>7. Prohibited Services</h2>
          <p>
            KickStart is for light, age-appropriate neighborhood services. The following are prohibited: any service involving heavy machinery, power tools restricted to adults, firearms, adult content, medical or personal care requiring certification, transportation of people, and any service that violates child labor laws in the teen's state.
          </p>

          <h2>8. Content and Intellectual Property</h2>
          <p>
            You retain ownership of content you post (listings, photos, messages). You grant KickStart a limited license to display that content on the platform for the purpose of operating the service. You agree not to post content that infringes another's intellectual property rights.
          </p>

          <h2>9. Termination</h2>
          <p>
            You may close your account at any time. We may suspend or terminate any account that violates these terms, poses a safety risk, or is the subject of repeated complaints. Upon termination, pending escrow funds are resolved according to the refund and dispute rules above.
          </p>

          <h2>10. Disclaimers</h2>
          <p>
            KickStart is provided "as is" without warranties of any kind. We do not guarantee that every job will be completed, that every user is who they claim to be, or that the platform will be uninterrupted. You are responsible for evaluating the suitability of any match.
          </p>

          <h2>11. Limitation of Liability</h2>
          <p>
            To the fullest extent permitted by law, KickStart and its operators are not liable for any indirect, incidental, or consequential damages arising from your use of the platform, including any harm or loss related to a job performed through the platform. Our total liability is limited to the fees you paid us in the preceding 12 months.
          </p>

          <h2>12. Indemnification</h2>
          <p>
            You agree to indemnify and hold KickStart harmless from claims arising out of your use of the platform, your conduct, or your violation of these terms.
          </p>

          <h2>13. Dispute Resolution and Governing Law</h2>
          <p>
            These terms are governed by the laws of the State of California, United States, without regard to conflict-of-law principles. Any dispute will first be attempted through good-faith negotiation.
          </p>
          <p className="bg-muted rounded-xl p-4 border border-border text-foreground">
            <strong>[PENDING LEGAL REVIEW]</strong> The arbitration enforceability clause for this platform is under review with legal counsel. Until counsel signs off, no binding arbitration language is in effect. Please check back for the finalized dispute resolution terms.
          </p>

          <h2>14. Changes to These Terms</h2>
          <p>
            We may update these terms from time to time. We will notify users of material changes through the app or by email. Continued use after changes take effect means you accept the updated terms.
          </p>

          <h2>15. Contact</h2>
          <p>
            Questions about these terms? Contact us through the in-app support or at <a href="mailto:aaditya.kamat10@gmail.com" className="text-foreground font-medium hover:underline">aaditya.kamat10@gmail.com</a>.
          </p>
        </div>
      </div>
    </div>
  );
}