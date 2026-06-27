import React from 'react';

const VARIANT_MAP = {
  primary:   { background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: '#fff', border: 'none' },
  success:   { background: 'var(--color-success,  #28a745)', color: '#fff', border: 'none' },
  danger:    { background: 'var(--color-danger,   #dc3545)', color: '#fff', border: 'none' },
  warning:   { background: 'var(--color-idor,     #fd7e14)', color: '#fff', border: 'none' },
  info:      { background: 'var(--color-info,     #007bff)', color: '#fff', border: 'none' },
  secondary: { background: 'var(--color-bg-secondary, #f5f5f5)', color: 'var(--color-text-primary, #333)', border: '1px solid var(--color-border, #ddd)' },
  ghost:     { background: 'transparent', color: 'var(--color-text-primary, #333)', border: '1px solid var(--color-border, #ddd)' },
};

const SIZE_MAP = {
  sm: { padding: '7px 14px',  fontSize: 'var(--text-sm,   12px)' },
  md: { padding: '12px 20px', fontSize: 'var(--text-base, 14px)' },
  lg: { padding: '14px 25px', fontSize: 'var(--text-md,   16px)' },
};

export function Button({
  children,
  variant   = 'primary',
  size      = 'md',
  disabled  = false,
  onClick,
  type      = 'button',
  fullWidth = false,
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      style={{
        display:        'inline-flex',
        alignItems:     'center',
        justifyContent: 'center',
        gap:            '6px',
        fontFamily:     'var(--font-sans, system-ui, sans-serif)',
        fontWeight:     'var(--font-bold, 700)',
        cursor:         disabled ? 'not-allowed' : 'pointer',
        borderRadius:   'var(--radius-sm, 4px)',
        opacity:        disabled ? 0.55 : 1,
        width:          fullWidth ? '100%' : 'auto',
        transition:     'opacity 0.15s, transform 0.15s',
        lineHeight:     1.2,
        textDecoration: 'none',
        ...(SIZE_MAP[size]       || SIZE_MAP.md),
        ...(VARIANT_MAP[variant] || VARIANT_MAP.primary),
      }}
    >
      {children}
    </button>
  );
}
