import { ChevronRight } from 'lucide-react';

export interface SectionHeaderProps {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}

/**
 * Section title with an optional "see all" action. Uses the display font in
 * gold and a subtle gold gradient divider beneath the header.
 */
export function SectionHeader({ title, actionLabel, onAction }: SectionHeaderProps) {
  return (
    <div className="mb-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-xl text-gold-bright">{title}</h2>
        {actionLabel != null && (
          <button
            type="button"
            onClick={onAction}
            className="group inline-flex items-center gap-0.5 text-sm text-text-secondary transition-colors hover:text-gold-bright"
          >
            <span>{actionLabel}</span>
            <ChevronRight
              size={16}
              className="transition-transform group-hover:translate-x-0.5"
            />
          </button>
        )}
      </div>
      <div className="mt-2 h-px w-full bg-gradient-to-r from-gold/40 via-gold/10 to-transparent" />
    </div>
  );
}

export default SectionHeader;
