import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ShieldCheck, FileText, Lock, DollarSign, Scale, Printer
} from "lucide-react";
import { Shell, TopBar } from "@/components/kit";

const TABS = [
  { id: "TERMS", label: "TERMS OF SERVICE", icon: FileText },
  { id: "PRIVACY", label: "PRIVACY POLICY (DPDP)", icon: Lock },
  { id: "PAYMENTS", label: "PAYMENTS & ESCROW", icon: DollarSign },
  { id: "SAFETY", label: "COMMUNITY & SAFETY", icon: ShieldCheck },
  { id: "GRIEVANCE", label: "DISCLAIMERS & JURISDICTION", icon: Scale },
];

export default function Legal() {
  const [activeTab, setActiveTab] = useState("TERMS");
  const [searchQuery, setSearchQuery] = useState("");

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
            <SectionHeader title="2. PRIVACY & DATA PROTECTION POLICY" badge="DPDP ACT, 2023 COMPLIANT" />

            <PolicyCard
              num="2.1"
              title="Data Principal Notice & Legal Basis"
              desc="WorkHop processes your personal data as a 'Data Fiduciary' under the Digital Personal Data Protection Act (DPDP Act), 2023. We collect and process only the minimum necessary personal data required to operate the hyperlocal matching platform, based upon your explicit, informed, and unambiguous consent provided during account registration and verification."
            />

            <PolicyCard
              num="2.2"
              title="Categories of Information Collected"
              desc="We collect: (a) Account Identifiers: Full Name, Email Address, 10-digit Mobile Phone Number; (b) Professional Portfolio Data: Primary skills, hourly rate, portfolio samples, external profile links, and languages spoken; (c) Approximate Geolocation: General neighborhood and locality area in Bengaluru (e.g. Koramangala, Indiranagar, HSR Layout) to calculate 5km radius proximity matching; (d) Transaction & Billing Metadata: Order IDs and payment tokens generated by Razorpay."
            />

            <PolicyCard
              num="2.3"
              title="Strict Hyperlocal Privacy Protection"
              desc="To protect user privacy and personal safety, WorkHop STRICTLY forbids the publishing of private residential door numbers, flat numbers, or exact residential addresses. Applicants and employers only see generalized locality names and computed radial distance. Direct phone numbers are encrypted and unlocked only when legitimate client authorization occurs."
            />

            <PolicyCard
              num="2.4"
              title="No Sale or Rental of Personal Data"
              desc="WorkHop NEVER sells, rents, leases, or trades user data to third-party data brokers, telemarketers, or unauthorized third parties. Personal data is shared strictly with infrastructure partners (such as Razorpay for payment processing and cloud hosting providers with end-to-end TLS 1.3 encryption) necessary for platform execution."
            />

            <PolicyCard
              num="2.5"
              title="Your Rights as a Data Principal"
              desc="Under the DPDP Act 2023, you have the right to: (a) Access a summary of your personal data; (b) Request correction of incomplete or inaccurate data; (c) Request erasure of your account and associated personal data; (d) Nominate an individual in the event of death or incapacity; and (e) Lodge a grievance with our designated Grievance Officer."
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
              desc="Our official fee structure: (a) Freelancer Onboarding & Verification Fee: ₹99 (one-time fee for verification badge & live profile hosting); (b) Employer Standard Job Posting: ₹0 (100% Free Unlimited Job Posts); (c) Optional Urgent Job Boost: ₹399 (48h top-of-feed pinned placement); (d) Daily Quota Boost: ₹149 (+5 extra applications); (e) Lead Contact Unlock: ₹199 per candidate unlock."
            />

            <PolicyCard
              num="3.3"
              title="Milestone Escrow & Payment Protection"
              desc="For custom gig agreements, Employers may fund project milestones in escrow prior to commencement of work. Escrow funds remain secured and are released to the Freelancer only upon employer verification and approval of the agreed deliverables, or upon final resolution of an escrow dispute."
            />

            <PolicyCard
              num="3.4"
              title="Refunds & Cancellation Policy"
              desc="Platform service fees (such as Onboarding fees, Lead unlocks, and Application boosts) are consumed immediately upon activation and are non-refundable. For failed, duplicate, or interrupted Razorpay transactions where service was not provisioned, refunds are automatically reconciled and credited back to the original payment source within 5 to 7 business days as per banking guidelines."
            />

            <PolicyCard
              num="3.5"
              title="Job Credit Validity"
              desc="Pre-purchased Job Post credits included in Employer bundles (Starter & Growth Packs) do not expire and remain valid indefinitely until redeemed on the platform. Credits are non-transferable and cannot be converted back into cash."
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

        {/* Tab 5: Disclaimers & Governing Jurisdiction */}
        {activeTab === "GRIEVANCE" && (
          <div className="flex flex-col gap-5 animate-in fade-in">
            <SectionHeader title="5. DISCLAIMERS, LIABILITY & GOVERNING JURISDICTION" badge="JURISDICTION" />

            <PolicyCard
              num="5.1"
              title="Warranty Disclaimer"
              desc="The WorkHop platform, services, and matching tools are provided on an 'AS IS' and 'AS AVAILABLE' basis without warranties of any kind, express or implied. WorkHop does not guarantee uninterrupted service, specific earning amounts for freelancers, or the continuous availability of qualified candidates for employers."
            />

            <PolicyCard
              num="5.2"
              title="Limitation of Aggregate Liability"
              desc="To the maximum extent permitted by applicable Indian law, WorkHop Technologies and its directors, officers, and agents shall not be liable for any indirect, punitive, incidental, special, or consequential damages. In all circumstances, WorkHop's aggregate liability arising out of or related to platform usage shall not exceed the total fees paid by you to WorkHop in the three (3) months preceding the claim."
            />

            <PolicyCard
              num="5.3"
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
