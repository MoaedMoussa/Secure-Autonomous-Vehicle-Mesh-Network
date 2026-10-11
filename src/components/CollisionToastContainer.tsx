/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  AlertTriangle, 
  X, 
  Radio, 
  Volume2, 
  VolumeX, 
  Car, 
  Truck, 
  Siren, 
  ShieldCheck, 
  ExternalLink, 
  Flame, 
  Layers, 
  Trash2,
  Bell,
  BellOff
} from 'lucide-react';
import { CollisionRiskAlert, VehicleType } from '../types/v2x';
import { IntersectionSimulation } from '../utils/simulationEngine';

interface CollisionToastContainerProps {
  simulation: IntersectionSimulation;
  onSelectVehicle: (vehicleId: string) => void;
}

interface ToastItemWithTimer {
  alert: CollisionRiskAlert;
  createdAt: number;
  durationMs: number;
  remainingMs: number;
  isPaused: boolean;
}

// Synthesize a gentle avionics alert tone via Web Audio API using a shared singleton context
let sharedAudioCtx: AudioContext | null = null;

function getSharedAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return null;
      sharedAudioCtx = new AudioContextClass();
    }
    if (sharedAudioCtx.state === 'suspended') {
      sharedAudioCtx.resume().catch(() => {});
    }
    return sharedAudioCtx;
  } catch {
    return null;
  }
}

function playAlertChime(isMuted: boolean) {
  if (isMuted || typeof window === 'undefined') return;
  try {
    const ctx = getSharedAudioContext();
    if (!ctx) return;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, ctx.currentTime); // A5
    osc1.frequency.exponentialRampToValueAtTime(1174.66, ctx.currentTime + 0.12); // D6

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(440, ctx.currentTime);
    osc2.frequency.exponentialRampToValueAtTime(587.33, ctx.currentTime + 0.12);

    gain.gain.setValueAtTime(0.06, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start();
    osc2.start();
    osc1.stop(ctx.currentTime + 0.3);
    osc2.stop(ctx.currentTime + 0.3);
  } catch {
    // AudioContext might be blocked until user gesture, safely ignore
  }
}

function getNodeIcon(type: VehicleType) {
  if (type === 'POLICE_PATROL' || type === 'EMERGENCY_AMBULANCE' || type === 'FIRE_ENGINE') {
    return <Siren className="w-3.5 h-3.5 text-rose-400" />;
  }
  if (type === 'HEAVY_TRUCK') {
    return <Truck className="w-3.5 h-3.5 text-amber-400" />;
  }
  return <Car className="w-3.5 h-3.5 text-cyan-400" />;
}

