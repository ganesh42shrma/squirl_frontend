import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';

const QUOTE = ['quote'];
const FALLBACK = 'You don’t have to finish the whole journey today. Just take the next honest step.';

export function QuoteFooter() {
  const client = useQueryClient();
  const { data, isFetching } = useQuery({
    queryKey: QUOTE,
    // Keep the request alive across Strict Mode's remount so it makes only one model call.
    queryFn: () => api('/ai/quote', { method: 'POST', body: { previous: client.getQueryData(QUOTE)?.text } }).then((r) => r.data),
    staleTime: Infinity,
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false,
    retryOnMount: false,
  });

  return (
    <footer className="quote-footer" aria-label="A little encouragement">
      <div className="quote-footer__inner">
        <p className="quote-footer__eyebrow">A little encouragement</p>
        <div className="quote-footer__content" aria-live="polite" aria-atomic="true" aria-busy={isFetching}>
          <blockquote className="quote-footer__text">“{data?.text || FALLBACK}”</blockquote>
        </div>
      </div>
    </footer>
  );
}
