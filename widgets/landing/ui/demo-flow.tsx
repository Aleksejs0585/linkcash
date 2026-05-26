"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const STEPS = [
  {
    label: "Send",
    screen: (
      <div className="flex flex-col gap-3 p-4">
        <div className="text-center">
          <p className="text-xs font-semibold text-white/40 uppercase tracking-widest">LinkCash</p>
          <p className="mt-1 text-sm font-bold text-white">Send crypto like a message</p>
        </div>
        <div className="rounded-xl bg-white/6 border border-white/8 p-3 space-y-1">
          <p className="text-[10px] text-white/40 uppercase tracking-widest">Your name</p>
          <p className="text-sm text-white/90">Alex K.</p>
        </div>
        <div className="rounded-xl bg-white/6 border border-white/8 p-3 space-y-1">
          <p className="text-[10px] text-white/40 uppercase tracking-widest">Message</p>
          <p className="text-sm text-white/90">Happy birthday! 🎉</p>
        </div>
        <div className="rounded-xl bg-white/6 border border-white/8 p-3 space-y-1">
          <p className="text-[10px] text-white/40 uppercase tracking-widest">Amount</p>
          <p className="text-lg font-bold text-white">$10 <span className="text-sm font-normal text-white/50">USDC</span></p>
        </div>
        <div className="mt-1 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-500 p-3 text-center text-sm font-semibold text-white">
          Create gift →
        </div>
      </div>
    ),
  },
  {
    label: "Share",
    screen: (
      <div className="flex flex-col items-center gap-3 p-4">
        <div className="text-center">
          <p className="text-xs font-semibold text-white/40 uppercase tracking-widest">Gift funded ✓</p>
          <p className="mt-1 text-sm font-bold text-white">Share the link</p>
        </div>
        <div className="w-24 h-24 rounded-xl bg-white p-2 flex items-center justify-center">
          <svg viewBox="0 0 21 21" className="w-full h-full" shapeRendering="crispEdges">
            <rect x="0" y="0" width="7" height="7" fill="black"/>
            <rect x="1" y="1" width="5" height="5" fill="white"/>
            <rect x="2" y="2" width="3" height="3" fill="black"/>
            <rect x="14" y="0" width="7" height="7" fill="black"/>
            <rect x="15" y="1" width="5" height="5" fill="white"/>
            <rect x="16" y="2" width="3" height="3" fill="black"/>
            <rect x="0" y="14" width="7" height="7" fill="black"/>
            <rect x="1" y="15" width="5" height="5" fill="white"/>
            <rect x="2" y="16" width="3" height="3" fill="black"/>
            {[
              [8,0],[10,0],[12,0],[9,1],[11,1],[8,2],[12,2],[9,3],[10,3],
              [8,4],[11,4],[9,5],[12,5],[8,6],[10,6],[11,6],
              [0,8],[2,8],[4,8],[6,8],[8,8],[10,8],[12,8],[14,8],[16,8],[18,8],[20,8],
              [1,9],[5,9],[9,9],[13,9],[17,9],
              [0,10],[3,10],[6,10],[8,10],[11,10],[14,10],[17,10],[20,10],
              [2,11],[4,11],[9,11],[12,11],[15,11],[18,11],
              [0,12],[5,12],[8,12],[10,12],[13,12],[16,12],[19,12],
              [8,14],[10,14],[12,14],[15,14],[17,14],[20,14],
              [9,15],[11,15],[14,15],[18,15],
              [8,16],[12,16],[16,16],[19,16],
              [10,17],[13,17],[15,17],[20,17],
              [8,18],[9,18],[11,18],[14,18],[17,18],
              [10,19],[12,19],[16,19],[19,19],
              [8,20],[11,20],[13,20],[15,20],[18,20],[20,20],
            ].map(([x, y]) => (
              <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill="black"/>
            ))}
          </svg>
        </div>
        <div className="w-full rounded-xl bg-white/6 border border-white/8 px-3 py-2">
          <p className="text-[10px] text-white/40 font-mono truncate">linkcash.app/gift/0x4f2a…#secret</p>
        </div>
        <div className="w-full grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-emerald-500/15 border border-emerald-500/25 p-2 text-center text-xs text-emerald-300 font-medium">WhatsApp</div>
          <div className="rounded-xl bg-blue-500/15 border border-blue-500/25 p-2 text-center text-xs text-blue-300 font-medium">Telegram</div>
        </div>
      </div>
    ),
  },
  {
    label: "Claim",
    screen: (
      <div className="flex flex-col gap-3 p-4">
        <div className="text-center space-y-1">
          <div className="mx-auto w-10 h-10 rounded-full bg-violet-500/20 border border-violet-400/30 flex items-center justify-center text-lg">🎁</div>
          <p className="text-xs text-white/50">Alex K. sent you</p>
          <p className="text-2xl font-bold text-white">$10 <span className="text-base font-normal text-white/50">USDC</span></p>
          <p className="text-xs italic text-white/60">&quot;Happy birthday! 🎉&quot;</p>
        </div>
        <div className="rounded-xl border border-white/8 bg-white/4 p-3 space-y-1.5">
          {[
            { icon: "⚡", text: "Ready in 10 seconds" },
            { icon: "🔑", text: "Sign in with Google or email" },
            { icon: "$0", text: "Zero gas fees" },
          ].map(({ icon, text }) => (
            <div key={text} className="flex items-center gap-2 text-xs text-white/60">
              <span className="text-sm w-5 text-center">{icon}</span>
              <span>{text}</span>
            </div>
          ))}
        </div>
        <div className="rounded-xl bg-gradient-to-r from-violet-500 to-indigo-500 p-3 text-center text-sm font-semibold text-white">
          Claim with Google or email →
        </div>
      </div>
    ),
  },
  {
    label: "Done",
    screen: (
      <div className="flex flex-col items-center gap-3 p-4 text-center">
        <div className="relative">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-400/40 flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          {["🎉","✨","🎊","⭐"].map((e, i) => (
            <span key={i} className="absolute text-sm animate-bounce" style={{
              top: `${[-20,-15,60,55][i]}%`,
              left: `${[-20,90,-10,85][i]}%`,
              animationDelay: `${i * 0.15}s`
            }}>{e}</span>
          ))}
        </div>
        <div>
          <p className="text-base font-bold text-white">$10 USDC claimed!</p>
          <p className="text-xs text-white/50 mt-0.5">On Arc Testnet · gasless</p>
        </div>
        <div className="w-full rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 space-y-1">
          <p className="text-[10px] text-white/40 uppercase tracking-widest">Wallet balance</p>
          <p className="text-xl font-bold text-emerald-300">10.00 <span className="text-sm font-normal text-white/50">USDC</span></p>
        </div>
        <div className="w-full rounded-xl bg-gradient-to-r from-violet-500 to-indigo-500 p-3 text-center text-sm font-semibold text-white">
          🎁 Send someone a gift
        </div>
      </div>
    ),
  },
];

