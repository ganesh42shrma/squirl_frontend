import { Component, Suspense } from 'react';

// One failed feed must never blank the board: each widget gets its own error boundary and
// loading skeleton.
class WidgetBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error) {
    console.error(`Widget "${this.props.title}" failed`, error); // eslint-disable-line no-console
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="widget-error" role="alert">
        <p><strong>{this.props.title}</strong> couldn’t load.</p>
        <button type="button" className="link-button" onClick={() => this.setState({ error: null })}>Try again</button>
      </div>
    );
  }
}

export function WidgetFrame({ title, children }) {
  return (
    <WidgetBoundary title={title}>
      <Suspense fallback={<div className="insight-skeleton widget-skeleton" aria-busy="true" aria-label={`Loading ${title}`} />}>{children}</Suspense>
    </WidgetBoundary>
  );
}
