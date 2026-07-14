import { Spinner } from './Spinner';

/**
 * Full-screen page loader centered with a spinner and loading text.
 */
export default function PageLoader() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-bg-deepest/80 backdrop-blur-sm">
      <Spinner size="lg" />
      <span className="text-sm font-medium text-text-secondary">Loading...</span>
    </div>
  );
}
