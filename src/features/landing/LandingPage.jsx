import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import { Logo } from '../../components/layout/Logo';
import { ThemeToggle } from '../../components/layout/ThemeToggle';
import { BlurText } from '../../components/fx/BlurText';
import { SquirrelLedger } from '../../components/illustrations/SquirrelLedger';
import { GrowingAcorns, LogSketch, MonthSketch, StatementSketch } from '../../components/illustrations/Sketches';
import './landing.css';

const FEATURES = [
  {
    Sketch: LogSketch,
    title: 'Log it like a spreadsheet',
    body: 'Type a row, press Enter, keep going. Every expense gets a category and a few tags, and nothing more than it needs.',
  },
  {
    Sketch: StatementSketch,
    title: 'Bring in your bank statements',
    body: 'Upload an SBI or Kotak PDF. Rows you’ve already logged are skipped, and any import can be undone.',
  },
  {
    Sketch: MonthSketch,
    title: 'See the month clearly',
    body: 'Spending, income, investments and money lent to friends stay apart, so a credit card bill never looks like a shopping spree.',
  },
];

export function LandingPage() {
  const reduceMotion = useReducedMotion();
  const rise = (delay) =>
    reduceMotion
      ? {}
      : {
          initial: { opacity: 0, y: 10 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] },
        };

  return (
    <div className="landing">
      <header className="landing__nav">
        <Logo />
        <div className="landing__nav-actions">
          <ThemeToggle />
          <Link to="/app" className="btn btn--quiet">
            Open ledger
          </Link>
        </div>
      </header>

      <section className="hero">
        <div className="hero__copy">
          <BlurText as="h1" className="hero__title" text="Know where your money goes." delay={0.2} />
          <motion.p className="hero__lede" {...rise(1.0)}>
            Squirl is a quiet place to log what you spend, bring in your bank statements, and see each month
            clearly.
          </motion.p>
          <motion.div className="hero__actions" {...rise(1.2)}>
            <Link to="/app" className="btn btn--primary hero__cta">
              Open your ledger
            </Link>
            <Link to="/app/imports" className="hero__secondary">
              Import a statement
            </Link>
          </motion.div>
        </div>
        <div className="hero__art">
          <SquirrelLedger className="hero__drawing" />
        </div>
      </section>

      <section className="features" aria-label="What Squirl does">
        {FEATURES.map(({ Sketch, title, body }) => (
          <article key={title} className="feature">
            <Sketch />
            <h2>{title}</h2>
            <p>{body}</p>
          </article>
        ))}
      </section>

      <section className="closing">
        <div className="closing__copy">
          <h2>Small entries, kept every day, add up to a clear picture.</h2>
          <Link to="/app" className="btn btn--accent">
            Start logging
          </Link>
        </div>
        <GrowingAcorns />
      </section>

      <footer className="landing__footer">
        <p>Squirl runs on your own machine. Your money data stays in your own database.</p>
      </footer>
    </div>
  );
}
