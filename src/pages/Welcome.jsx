import React from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Zap } from "lucide-react";
import { useAppUser } from "@/lib/useAppUser";
import FallingMoney from "@/components/landing/FallingMoney";
import TrustChainHero from "@/components/landing/TrustChainHero";
import TrustBar from "@/components/landing/TrustBar";
import HowItWorks from "@/components/landing/HowItWorks";
import ServicesGrid from "@/components/landing/ServicesGrid";
import MarketplacePreview from "@/components/landing/MarketplacePreview";
import WhyKickstart from "@/components/landing/WhyKickstart";
import EarningsCalculator from "@/components/landing/EarningsCalculator";
import SafetyGrid from "@/components/landing/SafetyGrid";
import FaqSection from "@/components/landing/FaqSection";
import LandingFooter from "@/components/landing/LandingFooter";

const ROLE_HOME = { TEEN: "/teen", PARENT: "/parent", BUYER: "/buyer", ADMIN: "/admin" };

function Section({ id, eyebrow, title, subtitle, children, className = "" }) {
  return (
    <section id={id} className={`relative z-10 max-w-6xl mx-auto px-6 py-20 sm:py-24 ${className}`}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.6 }}
        className="text-center mb-12"
      >
        {eyebrow && <p className="text-xs font-extrabold text-sky-400 uppercase tracking-[0.2em] mb-3">{eyebrow}</p>}
        <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">{title}</h2>
        {subtitle && <p className="text-slate-400 mt-3 max-w-xl mx-auto leading-relaxed">{subtitle}</p>}
      </motion.div>
      {children}
    </section>
  );
}

export default function Welcome() {
  const { user, loading } = useAppUser();
  const navigate = useNavigate();

  if (loading)
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-slate-950">
        <div className="w-8 h-8 border-4 border-blue-900 border-t-sky-400 rounded-full animate-spin" />
      </div>
    );

  if (user && user.app_role && user.onboarded)
    return <Navigate to={ROLE_HOME[user.app_role] || "/browse"} replace />;
  if (user) return <Navigate to="/onboarding" replace />;

  const startSignup = (role) => {
    localStorage.setItem("grind_signup_role", role);
    navigate("/register");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white overflow-x-hidden scroll-smooth">
      <div className="opacity-70"><FallingMoney /></div>

      {/* Header */}
      <header className="sticky top-0 inset-x-0 z-30 bg-slate-950/70 backdrop-blur-md border-b border-white/5 pt-[env(safe-area-inset-top)]">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-sky-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="font-extrabold text-xl tracking-tight">KickStart</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" className="text-slate-300 hover:text-white hover:bg-white/10 rounded-xl font-bold" onClick={() => navigate("/login")}>
              Log in
            </Button>
            <Button className="rounded-xl font-bold bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-500 hover:to-sky-400 hidden sm:inline-flex" onClick={() => navigate("/register")}>
              Get Started
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <TrustChainHero onGetStarted={() => navigate("/register")} onLogin={() => navigate("/login")} />

      {/* Trust bar */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 pb-8">
        <TrustBar />
      </section>

      <Section id="how-it-works" eyebrow="How it works" title="Simple for teens. Simple for neighbors." subtitle="Whichever side you're on, everything happens safely inside KickStart.">
        <HowItWorks />
      </Section>

      <Section eyebrow="Services" title="What can you offer?" subtitle="Whatever you're great at, there's a neighbor who needs it.">
        <ServicesGrid />
      </Section>

      <Section eyebrow="Marketplace" title="Real jobs, right down the street" subtitle="A live look at the kinds of jobs neighbors post every day.">
        <MarketplacePreview />
      </Section>

      <Section eyebrow="Why KickStart" title="Better than a paper route" subtitle="Everything a first job should be — without the downsides.">
        <WhyKickstart />
      </Section>

      <Section eyebrow="Earnings" title="See what you could make" subtitle="Teens earn real money at fair rates — neighbors pay a fraction of what pro services charge. Everyone wins.">
        <EarningsCalculator />
      </Section>

      <Section eyebrow="Safety" title="Safety isn't a feature. It's the foundation." subtitle="Every layer of KickStart is built to protect teens and reassure parents.">
        <SafetyGrid />
      </Section>

      <Section eyebrow="FAQ" title="Questions, answered">
        <FaqSection />
      </Section>

      {/* Final CTA */}
      <section className="relative z-10 max-w-4xl mx-auto px-6 pb-24">
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative overflow-hidden bg-gradient-to-br from-blue-700 via-blue-600 to-sky-500 rounded-3xl p-10 sm:p-14 text-center shadow-2xl shadow-blue-500/25"
        >
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Ready to Get Started?</h2>
          <p className="text-blue-100 mt-3 max-w-md mx-auto">Join your local community now — thousands of teens and neighbors are already helping each other.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-7">
            <Button
              className="h-12 px-10 rounded-xl text-base font-bold bg-white text-blue-700 hover:bg-blue-50 shadow-lg"
              onClick={() => startSignup("TEEN")}
            >
              Start Earning Today
            </Button>
            <Button
              className="h-12 px-10 rounded-xl text-base font-bold bg-blue-900/40 border border-white/30 text-white hover:bg-blue-900/60"
              onClick={() => startSignup("BUYER")}
            >
              Find Help Near You
            </Button>
          </div>
          <p className="text-xs text-blue-200/80 mt-4">Free to join · Takes less than 2 minutes</p>
        </motion.div>
      </section>

      <LandingFooter />
    </div>
  );
}