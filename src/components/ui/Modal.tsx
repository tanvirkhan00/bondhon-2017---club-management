import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';
import { ModalLottie } from './ModalLottie';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  lottieSrc?: string;
  lottieSuccess?: boolean;
  lottieSpeed?: number;
  maxWidthClass?: string;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  lottieSrc,
  lottieSuccess = false,
  lottieSpeed = 1,
  maxWidthClass = 'max-w-lg',
  children,
}) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-heading"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            onClick={onClose}
            className="fixed inset-0 bg-[#14243A]/65 backdrop-blur-[3px]"
          />

          {/* Dialog Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 6 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className={`relative z-10 w-full ${maxWidthClass} bg-white dark:bg-[#111C2D] rounded-2xl border border-[#E8EDF3] dark:border-[#1F2F46] shadow-[0_20px_50px_-12px_rgba(20,36,58,0.35)] overflow-hidden flex flex-col max-h-[92vh]`}
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-4 border-b border-[#E8EDF3] dark:border-[#1F2F46] bg-[#F8FAFC]/80 dark:bg-[#14243A]/60 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                {lottieSrc ? (
                  <div className="w-11 h-11 rounded-xl bg-white dark:bg-slate-100/95 border border-[#E8EDF3] dark:border-[#2B4564] flex items-center justify-center p-1 shrink-0 overflow-hidden shadow-2xs">
                    <ModalLottie
                      src={lottieSrc}
                      isSuccess={lottieSuccess}
                      speed={lottieSpeed}
                      fallbackIcon={
                        <span className="text-[#087F70] flex items-center justify-center">
                          {icon}
                        </span>
                      }
                      className="w-full h-full"
                    />
                  </div>
                ) : (
                  icon && (
                    <div className="w-9 h-9 rounded-xl bg-[#087F70]/10 dark:bg-[#087F70]/20 text-[#087F70] dark:text-[#34D399] border border-[#087F70]/20 flex items-center justify-center shrink-0">
                      {icon}
                    </div>
                  )
                )}
                <div className="min-w-0">
                  <h2
                    id="modal-heading"
                    className="text-base font-bold text-[#172435] dark:text-slate-100 truncate"
                  >
                    {title}
                  </h2>
                  {subtitle && (
                    <p className="text-[11px] text-[#64748B] dark:text-slate-400 truncate mt-0.5">
                      {subtitle}
                    </p>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label="Close modal"
                className="p-2 rounded-lg text-[#64748B] hover:text-[#172435] dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-[#203650] transition-colors cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="p-5 sm:p-6 overflow-y-auto">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
