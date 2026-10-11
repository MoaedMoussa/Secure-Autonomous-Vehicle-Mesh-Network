/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SimulationState } from './simulationEngine';

function escapeCsvCell(val: unknown): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function formatCsvRow(cells: unknown[]): string {
  return cells.map(escapeCsvCell).join(',');
}

/**
 * Builds a structured, RFC 4180-compliant CSV report containing telemetry session data,
 * latency statistics, active vehicle telemetry, and incident prevention logs.
 */
export function generateSimulationCsv(state: SimulationState): string {
  const rows: string[] = [];
  const exportTimestamp = new Date().toISOString();
  const simulatedSec = (state.simulatedTimeMs / 1000).toFixed(1);

  // 1. Session Metadata & Overall Summary
  rows.push('# ==============================================================================');
  rows.push('# V2X-SecNet TELEMETRY & SAFETY INCIDENT SESSION REPORT');
  rows.push('# ==============================================================================');
  rows.push(formatCsvRow(['Export Timestamp (UTC)', exportTimestamp]));
  rows.push(formatCsvRow(['Local Time', new Date().toLocaleString()]));
  rows.push(formatCsvRow(['Simulated Clock Time (seconds)', `${simulatedSec}s`]));
  rows.push(formatCsvRow(['Intersection Control Mode', state.trafficLightState.mode]));
  rows.push(formatCsvRow(['Active Signal Phase', state.trafficLightState.phase]));
  rows.push(formatCsvRow(['Weather Condition', state.weatherState.condition]));
  rows.push(formatCsvRow(['Road Surface Friction (mu)', state.weatherState.frictionCoefficient]));
  rows.push(formatCsvRow(['Optical Visibility (m)', state.weatherState.visibilityMeters]));
  rows.push(formatCsvRow(['Recommended Speed (km/h)', state.weatherState.recommendedSpeedKmh]));
  rows.push(formatCsvRow(['Active Security Attack Test', state.activeAttack]));
  rows.push('');

  // 2. Latency & Network Performance Statistics
  rows.push('# ------------------------------------------------------------------------------');
  rows.push('# SECTION 1: LATENCY & NETWORK PERFORMANCE STATISTICS');
  rows.push('# ------------------------------------------------------------------------------');
  rows.push(formatCsvRow(['Metric Name', 'Value', 'Unit', 'Description']));
  rows.push(formatCsvRow([
    'Global Network Sidelink Latency',
    state.globalNetworkLatencyMs,
    'ms',
    'Current measured DSRC / C-V2X direct radio sidelink latency'
  ]));
  rows.push(formatCsvRow([
    'Cumulative Average Latency',
    state.stats.avgLatencyMs,
    'ms',
    'Rolling mean latency across all exchanged SAE J2735 messages'
  ]));
  rows.push(formatCsvRow([
    'Active Vehicles in Range',
    state.vehicles.length,
    'count',
    'Autonomous vehicles currently navigating the intersection area'
  ]));
  rows.push(formatCsvRow([
    'Total Vehicles Passed Safely',
    state.stats.totalVehiclesPassed,
    'count',
    'Vehicles that entered and cleared the intersection boundary'
  ]));
  rows.push(formatCsvRow([
    'Total Near-Miss Incidents Prevented',
    state.collisionIncidents.length,
    'count',
    'Cumulative collision hazards averted by cooperative V2V'
  ]));
  rows.push(formatCsvRow([
    'Collisions Avoided by AEB',
    state.stats.collisionsAvoidedByAEB,
    'count',
    'Emergency braking interventions executed'
  ]));
  rows.push(formatCsvRow([
    'Collisions Avoided by Evasive Steer',
    state.stats.collisionsAvoidedBySteer,
    'count',
    'Autonomous lane evasion maneuvers executed'
  ]));
  rows.push(formatCsvRow([
    'Tampered Packets Dropped',
    state.stats.tamperedPacketsDropped,
    'count',
    'Packets dropped due to failed ECDSA NIST P-256 signature verification'
  ]));
  rows.push(formatCsvRow([
    'Replay Attacks Blocked',
    state.stats.replaysBlocked,
    'count',
    'Packets discarded due to stale timestamps or sequence counter regressions'
  ]));
  rows.push(formatCsvRow([
    'Wireless Bandwidth Utilization',
    state.stats.bandwidthKbps,
    'kbps',
    'SAE J2735 BSM communication channel utilization at 5.9 GHz'
  ]));
  rows.push(formatCsvRow([
    'Virtual Arbitrations Completed',
    state.stats.totalArbitrationsCompleted,
    'count',
    'RSU space-time conflict box slot allocations granted'
  ]));
  rows.push('');

  // 3. Collision Prevention & Incident Logs
  rows.push('# ------------------------------------------------------------------------------');
  rows.push('# SECTION 2: V2V COLLISION PREVENTION & INCIDENT LOGS');
  rows.push('# ------------------------------------------------------------------------------');
  rows.push(formatCsvRow([
    'Incident ID',
    'Timestamp',
    'Vehicle A ID',
    'Vehicle A Name',
    'Vehicle B ID',
    'Vehicle B Name',
    'Time To Collision (s)',
    'Measured Latency (ms)',
    'Maneuver Vehicle A',
    'Maneuver Vehicle B',
    'Safety Outcome',
    'Closest Point of Approach Dist (m)'
  ]));

  if (state.collisionIncidents.length === 0) {
    rows.push('# No collision incidents recorded in current session');
  } else {
    for (const inc of state.collisionIncidents) {
      rows.push(formatCsvRow([
        inc.id,
        inc.timestamp,
        inc.vehicleAId,
        inc.vehicleAName,
        inc.vehicleBId,
        inc.vehicleBName,
        inc.timeToCollisionSec,
        inc.measuredLatencyMs,
        inc.maneuverExecutedA,
        inc.maneuverExecutedB,
        inc.outcome,
        inc.cpaDistanceMeters
      ]));
    }
  }
  rows.push('');

  // 4. Active Vehicle Telemetry Snapshot
  rows.push('# ------------------------------------------------------------------------------');
  rows.push('# SECTION 3: ACTIVE VEHICLE TELEMETRY SNAPSHOT');
  rows.push('# ------------------------------------------------------------------------------');
  rows.push(formatCsvRow([
    'Vehicle ID',
    'Name',
    'Type',
    'Direction',
    'Lane',
    'Target Lane',
    'Speed (km/h)',
    'Target Speed (km/h)',
    'Dist to Stop Line (m)',
    'Time to Intersection (s)',
    'Acceleration (m/s2)',
    'Braking Active',
    'Brake Force (%)',
    'Steering Angle (deg)',
    'Heading (deg)',
    'Priority Flag',
    'V2I Signal',
    'V2I Reaction',
    'Lifecycle State',
    'Active Maneuver',
    'Driver Personality',
    'In Conflict Zone',
    'Slot Reserved'
  ]));

  if (state.vehicles.length === 0) {
    rows.push('# No active vehicles in network currently');
  } else {
    for (const v of state.vehicles) {
      rows.push(formatCsvRow([
        v.id,
        v.name,
        v.type,
        v.direction,
        v.lane,
        v.targetLane,
        v.speed.toFixed(1),
        v.targetSpeed.toFixed(1),
        v.distanceToStopLine.toFixed(1),
        v.timeToIntersection.toFixed(1),
        v.acceleration.toFixed(2),
        v.braking ? 'YES' : 'NO',
        v.brakeForce,
        v.steerAngleDeg.toFixed(1),
        v.heading,
        v.priority ? 'HIGH_PRIORITY' : 'STANDARD',
        v.v2iSignalReceived ? v.v2iSignalReceived.light : 'NONE',
        v.v2iReaction,
        v.lifecycleState,
        v.activeManeuver,
        v.driverPersonality,
        v.inConflictZone ? 'YES' : 'NO',
        v.hasSlotReserved ? 'YES' : 'NO'
      ]));
    }
  }
  rows.push('');

  // 5. Vehicle Lifecycle Event History
  rows.push('# ------------------------------------------------------------------------------');
  rows.push('# SECTION 4: VEHICLE LIFECYCLE EVENT HISTORY');
  rows.push('# ------------------------------------------------------------------------------');
  rows.push(formatCsvRow([
    'Event ID',
    'Timestamp',
    'Vehicle ID',
    'Vehicle Name',
    'Type',
    'Direction',
    'Lane',
    'Previous State',
    'New State',
    'Speed (km/h)',
    'Dist to Stop Line (m)',
    'Lifecycle Message'
  ]));

  if (state.lifecycleLogs && state.lifecycleLogs.length > 0) {
    for (const ev of state.lifecycleLogs) {
      rows.push(formatCsvRow([
        ev.id,
        ev.timeStr,
        ev.vehicleId,
        ev.vehicleName,
        ev.vehicleType,
        ev.direction,
        ev.lane,
        ev.previousState || 'NONE',
        ev.state,
        ev.speedKmh,
        ev.distanceToStopLine,
        ev.message
      ]));
    }
  } else {
    rows.push('# No lifecycle events recorded');
  }
  rows.push('');

  // 6. Recent SAE J2735 Basic Safety Message (BSM) Packets
  rows.push('# ------------------------------------------------------------------------------');
  rows.push('# SECTION 5: RECENT SAE J2735 BSM TELEMETRY PACKETS (SAMPLE)');
  rows.push('# ------------------------------------------------------------------------------');
  rows.push(formatCsvRow([
    'Packet ID',
    'Simulated Time (ms)',
    'Sender Vehicle ID',
    'Vehicle Name',
    'Pseudonym ID',
    'Sequence Number',
    'Direction',
    'Type',
    'Priority Flag',
    'Speed (km/h)',
    'Heading (deg)',
    'Acceleration (m/s2)',
    'Braking Active',
    'Brake Force (%)',
    'Surface Friction Mu'
  ]));

  if (state.packets && state.packets.length > 0) {
    const samplePackets = state.packets.slice(0, 50);
    for (const pkt of samplePackets) {
      rows.push(formatCsvRow([
        pkt.id,
        pkt.simulatedTimeMs,
        pkt.senderId,
        pkt.vehicleName,
        pkt.pseudonymId,
        pkt.sequenceNumber,
        pkt.direction,
        pkt.type,
        pkt.priorityFlag ? 'YES' : 'NO',
        pkt.telemetry.speedKmh.toFixed(1),
        pkt.telemetry.headingDeg,
        pkt.telemetry.accelerationMs2.toFixed(2),
        pkt.telemetry.brakingActive ? 'YES' : 'NO',
        pkt.telemetry.brakeForcePct,
        pkt.telemetry.surfaceFrictionMu ?? ''
      ]));
    }
  } else {
    rows.push('# No BSM packets available');
  }

  return rows.join('\r\n');
}

/**
 * Triggers a client-side download of the simulation CSV report.
 */
export function downloadSimulationCsv(state: SimulationState): string {
  const csvContent = generateSimulationCsv(state);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `v2x-telemetry-session-${timestamp}.csv`;

  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return filename;
}
