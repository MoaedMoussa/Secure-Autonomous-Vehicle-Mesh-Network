/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Shield, Radio, Server, GraduationCap, MapPin, Phone, Mail, Award } from 'lucide-react';

interface FooterProps {
  onNavigate: (view: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer className="border-t border-slate-800/80 bg-slate-950 mt-16 text-slate-400 text-xs">
      <div className="max-w-7xl mx-auto px-4 py-12 grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Lab / Identity Information */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-cyan-600/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Radio className="w-3.5 h-3.5" />
            </div>
            <span className="font-bold text-white text-sm">V2X-SecNet Research Platform</span>
          </div>
          <p className="text-slate-400 text-xs leading-relaxed">
            Autonomous Cyber-Physical Security Systems Lab. Engineering zero-traffic-light intersection coordination through decentralized peer-to-peer telemetry and cryptographically verified IEEE 1609.2 security envelopes.
          </p>
          <div className="space-y-1 text-slate-500 text-[11px] pt-1">
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3 h-3 text-slate-400" />
              <span>400 Cybernetics Pkwy, Silicon Valley, CA 94025</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Phone className="w-3 h-3 text-slate-400" />
              <span>+1 (650) 555-0199</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Mail className="w-3 h-3 text-slate-400" />
              <span>lab@autonomous-mesh.org</span>
            </div>
          </div>
        </div>

        {/* Quick Navigation / Internal Links */}
        <div>
          <h4 className="font-semibold text-white mb-3 text-xs uppercase tracking-wider text-cyan-400">
            Platform Modules
          </h4>
          <ul className="space-y-2">
            <li>
              <a
                href="#simulation"
                onClick={(e) => { e.preventDefault(); onNavigate('simulation'); }}
                className="hover:text-cyan-300 transition-colors flex items-center gap-1.5"
              >
                <span>Intersection Dynamic Simulation</span>
              </a>
            </li>
            <li>
              <a
                href="#security"
                onClick={(e) => { e.preventDefault(); onNavigate('security'); }}
                className="hover:text-cyan-300 transition-colors flex items-center gap-1.5"
              >
                <span>IEEE 1609.2 Crypto &amp; Attack Lab</span>
              </a>
            </li>
            <li>
              <a
                href="#fleet"
                onClick={(e) => { e.preventDefault(); onNavigate('fleet'); }}
                className="hover:text-cyan-300 transition-colors flex items-center gap-1.5"
              >
                <span>Docker Containerized Vehicle Fleet</span>
              </a>
            </li>
            <li>
              <a
                href="#curriculum"
                onClick={(e) => { e.preventDefault(); onNavigate('curriculum'); }}
                className="hover:text-cyan-300 transition-colors flex items-center gap-1.5"
              >
                <span>Module 0.1.1 Academic Defense</span>
              </a>
            </li>
            <li>
              <a
                href="#sources"
                onClick={(e) => { e.preventDefault(); onNavigate('sources'); }}
                className="hover:text-cyan-300 transition-colors flex items-center gap-1.5"
              >
                <span>Java Node &amp; Protocol Architecture</span>
              </a>
            </li>
            <li>
              <a
                href="#domain"
                onClick={(e) => { e.preventDefault(); onNavigate('domain'); }}
                className="hover:text-cyan-300 transition-colors flex items-center gap-1.5"
              >
                <span>Connect Custom Domain &amp; DNS</span>
              </a>
            </li>
          </ul>
        </div>

        {/* Standards & Protocols */}
        <div>
          <h4 className="font-semibold text-white mb-3 text-xs uppercase tracking-wider text-cyan-400">
            Protocols &amp; Standards
          </h4>
          <ul className="space-y-1.5 text-slate-400 text-xs">
            <li className="flex items-center gap-2">
              <Award className="w-3.5 h-3.5 text-emerald-400" />
              <span>SAE J2735: Basic Safety Message (BSM)</span>
            </li>
            <li className="flex items-center gap-2">
              <Shield className="w-3.5 h-3.5 text-cyan-400" />
              <span>IEEE 1609.2: V2X Cryptographic Security</span>
            </li>
            <li className="flex items-center gap-2">
              <Radio className="w-3.5 h-3.5 text-blue-400" />
              <span>3GPP Rel 15 / PC5 Direct Sidelink</span>
            </li>
            <li className="flex items-center gap-2">
              <Server className="w-3.5 h-3.5 text-indigo-400" />
              <span>DSRC IEEE 802.11p 5.9 GHz ITS</span>
            </li>
            <li className="flex items-center gap-2">
              <GraduationCap className="w-3.5 h-3.5 text-amber-400" />
              <span>Core Module 0.1.1 Car-to-Car Comm</span>
            </li>
          </ul>
        </div>

        {/* Security & System Info */}
        <div className="space-y-2">
          <h4 className="font-semibold text-white mb-3 text-xs uppercase tracking-wider text-cyan-400">
            Security Guarantee
          </h4>
          <p className="text-slate-400 text-xs leading-relaxed">
            All broadcast messages are protected by hardware-accelerated ECDSA NIST P-256 signatures with monotonic timestamp verification windows (&lt;50ms) to ensure resilience against replay attacks, GPS spoofing, and malicious telemetry alteration.
          </p>
          <div className="p-2.5 rounded bg-slate-900 border border-slate-800 text-[11px] text-slate-300">
            <span className="text-emerald-400 font-semibold">Zero-Fail Safe Mechanism:</span> Vehicle on-board radar safety boundary automatically overrides in the event of missing or invalid cryptographic tokens.
          </div>
        </div>
      </div>

      <div className="border-t border-slate-800/60 py-4 px-4 bg-slate-950 text-center text-slate-500 text-[11px] flex flex-wrap justify-between items-center max-w-7xl mx-auto">
        <p>© 2026 V2X-SecNet Autonomous Mobility Research. All rights reserved.</p>
        <p>Production Build: v2.4.0-hard-realtime | Latency Target: &lt;5ms</p>
      </div>
    </footer>
  );
};
