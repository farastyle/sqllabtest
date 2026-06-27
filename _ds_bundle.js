/* @ds-bundle: {"format":3,"namespace":"LabSecDesignSystem_8cfb49","components":[{"name":"Alert","sourcePath":"components/core/Alert.jsx"},{"name":"Badge","sourcePath":"components/core/Badge.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"CodeBlock","sourcePath":"components/core/CodeBlock.jsx"},{"name":"LabCard","sourcePath":"components/core/LabCard.jsx"}],"sourceHashes":{"components/core/Alert.jsx":"71bb5a8cf056","components/core/Badge.jsx":"5684899c8b64","components/core/Button.jsx":"cfcbf56c0212","components/core/CodeBlock.jsx":"16b44a36861f","components/core/LabCard.jsx":"52a893120323"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.LabSecDesignSystem_8cfb49 = window.LabSecDesignSystem_8cfb49 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/core/Alert.jsx
try { (() => {
const VARIANT_MAP = {
  info: {
    border: 'var(--color-info,    #007bff)',
    bg: 'var(--color-info-surface,    #f0f8ff)',
    titleColor: 'var(--color-info-text,    #004085)'
  },
  success: {
    border: 'var(--color-success, #28a745)',
    bg: 'var(--color-success-surface, #d4edda)',
    titleColor: 'var(--color-success-text, #155724)'
  },
  warning: {
    border: 'var(--color-warning, #ffc107)',
    bg: 'var(--color-warning-surface, #fffbea)',
    titleColor: 'var(--color-warning-text, #856404)'
  },
  danger: {
    border: 'var(--color-danger,  #dc3545)',
    bg: 'var(--color-danger-surface,  #f8d7da)',
    titleColor: 'var(--color-danger-text,  #721c24)'
  },
  sqli: {
    border: 'var(--color-brand,   #667eea)',
    bg: 'var(--color-sqli-surface,    #f0f4ff)',
    titleColor: 'var(--color-brand,        #667eea)'
  },
  xss: {
    border: 'var(--color-xss,     #28a745)',
    bg: 'var(--color-xss-surface,     #f0fff4)',
    titleColor: 'var(--color-xss-dark,     #1e7e34)'
  },
  idor: {
    border: 'var(--color-idor,    #fd7e14)',
    bg: 'var(--color-idor-surface,    #fff8f0)',
    titleColor: 'var(--color-idor-dark,    #e8690a)'
  }
};
function Alert({
  children,
  variant = 'info',
  title
}) {
  const v = VARIANT_MAP[variant] || VARIANT_MAP.info;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      borderLeft: `4px solid ${v.border}`,
      background: v.bg,
      padding: 'var(--space-5, 20px)',
      borderRadius: 'var(--radius-sm, 4px)',
      fontFamily: 'var(--font-sans, sans-serif)'
    }
  }, title && /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 'var(--font-bold, 700)',
      color: v.titleColor,
      marginBottom: '8px',
      fontSize: 'var(--text-base, 14px)'
    }
  }, title), /*#__PURE__*/React.createElement("div", {
    style: {
      color: 'var(--color-text-secondary, #555)',
      fontSize: 'var(--text-base, 14px)',
      lineHeight: 'var(--leading-relaxed, 1.6)'
    }
  }, children));
}
Object.assign(__ds_scope, { Alert });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Alert.jsx", error: String((e && e.message) || e) }); }

