import { Link } from 'react-router-dom';
import { motion, useMotionValueEvent, useReducedMotion, useScroll, useSpring } from 'motion/react';
import { useState } from 'react';
import { Logo } from '../../components/layout/Logo';
import { ThemeToggle } from '../../components/layout/ThemeToggle';
import { HeroScene } from './scenes/HeroScene';
import { EntryRibbon } from './scenes/EntryRibbon';
import { ScrollChapter } from './scenes/ScrollChapter';
import { StatementStage } from './scenes/StatementStage';
import { CategoryDrumStage } from './scenes/CategoryDrumStage';
import { MonthChartStage } from './scenes/MonthChartStage';
import { PaymentsStack } from './scenes/PaymentsStack';
import { VaultScene } from './scenes/VaultScene';
import { ClosingScene } from './scenes/ClosingScene';
import './landing.css';

const IMPORT_STEPS = [
  { title: 'Drop in a PDF', body: 'SBI and Kotak e-statements, password-protected ones included.' },
  { title: 'Rows become entries', body: 'Each line on the statement lands in your ledger with its date and amount.' },
  { title: 'Duplicates are skipped', body: 'Overlapping statements are safe: transactions imported before are recognised and skipped.' },
  { title: 'Undo any import', body: 'Changed your mind? Take a whole import back out in one go.' },
];

const SORT_STEPS = [
  { title: 'Categories from day one', body: 'Rent, society maintenance, SIPs, mobile recharge: defaults that fit, and you can add your own, with tags.' },
  { title: 'Merchants it remembers', body: 'Sort a merchant once, and its later rows file themselves.' },
  { title: 'Your local model fills the gaps', body: 'Unsorted merchants are categorized in the background. Review or change any category in the ledger.' },
];

const MONTH_STEPS = [
  { title: 'Five kinds of money, kept apart', body: 'Spent, earned, invested, moved and lent never mix, so a credit card bill never looks like a shopping spree.' },
  { title: 'Month against month', body: 'Charts on your dashboard show where each month went, next to the ones before it.' },
  { title: 'Highlights in plain words', body: 'A short written summary from your local model. Every number in it is worked out by Squirl.' },
];

function LandingNav() {
  const reduceMotion = useReducedMotion();
  const { scrollY, scrollYProgress } = useScroll();
  const [raised, setRaised] = useState(false);
  const bar = useSpring(scrollYProgress, { stiffness: 140, damping: 26, mass: 0.4 });
  useMotionValueEvent(scrollY, 'change', (y) => {
    const next = y > 24;
    setRaised((current) => (current === next ? current : next));
  });

  return (
    <header className={`landing__nav${raised ? ' is-raised' : ''}`}>
      <div className="landing__nav-inner">
        <Logo />
        <nav className="landing__links" aria-label="On this page">
          <a href="#story">Imports</a>
          <a href="#sorting">Categories</a>
          <a href="#month">Charts</a>
          <a href="#payments">Payments</a>
        </nav>
        <div className="landing__nav-actions">
          <ThemeToggle />
          <Link to="/login" className="landing__signin">
            Sign in
          </Link>
          <Link to="/app" className="btn btn--primary landing__open">
            Open ledger
          </Link>
        </div>
      </div>
      {!reduceMotion && <motion.span className="landing__progress" style={{ scaleX: bar }} aria-hidden="true" />}
    </header>
  );
}

export function LandingPage() {
  return (
    <div className="landing">
      <a className="skip-link" href="#story">
        Skip to how it works
      </a>
      <LandingNav />
      <main>
        <HeroScene />
        <EntryRibbon />

        <ScrollChapter
          id="story"
          kicker="Statement imports"
          title="From statement to ledger, without the busywork."
          steps={IMPORT_STEPS}
          length={340}
        >
          {(progress) => <StatementStage progress={progress} />}
        </ScrollChapter>

        <ScrollChapter
          id="sorting"
          kicker="Categories & tags"
          title="Every row finds its place."
          steps={SORT_STEPS}
          length={300}
          flip
        >
          {(progress) => <CategoryDrumStage progress={progress} />}
        </ScrollChapter>

        <ScrollChapter
          id="month"
          kicker="Charts & highlights"
          title="See the month clearly."
          steps={MONTH_STEPS}
          length={300}
        >
          {(progress) => <MonthChartStage progress={progress} />}
        </ScrollChapter>

        <PaymentsStack />
        <VaultScene />
        <ClosingScene />
      </main>

      <footer className="landing__footer">
        <Logo />
        <p>Squirl runs on your own machine. Your money data stays in your own database.</p>
        <nav aria-label="Account">
          <Link to="/signup">Create account</Link>
          <Link to="/login">Sign in</Link>
          <Link to="/app">Open ledger</Link>
        </nav>
      </footer>
    </div>
  );
}
