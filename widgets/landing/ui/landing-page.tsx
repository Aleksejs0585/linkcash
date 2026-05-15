import Link from "next/link";
import {
  LANDING_CLAIM_FEATURES,
  LANDING_STEPS,
  LANDING_USE_CASES,
} from "../model/content";
import { shortTxHash, txRowIcon, txStatusLabel } from "../lib/tx-display";
import { getArcExplorerTxUrl } from "@/utils";
import LandingFaq from "./landing-faq";
import LinkCopyDemo from "./link-copy-demo";

export type LandingTxExample = {
  txHash: string;
  label: string;
  timestamp: string;
};

type LandingPageProps = {
  txExamples: LandingTxExample[];
};

export default function LandingPage({ txExamples }: LandingPageProps) {
  return (
    <div className="landing-page">
      <nav className="landing-nav">
        <Link href="/" className="landing-nav-logo">
          <span className="landing-nav-dot" aria-hidden />
          LinkCash
        </Link>
        <span className="landing-nav-badge">Arc Testnet</span>
        <div className="landing-nav-actions">
          <a href="#how" className="landing-btn-ghost">
            How it works
          </a>
          <Link href="/create" className="landing-btn-primary">
            Send USDC →
          </Link>
        </div>
      </nav>

      <section className="landing-hero">
        <div className="landing-hero-glow" aria-hidden />
        <div className="landing-hero-glow2" aria-hidden />

        <div className="landing-hero-label">
          <span className="landing-hero-label-dot" aria-hidden />
          Social-first crypto onboarding
        </div>

        <h1>
          Send money
          <br />
          <span className="accent">like a message.</span>
          <br />
          <span className="dim">No wallet needed.</span>
        </h1>

        <p className="landing-hero-sub">
          Share a link. Recipient signs in with <strong>Google or X</strong>,
          gets a wallet, claims USDC — <strong>under 60 seconds</strong>, zero
          gas, zero setup.
        </p>

        <div className="landing-hero-cta">
          <Link href="/create" className="landing-btn-primary landing-btn-large">
            Create a gift link →
          </Link>
          <a href="#how" className="landing-btn-outline">
            See how it works
          </a>
        </div>

        <LinkCopyDemo />

        <div className="landing-stats">
          <div>
            <span className="landing-stat-num">&lt; 60s</span>
            <span className="landing-stat-label">Time to first claim</span>
          </div>
          <div className="landing-stat-divider" aria-hidden />
          <div>
            <span className="landing-stat-num">$0.00</span>
            <span className="landing-stat-label">Gas for recipient</span>
          </div>
          <div className="landing-stat-divider" aria-hidden />
          <div>
            <span className="landing-stat-num">0</span>
            <span className="landing-stat-label">Steps to set up wallet</span>
          </div>
          <div className="landing-stat-divider" aria-hidden />
          <div>
            <span className="landing-stat-num">USDC</span>
            <span className="landing-stat-label">On Arc Testnet</span>
          </div>
        </div>
      </section>

      <div className="landing-tech">
        <div className="landing-tech-inner">
          <span className="landing-tech-label">Built with</span>
          <div className="landing-tech-divider" aria-hidden />
          <div className="landing-tech-badges">
            <span className="landing-tech-badge">
              <span className="landing-tech-dot arc" aria-hidden />
              Arc L1
            </span>
            <span className="landing-tech-badge">
              <span className="landing-tech-dot usdc" aria-hidden />
              USDC
            </span>
            <span className="landing-tech-badge">
              <span className="landing-tech-dot circle" aria-hidden />
              Circle Wallets
            </span>
            <span className="landing-tech-badge">
              <span className="landing-tech-dot gas" aria-hidden />
              Gasless relayer
            </span>
          </div>
        </div>
      </div>

      <section id="how" className="landing-section">
        <div className="landing-container">
          <div className="landing-section-label">How it works</div>
          <h2>
            Four steps.
            <br />
            One seamless flow.
          </h2>
          <p className="landing-section-sub">
            Sender funds onchain. Recipient clicks a link. That&apos;s it.
          </p>

          <div className="landing-steps">
            {LANDING_STEPS.map((step, index) => (
              <div key={step.num} className="landing-step">
                <div className="landing-step-num">{step.num}</div>
                <div className="landing-step-icon" aria-hidden>
                  {step.icon}
                </div>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
                {index < LANDING_STEPS.length - 1 ? (
                  <div className="landing-step-connector" aria-hidden>
                    →
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-section landing-claim-section">
        <div className="landing-container">
          <div className="landing-claim-layout">
            <div className="landing-claim-phone">
              <div className="landing-phone-frame">
                <div className="landing-phone-glow" aria-hidden />
                <div className="landing-claim-card">
                  <div className="landing-claim-avatar" aria-hidden>
                    🎁
                  </div>
                  <div className="landing-claim-from">Gift from</div>
                  <div className="landing-claim-name">Alex K.</div>
                  <div className="landing-claim-msg">
                    &quot;Happy birthday! 🎉&quot;
                  </div>
                  <div className="landing-claim-amount">25.00</div>
                  <div className="landing-claim-token">USDC · Arc Testnet</div>
                  <div className="landing-claim-expiry">
                    ⏱ Expires in 23h 41m
                  </div>
                  <div className="landing-claim-btn">Claim with Google →</div>
                  <div className="landing-claim-login">
                    No wallet or account needed
                  </div>
                </div>
              </div>
            </div>

            <div className="landing-claim-info">
              <div className="landing-section-label">Recipient experience</div>
              <h2>The smoothest onboarding in crypto.</h2>
              <ul className="landing-claim-features">
                {LANDING_CLAIM_FEATURES.map((feature) => (
                  <li key={feature.title} className="landing-claim-feature">
                    <div className="landing-feature-check" aria-hidden>
                      ✓
                    </div>
                    <div className="landing-feature-text">
                      <strong>{feature.title}</strong>
                      <span>{feature.text}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-section">
        <div className="landing-container">
          <div className="landing-section-label">Use cases</div>
          <h2>Built for real flows.</h2>
          <p className="landing-section-sub">
            From personal gifts to growth campaigns — any USDC transfer that
            starts with a link.
          </p>

          <div className="landing-use-cases">
            {LANDING_USE_CASES.map((card) => (
              <div key={card.title} className="landing-use-card">
                <span className="landing-use-card-icon" aria-hidden>
                  {card.icon}
                </span>
                <h3>{card.title}</h3>
                <p>{card.text}</p>
                <span className="landing-use-tag">{card.tag}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-section" style={{ paddingTop: 0 }}>
        <div className="landing-container">
          <div className="landing-section-label">Live transactions</div>
          <h2>Recent claims on Arc.</h2>
          <p className="landing-section-sub" style={{ marginBottom: 40 }}>
            All transactions are verifiable on the Arc testnet explorer.
          </p>

          <div className="landing-tx-panel">
            {txExamples.length === 0 ? (
              <p className="landing-tx-empty">
                No live transactions yet. Once gifts are funded or claimed,
                hashes will appear here automatically.
              </p>
            ) : (
              txExamples.map((item) => (
                <a
                  key={`${item.txHash}-${item.timestamp}`}
                  href={getArcExplorerTxUrl(item.txHash)}
                  target="_blank"
                  rel="noreferrer"
                  className="landing-tx-row"
                >
                  <div className="landing-tx-icon" aria-hidden>
                    {txRowIcon(item.label)}
                  </div>
                  <div className="landing-tx-info">
                    <div className="landing-tx-title">{item.label}</div>
                    <div className="landing-tx-hash">
                      {shortTxHash(item.txHash)}
                    </div>
                  </div>
                  <span className="landing-tx-status">
                    {txStatusLabel(item.label)}
                  </span>
                </a>
              ))
            )}
          </div>
          {txExamples.length > 0 ? (
            <p className="landing-tx-note">
              Updated every 30 seconds from live gift and claim activity.
            </p>
          ) : null}
        </div>
      </section>

      <section className="landing-section landing-faq-section">
        <div className="landing-container">
          <div className="landing-section-label">FAQ</div>
          <h2>Common questions.</h2>
          <LandingFaq />
        </div>
      </section>

      <section className="landing-footer-cta">
        <div className="landing-footer-cta-glow" aria-hidden />
        <div className="landing-section-label">Get started</div>
        <h2>
          Ready to send
          <br />
          <span style={{ color: "var(--lp-accent)" }}>your first gift?</span>
        </h2>
        <p>
          Create a link in 30 seconds. No crypto experience needed on either
          side.
        </p>
        <div className="landing-hero-cta">
          <Link href="/create" className="landing-btn-primary landing-btn-large">
            Create gift link →
          </Link>
          <Link href="/wallet" className="landing-btn-outline">
            Open my wallet
          </Link>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="landing-footer-left">
          <Link href="/" className="landing-footer-logo">
            LinkCash
          </Link>
          <span className="landing-footer-copy">
            Built on Arc · Powered by Circle
          </span>
        </div>
        <div className="landing-footer-links">
          <Link href="/gifts" className="landing-footer-link">
            Dashboard
          </Link>
          <a
            href="https://docs.arc.io"
            className="landing-footer-link"
            target="_blank"
            rel="noreferrer"
          >
            Arc Docs
          </a>
          <a
            href="https://faucet.circle.com"
            className="landing-footer-link"
            target="_blank"
            rel="noreferrer"
          >
            Get testnet USDC
          </a>
        </div>
      </footer>
    </div>
  );
}
