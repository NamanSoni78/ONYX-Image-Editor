import React from 'react';
import clsx from 'clsx';

interface IconBtnProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
  color?: string;
  className?: string;
}

export const IconBtn: React.FC<IconBtnProps> = ({ icon, label, onClick, active, color, className }) => {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "flex flex-col items-center justify-center min-w-[64px] active:scale-95 transition-transform",
        active ? "text-blue-400" : "text-zinc-400 hover:text-zinc-200",
        className
      )}
    >
      <div
        className={clsx(
          "w-10 h-10 rounded-xl flex items-center justify-center text-lg mb-1 transition-colors",
          active ? "bg-blue-500/20" : "bg-zinc-800/50 hover:bg-zinc-800"
        )}
        style={{ color: color }}
      >
        {icon}
      </div>
      <span className="text-[9px] font-bold tracking-wide uppercase">{label}</span>
    </button>
  );
};
