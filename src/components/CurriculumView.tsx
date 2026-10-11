/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  GraduationCap, 
  CheckCircle2, 
  ShieldCheck, 
  Clock, 
  Radio, 
  BookOpen, 
  HelpCircle, 
  ChevronDown, 
  ChevronUp, 
  Award,
  Layers
} from 'lucide-react';

export const CurriculumView: React.FC = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const defenseQA = [
    {
      q: 'How does this project directly satisfy the core curriculum module: Car-to-Car Communication [source: 0.1.1]?',
      a: 'The project implements the fundamental PHY/MAC and application layer stack of vehicular ad-hoc networks (VANETs). It directly simulates SAE J2735 Basic Safety Messages (BSM CoreData), IEEE 802.11p / C-V2X PC5 direct sidelink channels at 5.9 GHz, and decentralized inter-vehicle communication without relying on cellular base stations or stationary infrastructure.',
    },
    {
      q: 'How are hard real-time constraints handled during high-density intersection merging?',
      a: 'In the Real-Time and Communication Systems elective block, timing guarantees are paramount. Our platform enforces a deterministic time-space conflict reservation matrix. The merging coordination deadline is bounded at T ≤ 20 ms. If a vehicle experiences packet loss or channel contention, it automatically falls back to an on-board kinematic safety envelope (CACC decelerating profile), ensuring collision-free operation under degraded network conditions.',
    },
    {
      q: 'Why does Mobile Security require ECDSA NIST P-256 instead of RSA-2048 for vehicular telemetry?',
      a: 'Over wireless vehicular channels (10 Hz broadcast rate per vehicle, with up to 100+ vehicles in range), transmission bandwidth and signing latency are critical. ECDSA P-256 produces a compact 64-byte signature with a 1.1ms signing time on automotive hardware, whereas RSA-2048 generates a 256-byte signature that rapidly saturates the 10 MHz DSRC radio channel and incurs 4x computational overhead.',
    },
    {
      q: 'How does the architecture prevent Sybil attacks and GPS spoofing?',
      a: 'Every vehicle must present a valid Pseudonym Certificate issued by the IEEE 1609.2 Security Credential Management System (SCMS). Packets from unknown signers are discarded at the edge. Additionally, the edge arbiter executes a kinematic Kalman filter plausibility check on reported position and velocity; any teleportation jump exceeding physical vehicle acceleration limits (e.g. >9 m/s²) flags the vehicle as compromised and revokes its reservation.',
    },
    {
      q: 'Why containerize each vehicle in Docker with Java microservices?',
      a: 'Containerization provides clean process isolation mimicking real automotive Electronic Control Units (ECUs) and On-Board Units (OBUs). Each container runs independent Java virtual threads, maintaining its own private cryptographic keys, socket buffers, and local trajectory state machines. This enforces realistic network boundary constraints rather than a simplistic shared-memory simulation.',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-8">
      {/* Page Header */}
      <div className="border-b border-slate-800 pb-5">
        <div className="flex items-center gap-2 mb-1">
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-950 text-amber-300 border border-amber-800 uppercase tracking-wider">
            Academic Curriculum &amp; Capstone Defense
          </span>
          <span className="text-slate-500 text-xs">Module 0.1.1 Syllabus Alignment</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          Curriculum Mapping &amp; Technical Defense Strategy
        </h1>
        <p className="text-slate-400 text-sm mt-1 max-w-3xl">
          Detailed academic justification illustrating how the Secure V2X Network bridges Networks &amp; Security with the Real-Time &amp; Communication Systems elective block to establish an unassailable capstone submission.
        </p>
      </div>

      {/* Triad Alignment Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Core Module 0.1.1 Card */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-bl-full pointer-events-none" />
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] text-amber-400 uppercase font-bold tracking-wider">
                Core Module [Source: 0.1.1]
              </span>
              <h2 className="text-base font-bold text-white">Car-to-Car Communication</h2>
            </div>
          </div>

          <ul className="space-y-2 text-xs text-slate-300">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                <strong>Direct Sidelink:</strong> Simulates IEEE 802.11p / C-V2X PC5 direct peer-to-peer ad-hoc communication.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                <strong>SAE J2735 Standard:</strong> Implementation of Basic Safety Messages (BSM CoreData), SPaT, and MAP topology.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                <strong>MAC Contention:</strong> High-density broadcast models and packet propagation under channel saturation.
              </span>
            </li>
          </ul>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400">
            Directly fulfills all requirements of syllabus section 0.1.1 with verified vehicular telemetry protocols.
          </div>
        </div>

        {/* Elective Block 1: Real-Time & Communication Systems */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-bl-full pointer-events-none" />
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] text-cyan-400 uppercase font-bold tracking-wider">
                Elective Block Focus
              </span>
              <h2 className="text-base font-bold text-white">Real-Time &amp; Comm Systems</h2>
            </div>
          </div>

          <ul className="space-y-2 text-xs text-slate-300">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                <strong>Hard Real-Time Deadlines:</strong> Conflict-zone slot scheduling solved within &lt;20ms bounded window.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                <strong>CACC Coordination:</strong> Cooperative Adaptive Cruise Control trajectory velocity calculation.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                <strong>Priority Preemption:</strong> Emergency ambulance fast-path slot allocation with zero delay.
              </span>
            </li>
          </ul>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400">
            Bridges distributed consensus, low-latency queues, and deterministic vehicular kinematics.
          </div>
        </div>

        {/* Elective Block 2: Mobile Security & Cryptography */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-bl-full pointer-events-none" />
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] text-blue-400 uppercase font-bold tracking-wider">
                Specialized Strength
              </span>
              <h2 className="text-base font-bold text-white">Mobile Security &amp; Crypto</h2>
            </div>
          </div>

          <ul className="space-y-2 text-xs text-slate-300">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                <strong>Asymmetric Cryptography:</strong> ECDSA NIST P-256 digital signatures on all safety telemetry.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                <strong>IEEE 1609.2 SCMS:</strong> Pseudonym certificate management protecting against driver tracking.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                <strong>Attack Mitigation:</strong> Real-time defense against Replay, MITM payload tampering, and Rogue Sybil nodes.
              </span>
            </li>
          </ul>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400">
            Demonstrates advanced security engineering applied to mission-critical automotive infrastructure.
          </div>
        </div>
      </div>

      {/* Professor Oral Defense Preparation & FAQ */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-cyan-400" />
            <div>
              <h3 className="text-base font-bold text-white">
                Oral Defense Q&amp;A: Committee &amp; Professor Questions
              </h3>
              <p className="text-xs text-slate-400">
                Prepared technical defenses addressing edge cases, Byzantine faults, and wireless channel constraints.
              </p>
            </div>
          </div>
          <span className="text-xs font-mono text-cyan-400 bg-cyan-950 px-2.5 py-1 rounded border border-cyan-800">
            5 Questions Prepared
          </span>
        </div>

        <div className="space-y-3">
          {defenseQA.map((item, idx) => {
            const isOpen = openFaq === idx;

            return (
              <div
                key={idx}
                className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden transition-all"
              >
                <button
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="w-full p-4 text-left flex items-center justify-between gap-4 hover:bg-slate-900/60 transition-colors cursor-pointer"
                >
                  <span className="text-xs font-bold text-slate-200 flex items-center gap-2">
                    <span className="text-cyan-400 font-mono">Q{idx + 1}.</span>
                    {item.q}
                  </span>
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                  )}
                </button>

                {isOpen && (
                  <div className="px-4 pb-4 pt-1 text-xs text-slate-300 border-t border-slate-900 leading-relaxed bg-slate-950/80">
                    <div className="p-3 rounded-lg bg-slate-900/70 border border-slate-800/80 text-slate-300">
                      <strong className="text-emerald-400 block mb-1">Defense Thesis:</strong>
                      {item.a}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
