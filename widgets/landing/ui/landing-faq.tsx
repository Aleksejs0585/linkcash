"use client";

import { useState } from "react";
import { LANDING_FAQ } from "../model/content";

export default function LandingFaq() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="landing-faq-list">
      {LANDING_FAQ.map((item, index) => {
        const isOpen = openIndex === index;
        return (
          <div
            key={item.q}
            className={`landing-faq-item${isOpen ? " open" : ""}`}
          >
            <button
              type="button"
              className="landing-faq-q"
              aria-expanded={isOpen}
              onClick={() => setOpenIndex(isOpen ? null : index)}
            >
              {item.q}
              <span className="landing-faq-chevron" aria-hidden>
                ↓
              </span>
            </button>
            <div className="landing-faq-a">
              <div className="landing-faq-a-inner">{item.a}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
