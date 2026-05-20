"use client";

import { useEffect, useState } from "react";

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
          <div className="w-full h-full grid grid-cols-5 gap-px">
            {Array.from({ length: 25 }).map((_, i) => (
              <div key={i} className={`rounded-[1px] ${[0,1,2,3,4,5,9,10,14,15,19,20,21,22,23,24,7,12,17].includes(i) ? "bg-black" : "bg-white"}`} />
            ))}
          </div>
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
          <p className="text-xs italic text-white/60">"Happy birthday! 🎉"</p>
        </div>
        <div className="rounded-xl border border-white/8 bg-white/4 p-3 space-y-1.5">
          {[
            { icon: "⚡", text: "Ready in 10 seconds" },
            { icon: "🔑", text: "Sign in with Google" },
            { icon: "$0", text: "Zero gas fees" },
          ].map(({ icon, text }) => (
            <div key={text} className="flex items-center gap-2 text-xs text-white/60">
              <span className="text-sm w-5 text-center">{icon}</span>
              <span>{text}</span>
            </div>
          ))}
        </div>
        <div className="rounded-xl bg-gradient-to-r from-violet-500 to-indigo-500 p-3 text-center text-sm font-semibold text-white">
          Claim with Google →
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

const STEP_DURATION = 3000;

export default function DemoFlow() {
  const [step, setStep] = useState(0);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setAnimating(true);
      setTimeout(() => {
        setStep((s) => (s + 1) % STEPS.length);
        setAnimating(false);
      }, 300);
    }, STEP_DURATION);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative mx-auto w-[220px]">
      {/* Phone frame */}
      <div className="relative rounded-[2rem] border-2 border-white/15 bg-[#0a0a14] shadow-2xl overflow-hidden"
           style={{ boxShadow: "0 0 60px rgba(139,92,246,0.15), 0 25px 50px rgba(0,0,0,0.5)" }}>
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
              onClick={() => setStep(i)}
              className={`h-1 rounded-full transition-all duration-300 ${i === step ? "w-6 bg-violet-400" : "w-1.5 bg-white/20"}`}
            />
          ))}
        </div>

        {/* Screen content */}
        <div
          className="transition-all duration-300 min-h-[320px]"
          style={{ opacity: animating ? 0 : 1, transform: animating ? "translateY(8px)" : "translateY(0)" }}
        >
          {STEPS[step].screen}
        </div>

        {/* Home indicator */}
        <div className="flex justify-center py-3">
          <div className="w-20 h-1 rounded-full bg-white/15" />
        </div>
      </div>

      {/* Step label */}
      <p className="mt-3 text-center text-xs text-white/40">
        <span className="text-violet-400">{STEPS[step].label}</span>
        {" "}· step {step + 1}/{STEPS.length}
      </p>
    </div>
  );
}
