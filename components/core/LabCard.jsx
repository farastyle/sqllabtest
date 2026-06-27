import React from 'react';

const LAB_CONFIG = {
  sqli: { emoji: '💉', color: '#667eea', gradient: 'linear-gradient(135deg, #667eea, #764ba2)' },
  xss:  { emoji: '🧪', color: '#28a745', gradient: 'linear-gradient(135deg, #28a745, #1e7e34)' },
  idor: { emoji: '🔓', color: '#fd7e14', gradient: 'linear-gradient(135deg, #fd7e14, #e8690a)' },
  main: { emoji: '🔬', color: '#667eea', gradient: 'linear-gradient(135deg, #667eea, #764ba2)' },
};

export function LabCard({ title, description, lab = 'sqli', href = '#', onClick }) {
  const cfg = LAB_CONFIG[lab] || LAB_CONFIG.sqli;

  const handleMouseEnter = (e) => {
    e.currentTarget.style.transform   = 'translateY(-2px)';
    e.currentTarget.style.boxShadow   = 'var(--shadow-card-hover, 0 6px 12px rgba(0,0,0,0.15))';
  };
  const handleMouseLeave = (e) => {
    e.currentTarget.style.transform   = '';
    e.currentTarget.style.boxShadow   = 'var(--shadow-card, 0 4px 6px rgba(0,0,0,0.1))';
  };

  return (
    <a
      href={href}
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        flex:           '1',
        minWidth:       '240px',
        display:        'block',
        textDecoration: 'none',
        background:     'var(--color-white, #fff)',
        border:         `2px solid ${cfg.color}`,
        borderRadius:   'var(--radius-md, 8px)',
        padding:        'var(--space-7, 30px)',
        textAlign:      'center',
        color:          'var(--color-text-primary, #333)',
        boxShadow:      'var(--shadow-card, 0 4px 6px rgba(0,0,0,0.1))',
        transition:     'transform 0.2s, box-shadow 0.2s',
        cursor:         'pointer',
      }}
    >
      <div style={{ fontSize: '48px', lineHeight: 1, marginBottom: '12px' }}>
        {cfg.emoji}
      </div>
      <h2 style={{
        margin:      '0 0 8px 0',
        color:       cfg.color,
        fontSize:    'var(--text-xl, 20px)',
        fontFamily:  'var(--font-sans, sans-serif)',
        fontWeight:  'var(--font-bold, 700)',
      }}>
        {title}
      </h2>
      <p style={{
        color:       'var(--color-text-muted, #666)',
        fontSize:    'var(--text-sm, 12px)',
        margin:      0,
        fontFamily:  'var(--font-sans, sans-serif)',
        lineHeight:  'var(--leading-relaxed, 1.6)',
      }}>
        {description}
      </p>
    </a>
  );
}
