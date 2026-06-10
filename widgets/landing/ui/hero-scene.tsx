"use client";

import { useEffect, useRef, useState } from "react";
import { animate, motion, useInView, useReducedMotion } from "framer-motion";
import type { TargetAndTransition } from "framer-motion";

type Stage = "compose" | "seal" | "fly" | "arrive" | "done";

const CAPTIONS: Record<Stage, string> = {
  compose: "Composing the gift…",
  seal: "Sealing $25 into a secure link…",
  fly: "Sharing via Telegram…",
  arrive: "Recipient signs in — wallet created",
  done: "Claimed in under 60 seconds ✓",
};

const EASE = [0.22, 0.61, 0.36, 1] as const;
const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const senderVariants: Record<Stage, TargetAndTransition> = {
  compose: { x: 0, y: 0, scale: 1, opacity: 1, filter: "blur(0px)" },
  seal: { x: 40, y: 30, scale: 0.5, opacity: 0, filter: "blur(2px)" },
  fly: { x: 40, y: 30, scale: 0.5, opacity: 0, filter: "blur(2px)" },
  arrive: { x: 40, y: 30, scale: 0.5, opacity: 0, filter: "blur(2px)" },
  done: { x: 40, y: 30, scale: 0.5, opacity: 0, filter: "blur(2px)" },
};

const linkPillVariants: Record<Stage, TargetAndTransition> = {
  compose: { opacity: 0, scale: 0.5, x: 0, y: 0 },
  seal: { opacity: 1, scale: 1, x: 0, y: 0 },
  fly: { opacity: 1, scale: 0.9, x: 208, y: 108 },
  arrive: { opacity: 0, scale: 0.6, x: 208, y: 108 },
  done: { opacity: 0, scale: 0.6, x: 208, y: 108 },
};

const notifVariants: Record<Stage, TargetAndTransition> = {
  compose: { opacity: 0, y: -14 },
  seal: { opacity: 0, y: -14 },
  fly: { opacity: 0, y: -14 },
  arrive: { opacity: 1, y: 0 },
  done: { opacity: 0, y: -14 },
};

const giftVariants: Record<Stage, TargetAndTransition> = {
  compose: { opacity: 0, scale: 0.85, y: 14 },
  seal: { opacity: 0, scale: 0.85, y: 14 },
  fly: { opacity: 0, scale: 0.85, y: 14 },
  arrive: { opacity: 1, scale: 1, y: 0 },
  done: { opacity: 1, scale: 1, y: 0 },
};

const giftBtnVariants: Record<Stage, TargetAndTransition> = {
  compose: { opacity: 1 },
  seal: { opacity: 1 },
  fly: { opacity: 1 },
  arrive: { opacity: 1 },
  done: { opacity: 0 },
};

const giftDoneVariants: Record<Stage, TargetAndTransition> = {
  compose: { opacity: 0, y: 8 },
  seal: { opacity: 0, y: 8 },
  fly: { opacity: 0, y: 8 },
  arrive: { opacity: 0, y: 8 },
  done: { opacity: 1, y: 0 },
};

