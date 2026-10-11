/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  Radio, 
  Cpu, 
  Zap, 
  Sliders, 
  TrendingUp, 
  ShieldCheck, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Gauge, 
  Flame, 
  ArrowRight,
  Server
} from 'lucide-react';
import { IntersectionSimulation } from '../utils/simulationEngine';
import { RSUArbiterConfig } from '../types/v2x';

interface RSUArbiterViewProps {
  simulation: IntersectionSimulation;
}

export const RSUArbiterView: React.FC<RSUArbiterViewProps> = ({ simulation }) => {
  const state = simulation.getState();
  const { rsuConfig, rsuPriorityQueue } = state;

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
      {/* Component Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-cyan-950 text-cyan-400 border border-cyan-800 uppercase tracking-wider flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-cyan-400" />
              RSU Edge Infrastructure
            </span>
            <span className="text-slate-500 text-xs font-mono">50 Hz Real-Time Arbitration Loop</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Roadside Unit (RSU) Dynamic Priority Arbiter
          </h2>
          <p className="text-slate-400 text-xs mt-1 max-w-3xl">
            Centralized edge controller dynamically weighting vehicle speed, kinetic momentum, and estimated arrival time to schedule optimal crossing sequences with zero traffic lights.
          </p>
        </div>

        {/* Live Performance Stats */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="bg-slate-950 border border-slate-800 px-3 py-2 rounded-xl text-center min-w-[95px]">
            <span className="text-slate-400 text-[10px] block uppercase font-medium">Arbitrations</span>
            <span className="text-lg font-mono font-bold text-cyan-400">
              {state.stats.totalArbitrationsCompleted}
            </span>
          </div>
          <div className="bg-slate-950 border border-slate-800 px-3 py-2 rounded-xl text-center min-w-[95px]">
            <span className="text-slate-400 text-[10px] block uppercase font-medium">Energy Saved</span>
            <span className="text-lg font-mono font-bold text-emerald-400">
              {rsuConfig.energySavedKWh.toFixed(1)} kWh
            </span>
          </div>
          <div className="bg-slate-950 border border-slate-800 px-3 py-2 rounded-xl text-center min-w-[95px]">
            <span className="text-slate-400 text-[10px] block uppercase font-medium">Delay Saved</span>
            <span className="text-lg font-mono font-bold text-indigo-400">
              -{rsuConfig.delayReductionPct}%
            </span>
          </div>
        </div>
      </div>

      {/* Arbitration Mode & Dynamic Weight Tuners */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Mode Selector: 5 Columns */}
        <div className="lg:col-span-5 bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-cyan-400" />
              Arbitration Strategy Policy
            </span>
            <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800">
              Active: {rsuConfig.mode.replace('_', ' ')}
            </span>
          </div>

          <div className="space-y-2">
            {[
              {
                id: 'DYNAMIC_SPEED_ARRIVAL',
                title: 'Speed & Arrival Hybrid (Recommended)',
                desc: 'Balanced Pareto-optimal weighting of arrival urgency and kinetic momentum preservation.',
              },
              {
                id: 'KINETIC_MOMENTUM_PRESERVATION',
                title: 'Kinetic Momentum Preservation',
                desc: 'Minimizes fuel-wasting deceleration by prioritizing fast cars and heavy commercial trucks.',
              },
              {
                id: 'STRICT_FCFS',
                title: 'Strict First-Come-First-Served (FCFS)',
                desc: 'Unweighted queue: slot assigned strictly by earliest arrival time (legacy benchmark).',
              },
            ].map((policy) => {
              const isSelected = rsuConfig.mode === policy.id;
              return (
                <button
                  key={policy.id}
                  onClick={() => simulation.setRSUMode(policy.id as RSUArbiterConfig['mode'])}
                  className={`w-full p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-cyan-950/60 border-cyan-500 shadow-sm'
                      : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold ${isSelected ? 'text-cyan-300' : 'text-slate-300'}`}>
                      {policy.title}
                    </span>
                    {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">{policy.desc}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Dynamic Weight Sliders: 7 Columns */}
        <div className="lg:col-span-7 bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-cyan-400" />
              Dynamic Priority Coefficients (P = W_a·A + W_s·S + W_m·M)
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              Sum: {Math.round((rsuConfig.arrivalWeight + rsuConfig.speedWeight + rsuConfig.momentumWeight) * 100)}%
            </span>
          </div>

          <div className="space-y-3.5 text-xs">
            {/* Arrival Urgency Weight */}
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-300 font-medium">Arrival Urgency Weight (W_arrival):</span>
                <span className="font-mono text-cyan-400 font-bold">
                  {Math.round(rsuConfig.arrivalWeight * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0.1"
                max="0.8"
                step="0.05"
                value={rsuConfig.arrivalWeight}
                onChange={(e) => simulation.setRSUWeights(Number(e.target.value), rsuConfig.speedWeight, rsuConfig.momentumWeight)}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <span className="text-[10px] text-slate-500 block">
                Favors vehicles with lower Time-to-Intersection (TTI).
              </span>
            </div>

            {/* Speed Efficiency Weight */}
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-300 font-medium">Speed Preservation Weight (W_speed):</span>
                <span className="font-mono text-cyan-400 font-bold">
                  {Math.round(rsuConfig.speedWeight * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0.1"
                max="0.8"
                step="0.05"
                value={rsuConfig.speedWeight}
                onChange={(e) => simulation.setRSUWeights(rsuConfig.arrivalWeight, Number(e.target.value), rsuConfig.momentumWeight)}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <span className="text-[10px] text-slate-500 block">
                Favors vehicles traveling at high speeds (45–55 km/h) to eliminate braking losses.
              </span>
            </div>

            {/* Momentum / Inertia Weight */}
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-300 font-medium">Mass &amp; Momentum Weight (W_momentum):</span>
                <span className="font-mono text-cyan-400 font-bold">
                  {Math.round(rsuConfig.momentumWeight * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0.05"
                max="0.5"
                step="0.05"
                value={rsuConfig.momentumWeight}
                onChange={(e) => simulation.setRSUWeights(rsuConfig.arrivalWeight, rsuConfig.speedWeight, Number(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <span className="text-[10px] text-slate-500 block">
                Prevents stopping heavy freight trucks (9,000 kg), preserving diesel / battery range.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Live Priority Queue Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Radio className="w-4 h-4 text-cyan-400" />
            RSU Real-Time Priority Schedule (SAE J2735 Signal Status Message)
          </h3>
          <span className="text-xs font-mono text-slate-400">
            {rsuPriorityQueue.length} Approaching Vehicles Queued
          </span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Priority Rank</th>
                <th className="py-2.5 px-3">Vehicle</th>
                <th className="py-2.5 px-3">Approach</th>
                <th className="py-2.5 px-3">Speed</th>
                <th className="py-2.5 px-3">TTI</th>
                <th className="py-2.5 px-3">Distance</th>
                <th className="py-2.5 px-3">Priority Score</th>
                <th className="py-2.5 px-3">RSU Command Advisory</th>
                <th className="py-2.5 px-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-slate-950/70 font-mono text-slate-300">
              {rsuPriorityQueue.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-6 text-slate-500 font-sans">
                    No approaching vehicles currently in RSU arbitration range.
                  </td>
                </tr>
              ) : (
                rsuPriorityQueue.map((item, idx) => {
                  const isP0 = item.priorityTier === 'P0_EMERGENCY';
                  const isP1 = item.priorityTier === 'P1_MOMENTUM_HIGH';

                  return (
                    <tr key={item.vehicleId} className="hover:bg-slate-900/60">
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          isP0
                            ? 'bg-rose-950 text-rose-300 border border-rose-800 animate-pulse'
                            : isP1
                              ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                              : 'bg-slate-900 text-slate-400 border border-slate-800'
                        }`}>
                          #{idx + 1} {item.priorityTier.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-bold text-white font-sans flex items-center gap-1.5">
                        <span>{item.name}</span>
                        {item.type === 'EMERGENCY_AMBULANCE' && (
                          <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                        )}
                      </td>
                      <td className="py-2.5 px-3">{item.direction}</td>
                      <td className="py-2.5 px-3 text-cyan-300 font-bold">{item.speedKmh} km/h</td>
                      <td className="py-2.5 px-3 text-slate-200">{item.timeToIntersectionSec}s</td>
                      <td className="py-2.5 px-3 text-slate-400">{item.distanceToStopLineMeters}m</td>
                      <td className="py-2.5 px-3 font-bold">
                        <span className={isP0 ? 'text-rose-400 font-bold' : isP1 ? 'text-cyan-400 font-bold' : 'text-slate-300'}>
                          {item.dynamicPriorityScore} pts
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-sans font-bold ${
                          item.advisoryAction === 'EMERGENCY_PREEMPT'
                            ? 'bg-rose-950 text-rose-300 border border-rose-800'
                            : item.advisoryAction === 'PASS_FULL_SPEED'
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              : item.advisoryAction === 'CACC_SPEED_ADJUST'
                                ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                : 'bg-slate-900 text-slate-400 border border-slate-800'
                        }`}>
                          {item.advisoryAction.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <span className="text-emerald-400 font-semibold">{item.status}</span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
