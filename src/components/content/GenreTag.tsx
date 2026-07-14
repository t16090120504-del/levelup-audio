export interface GenreTagProps {
  label: string;
  active?: boolean;
  onClick?: () => void;
}

/**
 * Pill-shaped genre tag. Active state uses the gold gradient with dark text;
 * inactive uses an elevated dark surface with a subtle border. Designed for
 * use inside horizontal filter bars.
 */
export function GenreTag({ label, active = false, onClick }: GenreTagProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'shrink-0 whitespace-nowrap rounded-full px-3 py-1 text-sm font-medium transition-all duration-200',
        active
          ? 'bg-gradient-gold text-bg-deepest shadow-gold-glow-sm'
          : 'border border-bg-hover bg-bg-elevated text-text-secondary hover:border-gold/30 hover:text-text-primary',
      ].join(' ')}
    >
      {label}
    </button>
  );
}

export default GenreTag;
