import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'neutral' | 'success' | 'warning' | 'danger' | 'info';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'neutral', size = 'sm' }) => {
  const sizeClass = size === 'sm' ? 'px-2 py-1 text-[12px]' : 'px-2.5 py-1 text-[13px]';

  let colorStyle = 'text-[#6F6B63] border-[#D8D0C4] bg-[#FBF8F2]';
  if (variant === 'success') {
    colorStyle = 'text-[#4F6B57] border-[#4F6B57]/30 bg-[#4F6B57]/5';
  } else if (variant === 'warning') {
    colorStyle = 'text-[#A16D35] border-[#A16D35]/30 bg-[#A16D35]/5';
  } else if (variant === 'danger') {
    colorStyle = 'text-[#9E4A43] border-[#9E4A43]/30 bg-[#9E4A43]/5';
  } else if (variant === 'info') {
    colorStyle = 'text-[#5D6F7E] border-[#5D6F7E]/30 bg-[#5D6F7E]/5';
  }

  return (
    <span className={`inline-flex items-center font-sans font-medium border rounded-xs ${sizeClass} ${colorStyle}`}>
      {children}
    </span>
  );
};

export const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const s = status.toLowerCase();

  let dotColor = '#6F6B63';
  let label = status;

  if (['active', 'completed', 'paid', 'success', 'confirmed'].includes(s)) {
    dotColor = '#4F6B57'; // muted sage
  } else if (['pending', 'queued', 'received', 'processing', 'generating', 'branding', 'sending'].includes(s)) {
    dotColor = '#5D6F7E'; // muted slate
  } else if (['deletion_pending', 'expired', 'cancelled', 'refunded', 'manual_review'].includes(s)) {
    dotColor = '#A16D35'; // muted amber
  } else if (['blocked', 'blocked_input', 'blocked_output', 'failed', 'suspended', 'deleted'].includes(s)) {
    dotColor = '#9E4A43'; // muted terracotta
  }

  return (
    <span className="inline-flex items-center gap-1.5 font-sans text-[13px] font-medium text-[#1D1D1A]">
      <span
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{ backgroundColor: dotColor }}
      />
      <span className="capitalize">{label.replace(/_/g, ' ')}</span>
    </span>
  );
};
