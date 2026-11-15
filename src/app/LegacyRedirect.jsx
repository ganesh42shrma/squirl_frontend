import { Navigate, useLocation, useParams } from 'react-router-dom';

// Old bookmarks keep working: send them to the new address, keeping ?query and #hash.
export function LegacyRedirect({ to }) {
  const params = useParams();
  const { search, hash } = useLocation();
  const target = typeof to === 'function' ? to(params) : to;
  // A target that already has its own query (the dashboard customize link) merges the old one in.
  const joiner = target.includes('?') && search ? `&${search.slice(1)}` : search;
  return <Navigate to={`${target}${joiner}${hash}`} replace />;
}
