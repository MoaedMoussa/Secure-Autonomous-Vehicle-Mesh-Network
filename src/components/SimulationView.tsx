/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect, useState } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Siren, 
  Zap, 
  ShieldCheck, 
  Gauge, 
  AlertCircle, 
  Radio, 
  CheckCircle2, 
  Clock, 
  CarFront, 
  Info,
  ShieldAlert,
  Sliders,
  Compass,
  AlertTriangle,
  Flame,
  Shield,
  Truck,
  Car,
  Lightbulb,
  User,
  CloudRain,
  CloudFog,
  Snowflake,
  Sun,
  Droplets,
  Eye,
  Activity,
  Download,
  Check,
  FileSpreadsheet
} from 'lucide-react';
import { downloadSimulationCsv } from '../utils/exportCsv';
import { 
  IntersectionSimulation, 
  CANVAS_SIZE, 
  CENTER, 
  ROAD_WIDTH, 
  HALF_ROAD,
  LANE_WIDTH,
  LANE_INNER_OFFSET,
  LANE_OUTER_OFFSET,
  CONFLICT_ZONE_RADIUS, 
  STOP_LINE_DIST,
  CELL_SIZE
} from '../utils/simulationEngine';
import { Direction, Vehicle, VehicleType, DriverPersonality, LightColor, WeatherCondition, UrbanTree, UrbanAmenity, Pedestrian } from '../types/v2x';
import * as d3 from 'd3';
import { D3DensityHeatmap } from './D3DensityHeatmap';
import { RSUArbiterView } from './RSUArbiterView';
import { TrafficLightRSUView } from './TrafficLightRSUView';
import { CollisionToastContainer } from './CollisionToastContainer';

interface SimulationViewProps {
  simulation: IntersectionSimulation;
}