const STEP_DURATION = 3500;

const variants = {
  enter: { opacity: 0, y: 20, scale: 0.97 },
  center: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -16, scale: 0.97 },
};

export default function DemoFlow() {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const goTo = (next: number) => {
    setDirection(next > step ? 1 : -1);
    setStep(next);
  };

  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setDirection(1);
      setStep((s) => (s + 1) % STEPS.length);
    }, STEP_DURATION);
  };

  useEffect(() => {
    startTimer();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const currentStep = STEPS[step];

  return (
    <div className="relative mx-auto w-[220px]">
      {/* Ambient glow that shifts with step */}
      <div
        className="absolute inset-0 -z-10 rounded-[2rem] blur-2xl transition-all duration-700"
        style={{
          background: step === 3
            ? "radial-gradient(ellipse at 50% 60%, rgba(52,211,153,0.18) 0%, transparent 70%)"
            : "radial-gradient(ellipse at 50% 60%, rgba(139,92,246,0.18) 0%, transparent 70%)",
        }}
        aria-hidden
      />

      {/* Phone frame */}
      <div
        className="relative rounded-[2rem] border-2 border-white/15 bg-[#0a0a14] shadow-2xl overflow-hidden"
        style={{ boxShadow: "0 0 60px rgba(139,92,246,0.15), 0 25px 50px rgba(0,0,0,0.5)" }}
      >
        {/* Notch */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-16 h-1.5 rounded-full bg-white/10" />
        </div>

        {/* Step indicators */}
        <div className="flex justify-center gap-1.5 pb-2">
          {STEPS.map((s, i) => (
            <button
              key={s.label}
              type="button"
              onClick={() => { goTo(i); startTimer(); }}
              className={`h-1 rounded-full transition-all duration-300 ${i === step ? "w-6 bg-violet-400" : "w-1.5 bg-white/20 hover:bg-white/40"}`}
            />
          ))}
        </div>

        {/* Screen content — animated */}
        <div className="min-h-[320px] overflow-hidden">
          <AnimatePresence mode="popLayout" initial={false} custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
            >
              {currentStep.screen}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Home indicator */}
        <div className="flex justify-center py-3">
          <div className="w-20 h-1 rounded-full bg-white/15" />
        </div>
      </div>

      {/* Step label */}
      <p className="mt-3 text-center text-xs text-white/40">
        <span className="text-violet-400">{currentStep.label}</span>
        {" "}· step {step + 1}/{STEPS.length}
      </p>
    </div>
  );
}
