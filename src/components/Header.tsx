/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  Radio, 
  ShieldCheck, 
  Activity, 
  Cpu, 
  GraduationCap, 
  Code2, 
  Globe, 
  Car,
  AlertTriangle
} from 'lucide-react';

interface HeaderProps {
  currentView: string;
  onNavigate: (view: string) => void;
  activeVehicleCount: number;
  avgLatencyMs: number;
  activeAttack: string;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onNavigate,
  activeVehicleCount,
  avgLatencyMs,
  activeAttack,
}) => {
  const navItems = [
    { id: 'simulation', label: 'Intersection Simulation', icon: Car, href: '#simulation' },
    { id: 'security', label: 'Crypto & Attack Lab', icon: ShieldCheck, href: '#security' },
    { id: 'fleet', label: 'Docker Fleet Nodes', icon: Cpu, href: '#fleet' },
    { id: 'curriculum', label: 'Curriculum & Defense', icon: GraduationCap, href: '#curriculum' },
    { id: 'sources', label: 'Source Architecture', icon: Code2, href: '#sources' },
  ];

  return (
    <header className="border-b border-slate-800 bg-slate-950/90 backdrop-blur sticky top-0 z-40">
      {/* Top Banner / System State Bar */}
      <div className="bg-slate-900/90 text-xs px-4 py-1.5 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-slate-400">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Zero-Traffic-Light Coordination: Active
          </span>
          <span className="hidden sm:inline-block text-slate-700">|</span>
          <span className="flex items-center gap-1 text-slate-300">
            <Radio className="w-3.5 h-3.5 text-cyan-400" />
            Direct Sidelink (PC5/DSRC): 5.9 GHz ITS Band
          </span>
          <span className="hidden md:inline-block text-slate-700">|</span>
          <span className="hidden md:flex items-center gap-1 text-slate-300">
            <Activity className="w-3.5 h-3.5 text-blue-400" />
            Packet Latency: <strong className="text-white font-mono">{avgLatencyMs} ms</strong>
          </span>
        </div>

        <div className="flex items-center gap-3">
          {activeAttack !== 'NONE' && (
            <span className="flex items-center gap-1 text-rose-400 bg-rose-950/60 px-2 py-0.5 rounded border border-rose-800 font-semibold animate-pulse">
              <AlertTriangle className="w-3 h-3" />
              Attack Injected: {activeAttack}
            </span>
          )}
          <button
            onClick={() => onNavigate('domain')}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-800/50 hover:border-cyan-500 transition-all font-medium text-xs cursor-pointer"
            title="Connect a Custom Domain to this application"
          >
            <Globe className="w-3.5 h-3.5 text-cyan-400" />
            Connect Custom Domain
          </button>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <div 
          onClick={() => onNavigate('simulation')}
          className="flex items-center gap-3 cursor-pointer group"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && onNavigate('simulation')}
          aria-label="V2X-SecNet Home"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 via-blue-600 to-emerald-500 p-0.5 shadow-lg shadow-cyan-900/30 group-hover:scale-105 transition-transform">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Radio className="w-5 h-5 text-cyan-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg tracking-tight text-white group-hover:text-cyan-300 transition-colors">
                V2X-SecNet
              </span>
              <span className="px-1.5 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
                IEEE 1609.2
              </span>
            </div>
            <p className="text-[11px] text-slate-400 line-clamp-1">
              Autonomous Vehicle Mesh &amp; Merging Protocol
            </p>
          </div>
        </div>

        {/* Navigation Tabs / Internal Links */}
        <nav className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto py-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = currentView === item.id;
            return (
              <a
                key={item.id}
                href={item.href}
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate(item.id);
                  window.location.hash = item.id;
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                  active
                    ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-500/10'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${active ? 'text-cyan-400' : 'text-slate-500'}`} />
                <span>{item.label}</span>
                {item.id === 'fleet' && (
                  <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-300 border border-slate-700">
                    {activeVehicleCount}
                  </span>
                )}
              </a>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
