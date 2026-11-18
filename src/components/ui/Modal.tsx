import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';
import { ModalLottie } from './ModalLottie';

// Track open modals safely so body scroll lock can never get stuck as 'hidden'
let openModalCount = 0;

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

    openModalCount += 1;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      openModalCount = Math.max(0, openModalCount - 1);
      if (openModalCount === 0) {
        document.body.style.overflow = '';
      }
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="modal-root"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-heading"
        >
          {/* Backdrop */}
          <div
            onClick={onClose}
            className="fixed inset-0 bg-[#09101D]/65 backdrop-blur-[3px]"
          />

          {/* Dialog Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 6 }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
            className={`relative z-10 w-full ${maxWidthClass} bg-white dark:bg-[#111B2E] rounded-2xl border border-[#DFE6F0] dark:border-[#233452] shadow-[0_20px_50px_-12px_rgba(9,16,29,0.4)] overflow-hidden flex flex-col max-h-[92vh]`}
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-4 border-b border-[#DFE6F0] dark:border-[#233452] bg-[#EFF3F9]/80 dark:bg-[#0F1B33]/65 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                {lottieSrc ? (
                  <div className="w-11 h-11 rounded-xl bg-white dark:bg-slate-100/95 border border-[#DFE6F0] dark:border-[#223862] flex items-center justify-center p-1 shrink-0 overflow-hidden shadow-2xs">
                    <ModalLottie
                      src={lottieSrc}
                      isSuccess={lottieSuccess}
                      speed={lottieSpeed}
                      fallbackIcon={
                        <span className="text-[#1D4ED8] flex items-center justify-center">
                          {icon}
                        </span>
                      }
                      className="w-full h-full"
                    />
                  </div>
                ) : (
                  icon && (
                    <div className="w-9 h-9 rounded-xl bg-[#1D4ED8]/10 dark:bg-[#60A5FA]/15 text-[#1D4ED8] dark:text-[#60A5FA] border border-[#1D4ED8]/20 dark:border-[#60A5FA]/30 flex items-center justify-center shrink-0">
                      {icon}
                    </div>
                  )
                )}
                <div className="min-w-0">
                  <h2
                    id="modal-heading"
                    className="text-base font-bold text-[#0F1B2E] dark:text-[#F3F6FC] truncate"
                  >
                    {title}
                  </h2>
                  {subtitle && (
                    <p className="text-[11px] text-[#4E5E78] dark:text-[#9BB0CD] truncate mt-0.5">
                      {subtitle}
                    </p>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label="Close modal"
                className="p-2 rounded-lg text-[#4E5E78] dark:text-[#9BB0CD] hover:text-[#0F1B2E] dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-[#18294A] transition-colors cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="p-5 sm:p-6 overflow-y-auto">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
