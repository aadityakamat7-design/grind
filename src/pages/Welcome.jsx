import React, { useRef } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { motion, useScroll, useTransform } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Zap, ChevronDown, ShieldCheck } from "lucide-react";
import { useAppUser } from "@/lib/useAppUser";
import CoinSpiral from "@/components/landing/CoinSpiral";
import TrustPoints from "@/components/landing/TrustPoints";

const ROLE_HOME = { TEEN: "/teen", PARENT: "/parent", BUYER: "/buyer", ADMIN: "/admin" };

const STEPS = [
  { n: "01", title: "Teens list their skills", desc: "Lawn care, tutoring, pet sitting, tech help — whatever they're great at." },
  { n: "02", title: "Parents approve everything", desc: "A parent links to the account and signs off on every single booking." },
  { n: "03", title: "Neighbors book & pay safely", desc: "Payment is held in escrow and released only when the job is done." },
];

export default function Welcome() {
  const { user, loading } = useAppUser();
  const navigate = useNavigate();
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 120]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

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
    <div className="min-h-screen bg-slate-950 text-white overflow-x-hidden">
      {/* Header */}
      <header className="absolute top-0 inset-x-0 z-20 pt-[env(safe-area-inset-top)]">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-sky-400 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="font-extrabold text-xl tracking-tight">Kickstart</span>
          </div>
          <Button
            variant="ghost"
            className="text-slate-300 hover:text-white hover:bg-white/10 rounded-xl font-bold"
            onClick={() => navigate("/login")}
          >
            Log in
          </Button>
        </div>
      </header>

      {/* Hero with scroll-driven coin spiral */}
      <section ref={heroRef} className="relative min-h-screen flex items-center justify-center">
        <div className="absolute inset-0 opacity-60 pointer-events-none">
          <CoinSpiral />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/40 via-transparent to-slate-950 pointer-events-none" />

        <motion.div
          style={{ y: heroY, opacity: heroOpacity }}
          className="relative z-10 max-w-2xl mx-auto px-6 text-center"
        >
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
            className="text-5xl sm:text-6xl font-extrabold tracking-tight leading-[1.05]"
          >
            Teens earn.
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-blue-500">
              Parents approve.
            </span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="text-slate-400 text-lg mt-6 leading-relaxed max-w-lg mx-auto"
          >
            The safe way for neighborhood teens to earn real money doing local jobs — with a parent watching over every step.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-3 justify-center mt-9"
          >
            <Button
              className="h-13 px-8 py-3.5 rounded-xl text-base font-bold bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-500 hover:to-sky-400 shadow-lg shadow-blue-500/30"
              onClick={() => navigate("/register")}
            >
              Get started — it's free
            </Button>
            <Button
              variant="outline"
              className="h-13 px-8 py-3.5 rounded-xl text-base font-bold bg-transparent border-white/20 text-white hover:bg-white/10 hover:text-white"
              onClick={() => navigate("/login")}
            >
              Log in
            </Button>
          </motion.div>
        </motion.div>

        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 text-slate-500"
        >
          <ChevronDown className="w-6 h-6" />
        </motion.div>
      </section>

      {/* Trust points */}
      <section className="relative z-10 max-w-4xl mx-auto px-6 py-24">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-3xl sm:text-4xl font-extrabold text-center mb-12"
        >
          Built for trust, <span className="text-sky-400">first</span>.
        </motion.h2>
        <TrustPoints />
      </section>

      {/* How it works */}
      <section className="relative z-10 max-w-4xl mx-auto px-6 pb-24">
        <div className="space-y-6">
          {STEPS.map((s, i) => (
            <motion.div
              key={s.n}
              initial={{ opacity: 0, x: i % 2 ? 40 : -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.6 }}
              className="flex items-start gap-5 bg-white/5 border border-white/10 rounded-2xl p-6"
            >
              <span className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-b from-sky-400 to-blue-600">{s.n}</span>
              <div>
                <h3 className="font-bold text-lg">{s.title}</h3>
                <p className="text-slate-400 text-sm mt-1">{s.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative z-10 max-w-2xl mx-auto px-6 pb-24 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="bg-gradient-to-br from-blue-600 to-sky-500 rounded-3xl p-10 shadow-2xl shadow-blue-500/20"
        >
          <h2 className="text-3xl font-extrabold">Ready to kickstart?</h2>
          <p className="text-blue-100 mt-3">Teens 13–17 need a parent to activate their account.</p>
          <Button
            className="mt-6 h-12 px-10 rounded-xl text-base font-bold bg-white text-blue-700 hover:bg-blue-50"
            onClick={() => navigate("/register")}
          >
            Get started
          </Button>
        </motion.div>
        <p className="text-slate-600 text-xs mt-10">© {new Date().getFullYear()} Kickstart · Local jobs for teens, parent-approved</p>
      </section>
    </div>
  );
}