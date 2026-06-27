import React from 'react';

export interface ButtonProps {
  /** Button label / content */
  children: React.ReactNode;
  /** Visual style */
  variant?: 'primary' | 'success' | 'danger' | 'warning' | 'info' | 'secondary' | 'ghost';
  /** Size preset */
  size?: 'sm' | 'md' | 'lg';
  /** Disabled state */
  disabled?: boolean;
  /** Click handler */
  onClick?: () => void;
  /** HTML button type */
  type?: 'button' | 'submit' | 'reset';
  /** Stretch to container width */
  fullWidth?: boolean;
}

export declare function Button(props: ButtonProps): React.ReactElement;
