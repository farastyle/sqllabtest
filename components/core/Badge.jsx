import React from 'react';

const VARIANT_MAP = {
  sqli:    { background: 'linear-gradient(135deg, #667eea, #764ba2)', color: '#fff' },
  xss:     { background: 'var(--color-xss,             #28a745)',     color: '#fff' },
  idor:    { background: 'var(--color-idor,            #fd7e14)',     color: '#fff' },
  success: { background: 'var(--color-success-surface, #d4edda)',     color: 'var(--color-success-text, #155724)' },
  warning: { background: 'var(--color-warning-surface, #fffbea)',     color: 'var(--color-warning-text, #856404)' },
  danger:  { background: 'var(--color-danger-surface,  #f8d7da)',     color: 'var(--color-danger-text,  #721c24)' },
  info:    { background: 'var(--color-info-surface,    #f0f8ff)',     color: 'var(--color-info-text,    #004085)' },
  neutral: { background: 'var(--color-bg-secondary,   #f5f5f5)',     color: 'var(--color-text-muted,   #666)' },
};

export function Badge({ children, variant = 'neutral' }) {
  return (
    <span
      style={{
        display:      'inline-flex',
        alignItems:   'center',
        padding:      '3px 9px',
        borderRadius: 'var(--radius-full, 9999px)',
        fontSize:     'var(--text-xs, 11px)',
        fontWeight:   'var(--font-semibold, 600)',
        fontFamily:   'var(--font-sans, sans-serif)',
        lineHeight:   1.4,
        whiteSpace:   'nowrap',
        ...(VARIANT_MAP[variant] || VARIANT_MAP.neutral),
      }}
    >
      {children}
    </span>
  );
}
