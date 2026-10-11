/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Radio, 
  Wifi, 
  Zap, 
  ShieldAlert, 
  Clock, 
  Gauge, 
  Activity, 
  Lightbulb,
  CheckCircle2,
  AlertCircle,
  Siren,
  Sliders,
  Compass,
  ArrowDown,
  ArrowUp,
  ArrowLeft,
  ArrowRight
} from 'lucide-react';
import { IntersectionSimulation } from '../utils/simulationEngine';
import { Direction, LightColor, Vehicle } from '../types/v2x';

interface TrafficLightRSUViewProps {
  simulation: IntersectionSimulation;
}

export const TrafficLightRSUView: React.FC<TrafficLightRSUViewProps> = ({ simulation }) => {
  const state = simulation.getState();
  const { trafficLightState, trafficLightRSU, vehicles } = state;
  const { activeSPaT } = trafficLightRSU;

  const [filterDir, setFilterDir] = useState<Direction | 'ALL'>('ALL');

  // Filter vehicles currently within RSU broadcast range
  const connectedVehicles = vehicles.filter((v) => {
    const distToRsu = Math.hypot(v.x - trafficLightRSU.x, v.y - trafficLightRSU.y);
    return distToRsu <= trafficLightRSU.broadcastRangePx && !v.crossedIntersection;
  });

  const displayedVehicles = filterDir === 'ALL' 
    ? connectedVehicles 
    : connectedVehicles.filter(v => v.direction === filterDir);

  const renderBulb = (color: LightColor, activeLight: LightColor) => {
    const isLit = color === activeLight;
    if (color === 'RED') {
      return (
        <span
          className={`w-3.5 h-3.5 rounded-full transition-all duration-200 ${
            isLit
              ? 'bg-rose-500 shadow-md shadow-rose-500/80 ring-2 ring-rose-400'
              : 'bg-rose-950/80 border border-rose-900/60 opacity-40'
          }`}
        />
      );
    }
    if (color === 'YELLOW') {
      return (
        <span
          className={`w-3.5 h-3.5 rounded-full transition-all duration-200 ${
            isLit
              ? 'bg-amber-400 shadow-md shadow-amber-400/80 ring-2 ring-amber-300'
              : 'bg-amber-950/80 border border-amber-900/60 opacity-40'
          }`}
        />
      );
    }
    return (
      <span
        className={`w-3.5 h-3.5 rounded-full transition-all duration-200 ${
          isLit
            ? 'bg-emerald-400 shadow-md shadow-emerald-400/80 ring-2 ring-emerald-300'
            : 'bg-emerald-950/80 border border-emerald-900/60 opacity-40'
        }`}
      />
    );
  };

  const getDirectionIcon = (dir: Direction) => {
    switch (dir) {
      case 'NORTH': return <ArrowDown className="w-3.5 h-3.5 text-cyan-400" />;
      case 'SOUTH': return <ArrowUp className="w-3.5 h-3.5 text-cyan-400" />;
      case 'EAST': return <ArrowLeft className="w-3.5 h-3.5 text-cyan-400" />;
      case 'WEST': return <ArrowRight className="w-3.5 h-3.5 text-cyan-400" />;
    }
  };

  const getReactionBadge = (v: Vehicle) => {
    switch (v.v2iReaction) {
      case 'WAITING_FOR_EMERGENCY_CROSSING':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-700 animate-pulse">
            <Siren className="w-3 h-3 text-amber-400" />
            YIELDING TO RED RUNNER
          </span>
        );
      case 'STOPPED_AT_RED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-950 text-rose-300 border border-rose-800">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
            STOPPED AT RED BAR
          </span>
        );
      case 'DECELERATING_FOR_RED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-950/70 text-rose-300 border border-rose-800/60">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
            DECELERATING FOR RED
          </span>
        );
      case 'ACCELERATING_YELLOW':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-800 animate-pulse">
            <Zap className="w-3 h-3 text-amber-400" />
            BEATING YELLOW LIGHT
          </span>
        );
      case 'SLOWING_YELLOW':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950/70 text-amber-300 border border-amber-800/60">
            <Clock className="w-3 h-3 text-amber-400" />
            DECELERATING FOR YELLOW
          </span>
        );
      case 'GLOSA_CRUISE_GREEN':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            GLOSA GREEN CRUISE
          </span>
        );
      case 'EMERGENCY_OVERRIDE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-950 text-rose-300 border border-rose-800 animate-bounce">
            <Siren className="w-3 h-3 text-rose-400" />
            EMERGENCY PREEMPTION
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono text-slate-400 bg-slate-900 border border-slate-800">
            CRUISING
          </span>
        );
    }
  };

  return (
    <div className="bg-slate-900/85 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
      {/* Component Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-emerald-400" />
              Traffic Light RSU (SPaT Broadcast)
            </span>
            <span className="text-slate-400 text-xs font-mono">
              SAE J2735 • 5.895 GHz (Channel 172)
            </span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            Visual Traffic Light Roadside Unit (V2I Broadcaster)
          </h2>
          <p className="text-slate-400 text-xs mt-1 max-w-3xl">
            Transmits real-time Signal Phase and Timing (SPaT) telemetry over direct 5.9 GHz wireless sidelink. Approaching vehicle On-Board Units (OBUs) receive state updates and execute autonomous speed optimization, dilemma-zone decisions, or stop-line braking.
          </p>
        </div>

        {/* Live RSU Hardware Specs */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="bg-slate-950 border border-slate-800 px-3 py-2 rounded-xl text-center min-w-[100px]">
            <span className="text-slate-400 text-[10px] block uppercase font-medium">SPaT Broadcasts</span>
            <span className="text-base font-mono font-bold text-cyan-400">
              {trafficLightRSU.totalPacketsBroadcast.toLocaleString()}
            </span>
          </div>

          <div className="bg-slate-950 border border-slate-800 px-3 py-2 rounded-xl text-center min-w-[100px]">
            <span className="text-slate-400 text-[10px] block uppercase font-medium">Frequency</span>
            <span className="text-base font-mono font-bold text-indigo-400">
              {trafficLightRSU.frequencyGhz} GHz
            </span>
          </div>

          <div className="bg-slate-950 border border-slate-800 px-3 py-2 rounded-xl text-center min-w-[100px]">
            <span className="text-slate-400 text-[10px] block uppercase font-medium">Connected OBUs</span>
            <span className="text-base font-mono font-bold text-emerald-400">
              {trafficLightRSU.connectedVehicleCount} Nodes
            </span>
          </div>

          <div className="bg-slate-950 border border-slate-800 px-3 py-2 rounded-xl text-center min-w-[100px]">
            <span className="text-slate-400 text-[10px] block uppercase font-medium">Tx Power</span>
            <span className="text-base font-mono font-bold text-amber-400">
              {activeSPaT.txPowerDbm} dBm
            </span>
          </div>
        </div>
      </div>

      {/* 3-Second All-Red Clearance Interval Banner */}
      {(trafficLightState.isAllRedClearance || activeSPaT.isAllRedClearance) && (
        <div className="bg-rose-950/75 border border-rose-700 p-3 rounded-xl flex items-center justify-between gap-3 text-xs text-rose-200 animate-pulse">
          <div className="flex items-center gap-2.5">
            <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping shrink-0" />
            <div>
              <strong className="block text-white font-bold">3.0s ALL-RED CLEARANCE INTERVAL ACTIVE (INTERLOCK BUFFER):</strong>
              <span className="text-rose-300">Holding all 4 approach signals at RED. Allows yellow-light vehicles to fully evacuate intersection center before next approach turns green.</span>
            </div>
          </div>
          <div className="bg-rose-900/90 border border-rose-600 px-3 py-1.5 rounded-lg text-center shrink-0">
            <span className="text-[10px] text-rose-300 block uppercase font-bold">Clearance</span>
            <span className="text-base font-mono font-bold text-white">
              {(trafficLightState.clearanceTimeRemainingSec || activeSPaT.clearanceTimeRemainingSec).toFixed(1)}s
            </span>
          </div>
        </div>
      )}

      {/* Signal Phase & GLOSA Speed Advisory HUD - 4 Individual Approaches (One at a Time) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* North Approach Card */}
        <div className={`bg-slate-950 p-3.5 rounded-xl border transition-all ${
          trafficLightState.activeDirection === 'NORTH'
            ? 'border-cyan-500/60 shadow-lg shadow-cyan-950/40 ring-1 ring-cyan-500/30'
            : 'border-slate-800'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <ArrowDown className="w-3.5 h-3.5 text-cyan-400" />
              <span className="font-bold text-white text-xs">North Approach</span>
            </div>
            <div className="flex items-center gap-1 bg-black/70 px-2 py-1 rounded-md border border-slate-800">
              {renderBulb('RED', activeSPaT.northLight)}
              {renderBulb('YELLOW', activeSPaT.northLight)}
              {renderBulb('GREEN', activeSPaT.northLight)}
            </div>
          </div>
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center justify-between bg-slate-900/80 px-2 py-1.5 rounded border border-slate-800/80 font-mono">
              <span className={`font-bold ${
                activeSPaT.northLight === 'GREEN' ? 'text-emerald-400' :
                activeSPaT.northLight === 'YELLOW' ? 'text-amber-400' : 'text-rose-400'
              }`}>{activeSPaT.northLight}</span>
              <span className="text-slate-400 text-[11px]">
                {trafficLightState.activeDirection === 'NORTH' ? `${Math.ceil(activeSPaT.timeRemainingSec)}s left` : 'LOCKED RED'}
              </span>
            </div>
            <div className="flex items-center justify-between bg-slate-900/60 px-2 py-1 rounded text-[11px]">
              <span className="text-slate-400 flex items-center gap-1">
                <Gauge className="w-3 h-3 text-cyan-400" /> GLOSA:
              </span>
              <span className="font-mono font-bold text-cyan-300">
                {activeSPaT.glosaAdvisorySpeedKmh.north > 0 ? `${activeSPaT.glosaAdvisorySpeedKmh.north} km/h` : '0 km/h'}
              </span>
            </div>
          </div>
        </div>

        {/* East Approach Card */}
        <div className={`bg-slate-950 p-3.5 rounded-xl border transition-all ${
          trafficLightState.activeDirection === 'EAST'
            ? 'border-cyan-500/60 shadow-lg shadow-cyan-950/40 ring-1 ring-cyan-500/30'
            : 'border-slate-800'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <ArrowLeft className="w-3.5 h-3.5 text-cyan-400" />
              <span className="font-bold text-white text-xs">East Approach</span>
            </div>
            <div className="flex items-center gap-1 bg-black/70 px-2 py-1 rounded-md border border-slate-800">
              {renderBulb('RED', activeSPaT.eastLight)}
              {renderBulb('YELLOW', activeSPaT.eastLight)}
              {renderBulb('GREEN', activeSPaT.eastLight)}
            </div>
          </div>
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center justify-between bg-slate-900/80 px-2 py-1.5 rounded border border-slate-800/80 font-mono">
              <span className={`font-bold ${
                activeSPaT.eastLight === 'GREEN' ? 'text-emerald-400' :
                activeSPaT.eastLight === 'YELLOW' ? 'text-amber-400' : 'text-rose-400'
              }`}>{activeSPaT.eastLight}</span>
              <span className="text-slate-400 text-[11px]">
                {trafficLightState.activeDirection === 'EAST' ? `${Math.ceil(activeSPaT.timeRemainingSec)}s left` : 'LOCKED RED'}
              </span>
            </div>
            <div className="flex items-center justify-between bg-slate-900/60 px-2 py-1 rounded text-[11px]">
              <span className="text-slate-400 flex items-center gap-1">
                <Gauge className="w-3 h-3 text-cyan-400" /> GLOSA:
              </span>
              <span className="font-mono font-bold text-cyan-300">
                {activeSPaT.glosaAdvisorySpeedKmh.east > 0 ? `${activeSPaT.glosaAdvisorySpeedKmh.east} km/h` : '0 km/h'}
              </span>
            </div>
          </div>
        </div>

        {/* South Approach Card */}
        <div className={`bg-slate-950 p-3.5 rounded-xl border transition-all ${
          trafficLightState.activeDirection === 'SOUTH'
            ? 'border-cyan-500/60 shadow-lg shadow-cyan-950/40 ring-1 ring-cyan-500/30'
            : 'border-slate-800'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <ArrowUp className="w-3.5 h-3.5 text-cyan-400" />
              <span className="font-bold text-white text-xs">South Approach</span>
            </div>
            <div className="flex items-center gap-1 bg-black/70 px-2 py-1 rounded-md border border-slate-800">
              {renderBulb('RED', activeSPaT.southLight)}
              {renderBulb('YELLOW', activeSPaT.southLight)}
              {renderBulb('GREEN', activeSPaT.southLight)}
            </div>
          </div>
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center justify-between bg-slate-900/80 px-2 py-1.5 rounded border border-slate-800/80 font-mono">
              <span className={`font-bold ${
                activeSPaT.southLight === 'GREEN' ? 'text-emerald-400' :
                activeSPaT.southLight === 'YELLOW' ? 'text-amber-400' : 'text-rose-400'
              }`}>{activeSPaT.southLight}</span>
              <span className="text-slate-400 text-[11px]">
                {trafficLightState.activeDirection === 'SOUTH' ? `${Math.ceil(activeSPaT.timeRemainingSec)}s left` : 'LOCKED RED'}
              </span>
            </div>
            <div className="flex items-center justify-between bg-slate-900/60 px-2 py-1 rounded text-[11px]">
              <span className="text-slate-400 flex items-center gap-1">
                <Gauge className="w-3 h-3 text-cyan-400" /> GLOSA:
              </span>
              <span className="font-mono font-bold text-cyan-300">
                {activeSPaT.glosaAdvisorySpeedKmh.south > 0 ? `${activeSPaT.glosaAdvisorySpeedKmh.south} km/h` : '0 km/h'}
              </span>
            </div>
          </div>
        </div>

        {/* West Approach Card */}
        <div className={`bg-slate-950 p-3.5 rounded-xl border transition-all ${
          trafficLightState.activeDirection === 'WEST'
            ? 'border-cyan-500/60 shadow-lg shadow-cyan-950/40 ring-1 ring-cyan-500/30'
            : 'border-slate-800'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <ArrowRight className="w-3.5 h-3.5 text-cyan-400" />
              <span className="font-bold text-white text-xs">West Approach</span>
            </div>
            <div className="flex items-center gap-1 bg-black/70 px-2 py-1 rounded-md border border-slate-800">
              {renderBulb('RED', activeSPaT.westLight)}
              {renderBulb('YELLOW', activeSPaT.westLight)}
              {renderBulb('GREEN', activeSPaT.westLight)}
            </div>
          </div>
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center justify-between bg-slate-900/80 px-2 py-1.5 rounded border border-slate-800/80 font-mono">
              <span className={`font-bold ${
                activeSPaT.westLight === 'GREEN' ? 'text-emerald-400' :
                activeSPaT.westLight === 'YELLOW' ? 'text-amber-400' : 'text-rose-400'
              }`}>{activeSPaT.westLight}</span>
              <span className="text-slate-400 text-[11px]">
                {trafficLightState.activeDirection === 'WEST' ? `${Math.ceil(activeSPaT.timeRemainingSec)}s left` : 'LOCKED RED'}
              </span>
            </div>
            <div className="flex items-center justify-between bg-slate-900/60 px-2 py-1 rounded text-[11px]">
              <span className="text-slate-400 flex items-center gap-1">
                <Gauge className="w-3 h-3 text-cyan-400" /> GLOSA:
              </span>
              <span className="font-mono font-bold text-cyan-300">
                {activeSPaT.glosaAdvisorySpeedKmh.west > 0 ? `${activeSPaT.glosaAdvisorySpeedKmh.west} km/h` : '0 km/h'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* RSU Operational Controls & Tuning Toolbar */}
      <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-slate-400 font-semibold">Force Approach:</span>
          {(['NORTH', 'EAST', 'SOUTH', 'WEST'] as Direction[]).map((dir) => (
            <button
              key={dir}
              onClick={() => simulation.forceApproachGreen(dir)}
              className={`px-2.5 py-1 rounded-lg font-semibold cursor-pointer transition-colors border ${
                trafficLightState.activeDirection === dir
                  ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800'
              }`}
            >
              {dir.charAt(0) + dir.slice(1).toLowerCase()} Green
            </button>
          ))}

          <button
            onClick={() => simulation.triggerAllRedClearance()}
            className="px-2.5 py-1 rounded-lg bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800 font-semibold cursor-pointer transition-colors"
          >
            3s All-Red
          </button>

          <button
            onClick={() => simulation.triggerRedEmergencyScenario()}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-600/20 text-amber-300 border border-amber-500/40 hover:bg-amber-600/30 font-semibold cursor-pointer transition-colors"
          >
            <Siren className="w-3.5 h-3.5 text-amber-400" />
            <span>Test Red-Signal Emergency</span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => simulation.toggleGLOSA()}
            className={`px-2.5 py-1 rounded-lg font-semibold cursor-pointer transition-colors flex items-center gap-1.5 ${
              trafficLightRSU.glosaActive
                ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/40'
                : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-emerald-400" />
            <span>GLOSA: {trafficLightRSU.glosaActive ? 'ON' : 'OFF'}</span>
          </button>

          <span className="text-slate-400">RSU Range:</span>
          <div className="flex items-center gap-1">
            {[260, 380, 480].map((rng) => (
              <button
                key={rng}
                onClick={() => simulation.setTrafficLightRSURange(rng)}
                className={`px-2 py-0.5 rounded text-[11px] font-mono cursor-pointer transition-colors ${
                  trafficLightRSU.broadcastRangePx === rng
                    ? 'bg-cyan-500 text-slate-950 font-bold'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {rng}px
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Live Vehicle AI Reaction Monitor Feed */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              Live Connected Vehicles (V2I Reception &amp; AI Decision Feed)
            </h3>
            <p className="text-[11px] text-slate-400">
              Real-time telemetry showing how each approaching vehicle's AI reacts to the RSU SPaT wireless stream.
            </p>
          </div>

          {/* Direction Filter */}
          <div className="flex items-center bg-slate-950 rounded-lg p-0.5 border border-slate-800 text-xs">
            {(['ALL', 'NORTH', 'SOUTH', 'EAST', 'WEST'] as const).map((d) => (
              <button
                key={d}
                onClick={() => setFilterDir(d)}
                className={`px-2 py-1 rounded text-[10px] font-medium transition-colors cursor-pointer ${
                  filterDir === d
                    ? 'bg-cyan-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        {displayedVehicles.length === 0 ? (
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-6 text-center text-slate-400 text-xs">
            No approaching vehicles currently in wireless reception range of RSU-SPAT-01. Vehicles will appear here as they enter the 5.9 GHz broadcast zone.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-[11px]">
                  <th className="py-2.5 px-3 font-semibold">Vehicle</th>
                  <th className="py-2.5 px-2 font-semibold">Corridor</th>
                  <th className="py-2.5 px-2 font-semibold">Stop Line Dist</th>
                  <th className="py-2.5 px-2 font-semibold">RSU Signal</th>
                  <th className="py-2.5 px-2 font-semibold">Current Speed</th>
                  <th className="py-2.5 px-2 font-semibold">RF Signal</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Autonomous AI Reaction</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                {displayedVehicles.map((v) => {
                  const activeLight = (v.direction === 'NORTH') ? activeSPaT.northLight
                    : (v.direction === 'SOUTH') ? activeSPaT.southLight
                    : (v.direction === 'EAST') ? activeSPaT.eastLight
                    : activeSPaT.westLight;
                  return (
                    <tr key={v.id} className="hover:bg-slate-950/40 transition-colors">
                      <td className="py-2.5 px-3 font-sans">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full ring-1 ring-slate-800 shrink-0"
                            style={{ backgroundColor: v.color }}
                          />
                          <span className="font-semibold text-white truncate max-w-[130px]">
                            {v.name}
                          </span>
                        </div>
                      </td>

                      <td className="py-2.5 px-2">
                        <span className="flex items-center gap-1 text-slate-300 font-sans text-xs">
                          {getDirectionIcon(v.direction)}
                          <span>{v.direction}</span>
                        </span>
                      </td>

                      <td className="py-2.5 px-2 text-slate-300">
                        {Math.max(0, Math.floor(v.distanceToStopLine))} m
                      </td>

                      <td className="py-2.5 px-2">
                        <span className={`font-bold ${
                          activeLight === 'GREEN' ? 'text-emerald-400' :
                          activeLight === 'YELLOW' ? 'text-amber-400' : 'text-rose-400'
                        }`}>
                          {activeLight}
                        </span>
                      </td>

                      <td className="py-2.5 px-2 text-white">
                        {Math.round(v.speed)} km/h
                        {v.braking && (
                          <span className="text-[10px] text-rose-400 ml-1">
                            ({Math.round(v.brakeForce)}% brk)
                          </span>
                        )}
                      </td>

                      <td className="py-2.5 px-2 text-cyan-400">
                        {v.v2iSignalReceived?.signalStrengthDbm ?? -50} dBm
                      </td>

                      <td className="py-2.5 px-3 text-right">
                        {getReactionBadge(v)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
