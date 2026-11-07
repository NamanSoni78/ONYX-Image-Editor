import React from 'react';

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  /** Formatting for the value chip, e.g. v => `${Math.round(v*100)}%` */
  format?: (v: number) => string;
  /** Value restored on double-click of the label */
  defaultVal?: number;
  /** Fired once when the user releases the slider (commit to history) */
  onCommit?: (val: number) => void;
  onChange: (val: number) => void;
  compact?: boolean;
}

export const Slider: React.FC<SliderProps> = ({
  label,
  value,
  min,
  max,
  step = 1,
  format,
  defaultVal,
  onCommit,
  onChange,
  compact,
}) => {
  const display = format ? format(value) : String(Math.round(value * 100) / 100);

  return (
    <div className={compact ? 'w-full' : 'mb-3 w-full'}>
      <div className="mb-1.5 flex items-center justify-between">
        <button
          type="button"
          onDoubleClick={() => {
            if (defaultVal === undefined) return;
            onChange(defaultVal);
            // The reset is a real value change — it MUST land in history, or the
            // next Ctrl+Z undoes a much older action (e.g. the image IMPORT —
            // the user's image "disappears" after adjusting + one undo).
            onCommit?.(defaultVal);
          }}
          title={defaultVal !== undefined ? 'Double-click to reset' : undefined}
          className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 transition-colors hover:text-zinc-200"
        >
          {label}
        </button>
        <span className="rounded bg-zinc-800/80 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-zinc-300">
          {display}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={label}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        onPointerUp={() => onCommit?.(value)}
        onKeyUp={(e) => {
          // EVERY key that can change a range input's value must commit —
          // committing only ArrowLeft/Right left ArrowUp/Down/PageUp/PageDown/
          // Home/End changes uncommitted, so one Ctrl+Z reverted them together
          // with a much older action.
          if (
            e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown' ||
            e.key === 'PageUp' || e.key === 'PageDown' || e.key === 'Home' || e.key === 'End'
          ) {
            onCommit?.(value);
          }
        }}
        className="onyx-range w-full"
      />
    </div>
  );
};