export const SimulationView: React.FC<SimulationViewProps> = ({ simulation }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isRunning, setIsRunning] = useState(true);
  const [simSpeed, setSimSpeed] = useState(1);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [spawnNotice, setSpawnNotice] = useState<string | null>(null);
  const [exportSuccessMsg, setExportSuccessMsg] = useState<string | null>(null);
  const [, setRenderTrigger] = useState(0);

  const handleExportCSV = () => {
    const currentState = simulation.getState();
    const filename = downloadSimulationCsv(currentState);
    setExportSuccessMsg(`Exported ${filename}`);
    setTimeout(() => setExportSuccessMsg(null), 3000);
  };

  const handleSpawn = (dir: Direction, type: VehicleType, speed = 40, personality?: DriverPersonality) => {
    const v = simulation.spawnVehicle(dir, type, 'STRAIGHT', speed, personality);
    setSpawnNotice(`Spawned ${v.name} inbound from ${dir}`);
    setSelectedVehicleId(v.id);
    setTimeout(() => setSpawnNotice(null), 3500);
  };

  // Animation Loop
  useEffect(() => {
    let animationFrameId: number;
    let lastTime = performance.now();

    const loop = (currentTime: number) => {
      const dt = Math.min(0.1, (currentTime - lastTime) / 1000);
      lastTime = currentTime;

      if (isRunning) {
        simulation.step(dt * simSpeed);
      }

      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          drawScene(ctx, simulation, selectedVehicleId);
        }
      }

      // Re-render UI metrics occasionally
      setRenderTrigger((prev) => (prev + 1) % 60);

      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isRunning, simSpeed, selectedVehicleId, simulation]);

  // Click on vehicle to select
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    const state = simulation.getState();
    const clicked = state.vehicles.find((v) => {
      const dx = v.x - clickX;
      const dy = v.y - clickY;
      return Math.sqrt(dx * dx + dy * dy) < 25;
    });

    setSelectedVehicleId(clicked ? clicked.id : null);
  };

  const state = simulation.getState();
  const selectedVehicle = state.vehicles.find((v) => v.id === selectedVehicleId) || state.vehicles[0];
  const tlState = state.trafficLightState;

  const renderLightBulb = (color: LightColor, activeColor: LightColor) => {
    const isActive = color === activeColor;
    let bg = 'bg-slate-800';
    let ring = 'ring-slate-700/50';
    let shadow = '';

    if (isActive) {
      if (color === 'RED') {
        bg = 'bg-rose-500';
        ring = 'ring-rose-400';
        shadow = 'shadow-[0_0_12px_rgba(244,63,94,0.8)]';
      } else if (color === 'YELLOW') {
        bg = 'bg-amber-400';
        ring = 'ring-amber-300';
        shadow = 'shadow-[0_0_12px_rgba(251,191,36,0.8)]';
      } else if (color === 'GREEN') {
        bg = 'bg-emerald-400';
        ring = 'ring-emerald-300';
        shadow = 'shadow-[0_0_12px_rgba(52,211,153,0.8)]';
      }
    }

    return (
      <span
        className={`inline-block w-3.5 h-3.5 rounded-full transition-all duration-200 ring-1 ${bg} ${ring} ${shadow}`}
      />
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-cyan-950 text-cyan-400 border border-cyan-800 uppercase tracking-wider">
              {tlState.mode === 'TRAFFIC_LIGHTS' ? 'Traffic Signals + V2X Preemption' : 'Zero-Light Cooperative V2X'}
            </span>
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800 uppercase tracking-wider">
              V2V Collision Avoidance Active
            </span>
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-950 text-amber-300 border border-amber-800 uppercase tracking-wider">
              Human Yellow Dilemma Active
            </span>
            <span className="text-slate-500 text-xs">SAE J2735 / IEEE 1609.2</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Autonomous Vehicle Dynamic Intersection Simulation
          </h1>
          <p className="text-slate-400 text-sm mt-1 max-w-3xl">
            High-fidelity simulation featuring realistic asphalt road geometry, intelligent traffic signals with human dilemma zone behavior (cautious deceleration vs aggressive yellow-light speeding), and emergency vehicle preemption (police, ambulances, and fire trucks triggering cooperative rescue corridor maneuvers).
          </p>
        </div>

        {/* Live Stat Badges */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="bg-slate-900 border border-slate-800 px-3 py-2 rounded-xl text-center min-w-[90px]">
            <span className="text-slate-400 text-[10px] block uppercase font-medium">Passed</span>
            <span className="text-xl font-mono font-bold text-emerald-400">
              {state.stats.totalVehiclesPassed}
            </span>
          </div>
          <div className="bg-slate-900 border border-slate-800 px-3 py-2 rounded-xl text-center min-w-[90px]">
            <span className="text-slate-400 text-[10px] block uppercase font-medium">AEB Avoided</span>
            <span className="text-xl font-mono font-bold text-rose-400">
              {state.stats.collisionsAvoidedByAEB}
            </span>
          </div>
          <div className="bg-slate-900 border border-slate-800 px-3 py-2 rounded-xl text-center min-w-[90px]">
            <span className="text-slate-400 text-[10px] block uppercase font-medium">Steer Avoided</span>
            <span className="text-xl font-mono font-bold text-cyan-400">
              {state.stats.collisionsAvoidedBySteer}
            </span>
          </div>
          <div className="bg-slate-900 border border-slate-800 px-3 py-2 rounded-xl text-center min-w-[90px]">
            <span className="text-slate-400 text-[10px] block uppercase font-medium">Sidelink Latency</span>
            <span className="text-xl font-mono font-bold text-blue-400">
              {state.globalNetworkLatencyMs} ms
            </span>
          </div>
        </div>
      </div>

      {/* Main Simulation Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Canvas & Simulation Controls: 7 Columns */}
        <div className="lg:col-span-7 bg-slate-900/70 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-4">
          
          {/* Top Control Bar: Play/Pause, Speed, Mode Switcher */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800/80">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsRunning(!isRunning)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold text-xs transition-all cursor-pointer ${
                  isRunning
                    ? 'bg-amber-600/20 text-amber-300 border border-amber-500/40 hover:bg-amber-600/30'
                    : 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-md shadow-emerald-900/30'
                }`}
                title={isRunning ? 'Pause Simulation' : 'Resume Simulation'}
              >
                {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{isRunning ? 'Pause' : 'Start'}</span>
              </button>

              <div className="flex items-center bg-slate-900 rounded-lg p-0.5 border border-slate-800 text-xs">
                {[1, 2, 4].map((spd) => (
                  <button
                    key={spd}
                    onClick={() => setSimSpeed(spd)}
                    className={`px-2 py-1 rounded font-mono text-xs transition-colors cursor-pointer ${
                      simSpeed === spd
                        ? 'bg-cyan-500 text-slate-950 font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {spd}x
                  </button>
                ))}
              </div>
            </div>

            {/* Mode Toggle Button */}
            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  simulation.setTrafficLightMode(
                    tlState.mode === 'TRAFFIC_LIGHTS' ? 'V2X_COOPERATIVE_ONLY' : 'TRAFFIC_LIGHTS'
                  )
                }
                className={`px-3 py-1.5 rounded-lg font-semibold text-xs border transition-all cursor-pointer flex items-center gap-1.5 ${
                  tlState.mode === 'TRAFFIC_LIGHTS'
                    ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/40 hover:bg-cyan-500/20'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                }`}
              >
                <Lightbulb className="w-3.5 h-3.5 text-cyan-400" />
                <span>{tlState.mode === 'TRAFFIC_LIGHTS' ? 'Signal Lights: ON' : 'Signal Lights: OFF'}</span>
              </button>

              <button
                onClick={() => simulation.triggerCollisionCourseScenario()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600/20 text-rose-300 border border-rose-500/40 hover:bg-rose-600/30 text-xs font-semibold transition-all cursor-pointer shadow-sm hover:shadow-rose-950/50"
                title="Spawn 2 vehicles on direct collision course to test real-time toast alert, AEB, and evasive steering"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                <span>Test Collision Alert</span>
              </button>

              <button
                onClick={handleExportCSV}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-600/30 text-xs font-semibold transition-all cursor-pointer shadow-sm hover:shadow-emerald-950/50"
                title="Download full session telemetry CSV report with latency statistics, active fleet data, and collision prevention incident logs"
              >
                {exportSuccessMsg ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Report Exported!</span>
                  </>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Export CSV Report</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Traffic Signal HUD & Quick Preemption Controls */}
          {tlState.mode === 'TRAFFIC_LIGHTS' ? (
            <div className="bg-slate-950/90 p-3 rounded-xl border border-slate-800/80 space-y-3">
              {/* 4 Individual Directional Approaches (One Light at a Time) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                {/* North Approach */}
                <div className={`p-2 rounded-lg border transition-all ${
                  tlState.activeDirection === 'NORTH'
                    ? 'bg-slate-900 border-cyan-500/50 shadow-md shadow-cyan-950/50'
                    : 'bg-slate-900/60 border-slate-800'
                }`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-slate-300 text-[11px]">North App:</span>
                    <div className="flex items-center gap-1 bg-black/60 px-1.5 py-0.5 rounded border border-slate-800">
                      {renderLightBulb('RED', tlState.northLight)}
                      {renderLightBulb('YELLOW', tlState.northLight)}
                      {renderLightBulb('GREEN', tlState.northLight)}
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className={`font-bold ${
                      tlState.northLight === 'GREEN' ? 'text-emerald-400' :
                      tlState.northLight === 'YELLOW' ? 'text-amber-400' : 'text-rose-400'
                    }`}>{tlState.northLight}</span>
                    <span className="text-slate-400">
                      {tlState.activeDirection === 'NORTH' ? `${Math.ceil(tlState.phaseTimeRemainingSec)}s` : 'RED'}
                    </span>
                  </div>
                </div>

                {/* East Approach */}
                <div className={`p-2 rounded-lg border transition-all ${
                  tlState.activeDirection === 'EAST'
                    ? 'bg-slate-900 border-cyan-500/50 shadow-md shadow-cyan-950/50'
                    : 'bg-slate-900/60 border-slate-800'
                }`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-slate-300 text-[11px]">East App:</span>
                    <div className="flex items-center gap-1 bg-black/60 px-1.5 py-0.5 rounded border border-slate-800">
                      {renderLightBulb('RED', tlState.eastLight)}
                      {renderLightBulb('YELLOW', tlState.eastLight)}
                      {renderLightBulb('GREEN', tlState.eastLight)}
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className={`font-bold ${
                      tlState.eastLight === 'GREEN' ? 'text-emerald-400' :
                      tlState.eastLight === 'YELLOW' ? 'text-amber-400' : 'text-rose-400'
                    }`}>{tlState.eastLight}</span>
                    <span className="text-slate-400">
                      {tlState.activeDirection === 'EAST' ? `${Math.ceil(tlState.phaseTimeRemainingSec)}s` : 'RED'}
                    </span>
                  </div>
                </div>

                {/* South Approach */}
                <div className={`p-2 rounded-lg border transition-all ${
                  tlState.activeDirection === 'SOUTH'
                    ? 'bg-slate-900 border-cyan-500/50 shadow-md shadow-cyan-950/50'
                    : 'bg-slate-900/60 border-slate-800'
                }`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-slate-300 text-[11px]">South App:</span>
                    <div className="flex items-center gap-1 bg-black/60 px-1.5 py-0.5 rounded border border-slate-800">
                      {renderLightBulb('RED', tlState.southLight)}
                      {renderLightBulb('YELLOW', tlState.southLight)}
                      {renderLightBulb('GREEN', tlState.southLight)}
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className={`font-bold ${
                      tlState.southLight === 'GREEN' ? 'text-emerald-400' :
                      tlState.southLight === 'YELLOW' ? 'text-amber-400' : 'text-rose-400'
                    }`}>{tlState.southLight}</span>
                    <span className="text-slate-400">
                      {tlState.activeDirection === 'SOUTH' ? `${Math.ceil(tlState.phaseTimeRemainingSec)}s` : 'RED'}
                    </span>
                  </div>
                </div>

                {/* West Approach */}
                <div className={`p-2 rounded-lg border transition-all ${
                  tlState.activeDirection === 'WEST'
                    ? 'bg-slate-900 border-cyan-500/50 shadow-md shadow-cyan-950/50'
                    : 'bg-slate-900/60 border-slate-800'
                }`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-slate-300 text-[11px]">West App:</span>
                    <div className="flex items-center gap-1 bg-black/60 px-1.5 py-0.5 rounded border border-slate-800">
                      {renderLightBulb('RED', tlState.westLight)}
                      {renderLightBulb('YELLOW', tlState.westLight)}
                      {renderLightBulb('GREEN', tlState.westLight)}
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className={`font-bold ${
                      tlState.westLight === 'GREEN' ? 'text-emerald-400' :
                      tlState.westLight === 'YELLOW' ? 'text-amber-400' : 'text-rose-400'
                    }`}>{tlState.westLight}</span>
                    <span className="text-slate-400">
                      {tlState.activeDirection === 'WEST' ? `${Math.ceil(tlState.phaseTimeRemainingSec)}s` : 'RED'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 3-Second All-Red Clearance Interval Banner */}
              {tlState.isAllRedClearance && (
                <div className="bg-rose-950/70 border border-rose-700/80 p-2.5 rounded-lg flex items-center justify-between gap-2 text-xs text-rose-200 animate-pulse">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping shrink-0" />
                    <div>
                      <strong className="block text-white">3.0s ALL-RED CLEARANCE INTERVAL ACTIVE:</strong>
                      <span>Holding all 4 approach signals at RED. Allows yellow-light vehicles to fully evacuate intersection center before next green.</span>
                    </div>
                  </div>
                  <div className="bg-rose-900/90 border border-rose-600 px-2 py-1 rounded text-center shrink-0">
                    <span className="text-[10px] text-rose-300 block uppercase">Clearance</span>
                    <span className="text-sm font-mono font-bold text-white">{tlState.clearanceTimeRemainingSec.toFixed(1)}s</span>
                  </div>
                </div>
              )}

              {/* Approach Green Switchers & Red-Emergency Test Controls */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800/80 text-xs">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-slate-400 font-medium text-[11px]">Force Approach Green:</span>
                  {(['NORTH', 'EAST', 'SOUTH', 'WEST'] as Direction[]).map((dir) => (
                    <button
                      key={dir}
                      onClick={() => simulation.forceApproachGreen(dir)}
                      className={`px-2 py-0.5 rounded text-[11px] font-semibold border transition-all cursor-pointer ${
                        tlState.activeDirection === dir
                          ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                          : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800'
                      }`}
                    >
                      {dir.charAt(0) + dir.slice(1).toLowerCase()}
                    </button>
                  ))}
                  <button
                    onClick={() => simulation.triggerAllRedClearance()}
                    className="px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-800 cursor-pointer transition-colors"
                    title="Trigger immediate 3-second All-Red clearance interval"
                  >
                    3s All-Red
                  </button>
                </div>

                <button
                  onClick={() => simulation.triggerRedEmergencyScenario()}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-600/20 text-amber-300 border border-amber-500/40 hover:bg-amber-600/30 text-[11px] font-semibold transition-all cursor-pointer"
                  title="Test Green-Light Cars Yielding to an Emergency Ambulance Approaching from a RED Light"
                >
                  <Siren className="w-3.5 h-3.5 text-amber-400" />
                  <span>Test Red-Signal Emergency</span>
                </button>
              </div>

              {tlState.emergencyPreemptionActive && (
                <div className="flex items-center gap-2 text-xs bg-rose-950/40 text-rose-300 px-3 py-1.5 rounded-lg border border-rose-800/60 animate-pulse font-medium">
                  <Siren className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>EMERGENCY VEHICLE PREEMPTION ACTIVE: Priority green granted to emergency route. Civilian vehicles holding or pulling over to shoulder.</span>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-slate-950/90 p-3 rounded-xl border border-cyan-800/40 flex items-center justify-between text-xs gap-3">
              <div className="flex items-center gap-2.5 text-cyan-300">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shrink-0" />
                <span className="font-semibold text-white">V2X Cooperative Mode Active:</span>
                <span className="text-slate-300">Physical signals are on standby caution. RSU arbitrates conflict-free virtual space-time slots via 5.9 GHz sidelinks.</span>
              </div>
              <button
                onClick={() => simulation.setTrafficLightMode('TRAFFIC_LIGHTS')}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-700/50 cursor-pointer transition-colors shrink-0"
              >
                Switch to Traffic Lights Mode
              </button>
            </div>
          )}

          {/* Quick Vehicle Spawner Bar */}
          <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-semibold px-1">Spawn Vehicle:</span>
              {spawnNotice && (
                <span className="text-[11px] font-mono text-emerald-300 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800 animate-pulse font-medium">
                  ✓ {spawnNotice}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => {
                  const dirs: Direction[] = ['NORTH', 'SOUTH', 'EAST', 'WEST'];
                  const dir = dirs[Math.floor(Math.random() * dirs.length)];
                  handleSpawn(dir, 'POLICE_PATROL', 52);
                }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-600/20 text-blue-300 border border-blue-500/40 hover:bg-blue-600/30 text-xs font-semibold transition-all cursor-pointer shadow-sm shadow-blue-900/20 active:scale-95"
                title="Spawn Police Interceptor with sirens & strobe lights"
              >
                <Shield className="w-3.5 h-3.5 text-blue-400" />
                <span>Police</span>
              </button>

              <button
                onClick={() => {
                  const dirs: Direction[] = ['NORTH', 'SOUTH', 'EAST', 'WEST'];
                  const dir = dirs[Math.floor(Math.random() * dirs.length)];
                  handleSpawn(dir, 'EMERGENCY_AMBULANCE', 55);
                }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-rose-600/20 text-rose-300 border border-rose-500/40 hover:bg-rose-600/30 text-xs font-semibold transition-all cursor-pointer shadow-sm shadow-rose-900/20 active:scale-95"
                title="Spawn Priority Emergency Ambulance"
              >
                <Siren className="w-3.5 h-3.5 text-rose-400" />
                <span>Ambulance</span>
              </button>

              <button
                onClick={() => {
                  const dirs: Direction[] = ['NORTH', 'SOUTH', 'EAST', 'WEST'];
                  const dir = dirs[Math.floor(Math.random() * dirs.length)];
                  handleSpawn(dir, 'FIRE_ENGINE', 50);
                }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-600/20 text-red-300 border border-red-500/40 hover:bg-red-600/30 text-xs font-semibold transition-all cursor-pointer shadow-sm shadow-red-900/20 active:scale-95"
                title="Spawn Heavy Fire Rescue Engine"
              >
                <Flame className="w-3.5 h-3.5 text-red-400" />
                <span>Fire Engine</span>
              </button>

              <button
                onClick={() => {
                  const dirs: Direction[] = ['NORTH', 'SOUTH', 'EAST', 'WEST'];
                  const dir = dirs[Math.floor(Math.random() * dirs.length)];
                  handleSpawn(dir, 'STANDARD_AV', 40);
                }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-600/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-600/30 text-xs font-semibold transition-all cursor-pointer active:scale-95"
                title="Spawn Civilian Autonomous Vehicle"
              >
                <Car className="w-3.5 h-3.5 text-emerald-400" />
                <span>Civilian AV</span>
              </button>

              <button
                onClick={() => {
                  const dirs: Direction[] = ['NORTH', 'SOUTH', 'EAST', 'WEST'];
                  const dir = dirs[Math.floor(Math.random() * dirs.length)];
                  handleSpawn(dir, 'HEAVY_TRUCK', 36);
                }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-600/20 text-amber-300 border border-amber-500/40 hover:bg-amber-600/30 text-xs font-semibold transition-all cursor-pointer active:scale-95"
                title="Spawn Heavy Commercial Freight Truck"
              >
                <Truck className="w-3.5 h-3.5 text-amber-400" />
                <span>Heavy Truck</span>
              </button>

              <button
                onClick={() => {
                  const dirs: Direction[] = ['NORTH', 'SOUTH', 'EAST', 'WEST'];
                  const dir = dirs[Math.floor(Math.random() * dirs.length)];
                  handleSpawn(dir, 'STANDARD_AV', 44, 'HUMAN_AGGRESSIVE');
                }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-purple-600/20 text-purple-300 border border-purple-500/40 hover:bg-purple-600/30 text-xs font-semibold transition-all cursor-pointer shadow-sm shadow-purple-900/20 active:scale-95"
                title="Spawn Aggressive Human Driver who speeds up to beat yellow lights"
              >
                <Zap className="w-3.5 h-3.5 text-purple-400" />
                <span>⚡ Yellow-Speeder</span>
              </button>

              <button
                onClick={() => {
                  const dirs: Direction[] = ['NORTH', 'SOUTH', 'EAST', 'WEST'];
                  const dir = dirs[Math.floor(Math.random() * dirs.length)];
                  handleSpawn(dir, 'STANDARD_AV', 38, 'CAUTIOUS_HUMAN');
                }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-teal-600/20 text-teal-300 border border-teal-500/40 hover:bg-teal-600/30 text-xs font-semibold transition-all cursor-pointer active:scale-95"
                title="Spawn Cautious Human Driver who decelerates carefully for yellow"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
                <span>Cautious Driver</span>
              </button>
            </div>
          </div>

          {/* Weather Conditions & Tire Friction Adaptation Bar */}
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <CloudRain className="w-4 h-4 text-cyan-400" />
              <span className="text-slate-300 font-semibold">Weather &amp; Road Surface:</span>
              <span className="font-mono text-cyan-300 font-bold bg-slate-900 px-2 py-0.5 rounded border border-slate-800 flex items-center gap-1.5">
                <span>{state.weatherState.label}</span>
                <span className="text-amber-400 font-normal">| μ = {state.weatherState.frictionCoefficient}</span>
              </span>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              {(['CLEAR', 'RAIN', 'DENSE_FOG', 'SNOW_ICE'] as WeatherCondition[]).map((cond) => {
                const isSelected = state.weatherState.condition === cond;
                let icon = <Sun className="w-3.5 h-3.5 text-amber-400" />;
                let title = 'Clear & Dry: μ=0.85 optimal friction, nominal braking distance & standard following gap';
                let label = '☀️ Clear';
                if (cond === 'RAIN') {
                  icon = <CloudRain className="w-3.5 h-3.5 text-sky-400" />;
                  title = 'Heavy Rain: μ=0.48, +75% braking distance, 27m V2X following gap, wipers active';
                  label = '🌧️ Rain';
                } else if (cond === 'DENSE_FOG') {
                  icon = <CloudFog className="w-3.5 h-3.5 text-slate-300" />;
                  title = 'Dense Fog: 30m optical visibility (human/camera blind), 5.9 GHz V2X penetrates, 31m gap';
                  label = '🌫️ Fog';
                } else if (cond === 'SNOW_ICE') {
                  icon = <Snowflake className="w-3.5 h-3.5 text-cyan-300" />;
                  title = 'Snow & Black Ice: μ=0.22, almost 3x stopping distance (+185%), 40m safe gap';
                  label = '❄️ Ice/Snow';
                }

                return (
                  <button
                    key={cond}
                    onClick={() => simulation.setWeather(cond)}
                    title={title}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-900/30'
                        : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800 hover:bg-slate-850'
                    }`}
                  >
                    {icon}
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Network Message Latency Adjustment Bar */}
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-cyan-400" />
              <span className="text-slate-300 font-semibold">Message Latency (Dead Reckoning):</span>
              <span className="font-mono text-cyan-300 font-bold bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                {state.globalNetworkLatencyMs} ms
              </span>
            </div>

            <div className="flex items-center gap-3 flex-1 max-w-xs">
              <input
                type="range"
                min="2"
                max="120"
                step="2"
                value={state.globalNetworkLatencyMs}
                onChange={(e) => simulation.setGlobalLatency(Number(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
                title="Simulate DSRC/C-V2X channel latency"
              />
            </div>

            <div className="flex items-center gap-1">
              {[5, 25, 80].map((ms) => (
                <button
                  key={ms}
                  onClick={() => simulation.setGlobalLatency(ms)}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors cursor-pointer ${
                    state.globalNetworkLatencyMs === ms
                      ? 'bg-cyan-500 text-slate-950 font-bold'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {ms}ms
                </button>
              ))}
            </div>
          </div>

          {/* Real-Time D3 Spatial Heatmap Overlay Controls (Collision Risk & Signal Interference) */}
          <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-950/90 p-2.5 rounded-xl border border-slate-800 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => simulation.toggleHeatmapOverlay()}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  state.heatmapOverlayActive
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-900/40'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
                title="Toggle D3 spatial heatmap overlay directly on canvas"
              >
                <Flame className="w-3.5 h-3.5" />
                <span>D3 Heatmap: {state.heatmapOverlayActive ? 'ON' : 'OFF'}</span>
              </button>

              {state.heatmapOverlayActive && (
                <div className="flex items-center gap-1 flex-wrap">
                  <button
                    onClick={() => simulation.setHeatmapMode('COLLISION_RISK')}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                      state.heatmapMode === 'COLLISION_RISK'
                        ? 'bg-rose-500 text-white font-bold'
                        : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                    title="Highlight imminent kinetic collision risks and spatial conflict hotspots"
                  >
                    ⚠️ Collision Risk
                  </button>
                  <button
                    onClick={() => simulation.setHeatmapMode('SIGNAL_INTERFERENCE')}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                      state.heatmapMode === 'SIGNAL_INTERFERENCE'
                        ? 'bg-cyan-500 text-slate-950 font-bold'
                        : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                    title="Visualize 5.9 GHz V2X radio sidelink interference and channel contention"
                  >
                    ⚡ V2X Interference
                  </button>
                  <button
                    onClick={() => simulation.setHeatmapMode('COMPOSITE_RISK')}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                      state.heatmapMode === 'COMPOSITE_RISK'
                        ? 'bg-purple-500 text-white font-bold'
                        : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                    title="Dual-factor cyber-physical risk combining RF congestion and collision probability"
                  >
                    🛡️ Dual Risk
                  </button>
                  <button
                    onClick={() => simulation.setHeatmapMode('VEHICLE_DENSITY')}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                      state.heatmapMode === 'VEHICLE_DENSITY'
                        ? 'bg-amber-500 text-slate-950 font-bold'
                        : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                    title="Autonomous vehicle density and spatial concentration"
                  >
                    🚗 Fleet Density
                  </button>
                </div>
              )}
            </div>

            {state.heatmapOverlayActive && (
              <div className="flex items-center gap-1.5 font-mono text-[10px]">
                <span className="text-slate-500">Opacity:</span>
                {[0.4, 0.65, 0.9].map((op) => (
                  <button
                    key={op}
                    onClick={() => simulation.setHeatmapOpacity(op)}
                    className={`px-1.5 py-0.5 rounded cursor-pointer ${
                      Math.abs(state.heatmapOpacity - op) < 0.1
                        ? 'bg-slate-800 text-cyan-400 font-bold border border-cyan-800'
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {Math.round(op * 100)}%
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 2D Canvas Container */}
          <div className="relative aspect-square max-w-[620px] mx-auto bg-slate-950 rounded-xl overflow-hidden border border-slate-800 shadow-2xl flex items-center justify-center">
            <canvas
              ref={canvasRef}
              width={CANVAS_SIZE}
              height={CANVAS_SIZE}
              onClick={handleCanvasClick}
              className="w-full h-full cursor-crosshair"
              aria-label="Real-time 2D intersection simulation with autonomous vehicles communicating via V2X"
            />

            {/* In-Canvas Mini HUD overlay */}
            <div className="absolute top-3 left-3 bg-slate-950/85 backdrop-blur-md px-3 py-2 rounded-lg border border-slate-800 text-[11px] space-y-1 pointer-events-none">
              <div className="text-cyan-400 font-bold flex items-center gap-1.5">
                <Radio className="w-3 h-3" />
                <span>V2X Mesh ({state.vehicles.length} Nodes)</span>
              </div>
              <div className="text-slate-300 flex items-center gap-1">
                <span>Collision Guard:</span>
                <span className="text-emerald-400 font-mono font-semibold">AEB + Evasive Steer</span>
              </div>
              {state.activeCollisionWarningCount > 0 && (
                <div className="text-rose-400 font-mono font-bold flex items-center gap-1 animate-pulse">
                  <AlertTriangle className="w-3 h-3" />
                  <span>IMPACT RISK DETECTED ({state.activeCollisionWarningCount})</span>
                </div>
              )}
            </div>

            <div className="absolute bottom-3 right-3 bg-slate-950/80 backdrop-blur-md px-2.5 py-1.5 rounded-lg border border-slate-800 text-[10px] text-slate-400 pointer-events-none">
              Click vehicle for telemetry &amp; avoidance status
            </div>
          </div>

          {/* User Guide Notice */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-slate-300 flex items-start gap-2">
              <Lightbulb className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-amber-300 font-semibold block">Human Yellow Dilemma:</strong>
                Vehicles stop at red lights and decelerate on yellow. Aggressive drivers (40%) floor the accelerator to beat yellow lights when in the dilemma zone!
              </div>
            </div>
            <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-slate-300 flex items-start gap-2">
              <Siren className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-rose-300 font-semibold block">Emergency Rescue Corridor:</strong>
                When Police, Ambulance, or Fire Engines approach, civilian cars pull over to the road shoulder, turn on hazard lights, and clear the intersection.
              </div>
            </div>
          </div>

          {/* Quick Spawn Row */}
          <div className="flex items-center justify-between gap-2 pt-1 text-xs">
            <span className="text-slate-400 font-medium flex items-center gap-1">
              <CarFront className="w-3.5 h-3.5 text-cyan-400" />
              Spawn Inbound Approach:
            </span>
            <div className="flex items-center gap-1.5">
              {(['NORTH', 'SOUTH', 'EAST', 'WEST'] as Direction[]).map((dir) => (
                <button
                  key={dir}
                  onClick={() => handleSpawn(dir, 'STANDARD_AV', 38 + Math.random() * 8)}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-mono transition-all active:scale-95 cursor-pointer shadow-sm hover:border-cyan-500/50"
                  title={`Spawn vehicle heading from ${dir}`}
                >
                  +{dir.charAt(0)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Telemetry Inspector, Collision Monitor & Reservation Timeline: 5 Columns */}
        <div className="lg:col-span-5 space-y-5">
          {/* Selected Vehicle Real-Time Telemetry HUD */}
          {selectedVehicle ? (
            <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-3.5 h-3.5 rounded-full ring-2 ring-slate-800"
                    style={{ backgroundColor: selectedVehicle.color }}
                  />
                  <div>
                    <h2 className="text-base font-bold text-white flex items-center gap-2">
                      {selectedVehicle.name}
                      {selectedVehicle.type === 'EMERGENCY_AMBULANCE' && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] bg-rose-950 text-rose-300 border border-rose-800 font-bold">
                          PRIORITY 1
                        </span>
                      )}
                    </h2>
                    <p className="text-[11px] text-slate-400 font-mono">
                      {selectedVehicle.containerIp} • {selectedVehicle.dockerContainerId}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  {selectedVehicle.collisionAlert ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-bold bg-rose-950 text-rose-300 border border-rose-800 animate-pulse">
                      <AlertTriangle className="w-3 h-3" />
                      {selectedVehicle.activeManeuver === 'EMERGENCY_BRAKE' ? 'AEB HARD BRAKE' : 'EVASIVE STEERING'}
                    </span>
                  ) : selectedVehicle.priority ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-bold bg-rose-950 text-rose-300 border border-rose-800 animate-pulse">
                      <Siren className="w-3 h-3" />
                      PRIORITY V2X OVERRIDE
                    </span>
                  ) : selectedVehicle.yieldingToEmergency ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-bold bg-sky-950 text-sky-300 border border-sky-800 animate-pulse">
                      <Shield className="w-3 h-3" />
                      PULLING OVER FOR EMERGENCY
                    </span>
                  ) : selectedVehicle.beatingYellow ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-800 animate-pulse">
                      <Zap className="w-3 h-3" />
                      BEATING YELLOW LIGHT
                    </span>
                  ) : selectedVehicle.hasSlotReserved ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                      <CheckCircle2 className="w-3 h-3" />
                      SLOT RESERVED
                    </span>
                  ) : selectedVehicle.braking ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-800">
                      <Clock className="w-3 h-3" />
                      YIELDING FOR LIGHT/SLOT
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-950 text-cyan-300 border border-cyan-800">
                      <Radio className="w-3 h-3" />
                      REQUESTING
                    </span>
                  )}
                </div>
              </div>

              {/* Priority Flag & V2X Emergency Broadcast Controls */}
              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/80 flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <Siren className={`w-4 h-4 shrink-0 ${selectedVehicle.priority ? 'text-rose-400 animate-bounce' : 'text-slate-500'}`} />
                  <div>
                    <span className="font-bold text-white block">Priority Vehicle Flag:</span>
                    <span className="text-[10px] text-slate-400">
                      {selectedVehicle.priority 
                        ? 'Broadcasting high-priority V2X signal (nearby cars pull over)' 
                        : 'Standard priority right-of-way'}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => simulation.toggleVehiclePriority(selectedVehicle.id)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                    selectedVehicle.priority
                      ? 'bg-rose-600 text-white shadow-md shadow-rose-900/40 hover:bg-rose-500'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                  }`}
                >
                  {selectedVehicle.priority ? 'PRIORITY: ACTIVE' : 'PRIORITY: OFF'}
                </button>
              </div>

              {/* Driver Behavior Profile Selector */}
              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/80 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-medium flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-cyan-400" />
                    Driver Personality (Yellow Light Reaction):
                  </span>
                  <span className="font-mono text-[11px] font-bold text-amber-300">
                    {selectedVehicle.driverPersonality === 'HUMAN_AGGRESSIVE' 
                      ? '⚡ Aggressive (Speeds up on Yellow)' 
                      : selectedVehicle.driverPersonality === 'CAUTIOUS_HUMAN' 
                        ? '🛡️ Cautious (Stops on Yellow)' 
                        : '🤖 Autonomous V2X'}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1.5 text-[11px]">
                  {(['HUMAN_AGGRESSIVE', 'CAUTIOUS_HUMAN', 'AUTONOMOUS_V2X'] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => simulation.setVehiclePersonality(selectedVehicle.id, p)}
                      className={`px-2 py-1 rounded text-center font-medium transition-colors cursor-pointer ${
                        selectedVehicle.driverPersonality === p
                          ? 'bg-cyan-500 text-slate-950 font-bold'
                          : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                      }`}
                    >
                      {p === 'HUMAN_AGGRESSIVE' ? '⚡ Aggressive' : p === 'CAUTIOUS_HUMAN' ? '🛡️ Cautious' : '🤖 AV Auto'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Real-Time Behavioral Alerts */}
              {selectedVehicle.yieldingToRedEmergency && (
                <div className="bg-amber-950/60 border border-amber-600 p-2.5 rounded-lg text-xs text-amber-200 flex items-center gap-2 animate-pulse">
                  <Siren className="w-4 h-4 text-amber-400 shrink-0" />
                  <div>
                    <strong className="block text-amber-300 font-bold">EMERGENCY ON RED DETECTED — YIELDING GREEN LIGHT:</strong>
                    Vehicle has a green signal but spotted an emergency vehicle approaching or crossing from a RED approach! Decelerating to 0 km/h to avoid intersection broadside collision.
                  </div>
                </div>
              )}

              {selectedVehicle.beatingYellow && (
                <div className="bg-amber-950/40 border border-amber-800/80 p-2.5 rounded-lg text-xs text-amber-300 flex items-center gap-2 animate-pulse">
                  <Zap className="w-4 h-4 text-amber-400 shrink-0" />
                  <div>
                    <strong className="block">Human Yellow Light Dilemma:</strong>
                    Driver refused to wait and accelerated to {selectedVehicle.speed.toFixed(0)} km/h to beat the yellow signal!
                  </div>
                </div>
              )}

              {selectedVehicle.yieldingToEmergency && (
                <div className="bg-sky-950/40 border border-sky-800/80 p-2.5 rounded-lg text-xs text-sky-300 flex items-center gap-2 animate-pulse">
                  <Siren className="w-4 h-4 text-sky-400 shrink-0" />
                  <div>
                    <strong className="block">High-Priority V2X Signal Received:</strong>
                    Vehicle detected approaching emergency vehicle, activated hazard blinkers, and pulled over to the road shoulder.
                  </div>
                </div>
              )}

              {/* V2I Traffic Light RSU Signal Telemetry Card */}
              {selectedVehicle.v2iSignalReceived ? (
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                      <Radio className="w-3.5 h-3.5 text-emerald-400" />
                      V2I SPaT Broadcast Received:
                    </span>
                    <span className="font-mono text-[10px] text-cyan-400">
                      {selectedVehicle.v2iSignalReceived.signalStrengthDbm} dBm (5.895 GHz)
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 bg-slate-900 p-2 rounded-lg border border-slate-800 text-[11px] font-mono">
                    <div>
                      <span className="text-slate-500 text-[10px] block">SIGNAL</span>
                      <span className={`font-bold ${
                        selectedVehicle.v2iSignalReceived.light === 'GREEN' ? 'text-emerald-400' :
                        selectedVehicle.v2iSignalReceived.light === 'YELLOW' ? 'text-amber-400' : 'text-rose-400'
                      }`}>
                        {selectedVehicle.v2iSignalReceived.light} ({selectedVehicle.v2iSignalReceived.timeRemainingSec}s)
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] block">GLOSA ADVISORY</span>
                      <span className="text-cyan-300 font-bold">
                        {selectedVehicle.v2iSignalReceived.advisorySpeedKmh > 0 ? `${selectedVehicle.v2iSignalReceived.advisorySpeedKmh} km/h` : 'HALT (0)'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] block">AI REACTION</span>
                      <span className="text-white font-bold truncate">
                        {selectedVehicle.v2iReaction}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/60 text-xs text-slate-500 flex items-center gap-2">
                  <Radio className="w-3.5 h-3.5 text-slate-600" />
                  <span>Outside Traffic Light RSU 5.9 GHz broadcast range</span>
                </div>
              )}

              {/* Dynamic Telemetry Metrics Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
                  <span className="text-[10px] text-slate-400 uppercase font-medium flex items-center gap-1">
                    <Gauge className="w-3 h-3 text-cyan-400" />
                    Current Speed
                  </span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-2xl font-mono font-bold text-white">
                      {selectedVehicle.speed.toFixed(1)}
                    </span>
                    <span className="text-xs text-slate-400">km/h</span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full transition-all duration-150"
                      style={{ width: `${Math.min(100, (selectedVehicle.speed / 60) * 100)}%` }}
                    />
                  </div>
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
                  <span className="text-[10px] text-slate-400 uppercase font-medium flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 text-amber-400" />
                    Braking Status
                  </span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span
                      className={`text-xl font-mono font-bold ${
                        selectedVehicle.braking ? 'text-rose-400' : 'text-slate-400'
                      }`}
                    >
                      {selectedVehicle.braking ? `${Math.floor(selectedVehicle.brakeForce)}%` : 'OFF'}
                    </span>
                    <span className="text-xs text-slate-500">
                      {selectedVehicle.activeManeuver === 'EMERGENCY_BRAKE' ? 'AEB TRIGGERED' : selectedVehicle.braking ? 'DECEL ACTIVE' : 'CRUISING'}
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-150 ${selectedVehicle.activeManeuver === 'EMERGENCY_BRAKE' ? 'bg-rose-500' : 'bg-amber-500'}`}
                      style={{ width: `${selectedVehicle.brakeForce}%` }}
                    />
                  </div>
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
                  <span className="text-[10px] text-slate-400 uppercase font-medium">Distance To Stop Line</span>
                  <p className="text-lg font-mono font-bold text-white mt-1">
                    {Math.max(0, Math.floor(selectedVehicle.distanceToStopLine))} m
                  </p>
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
                  <span className="text-[10px] text-slate-400 uppercase font-medium">Collision TTC</span>
                  <p className={`text-lg font-mono font-bold mt-1 ${selectedVehicle.predictedTimeToCollision ? 'text-rose-400 animate-pulse' : 'text-slate-500'}`}>
                    {selectedVehicle.predictedTimeToCollision ? `${selectedVehicle.predictedTimeToCollision} s` : 'SAFE'}
                  </p>
                </div>
              </div>

              {/* Dead Reckoning & Latency Compensation Readout */}
              <div className="bg-slate-950/90 p-3 rounded-xl border border-slate-800 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-medium flex items-center gap-1.5">
                    <Compass className="w-3.5 h-3.5 text-cyan-400" />
                    Dead-Reckoning Compensation
                  </span>
                  <span className="text-cyan-400 font-mono text-[11px]">
                    Latency: {state.globalNetworkLatencyMs}ms
                  </span>
                </div>
                <div className="font-mono text-[11px] text-slate-300 bg-slate-900 px-2.5 py-1.5 rounded border border-slate-800 flex justify-between">
                  <span>Lateral Steering Offset:</span>
                  <span className={selectedVehicle.evasiveLateralOffset !== 0 ? 'text-cyan-300 font-bold' : 'text-slate-500'}>
                    {(selectedVehicle.evasiveLateralOffset / 3.5).toFixed(2)} m
                  </span>
                </div>
              </div>

              {/* Realistic Vehicle Physics & Kinematic Bicycle Dynamics */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2.5 text-xs">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                  <span className="text-slate-200 font-semibold flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-indigo-400" />
                    Kinematic Bicycle &amp; Propulsion Physics
                  </span>
                  <span className="font-mono text-[10px] text-slate-400">
                    {selectedVehicle.massKg.toLocaleString()} kg • {selectedVehicle.wheelbaseM}m Wheelbase
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 font-mono text-[11px]">
                  <div className="bg-slate-900/90 p-2 rounded-lg border border-slate-800">
                    <span className="text-slate-500 text-[10px] block">LONG. ACCEL</span>
                    <span className={`font-bold ${(selectedVehicle.longitudinalAccelMs2 || 0) > 0.2 ? 'text-emerald-400' : (selectedVehicle.longitudinalAccelMs2 || 0) < -0.2 ? 'text-rose-400' : 'text-slate-300'}`}>
                      {(selectedVehicle.longitudinalAccelMs2 || 0).toFixed(2)} m/s²
                    </span>
                  </div>

                  <div className="bg-slate-900/90 p-2 rounded-lg border border-slate-800">
                    <span className="text-slate-500 text-[10px] block">STEER ANGLE</span>
                    <span className={`font-bold ${Math.abs(selectedVehicle.steerAngleDeg || 0) > 0.5 ? 'text-cyan-400' : 'text-slate-300'}`}>
                      {(selectedVehicle.steerAngleDeg || 0).toFixed(1)}°
                    </span>
                  </div>

                  <div className="bg-slate-900/90 p-2 rounded-lg border border-slate-800">
                    <span className="text-slate-500 text-[10px] block">AERO+ROLL DRAG</span>
                    <span className="font-bold text-slate-300">
                      {(selectedVehicle.dragForceN || 0)} N
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 font-mono text-[10px]">
                  <div className="bg-slate-900/60 p-1.5 rounded border border-slate-800 text-center">
                    <span className="text-slate-500 block text-[9px]">SUSP. PITCH</span>
                    <span className={`font-bold ${Math.abs(selectedVehicle.pitchAngleDeg || 0) > 0.5 ? 'text-amber-400' : 'text-slate-400'}`}>
                      {(selectedVehicle.pitchAngleDeg || 0).toFixed(1)}° {((selectedVehicle.pitchAngleDeg || 0) < -0.5) ? '(DIVE)' : ((selectedVehicle.pitchAngleDeg || 0) > 0.5) ? '(SQUAT)' : ''}
                    </span>
                  </div>

                  <div className="bg-slate-900/60 p-1.5 rounded border border-slate-800 text-center">
                    <span className="text-slate-500 block text-[9px]">BODY ROLL</span>
                    <span className={`font-bold ${Math.abs(selectedVehicle.rollAngleDeg || 0) > 0.5 ? 'text-indigo-400' : 'text-slate-400'}`}>
                      {(selectedVehicle.rollAngleDeg || 0).toFixed(1)}°
                    </span>
                  </div>

                  <div className="bg-slate-900/60 p-1.5 rounded border border-slate-800 text-center">
                    <span className="text-slate-500 block text-[9px]">ABS / ESP</span>
                    <span className={`font-bold ${selectedVehicle.absActive ? 'text-rose-400 animate-pulse' : selectedVehicle.espActive ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {selectedVehicle.absActive ? 'ABS PULSING' : selectedVehicle.espActive ? 'ESP ACTIVE' : 'OPTIMAL'}
                    </span>
                  </div>
                </div>
              </div>

              {/* V2X Weather Telemetry, Braking Distance & Following Headway */}
              {(() => {
                const leadVeh = state.vehicles.find(
                  (other) =>
                    other.id !== selectedVehicle.id &&
                    other.direction === selectedVehicle.direction &&
                    other.distanceToStopLine < selectedVehicle.distanceToStopLine
                );
                const currentHeadwayMeters = leadVeh 
                  ? ((selectedVehicle.distanceToStopLine - leadVeh.distanceToStopLine) / 3.5).toFixed(1)
                  : null;
                const safeRequiredMeters = (state.weatherState.followingDistanceGapPx / 3.5).toFixed(1);
                const isHeadwaySafe = currentHeadwayMeters ? Number(currentHeadwayMeters) >= Number(safeRequiredMeters) : true;

                return (
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2 text-xs">
                    <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                      <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                        <CloudRain className="w-3.5 h-3.5 text-sky-400" />
                        V2X Weather &amp; Kinematics Telemetry
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-900 border border-slate-800 text-cyan-300">
                        {state.weatherState.condition}
                      </span>
                    </div>

                    {/* Braking Distance & Surface Friction Grid */}
                    <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                      <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                        <span className="text-slate-500 text-[10px] block">ROAD GRIP (μ)</span>
                        <div className="flex items-baseline gap-1 mt-0.5">
                          <span className={`text-base font-bold ${
                            state.weatherState.frictionCoefficient >= 0.8 ? 'text-emerald-400' :
                            state.weatherState.frictionCoefficient >= 0.4 ? 'text-amber-400' : 'text-rose-400'
                          }`}>
                            {state.weatherState.frictionCoefficient}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            ({state.weatherState.brakingDistanceMultiplier}x stopping dist)
                          </span>
                        </div>
                      </div>

                      <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                        <span className="text-slate-500 text-[10px] block">EST. BRAKING DISTANCE</span>
                        <div className="flex items-baseline gap-1 mt-0.5">
                          <span className="text-base font-bold text-white">
                            {selectedVehicle.weatherTelemetry?.brakingDistanceMeters ?? 0}
                          </span>
                          <span className="text-xs text-slate-400">meters</span>
                        </div>
                      </div>
                    </div>

                    {/* Cooperative Following Distance (CACC Headway) */}
                    <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400 font-medium flex items-center gap-1">
                          <Radio className="w-3 h-3 text-cyan-400" />
                          Cooperative Following Distance (CACC):
                        </span>
                        <span className="font-mono text-cyan-300 font-bold">
                          Safe Gap: {safeRequiredMeters}m
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] font-mono pt-1 border-t border-slate-800/60">
                        <span className="text-slate-400">Active Headway to Lead Car:</span>
                        {leadVeh ? (
                          <span className={`font-bold ${isHeadwaySafe ? 'text-emerald-400' : 'text-rose-400 animate-pulse'}`}>
                            {currentHeadwayMeters}m ({isHeadwaySafe ? 'SAFE BUFFER' : 'DECELERATING'})
                          </span>
                        ) : (
                          <span className="text-slate-500">No Lead Vehicle (Open Lane)</span>
                        )}
                      </div>
                    </div>

                    {/* Optical Visibility vs 5.9 GHz Penetration */}
                    <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800 text-[10px] space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 flex items-center gap-1">
                          <Eye className="w-3 h-3 text-amber-400" />
                          Optical Sensor Visibility:
                        </span>
                        <span className={`font-mono font-bold ${
                          state.weatherState.visibilityMeters <= 40 ? 'text-rose-400' : 'text-slate-200'
                        }`}>
                          {state.weatherState.visibilityMeters}m {state.weatherState.visibilityMeters <= 40 ? '(BLINDED)' : ''}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 flex items-center gap-1">
                          <Radio className="w-3 h-3 text-cyan-400" />
                          5.9 GHz V2X Penetration:
                        </span>
                        <span className="font-mono text-emerald-400 font-bold">
                          280m+ (UNINTERRUPTED NLOS)
                        </span>
                      </div>
                    </div>

                    {/* Active Atmospheric Equipment */}
                    <div className="grid grid-cols-3 gap-1 text-[10px] font-mono text-center pt-1 border-t border-slate-800/60">
                      <div className="bg-slate-900/60 p-1 rounded border border-slate-800/80">
                        <span className="text-slate-500 block text-[9px]">WIPERS</span>
                        <span className={selectedVehicle.wipersActive ? 'text-sky-300 font-bold' : 'text-slate-500'}>
                          {selectedVehicle.wipersActive ? 'HIGH' : 'OFF'}
                        </span>
                      </div>
                      <div className="bg-slate-900/60 p-1 rounded border border-slate-800/80">
                        <span className="text-slate-500 block text-[9px]">FOG LAMPS</span>
                        <span className={selectedVehicle.fogLightsActive ? 'text-amber-400 font-bold' : 'text-slate-500'}>
                          {selectedVehicle.fogLightsActive ? 'ACTIVE' : 'OFF'}
                        </span>
                      </div>
                      <div className="bg-slate-900/60 p-1 rounded border border-slate-800/80">
                        <span className="text-slate-500 block text-[9px]">MAX SPEED</span>
                        <span className="text-cyan-300 font-bold">
                          {state.weatherState.recommendedSpeedKmh} km/h
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          ) : (
            <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 text-center text-slate-400">
              <Info className="w-8 h-8 mx-auto text-slate-500 mb-2" />
              <p>No vehicle selected. Click on any vehicle in the 2D intersection to view real-time telemetry.</p>
            </div>
          )}

          {/* V2V Collision Incidents Log */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-rose-400" />
                  V2V Collision Prevention Log
                </h3>
                <p className="text-[11px] text-slate-400">Autonomous AEB &amp; Evasive Steering maneuvers</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportCSV}
                  className="flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-950/80 hover:bg-emerald-900/80 px-2 py-0.5 rounded border border-emerald-800 transition-colors cursor-pointer"
                  title="Download session telemetry CSV with incident logs"
                >
                  <Download className="w-3 h-3 text-emerald-400" />
                  <span>Export CSV</span>
                </button>
                <span className="text-xs font-mono text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                  {state.collisionIncidents.length} Prevented
                </span>
              </div>
            </div>

            <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
              {state.collisionIncidents.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-4">
                  No near-miss incidents detected. Dynamic slot reservation keeping traffic safe.
                </p>
              ) : (
                state.collisionIncidents.map((inc) => (
                  <div
                    key={inc.id}
                    className="p-2.5 rounded-lg border bg-slate-950 border-slate-800/80 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white font-mono flex items-center gap-1.5">
                        <span className="text-rose-400">{inc.vehicleAName}</span>
                        <span className="text-slate-500">↔</span>
                        <span className="text-cyan-400">{inc.vehicleBName}</span>
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">{inc.timestamp}</span>
                    </div>

                    <div className="grid grid-cols-3 gap-1 text-[10px] text-slate-400 font-mono pt-1 border-t border-slate-900">
                      <span>TTC: <strong className="text-white">{inc.timeToCollisionSec}s</strong></span>
                      <span>Latency: <strong className="text-cyan-400">+{inc.measuredLatencyMs}ms</strong></span>
                      <span className="text-right text-emerald-400 font-bold truncate">
                        {inc.outcome === 'COLLISION_PREVENTED_BY_STEER' ? 'STEER + AEB' : 'AEB STOP'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Visual Traffic Light Roadside Unit (RSU SPaT Broadcaster) */}
      <TrafficLightRSUView simulation={simulation} />

      {/* Roadside Unit (RSU) Dynamic Priority Arbiter */}
      <RSUArbiterView simulation={simulation} />

      {/* D3.js Real-Time Vehicle Density Heatmap Layer */}
      <D3DensityHeatmap simulation={simulation} />

      {/* Real-Time Collision Risk Toast Notification Sentinel */}
      <CollisionToastContainer
        simulation={simulation}
        onSelectVehicle={(id) => setSelectedVehicleId(id)}
      />
    </div>
  );
};

// Canvas drawing helper function
function drawScene(ctx: CanvasRenderingContext2D, simulation: IntersectionSimulation, selectedVehicleId: string | null) {
  const state = simulation.getState();
  const { vehicles, trafficLightState } = state;

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

  // 1. Background: Modern urban concrete pavement / surrounding sidewalk tiles
  ctx.fillStyle = '#060A12';
  ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

  // 2. Corner Sidewalk Blocks with paved tiles and green grass landscaping
  const cornerSize = CENTER - HALF_ROAD; // 262px
  const sidewalkColor = '#0F1626';
  const tileLineColor = '#182236';

  const drawSidewalk = (sx: number, sy: number, quadrant: 'NW' | 'NE' | 'SW' | 'SE') => {
    ctx.save();
    // Base concrete sidewalk pavement
    ctx.fillStyle = sidewalkColor;
    ctx.fillRect(sx, sy, cornerSize, cornerSize);

    // Subtle paving tile grid
    ctx.strokeStyle = tileLineColor;
    ctx.lineWidth = 1;
    const tileSize = 28;
    for (let x = sx; x < sx + cornerSize; x += tileSize) {
      ctx.beginPath();
      ctx.moveTo(x, sy);
      ctx.lineTo(x, sy + cornerSize);
      ctx.stroke();
    }
    for (let y = sy; y < sy + cornerSize; y += tileSize) {
      ctx.beginPath();
      ctx.moveTo(sx, y);
      ctx.lineTo(sx + cornerSize, y);
      ctx.stroke();
    }

    // Lush manicured green grass verge & park lawns in each quadrant
    ctx.fillStyle = '#0F291E';
    ctx.strokeStyle = '#164E33';
    ctx.lineWidth = 1.5;

    let lawnX = sx + 25;
    let lawnY = sy + 25;
    let lawnW = cornerSize - 55;
    let lawnH = cornerSize - 55;

    if (quadrant === 'NW') {
      lawnX = sx + 28;
      lawnY = sy + 28;
      lawnW = cornerSize - 65;
      lawnH = cornerSize - 65;
    } else if (quadrant === 'NE') {
      lawnX = sx + 38;
      lawnY = sy + 28;
      lawnW = cornerSize - 65;
      lawnH = cornerSize - 65;
    } else if (quadrant === 'SW') {
      lawnX = sx + 28;
      lawnY = sy + 38;
      lawnW = cornerSize - 65;
      lawnH = cornerSize - 65;
    } else if (quadrant === 'SE') {
      lawnX = sx + 38;
      lawnY = sy + 38;
      lawnW = cornerSize - 65;
      lawnH = cornerSize - 65;
    }

    ctx.beginPath();
    ctx.roundRect(lawnX, lawnY, lawnW, lawnH, 12);
    ctx.fill();
    ctx.stroke();

    // Grass texture accents
    ctx.fillStyle = 'rgba(34, 197, 94, 0.12)';
    for (let i = 0; i < 16; i++) {
      const gx = lawnX + 12 + ((i * 37) % (lawnW - 24));
      const gy = lawnY + 12 + ((i * 47) % (lawnH - 24));
      ctx.beginPath();
      ctx.arc(gx, gy, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  };

  // 4 Corner Sidewalks & Landscaped Plazas
  drawSidewalk(0, 0, 'NW'); // NW Innovation Plaza & Café
  drawSidewalk(CENTER + HALF_ROAD, 0, 'NE'); // NE Transit Hub & Mobility Plaza
  drawSidewalk(0, CENTER + HALF_ROAD, 'SW'); // SW Botanical Promenade
  drawSidewalk(CENTER + HALF_ROAD, CENTER + HALF_ROAD, 'SE'); // SE Cyber-Physical Lab

  // Render Urban Amenities (Benches, Bus Shelter, Street Lamps, Café Tables, Bike Racks, Flower Beds)
  if (state.amenities) {
    for (const amenity of state.amenities) {
      drawAmenity(ctx, amenity, state.weatherState.condition);
    }
  }

  // Render Urban Trees (Oak, Maple, Cherry Blossom, Pine with Layered Foliage & Shadows)
  if (state.trees) {
    for (const tree of state.trees) {
      drawTree(ctx, tree, state.weatherState.condition);
    }
  }

  // Render Animated Pedestrians along Sidewalks & Crosswalks
  if (state.pedestrians) {
    for (const ped of state.pedestrians) {
      drawPedestrian(ctx, ped, state.weatherState.condition);
    }
  }

  // 3. Road Surface (Dark Asphalt with concrete curbs, adapting dynamically to weather)
  ctx.save();
  const weatherCond = state.weatherState.condition;
  if (weatherCond === 'RAIN') {
    ctx.fillStyle = '#060A14'; // Darker, slick wet asphalt
  } else if (weatherCond === 'SNOW_ICE') {
    ctx.fillStyle = '#0F1728'; // Cold frosted road with icy sheen
  } else if (weatherCond === 'DENSE_FOG') {
    ctx.fillStyle = '#080C16'; // Damp chilled roadway
  } else {
    ctx.fillStyle = '#0B0F19'; // Nominal dry asphalt
  }

  // North-South vertical road (Two-sided road: 88px inbound, 88px outbound)
  ctx.fillRect(CENTER - HALF_ROAD, 0, ROAD_WIDTH, CANVAS_SIZE);
  // East-West horizontal road (Two-sided road: 88px inbound, 88px outbound)
  ctx.fillRect(0, CENTER - HALF_ROAD, CANVAS_SIZE, ROAD_WIDTH);

  // Wet road specular reflection patches / water puddles in rain
  if (weatherCond === 'RAIN') {
    const t = Date.now() / 1000;
    const puddles = [
      { x: CENTER - HALF_ROAD + 14, y: CENTER - 140, rx: 14, ry: 22 },
      { x: CENTER + HALF_ROAD - 16, y: CENTER + 130, rx: 16, ry: 24 },
      { x: CENTER + 120, y: CENTER - HALF_ROAD + 16, rx: 24, ry: 13 },
      { x: CENTER - 130, y: CENTER + HALF_ROAD - 14, rx: 22, ry: 12 },
      { x: CENTER - 42, y: CENTER - 42, rx: 16, ry: 16 },
    ];
    for (const p of puddles) {
      ctx.fillStyle = 'rgba(56, 189, 248, 0.08)';
      ctx.strokeStyle = 'rgba(186, 230, 253, 0.16)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, p.rx, p.ry, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Shimmer ring
      const ripple = ((t * 2 + p.x) % 3) / 3;
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.18 * (1 - ripple)})`;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, p.rx * ripple, p.ry * ripple, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  } else if (weatherCond === 'SNOW_ICE') {
    // Slick black ice patches
    ctx.fillStyle = 'rgba(224, 242, 254, 0.14)';
    ctx.strokeStyle = 'rgba(186, 230, 253, 0.28)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.fillRect(CENTER - HALF_ROAD + 6, CENTER - 170, ROAD_WIDTH - 12, 45);
    ctx.fillRect(CENTER + 105, CENTER - HALF_ROAD + 6, 50, ROAD_WIDTH - 12);
    ctx.setLineDash([]);
  }

  // Raised Curb Edge Lines (Concrete Borders with corner radius beveled curbs)
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 2.5;

  // NW Corner Curbs
  ctx.beginPath();
  ctx.moveTo(CENTER - HALF_ROAD, 0);
  ctx.lineTo(CENTER - HALF_ROAD, CENTER - HALF_ROAD);
  ctx.lineTo(0, CENTER - HALF_ROAD);
  ctx.stroke();

  // NE Corner Curbs
  ctx.beginPath();
  ctx.moveTo(CENTER + HALF_ROAD, 0);
  ctx.lineTo(CENTER + HALF_ROAD, CENTER - HALF_ROAD);
  ctx.lineTo(CANVAS_SIZE, CENTER - HALF_ROAD);
  ctx.stroke();

  // SW Corner Curbs
  ctx.beginPath();
  ctx.moveTo(0, CENTER + HALF_ROAD);
  ctx.lineTo(CENTER - HALF_ROAD, CENTER + HALF_ROAD);
  ctx.lineTo(CENTER - HALF_ROAD, CANVAS_SIZE);
  ctx.stroke();

  // SE Corner Curbs
  ctx.beginPath();
  ctx.moveTo(CANVAS_SIZE, CENTER + HALF_ROAD);
  ctx.lineTo(CENTER + HALF_ROAD, CENTER + HALF_ROAD);
  ctx.lineTo(CENTER + HALF_ROAD, CANVAS_SIZE);
  ctx.stroke();
  ctx.restore();

  // 4. Pedestrian Crosswalk Tactile Warning Pavers (Amber textured mats at curbs)
  const drawTactilePad = (x: number, y: number, w: number, h: number) => {
    ctx.save();
    ctx.fillStyle = '#D97706';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#92400E';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, h);
    ctx.restore();
  };

  // Tactile pads at curb edges
  drawTactilePad(CENTER - HALF_ROAD - 8, CENTER - STOP_LINE_DIST + 12, 6, 28);
  drawTactilePad(CENTER + HALF_ROAD + 2, CENTER - STOP_LINE_DIST + 12, 6, 28);
  drawTactilePad(CENTER - HALF_ROAD - 8, CENTER + STOP_LINE_DIST - 40, 6, 28);
  drawTactilePad(CENTER + HALF_ROAD + 2, CENTER + STOP_LINE_DIST - 40, 6, 28);

  // Real-Time D3 Spatial Heatmap Overlay (Collision Risk, V2X RF Interference, Composite Risk, Fleet Density)
  if (state.heatmapOverlayActive && state.densityGrid) {
    ctx.save();
    const mode = state.heatmapMode || 'COLLISION_RISK';
    const opacity = state.heatmapOpacity || 0.65;

    for (const cell of state.densityGrid) {
      let val = 0;
      let interpolator: (t: number) => string = d3.interpolateInferno;

      if (mode === 'COLLISION_RISK') {
        val = cell.collisionRisk;
        interpolator = d3.interpolateYlOrRd;
      } else if (mode === 'SIGNAL_INTERFERENCE') {
        val = cell.signalInterference;
        interpolator = d3.interpolateCool;
      } else if (mode === 'COMPOSITE_RISK') {
        val = cell.compositeRisk;
        interpolator = d3.interpolatePlasma;
      } else {
        val = cell.density;
        interpolator = d3.interpolateInferno;
      }

      if (val > 0.03) {
        ctx.fillStyle = interpolator(val);
        ctx.globalAlpha = Math.min(0.75, Math.max(0.18, val * opacity * 1.3));
        ctx.fillRect(
          cell.worldX - CELL_SIZE / 2,
          cell.worldY - CELL_SIZE / 2,
          CELL_SIZE,
          CELL_SIZE
        );
      }
    }
    ctx.restore();
  }

  // 4. VISUAL TRAFFIC LIGHT RSU STATION (SPaT Broadcaster at CENTER - 98, CENTER - 98)
  const rsuX = CENTER - 98;
  const rsuY = CENTER - 98;
  const { trafficLightRSU } = state;

  ctx.save();
  // RSU Base equipment cabinet (Weatherproof stainless steel ITS enclosure)
  ctx.fillStyle = '#0F172A';
  ctx.strokeStyle = '#38BDF8';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(rsuX - 12, rsuY - 12, 24, 24, 4);
  ctx.fill();
  ctx.stroke();

  // Cabinet ventilation louvers
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(rsuX - 7, rsuY - 4);
  ctx.lineTo(rsuX + 7, rsuY - 4);
  ctx.moveTo(rsuX - 7, rsuY);
  ctx.lineTo(rsuX + 7, rsuY);
  ctx.moveTo(rsuX - 7, rsuY + 4);
  ctx.lineTo(rsuX + 7, rsuY + 4);
  ctx.stroke();

  // Mast & High-Gain Dual Antenna Array
  ctx.strokeStyle = '#94A3B8';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(rsuX, rsuY - 12);
  ctx.lineTo(rsuX, rsuY - 26);
  ctx.stroke();

  // Dual cross antenna dipoles
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = '#38BDF8';
  ctx.beginPath();
  ctx.moveTo(rsuX - 7, rsuY - 22);
  ctx.lineTo(rsuX + 7, rsuY - 22);
  ctx.moveTo(rsuX - 5, rsuY - 26);
  ctx.lineTo(rsuX + 5, rsuY - 26);
  ctx.stroke();

  // Dynamic SPaT Beacon lit with active signal color
  const activeColorHex = 
    trafficLightState.nsLight === 'GREEN' ? '#10B981' :
    trafficLightState.nsLight === 'YELLOW' ? '#F59E0B' : '#EF4444';

  ctx.fillStyle = activeColorHex;
  ctx.shadowColor = activeColorHex;
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.arc(rsuX, rsuY - 27, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Concentric Animated SPaT Wireless Radio Waves (Color-coded to active signal phase)
  const now = Date.now();
  const waveColor = 
    trafficLightState.nsLight === 'GREEN' ? 'rgba(16, 185, 129, 0.35)' :
    trafficLightState.nsLight === 'YELLOW' ? 'rgba(245, 158, 11, 0.45)' : 'rgba(239, 68, 68, 0.35)';

  [0, 25, 50].forEach((offset) => {
    const radius = 20 + (((now / 35) + offset) % 75);
    const alpha = Math.max(0, 1 - (radius / 75));
    ctx.strokeStyle = waveColor.replace(/[\d.]+\)$/g, `${alpha * 0.45})`);
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(rsuX, rsuY - 18, radius, 0, Math.PI * 2);
    ctx.stroke();
  });
  ctx.setLineDash([]);

  // Direct V2I Wireless Sidelink Rays to Connected Vehicles
  for (const v of vehicles) {
    if (v.v2iSignalReceived && !v.crossedIntersection) {
      const vLight = v.v2iSignalReceived.light;
      const rayColor = 
        vLight === 'GREEN' ? 'rgba(16, 185, 129, 0.35)' :
        vLight === 'YELLOW' ? 'rgba(245, 158, 11, 0.45)' : 'rgba(239, 68, 68, 0.35)';

      ctx.save();
      ctx.strokeStyle = rayColor;
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 4]);
      ctx.beginPath();
      ctx.moveTo(rsuX, rsuY - 18);
      ctx.lineTo(v.x, v.y);
      ctx.stroke();

      // Wireless packet data packet pulse dot travelling from RSU to vehicle
      const progress = ((now / 20) % 100) / 100;
      const px = rsuX + (v.x - rsuX) * progress;
      const py = (rsuY - 18) + (v.y - (rsuY - 18)) * progress;
      ctx.fillStyle = vLight === 'GREEN' ? '#10B981' : vLight === 'YELLOW' ? '#F59E0B' : '#EF4444';
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(px, py, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // RSU Hardware Label & Telemetry
  ctx.fillStyle = '#38BDF8';
  ctx.font = 'bold 8px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('RSU-SPaT (5.895 GHz)', rsuX, rsuY + 20);

  const nsRem = Math.ceil(trafficLightState.phaseTimeRemainingSec);
  ctx.fillStyle = '#94A3B8';
  ctx.font = '7px monospace';
  ctx.fillText(`NS:${trafficLightState.nsLight}(${nsRem}s) | EW:${trafficLightState.ewLight}`, rsuX, rsuY + 29);
  ctx.restore();

  // 5. ROAD MARKINGS: Double Solid Yellow Centerlines (Two-Sided Roads)
  ctx.save();
  ctx.strokeStyle = '#F59E0B';
  ctx.lineWidth = 2.2;

  const drawDoubleYellow = (x1: number, y1: number, x2: number, y2: number, isVertical: boolean) => {
    const offset = 2.5;
    ctx.beginPath();
    if (isVertical) {
      ctx.moveTo(x1 - offset, y1);
      ctx.lineTo(x2 - offset, y2);
      ctx.moveTo(x1 + offset, y1);
      ctx.lineTo(x2 + offset, y2);
    } else {
      ctx.moveTo(x1, y1 - offset);
      ctx.lineTo(x2, y2 - offset);
      ctx.moveTo(x1, y1 + offset);
      ctx.lineTo(x2, y2 + offset);
    }
    ctx.stroke();
  };

  // North Approach double yellow (from top to stop line)
  drawDoubleYellow(CENTER, 0, CENTER, CENTER - STOP_LINE_DIST, true);
  // South Approach double yellow (from stop line to bottom)
  drawDoubleYellow(CENTER, CENTER + STOP_LINE_DIST, CENTER, CANVAS_SIZE, true);
  // West Approach double yellow (from left to stop line)
  drawDoubleYellow(0, CENTER, CENTER - STOP_LINE_DIST, CENTER, false);
  // East Approach double yellow (from stop line to right)
  drawDoubleYellow(CENTER + STOP_LINE_DIST, CENTER, CANVAS_SIZE, CENTER, false);
  ctx.restore();

  // 5b. ROAD MARKINGS: Broken White Lines Dividing Roads into Two Lanes in Each Direction
  ctx.save();
  ctx.strokeStyle = '#F8FAFC';
  ctx.lineWidth = 2;
  ctx.setLineDash([14, 16]); // MUTCD standard broken lane divider

  // North Approach (Vertical)
  // Inbound divider (between Lane 0 and Lane 1)
  ctx.beginPath();
  ctx.moveTo(CENTER - LANE_WIDTH, 0);
  ctx.lineTo(CENTER - LANE_WIDTH, CENTER - STOP_LINE_DIST);
  ctx.stroke();
  // Outbound divider
  ctx.beginPath();
  ctx.moveTo(CENTER + LANE_WIDTH, 0);
  ctx.lineTo(CENTER + LANE_WIDTH, CENTER - STOP_LINE_DIST);
  ctx.stroke();

  // South Approach (Vertical)
  // Inbound divider (between Lane 0 and Lane 1)
  ctx.beginPath();
  ctx.moveTo(CENTER + LANE_WIDTH, CENTER + STOP_LINE_DIST);
  ctx.lineTo(CENTER + LANE_WIDTH, CANVAS_SIZE);
  ctx.stroke();
  // Outbound divider
  ctx.beginPath();
  ctx.moveTo(CENTER - LANE_WIDTH, CENTER + STOP_LINE_DIST);
  ctx.lineTo(CENTER - LANE_WIDTH, CANVAS_SIZE);
  ctx.stroke();

  // West Approach (Horizontal)
  // Inbound divider (between Lane 0 and Lane 1)
  ctx.beginPath();
  ctx.moveTo(0, CENTER + LANE_WIDTH);
  ctx.lineTo(CENTER - STOP_LINE_DIST, CENTER + LANE_WIDTH);
  ctx.stroke();
  // Outbound divider
  ctx.beginPath();
  ctx.moveTo(0, CENTER - LANE_WIDTH);
  ctx.lineTo(CENTER - STOP_LINE_DIST, CENTER - LANE_WIDTH);
  ctx.stroke();

  // East Approach (Horizontal)
  // Inbound divider (between Lane 0 and Lane 1)
  ctx.beginPath();
  ctx.moveTo(CENTER + STOP_LINE_DIST, CENTER - LANE_WIDTH);
  ctx.lineTo(CANVAS_SIZE, CENTER - LANE_WIDTH);
  ctx.stroke();
  // Outbound divider
  ctx.beginPath();
  ctx.moveTo(CENTER + STOP_LINE_DIST, CENTER + LANE_WIDTH);
  ctx.lineTo(CANVAS_SIZE, CENTER + LANE_WIDTH);
  ctx.stroke();

  // 5c. Solid White Fog Lines (Curb Edge Borders)
  ctx.setLineDash([]);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.lineWidth = 1.5;
  // North
  ctx.beginPath();
  ctx.moveTo(CENTER - HALF_ROAD + 4, 0);
  ctx.lineTo(CENTER - HALF_ROAD + 4, CENTER - STOP_LINE_DIST);
  ctx.moveTo(CENTER + HALF_ROAD - 4, 0);
  ctx.lineTo(CENTER + HALF_ROAD - 4, CENTER - STOP_LINE_DIST);
  ctx.stroke();
  // South
  ctx.beginPath();
  ctx.moveTo(CENTER - HALF_ROAD + 4, CENTER + STOP_LINE_DIST);
  ctx.lineTo(CENTER - HALF_ROAD + 4, CANVAS_SIZE);
  ctx.moveTo(CENTER + HALF_ROAD - 4, CENTER + STOP_LINE_DIST);
  ctx.lineTo(CENTER + HALF_ROAD - 4, CANVAS_SIZE);
  ctx.stroke();
  // West
  ctx.beginPath();
  ctx.moveTo(0, CENTER - HALF_ROAD + 4);
  ctx.lineTo(CENTER - STOP_LINE_DIST, CENTER - HALF_ROAD + 4);
  ctx.moveTo(0, CENTER + HALF_ROAD - 4);
  ctx.lineTo(CENTER - STOP_LINE_DIST, CENTER + HALF_ROAD - 4);
  ctx.stroke();
  // East
  ctx.beginPath();
  ctx.moveTo(CENTER + STOP_LINE_DIST, CENTER - HALF_ROAD + 4);
  ctx.lineTo(CANVAS_SIZE, CENTER - HALF_ROAD + 4);
  ctx.moveTo(CENTER + STOP_LINE_DIST, CENTER + HALF_ROAD - 4);
  ctx.lineTo(CANVAS_SIZE, CENTER + HALF_ROAD - 4);
  ctx.stroke();
  ctx.restore();

  // 6. CONTINENTAL ZEBRA CROSSWALKS (Bold white stripes at all 4 approaches)
  ctx.save();
  ctx.fillStyle = '#F8FAFC';
  const barWidth = 6;
  const barLength = 24;
  const barGap = 12;

  // North Crosswalk (horizontal corridor across vertical road)
  const crossNorthY = CENTER - STOP_LINE_DIST + 10;
  for (let x = CENTER - HALF_ROAD + 6; x < CENTER + HALF_ROAD - 6; x += barGap) {
    ctx.fillRect(x, crossNorthY, barWidth, barLength);
  }

  // South Crosswalk
  const crossSouthY = CENTER + STOP_LINE_DIST - 34;
  for (let x = CENTER - HALF_ROAD + 6; x < CENTER + HALF_ROAD - 6; x += barGap) {
    ctx.fillRect(x, crossSouthY, barWidth, barLength);
  }

  // West Crosswalk (vertical bars across horizontal road)
  const crossWestX = CENTER - STOP_LINE_DIST + 10;
  for (let y = CENTER - HALF_ROAD + 6; y < CENTER + HALF_ROAD - 6; y += barGap) {
    ctx.fillRect(crossWestX, y, barLength, barWidth);
  }

  // East Crosswalk
  const crossEastX = CENTER + STOP_LINE_DIST - 34;
  for (let y = CENTER - HALF_ROAD + 6; y < CENTER + HALF_ROAD - 6; y += barGap) {
    ctx.fillRect(crossEastX, y, barLength, barWidth);
  }
  ctx.restore();

  // 7. SOLID WHITE STOP LINES (Wide stop bar across both inbound lanes)
  ctx.save();
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 4.5;
  ctx.lineCap = 'butt';

  // North Stop line (governs southbound incoming lanes: Lane 0 + Lane 1)
  ctx.beginPath();
  ctx.moveTo(CENTER - HALF_ROAD, CENTER - STOP_LINE_DIST);
  ctx.lineTo(CENTER, CENTER - STOP_LINE_DIST);
  ctx.stroke();

  // South Stop line (governs northbound incoming lanes: Lane 0 + Lane 1)
  ctx.beginPath();
  ctx.moveTo(CENTER, CENTER + STOP_LINE_DIST);
  ctx.lineTo(CENTER + HALF_ROAD, CENTER + STOP_LINE_DIST);
  ctx.stroke();

  // West Stop line (governs eastbound incoming lanes: Lane 0 + Lane 1)
  ctx.beginPath();
  ctx.moveTo(CENTER - STOP_LINE_DIST, CENTER);
  ctx.lineTo(CENTER - STOP_LINE_DIST, CENTER + HALF_ROAD);
  ctx.stroke();

  // East Stop line (governs westbound incoming lanes: Lane 0 + Lane 1)
  ctx.beginPath();
  ctx.moveTo(CENTER + STOP_LINE_DIST, CENTER - HALF_ROAD);
  ctx.lineTo(CENTER + STOP_LINE_DIST, CENTER);
  ctx.stroke();
  ctx.restore();

  // 8. DIRECTIONAL ASPHALT LANE ARROWS (Inbound Lane 0 & Lane 1 on all 4 approaches)
  ctx.save();
  ctx.fillStyle = 'rgba(241, 245, 249, 0.45)';

  const drawStraightArrow = (ax: number, ay: number, rotDeg: number) => {
    ctx.save();
    ctx.translate(ax, ay);
    ctx.rotate((rotDeg * Math.PI) / 180);
    ctx.beginPath();
    ctx.moveTo(0, -14);
    ctx.lineTo(6, -4);
    ctx.lineTo(2.5, -4);
    ctx.lineTo(2.5, 12);
    ctx.lineTo(-2.5, 12);
    ctx.lineTo(-2.5, -4);
    ctx.lineTo(-6, -4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };

  const drawTurnArrow = (ax: number, ay: number, rotDeg: number, isLeft: boolean) => {
    ctx.save();
    ctx.translate(ax, ay);
    ctx.rotate((rotDeg * Math.PI) / 180);
    const sign = isLeft ? -1 : 1;
    ctx.beginPath();
    ctx.moveTo(0, 12);
    ctx.lineTo(sign * 3, 12);
    ctx.lineTo(sign * 3, -2);
    ctx.lineTo(sign * 9, -2);
    ctx.lineTo(sign * 9, -7);
    ctx.lineTo(sign * 15, -2);
    ctx.lineTo(sign * 9, 3);
    ctx.lineTo(sign * 9, -0.5);
    ctx.lineTo(0, -0.5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };

  // South Approach (Northbound Inbound, 0 deg)
  // Lane 0 (inner express/turn lane): Straight + Left
  drawStraightArrow(CENTER + LANE_INNER_OFFSET, CENTER + 145, 0);
  drawTurnArrow(CENTER + LANE_INNER_OFFSET - 4, CENTER + 175, 0, true);
  // Lane 1 (outer cruising/turn lane): Straight + Right
  drawStraightArrow(CENTER + LANE_OUTER_OFFSET, CENTER + 145, 0);
  drawTurnArrow(CENTER + LANE_OUTER_OFFSET + 4, CENTER + 175, 0, false);

  // North Approach (Southbound Inbound, 180 deg)
  // Lane 0: Straight + Left
  drawStraightArrow(CENTER - LANE_INNER_OFFSET, CENTER - 145, 180);
  drawTurnArrow(CENTER - LANE_INNER_OFFSET + 4, CENTER - 175, 180, true);
  // Lane 1: Straight + Right
  drawStraightArrow(CENTER - LANE_OUTER_OFFSET, CENTER - 145, 180);
  drawTurnArrow(CENTER - LANE_OUTER_OFFSET - 4, CENTER - 175, 180, false);

  // West Approach (Eastbound Inbound, 90 deg)
  // Lane 0: Straight + Left
  drawStraightArrow(CENTER - 145, CENTER + LANE_INNER_OFFSET, 90);
  drawTurnArrow(CENTER - 175, CENTER + LANE_INNER_OFFSET - 4, 90, true);
  // Lane 1: Straight + Right
  drawStraightArrow(CENTER - 145, CENTER + LANE_OUTER_OFFSET, 90);
  drawTurnArrow(CENTER - 175, CENTER + LANE_OUTER_OFFSET + 4, 90, false);

  // East Approach (Westbound Inbound, 270 deg)
  // Lane 0: Straight + Left
  drawStraightArrow(CENTER + 145, CENTER - LANE_INNER_OFFSET, 270);
  drawTurnArrow(CENTER + 175, CENTER - LANE_INNER_OFFSET + 4, 270, true);
  // Lane 1: Straight + Right
  drawStraightArrow(CENTER + 145, CENTER - LANE_OUTER_OFFSET, 270);
  drawTurnArrow(CENTER + 175, CENTER - LANE_OUTER_OFFSET - 4, 270, false);

  ctx.restore();

  // 9. Intersection Conflict Box: Subtle Yellow Hatch Crosshatching
  ctx.save();
  const czSize = CONFLICT_ZONE_RADIUS * 2;
  ctx.fillStyle = 'rgba(245, 158, 11, 0.03)';
  ctx.fillRect(CENTER - CONFLICT_ZONE_RADIUS, CENTER - CONFLICT_ZONE_RADIUS, czSize, czSize);
  ctx.strokeStyle = 'rgba(245, 158, 11, 0.25)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(CENTER - CONFLICT_ZONE_RADIUS, CENTER - CONFLICT_ZONE_RADIUS, czSize, czSize);

  // Subtle diagonal clearance lines inside conflict box
  ctx.strokeStyle = 'rgba(245, 158, 11, 0.09)';
  ctx.lineWidth = 1;
  for (let i = -czSize; i <= czSize; i += 24) {
    ctx.beginPath();
    ctx.moveTo(CENTER - CONFLICT_ZONE_RADIUS + Math.max(0, i), CENTER - CONFLICT_ZONE_RADIUS + Math.max(0, -i));
    ctx.lineTo(CENTER + CONFLICT_ZONE_RADIUS + Math.min(0, i), CENTER + CONFLICT_ZONE_RADIUS + Math.min(0, -i));
    ctx.stroke();
  }
  ctx.restore();

  // 10. REALISTIC 3D TRAFFIC LIGHT GANTRIES (4 Intersection Signal Heads with Standard MUTCD Optics)
  const drawSignalHead = (
    x: number, 
    y: number, 
    activeLight: LightColor, 
    armDir: 'NORTH' | 'SOUTH' | 'EAST' | 'WEST',
    label: string
  ) => {
    ctx.save();
    const isCooperative = trafficLightState.mode === 'V2X_COOPERATIVE_ONLY';
    const headW = 18;
    const headH = 46;
    const bulbRadius = 5;

    // Heavy-duty steel mast arm and base pole
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.beginPath();

    // Pole placement at curb corner with cantilever arm extending towards lane
    let poleX = x;
    let poleY = y;
    if (armDir === 'NORTH') {
      poleX = x - 14;
      poleY = y - 10;
    } else if (armDir === 'SOUTH') {
      poleX = x + 14;
      poleY = y + 10;
    } else if (armDir === 'WEST') {
      poleX = x - 10;
      poleY = y + 14;
    } else if (armDir === 'EAST') {
      poleX = x + 10;
      poleY = y - 14;
    }

    // Draw pole foundation base
    ctx.fillStyle = '#1E293B';
    ctx.strokeStyle = '#64748B';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(poleX, poleY, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Cantilever mast arm connecting base to signal head
    ctx.strokeStyle = '#64748B';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(poleX, poleY);
    ctx.lineTo(x, y);
    ctx.stroke();

    // Signal Housing Backplate (Glossy black with safety yellow border)
    ctx.fillStyle = '#06090F';
    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(x - headW / 2 - 2, y - headH / 2 - 2, headW + 4, headH + 4, 4);
    ctx.fill();
    ctx.stroke();

    // Metallic signal housing
    ctx.fillStyle = '#0F172A';
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.roundRect(x - headW / 2, y - headH / 2, headW, headH, 3);
    ctx.fill();
    ctx.stroke();

    // Bulbs positions (Vertical standard: RED top, YELLOW middle, GREEN bottom)
    const bulbOffsets = [-14, 0, 14];
    const colors: LightColor[] = ['RED', 'YELLOW', 'GREEN'];
    const nowMs = Date.now();
    const flashAmber = isCooperative && (Math.floor(nowMs / 600) % 2 === 0);

    for (let i = 0; i < 3; i++) {
      const c = colors[i];
      const bx = x;
      const by = y + bulbOffsets[i];
      const isLit = isCooperative ? (c === 'YELLOW' && flashAmber) : (c === activeLight);

      // Deep protective hooded visor over each lens
      ctx.strokeStyle = '#1E293B';
      ctx.fillStyle = '#020617';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(bx, by - 1, bulbRadius + 1.8, Math.PI, Math.PI * 2);
      ctx.stroke();

      // Individual bulb cavity
      ctx.beginPath();
      ctx.arc(bx, by, bulbRadius, 0, Math.PI * 2);
      ctx.fillStyle = '#020617';
      ctx.fill();

      if (isLit) {
        ctx.save();
        if (c === 'RED') {
          ctx.fillStyle = '#EF4444';
          ctx.shadowColor = '#EF4444';
          ctx.shadowBlur = 16;
        } else if (c === 'YELLOW') {
          ctx.fillStyle = '#F59E0B';
          ctx.shadowColor = '#F59E0B';
          ctx.shadowBlur = 16;
        } else {
          ctx.fillStyle = '#10B981';
          ctx.shadowColor = '#10B981';
          ctx.shadowBlur = 16;
        }

        ctx.beginPath();
        ctx.arc(bx, by, bulbRadius, 0, Math.PI * 2);
        ctx.fill();

        // Intense hot center diode
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(bx, by, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else {
        // Realistic dark unlit lens with subtle tint
        ctx.fillStyle = c === 'RED' ? '#250B0D' : c === 'YELLOW' ? '#241A06' : '#051D14';
        ctx.beginPath();
        ctx.arc(bx, by, bulbRadius - 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Approach identifier badge & phase countdown
    ctx.fillStyle = '#38BDF8';
    ctx.font = 'bold 7px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(label, x, y - headH / 2 - 4);

    if (!isCooperative) {
      const remaining = Math.max(1, Math.ceil(trafficLightState.phaseTimeRemainingSec));
      ctx.fillStyle = activeLight === 'GREEN' ? '#10B981' : activeLight === 'YELLOW' ? '#F59E0B' : '#EF4444';
      ctx.font = 'bold 8px monospace';
      ctx.fillText(`${remaining}s`, x, y + headH / 2 + 10);
    } else {
      ctx.fillStyle = '#F59E0B';
      ctx.font = 'bold 6px monospace';
      ctx.fillText('V2X', x, y + headH / 2 + 8);
    }

    ctx.restore();
  };

  // 4 Standard Vertical Signal Heads stationed at each approach (One Light at a Time):
  // North Approach Signal (controlling southbound incoming traffic from North):
  drawSignalHead(CENTER - HALF_ROAD - 14, CENTER - STOP_LINE_DIST - 12, trafficLightState.northLight, 'NORTH', 'NORTH');
  // South Approach Signal (controlling northbound incoming traffic from South):
  drawSignalHead(CENTER + HALF_ROAD + 14, CENTER + STOP_LINE_DIST + 12, trafficLightState.southLight, 'SOUTH', 'SOUTH');
  // West Approach Signal (controlling eastbound incoming traffic from West):
  drawSignalHead(CENTER - STOP_LINE_DIST - 12, CENTER + HALF_ROAD + 14, trafficLightState.westLight, 'WEST', 'WEST');
  // East Approach Signal (controlling westbound incoming traffic from East):
  drawSignalHead(CENTER + STOP_LINE_DIST + 12, CENTER - HALF_ROAD - 14, trafficLightState.eastLight, 'EAST', 'EAST');

  // 10b. 3-Second All-Red Clearance Interval Banner on Canvas
  if (trafficLightState.mode === 'TRAFFIC_LIGHTS' && trafficLightState.isAllRedClearance) {
    ctx.save();
    const remSec = trafficLightState.clearanceTimeRemainingSec.toFixed(1);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.strokeStyle = '#EF4444';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(CENTER - 135, CENTER - 18, 270, 36, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#EF4444';
    ctx.beginPath();
    ctx.arc(CENTER - 115, CENTER, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`ALL-RED CLEARANCE: ${remSec}s`, CENTER - 100, CENTER - 2);
    ctx.font = '9px monospace';
    ctx.fillStyle = '#FCA5A5';
    ctx.fillText('EVACUATING YELLOW VEHICLES BEFORE NEXT GREEN', CENTER - 100, CENTER + 10);
    ctx.restore();
  }

  // 11. Draw V2V Direct Communication Sidelink mesh between vehicles within 220px
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.22)';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  for (let i = 0; i < vehicles.length; i++) {
    for (let j = i + 1; j < vehicles.length; j++) {
      const v1 = vehicles[i];
      const v2 = vehicles[j];
      const dx = v1.x - v2.x;
      const dy = v1.y - v2.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 220) {
        ctx.beginPath();
        ctx.moveTo(v1.x, v1.y);
        ctx.lineTo(v2.x, v2.y);
        ctx.stroke();
      }
    }
  }
  ctx.setLineDash([]);

  // 12. Draw Collision Risk Projections
  for (const v of vehicles) {
    if (v.collisionAlert && v.conflictingVehicleId) {
      const conflictPartner = vehicles.find((other) => other.id === v.conflictingVehicleId);
      if (conflictPartner && v.id < conflictPartner.id) {
        ctx.save();
        ctx.strokeStyle = '#EF4444';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(v.x, v.y);
        ctx.lineTo(conflictPartner.x, conflictPartner.y);
        ctx.stroke();

        const midX = (v.x + conflictPartner.x) / 2;
        const midY = (v.y + conflictPartner.y) / 2;
        ctx.fillStyle = '#EF4444';
        ctx.beginPath();
        ctx.arc(midX, midY, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#FEE2E2';
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`TTC ${v.predictedTimeToCollision}s`, midX, midY - 8);
        ctx.restore();
      }
    }
  }

  // 12b. Emergency Red-Signal Detection Sightline Rays from Green-Light Vehicles
  // Green cars detecting an emergency vehicle coming from a red signal draw animated radar line
  for (const v of vehicles) {
    if (v.yieldingToRedEmergency && v.emergencyDetectedId) {
      const em = vehicles.find((other) => other.id === v.emergencyDetectedId);
      if (em) {
        ctx.save();
        const pulse = 0.5 + Math.sin(Date.now() / 90) * 0.45;
        ctx.strokeStyle = `rgba(245, 158, 11, ${pulse})`;
        ctx.lineWidth = 2.2;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(v.x, v.y);
        ctx.lineTo(em.x, em.y);
        ctx.stroke();

        const midX = (v.x + em.x) / 2;
        const midY = (v.y + em.y) / 2;
        ctx.fillStyle = '#F59E0B';
        ctx.shadowColor = '#F59E0B';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(midX, midY, 4.5, 0, Math.PI * 2);
        ctx.fill();

        // Sightline HUD badge
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.strokeStyle = '#F59E0B';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(midX - 60, midY - 18, 120, 16, 4);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#FDE68A';
        ctx.font = 'bold 8px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`YIELD TO RED SIGHTLINE`, midX, midY - 7);
        ctx.restore();
      }
    }
  }

  // 13. Dynamic CACC Safe Following Distance Headway Brackets in Telemetry
  const safeBufferPx = state.weatherState.followingDistanceGapPx;
  for (const v of vehicles) {
    if (v.crossedIntersection) continue;
    const leadVehicle = vehicles.find(
      (other) =>
        other.id !== v.id &&
        other.direction === v.direction &&
        other.distanceToStopLine < v.distanceToStopLine &&
        (v.distanceToStopLine - other.distanceToStopLine) < (safeBufferPx * 1.55)
    );

    if (leadVehicle) {
      const gapPx = v.distanceToStopLine - leadVehicle.distanceToStopLine;
      const gapM = (gapPx / 3.5).toFixed(1);
      const reqM = (safeBufferPx / 3.5).toFixed(0);
      const isAdequate = gapPx >= safeBufferPx;

      ctx.save();
      ctx.strokeStyle = isAdequate ? 'rgba(52, 211, 153, 0.75)' : 'rgba(244, 63, 94, 0.85)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(v.x, v.y);
      ctx.lineTo(leadVehicle.x, leadVehicle.y);
      ctx.stroke();

      const midX = (v.x + leadVehicle.x) / 2;
      const midY = (v.y + leadVehicle.y) / 2;

      ctx.fillStyle = '#090D16';
      ctx.strokeStyle = isAdequate ? '#059669' : '#DC2626';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(midX - 44, midY - 9, 88, 18, 4);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = isAdequate ? '#6EE7B7' : '#FCA5A5';
      ctx.font = 'bold 8px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`GAP ${gapM}m | REQ ${reqM}m`, midX, midY + 3);
      ctx.restore();
    }
  }

  // 14. Tire Water Spray behind vehicles on wet asphalt
  if (state.weatherState.condition === 'RAIN') {
    for (const v of vehicles) {
      if (v.speed > 8) {
        ctx.save();
        ctx.fillStyle = 'rgba(224, 242, 254, 0.25)';
        let sprayX = v.x;
        let sprayY = v.y;
        if (v.direction === 'NORTH') sprayY -= 20;
        else if (v.direction === 'SOUTH') sprayY += 20;
        else if (v.direction === 'WEST') sprayX -= 20;
        else if (v.direction === 'EAST') sprayX += 20;

        ctx.beginPath();
        ctx.arc(sprayX + (Math.random() - 0.5) * 6, sprayY + (Math.random() - 0.5) * 6, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
  }

  // 15. Draw Vehicles
  for (const v of vehicles) {
    drawVehicle(ctx, v, v.id === selectedVehicleId);
  }

  // 16. Atmospheric Weather Overlays (Dense Volumetric Fog, Rain Streaks, Snowfall)
  if (state.weatherState.condition === 'DENSE_FOG') {
    ctx.save();
    // A. Optical sensor cutoff range (30m / 105px radius) around selected or lead vehicle
    const focalVeh = vehicles.find((veh) => veh.id === selectedVehicleId) || vehicles[0];
    if (focalVeh) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(focalVeh.x, focalVeh.y, 105, 0, Math.PI * 2);
      ctx.stroke();

      // Optical visibility label vs V2X penetration
      ctx.fillStyle = '#CBD5E1';
      ctx.font = 'bold 8px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('OPTICAL CUTOFF: 30m (CAMERA/HUMAN BLIND)', focalVeh.x, focalVeh.y - 110);
      ctx.fillStyle = '#38BDF8';
      ctx.fillText('5.9 GHz V2X SIDELINK PENETRATION ACTIVE (>250m)', focalVeh.x, focalVeh.y + 120);
      ctx.restore();
    }

    // B. Translucent volumetric fog mist drifting across the scene
    const t = Date.now() / 2500;
    const fogClouds = [
      { x: ((t * 22 + 60) % (CANVAS_SIZE + 240)) - 120, y: 140, r: 190 },
      { x: ((t * 16 + 280) % (CANVAS_SIZE + 240)) - 120, y: 460, r: 220 },
      { x: ((t * 26 + 480) % (CANVAS_SIZE + 240)) - 120, y: 310, r: 200 },
      { x: ((t * 18) % (CANVAS_SIZE + 240)) - 120, y: 55, r: 170 },
      { x: ((t * 20 + 380) % (CANVAS_SIZE + 240)) - 120, y: 620, r: 180 },
    ];
    for (const fc of fogClouds) {
      const grad = ctx.createRadialGradient(fc.x, fc.y, 10, fc.x, fc.y, fc.r);
      grad.addColorStop(0, 'rgba(148, 163, 184, 0.28)');
      grad.addColorStop(0.5, 'rgba(100, 116, 139, 0.16)');
      grad.addColorStop(1, 'rgba(15, 23, 42, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(fc.x, fc.y, fc.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  } else if (state.weatherState.condition === 'RAIN') {
    // Dynamic rain streaks falling diagonally across the canvas
    const nowMs = Date.now();
    ctx.save();
    ctx.strokeStyle = 'rgba(186, 230, 253, 0.38)';
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 95; i++) {
      const rx = (i * 41 + nowMs * 0.45) % CANVAS_SIZE;
      const ry = (i * 59 + nowMs * 0.95) % CANVAS_SIZE;
      ctx.beginPath();
      ctx.moveTo(rx, ry);
      ctx.lineTo(rx - 5, ry + 16);
      ctx.stroke();
    }
    ctx.restore();
  } else if (state.weatherState.condition === 'SNOW_ICE') {
    // Gently falling floating snow crystals
    const nowMs = Date.now();
    ctx.save();
    ctx.fillStyle = 'rgba(241, 245, 249, 0.8)';
    for (let i = 0; i < 70; i++) {
      const sx = (i * 47 + Math.sin(nowMs / 400 + i) * 14) % CANVAS_SIZE;
      const sy = (i * 57 + nowMs * 0.08) % CANVAS_SIZE;
      ctx.beginPath();
      ctx.arc(sx, sy, (i % 3) + 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

function drawVehicle(ctx: CanvasRenderingContext2D, v: Vehicle, isSelected: boolean) {
  // Steer rotation adjustment if currently executing an evasive maneuver
  let steerAngle = 0;
  if (v.activeManeuver === 'EVASIVE_STEER_RIGHT') steerAngle = 12;
  if (v.activeManeuver === 'EVASIVE_STEER_LEFT') steerAngle = -12;
  if (v.activeManeuver === 'PULL_OVER_EMERGENCY') steerAngle = 8;

  // Realistic S-curve yaw angle rotation during lane change transitions
  let laneYaw = 0;
  if (v.lane !== v.targetLane && v.laneChangeProgress > 0) {
    const p = v.laneChangeProgress;
    // Moving from Lane 0 (inner) to Lane 1 (outer) swerves right; moving from Lane 1 to Lane 0 swerves left
    const sign = v.targetLane > v.lane ? 1 : -1;
    laneYaw = Math.sin(p * Math.PI) * sign * 14;
  }

  const isEmergency = v.type === 'POLICE_PATROL' || v.type === 'EMERGENCY_AMBULANCE' || v.type === 'FIRE_ENGINE';

  // 1. Concentric siren acoustic waves for emergency vehicles
  if (isEmergency) {
    ctx.save();
    const wave1 = (Date.now() / 25) % 80;
    const wave2 = ((Date.now() / 25) + 40) % 80;
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = v.type === 'POLICE_PATROL' ? 'rgba(59, 130, 246, 0.35)' : 'rgba(239, 68, 68, 0.35)';
    ctx.beginPath();
    ctx.arc(v.x, v.y, wave1, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = v.type === 'POLICE_PATROL' ? 'rgba(239, 68, 68, 0.35)' : 'rgba(59, 130, 246, 0.35)';
    ctx.beginPath();
    ctx.arc(v.x, v.y, wave2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // 2. Collision Warning Aura
  if (v.collisionAlert) {
    ctx.save();
    ctx.strokeStyle = '#EF4444';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(v.x, v.y, 28 + Math.sin(Date.now() / 80) * 4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // 3. Draw Vehicle Body with Realistic Features (Kinematic Bicycle & IDM+ Physics)
  ctx.save();
  ctx.translate(v.x, v.y);
  ctx.rotate(((v.heading + steerAngle + laneYaw) * Math.PI) / 180);

  let length = 32;
  let width = 18;
  if (v.type === 'HEAVY_TRUCK') {
    length = 50;
    width = 20;
  } else if (v.type === 'FIRE_ENGINE') {
    length = 46;
    width = 21;
  }

  // 3a. Draw 4 Realistic Rubber Wheels with Alloy Rims and Steering Rotation
  const wheelW = v.type === 'HEAVY_TRUCK' || v.type === 'FIRE_ENGINE' ? 4 : 3;
  const wheelL = v.type === 'HEAVY_TRUCK' || v.type === 'FIRE_ENGINE' ? 10 : 7;
  const frontAxleY = -length / 2 + 7;
  const rearAxleY = length / 2 - 7;
  const axleX = width / 2;

  const drawWheel = (wx: number, wy: number, angleDeg: number) => {
    ctx.save();
    ctx.translate(wx, wy);
    if (angleDeg !== 0) {
      ctx.rotate((angleDeg * Math.PI) / 180);
    }
    // Tire Rubber
    ctx.fillStyle = '#050811';
    ctx.strokeStyle = '#1E293B';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.roundRect(-wheelW / 2, -wheelL / 2, wheelW, wheelL, 1.5);
    ctx.fill();
    ctx.stroke();

    // Alloy Rim Hub
    ctx.fillStyle = '#94A3B8';
    ctx.fillRect(-wheelW / 2 + 0.5, -wheelL / 4, wheelW - 1, wheelL / 2);

    // Red brake caliper when braking is active
    if (v.braking) {
      ctx.fillStyle = '#EF4444';
      ctx.fillRect(-wheelW / 2 + 0.5, -wheelL / 4, 1, wheelL / 3);
    }
    ctx.restore();
  };

  // Front Left & Right Wheels (steering dynamically with bicycle model angle!)
  drawWheel(-axleX, frontAxleY, v.steerAngleDeg || 0);
  drawWheel(axleX, frontAxleY, v.steerAngleDeg || 0);
  // Rear Left & Right Wheels (fixed axle)
  drawWheel(-axleX, rearAxleY, 0);
  drawWheel(axleX, rearAxleY, 0);

  // Realistic Suspension Pitch / Dive Displacement (front compresses down under braking)
  const pitchDiveOffset = (v.pitchAngleDeg || 0) * 0.7; // forward shift when braking, rear shift when accelerating
  const bodyRollOffset = (v.rollAngleDeg || 0) * 0.35;

  ctx.save();
  ctx.translate(bodyRollOffset, pitchDiveOffset);

  // Forward Headlight Beams projected onto road surface
  ctx.save();
  ctx.fillStyle = 'rgba(254, 240, 138, 0.16)';
  ctx.beginPath();
  ctx.moveTo(-width / 2 + 2, -length / 2);
  ctx.lineTo(-width / 2 - 16, -length / 2 - 55);
  ctx.lineTo(width / 2 + 16, -length / 2 - 55);
  ctx.lineTo(width / 2 - 2, -length / 2);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Selection Halo
  if (isSelected) {
    ctx.strokeStyle = '#38BDF8';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(-width / 2 - 5, -length / 2 - 5, width + 10, length + 10);
  }

  // Soft vehicle shadow with dive compression
  ctx.fillStyle = v.braking ? 'rgba(0, 0, 0, 0.72)' : 'rgba(0, 0, 0, 0.55)';
  ctx.fillRect(-width / 2 + 3, -length / 2 + 3, width, length);

  // Body Base
  ctx.fillStyle = v.color;
  ctx.beginPath();
  ctx.roundRect(-width / 2, -length / 2, width, length, 4);
  ctx.fill();

  // Specialized Model Styling:
  if (v.type === 'POLICE_PATROL') {
    // White doors / roof panel
    ctx.fillStyle = '#F8FAFC';
    ctx.fillRect(-width / 2 + 3, -length / 2 + 8, width - 6, length - 16);

    // Front Push-Bumper
    ctx.fillStyle = '#020617';
    ctx.fillRect(-width / 2 - 1, -length / 2 - 3, width + 2, 3);

    // Flashing Red & Blue Police Roof Lightbar
    const isBlue = Math.floor(Date.now() / 120) % 2 === 0;
    ctx.save();
    // Blue strobe side
    ctx.fillStyle = isBlue ? '#3B82F6' : '#1D4ED8';
    if (isBlue) {
      ctx.shadowColor = '#3B82F6';
      ctx.shadowBlur = 12;
    }
    ctx.fillRect(-7, -4, 6, 7);

    // Red strobe side
    ctx.fillStyle = !isBlue ? '#EF4444' : '#B91C1C';
    if (!isBlue) {
      ctx.shadowColor = '#EF4444';
      ctx.shadowBlur = 12;
    }
    ctx.fillRect(1, -4, 6, 7);
    ctx.restore();

    // POLICE text
    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 6px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('POLICE', 0, 10);

  } else if (v.type === 'EMERGENCY_AMBULANCE') {
    // High-visibility fluorescent dayglo side stripes
    ctx.fillStyle = '#F59E0B';
    ctx.fillRect(-width / 2 + 1, -length / 2 + 6, 2, length - 12);
    ctx.fillRect(width / 2 - 3, -length / 2 + 6, 2, length - 12);

    // Roof Ambulance cross
    ctx.fillStyle = '#DC2626';
    ctx.fillRect(-1.5, -4, 3, 9);
    ctx.fillRect(-4.5, -1, 9, 3);

    // Flashing roof beacon
    const flash = Math.floor(Date.now() / 140) % 2 === 0;
    ctx.save();
    ctx.fillStyle = flash ? '#EF4444' : '#3B82F6';
    ctx.shadowColor = ctx.fillStyle;
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.arc(0, -9, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

  } else if (v.type === 'FIRE_ENGINE') {
    // Chrome diamond plate on roof
    ctx.fillStyle = '#94A3B8';
    ctx.fillRect(-width / 2 + 3, -length / 2 + 14, width - 6, length - 20);

    // Chrome ladder / equipment bar
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-4, -length / 2 + 16);
    ctx.lineTo(-4, length / 2 - 8);
    ctx.moveTo(4, -length / 2 + 16);
    ctx.lineTo(4, length / 2 - 8);
    ctx.stroke();

    // Dual rotating red warning lights
    const flash = Math.floor(Date.now() / 150) % 2 === 0;
    ctx.save();
    ctx.fillStyle = '#EF4444';
    ctx.shadowColor = '#EF4444';
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.arc(-5, -length / 2 + 5, 3, 0, Math.PI * 2);
    ctx.arc(5, -length / 2 + 5, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

  } else if (v.type === 'HEAVY_TRUCK') {
    // Cab and Trailer separation line
    ctx.fillStyle = '#0F172A';
    ctx.fillRect(-width / 2, -length / 2 + 16, width, 3);

    // Trailer body
    ctx.fillStyle = '#B45309';
    ctx.fillRect(-width / 2 + 1, -length / 2 + 19, width - 2, length - 21);

    // Cab windshield
    ctx.fillStyle = '#1E293B';
    ctx.fillRect(-width / 2 + 2, -length / 2 + 4, width - 4, 8);

    // Amber cab clearance lights
    ctx.fillStyle = '#F59E0B';
    ctx.fillRect(-width / 2 + 2, -length / 2, 2, 2);
    ctx.fillRect(-1, -length / 2, 2, 2);
    ctx.fillRect(width / 2 - 4, -length / 2, 2, 2);

  } else {
    // Standard Civilian Sedan: Contoured Windshield & Windows
    ctx.fillStyle = '#0F172A';
    // Front windshield
    ctx.beginPath();
    ctx.roundRect(-width / 2 + 2, -length / 2 + 6, width - 4, 7, 2);
    ctx.fill();

    // Rear window
    ctx.beginPath();
    ctx.roundRect(-width / 2 + 2, length / 2 - 11, width - 4, 5, 2);
    ctx.fill();

    // Side mirrors
    ctx.fillStyle = v.color;
    ctx.fillRect(-width / 2 - 2, -length / 2 + 9, 2, 3);
    ctx.fillRect(width / 2, -length / 2 + 9, 2, 3);
  }

  // Front Headlight Bulbs
  ctx.fillStyle = '#FEF08A';
  ctx.fillRect(-width / 2 + 2, -length / 2, 3, 2);
  ctx.fillRect(width / 2 - 5, -length / 2, 3, 2);

  // Front Piercing Fog Lamps (Active in Dense Fog)
  if (v.fogLightsActive) {
    ctx.save();
    ctx.fillStyle = '#F59E0B';
    ctx.shadowColor = '#F59E0B';
    ctx.shadowBlur = 10;
    ctx.fillRect(-width / 2 + 1, -length / 2 + 1, 3, 2);
    ctx.fillRect(width / 2 - 4, -length / 2 + 1, 3, 2);
    ctx.restore();
  }

  // Active Windshield Wipers Animation (Sweeping across front windshield in Rain or Snow)
  if (v.wipersActive) {
    const sweep = Math.sin(Date.now() / 130) * 0.75;
    ctx.save();
    ctx.strokeStyle = '#020617';
    ctx.lineWidth = 1.3;
    ctx.lineCap = 'round';
    // Left wiper arm
    ctx.beginPath();
    ctx.moveTo(-width / 4, -length / 2 + 12);
    ctx.lineTo(-width / 4 + Math.sin(sweep) * 6, -length / 2 + 6 + Math.cos(sweep) * 3);
    ctx.stroke();
    // Right wiper arm
    ctx.beginPath();
    ctx.moveTo(width / 4, -length / 2 + 12);
    ctx.lineTo(width / 4 + Math.sin(sweep) * 6, -length / 2 + 6 + Math.cos(sweep) * 3);
    ctx.stroke();
    ctx.restore();
  }

  // Rear Taillights / Glowing Brake Lights
  if (v.braking) {
    ctx.save();
    ctx.fillStyle = '#EF4444';
    ctx.shadowColor = '#EF4444';
    ctx.shadowBlur = 12;
    ctx.fillRect(-width / 2 + 2, length / 2 - 2, 4, 3);
    ctx.fillRect(width / 2 - 6, length / 2 - 2, 4, 3);
    ctx.restore();
  } else {
    ctx.fillStyle = '#7F1D1D';
    ctx.fillRect(-width / 2 + 2, length / 2 - 2, 4, 2);
    ctx.fillRect(width / 2 - 6, length / 2 - 2, 4, 2);
  }

  // Animated Amber Turn Indicators / Blinkers (Left, Right, Hazards, Overtaking)
  const isBlink = Math.floor(Date.now() / 200) % 2 === 0;
  const isLeftTurn = v.turnSignal === 'LEFT' || (v.lane !== v.targetLane && v.targetLane === 0);
  const isRightTurn = v.turnSignal === 'RIGHT' || (v.lane !== v.targetLane && v.targetLane === 1);
  const isHazards = v.hazardLights || v.turnSignal === 'HAZARD' || v.activeManeuver === 'PULL_OVER_EMERGENCY' || v.yieldingToEmergency;

  if (isBlink && (isLeftTurn || isRightTurn || isHazards)) {
    ctx.save();
    ctx.fillStyle = '#F59E0B';
    ctx.shadowColor = '#F59E0B';
    ctx.shadowBlur = 10;

    // Left indicator lamps (front-left & rear-left)
    if (isLeftTurn || isHazards) {
      ctx.fillRect(-width / 2 - 1, -length / 2, 3, 3);
      ctx.fillRect(-width / 2 - 1, length / 2 - 3, 3, 3);
    }
    // Right indicator lamps (front-right & rear-right)
    if (isRightTurn || isHazards) {
      ctx.fillRect(width / 2 - 2, -length / 2, 3, 3);
      ctx.fillRect(width / 2 - 2, length / 2 - 3, 3, 3);
    }
    ctx.restore();
  }

  // Restore suspension pitch/dive offset (from line 2437)
  ctx.restore();
  // Restore vehicle position and heading transformation (from line 2378)
  ctx.restore();

  // Dynamic Status Tag Above Vehicle
  ctx.textAlign = 'center';
  if (v.v2iReaction === 'WAITING_FOR_BOX_CLEARANCE') {
    ctx.fillStyle = '#F59E0B';
    ctx.font = 'bold 9px monospace';
    ctx.fillText('⏳ HOLDING STOP BAR', v.x, v.y - 24);
  } else if (v.yieldingToRedEmergency) {
    ctx.fillStyle = '#F59E0B';
    ctx.font = 'bold 10px monospace';
    ctx.fillText('🛡️ YIELDING TO RED EMERGENCY', v.x, v.y - 24);
  } else if (v.absActive) {
    ctx.fillStyle = '#EF4444';
    ctx.font = 'bold 9px monospace';
    ctx.fillText('⚡ ABS PULSE', v.x, v.y - 24);
  } else if (v.overtaking) {
    ctx.fillStyle = '#38BDF8';
    ctx.font = 'bold 9px monospace';
    ctx.fillText(`⚡ OVERTAKING L${v.targetLane}`, v.x, v.y - 24);
  } else if (v.lane !== v.targetLane) {
    ctx.fillStyle = '#60A5FA';
    ctx.font = 'bold 9px monospace';
    ctx.fillText(`⇄ LANE CHANGE → L${v.targetLane}`, v.x, v.y - 24);
  } else if (v.activeManeuver === 'SPEED_UP_YELLOW') {
    ctx.fillStyle = '#F59E0B';
    ctx.font = 'bold 9px monospace';
    ctx.fillText('⚡ BEATING YELLOW!', v.x, v.y - 24);
  } else if (v.activeManeuver === 'PULL_OVER_EMERGENCY') {
    ctx.fillStyle = '#38BDF8';
    ctx.font = 'bold 9px monospace';
    ctx.fillText('🛡️ PULLING OVER', v.x, v.y - 24);
  } else if (v.activeManeuver === 'EMERGENCY_BRAKE') {
    ctx.fillStyle = '#EF4444';
    ctx.font = 'bold 10px monospace';
    ctx.fillText('AEB 100%', v.x, v.y - 24);
  } else if (v.type === 'POLICE_PATROL') {
    ctx.fillStyle = '#3B82F6';
    ctx.font = 'bold 9px monospace';
    ctx.fillText('🚓 POLICE', v.x, v.y - 24);
  } else if (v.type === 'EMERGENCY_AMBULANCE') {
    ctx.fillStyle = '#EF4444';
    ctx.font = 'bold 9px monospace';
    ctx.fillText('🚑 AMBULANCE', v.x, v.y - 24);
  } else if (v.type === 'FIRE_ENGINE') {
    ctx.fillStyle = '#EF4444';
    ctx.font = 'bold 9px monospace';
    ctx.fillText('🚒 FIRE RESCUE', v.x, v.y - 24);
  } else if (v.v2iReaction === 'STOPPED_AT_RED') {
    ctx.fillStyle = '#EF4444';
    ctx.font = 'bold 9px monospace';
    ctx.fillText('🛑 RSU RED (STOP)', v.x, v.y - 24);
  } else if (v.v2iReaction === 'DECELERATING_FOR_RED') {
    ctx.fillStyle = '#F87171';
    ctx.font = 'bold 9px monospace';
    ctx.fillText('🔻 RSU RED (DECEL)', v.x, v.y - 24);
  } else if (v.v2iReaction === 'ACCELERATING_YELLOW') {
    ctx.fillStyle = '#F59E0B';
    ctx.font = 'bold 9px monospace';
    ctx.fillText('⚡ RSU YEL (ACCEL)', v.x, v.y - 24);
  } else if (v.v2iReaction === 'SLOWING_YELLOW') {
    ctx.fillStyle = '#FBBF24';
    ctx.font = 'bold 9px monospace';
    ctx.fillText('⚠️ RSU YEL (SLOW)', v.x, v.y - 24);
  } else if (v.v2iReaction === 'GLOSA_CRUISE_GREEN') {
    ctx.fillStyle = '#10B981';
    ctx.font = 'bold 9px monospace';
    ctx.fillText(`🟢 GLOSA ${Math.round(v.speed)}k`, v.x, v.y - 24);
  } else {
    ctx.fillStyle = '#F8FAFC';
    ctx.font = '10px monospace';
    ctx.fillText(`${Math.round(v.speed)} km/h [L${v.lane}]`, v.x, v.y - 24);
  }
}

// Environmental Helper: Draw Realistic Urban Trees
function drawTree(ctx: CanvasRenderingContext2D, tree: UrbanTree, weather: WeatherCondition) {
  ctx.save();
  const { x, y, radius, type, shadowLength } = tree;
  
  // Cast tree shadow on grass/sidewalk
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.beginPath();
  ctx.ellipse(x + shadowLength * 0.7, y + shadowLength * 0.7, radius * 1.15, radius * 0.65, Math.PI / 4, 0, Math.PI * 2);
  ctx.fill();

  // Tree trunk
  ctx.fillStyle = '#451A03';
  ctx.beginPath();
  ctx.arc(x, y, radius * 0.28, 0, Math.PI * 2);
  ctx.fill();

  // Multi-layered canopy
  if (type === 'OAK') {
    // Spreading vibrant green oak
    const colors = ['#14532D', '#15803D', '#22C55E', '#4ADE80'];
    [1.0, 0.82, 0.62, 0.4].forEach((scale, idx) => {
      ctx.fillStyle = colors[idx];
      ctx.beginPath();
      ctx.arc(x - (idx * 2), y - (idx * 2), radius * scale, 0, Math.PI * 2);
      ctx.fill();
    });
    // Leaf clumps
    ctx.fillStyle = 'rgba(74, 222, 128, 0.4)';
    ctx.beginPath();
    ctx.arc(x + radius * 0.3, y - radius * 0.2, radius * 0.35, 0, Math.PI * 2);
    ctx.arc(x - radius * 0.3, y + radius * 0.2, radius * 0.32, 0, Math.PI * 2);
    ctx.fill();
  } else if (type === 'MAPLE') {
    // Scarlet & Amber Autumn Maple
    const colors = ['#7F1D1D', '#B91C1C', '#EA580C', '#F97316'];
    [1.0, 0.82, 0.62, 0.4].forEach((scale, idx) => {
      ctx.fillStyle = colors[idx];
      ctx.beginPath();
      ctx.arc(x - (idx * 2), y - (idx * 2), radius * scale, 0, Math.PI * 2);
      ctx.fill();
    });
    // Star leaf cluster highlights
    ctx.fillStyle = 'rgba(254, 215, 170, 0.35)';
    ctx.beginPath();
    ctx.arc(x + radius * 0.25, y - radius * 0.25, radius * 0.32, 0, Math.PI * 2);
    ctx.fill();
  } else if (type === 'CHERRY') {
    // Romantic Cherry Blossom (Sakura)
    const colors = ['#9D174D', '#DB2777', '#F472B6', '#FBCFE8'];
    [1.0, 0.82, 0.62, 0.4].forEach((scale, idx) => {
      ctx.fillStyle = colors[idx];
      ctx.beginPath();
      ctx.arc(x - (idx * 2), y - (idx * 2), radius * scale, 0, Math.PI * 2);
      ctx.fill();
    });
    // Delicate blossom petal clusters
    ctx.fillStyle = '#FFF1F2';
    ctx.beginPath();
    ctx.arc(x - radius * 0.25, y - radius * 0.25, radius * 0.3, 0, Math.PI * 2);
    ctx.arc(x + radius * 0.3, y + radius * 0.2, radius * 0.25, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // PINE: Evergreen conifer
    const colors = ['#022C22', '#064E3B', '#047857', '#10B981'];
    [1.0, 0.78, 0.54, 0.3].forEach((scale, idx) => {
      ctx.fillStyle = colors[idx];
      ctx.beginPath();
      ctx.arc(x, y - (idx * 3), radius * scale, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // Snow accumulation on canopy in winter
  if (weather === 'SNOW_ICE') {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.beginPath();
    ctx.arc(x - 3, y - 4, radius * 0.55, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

// Environmental Helper: Draw Urban Amenities
function drawAmenity(ctx: CanvasRenderingContext2D, amenity: UrbanAmenity, weather: WeatherCondition) {
  ctx.save();
  ctx.translate(amenity.x, amenity.y);
  ctx.rotate((amenity.rotationDeg * Math.PI) / 180);

  if (amenity.type === 'BUS_SHELTER') {
    // Concrete foundation pad
    ctx.fillStyle = '#1E293B';
    ctx.fillRect(-22, -12, 44, 24);
    // Steel pillars
    ctx.fillStyle = '#94A3B8';
    ctx.fillRect(-20, -10, 3, 3);
    ctx.fillRect(17, -10, 3, 3);
    ctx.fillRect(-20, 7, 3, 3);
    ctx.fillRect(17, 7, 3, 3);
    // Bench inside shelter
    ctx.fillStyle = '#B45309';
    ctx.fillRect(-14, -2, 28, 5);
    // Glass roof canopy
    ctx.fillStyle = 'rgba(56, 189, 248, 0.35)';
    ctx.strokeStyle = '#38BDF8';
    ctx.lineWidth = 1;
    ctx.fillRect(-24, -14, 48, 28);
    ctx.strokeRect(-24, -14, 48, 28);
    // Route display board
    ctx.fillStyle = '#0284C7';
    ctx.font = 'bold 5px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('METRO TRANSIT', 0, -8);
  } else if (amenity.type === 'BENCH') {
    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillRect(-11, 2, 24, 7);
    // Iron arms
    ctx.fillStyle = '#0F172A';
    ctx.fillRect(-13, -5, 3, 10);
    ctx.fillRect(10, -5, 3, 10);
    // Wood slats
    ctx.fillStyle = '#D97706';
    ctx.fillRect(-12, -4, 24, 3);
    ctx.fillStyle = '#B45309';
    ctx.fillRect(-12, 0, 24, 3);
  } else if (amenity.type === 'STREET_LAMP') {
    // Ambient ground light pool
    const lightGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, 48);
    lightGrad.addColorStop(0, 'rgba(254, 240, 138, 0.28)');
    lightGrad.addColorStop(0.6, 'rgba(254, 240, 138, 0.08)');
    lightGrad.addColorStop(1, 'rgba(254, 240, 138, 0)');
    ctx.fillStyle = lightGrad;
    ctx.beginPath();
    ctx.arc(0, 0, 48, 0, Math.PI * 2);
    ctx.fill();
    // Metal base
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Math.PI * 2);
    ctx.fill();
    // Pole head
    ctx.fillStyle = '#FEF08A';
    ctx.shadowColor = '#FEF08A';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (amenity.type === 'CAFE_TABLE') {
    // Drop shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.ellipse(3, 3, 12, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    // 2 Bistro chairs
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.arc(-11, 0, 4, 0, Math.PI * 2);
    ctx.arc(11, 0, 4, 0, Math.PI * 2);
    ctx.fill();
    // Parasol umbrella (striped canvas)
    ctx.fillStyle = '#EF4444';
    ctx.beginPath();
    ctx.arc(0, 0, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#F8FAFC';
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, 11, (i * Math.PI) / 2, (i * Math.PI) / 2 + Math.PI / 4);
      ctx.fill();
    }
    // Parasol top cap
    ctx.fillStyle = '#B91C1C';
    ctx.beginPath();
    ctx.arc(0, 0, 2, 0, Math.PI * 2);
    ctx.fill();
  } else if (amenity.type === 'BIKE_RACK') {
    // Inverted-U racks
    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 1.5;
    [-6, 0, 6].forEach((rx) => {
      ctx.strokeRect(rx - 2, -5, 4, 10);
    });
  } else if (amenity.type === 'FLOWER_BED') {
    // Stone planter border
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.roundRect(-16, -9, 32, 18, 4);
    ctx.fill();
    // Rich soil
    ctx.fillStyle = '#29170C';
    ctx.fillRect(-14, -7, 28, 14);
    // Flowers
    const flowerColors = ['#F43F5E', '#A855F7', '#F59E0B', '#38BDF8', '#EC4899'];
    for (let i = 0; i < 9; i++) {
      ctx.fillStyle = flowerColors[i % flowerColors.length];
      const fx = -10 + (i % 3) * 10;
      const fy = -4 + Math.floor(i / 3) * 4;
      ctx.beginPath();
      ctx.arc(fx, fy, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (amenity.type === 'TRASH_CAN') {
    // Receptacle
    ctx.fillStyle = '#0284C7';
    ctx.beginPath();
    ctx.roundRect(-4, -4, 8, 8, 2);
    ctx.fill();
    ctx.fillStyle = '#0F172A';
    ctx.fillRect(-2, -2, 4, 4);
  }

  ctx.restore();
}

// Environmental Helper: Draw Animated Pedestrians
function drawPedestrian(ctx: CanvasRenderingContext2D, ped: Pedestrian, weather: WeatherCondition) {
  ctx.save();
  ctx.translate(ped.x, ped.y);
  ctx.rotate((ped.heading * Math.PI) / 180);

  // Pedestrian cast shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.beginPath();
  ctx.ellipse(0, 0, 4, 2.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Animated leg stride
  const stride = Math.sin(ped.stepCycle * Math.PI * 2) * 3;
  ctx.fillStyle = '#1E293B';
  // Left leg
  ctx.fillRect(-2, -1 + stride, 1.8, 3.5);
  // Right leg
  ctx.fillRect(0.2, -1 - stride, 1.8, 3.5);

  // Torso / Clothing
  ctx.fillStyle = ped.clothingColor;
  ctx.beginPath();
  ctx.roundRect(-2.5, -3, 5, 5, 1.5);
  ctx.fill();

  // Head
  ctx.fillStyle = '#FBCFE8';
  ctx.beginPath();
  ctx.arc(0, -4.5, 2.2, 0, Math.PI * 2);
  ctx.fill();

  // Hair
  ctx.fillStyle = ped.hairColor;
  ctx.beginPath();
  ctx.arc(0, -5, 2, Math.PI, Math.PI * 2);
  ctx.fill();

  // Umbrella if raining or snowing
  if (ped.hasUmbrella) {
    ctx.save();
    ctx.fillStyle = '#38BDF8';
    ctx.shadowColor = '#38BDF8';
    ctx.shadowBlur = 4;
    ctx.beginPath();
    ctx.arc(0, -2, 7.5, 0, Math.PI * 2);
    ctx.fill();
    // Umbrella center tip
    ctx.fillStyle = '#0F172A';
    ctx.beginPath();
    ctx.arc(0, -2, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  ctx.restore();
}
