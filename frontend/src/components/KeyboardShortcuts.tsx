'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Keyboard, X } from 'lucide-react';

const SHORTCUTS = [
  { key: 'F', desc: 'Toggle fullscreen' },
  { key: 'S', desc: 'Share current view' },
  { key: 'L', desc: 'Toggle layer panel' },
  { key: 'M', desc: 'Toggle markets panel' },
  { key: 'I', desc: 'Toggle intel feed' },
  { key: 'R', desc: 'Reset to global view' },
  { key: '?', desc: 'Show this help' },
  { key: 'ESC', desc: 'Close panels / popups' },
];

/**
 * Wave 4: Keyboard shortcuts reskinned as technical ledger card.
 * Chartroom palette, hairline borders, Archivo/Mono typography,
 * no glass effects or glow, collapsible with Framer Motion.
 */
export default function KeyboardShortcuts() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as Element)?.tagName)) return;
      if (e.key === '?' || (e.key === '/' && e.shiftKey)) setIsOpen(p => !p);
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="fixed inset-0 z-[500] flex items-center justify-center pointer-events-auto"
          onClick={() => setIsOpen(false)}
        >
          <div className="absolute inset-0" style={{ backgroundColor: 'rgba(246, 247, 244, 0.4)' }} />
          <motion.div
            onClick={e => e.stopPropagation()}
            className="keyboard-shortcuts-modal relative"
          >
            <div className="keyboard-shortcuts-modal__header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                <Keyboard className="w-4 h-4" style={{ color: 'var(--cobalt)' }} />
                <span>SHORTCUTS</span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                }}
                aria-label="Close shortcuts"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="keyboard-shortcuts-modal__list">
              {SHORTCUTS.map(s => (
                <div key={s.key} className="keyboard-shortcuts-modal__item">
                  <span className="keyboard-shortcuts-modal__description">{s.desc}</span>
                  <kbd className="keyboard-shortcuts-modal__key">
                    {s.key}
                  </kbd>
                </div>
              ))}
            </div>
            <div className="keyboard-shortcuts-modal__footer">
              PRESS [?] OR [ESC] TO CLOSE
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
