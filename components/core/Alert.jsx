import React from 'react';

const VARIANT_MAP = {
  info:    { border: 'var(--color-info,    #007bff)', bg: 'var(--color-info-surface,    #f0f8ff)', titleColor: 'var(--color-info-text,    #004085)' },
  success: { border: 'var(--color-success, #28a745)', bg: 'var(--color-success-surface, #d4edda)', titleColor: 'var(--color-success-text, #155724)' },
  warning: { border: 'var(--color-warning, #ffc107)', bg: 'var(--color-warning-surface, #fffbea)', titleColor: 'var(--color-warning-text, #856404)' },
  danger:  { border: 'var(--color-danger,  #dc3545)', bg: 'var(--color-danger-surface,  #f8d7da)', titleColor: 'var(--color-danger-text,  #721c24)' },
  sqli:    { border: 'var(--color-brand,   #667eea)', bg: 'var(--color-sqli-surface,    #f0f4ff)', titleColor: 'var(--color-brand,        #667eea)' },
  xss:     { border: 'var(--color-xss,     #28a745)', bg: 'var(--color-xss-surface,     #f0fff4)', titleColor: 'var(--color-xss-dark,     #1e7e34)' },
  idor:    { border: 'var(--color-idor,    #fd7e14)', bg: 'var(--color-idor-surface,    #fff8f0)', titleColor: 'var(--color-idor-dark,    #e8690a)' },
};

export function Alert({ children, variant = 'info', title }) {
  const v = VARIANT_MAP[variant] || VARIANT_MAP.info;
  return (
    <div
      style={{
        borderLeft: `4px solid ${v.border}`,
        background: v.bg,
        padding:    'var(--space-5, 20px)',
        borderRadius: 'var(--radius-sm, 4px)',
        fontFamily: 'var(--font-sans, sans-serif)',
      }}
    >
      {title && (
        <div style={{
          fontWeight:   'var(--font-bold, 700)',
          color:        v.titleColor,
          marginBottom: '8px',
          fontSize:     'var(--text-base, 14px)',
        }}>
          {title}
        </div>
      )}
      <div style={{
        color:      'var(--color-text-secondary, #555)',
        fontSize:   'var(--text-base, 14px)',
        lineHeight: 'var(--leading-relaxed, 1.6)',
      }}>
        {children}
      </div>
    </div>
  );
}
