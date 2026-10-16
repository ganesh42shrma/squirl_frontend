import { Link } from 'react-router-dom';
import { useTransactions } from '../ledger/useTransactions';
import { EmptyJar } from '../../components/illustrations/Sketches';
import { CategoryManager } from './CategoryManager';
import { TagManager } from './TagManager';
import '../../components/layout/layout.css';
import './sortout.css';

function UnsortedPrompt() {
  const { data } = useTransactions({ category: 'none', limit: 1 });
  const count = data?.meta?.total || 0;

  if (!count) {
    return (
      <div className="unsorted unsorted--clear">
        <EmptyJar size={72} />
        <p>Every row has a category. Nothing waiting here.</p>
      </div>
    );
  }

  return (
    <div className="unsorted">
      <p className="unsorted__count num">{count}</p>
      <div>
        <p className="unsorted__title">
          {count === 1 ? 'row is' : 'rows are'} waiting for a category
        </p>
        <p className="unsorted__hint">Select several at once in the ledger and give them a category in one go.</p>
      </div>
      <Link to="/app?view=unsorted" className="btn btn--accent">
        Sort them now
      </Link>
    </div>
  );
}

export function SortOutPage() {
  return (
    <div className="sortout">
      <header className="page-head">
        <h1>Sort out</h1>
        <p>Give rows a home, and shape the categories and tags to fit how you actually spend.</p>
      </header>
      <UnsortedPrompt />
      <div className="sortout__managers">
        <CategoryManager />
        <TagManager />
      </div>
    </div>
  );
}
