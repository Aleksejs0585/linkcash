"use client";

import { useState } from "react";
import { LANDING_FAQ } from "../model/content";
import Reveal from "./reveal";

export default function LandingFaq() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="landing-faq-list">
      {LANDING_FAQ.map((item, index) => {
        const isOpen = openIndex === index;
        return (
          <Reveal
            key={item.q}
            className={`landing-faq-item${isOpen ? " open" : ""}`}
            delay={Math.min(index, 5) * 0.07}
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
              <div className="landing-faq-a-inner">
                {item.a}
                {"links" in item && item.links && (
                  <div className="landing-faq-links">
                    {item.links.map((link) => (
                      <a
                        key={link.href}
                        href={link.href}
                        target="_blank"
                        rel="noreferrer"
                        className="landing-faq-link"
                      >
                        {link.label} →
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Reveal>
        );
      })}
    </div>
  );
}
