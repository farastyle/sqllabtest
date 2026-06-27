import React from 'react';

export interface CodeBlockProps {
  /** SQL payload, query, or code content */
  children: React.ReactNode;
  /** Optional label shown above the block */
  label?: string;
  /** Border accent color */
  variant?: 'info' | 'success' | 'warning' | 'danger' | 'neutral';
}

export declare function CodeBlock(props: CodeBlockProps): React.ReactElement;
