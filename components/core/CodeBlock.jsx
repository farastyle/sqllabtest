import React from 'react';

export function CodeBlock({ children, label, variant = 'info' }) {
  const borderColors = {
    info:    'var(--color-info-dark,  #0056b3)',
    success: 'var(--color-xss-dark,  #1e7e34)',
    warning: 'var(--color-warning,   #ffc107)',
    danger:  'var(--color-danger,    #dc3545)',
    neutral: 'var(--color-border,    #ddd)',
  };

  return (
    <div style={{ fontFamily: 'var(--font-sans, sans-serif)' }}>
      {label && (
        <p style={{
          margin:     '0 0 6px 0',
          color:      'var(--color-text-secondary, #555)',
          fontSize:   'var(--text-sm, 12px)',
          fontWeight: 'var(--font-semibold, 600)',
        }}>
          {label}
        </p>
      )}
      <code style={{
        display:     'block',
        background:  'var(--color-white, #fff)',
        padding:     '10px 12px',
        borderRadius:'var(--radius-sm, 4px)',
        border:      `1px solid ${borderColors[variant] || borderColors.info}`,
        fontFamily:  'var(--font-mono, monospace)',
        fontSize:    'var(--text-sm, 12px)',
        lineHeight:  'var(--leading-relaxed, 1.6)',
        color:       'var(--color-text-primary, #333)',
        overflowX:   'auto',
        wordBreak:   'break-all',
        whiteSpace:  'pre-wrap',
      }}>
        {children}
      </code>
    </div>
  );
}