export const CollisionToastContainer: React.FC<CollisionToastContainerProps> = ({
  simulation,
  onSelectVehicle,
}) => {
  const [toasts, setToasts] = useState<ToastItemWithTimer[]>([]);
  const [isMuted, setIsMuted] = useState<boolean>(() => {
    try {
      return localStorage.getItem('v2x_toast_muted') === 'true';
    } catch {
      return false;
    }
  });
  const [isEnabled, setIsEnabled] = useState<boolean>(true);
  const [totalAlertsCaught, setTotalAlertsCaught] = useState<number>(0);
  const isMutedRef = useRef(isMuted);
  const isEnabledRef = useRef(isEnabled);

  useEffect(() => {
    isMutedRef.current = isMuted;
    try {
      localStorage.setItem('v2x_toast_muted', String(isMuted));
    } catch {
      // ignore
    }
  }, [isMuted]);

  useEffect(() => {
    isEnabledRef.current = isEnabled;
  }, [isEnabled]);

  // Subscribe to real-time collision alerts from the simulation engine
  useEffect(() => {
    const unsubscribe = simulation.onCollisionAlert((alert: CollisionRiskAlert) => {
      if (!isEnabledRef.current) return;

      playAlertChime(isMutedRef.current);
      setTotalAlertsCaught((prev) => prev + 1);

      setToasts((prev) => {
        // Prevent duplicate alerts for the exact same vehicle pair within 2 seconds
        const isDuplicate = prev.some(
          (t) =>
            (t.alert.nodeA.id === alert.nodeA.id && t.alert.nodeB.id === alert.nodeB.id) ||
            (t.alert.nodeA.id === alert.nodeB.id && t.alert.nodeB.id === alert.nodeA.id)
        );
        if (isDuplicate) return prev;

        const newToast: ToastItemWithTimer = {
          alert,
          createdAt: Date.now(),
          durationMs: 7000,
          remainingMs: 7000,
          isPaused: false,
        };

        // Keep maximum 4 concurrent toasts on screen
        const updated = [newToast, ...prev.slice(0, 3)];
        return updated;
      });
    });

    return () => {
      unsubscribe();
    };
  }, [simulation]);

  // Countdown timer loop for auto-dismiss with hover pause
  useEffect(() => {
    if (toasts.length === 0) return;

    const interval = setInterval(() => {
      setToasts((prev) => {
        return prev
          .map((t) => {
            if (t.isPaused) return t;
            return {
              ...t,
              remainingMs: Math.max(0, t.remainingMs - 100),
            };
          })
          .filter((t) => t.remainingMs > 0);
      });
    }, 100);

    return () => clearInterval(interval);
  }, [toasts.length]);

  const handleDismiss = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.alert.id !== id));
  };

  const handleClearAll = () => {
    setToasts([]);
  };

  const handlePause = (id: string, pause: boolean) => {
    setToasts((prev) =>
      prev.map((t) => (t.alert.id === id ? { ...t, isPaused: pause } : t))
    );
  };

  if (!isEnabled && toasts.length === 0) return null;

  return (
    <aside
      aria-label="Real-time V2X collision alert notifications"
      className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-2.5 max-w-[420px] w-full pointer-events-none px-3 sm:px-0"
    >
      {/* Toast Toolbar & Status Indicator */}
      {toasts.length > 0 && (
        <div className="pointer-events-auto flex items-center justify-between w-full bg-slate-950/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-800 text-[11px] shadow-lg animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
            </span>
            <span className="font-semibold text-white tracking-wide uppercase text-[10px]">
              V2X Collision Risk Sentinel
            </span>
            <span className="text-slate-400 font-mono">
              ({totalAlertsCaught} averted)
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsMuted((prev) => !prev)}
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title={isMuted ? 'Unmute alert chimes' : 'Mute alert chimes'}
              aria-label={isMuted ? 'Unmute alert chimes' : 'Mute alert chimes'}
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5 text-slate-500" /> : <Volume2 className="w-3.5 h-3.5 text-cyan-400" />}
            </button>

            <button
              onClick={() => setIsEnabled((prev) => !prev)}
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title={isEnabled ? 'Silence toast popups' : 'Enable toast popups'}
              aria-label={isEnabled ? 'Silence toast popups' : 'Enable toast popups'}
            >
              {isEnabled ? <Bell className="w-3.5 h-3.5 text-cyan-400" /> : <BellOff className="w-3.5 h-3.5 text-slate-500" />}
            </button>

            <button
              onClick={handleClearAll}
              className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors cursor-pointer"
              title="Clear all alerts"
              aria-label="Clear all alerts"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Stack of Active Collision Risk Toasts */}
      <div className="flex flex-col gap-2.5 w-full">
        {toasts.map(({ alert, durationMs, remainingMs }) => {
          const isCritical = alert.threatLevel === 'CRITICAL';
          const isHigh = alert.threatLevel === 'HIGH';
          const pctRemaining = Math.max(0, Math.min(100, (remainingMs / durationMs) * 100));

          return (
            <div
              key={alert.id}
              role="alert"
              aria-live="assertive"
              onMouseEnter={() => handlePause(alert.id, true)}
              onMouseLeave={() => handlePause(alert.id, false)}
              className={`pointer-events-auto relative w-full bg-slate-950/95 backdrop-blur-md rounded-xl border shadow-2xl overflow-hidden transition-all duration-300 animate-in fade-in slide-in-from-right-4 ${
                isCritical
                  ? 'border-rose-500/80 shadow-rose-950/60'
                  : isHigh
                    ? 'border-amber-500/70 shadow-amber-950/50'
                    : 'border-cyan-500/60 shadow-cyan-950/40'
              }`}
            >
              {/* Header: Threat Level & Telemetry */}
              <div
                className={`px-3 py-2 border-b flex items-center justify-between text-xs ${
                  isCritical
                    ? 'bg-rose-950/40 border-rose-900/60'
                    : isHigh
                      ? 'bg-amber-950/40 border-amber-900/60'
                      : 'bg-cyan-950/40 border-cyan-900/60'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold">
                  <AlertTriangle
                    className={`w-4 h-4 shrink-0 ${
                      isCritical
                        ? 'text-rose-400 animate-bounce'
                        : isHigh
                          ? 'text-amber-400'
                          : 'text-cyan-400'
                    }`}
                  />
                  <span
                    className={
                      isCritical
                        ? 'text-rose-300'
                        : isHigh
                          ? 'text-amber-300'
                          : 'text-cyan-300'
                    }
                  >
                    {isCritical
                      ? 'CRITICAL COLLISION RISK'
                      : isHigh
                        ? 'HIGH TRAJECTORY THREAT'
                        : 'COLLISION AVOIDANCE WARNING'}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono font-normal">
                    {alert.timestamp}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-cyan-300 bg-cyan-950/80 px-1.5 py-0.5 rounded border border-cyan-800/60 flex items-center gap-1">
                    <Radio className="w-2.5 h-2.5" />
                    {alert.measuredLatencyMs}ms
                  </span>
                  <button
                    onClick={() => handleDismiss(alert.id)}
                    className="text-slate-400 hover:text-white p-0.5 rounded hover:bg-slate-800/80 transition-colors cursor-pointer"
                    title="Dismiss alert"
                    aria-label="Dismiss alert"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Node Pair Comparison Card */}
              <div className="p-3 space-y-2.5">
                <div className="grid grid-cols-7 gap-2 items-center text-xs">
                  {/* Node A Info */}
                  <div className="col-span-3 bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1">
                        {getNodeIcon(alert.nodeA.type)}
                        <span className="font-bold text-white truncate max-w-[80px]">
                          {alert.nodeA.name}
                        </span>
                      </div>
                      <button
                        onClick={() => onSelectVehicle(alert.nodeA.id)}
                        className="text-[10px] text-cyan-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                        title="Focus vehicle in simulation"
                      >
                        <span>Focus</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </button>
                    </div>
                    <div className="text-[10px] text-slate-400 space-y-0.5 font-mono">
                      <div className="flex justify-between">
                        <span>App:</span>
                        <strong className="text-slate-300">{alert.nodeA.direction} L{alert.nodeA.lane}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Speed:</span>
                        <strong className="text-cyan-300">{alert.nodeA.speedKmh} km/h</strong>
                      </div>
                    </div>
                  </div>

                  {/* Conflict Center (TTC & Distance) */}
                  <div className="col-span-1 flex flex-col items-center justify-center text-center">
                    <div className="w-6 h-6 rounded-full bg-rose-500/20 border border-rose-500/50 flex items-center justify-center text-rose-400 mb-0.5">
                      <Flame className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-[9px] font-bold text-rose-400 font-mono">
                      {alert.timeToCollisionSec}s
                    </span>
                    <span className="text-[8px] text-slate-500 font-mono">TTC</span>
                  </div>

                  {/* Node B Info */}
                  <div className="col-span-3 bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1">
                        {getNodeIcon(alert.nodeB.type)}
                        <span className="font-bold text-white truncate max-w-[80px]">
                          {alert.nodeB.name}
                        </span>
                      </div>
                      <button
                        onClick={() => onSelectVehicle(alert.nodeB.id)}
                        className="text-[10px] text-cyan-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                        title="Focus vehicle in simulation"
                      >
                        <span>Focus</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </button>
                    </div>
                    <div className="text-[10px] text-slate-400 space-y-0.5 font-mono">
                      <div className="flex justify-between">
                        <span>App:</span>
                        <strong className="text-slate-300">{alert.nodeB.direction} L{alert.nodeB.lane}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Speed:</span>
                        <strong className="text-cyan-300">{alert.nodeB.speedKmh} km/h</strong>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Cooperative Resolution Status Banner */}
                <div className="bg-slate-900/90 rounded-lg p-2 border border-slate-800 text-[11px] flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="text-slate-200">
                      Action: <strong className="text-emerald-300 font-semibold">{alert.resolutionAction.replace(/_/g, ' ')}</strong>
                    </span>
                  </div>

                  <span className="text-[10px] font-mono text-slate-400">
                    CPA: <strong className="text-white">{alert.cpaDistanceMeters}m</strong>
                  </span>
                </div>
              </div>

              {/* Countdown Progress Bar (Pauses on Hover) */}
              <div className="w-full bg-slate-800 h-1">
                <div
                  className={`h-full transition-all ease-linear ${
                    isCritical
                      ? 'bg-rose-500'
                      : isHigh
                        ? 'bg-amber-400'
                        : 'bg-cyan-400'
                  }`}
                  style={{ width: `${pctRemaining}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
};
