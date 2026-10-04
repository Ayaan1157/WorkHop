import React from "react";
import { TestimonialsColumn } from "@/components/ui/testimonials-columns-1";
import { motion } from "motion/react";
import { Star } from "lucide-react";

export const testimonials = [
  {
    text: "WorkHop revolutionized our hiring in Bengaluru. Found a senior Next.js developer in Indiranagar within 2 hours. Escrow release was instant upon milestone sign-off.",
    image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    name: "Briana Patton",
    role: "Operations Manager • UrbanKrafts",
  },
  {
    text: "Zero platform commission and direct UPI payment options are a game changer. We revamped our entire specialty cafe branding with a local Koramangala designer.",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    name: "Bilal Ahmed",
    role: "Founder • BrewBlock Roasters",
  },
  {
    text: "Hyperlocal 5km radius matching is unmatched. We had a quick in-person kickoff in HSR Layout and delivered the villa 3D blueprints days ahead of schedule.",
    image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
    name: "Saman Malik",
    role: "Principal Architect • StudioHSR",
  },
  {
    text: "The deal tracker and milestone transparency keep both client and pro 100% aligned. Highly recommend for any Bangalore startup looking for urgent talent.",
    image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
    name: "Omar Raza",
    role: "CEO • FinPulse AI",
  },
  {
    text: "Robust Aadhaar verification, real local portfolios, and direct phone contact after hire. It streamlined our contractor sourcing completely.",
    image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80",
    name: "Zainab Hussain",
    role: "Product Lead • DesignGrid",
  },
  {
    text: "Smooth onboarding and instant chat. We settled ₹32,000 for our AutoCAD drafting gig directly with zero platform deductions eating into earnings.",
    image: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80",
    name: "Aliza Khan",
    role: "Business Analyst • QuickScale",
  },
  {
    text: "WorkHop delivered exactly what Bangalore gig workers needed: no 20% platform cut, fast hyperlocal matching, and trustworthy verified reviews.",
    image: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80",
    name: "Farhan Siddiqui",
    role: "Marketing Director • Apex Media",
  },
  {
    text: "They delivered a solution that exceeded expectations. We found an incredible videographer right here in Whitefield for our product launch video.",
    image: "https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=150&auto=format&fit=crop&q=80",
    name: "Sana Sheikh",
    role: "Creative Producer • VisualWave",
  },
  {
    text: "Using WorkHop, our local conversions and hiring turnaround improved tenfold. The chat deal tracker gave our founders full peace of mind.",
    image: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80",
    name: "Hassan Ali",
    role: "Co-Founder • CloudNine Commerce",
  },
];

const firstColumn = testimonials.slice(0, 3);
const secondColumn = testimonials.slice(3, 6);
const thirdColumn = testimonials.slice(6, 9);

export const Testimonials = () => {
  return (
    <section className="bg-background my-16 sm:my-20 relative">
      <div className="container z-10 mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          viewport={{ once: true }}
          className="flex flex-col items-center justify-center max-w-[540px] mx-auto"
        >
          <div className="flex justify-center">
            <div className="border-2 border-ink dark:border-white/20 py-1 px-4 rounded-lg bg-sand dark:bg-zinc-800 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-[2px_2px_0px_#121212]">
              <Star size={13} fill="#E65A1E" className="text-brand" />
              <span>TESTIMONIALS</span>
            </div>
          </div>

          <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-black tracking-tighter mt-5 text-center text-ink dark:text-white">
            What our users say
          </h2>
          <p className="text-center mt-3 text-xs sm:text-sm font-semibold opacity-75 text-inkmuted dark:text-stone-300">
            See what Bengaluru founders, clients, and verified freelancers have to say about WorkHop.
          </p>
        </motion.div>

        <div className="flex justify-center gap-6 mt-10 [mask-image:linear-gradient(to_bottom,transparent,black_25%,black_75%,transparent)] max-h-[740px] overflow-hidden">
          <TestimonialsColumn testimonials={firstColumn} duration={15} />
          <TestimonialsColumn testimonials={secondColumn} className="hidden md:block" duration={19} />
          <TestimonialsColumn testimonials={thirdColumn} className="hidden lg:block" duration={17} />
        </div>
      </div>
    </section>
  );
};

export default { Testimonials };
