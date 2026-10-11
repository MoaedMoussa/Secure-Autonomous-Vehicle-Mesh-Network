/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';
import { 
  Flame, 
  RotateCcw, 
  Layers, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  Sliders, 
  Eye, 
  EyeOff, 
  Info 
} from 'lucide-react';
import { IntersectionSimulation, GRID_CELLS, CANVAS_SIZE, CENTER, ROAD_WIDTH, CONFLICT_ZONE_RADIUS } from '../utils/simulationEngine';
import { DensityCell } from '../types/v2x';

interface D3DensityHeatmapProps {
  simulation: IntersectionSimulation;
}

export type HeatmapMetric = 
  | 'COLLISION_RISK' 
  | 'SIGNAL_INTERFERENCE' 
  | 'COMPOSITE_RISK' 
  | 'DENSITY' 
  | 'BOTTLENECK' 
  | 'SPEED_DEFICIT';

export const D3DensityHeatmap: React.FC<D3DensityHeatmapProps> = ({ simulation }) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const legendRef = useRef<SVGSVGElement | null>(null);
  const [activeMetric, setActiveMetric] = useState<HeatmapMetric>('COLLISION_RISK');
  const [hoveredCell, setHoveredCell] = useState<DensityCell | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const [colorPalette, setColorPalette] = useState<'turbo' | 'inferno' | 'warm' | 'cool' | 'plasma'>('warm');

  const state = simulation.getState();

  // Keep simulation heatmapMode in sync with active metric
  const handleMetricChange = (metric: HeatmapMetric) => {
    setActiveMetric(metric);
    if (metric === 'COLLISION_RISK') {
      simulation.setHeatmapMode('COLLISION_RISK');
      setColorPalette('warm');
    } else if (metric === 'SIGNAL_INTERFERENCE') {
      simulation.setHeatmapMode('SIGNAL_INTERFERENCE');
      setColorPalette('cool');
    } else if (metric === 'COMPOSITE_RISK') {
      simulation.setHeatmapMode('COMPOSITE_RISK');
      setColorPalette('plasma');
    } else {
      simulation.setHeatmapMode('VEHICLE_DENSITY');
      setColorPalette('inferno');
    }
  };

  // D3 Color Interpolator Scale
  const getColorScale = () => {
    let interpolator = d3.interpolateInferno;
    if (colorPalette === 'turbo') interpolator = d3.interpolateTurbo;
    else if (colorPalette === 'warm') interpolator = d3.interpolateYlOrRd;
    else if (colorPalette === 'cool') interpolator = d3.interpolateCool;
    else if (colorPalette === 'plasma') interpolator = d3.interpolatePlasma;

    return d3.scaleSequential(interpolator).domain([0, 1]);
  };

  // Render D3 SVG Heatmap Grid
  useEffect(() => {
    const svg = d3.select(svgRef.current);
    if (!svg.node()) return;

    const width = 460;
    const height = 460;
    const cellWidth = width / GRID_CELLS;
    const cellHeight = height / GRID_CELLS;
    const colorScale = getColorScale();

    // Select container group
    let g = svg.select<SVGGElement>('g.heatmap-layer');
    if (g.empty()) {
      g = svg.append('g').attr('class', 'heatmap-layer');
    }

    const gridData = state.densityGrid;

    // Value selector based on chosen metric
    const getCellValue = (d: DensityCell) => {
      if (activeMetric === 'COLLISION_RISK') return d.collisionRisk;
      if (activeMetric === 'SIGNAL_INTERFERENCE') return d.signalInterference;
      if (activeMetric === 'COMPOSITE_RISK') return d.compositeRisk;
      if (activeMetric === 'BOTTLENECK') return d.bottleneckScore / 100;
      if (activeMetric === 'SPEED_DEFICIT') return Math.max(0, 1 - (d.avgSpeed / 45));
      return d.density;
    };

    // D3 Data Join
    const cells = g.selectAll<SVGRectElement, DensityCell>('rect.heat-cell')
      .data(gridData, (d) => `${d.col}-${d.row}`);

    cells.enter()
      .append('rect')
      .attr('class', 'heat-cell')
      .attr('x', (d) => d.col * cellWidth)
      .attr('y', (d) => d.row * cellHeight)
      .attr('width', cellWidth)
      .attr('height', cellHeight)
      .attr('rx', 1.5)
      .attr('stroke', '#0B132B')
      .attr('stroke-width', 0.5)
      .on('mouseenter', (event: MouseEvent, d: DensityCell) => {
        setHoveredCell(d);
        const rect = svgRef.current?.getBoundingClientRect();
        if (rect) {
          setTooltipPos({
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
          });
        }
      })
      .on('mousemove', (event: MouseEvent) => {
        const rect = svgRef.current?.getBoundingClientRect();
        if (rect) {
          setTooltipPos({
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
          });
        }
      })
      .on('mouseleave', () => {
        setHoveredCell(null);
        setTooltipPos(null);
      })
      .merge(cells)
      .attr('fill', (d) => {
        const val = getCellValue(d);
        return val < 0.02 ? '#0A0F1D' : colorScale(val);
      })
      .attr('opacity', (d) => {
        const val = getCellValue(d);
        return val < 0.02 ? 0.35 : Math.max(0.65, val);
      });

    cells.exit().remove();
  }, [state.densityGrid, activeMetric, colorPalette]);

  // Render D3 Color Legend
  useEffect(() => {
    const svg = d3.select(legendRef.current);
    if (!svg.node()) return;

    svg.selectAll('*').remove();

    const legendWidth = 320;
    const legendHeight = 12;
    const colorScale = getColorScale();

    const defs = svg.append('defs');
    const linearGradient = defs.append('linearGradient')
      .attr('id', 'heatmap-legend-grad')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '100%')
      .attr('y2', '0%');

    const stops = 10;
    for (let i = 0; i <= stops; i++) {
      const offset = i / stops;
      linearGradient.append('stop')
        .attr('offset', `${offset * 100}%`)
        .attr('stop-color', colorScale(offset));
    }

    const g = svg.append('g').attr('transform', 'translate(10, 8)');

    // Color bar
    g.append('rect')
      .attr('width', legendWidth)
      .attr('height', legendHeight)
      .attr('rx', 4)
      .style('fill', 'url(#heatmap-legend-grad)')
      .attr('stroke', '#334155')
      .attr('stroke-width', 1);

    // D3 Axis
    const scale = d3.scaleLinear()
      .domain([0, 100])
      .range([0, legendWidth]);

    const axis = d3.axisBottom(scale)
      .ticks(5)
      .tickFormat((d) => `${d}%`);

    const axisG = g.append('g')
      .attr('transform', `translate(0, ${legendHeight})`)
      .call(axis);

    axisG.select('.domain').attr('stroke', '#475569');
    axisG.selectAll('.tick line').attr('stroke', '#475569');
    axisG.selectAll('.tick text')
      .attr('fill', '#94A3B8')
      .attr('font-size', '9px')
      .attr('font-family', 'monospace');
  }, [colorPalette]);

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
      {/* Component Title & Metric Toggles */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-950 text-amber-300 border border-amber-800 uppercase tracking-wider flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              D3.js Spatial Analytics
            </span>
            <span className="text-slate-500 text-xs">Real-Time Kernel Density &amp; Bottlenecks</span>
          </div>
          <h2 className="text-lg font-bold text-white tracking-tight">
            Real-Time Vehicle Density Heatmap &amp; Bottleneck Identification
          </h2>
          <p className="text-slate-400 text-xs mt-0.5">
            Continuous 2D spatial binning ($25\times 25$ cells) computing traffic density, deceleration accumulation, and merge conflict hotspots.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => simulation.toggleHeatmapOverlay()}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              state.heatmapOverlayActive
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-900/30'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
            }`}
            title="Toggle heatmap directly on 2D simulation canvas"
          >
            {state.heatmapOverlayActive ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span>Canvas Overlay: {state.heatmapOverlayActive ? 'ON' : 'OFF'}</span>
          </button>

          <button
            onClick={() => simulation.resetDensityHeatmap()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition-colors cursor-pointer"
            title="Clear accumulated heat data"
          >
            <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
            <span>Reset Heat</span>
          </button>
        </div>
      </div>

      {/* Heatmap Metric Selector & Color Palette */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-slate-400 font-semibold mr-1">Display Metric:</span>
          {(['COLLISION_RISK', 'SIGNAL_INTERFERENCE', 'COMPOSITE_RISK', 'DENSITY', 'BOTTLENECK', 'SPEED_DEFICIT'] as HeatmapMetric[]).map((metric) => (
            <button
              key={metric}
              onClick={() => handleMetricChange(metric)}
              className={`px-2.5 py-1 rounded font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                activeMetric === metric
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-950/50'
                  : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
              }`}
            >
              {metric === 'COLLISION_RISK' && '⚠️ Collision Risk'}
              {metric === 'SIGNAL_INTERFERENCE' && '⚡ V2X Interference'}
              {metric === 'COMPOSITE_RISK' && '🛡️ Composite Risk'}
              {metric === 'DENSITY' && '🚗 Vehicle Density'}
              {metric === 'BOTTLENECK' && '🚦 Bottleneck'}
              {metric === 'SPEED_DEFICIT' && '⏱️ Speed Deficit'}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-slate-500">Palette:</span>
          {(['warm', 'cool', 'plasma', 'inferno', 'turbo'] as const).map((palette) => (
            <button
              key={palette}
              onClick={() => setColorPalette(palette)}
              className={`px-2 py-0.5 rounded text-[10px] uppercase font-mono transition-colors cursor-pointer ${
                colorPalette === palette
                  ? 'bg-slate-800 text-cyan-400 border border-cyan-500/50 font-bold'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {palette}
            </button>
          ))}
        </div>
      </div>

      {/* Real-Time Spatial Interference & Risk Telemetry HUD */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
          <div className="text-slate-400 text-[11px] mb-1 flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
            <span>Peak Collision Risk</span>
          </div>
          <div className="text-lg font-bold font-mono text-rose-400">
            {state.spatialHeatmapStats.peakCollisionRisk}%
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Kinetic conflict probability</div>
        </div>

        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
          <div className="text-slate-400 text-[11px] mb-1 flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span>Peak RF Interference</span>
          </div>
          <div className="text-lg font-bold font-mono text-cyan-300">
            {state.spatialHeatmapStats.peakInterferenceDbm} dBm
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">5.9 GHz sidelink noise floor</div>
        </div>

        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
          <div className="text-slate-400 text-[11px] mb-1 flex items-center gap-1">
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span>Channel Congestion</span>
          </div>
          <div className="text-lg font-bold font-mono text-amber-400">
            {state.spatialHeatmapStats.channelCongestionPct}%
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">CSMA/CA channel busy ratio</div>
        </div>

        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
          <div className="text-slate-400 text-[11px] mb-1 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>High-Risk Hotspots</span>
          </div>
          <div className="text-lg font-bold font-mono text-emerald-400">
            {state.spatialHeatmapStats.highRiskZoneCount} cells
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Requires AEB / preemption</div>
        </div>
      </div>

      {/* Main Grid: D3 SVG Heatmap (Left) + Bottleneck Cluster Ranking (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* D3 Heatmap SVG: 6 Columns */}
        <div className="lg:col-span-6 bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col items-center justify-center relative">
          <div className="relative aspect-square w-full max-w-[460px] mx-auto rounded-lg overflow-hidden border border-slate-800/80 bg-[#060B12]">
            <svg
              ref={svgRef}
              viewBox="0 0 460 460"
              className="w-full h-full cursor-crosshair"
              aria-label="Real-time D3.js vehicle density and collision risk heatmap"
            />

            {/* Road Overlay Guidelines (subtle intersection markings) */}
            <div className="absolute inset-0 pointer-events-none opacity-20">
              <div className="absolute left-1/2 top-0 bottom-0 w-16 -translate-x-1/2 border-x border-cyan-400" />
              <div className="absolute top-1/2 left-0 right-0 h-16 -translate-y-1/2 border-y border-cyan-400" />
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 border border-emerald-400 bg-emerald-500/10" />
            </div>

            {/* Interactive D3 Tooltip */}
            {hoveredCell && tooltipPos && (
              <div
                className="absolute z-30 pointer-events-none bg-slate-900/95 backdrop-blur-md border border-cyan-500/50 text-slate-200 text-[11px] p-2.5 rounded-lg shadow-xl font-mono space-y-1 min-w-[190px]"
                style={{
                  left: `${Math.min(250, Math.max(10, tooltipPos.x + 12))}px`,
                  top: `${Math.min(300, Math.max(10, tooltipPos.y + 12))}px`,
                }}
              >
                <div className="font-bold text-white border-b border-slate-800 pb-1 flex items-center justify-between">
                  <span>{hoveredCell.zone.replace('_', ' ')}</span>
                  <span className="text-[9px] text-cyan-400">[{hoveredCell.col},{hoveredCell.row}]</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Collision Risk:</span>
                  <span className="text-rose-400 font-bold">{(hoveredCell.collisionRisk * 100).toFixed(0)}%</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>V2X RF Power:</span>
                  <span className="text-cyan-300 font-bold">{hoveredCell.interferenceDbm} dBm</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>RF Interference:</span>
                  <span className="text-purple-300 font-bold">{(hoveredCell.signalInterference * 100).toFixed(0)}%</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Density Level:</span>
                  <span className="text-white font-bold">{(hoveredCell.density * 100).toFixed(0)}%</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Avg Speed:</span>
                  <span className="text-emerald-300 font-bold">{hoveredCell.avgSpeed.toFixed(1)} km/h</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Bottleneck Score:</span>
                  <span className="text-amber-400 font-bold">{hoveredCell.bottleneckScore}/100</span>
                </div>
              </div>
            )}
          </div>

          {/* D3 Continuous Color Legend */}
          <div className="mt-4 flex flex-col items-center">
            <svg ref={legendRef} width="340" height="34" className="overflow-visible" />
            <div className="flex justify-between w-[320px] text-[10px] text-slate-400 font-mono mt-0.5">
              <span>
                {activeMetric === 'COLLISION_RISK'
                  ? 'Safe (0%)'
                  : activeMetric === 'SIGNAL_INTERFERENCE'
                    ? 'Clean RF (-95 dBm)'
                    : activeMetric === 'COMPOSITE_RISK'
                      ? 'Low Hazard'
                      : 'Free Flow (0%)'}
              </span>
              <span>
                {activeMetric === 'COLLISION_RISK'
                  ? 'Caution'
                  : activeMetric === 'SIGNAL_INTERFERENCE'
                    ? 'Moderate Congestion'
                    : activeMetric === 'COMPOSITE_RISK'
                      ? 'Elevated'
                      : 'Moderate Queue'}
              </span>
              <span className="text-rose-400 font-bold">
                {activeMetric === 'COLLISION_RISK'
                  ? 'Imminent Collision (100%)'
                  : activeMetric === 'SIGNAL_INTERFERENCE'
                    ? 'RF Jammed (-38 dBm)'
                    : activeMetric === 'COMPOSITE_RISK'
                      ? 'Critical Exposure'
                      : 'Bottleneck (100%)'}
              </span>
            </div>
          </div>
        </div>

        {/* Bottleneck Clusters & Flow Optimization: 6 Columns */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-cyan-400" />
                Real-Time Bottleneck Zone Rankings
              </h3>
              <span className="text-xs font-mono text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800">
                Peak Density: {state.stats.peakDensityIndex}%
              </span>
            </div>

            <div className="space-y-2.5">
              {state.bottleneckZones.map((zone) => {
                const isSevere = zone.severity === 'SEVERE';
                const isModerate = zone.severity === 'MODERATE';

                return (
                  <div
                    key={zone.id}
                    className={`p-3 rounded-xl border text-xs space-y-1.5 ${
                      isSevere
                        ? 'bg-rose-950/40 border-rose-800 text-rose-200'
                        : isModerate
                          ? 'bg-amber-950/40 border-amber-800 text-amber-200'
                          : 'bg-slate-900 border-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2.5 h-2.5 rounded-full ${
                            isSevere
                              ? 'bg-rose-500 animate-pulse'
                              : isModerate
                                ? 'bg-amber-400'
                                : 'bg-emerald-400'
                          }`}
                        />
                        <span className="font-bold text-white">{zone.name}</span>
                      </div>

                      <div className="flex items-center gap-2 font-mono text-[11px]">
                        <span>Score: <strong className={isSevere ? 'text-rose-400 font-bold' : isModerate ? 'text-amber-400 font-bold' : 'text-emerald-400'}>{zone.bottleneckScore}</strong></span>
                        <span className="text-slate-500">|</span>
                        <span>Avg: <strong>{zone.avgSpeedKmh} km/h</strong></span>
                      </div>
                    </div>

                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          isSevere ? 'bg-rose-500' : isModerate ? 'bg-amber-400' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(100, Math.max(6, zone.bottleneckScore))}%` }}
                      />
                    </div>

                    <p className="text-[11px] text-slate-400 pt-0.5 leading-relaxed">
                      <strong className={isSevere ? 'text-rose-300' : 'text-slate-300'}>Advisory:</strong>{' '}
                      {zone.recommendation}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Traffic Engineering Optimization Insights */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs space-y-2.5">
            <h4 className="font-bold text-white flex items-center gap-1.5">
              <Info className="w-4 h-4 text-cyan-400" />
              Automated Flow Optimization Mechanism
            </h4>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              When bottleneck density in any approach exceeds 45%, the decentralized V2X Roadside Unit (RSU) dynamically triggers upstream speed harmonization. Vehicles receiving the MAP/SPaT broadcast adjust their Cooperative Adaptive Cruise Control (CACC) arrival velocity by -5 km/h, dissipating queue build-up without requiring complete vehicle stops.
            </p>
            <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-[11px]">
              <div className="p-2 rounded bg-slate-900 border border-slate-800">
                <span className="text-slate-500 block text-[10px]">THROUGHPUT GAIN</span>
                <span className="text-emerald-400 font-bold">+38.4% vs Lights</span>
              </div>
              <div className="p-2 rounded bg-slate-900 border border-slate-800">
                <span className="text-slate-500 block text-[10px]">AVG QUEUE DELAY</span>
                <span className="text-cyan-400 font-bold">&lt;1.8s / Vehicle</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
