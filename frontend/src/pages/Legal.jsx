import { useState, useEffect } from "react";
import { Link, useSearchParams, useLocation } from "react-router-dom";
import {
  ShieldCheck, FileText, Lock, DollarSign, Scale, Printer, ExternalLink, ArrowRight,
  AlertTriangle, Trash2, ShieldAlert, CheckCircle2, UserCheck, Bell
} from "lucide-react";
import { Shell, TopBar } from "@/components/kit";
import { getSiteSettings } from "@/lib/clientStore";

const TABS = [
  { id: "TERMS", label: "TERMS OF SERVICE", icon: FileText },
  { id: "PRIVACY", label: "PRIVACY POLICY (DPDP)", icon: Lock },
  { id: "PAYMENTS", label: "PAYMENTS & ESCROW", icon: DollarSign },
  { id: "SAFETY", label: "COMMUNITY & SAFETY", icon: ShieldCheck },
  { id: "GRIEVANCE", label: "GRIEVANCE REDRESSAL (RULE 3(2))", icon: Scale },
  { id: "DISCLAIMERS", label: "DISCLAIMERS & JURISDICTION", icon: FileText },
];

export default function Legal({ defaultTab = "TERMS" }) {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const tabFromQuery = searchParams.get("tab");
  const isPrivacyRoute = location.pathname.includes("/privacy");

  const [activeTab, setActiveTab] = useState(() => {
    if (tabFromQuery) return tabFromQuery.toUpperCase();
    if (isPrivacyRoute) return "PRIVACY";
    return defaultTab;
  });

  useEffect(() => {
    if (tabFromQuery) setActiveTab(tabFromQuery.toUpperCase());
    else if (location.pathname.includes("/privacy")) setActiveTab("PRIVACY");
  }, [tabFromQuery, location.pathname]);

  const [searchQuery, setSearchQuery] = useState("");
  const settings = getSiteSettings();

  const handlePrint = () => {
    window.print();
  };

  return (
    <Shell>
      <TopBar
        title="LEGAL, COMPLIANCE & POLICIES"
        sub="WorkHop Technologies · Bengaluru, Karnataka, India · Effective: September 2026"
        backTestID="legal-back-btn"
        right={
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 border-2 border-ink bg-white dark:bg-[#1a1a1a] px-2.5 py-1 text-[11px] font-black tracking-wider text-ink dark:text-white hover:bg-sand transition"
            title="Print or Save PDF"
          >
            <Printer size={13} />
            <span className="hidden sm:inline">PRINT / PDF</span>
          </button>
        }
      />

      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 sm:p-6 pb-20 font-sans text-ink dark:text-white">
        
        {/* Official Header Banner */}
        <div className="border-2 border-ink bg-[#FFF3E9] dark:bg-[#1f1610] p-4 sm:p-6 shadow-[4px_4px_0px_#121212] dark:shadow-[4px_4px_0px_#000]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="flex h-12 w-12 items-center justify-center border-2 border-ink bg-brand text-white shadow-[2px_2px_0px_#121212] shrink-0">
                <Scale size={24} />
              </span>
              <div>
                <span className="inline-block bg-ink text-white dark:bg-white dark:text-black px-2 py-0.5 text-[9px] font-black uppercase tracking-widest">
                  STATUTORY COMPLIANCE NOTICE
                </span>
                <h1 className="mt-1 text-lg sm:text-2xl font-black tracking-tight text-ink dark:text-white">
                  WorkHop Platform Legal Agreement &amp; Compliance Hub
                </h1>
                <p className="mt-1 text-xs text-inkmuted dark:text-gray-300 leading-relaxed max-w-2xl">
                  Governed under the <strong>Information Technology Act, 2000</strong>, <strong>Digital Personal Data Protection (DPDP) Act, 2023</strong>, <strong>Consumer Protection (E-Commerce) Rules, 2020</strong>, and the <strong>Indian Contract Act, 1872</strong>.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-1 text-[11px] font-bold text-inkmuted dark:text-gray-400">
              <span>Jurisdiction: <strong>Bengaluru, Karnataka, India</strong></span>
              <span>Last Revised: <strong>September 16, 2026</strong></span>
              <span>Platform Version: <strong>v2.4 Production Master</strong></span>
            </div>
          </div>
        </div>

        {/* Interactive Navigation Tabs */}
        <div className="sticky top-[65px] z-30 flex flex-wrap gap-1.5 border-b-2 border-ink bg-white dark:bg-[#121212] py-2">
          {TABS.map((t) => {
            const Icon = t.icon;
            const isSel = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-1.5 border-2 border-ink px-3.5 py-2 text-[11px] font-black tracking-wider transition ${
                  isSel
                    ? "bg-ink text-brand shadow-[2px_2px_0px_#E65A1E]"
                    : "bg-white dark:bg-[#1a1a1a] text-ink dark:text-white hover:bg-sand dark:hover:bg-[#222]"
                }`}
              >
                <Icon size={14} className={isSel ? "text-brand" : "text-inkmuted dark:text-gray-400"} />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab 1: Terms of Service */}
        {activeTab === "TERMS" && (
          <div className="flex flex-col gap-5 animate-in fade-in">
            <SectionHeader title="1. TERMS OF SERVICE & USER AGREEMENT" badge="BINDING CONTRACT" />

            <PolicyCard
              num="1.1"
              title="Nature of Agreement & Acceptance"
              desc="This Terms of Service agreement ('Agreement') constitutes a legally binding electronic contract between you (whether as a 'Freelancer / Pro', 'Employer / Client', or general visitor) and WorkHop Technologies ('WorkHop', 'We', 'Us', or 'Our'), operated from Bengaluru, Karnataka, India. By accessing our platform, registering an account, or purchasing credits, you unconditionally accept and agree to be bound by these terms pursuant to Section 10A of the Information Technology Act, 2000."
            />

            <PolicyCard
              num="1.2"
              title="Intermediary Status under IT Act, 2000"
              desc="WorkHop operates solely as an online technology intermediary and marketplace facilitator under Section 79 of the Information Technology Act, 2000 and Rule 3 of the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021. WorkHop does not employ freelancers, supervise their craft, or act as an employment agency. Contracts for freelance services ('Gigs') are formed directly and exclusively between the Employer and the Freelancer."
            />

            <PolicyCard
              num="1.3"
              title="Eligibility & Account Verification"
              desc="You must be at least 18 years of age and legally competent to enter into enforceable contracts under the Indian Contract Act, 1872. To maintain network trust and hyperlocal safety, all accounts require multi-factor verification (Email OTP, 10-digit Indian Mobile Phone Number verification, and automated reCAPTCHA checks). Freelancers must pay a one-time platform verification fee of ₹99 to activate their live public portfolio in Bengaluru."
            />

            <PolicyCard
              num="1.4"
              title="Independent Contractor Relationship"
              desc="Nothing in this Agreement creates any joint venture, partnership, agency, or employer-employee relationship between WorkHop and any Freelancer. Freelancers maintain absolute discretion over their working hours, pricing, tools, and project acceptance. Freelancers are solely responsible for all applicable direct and indirect statutory tax compliances, including Goods and Services Tax (GST) and Income Tax under Indian law."
            />

            <PolicyCard
              num="1.5"
              title="Prohibited Activities & Conduct"
              desc="Users agree not to: (a) post deceptive, illegal, or fraudulent gig listings; (b) solicit off-platform payment to evade platform fees; (c) upload malicious code, scrape data, or launch automated bot attacks; (d) engage in harassment, extortion, or discriminatory behavior; (e) impersonate any individual or business entity; or (f) offer unlawful, adult, counterfeit, or prohibited goods and services under Indian Penal laws."
            />

            <PolicyCard
              num="1.6"
              title="Account Suspension, Termination & Forfeiture"
              desc="WorkHop reserves the right to immediately suspend, restrict, or permanently terminate any account that violates this Agreement, engages in fraudulent activity, or receives verified user complaints. In cases of malicious conduct, intellectual property theft, or fee circumvention, any remaining job post credits or balances shall be forfeited without refund."
            />
          </div>
        )}

        {/* Tab 2: Privacy Policy (DPDP Act 2023) */}
        {activeTab === "PRIVACY" && (
          <div className="flex flex-col gap-5 animate-in fade-in">
            <SectionHeader title="2. PRIVACY &amp; DATA PROTECTION POLICY (DPDP ACT, 2023)" badge="STATUTORY COMPLIANT" />

            {/* DPDP High-Priority Compliance Banner */}
            <div className="border-2 border-ink bg-[#FFF4ED] dark:bg-[#201510] p-4 sm:p-5 shadow-[3px_3px_0px_#121212]">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 items-center justify-center border-2 border-ink bg-brand text-white shadow-[2px_2px_0px_#121212] shrink-0">
                  <ShieldCheck size={22} />
                </span>
                <div>
                  <span className="inline-block bg-ink text-brand dark:bg-white dark:text-black px-2 py-0.5 text-[9px] font-black uppercase tracking-widest">
                    INDIA DPDP ACT, 2023 MANDATORY DISCLOSURE
                  </span>
                  <h3 className="mt-1 text-base font-black text-ink dark:text-white">
                    Data Fiduciary Transparency, User Isolation &amp; Erasure Guarantee
                  </h3>
                  <p className="mt-1 text-xs text-ink/80 dark:text-gray-300 leading-relaxed font-medium">
                    WorkHop Technologies operates as a registered <strong>Data Fiduciary</strong> in Bengaluru, Karnataka under the <strong>Digital Personal Data Protection Act, 2023</strong>. We process only the minimum necessary personal data required for hyperlocal freelance matching, guarantee complete user-to-user private data isolation, provide immediate self-service account deletion, and adhere to strict statutory incident reporting to the Data Protection Board of India.
                  </p>
                </div>
              </div>
            </div>

            {/* Point 1: What Personal Data We Collect & Specific Purpose Why */}
            <div className="border-2 border-ink bg-white dark:bg-[#1a1a1a] p-4 shadow-[2px_2px_0px_#121212]">
              <div className="flex items-center gap-2 border-b-2 border-ink pb-2 mb-3">
                <span className="bg-ink text-brand px-1.5 py-0.5 font-mono text-xs font-black">2.1</span>
                <h3 className="text-sm font-black text-ink dark:text-white uppercase">
                  Data Matrix: What Personal Data We Collect &amp; Why We Collect It (Purpose Limitation)
                </h3>
              </div>
              <p className="text-xs text-inkmuted dark:text-gray-300 mb-3 font-medium">
                Under Section 5 of the DPDP Act, every Data Principal is entitled to clear notice of what personal data is processed and the exact purpose for each category:
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="border border-ink/20 p-3 bg-sand/30 dark:bg-[#222]">
                  <p className="font-black text-brand text-xs">📱 10-Digit Mobile Phone Number</p>
                  <p className="text-[11px] text-inkmuted dark:text-gray-300 mt-1">
                    <strong>Why Collected:</strong> Authentication via One-Time Password (OTP), urgent milestone dispatch alerts, and secure gated contact exchange. Phone numbers remain encrypted and masked until mutual hire or explicit employer unlock.
                  </p>
                </div>

                <div className="border border-ink/20 p-3 bg-sand/30 dark:bg-[#222]">
                  <p className="font-black text-brand text-xs">✉️ Email Address</p>
                  <p className="text-[11px] text-inkmuted dark:text-gray-300 mt-1">
                    <strong>Why Collected:</strong> Secure login session management, GST-compliant tax invoices, payment receipts, external message alerts, and mandatory statutory breach notifications.
                  </p>
                </div>

                <div className="border border-ink/20 p-3 bg-sand/30 dark:bg-[#222]">
                  <p className="font-black text-brand text-xs">👤 Full Name &amp; Public Display Handle</p>
                  <p className="text-[11px] text-inkmuted dark:text-gray-300 mt-1">
                    <strong>Why Collected:</strong> Legal contract execution under the Indian Contract Act, 1872, verified profile identity, and platform trust badging.
                  </p>
                </div>

                <div className="border border-ink/20 p-3 bg-sand/30 dark:bg-[#222]">
                  <p className="font-black text-brand text-xs">📍 Approximate Bengaluru Neighborhood (Area)</p>
                  <p className="text-[11px] text-inkmuted dark:text-gray-300 mt-1">
                    <strong>Why Collected:</strong> Proximity matching within a 5km radius (e.g., Koramangala, Indiranagar). <em>WorkHop strictly NEVER tracks continuous live GPS locations or records private residential door/flat numbers.</em>
                  </p>
                </div>

                <div className="border border-ink/20 p-3 bg-sand/30 dark:bg-[#222]">
                  <p className="font-black text-brand text-xs">💼 Skills, Bio &amp; Portfolio Deliverables</p>
                  <p className="text-[11px] text-inkmuted dark:text-gray-300 mt-1">
                    <strong>Why Collected:</strong> Hyperlocal talent discovery, project proposal review, and proposal leaderboard ranking. Freelancers control and can edit these details at any time.
                  </p>
                </div>

                <div className="border border-ink/20 p-3 bg-sand/30 dark:bg-[#222]">
                  <p className="font-black text-brand text-xs">💳 Payment &amp; Escrow Tokens (Razorpay)</p>
                  <p className="text-[11px] text-inkmuted dark:text-gray-300 mt-1">
                    <strong>Why Collected:</strong> Processing milestone escrow funds and bidding packs via RBI-authorized Payment Aggregator Razorpay. WorkHop never stores card numbers, CVVs, or UPI PINs (PCI-DSS Level 1 compliant).
                  </p>
                </div>
              </div>
            </div>

            {/* Point 2: Data Security & User-to-User Isolation */}
            <PolicyCard
              num="2.2"
              title="Data Security & Strict Multi-Tenant Isolation (Anti-IDOR)"
              desc="WorkHop enforces strict data isolation so that one user cannot access, view, or modify another user's private data: (a) In-app chats, messages, and proposals are restricted exclusively to authorized contract participants and administrators; (b) Direct phone numbers and emails are automatically shielded in chat until hire via automated security filters; (c) All endpoints enforce session-token verification preventing Insecure Direct Object References (IDOR); (d) All database communication is encrypted using TLS 1.3 in transit and AES-256 at rest."
            />

            {/* Point 3: Data Deletion & Right to Erasure */}
            <div className="border-2 border-ink bg-white dark:bg-[#1a1a1a] p-4 shadow-[2px_2px_0px_#121212]">
              <div className="flex items-center justify-between border-b-2 border-ink pb-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="bg-ink text-brand px-1.5 py-0.5 font-mono text-xs font-black">2.3</span>
                  <h3 className="text-sm font-black text-ink dark:text-white uppercase">
                    Right to Erasure &amp; Self-Service Data Deletion (DPDP Section 12)
                  </h3>
                </div>
                <span className="border border-danger text-danger px-1.5 py-0.5 text-[9px] font-black uppercase">
                  RIGHT TO ERASURE
                </span>
              </div>
              <p className="text-xs text-ink/90 dark:text-gray-300 leading-relaxed font-medium">
                Under Section 12(3) of the DPDP Act 2023, you possess the unequivocal right to have your personal data permanently erased from our systems. WorkHop empowers you with a direct in-app self-service deletion mechanism:
              </p>
              <div className="mt-3 bg-sand/50 dark:bg-[#222] border border-ink/20 p-3 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <p className="font-black text-ink dark:text-white">Instant Account &amp; Personal Data Deletion Tool</p>
                  <p className="text-[11px] text-inkmuted dark:text-gray-400 mt-0.5">
                    Permanently purges your profile, contact details, sessions, portfolio, and push subscriptions.
                  </p>
                </div>
                <Link
                  to="/profile"
                  className="flex items-center gap-1.5 border-2 border-danger bg-danger text-white px-3 py-1.5 text-xs font-black tracking-wider uppercase shadow-[2px_2px_0px_#121212] hover:bg-red-700 transition shrink-0"
                >
                  <Trash2 size={13} />
                  <span>GO TO PROFILE SETTINGS</span>
                </Link>
              </div>
              <p className="mt-2 text-[11px] text-inkmuted dark:text-gray-400">
                Alternatively, Data Principals may request account erasure by emailing our Grievance Officer at <a href="mailto:grievance@workhop.in" className="text-brand underline font-bold">grievance@workhop.in</a> or submitting a ticket at <Link to="/grievance" className="text-brand underline font-bold">/grievance</Link>. All erasure requests are fully executed within 72 hours.
              </p>
            </div>

            {/* Point 4: Data Breaches & Incident Notification Protocol */}
            <div className="border-2 border-ink bg-white dark:bg-[#1a1a1a] p-4 shadow-[2px_2px_0px_#121212]">
              <div className="flex items-center justify-between border-b-2 border-ink pb-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="bg-ink text-brand px-1.5 py-0.5 font-mono text-xs font-black">2.4</span>
                  <h3 className="text-sm font-black text-ink dark:text-white uppercase">
                    Personal Data Breach &amp; Incident Notification Protocol (DPDP Section 8(6))
                  </h3>
                </div>
                <span className="border border-brand text-brand px-1.5 py-0.5 text-[9px] font-black uppercase">
                  INCIDENT RESPONSE
                </span>
              </div>
              <p className="text-xs text-ink/90 dark:text-gray-300 leading-relaxed font-medium">
                In strict accordance with Section 8(6) of the Digital Personal Data Protection Act, 2023, WorkHop Technologies maintains an active Data Breach Response Framework. In the unforeseen event of any security incident compromising personal data:
              </p>
              <ul className="list-disc list-inside mt-2 text-xs text-ink/90 dark:text-gray-300 space-y-1 font-medium pl-2">
                <li>
                  <strong>Intimation to the Data Protection Board of India (DPBI):</strong> WorkHop will formally notify the Board without undue delay, specifying the nature, scope, and technical mitigation of the breach.
                </li>
                <li>
                  <strong>Direct Notification to Affected Users:</strong> Each affected Data Principal will be immediately alerted via registered email and SMS, detailing: (i) categories of data impacted, (ii) potential risks, (iii) technical remediation undertaken by WorkHop, and (iv) recommended precautions for the user (such as credential updates).
                </li>
                <li>
                  <strong>Dedicated 24/7 Security Hotline:</strong> Security researchers or users discovering potential vulnerabilities must promptly email <a href="mailto:security@work-hop.com" className="text-brand underline font-bold">security@work-hop.com</a> or <a href="mailto:grievance@workhop.in" className="text-brand underline font-bold">grievance@workhop.in</a>.
                </li>
              </ul>
            </div>

            <PolicyCard
              num="2.5"
              title="Zero Sale, Lease, or Rental of Personal Data"
              desc="WorkHop NEVER sells, leases, trades, or licenses user personal data to third-party data brokers, telemarketers, or advertising networks under any circumstances. Personal data is shared strictly with essential infrastructure processors (e.g. Razorpay for payments) necessary to fulfill requested transactions."
            />

            <PolicyCard
              num="2.6"
              title="Consent Withdrawal & Statutory Retention Limits"
              desc="You maintain the right to withdraw your consent at any time without punitive consequences. Upon consent withdrawal or account deletion, your personal data is expunged from active platform servers, except where retention is strictly mandated by applicable financial statutes (such as Indian Goods and Services Tax Act mandates requiring commercial tax invoices to be retained for statutory audits)."
            />
          </div>
        )}

        {/* Tab 3: Payments & Escrow Policy */}
        {activeTab === "PAYMENTS" && (
          <div className="flex flex-col gap-5 animate-in fade-in">
            <SectionHeader title="3. PAYMENTS, ESCROW & REFUND POLICY" badge="RBI & RAZORPAY COMPLIANT" />

            <PolicyCard
              num="3.1"
              title="Authorized Payment Gateway"
              desc="All platform monetary transactions are processed securely through Razorpay Software Private Limited, an RBI-authorized Payment Aggregator compliant with PCI-DSS Level 1 security standards. WorkHop does not store full credit/debit card numbers, CVV codes, or net banking passwords."
            />

            <PolicyCard
              num="3.2"
              title="Platform Fees & Commercial Schedule"
              desc="Our official platform commercial schedule: (a) Freelancer Bidding Hops: Fixed transparent rate of 1 Hop = ₹15 INR. Hops packs are available in standard top-up tiers: 10 Hops (₹150), 20 Hops (₹300), 40 Hops (₹600 · Most Popular), 60 Hops (₹900), 80 Hops (₹1,200), and 100 Hops (₹1,500). Gigs consume between 2 to 16 Hops per proposal based upon project budget tiers. WorkHop charges 0% platform commission on freelance contract earnings; (b) Monthly Freelancer Passes: Optional subscription tiers offering discounted effective rates: Starter Hops Pass at ₹399/month (30 Hops/mo), Freelancer Plus Pass at ₹999/month (80 Hops/mo with competitor bid visibility & gold badge), and Power Freelancer Pass at ₹1,899/month (160 Hops/mo with unlimited rollover & 3 free proposal boosts); (c) Freelancer Verification Fee: ₹99 (one-time fee for digital identity tethering, anti-fraud screening, and verified public profile hosting); (d) Employer Standard Job Posting: ₹0 (100% Free Unlimited Gig Postings); (e) Employer Urgent 48h Gig Boost: ₹399 per post add-on (pinned top-of-feed placement with glowing radar badge); (f) Pro Candidate Contact Unlock: ₹199 per candidate unmasked profile unlock."
            />

            <PolicyCard
              num="3.3"
              title="Milestone Escrow & Payment Protection"
              desc="For custom gig agreements, Employers may fund project milestones in escrow prior to commencement of work. Escrow funds remain secured and are released to the Freelancer only upon employer verification and approval of the agreed deliverables, or upon final resolution of an escrow dispute."
            />

            <PolicyCard
              num="3.4"
              title="Refunds & Cancellation Policy"
              desc="Platform service fees (such as Onboarding fees, Bidding Hops packs, Monthly passes, Lead unlocks, and Urgent job boosts) are credited or provisioned immediately upon successful transaction. Unused Hops do not expire and roll over continuously. For failed, duplicate, or interrupted Razorpay transactions where Hops or services were not provisioned, refunds are automatically reconciled and credited back to the original payment source within 5 to 7 business days as per banking guidelines."
            />

            <PolicyCard
              num="3.5"
              title="Bidding Hops & Credit Validity (Lifetime Rollover)"
              desc="Pre-purchased Bidding Hops and Employer posting privileges do not expire and remain valid indefinitely until redeemed on the platform. All unused Hops roll over across billing cycles automatically. Hops are non-transferable between separate user accounts and cannot be redeemed for fiat cash, but remain permanently usable for gig proposals, proposal boosts, and platform bidding."
            />
          </div>
        )}

        {/* Tab 4: Community Safety & Content Guidelines */}
        {activeTab === "SAFETY" && (
          <div className="flex flex-col gap-5 animate-in fade-in">
            <SectionHeader title="4. COMMUNITY SAFETY & CONTENT GUIDELINES" badge="ZERO TOLERANCE" />

            <PolicyCard
              num="4.1"
              title="Content Moderation & Automated Filtering"
              desc="All gig listings, freelancer bio descriptions, and support tickets pass through real-time automated safety scanners and keyword filters. Listings containing promotional spam, multi-level marketing (MLM), unregistered financial schemes, or suspicious third-party links are automatically blocked."
            />

            <PolicyCard
              num="4.2"
              title="Prohibited Services & Gigs"
              desc="The following are strictly banned on WorkHop: (a) Academic cheating or unauthorized impersonation; (b) Sale of regulated substances, pharmaceuticals, or weapons; (c) Adult or sexually explicit content; (d) Hacking, malware, or surveillance services; (e) Unregistered financial, cryptocurrency, or pyramid investment schemes; (f) Hate speech, harassment, or defamation."
            />

            <PolicyCard
              num="4.3"
              title="Review & Rating Authenticity"
              desc="Client reviews and star ratings must reflect legitimate, completed freelance collaborations conducted through WorkHop. Coercing positive reviews, posting fake testimonials, review brigading, or submitting fraudulent feedback is strictly prohibited and results in immediate account disqualification."
            />

            <PolicyCard
              num="4.4"
              title="Direct Communication & Safety Protocols"
              desc="Users must maintain professional, respectful communication within in-app chats. Users are cautioned never to wire money outside the verified milestone system or share financial credentials (such as UPI PINs or OTPs) with any party."
            />
          </div>
        )}

        {/* Tab 5: Grievance Redressal Mechanism & Officer Appointment */}
        {activeTab === "GRIEVANCE" && (
          <div className="flex flex-col gap-5 animate-in fade-in">
            <SectionHeader title="5. STATUTORY GRIEVANCE REDRESSAL MECHANISM (IT RULES 2021 & DPDP ACT 2023)" badge="RULE 3(2) COMPLIANT" />

            <div className="border-2 border-ink bg-[#FFF4ED] p-4 sm:p-5 shadow-[3px_3px_0px_#121212]">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <span className="font-mono text-[9px] font-black text-brand uppercase">MANDATORY STATUTORY DESIGNATION</span>
                  <h3 className="text-base font-black text-ink mt-0.5">
                    Resident Grievance Officer &amp; Nodal Contact
                  </h3>
                  <p className="text-xs text-ink/80 mt-1 max-w-2xl font-medium">
                    In compliance with Rule 3(2) of the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021 and the DPDP Act 2023, WorkHop Technologies has appointed a Resident Grievance Officer in India.
                  </p>
                </div>
                <Link
                  to="/grievance"
                  className="flex items-center gap-1.5 border-2 border-ink bg-brand px-3 py-2 text-xs font-black uppercase text-white shadow-[2px_2px_0px_#121212] hover:bg-ink transition shrink-0"
                >
                  <span>GRIEVANCE PORTAL &amp; FORM</span>
                  <ArrowRight size={14} />
                </Link>
              </div>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs border-t border-ink/10 pt-3">
                <div className="border border-ink/20 bg-white p-3">
                  <span className="text-[10px] font-black uppercase text-inkmuted">Nodal / Grievance Officer</span>
                  <p className="font-black text-sm text-ink">{settings.grievance_officer_name || "Alia Mansoor"}</p>
                  <p className="text-[11px] font-bold text-brand">{settings.grievance_officer_designation || "Nodal officer"}</p>
                </div>
                <div className="border border-ink/20 bg-white p-3">
                  <span className="text-[10px] font-black uppercase text-inkmuted">Official Contact &amp; Channels</span>
                  <p className="font-bold text-ink">🛠️ Complaints: <a href="mailto:help@work-hop.com" className="text-brand underline">help@work-hop.com</a></p>
                  <p className="font-bold text-ink">✉️ Main Email: <a href="mailto:connect@work-hop.com" className="underline">connect@work-hop.com</a></p>
                  <p className="font-bold text-ink">📧 Statutory Grievance: {settings.grievance_officer_email || "grievance@workhop.in"}</p>
                  <p className="font-bold text-ink">📞 Helpline: {settings.grievance_officer_phone || "+91 91 80530 827"}</p>
                </div>
                <div className="border border-ink/20 bg-white p-3 sm:col-span-2">
                  <span className="text-[10px] font-black uppercase text-inkmuted">Physical Registered Address</span>
                  <p className="font-medium text-ink text-[11px]">{settings.grievance_officer_address || "Smart Plaza, Coles Road, Frazer Town, Bangalore - 560005"}</p>
                  <p className="mt-1 text-[10px] text-inkmuted">Working Hours: {settings.grievance_working_hours || "Mon-Fri 10 AM - 6 PM IST"}</p>
                </div>
              </div>
            </div>

            <PolicyCard
              num="5.1"
              title="Statutory SLAs for Grievance Handling"
              desc={`All grievances filed via our dedicated portal (/grievance) or emailed directly to ${settings.grievance_officer_email || "grievance@workhop.in"} are formally acknowledged within ${settings.grievance_ack_hours || 48} hours with an assigned ticket token, and investigated and disposed of within ${settings.grievance_resolution_days || 30} calendar days from receipt.`}
            />

            <PolicyCard
              num="5.2"
              title="Appeals to Grievance Appellate Committee (GAC)"
              desc="Any user aggrieved by a decision of the Resident Grievance Officer may prefer an appeal before the central Grievance Appellate Committee (GAC) at gac.gov.in within thirty (30) days of receiving such decision."
            />
          </div>
        )}

        {/* Tab 6: Disclaimers & Governing Jurisdiction */}
        {activeTab === "DISCLAIMERS" && (
          <div className="flex flex-col gap-5 animate-in fade-in">
            <SectionHeader title="6. DISCLAIMERS, LIABILITY & GOVERNING JURISDICTION" badge="JURISDICTION" />

            <PolicyCard
              num="6.1"
              title="Warranty Disclaimer"
              desc="The WorkHop platform, services, and matching tools are provided on an 'AS IS' and 'AS AVAILABLE' basis without warranties of any kind, express or implied. WorkHop does not guarantee uninterrupted service, specific earning amounts for freelancers, or the continuous availability of qualified candidates for employers."
            />

            <PolicyCard
              num="6.2"
              title="Limitation of Aggregate Liability"
              desc="To the maximum extent permitted by applicable Indian law, WorkHop Technologies and its directors, officers, and agents shall not be liable for any indirect, punitive, incidental, special, or consequential damages. In all circumstances, WorkHop's aggregate liability arising out of or related to platform usage shall not exceed the total fees paid by you to WorkHop in the three (3) months preceding the claim."
            />

            <PolicyCard
              num="6.3"
              title="Governing Law & Exclusive Jurisdiction"
              desc="This Agreement, platform transactions, and any dispute or claim arising out of them shall be governed by and construed in accordance with the substantive laws of the Republic of India. The courts situated in Bengaluru, Karnataka, India shall have exclusive legal jurisdiction to adjudicate any matters arising under this Agreement."
            />
          </div>
        )}

        {/* Bottom Legal Notice */}
        <div className="border-t-2 border-ink pt-6 text-center text-xs text-inkmuted dark:text-gray-400">
          <p className="font-bold">
            © 2026 WorkHop Technologies. All rights reserved. Registered in Bengaluru, Karnataka, Republic of India 🇮🇳
          </p>
          <p className="mt-1 text-[11px]">
            WorkHop operates in compliance with all relevant digital intermediary, consumer protection, and privacy mandates.
          </p>
        </div>

      </div>
    </Shell>
  );
}

function SectionHeader({ title, badge }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-ink pb-2">
      <h2 className="text-base sm:text-lg font-black tracking-wide text-ink dark:text-white">
        {title}
      </h2>
      {badge && (
        <span className="border border-ink bg-brand px-2 py-0.5 text-[9px] font-black tracking-widest text-white uppercase shadow-[1px_1px_0px_#121212]">
          {badge}
        </span>
      )}
    </div>
  );
}

function PolicyCard({ num, title, desc }) {
  return (
    <div className="border-2 border-ink bg-white dark:bg-[#1a1a1a] p-4 shadow-[2px_2px_0px_#121212] dark:shadow-[2px_2px_0px_#000] transition hover:translate-x-0.5 hover:shadow-[1px_1px_0px_#121212]">
      <div className="flex items-start gap-2">
        <span className="inline-block shrink-0 bg-ink dark:bg-[#333] text-brand dark:text-[#F06B2E] px-1.5 py-0.5 font-mono text-xs font-black">
          {num}
        </span>
        <h3 className="text-sm font-black text-ink dark:text-white">
          {title}
        </h3>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-ink/90 dark:text-gray-300 pl-7">
        {desc}
      </p>
    </div>
  );
}
