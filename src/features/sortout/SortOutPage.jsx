import { Link } from 'react-router-dom';
import { useUnsortedCount } from '../ledger/useTransactions';
import { EmptyJar } from '../../components/illustrations/Sketches';
import { CategoryManager } from './CategoryManager';
import { TagManager } from './TagManager';
import { Suggestions } from './Suggestions';
import { LearnedMerchants } from './LearnedMerchants';
import '../../components/layout/layout.css';
import './sortout.css';

function UnsortedPrompt() {
  const { data: count = 0, isLoading, isError } = useUnsortedCount();

  if (isLoading) return <p>Checking rows waiting for a category…</p>;
  if (isError) return <p className="import-error">Couldn’t load the rows waiting for a category.</p>;

  if (!count) {
    return (
      <div className="unsorted unsorted--clear">
        <EmptyJar size={72} />
        <p>All categorized.</p>
      </div>
    );
  }

  return (
    <div className="unsorted">
      <p className="unsorted__count num">{count}</p>
      <div>
        <p className="unsorted__title">
          {count === 1 ? 'row' : 'rows'} to categorize
        </p>
      </div>
      <Link to="/app/ledger?view=unsorted" className="btn btn--accent">
        View rows
      </Link>
      <div className="unsorted__suggest">
        <Suggestions />
      </div>
    </div>
  );
}

export function SortOutPage() {
  return (
    <div className="sortout">
      <header className="page-head">
        <h1>Sort out</h1>
      </header>
      <UnsortedPrompt />
      <div className="sortout__managers">
        <CategoryManager />
        <TagManager />
      </div>
      <LearnedMerchants />
    </div>
  );
}
