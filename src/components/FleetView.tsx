/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Cpu, 
  Terminal, 
  Radio, 
  Activity, 
  RotateCw, 
  Server, 
  Wifi, 
  HardDrive, 
  ShieldCheck,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { IntersectionSimulation } from '../utils/simulationEngine';
import { Vehicle } from '../types/v2x';

interface FleetViewProps {
  simulation: IntersectionSimulation;
}

export const FleetView: React.FC<FleetViewProps> = ({ simulation }) => {
  const state = simulation.getState();
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const selectedVehicle = state.vehicles.find((v) => v.id === selectedNodeId) || state.vehicles[0];

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Page Header */}
      <div className="border-b border-slate-800 pb-5">
        <div className="flex items-center gap-2 mb-1">
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-cyan-950 text-cyan-400 border border-cyan-800 uppercase tracking-wider">
            Distributed Systems Infrastructure
          </span>
          <span className="text-slate-500 text-xs">Docker Containerization • OpenJDK 21 • WebSockets / MQTT</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          Dockerized Vehicle Nodes &amp; Real-Time Telemetry Mesh
        </h1>
        <p className="text-slate-400 text-sm mt-1 max-w-3xl">
          Each vehicle functions as an isolated containerized Java microservice instance connected to a low-latency virtual broker network, executing real-time kinematic calculations, cryptographic signing, and cooperative trajectory scheduling.
        </p>
      </div>

      {/* Fleet Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-cyan-950/80 border border-cyan-800 flex items-center justify-center text-cyan-400">
            <Server className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-medium">Active Containers</span>
            <p className="text-xl font-mono font-bold text-white">{state.vehicles.length} Nodes Online</p>
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-950/80 border border-emerald-800 flex items-center justify-center text-emerald-400">
            <Wifi className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-medium">Mean Channel RTT</span>
            <p className="text-xl font-mono font-bold text-emerald-400">{state.stats.avgLatencyMs} ms</p>
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-950/80 border border-blue-800 flex items-center justify-center text-blue-400">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-medium">Mesh Throughput</span>
            <p className="text-xl font-mono font-bold text-blue-400">{state.stats.bandwidthKbps} kbps</p>
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-950/80 border border-indigo-800 flex items-center justify-center text-indigo-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-medium">PKI Certificate Revocations</span>
            <p className="text-xl font-mono font-bold text-indigo-300">0 (All Valid)</p>
          </div>
        </div>
      </div>

      {/* Node Grid & Detailed Diagnostics */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Node Containers List: 6 Columns */}
        <div className="lg:col-span-6 bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Cpu className="w-4 h-4 text-cyan-400" />
              Live Container Nodes (docker-compose)
            </h2>
            <span className="text-xs text-slate-400 font-mono">Bridge: 172.28.0.0/16</span>
          </div>

          <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
            {state.vehicles.map((v) => {
              const isSelected = selectedVehicle?.id === v.id;

              return (
                <div
                  key={v.id}
                  onClick={() => setSelectedNodeId(v.id)}
                  className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-slate-800/90 border-cyan-500 shadow-md'
                      : 'bg-slate-950 border-slate-800/80 hover:bg-slate-900/80'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2.5 h-2.5 rounded-full ring-2 ring-slate-800"
                        style={{ backgroundColor: v.color }}
                      />
                      <span className="font-bold text-white font-mono">{v.dockerContainerId}</span>
                      <span className="text-slate-400 font-mono text-[11px]">({v.containerIp})</span>
                    </div>

                    <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-mono bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                      <CheckCircle2 className="w-3 h-3" />
                      UP 99.9%
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-[11px] text-slate-400 pt-2 border-t border-slate-800/60 font-mono">
                    <div>
                      <span className="text-slate-500 block text-[9px] uppercase">CPU</span>
                      <span className="text-slate-200">{v.cpuUsage}%</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[9px] uppercase">RAM (JVM Heap)</span>
                      <span className="text-slate-200">{v.memoryMb} MB</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[9px] uppercase">Sidelink RTT</span>
                      <span className="text-cyan-400">{v.networkLatencyMs} ms</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Container Node Diagnostics & Terminal: 6 Columns */}
        <div className="lg:col-span-6 space-y-4">
          {selectedVehicle ? (
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-cyan-400" />
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      Node Diagnostics: {selectedVehicle.dockerContainerId}
                    </h3>
                    <p className="text-[11px] text-slate-400 font-mono">
                      Image: eclipse-temurin:21-alpine • Process: PID 1 (java -jar v2x-agent.jar)
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    // Refresh latency simulation
                    selectedVehicle.networkLatencyMs = Number((1.5 + Math.random() * 2).toFixed(2));
                  }}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                  title="Ping container"
                >
                  <RotateCw className="w-3.5 h-3.5 text-cyan-400" />
                </button>
              </div>

              {/* Hardware / Schedular Metrics */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-slate-400 text-[10px] uppercase font-semibold">Java Virtual Machine</span>
                  <p className="font-mono text-white font-bold">OpenJDK 21.0.3 (64-Bit)</p>
                  <p className="text-[10px] text-slate-500">ZGC Garbage Collector &bull; Sub-millisecond pause</p>
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-slate-400 text-[10px] uppercase font-semibold">Communication Thread Pool</span>
                  <p className="font-mono text-cyan-400 font-bold">4 Virtual Threads (Loom)</p>
                  <p className="text-[10px] text-slate-500">Non-blocking NIO Sockets</p>
                </div>
              </div>

              {/* Simulated Live Node Console Logs */}
              <div className="bg-slate-950 rounded-xl p-3.5 border border-slate-800 font-mono text-[11px] text-slate-300 space-y-1 max-h-[220px] overflow-y-auto">
                <div className="text-slate-500">// Real-time stdout stream (Java VehicleV2XAgent)</div>
                <div className="text-emerald-400">
                  [{new Date().toLocaleTimeString()}] [INFO] [NetworkStack] Initialized direct PC5 sidelink interface (MAC: 02:42:AC:1C:00:{selectedVehicle.id.slice(4)})
                </div>
                <div className="text-cyan-300">
                  [{new Date().toLocaleTimeString()}] [INFO] [CryptoEngine] Loaded OBU Pseudonym Cert: {selectedVehicle.pseudonymCertId}
                </div>
                <div className="text-slate-300">
                  [{new Date().toLocaleTimeString()}] [DEBUG] [KinematicsEngine] Current state: v={selectedVehicle.speed.toFixed(1)} km/h, distToStop={selectedVehicle.distanceToStopLine.toFixed(0)}m, tti={selectedVehicle.timeToIntersection.toFixed(1)}s
                </div>
                <div className="text-sky-300">
                  [{new Date().toLocaleTimeString()}] [INFO] [WeatherAdaptation] Surface grip μ={selectedVehicle.weatherTelemetry?.surfaceFrictionMu ?? 0.85}, est stopping dist={selectedVehicle.weatherTelemetry?.brakingDistanceMeters ?? 0}m, safe CACC gap={selectedVehicle.weatherTelemetry?.safeFollowingDistanceMeters ?? 15}m (Optical vis: {selectedVehicle.weatherTelemetry?.opticalVisibilityMeters ?? 250}m)
                </div>
                <div className="text-indigo-300">
                  [{new Date().toLocaleTimeString()}] [INFO] [SlotScheduler] Negotiation message dispatched to Edge Arbiter (Seq #{selectedVehicle.packetSequenceNumber})
                </div>
                {selectedVehicle.braking && (
                  <div className="text-amber-400">
                    [{new Date().toLocaleTimeString()}] [WARN] [CACC] Collision hazard buffer active: applying deceleration {selectedVehicle.brakeForce.toFixed(0)}%
                  </div>
                )}
                {selectedVehicle.hasSlotReserved && (
                  <div className="text-emerald-400">
                    [{new Date().toLocaleTimeString()}] [INFO] [SlotScheduler] Conflict-free slot confirmed by Arbiter. Acceleration envelope approved.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 text-center text-slate-400">
              Select a container node from the fleet list to inspect diagnostics.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
