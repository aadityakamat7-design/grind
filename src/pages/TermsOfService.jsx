import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import SiteFooter from "@/components/SiteFooter";
import Seo from "@/components/Seo";

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Seo title="Terms of Service" description="The rules for using Blockwork: eligibility, parental consent, no-home-entry policy, escrow payments, minor work-hour limits, and dispute resolution." path="/terms" />
      <div className="max-w-3xl mx-auto px-6 py-16">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="w-4 h-4" /> Back to home
        </Link>

        <h1 className="font-heading text-3xl font-bold text-foreground mb-2">Terms of Service</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: August 27, 2026</p>

        <div className="prose prose-sm max-w-none text-muted-foreground [&_h2]:text-foreground [&_h2]:font-heading [&_h2]:font-semibold [&_h2]:mt-8 [&_h2]:mb-3 [&_p]:leading-relaxed [&_li]:leading-relaxed [&_strong]:text-foreground">
          <p className="text-base text-foreground bg-muted rounded-xl p-4 border border-border">
            <strong>Plain-language summary:</strong> Blockwork is a marketplace where adult neighbors hire local teens for outdoor tasks (like lawn care and car washing) performed outside the residence, and for online tutoring and tech help conducted over video. Every teen account is linked to a verified parent or guardian who approves each job and receives the earnings. Teens never enter a client's home — all in-person work happens outdoors, and all tutoring happens remotely. We hold your payment in escrow until the teen uploads photo proof of completion and the neighbor confirms the work. We are a venue — not a party to the work itself. These terms explain the rules for using Blockwork.
          </p>

          <h2>1. Eligibility and Age Requirements</h2>
          <p>
            <strong>Minimum age.</strong> You must be at least 13 years old to use Blockwork. Users under 13 are not permitted.
          </p>
          <p>
            <strong>Teen users (ages 13–17).</strong> Teens may register and create a profile only with verifiable parent or guardian consent. At signup, a teen provides their date of birth and state. A parent or guardian must then link to the teen's account, verify their own identity, and explicitly attest the relationship before the teen can accept jobs or receive payments. The parent is the legal and financial account holder.
          </p>
          <p>
            <strong>Adult users (18+).</strong> Neighbors hiring teens and parents managing teen accounts must be at least 18 years old and legally able to enter contracts. Teens who are 18 or older may use the platform independently without a linked parent.
          </p>

          <h2>1A. Work-Hour Limits for Minors</h2>
          <p>
            <strong>Enforced automatically.</strong> Blockwork enforces state child-labor hour limits at booking, in the API — not only in the UI — so they cannot be bypassed by a direct call. Limits vary by the teen's state and age band (14–15 and 16–17; teens 18 and older are not subject to minor hour limits). They include maximum hours per day on school days and on non-school days, maximum hours per week during the school year and during summer, and prohibited time windows (for example, no work before an early-morning hour or after a late-evening hour, and no work during school hours on school days where the state requires it).
          </p>
          <p>
            The specific limits that apply to a teen are shown to the parent during the consent flow and are drawn from our maintained per-state lookup table, which reflects state child-labor rules for the teen's state. The platform counts a teen's already-scheduled and completed hours using their verified age, and rejects any booking that would push the teen over a daily or weekly limit or that falls in a prohibited time window, with a clear message stating the limit and the teen's current total.
          </p>
          <p>
            <strong>Permit exemption does not waive hour limits.</strong> Casual odd jobs of the kind offered on Blockwork (outdoor tasks and online tutoring) are generally exempt from state work-permit requirements. That exemption does <strong>not</strong> remove the hour limits or minimum-age restrictions described above — those still apply and are enforced by the platform.
          </p>
          <p>
            <strong>Parent's monitoring responsibility.</strong> Parents are responsible for monitoring their teen's overall working hours — including any work the teen performs outside Blockwork — to ensure compliance with state law and to prevent the teen from working during school hours or past permitted times. The platform's limits reflect state child-labor rules for the teen's state but do not track hours worked off-platform.
          </p>

          <h2>2. Accounts and Parental Consent</h2>
          <p>
            You agree to provide accurate information when registering, including your real name, date of birth, and email address. You are responsible for keeping your password and account secure.
          </p>
          <p>
            <strong>Teen accounts.</strong> A teen account is not active until a parent or guardian completes the linking process: the parent enters the teen's invite code, passes identity verification (government ID + liveness check), and attests the parent-child relationship. The parent controls payout of earnings and can approve or deny any booking.
          </p>
          <p>
            <strong>Itemized parental consent.</strong> By linking to a teen account, the parent or guardian individually acknowledges each of the following:
          </p>
          <ul>
            <li><strong>Guardianship authority</strong> — "I am the parent or legal guardian of this teen and have the legal authority to make decisions on their behalf."</li>
            <li><strong>Work authorization</strong> — "I authorize my teen to perform the types of outdoor tasks and online tutoring offered on Blockwork."</li>
            <li><strong>Per-job approval</strong> — "I understand that I must approve each booking before it is confirmed, and that I can deny any booking."</li>
            <li><strong>Permitted work types</strong> — "I understand that my teen may only perform outdoor tasks outside a client's residence and online tutoring over video, and will never enter a client's home."</li>
            <li><strong>Age accuracy</strong> — "I confirm that the date of birth provided for my teen is accurate."</li>
            <li><strong>State child-labor rules</strong> — "I have reviewed the child-labor rules for my teen's state and understand the restrictions on hours and work types that apply to my teen's age."</li>
            <li><strong>Hour monitoring</strong> — "I understand it is my responsibility to monitor my teen's working hours to ensure compliance with state law and to prevent my teen from working during school hours or past permitted times."</li>
            <li><strong>Acceptance of terms on the teen's behalf</strong> — "I have read and agree to the Terms of Service and Privacy Policy on my teen's behalf, and I accept responsibility for my teen's use of the platform."</li>
          </ul>
          <p>
            <strong>Revocable and versioned consent.</strong> Parental consent can be revoked at any time, which immediately suspends the teen's profile and flags any pending bookings for review. Each consent acknowledgment is timestamped and recorded with the version of these terms that was in effect. When the terms change in a way that requires re-consent, the parent must re-acknowledge before the teen can continue accepting jobs.
          </p>

          <h2>3. Our Role — Marketplace Venue</h2>
          <p>
            Blockwork provides a technology platform that connects neighbors with teens and their parents. We are <strong>not</strong> a party to any agreement between a neighbor and a teen (or their parent). We do not employ teens, do not contract with teens, do not supervise or direct how work is performed, and are not a staffing agency, employer, or joint employer of any teen. Any work agreement is solely between the neighbor and the teen's parent or guardian.
          </p>
          <p>
            Our safety features — including parent approval, identity verification, hazard screening, photo-proof completion, and in-app messaging — are risk-reduction measures. They do not constitute supervision of any job, do not guarantee that any user is safe or trustworthy, and do not guarantee that any job will be completed satisfactorily or without incident. You use Blockwork at your own risk.
          </p>

          <h2>4. No-Home-Entry Policy</h2>
          <p>
            <strong>This is a core safety rule of the platform.</strong> Teens never enter a client's home under any circumstances. All in-person work is performed outdoors on the exterior of the property. All tutoring and instructional work is conducted remotely via video session.
          </p>
          <p>
            <strong>Prohibited conduct.</strong> Requesting, encouraging, or permitting a teen to enter a residence — for any reason, including to use a restroom, retrieve equipment, or wait indoors — is a material violation of these terms and grounds for immediate account termination. This rule applies to neighbors, parents, and teens alike. If a job cannot be completed without the teen entering a home, the job must not be performed.
          </p>

          <h2>5. Permitted and Prohibited Services</h2>
          <p>
            <strong>Permitted services.</strong> Blockwork permits only two categories of work:
          </p>
          <ul>
            <li><strong>Outdoor tasks</strong> — performed entirely outside the residence, such as lawn mowing, leaf raking, yard cleanup, car washing, snow shoveling, and similar light outdoor odd jobs.</li>
            <li><strong>Online tutoring and tech help</strong> — conducted entirely over a remote video session, such as academic tutoring, homework help, and basic technology guidance.</li>
          </ul>
          <p>
            <strong>Prohibited services.</strong> The following are not permitted on Blockwork: any service that requires entering a client's home; in-home pet sitting or animal care inside a residence; babysitting or childcare; any service involving heavy machinery, power tools restricted to adults, firearms, adult content, medical or personal care requiring certification; transportation of people; and any service that violates child-labor laws in the teen's state.
          </p>
          <p>
            We screen listings and job posts for safety hazards and may reject or remove any posting that violates these rules or that we determine is inappropriate for a teen.
          </p>

          <h2>6. Online Sessions</h2>
          <p>
            <strong>How sessions work.</strong> When a booking is for online tutoring or tech help, the platform generates a video session link that is visible to the teen, the neighbor, and the teen's parent. The session is conducted over that link. Both parties should join from a safe, appropriate location.
          </p>
          <p>
            <strong>Conduct rules.</strong> All participants in a video session must be appropriately dressed, must not record the session without the other party's consent, and must not engage in any inappropriate or harassing conduct. The teen's parent may join or monitor any session involving their teen. Any violation should be reported through the platform immediately.
          </p>
          <p>
            <strong>Recording.</strong> Blockwork does not record, store, or transcribe video sessions. Session metadata (start time, duration, and participant IDs) is logged for safety and dispute resolution. See the Privacy Policy for details.
          </p>

          <h2>7. Fees and Payments</h2>
          <p>
            <strong>Platform fee.</strong> Blockwork charges a service fee on each completed booking. The fee is deducted from the teen's earnings before payout to the parent. The current fee rate is shown at checkout and on the earnings screen.
          </p>
          <p>
            <strong>Escrow.</strong> When a job starts, the neighbor's payment (including any tip) is charged through Stripe and held in escrow. The teen uploads photo proof that the work is complete. The neighbor then has 12 hours to confirm the work or report a problem. If the neighbor confirms, the funds are released to the teen's parent. If the neighbor does not respond within 12 hours, the funds are automatically released. If the neighbor reports a problem, the funds are held pending review.
          </p>
          <p>
            <strong>Payouts.</strong> Earnings are paid to the parent's connected Stripe Connect account, not directly to the teen. The parent is responsible for any tax reporting and for distributing earnings to the teen as they see fit.
          </p>

          <h2>8. Refunds and Disputes</h2>
          <p>
            If a booking is denied by the parent or cancelled before the job starts, the neighbor is automatically refunded. Once a job is in progress, refunds are handled case by case. If the neighbor reports that the work was not completed satisfactorily, the escrow is held while we review the teen's completion photos and the neighbor's report.
          </p>
          <p>
            <strong>Dispute resolution.</strong> If the neighbor disputes the completion, an administrator reviews the photo evidence and the neighbor's explanation, and decides whether to release the payment to the teen's parent or refund the neighbor. If you believe a job was not completed satisfactorily, report it through the booking within 12 hours of the teen marking it finished.
          </p>

          <h2>9. Acceptable Use</h2>
          <p>You agree not to:</p>
          <ul>
            <li>Share contact information (phone, email, address) outside the platform before a booking is confirmed.</li>
            <li>Request, encourage, or permit a teen to enter a residence for any reason.</li>
            <li>Request or perform services that are illegal, dangerous, or involve hazardous equipment prohibited for minors.</li>
            <li>Post false, misleading, or discriminatory content.</li>
            <li>Harass, threaten, or harm another user.</li>
            <li>Record an online session without the other party's consent.</li>
            <li>Attempt to bypass payment, fees, or escrow.</li>
            <li>Use the service for anything other than the outdoor tasks and online tutoring described in these terms.</li>
          </ul>

          <h2>10. Assumption of Risk and Safety Responsibilities</h2>
          <p>
            <strong>Inherent risks.</strong> Outdoor physical work carries inherent risks, including but not limited to injury from tools, terrain, weather, traffic, and animals. The teen and their parent acknowledge that they are voluntarily participating in this work and that no amount of screening or platform safety features can eliminate these risks.
          </p>
          <p>
            <strong>Neighbor's responsibility.</strong> The neighbor is responsible for providing a safe outdoor work environment, free of known hazards, and for warning the teen of any conditions on the property that could pose a risk. The neighbor must not ask the teen to perform work that is dangerous, illegal, or beyond the teen's capacity.
          </p>
          <p>
            <strong>Parent's responsibility.</strong> The parent is responsible for assessing whether each job is suitable for their teen, for supervising their teen's participation as appropriate, and for ensuring compliance with state child-labor laws including hour restrictions and permitted work types.
          </p>
          <p>
            <strong>Platform's role.</strong> Blockwork does not supervise, direct, or control how any work is performed. We do not inspect job sites, verify the safety of any property, or guarantee the competence of any teen. Our safety features are risk-reduction measures, not supervision.
          </p>
          <p className="bg-muted rounded-xl p-4 border border-border text-foreground">
            <strong>[PENDING LEGAL REVIEW]</strong> The assumption-of-risk and waiver language as applied to minors requires review by legal counsel. Parental pre-injury waivers on behalf of minors are of limited or no enforceability in many states, including California. No binding waiver language is in effect until counsel approves it. The acknowledgments above describe responsibilities and awareness of risk, not a waiver of claims.
          </p>

          <h2>11. Incident Reporting and Emergencies</h2>
          <p>
            <strong>Emergencies first.</strong> In any emergency — injury, dangerous situation, or threat to safety — contact emergency services (911) immediately before doing anything else on the platform.
          </p>
          <p>
            <strong>How to report an incident.</strong> After ensuring safety, report any injury, safety incident, or emergency through the platform: use the "Alert parent" button in the booking for immediate parental notification, or the "Report" button for any safety concern, inappropriate behavior, or off-platform attempt. You can also email us at <a href="mailto:blockwork@teenskickstart.base44.app" className="text-foreground font-medium hover:underline">blockwork@teenskickstart.base44.app</a>.
          </p>
          <p>
            <strong>Reporting window.</strong> You must report any incident within 48 hours of becoming aware of it. Reports made after 48 hours may still be reviewed, but timely reporting helps us respond effectively.
          </p>
          <p>
            <strong>Our response.</strong> We review safety reports within 1 business day. Depending on severity, we may suspend accounts, remove listings, hold payments, contact the parties involved, or report to authorities. We will acknowledge your report and keep you informed of the outcome where appropriate.
          </p>

          <h2>12. Content and Intellectual Property</h2>
          <p>
            You retain ownership of content you post (listings, photos, messages, completion photos). You grant Blockwork a limited license to display that content on the platform for the purpose of operating the service, including showing completion photos to the neighbor and to administrators during dispute review. You agree not to post content that infringes another's intellectual property rights.
          </p>

          <h2>13. Termination</h2>
          <p>
            You may close your account at any time. We may suspend or terminate any account that violates these terms, poses a safety risk, or is the subject of repeated complaints. Requesting or permitting a teen to enter a residence is grounds for immediate termination. Upon termination, pending escrow funds are resolved according to the refund and dispute rules above.
          </p>

          <h2>14. Disclaimers</h2>
          <p>
            Blockwork is provided "as is" without warranties of any kind. We do not guarantee that every job will be completed, that every user is who they claim to be, that any outdoor work site is safe, or that the platform will be uninterrupted. You are responsible for evaluating the suitability of any match and the safety of any work environment.
          </p>

          <h2>15. Limitation of Liability</h2>
          <p className="bg-muted rounded-xl p-4 border border-border text-foreground">
            <strong>[PENDING LEGAL REVIEW]</strong> The limitation-of-liability cap (including the proposed cap of fees paid in the preceding 12 months) and its applicability to minors and personal-injury claims require review by legal counsel. Many jurisdictions restrict or prohibit limiting liability for gross negligence, willful misconduct, or personal injury, and may not enforce liability caps against minors. No binding limitation language is in effect until counsel approves it.
          </p>

          <h2>16. Indemnification</h2>
          <p className="bg-muted rounded-xl p-4 border border-border text-foreground">
            <strong>[PENDING LEGAL REVIEW]</strong> The scope of indemnification — including whether it covers personal-injury claims, whether it is mutual, and whether it is enforceable against minors and parents acting on their behalf — requires review by legal counsel. No binding indemnification language is in effect until counsel approves it.
          </p>

          <h2>17. Insurance</h2>
          <p className="bg-muted rounded-xl p-4 border border-border text-foreground">
            <strong>[PENDING LEGAL REVIEW]</strong> Whether Blockwork should carry general liability, errors-and-omissions, or other insurance, and whether users should be required to carry their own insurance, requires review by legal counsel and a determination of business needs. No insurance representation or requirement is in effect until counsel approves it.
          </p>

          <h2>18. Dispute Resolution and Governing Law</h2>
          <p>
            These terms are governed by the laws of the State of California, United States, without regard to conflict-of-law principles. Any dispute will first be attempted through good-faith negotiation.
          </p>
          <p className="bg-muted rounded-xl p-4 border border-border text-foreground">
            <strong>[PENDING LEGAL REVIEW]</strong> The arbitration clause and class-action waiver — including their enforceability as applied to minors, whether they can be imposed on parents acting on behalf of minors, and whether they survive California's restrictions on arbitration of claims involving minors — require review by legal counsel. No binding arbitration or class-action waiver language is in effect until counsel approves it.
          </p>

          <h2>19. Changes to These Terms</h2>
          <p>
            We may update these terms from time to time. We will notify users of material changes through the app or by email. Continued use after changes take effect means you accept the updated terms. Changes that materially alter the scope of parental consent will require re-acknowledgment before the affected teen can continue accepting jobs.
          </p>

          <h2>20. Contact</h2>
          <p>
            Questions about these terms? Contact us through the in-app support or at <a href="mailto:blockwork@teenskickstart.base44.app" className="text-foreground font-medium hover:underline">blockwork@teenskickstart.base44.app</a>.
          </p>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}