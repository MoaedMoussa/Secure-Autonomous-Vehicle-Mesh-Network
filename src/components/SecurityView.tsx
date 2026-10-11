/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  Lock, 
  KeyRound, 
  Radio, 
  Bug, 
  Zap, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  FileCode,
  Layers,
  ArrowRight
} from 'lucide-react';
import { IntersectionSimulation } from '../utils/simulationEngine';
import { BSMPacket } from '../types/v2x';

interface SecurityViewProps {
  simulation: IntersectionSimulation;
}

export const SecurityView: React.FC<SecurityViewProps> = ({ simulation }) => {
  const state = simulation.getState();
  const [selectedPacket, setSelectedPacket] = useState<BSMPacket | null>(null);
  const [activeTab, setActiveTab] = useState<'INSPECTOR' | 'BENCHMARKS' | 'SCMS_PKI'>('INSPECTOR');

  const attackModes = [
    {
      id: 'NONE',
      name: 'Standard Secure Mesh',
      desc: 'All vehicles sign BSM packets with valid ECDSA NIST P-256 keys. Freshness window & sequence strictly enforced.',
      icon: ShieldCheck,
      color: 'emerald',
    },
    {
      id: 'REPLAY',
      name: 'Replay Attack Injection',
      desc: 'Attacker records legitimate high-speed BSM and replays it 180 seconds later to deceive crossing vehicles.',
      icon: RefreshCw,
      color: 'amber',
    },
    {
      id: 'TAMPERING',
      name: 'Payload Tampering (MITM)',
      desc: 'In-transit bit flipping: Attacker alters emergency braking flag from 1 to 0 without valid private key signature.',
      icon: Bug,
      color: 'rose',
    },
    {
      id: 'SYBIL_ROGUE',
      name: 'Rogue Sybil Vehicle',
      desc: 'An unauthorized vehicle broadcasts bogus telemetry with self-signed certificate untrusted by the IEEE 1609.2 Root CA.',
      icon: AlertTriangle,
      color: 'purple',
    },
    {
      id: 'GPS_SPOOFING',
      name: 'Kinematic GPS Spoofing',
      desc: 'Forged GPS coordinates simulating impossible teleportation jump (>150 km/h step) to trigger phantom braking.',
      icon: Zap,
      color: 'blue',
    },
  ] as const;

  const currentPacket = selectedPacket || state.packets[0];

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Page Header */}
      <div className="border-b border-slate-800 pb-5">
        <div className="flex items-center gap-2 mb-1">
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-cyan-950 text-cyan-400 border border-cyan-800 uppercase tracking-wider">
            Mobile Security Elective Focus
          </span>
          <span className="text-slate-500 text-xs">IEEE 1609.2 / SAE J2735 Standards</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          V2X Cryptographic Packet Inspector &amp; Cyber Defense Laboratory
        </h1>
        <p className="text-slate-400 text-sm mt-1 max-w-3xl">
          Deep packet inspection of SAE J2735 Basic Safety Messages (BSM) signed via asymmetric cryptography (ECDSA NIST P-256). Live attack injection engine demonstrating mitigation against Replay Attacks, MITM tampering, and Rogue Sybil nodes.
        </p>

        {/* View Tabs */}
        <div className="flex items-center gap-2 mt-4 pt-2">
          <button
            onClick={() => setActiveTab('INSPECTOR')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'INSPECTOR'
                ? 'bg-cyan-500 text-slate-950 font-bold'
                : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
            }`}
          >
            Live Packet Inspector &amp; Attack Simulator
          </button>
          <button
            onClick={() => setActiveTab('BENCHMARKS')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'BENCHMARKS'
                ? 'bg-cyan-500 text-slate-950 font-bold'
                : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
            }`}
          >
            ECC vs RSA Cryptographic Benchmarks
          </button>
          <button
            onClick={() => setActiveTab('SCMS_PKI')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'SCMS_PKI'
                ? 'bg-cyan-500 text-slate-950 font-bold'
                : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
            }`}
          >
            IEEE 1609.2 SCMS PKI Architecture
          </button>
        </div>
      </div>

      {activeTab === 'INSPECTOR' && (
        <div className="space-y-6">
          {/* Attack Injection Selection Bar */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Bug className="w-4 h-4 text-rose-400" />
                V2X Threat Injection Engine
              </h2>
              <span className="text-xs text-slate-400">
                Active Policy:{' '}
                <strong className="text-cyan-400 font-mono">
                  {state.activeAttack === 'NONE' ? 'SECURE_BASELINE' : state.activeAttack}
                </strong>
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              {attackModes.map((mode) => {
                const isSelected = state.activeAttack === mode.id;
                const Icon = mode.icon;
                return (
                  <button
                    key={mode.id}
                    onClick={() => simulation.setAttackMode(mode.id)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-cyan-950/60 border-cyan-500 shadow-md shadow-cyan-900/20'
                        : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <Icon className={`w-4 h-4 ${isSelected ? 'text-cyan-400' : 'text-slate-400'}`} />
                        <span className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                          {mode.name}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                        {mode.desc}
                      </p>
                    </div>
                    <div className="mt-2 pt-2 border-t border-slate-800/60 text-[10px] font-mono flex items-center justify-between">
                      <span className={isSelected ? 'text-cyan-400 font-bold' : 'text-slate-500'}>
                        {isSelected ? 'ACTIVE' : 'SELECT'}
                      </span>
                      <ArrowRight className="w-3 h-3 text-slate-500" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dual Panel: Live Packet Feed + ASN.1 Deep Decoder */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Packet Stream Feed: 5 Columns */}
            <div className="lg:col-span-5 bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                    <Radio className="w-4 h-4 text-cyan-400" />
                    Sidelink BSM Broadcast Feed
                  </h3>
                  <p className="text-[11px] text-slate-400">10 Hz direct vehicle-to-vehicle telemetry</p>
                </div>
                <span className="text-[11px] font-mono text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800">
                  {state.packets.length} Packets Logged
                </span>
              </div>

              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                {state.packets.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-8">
                    Waiting for initial BSM telemetry stream...
                  </p>
                ) : (
                  state.packets.map((pkt) => {
                    const isSelected = currentPacket?.id === pkt.id;
                    const isValid = pkt.security.verified;

                    return (
                      <div
                        key={pkt.id}
                        onClick={() => setSelectedPacket(pkt)}
                        className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-slate-800 border-cyan-500 shadow-md'
                            : 'bg-slate-950 border-slate-800/80 hover:bg-slate-900'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-white flex items-center gap-1.5">
                            {pkt.vehicleName}
                            <span className="text-[10px] text-slate-400 font-mono">
                              (Seq #{pkt.sequenceNumber})
                            </span>
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-mono font-bold ${
                              isValid
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                : 'bg-rose-950 text-rose-300 border border-rose-800'
                            }`}
                          >
                            {isValid ? <CheckCircle className="w-2.5 h-2.5" /> : <XCircle className="w-2.5 h-2.5" />}
                            {pkt.security.verificationStatus}
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-1 text-[11px] text-slate-400 font-mono mt-1 pt-1 border-t border-slate-800/50">
                          <span>{pkt.telemetry.speedKmh} km/h</span>
                          <span className={pkt.telemetry.brakingActive ? 'text-amber-400' : 'text-slate-400'}>
                            {pkt.telemetry.brakingActive ? 'BRAKE: ON' : 'BRAKE: OFF'}
                          </span>
                          <span className="text-right truncate">{pkt.direction}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Deep Packet Inspector & Cryptographic Verification: 7 Columns */}
            <div className="lg:col-span-7 bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <FileCode className="w-4 h-4 text-cyan-400" />
                    SAE J2735 ASN.1 Structure &amp; Verification
                  </h3>
                  <p className="text-xs text-slate-400">
                    OBU Signer Digest: <span className="font-mono text-cyan-400">{currentPacket?.pseudonymId}</span>
                  </p>
                </div>

                {currentPacket?.security.verified ? (
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 text-xs font-bold">
                    <ShieldCheck className="w-4 h-4" />
                    CRYPTOGRAPHICALLY VALID
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-rose-950 text-rose-300 border border-rose-800 text-xs font-bold">
                    <ShieldAlert className="w-4 h-4" />
                    ATTACK DETECTED &amp; DROPPED
                  </span>
                )}
              </div>

              {currentPacket && (
                <div className="space-y-4">
                  {/* Rejection notice if tampered */}
                  {!currentPacket.security.verified && (
                    <div className="bg-rose-950/60 border border-rose-800 rounded-xl p-3.5 text-xs text-rose-200 space-y-1">
                      <div className="font-bold flex items-center gap-1.5 text-rose-300">
                        <AlertTriangle className="w-4 h-4" />
                        Security Violation Triggered:
                      </div>
                      <p className="font-mono text-[11px]">{currentPacket.security.rejectionReason}</p>
                    </div>
                  )}

                  {/* Packet Data JSON viewer */}
                  <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 font-mono text-xs overflow-x-auto text-slate-300 space-y-1.5">
                    <div className="text-cyan-400 font-bold">// 1. IEEE 1609.2 Security Header Envelope</div>
                    <div className="pl-3">
                      <span className="text-slate-500">"protocolVersion":</span> 3,<br />
                      <span className="text-slate-500">"signerIdentifier":</span> "{currentPacket.pseudonymId}",<br />
                      <span className="text-slate-500">"algorithm":</span> "{currentPacket.security.algorithm}",<br />
                      <span className="text-slate-500">"signatureHex":</span> "{currentPacket.security.signatureHex}"
                    </div>

                    <div className="text-cyan-400 font-bold pt-2">// 2. SAE J2735 BasicSafetyMessage (BSM) CoreData</div>
                    <div className="pl-3">
                      <span className="text-slate-500">"msgId":</span> 20 /* 0x0014 = BSM */,<br />
                      <span className="text-slate-500">"msgCount":</span> {currentPacket.sequenceNumber},<br />
                      <span className="text-slate-500">"id":</span> "{currentPacket.senderId}",<br />
                      <span className="text-slate-500">"secMark":</span> {currentPacket.simulatedTimeMs.toFixed(0)} /* ms in minute */,<br />
                      <span className="text-slate-500">"speed":</span> {currentPacket.telemetry.speedKmh} km/h,<br />
                      <span className="text-slate-500">"heading":</span> {currentPacket.telemetry.headingDeg}°,<br />
                      <span className="text-slate-500">"lat":</span> {currentPacket.telemetry.latitude},<br />
                      <span className="text-slate-500">"long":</span> {currentPacket.telemetry.longitude},<br />
                      <span className="text-slate-500">"brakes":</span> &#123; "active": {String(currentPacket.telemetry.brakingActive)}, "wheelBrakes": "{currentPacket.telemetry.brakeForcePct}%" &#125;
                    </div>

                    <div className="text-cyan-400 font-bold pt-2">// 3. SAE J2735 Part II Weather &amp; Cooperative Headway Frame</div>
                    <div className="pl-3 text-sky-300">
                      <span className="text-slate-500">"weatherCondition":</span> "{currentPacket.telemetry.weatherCondition ?? 'CLEAR'}",<br />
                      <span className="text-slate-500">"surfaceFrictionMu":</span> {currentPacket.telemetry.surfaceFrictionMu ?? 0.85},<br />
                      <span className="text-slate-500">"brakingMultiplier":</span> "{currentPacket.telemetry.brakingDistanceMultiplier ?? 1.0}x",<br />
                      <span className="text-slate-500">"safeFollowingDistanceM":</span> {currentPacket.telemetry.safeFollowingDistanceM ?? 15.4},<br />
                      <span className="text-slate-500">"opticalVisibilityM":</span> {currentPacket.telemetry.opticalVisibilityM ?? 250},<br />
                      <span className="text-slate-500">"v2xPenetrationAdvantage":</span> {String(currentPacket.telemetry.v2xPenetrationAdvantage ?? false)},<br />
                      <span className="text-slate-500">"wipersActive":</span> {String(currentPacket.telemetry.wipersActive ?? false)}
                    </div>
                  </div>

                  {/* Verification Pipeline Step Breakdown */}
                  <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 text-xs space-y-2">
                    <h4 className="font-bold text-white flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-cyan-400" />
                      OBU Verification Pipeline (Edge Arbiter &amp; Peer Vehicles)
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pt-1">
                      <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 text-[11px]">
                        <span className="text-slate-400 block font-semibold">1. Certificate Trust</span>
                        <span className="text-emerald-400 font-mono">SCMS Root CA Valid</span>
                      </div>
                      <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 text-[11px]">
                        <span className="text-slate-400 block font-semibold">2. Timestamp Freshness</span>
                        <span className={currentPacket.security.verificationStatus === 'REPLAY_EXPIRED' ? 'text-rose-400 font-mono' : 'text-emerald-400 font-mono'}>
                          {currentPacket.security.verificationStatus === 'REPLAY_EXPIRED' ? 'Delta &gt; 50ms (EXPIRED)' : 'Delta: 3.2ms (&lt;50ms)'}
                        </span>
                      </div>
                      <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 text-[11px]">
                        <span className="text-slate-400 block font-semibold">3. ECDSA Verification</span>
                        <span className={currentPacket.security.verificationStatus === 'TAMPERED_PAYLOAD' ? 'text-rose-400 font-mono' : 'text-emerald-400 font-mono'}>
                          {currentPacket.security.verificationStatus === 'TAMPERED_PAYLOAD' ? 'Digest Mismatch (FAIL)' : 'P-256 Curve Verified'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'BENCHMARKS' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-cyan-400" />
              Cryptographic Performance Comparison: ECDSA vs RSA in V2X Sidelinks
            </h2>
            <p className="text-slate-400 text-xs mt-1">
              Why the automotive industry and IEEE 1609.2 standardized on Elliptic Curve Cryptography (ECDSA NIST P-256) over traditional RSA for high-frequency DSRC/C-V2X direct radio communications.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* ECDSA Card */}
            <div className="bg-slate-950 p-5 rounded-xl border border-cyan-800/60 shadow-lg space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-base font-bold text-cyan-400">ECDSA (NIST P-256 / secp256r1)</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-950 text-cyan-300 border border-cyan-800">
                  IEEE 1609.2 STANDARD
                </span>
              </div>
              <ul className="space-y-2 text-xs text-slate-300">
                <li className="flex justify-between py-1 border-b border-slate-900">
                  <span className="text-slate-400">Public Key Size:</span>
                  <span className="font-mono text-white font-bold">256 bits (32 bytes)</span>
                </li>
                <li className="flex justify-between py-1 border-b border-slate-900">
                  <span className="text-slate-400">Digital Signature Size:</span>
                  <span className="font-mono text-white font-bold">64 bytes (r + s)</span>
                </li>
                <li className="flex justify-between py-1 border-b border-slate-900">
                  <span className="text-slate-400">Signing Time (OBU Hardware):</span>
                  <span className="font-mono text-emerald-400 font-bold">1.1 ms</span>
                </li>
                <li className="flex justify-between py-1 border-b border-slate-900">
                  <span className="text-slate-400">DSRC 5.9 GHz Bandwidth Footprint:</span>
                  <span className="font-mono text-emerald-400 font-bold">Low (148 bytes total BSM)</span>
                </li>
                <li className="flex justify-between py-1">
                  <span className="text-slate-400">Security Strength:</span>
                  <span className="font-mono text-white font-bold">128-bit symmetric equivalent</span>
                </li>
              </ul>
              <div className="p-3 rounded-lg bg-cyan-950/40 border border-cyan-800/40 text-[11px] text-cyan-300">
                Recommended for all autonomous vehicle broadcast nodes due to minimal transmission overhead and low radio channel saturation.
              </div>
            </div>

            {/* RSA Card */}
            <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 shadow-lg space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-base font-bold text-slate-300">RSA-2048</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-900 text-slate-400 border border-slate-700">
                  LEGACY ALTERNATIVE
                </span>
              </div>
              <ul className="space-y-2 text-xs text-slate-300">
                <li className="flex justify-between py-1 border-b border-slate-900">
                  <span className="text-slate-400">Public Key Size:</span>
                  <span className="font-mono text-white font-bold">2048 bits (256 bytes)</span>
                </li>
                <li className="flex justify-between py-1 border-b border-slate-900">
                  <span className="text-slate-400">Digital Signature Size:</span>
                  <span className="font-mono text-rose-400 font-bold">256 bytes (4x larger)</span>
                </li>
                <li className="flex justify-between py-1 border-b border-slate-900">
                  <span className="text-slate-400">Signing Time (OBU Hardware):</span>
                  <span className="font-mono text-rose-400 font-bold">3.9 ms</span>
                </li>
                <li className="flex justify-between py-1 border-b border-slate-900">
                  <span className="text-slate-400">DSRC 5.9 GHz Bandwidth Footprint:</span>
                  <span className="font-mono text-rose-400 font-bold">High (380+ bytes total BSM)</span>
                </li>
                <li className="flex justify-between py-1">
                  <span className="text-slate-400">Security Strength:</span>
                  <span className="font-mono text-white font-bold">112-bit symmetric equivalent</span>
                </li>
              </ul>
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-400">
                Rejected by SAE J2735 standards committee: Signature packet payload causes channel congestion when 200+ vehicles broadcast within 300 meters.
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'SCMS_PKI' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-cyan-400" />
              Security Credential Management System (SCMS) &amp; Privacy Pseudonyms
            </h2>
            <p className="text-slate-400 text-xs mt-1">
              How V2X networks resolve the conflict between cryptographic authentication and driver privacy preservation.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
              <div className="font-bold text-white text-sm">1. Root Certificate Authority (RCA)</div>
              <p className="text-slate-400 leading-relaxed">
                The apex cryptographic trust anchor. Issues certificates to subordinate authorities and publishes the Certificate Revocation List (CRL).
              </p>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
              <div className="font-bold text-cyan-400 text-sm">2. Pseudonym CA (PCA)</div>
              <p className="text-slate-400 leading-relaxed">
                Generates batches of short-lived pseudonym certificates for vehicle On-Board Units (OBUs). Rotated every 5–15 minutes to prevent tracking of driver travel patterns.
              </p>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
              <div className="font-bold text-emerald-400 text-sm">3. Enrollment Authority (EA)</div>
              <p className="text-slate-400 leading-relaxed">
                Validates the legitimate hardware identity of the automotive ECU/HSM without knowing which pseudonym certificates the PCA issues (split-knowledge privacy principle).
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