// components/core/Badge.jsx
try { (() => {
const VARIANT_MAP = {
  sqli: {
    background: 'linear-gradient(135deg, #667eea, #764ba2)',
    color: '#fff'
  },
  xss: {
    background: 'var(--color-xss,             #28a745)',
    color: '#fff'
  },
  idor: {
    background: 'var(--color-idor,            #fd7e14)',
    color: '#fff'
  },
  success: {
    background: 'var(--color-success-surface, #d4edda)',
    color: 'var(--color-success-text, #155724)'
  },
  warning: {
    background: 'var(--color-warning-surface, #fffbea)',
    color: 'var(--color-warning-text, #856404)'
  },
  danger: {
    background: 'var(--color-danger-surface,  #f8d7da)',
    color: 'var(--color-danger-text,  #721c24)'
  },
  info: {
    background: 'var(--color-info-surface,    #f0f8ff)',
    color: 'var(--color-info-text,    #004085)'
  },
  neutral: {
    background: 'var(--color-bg-secondary,   #f5f5f5)',
    color: 'var(--color-text-muted,   #666)'
  }
};
function Badge({
  children,
  variant = 'neutral'
}) {
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      padding: '3px 9px',
      borderRadius: 'var(--radius-full, 9999px)',
      fontSize: 'var(--text-xs, 11px)',
      fontWeight: 'var(--font-semibold, 600)',
      fontFamily: 'var(--font-sans, sans-serif)',
      lineHeight: 1.4,
      whiteSpace: 'nowrap',
      ...(VARIANT_MAP[variant] || VARIANT_MAP.neutral)
    }
  }, children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Badge.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
const VARIANT_MAP = {
  primary: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: '#fff',
    border: 'none'
  },
  success: {
    background: 'var(--color-success,  #28a745)',
    color: '#fff',
    border: 'none'
  },
  danger: {
    background: 'var(--color-danger,   #dc3545)',
    color: '#fff',
    border: 'none'
  },
  warning: {
    background: 'var(--color-idor,     #fd7e14)',
    color: '#fff',
    border: 'none'
  },
  info: {
    background: 'var(--color-info,     #007bff)',
    color: '#fff',
    border: 'none'
  },
  secondary: {
    background: 'var(--color-bg-secondary, #f5f5f5)',
    color: 'var(--color-text-primary, #333)',
    border: '1px solid var(--color-border, #ddd)'
  },
  ghost: {
    background: 'transparent',
    color: 'var(--color-text-primary, #333)',
    border: '1px solid var(--color-border, #ddd)'
  }
};
const SIZE_MAP = {
  sm: {
    padding: '7px 14px',
    fontSize: 'var(--text-sm,   12px)'
  },
  md: {
    padding: '12px 20px',
    fontSize: 'var(--text-base, 14px)'
  },
  lg: {
    padding: '14px 25px',
    fontSize: 'var(--text-md,   16px)'
  }
};
function Button({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  onClick,
  type = 'button',
  fullWidth = false
}) {
  return /*#__PURE__*/React.createElement("button", {
    type: type,
    disabled: disabled,
    onClick: onClick,
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '6px',
      fontFamily: 'var(--font-sans, system-ui, sans-serif)',
      fontWeight: 'var(--font-bold, 700)',
      cursor: disabled ? 'not-allowed' : 'pointer',
      borderRadius: 'var(--radius-sm, 4px)',
      opacity: disabled ? 0.55 : 1,
      width: fullWidth ? '100%' : 'auto',
      transition: 'opacity 0.15s, transform 0.15s',
      lineHeight: 1.2,
      textDecoration: 'none',
      ...(SIZE_MAP[size] || SIZE_MAP.md),
      ...(VARIANT_MAP[variant] || VARIANT_MAP.primary)
    }
  }, children);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/CodeBlock.jsx
try { (() => {
function CodeBlock({
  children,
  label,
  variant = 'info'
}) {
  const borderColors = {
    info: 'var(--color-info-dark,  #0056b3)',
    success: 'var(--color-xss-dark,  #1e7e34)',
    warning: 'var(--color-warning,   #ffc107)',
    danger: 'var(--color-danger,    #dc3545)',
    neutral: 'var(--color-border,    #ddd)'
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-sans, sans-serif)'
    }
  }, label && /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '0 0 6px 0',
      color: 'var(--color-text-secondary, #555)',
      fontSize: 'var(--text-sm, 12px)',
      fontWeight: 'var(--font-semibold, 600)'
    }
  }, label), /*#__PURE__*/React.createElement("code", {
    style: {
      display: 'block',
      background: 'var(--color-white, #fff)',
      padding: '10px 12px',
      borderRadius: 'var(--radius-sm, 4px)',
      border: `1px solid ${borderColors[variant] || borderColors.info}`,
      fontFamily: 'var(--font-mono, monospace)',
      fontSize: 'var(--text-sm, 12px)',
      lineHeight: 'var(--leading-relaxed, 1.6)',
      color: 'var(--color-text-primary, #333)',
      overflowX: 'auto',
      wordBreak: 'break-all',
      whiteSpace: 'pre-wrap'
    }
  }, children));
}
Object.assign(__ds_scope, { CodeBlock });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/CodeBlock.jsx", error: String((e && e.message) || e) }); }