export default function HeroScene() {
  const reduceMotion = useReducedMotion();
  const sceneRef = useRef<HTMLDivElement>(null);
  const inView = useInView(sceneRef, { amount: 0.4 });
  const runningRef = useRef(false);
  const cancelledRef = useRef(false);

  const [stage, setStage] = useState<Stage>("compose");
  const [composeAmount, setComposeAmount] = useState(25);
  const [claimAmount, setClaimAmount] = useState(25);
  const [chipKey, setChipKey] = useState(0);

  useEffect(() => {
    if (reduceMotion) {
      setStage("done");
      setComposeAmount(25);
      setClaimAmount(25);
      return;
    }
    if (!inView || runningRef.current) return;
    runningRef.current = true;
    cancelledRef.current = false;

    const countTo = (setter: (n: number) => void, to: number, durationMs: number) =>
      new Promise<void>((resolve) => {
        const controls = animate(0, to, {
          duration: durationMs / 1000,
          ease: EASE,
          onUpdate: (value) => setter(Math.round(value)),
          onComplete: resolve,
        });
        if (cancelledRef.current) controls.stop();
      });

    async function run() {
      while (!cancelledRef.current) {
        setStage("compose");
        setComposeAmount(0);
        await countTo(setComposeAmount, 25, 700);
        await wait(1100);
        if (cancelledRef.current) break;

        setStage("seal");
        await wait(1100);
        if (cancelledRef.current) break;

        setStage("fly");
        setChipKey((k) => k + 1);
        await wait(1200);
        if (cancelledRef.current) break;

        setStage("arrive");
        setClaimAmount(0);
        await wait(550);
        await countTo(setClaimAmount, 25, 900);
        await wait(900);
        if (cancelledRef.current) break;

        setStage("done");
        await wait(2600);
      }
    }

    run();

    return () => {
      cancelledRef.current = true;
      runningRef.current = false;
    };
  }, [inView, reduceMotion]);

  return (
    <div className="hero-scene-wrap">
      <div className="hero-scene" ref={sceneRef}>
        <motion.div
          className="hero-scene-card hero-scene-sender"
          animate={senderVariants[stage]}
          transition={{ duration: 0.7, ease: EASE }}
        >
          <div className="hero-scene-card-head">
            <span className="hero-scene-avatar" aria-hidden>
              AK
            </span>
            <div>
              <div className="hero-scene-name">Alex K.</div>
              <div className="hero-scene-role">Sending a gift</div>
            </div>
          </div>
          <div className="hero-scene-field">
            <span className="hero-scene-field-label">Message</span>
            <span className="hero-scene-field-val">Happy birthday!</span>
          </div>
          <div className="hero-scene-field">
            <span className="hero-scene-field-label">Amount</span>
            <span className="hero-scene-field-val hero-scene-amount">
              {composeAmount}.00 <em>USDC</em>
            </span>
          </div>
          <div className="hero-scene-btn">Create gift →</div>
        </motion.div>

        <motion.div
          className="hero-scene-linkpill"
          animate={linkPillVariants[stage]}
          transition={{ duration: 0.8, ease: EASE }}
        >
          <span aria-hidden>🔗</span>
          <span className="hero-scene-linkpill-url">
            linkcash.app/g/<span className="mono">7f3a…b1</span>
          </span>
        </motion.div>

        <div className="hero-scene-phone">
          <div className="hero-scene-phone-notch" aria-hidden />
          <div className="hero-scene-phone-screen">
            <motion.div
              className="hero-scene-notif"
              animate={notifVariants[stage]}
              transition={{ duration: 0.5, ease: EASE }}
            >
              <span className="hero-scene-notif-icon" aria-hidden>
                ✦
              </span>
              <div>
                <b>New gift link</b>
                <span>via Telegram</span>
              </div>
            </motion.div>

            <motion.div
              className="hero-scene-gift"
              animate={giftVariants[stage]}
              transition={{ duration: 0.55, ease: EASE }}
            >
              <div className="hero-scene-gift-from">
                Gift from <b>Alex K.</b>
              </div>
              <div className="hero-scene-gift-amt">
                {claimAmount}.00 <em>USDC</em>
              </div>
              <div className="hero-scene-gift-msg">&quot;Happy birthday!&quot;</div>
              <motion.div
                className="hero-scene-gift-btn"
                animate={giftBtnVariants[stage]}
                transition={{ duration: 0.4 }}
              >
                Claim with Google →
              </motion.div>
              <motion.div
                className="hero-scene-gift-done"
                animate={giftDoneVariants[stage]}
                transition={{ duration: 0.4 }}
              >
                <span className="hero-scene-gift-done-check" aria-hidden>
                  ✓
                </span>{" "}
                Claimed · on Arc
              </motion.div>
            </motion.div>
          </div>
        </div>

        {!reduceMotion ? (
          <motion.div
            key={chipKey}
            className="hero-scene-chip"
            initial={{ opacity: 0, x: 0, y: 0, scale: 0.6 }}
            animate={
              stage === "fly"
                ? { opacity: [0, 1, 1, 0], x: [0, 40, 200, 200], y: [0, -10, 120, 120], scale: [0.6, 1, 0.7, 0.7] }
                : { opacity: 0, x: 0, y: 0, scale: 0.6 }
            }
            transition={{ duration: 1.1, ease: EASE }}
            aria-hidden
          >
            +$25
          </motion.div>
        ) : null}
      </div>
      <p className="hero-scene-caption" aria-live="polite">
        {CAPTIONS[stage]}
      </p>
    </div>
  );
}
