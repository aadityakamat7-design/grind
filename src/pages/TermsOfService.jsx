import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import SiteFooter from "@/components/SiteFooter";
import Seo from "@/components/Seo";

// Terms of Service — version 2026-10-01
// Publicly readable without an account (public route in App.jsx).
// When a user accepts, the version, timestamp, IP, and user agent are
// saved in their ConsentRecord (see base44/shared/termsAcceptance.ts).

const TERMS_VERSION = "2026-10-01";
const EFFECTIVE_DATE = "October 1, 2026";

const TOC = [
  { num: 1, title: "What Blockwork is" },
  { num: 2, title: "Who can use Blockwork" },
  { num: 3, title: "Parent verification, consent, and approval" },
  { num: 4, title: "Safety rules for Jobs" },
  { num: 5, title: "Your responsibilities" },
  { num: 6, title: "Not employment; taxes and insurance" },
  { num: 7, title: "Payments" },
  { num: 8, title: "Cancellations, refunds, and disputes" },
  { num: 9, title: "Communication stays on the Platform" },
  { num: 10, title: "Reviews and content" },
  { num: 11, title: "Prohibited conduct" },
  { num: 12, title: "Privacy" },
  { num: 13, title: "Disclaimers" },
  { num: 14, title: "Limitation of liability" },
  { num: 15, title: "Indemnification" },
  { num: 16, title: "Suspension and termination" },
  { num: 17, title: "Governing law and venue" },
  { num: 18, title: "General terms" },
];

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Seo
        title="Terms of Service"
        description="The rules for using Blockwork: eligibility, parental consent, no-home-entry policy, held payments, minor work-hour limits, and dispute resolution."
        path="/terms"
      />
      <div className="max-w-3xl mx-auto px-6 py-10">
        <Link to="/" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to home
        </Link>

        <h1 className="font-heading text-2xl font-bold text-foreground mb-1">Terms of Service</h1>
        <p className="text-xs text-muted-foreground mb-2">Last updated: {EFFECTIVE_DATE}</p>
        <p className="text-[11px] text-muted-foreground/70 mb-6">Version {TERMS_VERSION}</p>

        {/* Table of contents */}
        <nav className="bg-muted rounded-2xl border border-border p-5 mb-8">
          <p className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3">Table of contents</p>
          <ol className="space-y-1.5">
            {TOC.map((s) => (
              <li key={s.num}>
                <a
                  href={`#section-${s.num}`}
                  className="text-[13px] text-primary hover:underline underline-offset-2"
                >
                  {s.num}. {s.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="text-[13px] leading-relaxed text-muted-foreground space-y-3 [&_h2]:text-foreground [&_h2]:font-heading [&_h2]:font-semibold [&_h2]:text-[15px] [&_h2]:mt-7 [&_h2]:mb-2 [&_h3]:text-foreground [&_h3]:font-heading [&_h3]:font-semibold [&_h3]:text-[14px] [&_h3]:mt-4 [&_h3]:mb-1.5 [&_p]:leading-relaxed [&_li]:leading-relaxed [&_strong]:text-foreground [&_ul]:space-y-1 [&_ul]:pl-4 [&_ul]:list-disc [&_ol]:space-y-1 [&_ol]:pl-5 [&_ol]:list-[lower-alpha] [&_a]:text-primary [&_a]:hover:underline">
          <p>
            These Terms of Service ("Terms") are a legal agreement between you and Blockwork ("Blockwork," "we," "us," or "our"). They cover your use of blockwork.online and any Blockwork app, feature, or service that links to these Terms (together, the "Platform").
          </p>
          <p>
            <strong>Please read these Terms carefully.</strong> By creating an account, checking the box to accept these Terms, or using the Platform, you agree to these Terms and to our <Link to="/privacy">Privacy Policy</Link>. If you don't agree, don't use the Platform.
          </p>
          <p>
            <strong>If you are under 18,</strong> your parent or legal guardian must agree to these Terms for you before you can use the Platform, and you may only use it with their permission and supervision.
          </p>

          {/* Section 1 */}
          <h2 id="section-1">1. What Blockwork is</h2>
          <p><strong>1.1 A marketplace, not an employer.</strong> Blockwork is an online marketplace that connects people who need help with small, occasional tasks ("Neighbors") with teens who want to do them ("Teens"). Blockwork doesn't perform any tasks, doesn't hire or employ Teens, and isn't a party to the arrangement between a Neighbor and a Teen, except as a limited payment collection agent under Section 7.</p>
          <p><strong>1.2 The kinds of jobs allowed.</strong> The Platform is only for casual, occasional, age-appropriate tasks ("Jobs") in these categories: lawn and yard care, car washing, other outdoor odd jobs, pet care that happens outside the home (such as dog walking), and live online tutoring. We may add, change, or remove categories. The categories and minimum ages shown in the app are the ones that apply.</p>
          <p><strong>1.3 Where we operate.</strong> The Platform is currently available only for Jobs performed in California. In-person Jobs must be at a location in California, and users must provide accurate location information.</p>
          <p><strong>1.4 No work inside homes.</strong> In-person Jobs must be done outdoors, such as in a yard, driveway, or on a sidewalk. Teens may not enter a Neighbor's home or any other enclosed private building to do a Job, and Neighbors may not ask them to.</p>
          <p><strong>1.5 No licensed or regulated work.</strong> A Job may not require a license, permit, or certification, and may not be work that California or federal law bars minors from doing. A Job, or a series of related Jobs for the same Neighbor, may not be used for construction, repair, or improvement work that would require a contractor's license under California law. Blockwork may set a maximum price per Job and limit repeat bookings to help keep Jobs within these limits.</p>

          {/* Section 2 */}
          <h2 id="section-2">2. Who can use Blockwork</h2>
          <p><strong>2.1 Roles.</strong></p>
          <ul>
            <li><strong>Teens</strong> are users aged 13 through 17 who offer to do Jobs, with a Parent's consent and approval.</li>
            <li><strong>Independent Teens</strong> are users aged 18 or older who offer to do Jobs. They don't need a Parent and agree to these Terms for themselves.</li>
            <li><strong>Parents</strong> are the parents or legal guardians of Teens. A Parent agrees to these Terms for themselves and on behalf of their Teen, and approves each Job.</li>
            <li><strong>Neighbors</strong> are users aged 18 or older who book and pay for Jobs.</li>
          </ul>
          <p><strong>2.2 Minimum age.</strong> You must be at least 13 to use the Platform. We don't knowingly collect information from children under 13. If we learn that someone under 13 has created an account, we'll delete it.</p>
          <p><strong>2.3 Your account.</strong> You must give accurate, current, and complete information, and keep it updated. You may have only one account per role. You're responsible for keeping your password secure and for everything that happens in your account. Tell us right away at <a href="mailto:support@blockwork.online">support@blockwork.online</a> if you think someone else has accessed it. If we suspend or close your account, you may not create a new one.</p>

          {/* Section 3 */}
          <h2 id="section-3">3. Parent verification, consent, and approval</h2>
          <p><strong>3.1 Linking a Parent.</strong> A Parent must link to a Teen's account before the Teen can post a service or take a Job. The Parent links with the Teen's connection code, provides their legal name and date of birth, confirms they are the Teen's parent or legal guardian, and confirms the Teen's date of birth. No bank account is required to link, and linking makes the Teen's account active.</p>
          <p><strong>3.1.1 Payout account.</strong> Before the Teen's first cash-out, the Parent must set up a payout account through our payment provider, Stripe. Stripe checks the Parent's legal name, date of birth, and Social Security number, confirms they are an adult, and connects the bank account where the Teen's earnings will be paid. Until that account is active, the Teen's earnings stay held in their Blockwork Wallet. Blockwork doesn't receive or store full Social Security numbers or bank account numbers.</p>
          <p><strong>3.2 What the Parent confirms.</strong> By linking to a Teen's account, the Parent confirms that:</p>
          <ul>
            <li>(a) they are the Teen's parent or legal guardian;</li>
            <li>(b) the Teen's name and date of birth they provide are true and accurate;</li>
            <li>(c) they consent to the Teen using the Platform under these Terms; and</li>
            <li>(d) they will supervise the Teen's use of the Platform and the Jobs the Teen does.</li>
          </ul>
          <p><strong>3.3 Approving every service and every Job.</strong> Every service a Teen posts is hidden from Neighbors until the Parent approves it, and every Job booked with a Teen needs the Parent's approval in the app before it's confirmed. The Parent can see the Job details, location, price, and the Neighbor's name before deciding, and can decline any Job. If a Parent declines, the Neighbor's payment is refunded under Section 8.</p>
          <p><strong>3.4 Parent responsibilities.</strong> Parents are responsible for:</p>
          <ul>
            <li>deciding whether each Job, location, and Neighbor is suitable and safe for their Teen;</li>
            <li>deciding whether an adult should be present during a Job;</li>
            <li>making sure their Teen can do each Job safely;</li>
            <li>making sure their Teen's work follows the child labor laws that apply, including limits on hours and times of day; and</li>
            <li>their Teen's conduct on the Platform and while doing Jobs.</li>
          </ul>
          <p>The Platform may apply its own age and hour limits, but these don't replace a Parent's judgment or legal responsibilities.</p>

          {/* Section 4 */}
          <h2 id="section-4">4. Safety rules for Jobs</h2>
          <p><strong>4.1 Age limits by category.</strong> Each Job category has a minimum age, shown in the app. Teens may only accept Jobs in categories they're old enough for, based on the date of birth their Parent confirmed.</p>
          <p><strong>4.2 Prohibited Jobs and requests.</strong> Nobody may post, request, accept, or do a Job that:</p>
          <ul>
            <li>(a) involves hazardous work, including operating equipment or power tools that the law bars minors from using;</li>
            <li>(b) involves working at heights, on roofs, or on ladders beyond what is safe and lawful for the Teen's age;</li>
            <li>(c) involves handling chemicals that aren't ordinary household products;</li>
            <li>(d) takes place during hours when the law bars minors from working;</li>
            <li>(e) requires a Teen to enter a home or enclosed private building;</li>
            <li>(f) requires a Teen to drive a vehicle; or</li>
            <li>(g) involves any activity that is illegal or unsafe for a minor.</li>
          </ul>
          <p><strong>4.3 Age-restricted products.</strong> Nobody may ask, require, or allow a Teen to buy, carry, deliver, handle, or use any product or service that minors can't legally buy or receive. This includes alcohol, tobacco, nicotine and vaping products, cannabis products, prescription drugs, weapons, ammunition, fireworks, lottery tickets, and sexually explicit material.</p>
          <p><strong>4.4 Online tutoring.</strong> Tutoring sessions must happen through the Platform's video tool, or another method the Platform provides. Tutoring sessions are not recorded by Blockwork. Nobody may ask a Teen to turn on their camera in a private space, share personal contact information, or continue a session outside the Platform.</p>
          <p><strong>4.5 Reporting concerns.</strong> If anything about a Job, message, or user makes you feel unsafe, stop and report it through <Link to="/report-safety">Report a Safety Concern</Link> or the report option in the app. In an emergency, call 911 first. We may share reports of suspected child exploitation or abuse with law enforcement and other authorities, and we will cooperate with their investigations.</p>
          <p><strong>4.6 No background checks.</strong> Blockwork does <strong>not</strong> run criminal background checks on Neighbors, Teens, or Parents, and doesn't verify the identity of Neighbors. Parents are responsible for deciding whether a Neighbor and a Job are suitable for their Teen.</p>

          {/* Section 5 */}
          <h2 id="section-5">5. Your responsibilities</h2>
          <p><strong>5.1 Neighbors must:</strong></p>
          <ul>
            <li>describe each Job accurately, including its scope, location, equipment, pets, and any known hazards;</li>
            <li>give a safe place to work and any safety instructions needed;</li>
            <li>pay only through the Platform;</li>
            <li>treat Teens with respect and communicate only through the Platform; and</li>
            <li>confirm in the app when a Job is complete.</li>
          </ul>
          <p><strong>5.2 Teens must:</strong></p>
          <ul>
            <li>only accept Jobs they can do safely and have their Parent's approval for;</li>
            <li>do accepted Jobs carefully and as agreed;</li>
            <li>respect the Neighbor's property and return any tools or equipment they're given;</li>
            <li>ask their Parent or the Neighbor for help if they're unsure how to do something safely; and</li>
            <li>stop and tell their Parent if anything feels unsafe.</li>
          </ul>
          <p><strong>5.3 Everyone must follow the law</strong> and these Terms.</p>

          {/* Section 6 */}
          <h2 id="section-6">6. Not employment; taxes and insurance</h2>
          <p><strong>6.1 No employment relationship.</strong> Blockwork doesn't employ, hire, supervise, or direct Teens, Independent Teens, Parents, or Neighbors. Blockwork doesn't:</p>
          <ul>
            <li>choose which Jobs a Teen accepts;</li>
            <li>decide how or when a Job is done;</li>
            <li>provide tools or equipment; or</li>
            <li>require Teens to work any minimum amount.</li>
          </ul>
          <p>Nothing in these Terms creates an employment, joint employment, agency, partnership, or joint venture relationship between Blockwork and any user.</p>
          <p><strong>6.2 Occasional help only.</strong> The Platform is for occasional, neighbor-to-neighbor help. Don't use it to set up regular or ongoing employment. If you want to hire someone on an ongoing basis, the Platform isn't the right tool.</p>
          <p><strong>6.3 No insurance.</strong> Blockwork doesn't provide workers' compensation, accident insurance, liability insurance, or any other insurance for any user or Job. Users are responsible for any insurance they choose to have, such as a Neighbor's homeowner's insurance.</p>
          <p><strong>6.4 Taxes.</strong> Blockwork doesn't withhold taxes or provide payroll services. Teens (through their Parents) and Independent Teens are responsible for reporting their own earnings as the law requires. Stripe may issue tax forms where the law requires it.</p>

          {/* Section 7 */}
          <h2 id="section-7">7. Payments</h2>
          <p><strong>7.1 Payment processing.</strong> Payments are processed by Stripe. By paying through the Platform, you also agree to Stripe's terms. Blockwork doesn't store full card numbers.</p>
          <p><strong>7.2 How payment works.</strong></p>
          <ul>
            <li>(a) A Neighbor pays in full when booking a Job. A booking isn't submitted until payment has been authorized.</li>
            <li>(b) The payment is held by Stripe until both the Neighbor and the Teen confirm in the app that the Job is complete.</li>
            <li>(c) Once both confirm, the Teen's earnings, minus the fees described in Section 7.4, are paid out. For a Teen under 18, earnings are paid to the Parent's Stripe payout account. For an Independent Teen, they are paid to the Independent Teen's own Stripe payout account.</li>
            <li>(d) Paid-out funds may take several business days to become available, as shown in the app.</li>
          </ul>
          <p><strong>7.3 Limited payment collection agent.</strong> Each Teen (through their Parent) and each Independent Teen appoints Blockwork as their limited agent for the sole purpose of receiving payments from Neighbors on their behalf. When a Neighbor's payment is received through the Platform, it counts as received by the Teen or Independent Teen. After that, the Neighbor owes nothing more for that Job, even if the payout is later delayed.</p>
          <p><strong>7.4 Prices and fees.</strong></p>
          <ul>
            <li>Neighbors see the price of each Job before paying.</li>
            <li>Prices must fall within the minimum and maximum amounts the Platform sets.</li>
            <li>Blockwork charges a platform fee, which is shown on our <Link to="/pricing">Pricing</Link> page and in the app before a Job is confirmed. We may change our fees with notice, but changes won't affect Jobs already booked.</li>
            <li>Except as described in Section 8 or required by law, fees aren't refundable.</li>
          </ul>
          <p><strong>7.5 Tips.</strong> Neighbors may add a tip through the Platform. Tips go to the Teen's payout (or the Independent Teen's) the same way as their earnings.</p>
          <p><strong>7.6 No off-platform payments.</strong> All payments for Jobs found or arranged through the Platform must be made through the Platform. Cash, Venmo, Zelle, Cash App, checks, bank transfers, and other off-platform payments aren't allowed. Blockwork isn't responsible for any payment made outside the Platform.</p>

          {/* Section 8 */}
          <h2 id="section-8">8. Cancellations, refunds, and disputes</h2>
          <p><strong>8.1 Cancellations and refunds.</strong> Cancellation and refund rules, including deadlines, are explained on our <Link to="/refunds">Refunds & Disputes</Link> page and are part of these Terms. In particular:</p>
          <ul>
            <li>if a Parent declines a Job, or the booking is cancelled before the Job starts as allowed on that page, the Neighbor gets a full refund; and</li>
            <li>if a booking's payment was never completed, no charge is made and the booking expires.</li>
          </ul>
          <p><strong>8.2 Disputes about a Job.</strong> If a Neighbor or Parent believes a Job wasn't done as agreed, they can open a dispute in the app before confirming completion. The payment stays held while we review it. We'll consider the information both sides give us and decide whether to release, partly refund, or fully refund the payment. Our decision on how held funds are handled is final for purposes of the Platform, but it doesn't limit your legal rights against the other user.</p>
          <p><strong>8.3 Chargebacks.</strong> If a Neighbor disputes a charge with their card issuer, we and Stripe may hold, reverse, or recover the related payout while the dispute is resolved.</p>

          {/* Section 9 */}
          <h2 id="section-9">9. Communication stays on the Platform</h2>
          <p>To protect Teens and keep Parents informed, all communication about a Job must happen through the Platform's messaging tools, except brief in-person coordination during a Job that's already confirmed. Don't ask for or share phone numbers, email addresses, social media accounts, or home addresses outside what the Platform shows. Messages may be automatically screened, and reviewed by us, to protect users and enforce these Terms. A Parent can see messages involving their Teen.</p>

          {/* Section 10 */}
          <h2 id="section-10">10. Reviews and content</h2>
          <p><strong>10.1 Your content.</strong> You keep ownership of what you post, such as Job descriptions, reviews, messages, and photos ("Your Content"). You give Blockwork a worldwide, non-exclusive, royalty-free license to host, store, display, and use Your Content to operate, improve, and promote the Platform. You confirm that you have the rights to post Your Content.</p>
          <p><strong>10.2 Reviews.</strong></p>
          <ul>
            <li>Reviews must be honest, reflect your own experience of a real Job, and not include personal information such as addresses, phone numbers, school names, or last names.</li>
            <li>Reviews are the opinions of the users who write them, not statements by Blockwork.</li>
            <li>We may remove reviews that break these Terms. We don't edit the substance of reviews.</li>
          </ul>
          <p><strong>10.3 Copyright.</strong> If you believe content on the Platform infringes your copyright, email <a href="mailto:support@blockwork.online">support@blockwork.online</a> with the details required by 17 U.S.C. § 512(c)(3).</p>

          {/* Section 11 */}
          <h2 id="section-11">11. Prohibited conduct</h2>
          <p>You may not:</p>
          <ul>
            <li>(a) use the Platform to harm, exploit, groom, or endanger a minor in any way;</li>
            <li>(b) harass, threaten, bully, or discriminate against anyone;</li>
            <li>(c) give false information, impersonate anyone, or create an account for someone else without authority (except a Parent linking to their own Teen);</li>
            <li>(d) get around the Platform's payment system, fees, approvals, age limits, or safety features;</li>
            <li>(e) post illegal, hateful, sexually explicit, or misleading content;</li>
            <li>(f) send spam or unsolicited advertising;</li>
            <li>(g) scrape, crawl, or copy the Platform or its data by automated means, except as allowed by our robots.txt file for public pages;</li>
            <li>(h) try to access accounts, data, or systems you're not authorized to access, or interfere with the Platform's security or performance; or</li>
            <li>(i) use the Platform to break any law, including child labor, consumer protection, and privacy laws.</li>
          </ul>

          {/* Section 12 */}
          <h2 id="section-12">12. Privacy</h2>
          <p>Our <Link to="/privacy">Privacy Policy</Link> explains how we collect, use, and protect personal information, including information about Teens. We only collect a Teen's personal information with their Parent's consent.</p>

          {/* Section 13 */}
          <h2 id="section-13">13. Disclaimers</h2>
          <p>The Platform is provided "as is" and "as available." To the fullest extent the law allows, Blockwork disclaims all warranties, express or implied, including warranties of merchantability, fitness for a particular purpose, title, and non-infringement.</p>
          <p>Blockwork doesn't guarantee:</p>
          <ul>
            <li>the quality, safety, or legality of any Job;</li>
            <li>the conduct, identity, or ability of any user; or</li>
            <li>that the Platform will be uninterrupted or error-free.</li>
          </ul>
          <p>Blockwork isn't responsible for:</p>
          <ul>
            <li>the acts or omissions of users;</li>
            <li>conditions at any Job location; or</li>
            <li>interactions between users, whether online or in person.</li>
          </ul>
          <p>Some jurisdictions don't allow certain warranty disclaimers, so some of these may not apply to you.</p>

          {/* Section 14 */}
          <h2 id="section-14">14. Limitation of liability</h2>
          <p>To the fullest extent the law allows:</p>
          <ul>
            <li>Blockwork won't be liable for any indirect, incidental, special, consequential, or punitive damages, or for lost profits, data, or goodwill, arising from or related to the Platform, any Job, or these Terms.</li>
            <li>Blockwork's total liability for all claims won't exceed the greater of $100 or the fees you paid to Blockwork in the 12 months before the event giving rise to the claim.</li>
          </ul>
          <p>Nothing in these Terms limits liability that can't be limited by law, including liability for gross negligence or willful misconduct.</p>

          {/* Section 15 */}
          <h2 id="section-15">15. Indemnification</h2>
          <p>To the extent the law allows, you (and a Parent, for their Teen) agree to defend, indemnify, and hold harmless Blockwork and its owners, officers, and agents from any claims, losses, damages, and expenses, including reasonable attorneys' fees, arising from:</p>
          <ul>
            <li>(a) your or your Teen's use of the Platform;</li>
            <li>(b) any Job you or your Teen post, book, or do;</li>
            <li>(c) your or your Teen's breach of these Terms or violation of any law or anyone's rights; or</li>
            <li>(d) Your Content.</li>
          </ul>

          {/* Section 16 */}
          <h2 id="section-16">16. Suspension and termination</h2>
          <ul>
            <li>You may close your account at any time from your settings or by contacting us.</li>
            <li>We may suspend or close an account, cancel Jobs, or remove content if we reasonably believe someone has broken these Terms or the law, or poses a risk to others, especially to a minor. We may do this immediately if there's a safety risk.</li>
            <li>Sections that by their nature should survive termination, including payment obligations and Sections 6, 13–15, and 17–18, will survive.</li>
          </ul>

          {/* Section 17 (was 18) */}
          <h2 id="section-17">17. Governing law and venue</h2>
          <p>Before filing any claim, please email <a href="mailto:support@blockwork.online">support@blockwork.online</a> with your name, address, a description of the issue, and what you're asking for, so we can try to resolve it within 45 days.</p>
          <p>These Terms are governed by California law and applicable U.S. federal law, without regard to conflict-of-law rules. For any dispute, you and Blockwork agree to the exclusive jurisdiction of the state and federal courts located in Alameda County, California.</p>

          {/* Section 18 (was 19) */}
          <h2 id="section-18">18. General terms</h2>
          <p><strong>18.1 Changes to these Terms.</strong> We may update these Terms from time to time. If we make material changes, we'll notify you by email or in the app before they take effect and ask you to accept them. The "Last updated" date shows when these Terms last changed.</p>
          <p><strong>18.2 Electronic communications.</strong> You agree to receive notices, agreements, and other communications from us electronically (including for your Teen), and that these satisfy any legal requirement that they be in writing.</p>
          <p><strong>18.3 Assignment.</strong> You may not transfer your rights or obligations under these Terms without our written consent. We may transfer ours, for example as part of a merger or sale.</p>
          <p><strong>18.4 Severability.</strong> If any part of these Terms is found unenforceable, it will be limited only as much as necessary, and the rest will stay in effect.</p>
          <p><strong>18.5 No waiver.</strong> Our not enforcing a provision isn't a waiver of our right to enforce it later.</p>
          <p><strong>18.6 Entire agreement.</strong> These Terms, our Privacy Policy, and the policies linked in these Terms (including Pricing and Refunds & Disputes) are the entire agreement between you and Blockwork about the Platform.</p>
          <p><strong>18.7 California consumer notice.</strong> Under California Civil Code Section 1789.3, California users are entitled to the following notice: the Platform is provided by Blockwork. For questions or complaints, contact <a href="mailto:support@blockwork.online">support@blockwork.online</a>. You may also contact the Complaint Assistance Unit of the Division of Consumer Services of the California Department of Consumer Affairs in writing at 1625 North Market Blvd., Suite N 112, Sacramento, CA 95834, or by phone at (916) 445-1254 or (800) 952-5210.</p>
          <p><strong>18.8 Contact.</strong> Questions about these Terms? Email <a href="mailto:support@blockwork.online">support@blockwork.online</a>.</p>
        </div>
      </div>
      <SiteFooter compact />
    </div>
  );
}