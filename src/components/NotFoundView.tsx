/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Radio, Search, ArrowRight, Home, ShieldCheck, Car, Cpu } from 'lucide-react';

interface NotFoundViewProps {
  onNavigate: (view: string) => void;
}

export const NotFoundView: React.FC<NotFoundViewProps> = ({ onNavigate }) => {
  const [searchQuery, setSearchQuery] = useState('');

  const quickLinks = [
    { id: 'simulation', label: 'Live Intersection Simulation', icon: Car, desc: 'Zero-traffic-light coordination' },
    { id: 'security', label: 'V2X Cryptographic Inspector', icon: ShieldCheck, desc: 'ECDSA BSM packet analyzer' },
    { id: 'fleet', label: 'Dockerized Vehicle Nodes', icon: Cpu, desc: 'Containerized Java microservices' },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-8">
      {/* 404 Radar Visual */}
      <div className="relative w-40 h-40 mx-auto flex items-center justify-center">
        <div className="absolute inset-0 rounded-full border border-cyan-500/20 animate-ping" />
        <div className="absolute inset-2 rounded-full border border-cyan-500/30" />
        <div className="absolute inset-6 rounded-full border border-blue-500/40 border-dashed" />
        <div className="w-16 h-16 rounded-full bg-slate-900 border border-cyan-500/50 flex items-center justify-center shadow-lg shadow-cyan-900/40 text-cyan-400">
          <Radio className="w-8 h-8 animate-pulse" />
        </div>
      </div>

      <div className="space-y-3">
        <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-rose-950/80 text-rose-400 border border-rose-800">
          HTTP 404 - PACKET_ROUTING_FAILED
        </span>
        <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
          Trajectory Disconnected: Route Not Found
        </h1>
        <p className="text-slate-400 text-sm max-w-xl mx-auto leading-relaxed">
          The requested path does not map to any recognized coordinate, conflict zone slot, or V2X communication module in the current spatial topology.
        </p>
      </div>

      {/* Search Input for recovery */}
      <div className="max-w-md mx-auto">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search simulation modules, cryptography, nodes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
          />
        </div>
      </div>

      {/* Suggested Internal Links */}
      <div className="max-w-2xl mx-auto space-y-3 pt-4">
        <span className="text-xs uppercase font-bold tracking-wider text-slate-400">
          Recommended Navigation Recovery
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {quickLinks.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate(item.id);
                  window.location.hash = item.id;
                }}
                className="bg-slate-900/80 border border-slate-800 hover:border-cyan-500/50 p-4 rounded-xl text-left transition-all group cursor-pointer"
              >
                <Icon className="w-5 h-5 text-cyan-400 mb-2 group-hover:scale-110 transition-transform" />
                <h2 className="text-xs font-bold text-white group-hover:text-cyan-300">
                  {item.label}
                </h2>
                <p className="text-[11px] text-slate-400 mt-1">{item.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <button
          onClick={() => {
            onNavigate('simulation');
            window.location.hash = 'simulation';
          }}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-colors cursor-pointer"
        >
          <Home className="w-4 h-4" />
          <span>Return to Primary Intersection</span>
        </button>
      </div>
    </div>
  );
};
