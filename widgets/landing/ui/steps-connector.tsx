"use client";

import { useRef } from "react";
import { motion, useScroll } from "framer-motion";

/**
 * Horizontal accent line that draws left-to-right as the
 * "How it works" steps scroll through the viewport.
 */
export default function StepsConnector() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 0.85", "end 0.6"],
  });

  return (
    <div ref={ref} className="landing-steps-line-track" aria-hidden>
      <motion.div className="landing-steps-line" style={{ scaleX: scrollYProgress }} />
    </div>
  );
}
