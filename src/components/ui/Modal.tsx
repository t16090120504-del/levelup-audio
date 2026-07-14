import { useEffect, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  size?: 'sm' | 'md' | 'lg';
  closeOnOverlay?: boolean;
}

const sizeClasses: Record<NonNullable<ModalProps['size']>, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
};

/**
 * Framer Motion modal dialog.
 *
 * - Slides in from the bottom with a fade on enter.
 * - Slides down + fades out on exit.
 * - Closes on ESC key press and (optionally) on overlay click.
 * - Locks body scroll while open.
 */
export function Modal({
  isOpen,
  onClose,
  children,
  title,
  size = 'md',
  closeOnOverlay = true,
}: ModalProps) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={closeOnOverlay ? onClose : undefined}
          />

          {/* Modal panel */}
          <motion.div
            className={[
              'relative z-10 w-full overflow-hidden',
              sizeClasses[size],
              'rounded-xl border border-bg-hover bg-bg-card shadow-card',
            ].join(' ')}
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            {title ? (
              <div className="flex items-center justify-between border-b border-bg-hover px-6 py-4">
                <h2 className="font-display text-lg text-gold-bright">{title}</h2>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-md p-1 text-text-muted transition-colors hover:bg-bg-hover hover:text-text-primary"
                  aria-label="Close"
                >
                  <X size={20} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="absolute right-3 top-3 z-20 rounded-md p-1 text-text-muted transition-colors hover:bg-bg-hover hover:text-text-primary"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            )}

            <div className={title ? 'px-6 py-4' : 'px-6 pb-4 pt-12'}>{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
