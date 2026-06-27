import React from 'react';

export interface BadgeProps {
  /** Label text */
  children: React.ReactNode;
  /** Color variant — lab identity or semantic status */
  variant?: 'sqli' | 'xss' | 'idor' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';
}

export declare function Badge(props: BadgeProps): React.ReactElement;
