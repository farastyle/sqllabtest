import React from 'react';

export interface LabCardProps {
  /** Card heading */
  title: string;
  /** Short description of the lab */
  description: string;
  /** Lab type — determines emoji and accent color */
  lab?: 'sqli' | 'xss' | 'idor' | 'main';
  /** Link target */
  href?: string;
  /** Click handler (overrides href) */
  onClick?: (e: React.MouseEvent) => void;
}

export declare function LabCard(props: LabCardProps): React.ReactElement;
