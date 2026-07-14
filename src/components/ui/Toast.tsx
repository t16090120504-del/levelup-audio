import { useEffect, useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle,
  XCircle,
  Info,
  AlertTriangle,
  X,
} from 'lucide-react';
import type { ToastMessage } from '@/stores/toast-store';

export interface ToastProps {
  toast: ToastMessage;
  onRemove: (id: string) => void;
}

const typeConfig = {
  success: {
    icon: CheckCircle,
    borderColor: 'border-status-free/30',
    bgColor: 'bg-status-free/10',
    iconColor: 'text-status-free',
    progressColor: 'bg-status-free',
  },
  error: {
    icon: XCircle,
    borderColor: 'border-red-500/30',
    bgColor: 'bg-red-500/10',
    iconColor: 'text-red-500',
    progressColor: 'bg-red-500',
  },
  info: {
    icon: Info,
    borderColor: 'border-status-unlocked/30',
    bgColor: 'bg-status-unlocked/10',
    iconColor: 'text-status-unlocked',
    progressColor: 'bg-status-unlocked',
  },
  warning: {
    icon: AlertTriangle,
    borderColor: 'border-status-warning/30',
    bgColor: 'bg-status-warning/10',
    iconColor: 'text-status-warning',
    progressColor: 'bg-status-warning',
  },
};

export function Toast({ toast, onRemove }: ToastProps) {
  const { id, type, title, message, duration = 4000 } = toast;
  const config = typeConfig[type];
  const Icon = config.icon;

  const [progress, setProgress] = useState(100);
  const [isPaused, setIsPaused] = useState(false);
  const startTimeRef = useRef<number>(Date.now());
  const remainingRef = useRef<number>(duration);
  const rafRef = useRef<number | null>(null);

  const handleRemove = useCallback(() => {
    onRemove(id);
  }, [id, onRemove]);

  useEffect(() => {
    const tick = () => {
      if (isPaused) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      const elapsed = Date.now() - startTimeRef.current;
      const remaining = Math.max(0, remainingRef.current - elapsed);
      const pct = (remaining / duration) * 100;
      setProgress(pct);

      if (remaining <= 0) {
        handleRemove();
        return;
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    startTimeRef.current = Date.now();
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [duration, isPaused, handleRemove]);

  const handleMouseEnter = () => {
    setIsPaused(true);
    const elapsed = Date.now() - startTimeRef.current;
    remainingRef.current = Math.max(0, remainingRef.current - elapsed);
  };

  const handleMouseLeave = () => {
    startTimeRef.current = Date.now();
    setIsPaused(false);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 60, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 60, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 350, damping: 25 }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`relative w-80 overflow-hidden rounded-lg border ${config.borderColor} ${config.bgColor} bg-bg-card/90 backdrop-blur-sm shadow-lg`}
    >
      <div className="flex items-start gap-3 p-4">
        <Icon size={20} className={`mt-0.5 shrink-0 ${config.iconColor}`} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-text-primary">{title}</p>
          {message && (
            <p className="mt-0.5 text-xs leading-relaxed text-text-secondary">
              {message}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={handleRemove}
          className="shrink-0 rounded-md p-1 text-text-muted transition-colors hover:bg-bg-elevated hover:text-text-primary"
          aria-label="Close notification"
        >
          <X size={14} />
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-1 w-full bg-bg-elevated/50">
        <motion.div
          className={`h-full ${config.progressColor}`}
          style={{ width: `${progress}%` }}
          transition={{ duration: 0 }}
        />
      </div>
    </motion.div>
  );
}
