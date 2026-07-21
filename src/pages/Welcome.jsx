import React from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Zap, ShieldCheck } from "lucide-react";
import { useAppUser } from "@/lib/useAppUser";
import FallingMoney from "@/components/landing/FallingMoney";
import PhoneMockup from "@/components/landing/PhoneMockup";
import TrustBar from "@/components/landing/TrustBar";
import HowItWorks from "@/components/landing/HowItWorks";
import ServicesGrid from "@/components/landing/ServicesGrid";
import MarketplacePreview from "@/components/landing/MarketplacePreview";
import WhyKickstart from "@/components/landing/WhyKickstart";
import EarningsCalculator from "@/components/landing/EarningsCalculator";
import SafetyGrid from "@/components/landing/SafetyGrid";
import Testimonials from "@/components/landing/Testimonials";
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
      <section className="relative z-10 max-w-6xl mx-auto px-6 pt-16 sm:pt-24 pb-20">
        <div className="grid md:grid-cols-2 gap-14 items-center">
          <div className="text-center md:text-left">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 text-xs font-bold text-sky-300 mb-6"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Parent-approved · ID-verified · Escrow-protected
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="text-5xl sm:text-6xl font-extrabold tracking-tight leading-[1.04]"
            >
              Turn Skills
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-blue-500">Into Cash.</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="text-slate-400 text-lg mt-6 leading-relaxed max-w-md mx-auto md:mx-0"
            >
              KickStart helps teens earn money by offering services to neighbors — from lawn mowing and tutoring to dog walking, tech help, babysitting, and more.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-3 justify-center md:justify-start mt-9"
            >
              <Button
                className="h-12 px-8 rounded-xl text-base font-bold bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-500 hover:to-sky-400 shadow-lg shadow-blue-500/30"
                onClick={() => navigate("/register")}
              >
                Get Started
              </Button>
              <Button
                variant="outline"
                className="h-12 px-8 rounded-xl text-base font-bold bg-transparent border-white/20 text-white hover:bg-white/10 hover:text-white"
                onClick={() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })}
              >
                See How It Works
              </Button>
            </motion.div>
          </div>
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="relative"
          >
            <div className="absolute -inset-10 bg-blue-600/20 blur-[100px] rounded-full pointer-events-none" />
            <PhoneMockup />
          </motion.div>
        </div>
      </section>

      {/* Trust bar */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 pb-8">
        <TrustBar />
      </section>

      <Section id="how-it-works" eyebrow="How it works" title="Three steps to your first paycheck" subtitle="From profile to payout — everything happens safely inside KickStart.">
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

      <Section eyebrow="Earnings" title="See what you could make" subtitle="Pick a service, set your pace, watch it add up.">
        <EarningsCalculator />
      </Section>

      <Section eyebrow="Safety" title="Safety isn't a feature. It's the foundation." subtitle="Every layer of KickStart is built to protect teens and reassure parents.">
        <SafetyGrid />
      </Section>

      <Section eyebrow="Testimonials" title="Loved by teens, parents & neighbors">
        <Testimonials />
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
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Ready to Start Earning?</h2>
          <p className="text-blue-100 mt-3 max-w-md mx-auto">Join thousands of teens helping their communities while making money.</p>
          <Button
            className="mt-7 h-12 px-10 rounded-xl text-base font-bold bg-white text-blue-700 hover:bg-blue-50 shadow-lg"
            onClick={() => navigate("/register")}
          >
            Get Started
          </Button>
        </motion.div>
      </section>

      <LandingFooter />
    </div>
  );
}