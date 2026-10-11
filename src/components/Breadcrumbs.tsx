/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ChevronRight, Home } from 'lucide-react';

interface BreadcrumbsProps {
  currentView: string;
  onNavigate: (view: string) => void;
  subItem?: string;
}

const VIEW_LABELS: Record<string, string> = {
  simulation: 'Live 2D Intersection Simulation',
  security: 'IEEE 1609.2 Cryptographic Inspector',
  fleet: 'Docker Node Telemetry Fleet',
  curriculum: 'Academic Defense & Module 0.1.1',
  sources: 'Source Code & Protocol Architecture',
  domain: 'Custom Domain Setup & DNS',
  '404': '404 - Trajectory Lost',
};

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ currentView, onNavigate, subItem }) => {
  return (
    <nav
      aria-label="Breadcrumb"
      className="flex items-center gap-2 text-xs text-slate-400 py-2.5 px-4 bg-slate-900/60 border-b border-slate-800/80 backdrop-blur-sm"
      itemScope
      itemType="https://schema.org/BreadcrumbList"
    >
      <span
        itemProp="itemListElement"
        itemScope
        itemType="https://schema.org/ListItem"
        className="flex items-center"
      >
        <button
          onClick={() => onNavigate('simulation')}
          className="flex items-center gap-1.5 hover:text-cyan-400 transition-colors text-slate-300 font-medium"
          itemProp="item"
          title="Return to Simulation Overview"
        >
          <Home className="w-3.5 h-3.5 text-cyan-400" aria-label="Home icon" />
          <span itemProp="name">V2X-SecNet</span>
        </button>
        <meta itemProp="position" content="1" />
      </span>

      <ChevronRight className="w-3.5 h-3.5 text-slate-600" aria-hidden="true" />

      <span
        itemProp="itemListElement"
        itemScope
        itemType="https://schema.org/ListItem"
        className="flex items-center"
      >
        <span
          className={`font-semibold ${!subItem ? 'text-cyan-400' : 'text-slate-300'}`}
          itemProp="name"
        >
          {VIEW_LABELS[currentView] || currentView}
        </span>
        <meta itemProp="position" content="2" />
      </span>

      {subItem && (
        <>
          <ChevronRight className="w-3.5 h-3.5 text-slate-600" aria-hidden="true" />
          <span
            itemProp="itemListElement"
            itemScope
            itemType="https://schema.org/ListItem"
            className="flex items-center"
          >
            <span className="font-semibold text-cyan-400" itemProp="name">
              {subItem}
            </span>
            <meta itemProp="position" content="3" />
          </span>
        </>
      )}
    </nav>
  );
};
