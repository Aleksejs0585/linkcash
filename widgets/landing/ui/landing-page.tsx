import Link from "next/link";
import {
  LANDING_CLAIM_FEATURES,
  LANDING_ROADMAP,
  LANDING_STEPS,
  LANDING_USE_CASES,
} from "../model/content";
import { shortTxHash, txRowIcon, txStatusLabel } from "../lib/tx-display";
import type { LandingTxExample } from "@/lib/server/load-live-tx-examples";
import type { OnChainStats } from "@/lib/server/on-chain-stats";
import { getArcExplorerTxUrl } from "@/utils";
import LinkCashLogo from "@/components/ui/linkcash-logo";
import { HelpTrigger } from "@/components/ui/help-manual";
import LandingFaq from "./landing-faq";
import HeroScene from "./hero-scene";
import LiveStats from "./live-stats";
import LiveTicker from "./live-ticker";
import CursorGlow from "./cursor-glow";
import FloatingCoins from "./floating-coins";
import CountUp from "./count-up";
import MagneticLink from "./magnetic-link";
import Reveal from "./reveal";

export type { LandingTxExample };

type LandingPageProps = {
  txExamples: LandingTxExample[];
  stats: OnChainStats;
};


export default function LandingPage({ txExamples, stats }: LandingPageProps) {
  return (
    <div className="landing-page">
      <CursorGlow />
      <nav className="landing-nav">
        <Link href="/" className="landing-nav-logo">
          <LinkCashLogo />
        </Link>
        <span className="landing-nav-badge">Arc Testnet</span>
        <div className="landing-nav-actions">
          <a href="#how" className="landing-btn-ghost">
            How it works
          </a>
          <a href="#roadmap" className="landing-btn-ghost">
            Roadmap
          </a>
          <Link href="/request" className="landing-btn-ghost">
            Request →
          </Link>
          <Link href="/create" className="landing-btn-primary">
            Send USDC →
          </Link>
          <HelpTrigger className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-sm font-semibold text-white/70 transition hover:border-white/25 hover:bg-white/10 hover:text-white" />
        </div>
      </nav>

      <section className="landing-hero">
        <div className="landing-hero-glow" aria-hidden />
        <div className="landing-hero-glow2" aria-hidden />
        <FloatingCoins />

        <div className="landing-hero-label">
          <span className="landing-hero-label-dot" aria-hidden />
          Built on Arc Testnet · Powered by Circle Wallets
        </div>

        <h1>
          Send or request USDC
          <br />
          <span className="accent">just share a link.</span>
          <br />
          <span className="dim">No wallet needed on their end.</span>
        </h1>

        <p className="landing-hero-sub">
          Gift money to a friend or get paid by a client — one link, one tap.
          They sign in with <strong>Google or email</strong>, get a wallet
          instantly, and USDC arrives — <strong>under 60 seconds</strong>,
          zero gas, zero setup.
        </p>

        <div className="landing-hero-cta">
          <MagneticLink href="/create" className="landing-btn-primary landing-btn-large">
            Send a gift →
          </MagneticLink>
          <MagneticLink href="/request" className="landing-btn-outline landing-btn-large">
            Request payment →
          </MagneticLink>
        </div>
        <div className="mt-4 text-center">
          <a href="#how" className="text-sm text-white/40 hover:text-white/70 transition">
            See how it works ↓
          </a>
        </div>

        {/* Hero animation: gift composed → sealed into a link → claimed on the recipient's phone */}
        <div className="mt-10 flex justify-center">
          <HeroScene />
        </div>

        <div className="landing-stats">
          <div>
            <CountUp className="landing-stat-num" to={60} prefix="< " suffix="s" />
            <span className="landing-stat-label">Time to first claim</span>
          </div>
          <div className="landing-stat-divider" aria-hidden />
          <div>
            <span className="landing-stat-num">$0.00</span>
            <span className="landing-stat-label">Gas for recipient</span>
          </div>
          <div className="landing-stat-divider" aria-hidden />
          <LiveStats initial={stats} />
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
          <Reveal>
            <div className="landing-section-label">How it works</div>
            <h2>
              Four steps.
              <br />
              One seamless flow.
            </h2>
            <p className="landing-section-sub">
              Sender funds onchain. Recipient clicks a link. That&apos;s it.
            </p>
          </Reveal>

          <div className="landing-steps-wrap">
            <div className="landing-steps">
              {LANDING_STEPS.map((step, index) => (
                <Reveal key={step.num} className="landing-step" delay={Math.min(index, 5) * 0.07}>
                  <div className="landing-step-num">{step.num}</div>
                  <div className="landing-step-icon" aria-hidden>
                    {step.icon}
                  </div>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="landing-section landing-claim-section">
        <div className="landing-container">
          <div className="landing-claim-layout">
            <Reveal className="landing-claim-phone">
              <div className="landing-claim-card">
                <div className="landing-claim-glow" aria-hidden />
                <div className="landing-claim-avatar" aria-hidden>🎁</div>
                <div className="landing-claim-from">Gift from</div>
                <div className="landing-claim-name">Alex K.</div>
                <div className="landing-claim-msg">&quot;Happy birthday! 🎉&quot;</div>
                <div className="landing-claim-amount">25.00</div>
                <div className="landing-claim-token">USDC · Arc Testnet</div>
                <div className="landing-claim-expiry">⏱ Expires in 23h 41m</div>
                <div className="landing-claim-btn">Claim with Google or email →</div>
                <div className="landing-claim-login">No wallet or account needed</div>
              </div>
            </Reveal>
            <Reveal className="landing-claim-info" delay={0.1}>
              <div className="landing-section-label">Recipient experience</div>
              <h2>The smoothest onboarding in crypto.</h2>
              <ul className="landing-claim-features">
                {LANDING_CLAIM_FEATURES.map((feature) => (
                  <li key={feature.title} className="landing-claim-feature">
                    <div className="landing-feature-check" aria-hidden>✓</div>
                    <div className="landing-feature-text">
                      <strong>{feature.title}</strong>
                      <span>{feature.text}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="landing-section">
        <div className="landing-container">
          <Reveal>
            <div className="landing-section-label">Use cases</div>
            <h2>Built for real flows.</h2>
            <p className="landing-section-sub">
              From personal gifts to growth campaigns — any USDC transfer that
              starts with a link.
            </p>
          </Reveal>

          <div className="landing-use-cases">
            {LANDING_USE_CASES.map((card, index) => (
              <Reveal key={card.title} className="landing-use-card" delay={Math.min(index, 5) * 0.07}>
                <span className="landing-use-card-icon" aria-hidden>
                  {card.icon}
                </span>
                <h3>{card.title}</h3>
                <p>{card.text}</p>
                <span className="landing-use-tag">{card.tag}</span>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section id="roadmap" className="landing-section landing-roadmap-section">
        <div className="landing-container">
          <Reveal>
            <div className="landing-section-label">Roadmap</div>
            <h2>Where we&apos;re going.</h2>
            <p className="landing-section-sub">
              From testnet proof to mainnet infrastructure — a clear path to
              production USDC gifting on Arc.
            </p>
          </Reveal>

          <div className="landing-roadmap">
            {LANDING_ROADMAP.map((phase, index) => (
              <Reveal
                key={phase.phase}
                className={`landing-roadmap-phase landing-roadmap-phase--${phase.status}`}
                delay={Math.min(index, 5) * 0.07}
              >
                <div className="landing-roadmap-phase-header">
                  <span className="landing-roadmap-phase-tag">{phase.phase}</span>
                  {phase.status === "done" && (
                    <span className="landing-roadmap-badge landing-roadmap-badge--done">Done</span>
                  )}
                  {phase.status === "active" && (
                    <span className="landing-roadmap-badge landing-roadmap-badge--active">
                      <span className="landing-roadmap-badge-dot" aria-hidden />
                      In progress
                    </span>
                  )}
                  {phase.status === "planned" && (
                    <span className="landing-roadmap-badge landing-roadmap-badge--planned">Planned</span>
                  )}
                </div>
                <h3 className="landing-roadmap-phase-title">{phase.title}</h3>
                <div className="landing-roadmap-date">{phase.date}</div>
                <ul className="landing-roadmap-items">
                  {phase.items.map((item) => (
                    <li key={item} className="landing-roadmap-item">
                      <span className="landing-roadmap-item-dot" aria-hidden />
                      {item}
                    </li>
                  ))}
                </ul>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {txExamples.length > 0 && (
      <section className="landing-section" style={{ paddingTop: 0 }}>
        <div className="landing-container">
          <Reveal>
            <div className="landing-section-label">Live transactions</div>
            <h2>Recent claims on Arc.</h2>
            <p className="landing-section-sub" style={{ marginBottom: 0 }}>
              All transactions are verifiable on the Arc testnet explorer.
            </p>
          </Reveal>
        </div>

        <LiveTicker items={txExamples} />

        <div className="landing-container">
          <div className="landing-tx-panel">
            {txExamples.map((item) => (
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
            ))}
          </div>
          <p className="landing-tx-note">
            Last 10 onchain events (gifts, claims, reclaims), newest first.
            Refreshes every 30 seconds.
          </p>
        </div>
      </section>
      )}

      <section className="landing-section landing-faq-section">
        <div className="landing-container">
          <Reveal>
            <div className="landing-section-label">FAQ</div>
            <h2>Common questions.</h2>
          </Reveal>
          <LandingFaq />
        </div>
      </section>

      <section className="landing-footer-cta">
        <div className="landing-footer-cta-glow" aria-hidden />
        <Reveal>
          <div className="landing-section-label">Get started</div>
          <h2>
            Ready to send
            <br />
            <span style={{ color: "var(--accent-2)" }}>or get paid?</span>
          </h2>
          <p>
            One link. Under 60 seconds. No crypto experience needed on either
            side.
          </p>
        </Reveal>
        <div className="landing-hero-cta">
          <MagneticLink href="/create" className="landing-btn-primary landing-btn-large">
            Send a gift →
          </MagneticLink>
          <MagneticLink href="/request" className="landing-btn-outline">
            Request payment →
          </MagneticLink>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="landing-footer-left">
          <Link href="/" className="landing-footer-logo">
            <LinkCashLogo />
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
