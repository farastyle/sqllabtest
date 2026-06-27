import React from 'react';

export interface AlertProps {
  /** Panel content */
  children: React.ReactNode;
  /** Color/context variant */
  variant?: 'info' | 'success' | 'warning' | 'danger' | 'sqli' | 'xss' | 'idor';
  /** Optional bold title line above content */
  title?: string;
}

export declare function Alert(props: AlertProps): React.ReactElement;