// components/core/LabCard.jsx
try { (() => {
const LAB_CONFIG = {
  sqli: {
    emoji: '💉',
    color: '#667eea',
    gradient: 'linear-gradient(135deg, #667eea, #764ba2)'
  },
  xss: {
    emoji: '🧪',
    color: '#28a745',
    gradient: 'linear-gradient(135deg, #28a745, #1e7e34)'
  },
  idor: {
    emoji: '🔓',
    color: '#fd7e14',
    gradient: 'linear-gradient(135deg, #fd7e14, #e8690a)'
  },
  main: {
    emoji: '🔬',
    color: '#667eea',
    gradient: 'linear-gradient(135deg, #667eea, #764ba2)'
  }
};
function LabCard({
  title,
  description,
  lab = 'sqli',
  href = '#',
  onClick
}) {
  const cfg = LAB_CONFIG[lab] || LAB_CONFIG.sqli;
  const handleMouseEnter = e => {
    e.currentTarget.style.transform = 'translateY(-2px)';
    e.currentTarget.style.boxShadow = 'var(--shadow-card-hover, 0 6px 12px rgba(0,0,0,0.15))';
  };
  const handleMouseLeave = e => {
    e.currentTarget.style.transform = '';
    e.currentTarget.style.boxShadow = 'var(--shadow-card, 0 4px 6px rgba(0,0,0,0.1))';
  };
  return /*#__PURE__*/React.createElement("a", {
    href: href,
    onClick: onClick,
    onMouseEnter: handleMouseEnter,
    onMouseLeave: handleMouseLeave,
    style: {
      flex: '1',
      minWidth: '240px',
      display: 'block',
      textDecoration: 'none',
      background: 'var(--color-white, #fff)',
      border: `2px solid ${cfg.color}`,
      borderRadius: 'var(--radius-md, 8px)',
      padding: 'var(--space-7, 30px)',
      textAlign: 'center',
      color: 'var(--color-text-primary, #333)',
      boxShadow: 'var(--shadow-card, 0 4px 6px rgba(0,0,0,0.1))',
      transition: 'transform 0.2s, box-shadow 0.2s',
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '48px',
      lineHeight: 1,
      marginBottom: '12px'
    }
  }, cfg.emoji), /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: '0 0 8px 0',
      color: cfg.color,
      fontSize: 'var(--text-xl, 20px)',
      fontFamily: 'var(--font-sans, sans-serif)',
      fontWeight: 'var(--font-bold, 700)'
    }
  }, title), /*#__PURE__*/React.createElement("p", {
    style: {
      color: 'var(--color-text-muted, #666)',
      fontSize: 'var(--text-sm, 12px)',
      margin: 0,
      fontFamily: 'var(--font-sans, sans-serif)',
      lineHeight: 'var(--leading-relaxed, 1.6)'
    }
  }, description));
}
Object.assign(__ds_scope, { LabCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/LabCard.jsx", error: String((e && e.message) || e) }); }

__ds_ns.Alert = __ds_scope.Alert;

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.CodeBlock = __ds_scope.CodeBlock;

__ds_ns.LabCard = __ds_scope.LabCard;

})();
