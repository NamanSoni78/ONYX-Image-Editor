import React from 'react';
import clsx from 'clsx';

interface TooltipProps {
  label: string;
  /** Keyboard shortcut hint shown in a kbd chip, e.g. "Ctrl+Z" */
  shortcut?: string;
  side?: 'top' | 'right' | 'bottom' | 'left';
  children: React.ReactNode;
  className?: string;
}

/**
 * CSS-only tooltip (no JS, no re-renders). Wrap any element.
 * Hidden on touch devices via hover media query.
 */
export const Tooltip: React.FC<TooltipProps> = ({ label, shortcut, side = 'right', children, className }) => {
  return (
    <span className={clsx('group/tt relative inline-flex', className)}>
      {children}
      <span
        role="tooltip"
        className={clsx(
          'pointer-events-none absolute z-[130] hidden items-center gap-1.5 whitespace-nowrap rounded-lg border border-white/10 bg-zinc-950/95 px-2.5 py-1.5 text-[11px] font-semibold text-zinc-100 shadow-xl opacity-0 transition-opacity duration-150 group-hover/tt:opacity-100 group-focus-within/tt:opacity-100',
          '[@media(hover:hover)]:flex',
          side === 'right' && 'left-full top-1/2 ml-2.5 -translate-y-1/2',
          side === 'left' && 'right-full top-1/2 mr-2.5 -translate-y-1/2',
          side === 'top' && 'bottom-full left-1/2 mb-2.5 -translate-x-1/2',
          side === 'bottom' && 'top-full left-1/2 mt-2.5 -translate-x-1/2'
        )}
      >
        {label}
        {shortcut && (
          <kbd className="rounded border border-white/15 bg-white/10 px-1 py-px font-mono text-[9px] text-zinc-300">
            {shortcut}
          </kbd>
        )}
      </span>
    </span>
  );
};
