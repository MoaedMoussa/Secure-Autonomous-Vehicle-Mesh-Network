/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  BSMPacket, 
  BottleneckZone,
  CollisionIncident, 
  CollisionRiskAlert,
  DensityCell,
  Direction, 
  DriverPersonality,
  HeatmapMode,
  LightColor,
  Pedestrian,
  ReservationSlot, 
  RSUArbiterConfig,
  RSUPriorityQueueItem,
  SecurityAttackLog, 
  SPaTBroadcast,
  TrafficLightControllerState,
  TrafficLightRSUState,
  TrafficPhase,
  TurnIntent, 
  UrbanAmenity,
  UrbanTree,
  Vehicle, 
  VehicleLifecycleEvent,
  VehicleLifecycleState,
  VehicleType,
  WeatherCondition,
  WeatherState
} from '../types/v2x';
import { V2XCryptoEngine } from './crypto';

// Weather condition presets with empirical friction, visibility, and braking factors
export const WEATHER_PRESETS: Record<WeatherCondition, WeatherState> = {
  CLEAR: {
    condition: 'CLEAR',
    label: 'Clear & Dry (Optimal Grip)',
    frictionCoefficient: 0.85, // Dry asphalt tire friction mu
    visibilityMeters: 250, // Full human/optical camera visibility
    brakingDistanceMultiplier: 1.0,
    followingDistanceGapPx: 54, // Baseline following distance
    recommendedSpeedKmh: 45,
    precipitationIntensity: 0.0,
    fogDensity: 0.0,
    v2xPenetrationAdvantage: false,
  },
  RAIN: {
    condition: 'RAIN',
    label: 'Heavy Rain (Reduced Grip & Surface Spray)',
    frictionCoefficient: 0.48, // Wet road reduces traction by ~44%
    visibilityMeters: 85, // Optical cameras degraded by rain drops & road spray
    brakingDistanceMultiplier: 1.75, // +75% braking distance to prevent aquaplaning
    followingDistanceGapPx: 95, // Expanded following distance in V2X telemetry
    recommendedSpeedKmh: 34, // Cruising speed scaled down
    precipitationIntensity: 0.85,
    fogDensity: 0.15,
    v2xPenetrationAdvantage: true, // 5.9 GHz V2X penetrates rain unaffected
  },
  DENSE_FOG: {
    condition: 'DENSE_FOG',
    label: 'Dense Fog (Zero Optical Visibility)',
    frictionCoefficient: 0.70, // Slightly damp roadway
    visibilityMeters: 30, // Human eyes & optical LiDAR severely blinded past 30m
    brakingDistanceMultiplier: 1.30,
    followingDistanceGapPx: 110, // Vehicles maintain wide cooperative radar buffer
    recommendedSpeedKmh: 28, // Slower cautious speed
    precipitationIntensity: 0.1,
    fogDensity: 0.88,
    v2xPenetrationAdvantage: true, // V2X RF provides non-line-of-sight awareness!
  },
  SNOW_ICE: {
    condition: 'SNOW_ICE',
    label: 'Snow & Black Ice (Extreme Slipping)',
    frictionCoefficient: 0.22, // Slick ice reduces friction to dangerous levels
    visibilityMeters: 55, // Falling snow impairs optical visibility
    brakingDistanceMultiplier: 2.85, // Stopping distance almost triples!
    followingDistanceGapPx: 140, // Extended safety buffer in V2X CACC telemetry
    recommendedSpeedKmh: 22, // Crawl speed to maintain directional stability
    precipitationIntensity: 0.8,
    fogDensity: 0.35,
    v2xPenetrationAdvantage: true,
  },
};

// Road & Intersection geometry constants (2 Lanes in each direction = 4 Lanes total per road)
export const CANVAS_SIZE = 700;
export const CENTER = CANVAS_SIZE / 2; // 350
export const ROAD_WIDTH = 176; // 88px on each side of center (2 lanes each direction = 4 lanes total)
export const HALF_ROAD = ROAD_WIDTH / 2; // 88px
export const LANE_WIDTH = HALF_ROAD / 2; // 44px per lane
export const LANE_INNER_OFFSET = 22; // Center of Lane 0 (inner express/emergency lane)
export const LANE_OUTER_OFFSET = 66; // Center of Lane 1 (outer cruising/pull-over lane)
export const CONFLICT_ZONE_RADIUS = 92; // px from center
export const STOP_LINE_DIST = 104; // px from center
export const GRID_CELLS = 25; // 25x25 spatial density grid (28px per cell)
export const CELL_SIZE = CANVAS_SIZE / GRID_CELLS; // 28px
export const RSU_POS = { x: CENTER - 105, y: CENTER - 105 }; // Roadside Unit antenna station

export interface VehicleDimensions {
  length: number;
  width: number;
  halfLength: number;
  halfWidth: number;
  boundingRadius: number;
}

export function getVehicleDimensions(type: VehicleType): VehicleDimensions {
  switch (type) {
    case 'HEAVY_TRUCK':
      return { length: 50, width: 20, halfLength: 25, halfWidth: 10, boundingRadius: 26 };
    case 'FIRE_ENGINE':
      return { length: 46, width: 21, halfLength: 23, halfWidth: 10.5, boundingRadius: 24 };
    case 'POLICE_PATROL':
    case 'EMERGENCY_AMBULANCE':
    case 'STANDARD_AV':
    default:
      return { length: 32, width: 18, halfLength: 16, halfWidth: 9, boundingRadius: 18 };
  }
}

export interface VehiclePhysicsSpecs {
  massKg: number;
  wheelbaseM: number;
  enginePowerKw: number;
  maxAccelMs2: number;
  comfDecelMs2: number;
  dragAreaCdA: number;
  rollResistanceCoeff: number;
}

export function getVehiclePhysicsSpecs(type: VehicleType): VehiclePhysicsSpecs {
  switch (type) {
    case 'HEAVY_TRUCK':
      return {
        massKg: 8500,
        wheelbaseM: 6.8,
        enginePowerKw: 330,
        maxAccelMs2: 1.8,
        comfDecelMs2: 1.6,
        dragAreaCdA: 6.5,
        rollResistanceCoeff: 0.015,
      };
    case 'FIRE_ENGINE':
      return {
        massKg: 12000,
        wheelbaseM: 7.4,
        enginePowerKw: 380,
        maxAccelMs2: 2.2,
        comfDecelMs2: 2.0,
        dragAreaCdA: 7.2,
        rollResistanceCoeff: 0.016,
      };
    case 'EMERGENCY_AMBULANCE':
      return {
        massKg: 3200,
        wheelbaseM: 3.4,
        enginePowerKw: 220,
        maxAccelMs2: 3.4,
        comfDecelMs2: 2.6,
        dragAreaCdA: 3.8,
        rollResistanceCoeff: 0.012,
      };
    case 'POLICE_PATROL':
      return {
        massKg: 1850,
        wheelbaseM: 2.9,
        enginePowerKw: 280,
        maxAccelMs2: 3.8,
        comfDecelMs2: 3.0,
        dragAreaCdA: 2.4,
        rollResistanceCoeff: 0.011,
      };
    case 'STANDARD_AV':
    default:
      return {
        massKg: 1600,
        wheelbaseM: 2.7,
        enginePowerKw: 150,
        maxAccelMs2: 3.0,
        comfDecelMs2: 2.4,
        dragAreaCdA: 2.1,
        rollResistanceCoeff: 0.010,
      };
  }
}

export interface SimulationState {
  vehicles: Vehicle[];
  pedestrians: Pedestrian[];
  trees: UrbanTree[];
  amenities: UrbanAmenity[];
  packets: BSMPacket[];
  attackLogs: SecurityAttackLog[];
  collisionIncidents: CollisionIncident[];
  densityGrid: DensityCell[];
  bottleneckZones: BottleneckZone[];
  rsuConfig: RSUArbiterConfig;
  rsuPriorityQueue: RSUPriorityQueueItem[];
  slots: ReservationSlot[];
  trafficLightState: TrafficLightControllerState;
  trafficLightRSU: TrafficLightRSUState;
  weatherState: WeatherState;
  stats: {
    totalVehiclesPassed: number;
    nearMissesPrevented: number;
    tamperedPacketsDropped: number;
    replaysBlocked: number;
    avgLatencyMs: number;
    bandwidthKbps: number;
    collisionsAvoidedByAEB: number;
    collisionsAvoidedBySteer: number;
    peakDensityIndex: number;
    totalArbitrationsCompleted: number;
  };
  simulatedTimeMs: number;
  activeAttack: 'NONE' | 'REPLAY' | 'TAMPERING' | 'SYBIL_ROGUE' | 'GPS_SPOOFING';
  globalNetworkLatencyMs: number;
  collisionMonitoringActive: boolean;
  activeCollisionWarningCount: number;
  heatmapOverlayActive: boolean;
  heatmapMode: HeatmapMode;
  heatmapOpacity: number;
  heatmapShowContours: boolean;
  spatialHeatmapStats: {
    peakCollisionRisk: number; // 0 to 100%
    peakInterferenceDbm: number; // -95 to -35 dBm
    highRiskZoneCount: number;
    channelCongestionPct: number;
    mostCongestedZone: string;
  };
  lifecycleLogs: VehicleLifecycleEvent[];
  recentCollisionAlerts: CollisionRiskAlert[];
  spawnerStatus: {
    lastSpawnTimeMs: number;
    isLoopActive: boolean;
    totalSpawned: number;
    stallWarning: boolean;
    activeFleetCount: number;
  };
}

export function createInitialTrees(): UrbanTree[] {
  return [
    // Northwest Corner (Tech Innovation Hub Plaza & Café)
    { id: 'tree-nw-1', x: 55, y: 65, radius: 22, type: 'OAK', shadowLength: 18 },
    { id: 'tree-nw-2', x: 150, y: 50, radius: 19, type: 'MAPLE', shadowLength: 16 },
    { id: 'tree-nw-3', x: 55, y: 165, radius: 21, type: 'CHERRY', shadowLength: 18 },
    { id: 'tree-nw-4', x: 165, y: 175, radius: 18, type: 'PINE', shadowLength: 15 },
    // Northeast Corner (Civic Transit Hub & Plaza)
    { id: 'tree-ne-1', x: CANVAS_SIZE - 55, y: 65, radius: 22, type: 'MAPLE', shadowLength: 18 },
    { id: 'tree-ne-2', x: CANVAS_SIZE - 155, y: 50, radius: 20, type: 'OAK', shadowLength: 17 },
    { id: 'tree-ne-3', x: CANVAS_SIZE - 60, y: 170, radius: 19, type: 'CHERRY', shadowLength: 16 },
    { id: 'tree-ne-4', x: CANVAS_SIZE - 170, y: 180, radius: 21, type: 'PINE', shadowLength: 18 },
    // Southwest Corner (Linear Park Promenade & Botanical Garden)
    { id: 'tree-sw-1', x: 55, y: CANVAS_SIZE - 55, radius: 24, type: 'OAK', shadowLength: 20 },
    { id: 'tree-sw-2', x: 155, y: CANVAS_SIZE - 50, radius: 21, type: 'CHERRY', shadowLength: 17 },
    { id: 'tree-sw-3', x: 50, y: CANVAS_SIZE - 165, radius: 20, type: 'MAPLE', shadowLength: 16 },
    { id: 'tree-sw-4', x: 170, y: CANVAS_SIZE - 175, radius: 23, type: 'PINE', shadowLength: 19 },
    // Southeast Corner (Cyber-Physical Lab & Academic Campus)
    { id: 'tree-se-1', x: CANVAS_SIZE - 55, y: CANVAS_SIZE - 55, radius: 22, type: 'MAPLE', shadowLength: 18 },
    { id: 'tree-se-2', x: CANVAS_SIZE - 150, y: CANVAS_SIZE - 50, radius: 20, type: 'OAK', shadowLength: 17 },
    { id: 'tree-se-3', x: CANVAS_SIZE - 60, y: CANVAS_SIZE - 165, radius: 21, type: 'CHERRY', shadowLength: 18 },
    { id: 'tree-se-4', x: CANVAS_SIZE - 175, y: CANVAS_SIZE - 175, radius: 19, type: 'PINE', shadowLength: 16 },
  ];
}

export function createInitialAmenities(): UrbanAmenity[] {
  return [
    // NW Café Terrace & Lighting
    { id: 'amenity-nw-cafe1', type: 'CAFE_TABLE', x: 105, y: 100, rotationDeg: 0 },
    { id: 'amenity-nw-cafe2', type: 'CAFE_TABLE', x: 135, y: 120, rotationDeg: 15 },
    { id: 'amenity-nw-flower', type: 'FLOWER_BED', x: 85, y: 210, rotationDeg: 0 },
    { id: 'amenity-nw-lamp', type: 'STREET_LAMP', x: CENTER - HALF_ROAD - 14, y: 110, rotationDeg: 90 },

    // NE Transit Hub & Mobility Station
    { id: 'amenity-ne-shelter', type: 'BUS_SHELTER', x: CANVAS_SIZE - 125, y: 95, rotationDeg: 0 },
    { id: 'amenity-ne-bikerack', type: 'BIKE_RACK', x: CANVAS_SIZE - 75, y: 125, rotationDeg: 90 },
    { id: 'amenity-ne-trash', type: 'TRASH_CAN', x: CANVAS_SIZE - 165, y: 105, rotationDeg: 0 },
    { id: 'amenity-ne-lamp', type: 'STREET_LAMP', x: CENTER + HALF_ROAD + 14, y: 110, rotationDeg: 270 },

    // SW Promenade & Park Benches
    { id: 'amenity-sw-bench1', type: 'BENCH', x: 105, y: CANVAS_SIZE - 105, rotationDeg: 45 },
    { id: 'amenity-sw-bench2', type: 'BENCH', x: 135, y: CANVAS_SIZE - 135, rotationDeg: 45 },
    { id: 'amenity-sw-flower', type: 'FLOWER_BED', x: 70, y: CANVAS_SIZE - 205, rotationDeg: 0 },
    { id: 'amenity-sw-lamp', type: 'STREET_LAMP', x: CENTER - HALF_ROAD - 14, y: CANVAS_SIZE - 110, rotationDeg: 90 },

    // SE Research Campus
    { id: 'amenity-se-bench', type: 'BENCH', x: CANVAS_SIZE - 130, y: CANVAS_SIZE - 85, rotationDeg: 0 },
    { id: 'amenity-se-flower', type: 'FLOWER_BED', x: CANVAS_SIZE - 90, y: CANVAS_SIZE - 205, rotationDeg: 0 },
    { id: 'amenity-se-lamp', type: 'STREET_LAMP', x: CENTER + HALF_ROAD + 14, y: CANVAS_SIZE - 110, rotationDeg: 270 },
  ];
}

export function createInitialPedestrians(): Pedestrian[] {
  return [
    {
      id: 'ped-1',
      name: 'Elena (Commuter)',
      x: 70,
      y: 120,
      targetX: CENTER - HALF_ROAD - 14,
      targetY: CENTER - STOP_LINE_DIST + 18,
      speed: 1.25,
      heading: 45,
      state: 'WALKING_SIDEWALK',
      crosswalkDirection: 'EAST',
      clothingColor: '#38BDF8',
      hairColor: '#451A03',
      hasUmbrella: false,
      stepCycle: 0,
      waitingTimeSec: 0,
    },
    {
      id: 'ped-2',
      name: 'Marcus (Student)',
      x: CENTER - HALF_ROAD - 14,
      y: CENTER - STOP_LINE_DIST + 18,
      targetX: CENTER + HALF_ROAD + 14,
      targetY: CENTER - STOP_LINE_DIST + 18,
      speed: 1.35,
      heading: 90,
      state: 'WAITING_AT_CROSSWALK',
      crosswalkDirection: 'EAST',
      clothingColor: '#F59E0B',
      hairColor: '#172554',
      hasUmbrella: false,
      stepCycle: 0,
      waitingTimeSec: 1.5,
    },
    {
      id: 'ped-3',
      name: 'Sophia (Pedestrian)',
      x: CANVAS_SIZE - 90,
      y: 130,
      targetX: CANVAS_SIZE - 130,
      targetY: 55,
      speed: 1.1,
      heading: 315,
      state: 'WALKING_SIDEWALK',
      clothingColor: '#EC4899',
      hairColor: '#78350F',
      hasUmbrella: false,
      stepCycle: 0.4,
      waitingTimeSec: 0,
    },
    {
      id: 'ped-4',
      name: 'David (Jogger)',
      x: 110,
      y: CANVAS_SIZE - 90,
      targetX: CENTER - HALF_ROAD - 14,
      targetY: CENTER + STOP_LINE_DIST - 18,
      speed: 2.1,
      heading: 30,
      state: 'WALKING_SIDEWALK',
      crosswalkDirection: 'EAST',
      clothingColor: '#10B981',
      hairColor: '#1E293B',
      hasUmbrella: false,
      stepCycle: 0.8,
      waitingTimeSec: 0,
    },
    {
      id: 'ped-5',
      name: 'Aiden (Tech Worker)',
      x: CANVAS_SIZE - 70,
      y: CANVAS_SIZE - 120,
      targetX: CENTER + HALF_ROAD + 14,
      targetY: CENTER + STOP_LINE_DIST - 18,
      speed: 1.3,
      heading: 220,
      state: 'WALKING_SIDEWALK',
      crosswalkDirection: 'WEST',
      clothingColor: '#8B5CF6',
      hairColor: '#0F172A',
      hasUmbrella: false,
      stepCycle: 0.2,
      waitingTimeSec: 0,
    },
    {
      id: 'ped-6',
      name: 'Chloe (Barista)',
      x: 130,
      y: 80,
      targetX: 55,
      targetY: 140,
      speed: 1.15,
      heading: 210,
      state: 'WALKING_SIDEWALK',
      clothingColor: '#14B8A6',
      hairColor: '#D97706',
      hasUmbrella: false,
      stepCycle: 0.5,
      waitingTimeSec: 0,
    },
    {
      id: 'ped-7',
      name: 'Lucas (Researcher)',
      x: CENTER + HALF_ROAD + 14,
      y: CENTER + STOP_LINE_DIST - 18,
      targetX: CENTER - HALF_ROAD - 14,
      targetY: CENTER + STOP_LINE_DIST - 18,
      speed: 1.28,
      heading: 270,
      state: 'WAITING_AT_CROSSWALK',
      crosswalkDirection: 'WEST',
      clothingColor: '#6366F1',
      hairColor: '#451A03',
      hasUmbrella: false,
      stepCycle: 0,
      waitingTimeSec: 2.0,
    },
    {
      id: 'ped-8',
      name: 'Olivia (Tourist)',
      x: CANVAS_SIZE - 110,
      y: CANVAS_SIZE - 70,
      targetX: CANVAS_SIZE - 55,
      targetY: CANVAS_SIZE - 140,
      speed: 1.05,
      heading: 45,
      state: 'WALKING_SIDEWALK',
      clothingColor: '#E11D48',
      hairColor: '#FEF08A',
      hasUmbrella: false,
      stepCycle: 0.1,
      waitingTimeSec: 0,
    }
  ];
}

export class IntersectionSimulation {
  private state: SimulationState;
  private idCounter = 1;
  private lastPacketSequence = new Map<string, number>();
  private autoSpawnCooldownSec = 0;
  private collisionAlertListeners: ((alert: CollisionRiskAlert) => void)[] = [];
  private lastAlertTimestampByPair: Map<string, number> = new Map();

  constructor() {
    const densityGrid: DensityCell[] = [];
    for (let r = 0; r < GRID_CELLS; r++) {
      for (let c = 0; c < GRID_CELLS; c++) {
        const wx = (c + 0.5) * CELL_SIZE;
        const wy = (r + 0.5) * CELL_SIZE;
        let zone: DensityCell['zone'] = 'SHOULDER';

        if (Math.abs(wx - CENTER) <= CONFLICT_ZONE_RADIUS && Math.abs(wy - CENTER) <= CONFLICT_ZONE_RADIUS) {
          zone = 'CONFLICT_CENTER';
        } else if (Math.abs(wx - CENTER) <= HALF_ROAD) {
          zone = wy < CENTER ? 'NORTH_APPROACH' : 'SOUTH_APPROACH';
        } else if (Math.abs(wy - CENTER) <= HALF_ROAD) {
          zone = wx < CENTER ? 'WEST_APPROACH' : 'EAST_APPROACH';
        }

        densityGrid.push({
          col: c,
          row: r,
          worldX: wx,
          worldY: wy,
          density: 0,
          dwellCount: 0,
          avgSpeed: 40,
          bottleneckScore: 0,
          zone,
          collisionRisk: 0,
          signalInterference: 0.05,
          interferenceDbm: -92,
          compositeRisk: 0,
        });
      }
    }

    this.state = {
      vehicles: [],
      pedestrians: createInitialPedestrians(),
      trees: createInitialTrees(),
      amenities: createInitialAmenities(),
      packets: [],
      attackLogs: [],
      collisionIncidents: [],
      densityGrid,
      bottleneckZones: [
        {
          id: 'bz-north',
          name: 'North Approach Stop Line',
          bottleneckScore: 18,
          avgSpeedKmh: 36.4,
          severity: 'OPTIMAL',
          recommendation: 'Throughput optimal; CACC spacing active.',
        },
        {
          id: 'bz-conflict',
          name: 'Central Conflict Intersection Box',
          bottleneckScore: 24,
          avgSpeedKmh: 38.2,
          severity: 'OPTIMAL',
          recommendation: 'Virtual slot reservations preventing congestion gridlock.',
        },
        {
          id: 'bz-east',
          name: 'East Cross-Traffic Merging Zone',
          bottleneckScore: 20,
          avgSpeedKmh: 35.8,
          severity: 'OPTIMAL',
          recommendation: 'Direct sidelink DSRC broadcast maintaining flow.',
        },
      ],
      rsuConfig: {
        mode: 'DYNAMIC_SPEED_ARRIVAL',
        arrivalWeight: 0.50,
        speedWeight: 0.35,
        momentumWeight: 0.15,
        decisionCycleHz: 50,
        edgeDecisionLatencyMs: 1.2,
        energySavedKWh: 14.8,
        delayReductionPct: 41.2,
      },
      rsuPriorityQueue: [],
      slots: [],
      trafficLightState: {
        mode: 'TRAFFIC_LIGHTS',
        phase: 'NORTH_GREEN',
        activeDirection: 'NORTH',
        northLight: 'GREEN',
        southLight: 'RED',
        eastLight: 'RED',
        westLight: 'RED',
        nsLight: 'GREEN',
        ewLight: 'RED',
        isAllRedClearance: false,
        clearanceDurationSec: 3.0,
        clearanceTimeRemainingSec: 0,
        phaseTimeRemainingSec: 7.0,
        phaseDurationSec: 7.0,
        emergencyPreemptionActive: false,
        preemptedDirection: null,
        cycleSpeedMultiplier: 1.0,
      },
      trafficLightRSU: {
        id: 'RSU-SPAT-01',
        name: 'Intersection Central SPaT Broadcaster',
        x: CENTER - 85,
        y: CENTER - 85,
        frequencyGhz: 5.895, // DSRC / C-V2X 5.9 GHz Band
        broadcastRangePx: 380, // covers intersection approaches
        totalPacketsBroadcast: 0,
        activeSPaT: {
          messageId: 'SPAT-0001',
          intersectionId: 'INT-SILICON-400',
          timestampMs: 0,
          frequencyGhz: 5.895,
          currentPhase: 'NORTH_GREEN',
          activeDirection: 'NORTH',
          northLight: 'GREEN',
          southLight: 'RED',
          eastLight: 'RED',
          westLight: 'RED',
          nsLight: 'GREEN',
          ewLight: 'RED',
          isAllRedClearance: false,
          clearanceTimeRemainingSec: 0,
          timeRemainingSec: 7.0,
          phaseDurationSec: 7.0,
          emergencyPreemption: false,
          glosaAdvisorySpeedKmh: {
            north: 45,
            south: 0,
            east: 0,
            west: 0,
          },
          txPowerDbm: 23,
          packetCounter: 0,
          signature: 'ECDSA_NIST_P256:RSU-AUTH-VALID',
        },
        connectedVehicleCount: 0,
        glosaActive: true,
        rsuOperationalStatus: 'BROADCASTING_SPAT',
      },
      stats: {
        totalVehiclesPassed: 0,
        nearMissesPrevented: 0,
        tamperedPacketsDropped: 0,
        replaysBlocked: 0,
        avgLatencyMs: 2.3,
        bandwidthKbps: 48.6,
        collisionsAvoidedByAEB: 0,
        collisionsAvoidedBySteer: 0,
        peakDensityIndex: 12,
        totalArbitrationsCompleted: 0,
      },
      simulatedTimeMs: 0,
      activeAttack: 'NONE',
      globalNetworkLatencyMs: 12, // 12ms DSRC/C-V2X channel latency
      collisionMonitoringActive: true,
      activeCollisionWarningCount: 0,
      heatmapOverlayActive: true,
      heatmapMode: 'COLLISION_RISK',
      heatmapOpacity: 0.65,
      heatmapShowContours: true,
      spatialHeatmapStats: {
        peakCollisionRisk: 0,
        peakInterferenceDbm: -92,
        highRiskZoneCount: 0,
        channelCongestionPct: 12,
        mostCongestedZone: 'Central Space-Time Conflict Zone',
      },
      weatherState: { ...WEATHER_PRESETS.CLEAR },
      lifecycleLogs: [],
      recentCollisionAlerts: [],
      spawnerStatus: {
        lastSpawnTimeMs: 0,
        isLoopActive: true,
        totalSpawned: 0,
        stallWarning: false,
        activeFleetCount: 0,
      },
    };

    // Pre-populate with initial vehicles approaching gracefully
    this.spawnVehicle('NORTH', 'STANDARD_AV', 'STRAIGHT', 38);
    this.spawnVehicle('EAST', 'STANDARD_AV', 'STRAIGHT', 42);
    this.spawnVehicle('SOUTH', 'POLICE_PATROL', 'STRAIGHT', 48);
    this.spawnVehicle('WEST', 'STANDARD_AV', 'STRAIGHT', 40);
  }

  public getState(): SimulationState {
    return this.state;
  }

  public logLifecycleEvent(
    v: Vehicle,
    newState: VehicleLifecycleState,
    message: string
  ): void {
    const prevState = v.lifecycleState;
    v.lifecycleState = newState;

    const event: VehicleLifecycleEvent = {
      id: `lc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      vehicleId: v.id,
      vehicleName: v.name,
      vehicleType: v.type,
      direction: v.direction,
      lane: v.lane,
      state: newState,
      previousState: prevState,
      timestampMs: this.state.simulatedTimeMs,
      timeStr: new Date().toLocaleTimeString(),
      speedKmh: Number(v.speed.toFixed(1)),
      distanceToStopLine: Number(v.distanceToStopLine.toFixed(1)),
      message,
    };

    this.state.lifecycleLogs.unshift(event);
    if (this.state.lifecycleLogs.length > 50) {
      this.state.lifecycleLogs.pop();
    }

    console.info(
      `[V2X-Lifecycle] ${v.id} (${v.name} | ${v.type} | ${v.direction} L${v.lane}) [${prevState || 'NONE'} -> ${newState}]: ${message} (spd=${v.speed.toFixed(1)} km/h, dist=${v.distanceToStopLine.toFixed(1)}m)`
    );
  }

  public reinitializeSpawner(): void {
    this.autoSpawnCooldownSec = 0;
    this.state.spawnerStatus.lastSpawnTimeMs = this.state.simulatedTimeMs;
    this.state.spawnerStatus.isLoopActive = true;
    this.state.spawnerStatus.stallWarning = false;
    console.info(`[V2X-Spawner] Spawner loop explicitly re-initialized (fleet size: ${this.state.vehicles.length}/16).`);
  }

  public setTrafficLightMode(mode: TrafficLightControllerState['mode']) {
    this.state.trafficLightState.mode = mode;
    if (mode === 'TRAFFIC_LIGHTS') {
      this.setTrafficLightPhase('NORTH_GREEN');
    } else {
      // In V2X Cooperative Mode, physical lights are in caution standby (never simultaneous green)
      this.state.trafficLightState.northLight = 'YELLOW';
      this.state.trafficLightState.southLight = 'YELLOW';
      this.state.trafficLightState.eastLight = 'YELLOW';
      this.state.trafficLightState.westLight = 'YELLOW';
      this.state.trafficLightState.nsLight = 'YELLOW';
      this.state.trafficLightState.ewLight = 'YELLOW';
      this.state.trafficLightState.activeDirection = null;
      this.state.trafficLightState.isAllRedClearance = false;
      this.state.trafficLightState.phaseTimeRemainingSec = 0;
    }
  }

  public setTrafficLightPhase(phase: TrafficPhase) {
    this.state.trafficLightState.phase = phase;
    this.updateLightsForPhase(phase);
  }

  public forceApproachGreen(direction: Direction) {
    switch (direction) {
      case 'NORTH':
        this.setTrafficLightPhase('NORTH_GREEN');
        break;
      case 'EAST':
        this.setTrafficLightPhase('EAST_GREEN');
        break;
      case 'SOUTH':
        this.setTrafficLightPhase('SOUTH_GREEN');
        break;
      case 'WEST':
        this.setTrafficLightPhase('WEST_GREEN');
        break;
    }
  }

  public triggerAllRedClearance() {
    this.setTrafficLightPhase('CLEARANCE_RED_NORTH');
  }

  public setTrafficCycleMultiplier(multiplier: number) {
    this.state.trafficLightState.cycleSpeedMultiplier = Math.max(0.5, Math.min(3, multiplier));
  }

  private updateLightsForPhase(phase: TrafficPhase) {
    const tl = this.state.trafficLightState;
    tl.phase = phase;

    // Reset all lights to default RED first (MUTCD safety interlocking)
    tl.northLight = 'RED';
    tl.southLight = 'RED';
    tl.eastLight = 'RED';
    tl.westLight = 'RED';
    tl.nsLight = 'RED';
    tl.ewLight = 'RED';
    tl.isAllRedClearance = false;
    tl.clearanceTimeRemainingSec = 0;

    switch (phase) {
      case 'NORTH_GREEN':
        tl.activeDirection = 'NORTH';
        tl.northLight = 'GREEN';
        tl.nsLight = 'GREEN';
        tl.phaseDurationSec = 7.0;
        tl.phaseTimeRemainingSec = 7.0;
        break;
      case 'NORTH_YELLOW':
        tl.activeDirection = 'NORTH';
        tl.northLight = 'YELLOW';
        tl.nsLight = 'YELLOW';
        tl.phaseDurationSec = 3.0;
        tl.phaseTimeRemainingSec = 3.0;
        break;
      case 'CLEARANCE_RED_NORTH':
      case 'CLEARANCE_RED_EAST':
      case 'CLEARANCE_RED_SOUTH':
      case 'CLEARANCE_RED_WEST':
      case 'ALL_RED_1':
      case 'ALL_RED_2':
        // Exactly 3 seconds of All-Red clearance interval before next green!
        tl.activeDirection = null;
        tl.isAllRedClearance = true;
        tl.clearanceDurationSec = 3.0;
        tl.clearanceTimeRemainingSec = 3.0;
        tl.phaseDurationSec = 3.0;
        tl.phaseTimeRemainingSec = 3.0;
        break;
      case 'EAST_GREEN':
        tl.activeDirection = 'EAST';
        tl.eastLight = 'GREEN';
        tl.ewLight = 'GREEN';
        tl.phaseDurationSec = 7.0;
        tl.phaseTimeRemainingSec = 7.0;
        break;
      case 'EAST_YELLOW':
        tl.activeDirection = 'EAST';
        tl.eastLight = 'YELLOW';
        tl.ewLight = 'YELLOW';
        tl.phaseDurationSec = 3.0;
        tl.phaseTimeRemainingSec = 3.0;
        break;
      case 'SOUTH_GREEN':
        tl.activeDirection = 'SOUTH';
        tl.southLight = 'GREEN';
        tl.nsLight = 'GREEN';
        tl.phaseDurationSec = 7.0;
        tl.phaseTimeRemainingSec = 7.0;
        break;
      case 'SOUTH_YELLOW':
        tl.activeDirection = 'SOUTH';
        tl.southLight = 'YELLOW';
        tl.nsLight = 'YELLOW';
        tl.phaseDurationSec = 3.0;
        tl.phaseTimeRemainingSec = 3.0;
        break;
      case 'WEST_GREEN':
        tl.activeDirection = 'WEST';
        tl.westLight = 'GREEN';
        tl.ewLight = 'GREEN';
        tl.phaseDurationSec = 7.0;
        tl.phaseTimeRemainingSec = 7.0;
        break;
      case 'WEST_YELLOW':
        tl.activeDirection = 'WEST';
        tl.westLight = 'YELLOW';
        tl.ewLight = 'YELLOW';
        tl.phaseDurationSec = 3.0;
        tl.phaseTimeRemainingSec = 3.0;
        break;
      case 'NS_GREEN':
        tl.activeDirection = 'NORTH';
        tl.northLight = 'GREEN';
        tl.southLight = 'GREEN';
        tl.nsLight = 'GREEN';
        tl.phaseDurationSec = 7.0;
        tl.phaseTimeRemainingSec = 7.0;
        break;
      case 'NS_YELLOW':
        tl.activeDirection = 'NORTH';
        tl.northLight = 'YELLOW';
        tl.southLight = 'YELLOW';
        tl.nsLight = 'YELLOW';
        tl.phaseDurationSec = 3.0;
        tl.phaseTimeRemainingSec = 3.0;
        break;
      case 'EW_GREEN':
        tl.activeDirection = 'EAST';
        tl.eastLight = 'GREEN';
        tl.westLight = 'GREEN';
        tl.ewLight = 'GREEN';
        tl.phaseDurationSec = 7.0;
        tl.phaseTimeRemainingSec = 7.0;
        break;
      case 'EW_YELLOW':
        tl.activeDirection = 'EAST';
        tl.eastLight = 'YELLOW';
        tl.westLight = 'YELLOW';
        tl.ewLight = 'YELLOW';
        tl.phaseDurationSec = 3.0;
        tl.phaseTimeRemainingSec = 3.0;
        break;
    }
  }

  public setAttackMode(mode: SimulationState['activeAttack']) {
    this.state.activeAttack = mode;
  }

  public setGlobalLatency(ms: number) {
    this.state.globalNetworkLatencyMs = Math.max(1, Math.min(250, ms));
  }

  public toggleCollisionMonitoring() {
    this.state.collisionMonitoringActive = !this.state.collisionMonitoringActive;
  }

  public toggleHeatmapOverlay() {
    this.state.heatmapOverlayActive = !this.state.heatmapOverlayActive;
  }

  public setHeatmapMode(mode: HeatmapMode) {
    this.state.heatmapMode = mode;
  }

  public setHeatmapOpacity(opacity: number) {
    this.state.heatmapOpacity = Math.max(0.1, Math.min(1.0, opacity));
  }

  public toggleHeatmapContours() {
    this.state.heatmapShowContours = !this.state.heatmapShowContours;
  }

  public resetDensityHeatmap() {
    for (const cell of this.state.densityGrid) {
      cell.density = 0;
      cell.dwellCount = 0;
      cell.bottleneckScore = 0;
      cell.avgSpeed = 40;
    }
    this.state.stats.peakDensityIndex = 0;
  }

  public onCollisionAlert(listener: (alert: CollisionRiskAlert) => void): () => void {
    this.collisionAlertListeners.push(listener);
    return () => {
      this.collisionAlertListeners = this.collisionAlertListeners.filter(l => l !== listener);
    };
  }

  public emitCollisionAlert(alert: CollisionRiskAlert) {
    this.state.recentCollisionAlerts.unshift(alert);
    if (this.state.recentCollisionAlerts.length > 25) {
      this.state.recentCollisionAlerts.pop();
    }
    for (const listener of this.collisionAlertListeners) {
      try {
        listener(alert);
      } catch (err) {
        console.error('Error in collision alert listener:', err);
      }
    }
  }

  public setRSUWeights(arrivalWeight: number, speedWeight: number, momentumWeight: number) {
    this.state.rsuConfig.arrivalWeight = Math.max(0.05, Math.min(0.9, arrivalWeight));
    this.state.rsuConfig.speedWeight = Math.max(0.05, Math.min(0.9, speedWeight));
    this.state.rsuConfig.momentumWeight = Math.max(0.05, Math.min(0.9, momentumWeight));
  }

  public setRSUMode(mode: RSUArbiterConfig['mode']) {
    this.state.rsuConfig.mode = mode;
  }

  public setVehiclePriority(vehicleId: string, priority: boolean) {
    const v = this.state.vehicles.find((veh) => veh.id === vehicleId);
    if (v) {
      v.priority = priority;
      v.v2xPrioritySignalActive = priority;
      if (priority) {
        v.priorityTier = 'P0_EMERGENCY';
        v.dynamicPriorityScore = 750;
        v.rsuAdvisoryAction = 'EMERGENCY_PREEMPT';
        v.targetSpeed = Math.max(v.targetSpeed, 55);
      } else {
        v.priorityTier = 'P2_STANDARD';
        v.dynamicPriorityScore = 35;
        v.rsuAdvisoryAction = 'PASS_FULL_SPEED';
      }
    }
  }

  public toggleVehiclePriority(vehicleId: string) {
    const v = this.state.vehicles.find((veh) => veh.id === vehicleId);
    if (v) {
      this.setVehiclePriority(vehicleId, !v.priority);
    }
  }

  public setVehiclePersonality(vehicleId: string, personality: DriverPersonality) {
    const v = this.state.vehicles.find((veh) => veh.id === vehicleId);
    if (v) {
      v.driverPersonality = personality;
    }
  }

  public setWeather(condition: WeatherCondition) {
    const preset = WEATHER_PRESETS[condition] || WEATHER_PRESETS.CLEAR;
    this.state.weatherState = { ...preset };

    // Update active fleet equipment and kinematics to match weather
    for (const v of this.state.vehicles) {
      v.wipersActive = condition === 'RAIN' || condition === 'SNOW_ICE';
      v.fogLightsActive = condition === 'DENSE_FOG';
      
      // Adapt cruising speed ceiling
      if (!v.priority && v.targetSpeed > preset.recommendedSpeedKmh) {
        v.targetSpeed = preset.recommendedSpeedKmh;
      }

      // Update V2X weather telemetry frame
      const currentSpeed = Math.max(10, v.speed);
      v.weatherTelemetry = {
        surfaceFrictionMu: preset.frictionCoefficient,
        brakingDistanceMeters: Number(((currentSpeed * currentSpeed) / (250 * preset.frictionCoefficient)).toFixed(1)),
        safeFollowingDistanceMeters: Number((preset.followingDistanceGapPx / 3.5).toFixed(1)),
        opticalVisibilityMeters: preset.visibilityMeters,
        tractionControlActive: condition === 'SNOW_ICE' || condition === 'RAIN',
        v2xPenetrationAdvantage: preset.v2xPenetrationAdvantage,
      };
    }
  }

  public setPrecipitationIntensity(intensity: number) {
    this.state.weatherState.precipitationIntensity = Math.max(0, Math.min(1.0, intensity));
  }

  public spawnVehicle(
    direction: Direction,
    type: VehicleType = 'STANDARD_AV',
    turnIntent: TurnIntent = 'STRAIGHT',
    initialSpeedKmh = 40,
    personality?: DriverPersonality,
    preferredLane?: number
  ): Vehicle {
    const id = `veh-${this.idCounter++}`;
    const isEmergency = type === 'EMERGENCY_AMBULANCE' || type === 'POLICE_PATROL' || type === 'FIRE_ENGINE';
    const weather = this.state.weatherState;
    const cappedInitialSpeed = isEmergency ? initialSpeedKmh : Math.min(initialSpeedKmh, weather.recommendedSpeedKmh);
    
    let name = `AutoCab-${this.idCounter}`;
    if (type === 'POLICE_PATROL') name = `Police-Unit-${this.idCounter}`;
    else if (type === 'EMERGENCY_AMBULANCE') name = `Ambulance-Alpha${this.idCounter}`;
    else if (type === 'FIRE_ENGINE') name = `FireRescue-${this.idCounter}`;
    else if (type === 'HEAVY_TRUCK') name = `Freight-Hauler${this.idCounter}`;

    // Dual-lane selection:
    // Emergency vehicles prefer Lane 0 (inner express & emergency corridor)
    // Civilian vehicles take whichever lane has more upstream clearance!
    let lane = 0;
    if (isEmergency) {
      lane = 0;
    } else if (typeof preferredLane === 'number') {
      lane = preferredLane;
    } else {
      const lane0Count = this.state.vehicles.filter((veh) => veh.direction === direction && (veh.lane === 0 || veh.targetLane === 0) && !veh.crossedIntersection).length;
      const lane1Count = this.state.vehicles.filter((veh) => veh.direction === direction && (veh.lane === 1 || veh.targetLane === 1) && !veh.crossedIntersection).length;
      lane = lane0Count <= lane1Count ? 0 : 1;
    }

    const laneOffset = lane === 0 ? LANE_INNER_OFFSET : LANE_OUTER_OFFSET;

    // Calculate safe upstream spawn position without overlapping existing vehicles
    const dims = getVehicleDimensions(type);
    const existingInCorridor = this.state.vehicles.filter(
      (veh) => veh.direction === direction && (veh.lane === lane || veh.targetLane === lane) && !veh.crossedIntersection
    );

    // Baseline spawn offset from intersection center: 380px (~30px outside 350px half-canvas)
    let spawnDistFromCenter = 380;
    for (const other of existingInCorridor) {
      let otherDist = 0;
      switch (direction) {
        case 'NORTH':
          otherDist = (CENTER - STOP_LINE_DIST) - other.y;
          break;
        case 'SOUTH':
          otherDist = other.y - (CENTER + STOP_LINE_DIST);
          break;
        case 'WEST':
          otherDist = (CENTER - STOP_LINE_DIST) - other.x;
          break;
        case 'EAST':
          otherDist = other.x - (CENTER + STOP_LINE_DIST);
          break;
      }
      const otherDistFromCenter = otherDist + STOP_LINE_DIST;
      if (otherDistFromCenter >= (spawnDistFromCenter - 55)) {
        spawnDistFromCenter = Math.max(spawnDistFromCenter, otherDistFromCenter + dims.length + 24);
      }
    }

    let x = 0;
    let y = 0;
    let heading = 0;

    switch (direction) {
      case 'NORTH':
        x = CENTER - laneOffset;
        y = CENTER - spawnDistFromCenter;
        heading = 180;
        break;
      case 'SOUTH':
        x = CENTER + laneOffset;
        y = CENTER + spawnDistFromCenter;
        heading = 0;
        break;
      case 'WEST':
        x = CENTER - spawnDistFromCenter;
        y = CENTER + laneOffset;
        heading = 90;
        break;
      case 'EAST':
        x = CENTER + spawnDistFromCenter;
        y = CENTER - laneOffset;
        heading = 270;
        break;
    }

    let color = '#0284C7';
    if (type === 'POLICE_PATROL') color = '#0F172A';
    else if (type === 'EMERGENCY_AMBULANCE') color = '#F8FAFC';
    else if (type === 'FIRE_ENGINE') color = '#DC2626';
    else if (type === 'HEAVY_TRUCK') color = '#D97706';
    else {
      const palette = ['#0284C7', '#2563EB', '#059669', '#7C3AED', '#DB2777', '#475569', '#0D9488'];
      color = palette[Math.floor(Math.random() * palette.length)];
    }

    let driverPersonality: DriverPersonality = personality || 'AUTONOMOUS_V2X';
    if (!personality && !isEmergency && type !== 'HEAVY_TRUCK') {
      const rand = Math.random();
      if (rand < 0.45) {
        driverPersonality = 'HUMAN_AGGRESSIVE'; // Speeds up on yellow light!
      } else if (rand < 0.75) {
        driverPersonality = 'CAUTIOUS_HUMAN'; // Slows down cautiously on yellow
      } else {
        driverPersonality = 'AUTONOMOUS_V2X';
      }
    }

    const physicsSpecs = getVehiclePhysicsSpecs(type);
    const massKg = physicsSpecs.massKg;
    const speedMs = (initialSpeedKmh * 1000) / 3600;
    const kineticEnergy = Math.round(0.5 * massKg * speedMs * speedMs);
    const distToStop = Math.max(0, spawnDistFromCenter - STOP_LINE_DIST);

    const vehicle: Vehicle = {
      id,
      name,
      type,
      priority: isEmergency,
      v2xPrioritySignalActive: isEmergency,
      prioritySignalReceivedFrom: null,
      direction,
      lane,
      targetLane: lane,
      laneChangeProgress: 0,
      overtaking: false,
      turnIntent,
      x,
      y,
      speed: cappedInitialSpeed,
      targetSpeed: cappedInitialSpeed,
      acceleration: 0,
      braking: false,
      brakeForce: 0,
      heading,
      color,
      distanceToStopLine: distToStop,
      timeToIntersection: distToStop / Math.max(1, (cappedInitialSpeed * 1000) / 3600),
      hasSlotReserved: false,
      inConflictZone: false,
      crossedIntersection: false,
      enteredOnGreen: false,
      // Lifecycle Tracking & Watchdog
      lifecycleState: 'SPAWNED',
      timeStalledSec: 0,
      // Human & Traffic Light Behavior State
      driverPersonality,
      beatingYellow: false,
      yieldingToEmergency: false,
      yieldingToRedEmergency: false,
      emergencyDetectedId: null,
      emergencyDetectedDistance: null,
      hazardLights: false,
      headlights: true,
      turnSignal: 'NONE',
      wipersActive: weather.condition === 'RAIN' || weather.condition === 'SNOW_ICE',
      fogLightsActive: weather.condition === 'DENSE_FOG',
      // Realistic Kinematic Bicycle & IDM+ Dynamics
      massKg,
      wheelbaseM: physicsSpecs.wheelbaseM,
      steerAngleDeg: 0,
      pitchAngleDeg: 0,
      rollAngleDeg: 0,
      longitudinalAccelMs2: 0,
      lateralAccelMs2: 0,
      absActive: false,
      espActive: false,
      enginePowerKw: physicsSpecs.enginePowerKw,
      dragForceN: 0,
      weatherTelemetry: {
        surfaceFrictionMu: weather.frictionCoefficient,
        brakingDistanceMeters: Number(((cappedInitialSpeed * cappedInitialSpeed) / (250 * weather.frictionCoefficient)).toFixed(1)),
        safeFollowingDistanceMeters: Number((weather.followingDistanceGapPx / 3.5).toFixed(1)),
        opticalVisibilityMeters: weather.visibilityMeters,
        tractionControlActive: weather.condition === 'SNOW_ICE' || weather.condition === 'RAIN',
        v2xPenetrationAdvantage: weather.v2xPenetrationAdvantage,
      },
      // V2I / Traffic Light RSU Signal Reception
      v2iSignalReceived: null,
      v2iReaction: 'NONE',
      // Collision Detection & Avoidance State
      collisionAlert: false,
      activeManeuver: 'NONE',
      maneuverIntensity: 0,
      evasiveLateralOffset: 0,
      predictedTimeToCollision: null,
      conflictingVehicleId: null,
      latencyCompensatedTtc: null,
      simulatedMessageLatencyMs: Number((1.8 + Math.random() * 1.4).toFixed(2)),
      deadReckoningOffset: { dx: 0, dy: 0 },
      // RSU Dynamic Priority & Arbitration State
      dynamicPriorityScore: isEmergency ? 650 : 35,
      priorityTier: isEmergency ? 'P0_EMERGENCY' : 'P2_STANDARD',
      rsuAdvisoryAction: isEmergency ? 'EMERGENCY_PREEMPT' : 'PASS_FULL_SPEED',
      rsuAllocatedEntryMs: null,
      kineticEnergyJoules: kineticEnergy,
      // Security parameters
      pseudonymCertId: `CERT-OBU-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      publicKeyFingerprint: `EC-${Math.random().toString(16).substring(2, 10)}`,
      packetSequenceNumber: 1,
      tampered: false,
      rogue: false,
      spoofedGps: false,
      replayActive: false,
      dockerContainerId: `dock-${id.slice(4)}`,
      containerIp: `172.28.0.${(this.idCounter % 250) + 2}`,
      cpuUsage: Math.floor(12 + Math.random() * 18),
      memoryMb: Math.floor(140 + Math.random() * 45),
      networkLatencyMs: Number((1.8 + Math.random() * 1.4).toFixed(2)),
    };

    // Initialize cryptographic keys asynchronously
    V2XCryptoEngine.initVehicleKeys(id);

    this.state.vehicles.push(vehicle);
    this.state.spawnerStatus.lastSpawnTimeMs = this.state.simulatedTimeMs;
    this.state.spawnerStatus.totalSpawned++;
    this.state.spawnerStatus.activeFleetCount = this.state.vehicles.length;

    this.logLifecycleEvent(
      vehicle,
      'SPAWNED',
      `Spawned on ${direction} approach (Lane ${lane}) cruising at ${cappedInitialSpeed} km/h`
    );

    return vehicle;
  }

  public step(dtSeconds: number) {
    this.state.simulatedTimeMs += dtSeconds * 1000;
    const { vehicles, slots, trafficLightState } = this.state;

    // 1. Advance Traffic Light Controller state & check for emergency vehicle preemption
    this.updateTrafficLightState(dtSeconds);

    // 2. Update distance to stop line (measured to front bumper) & conflict detection
    for (const v of vehicles) {
      const dims = getVehicleDimensions(v.type);
      let dist = 0;
      switch (v.direction) {
        case 'NORTH':
          // Approaching from top, moving south (+y)
          dist = (CENTER - STOP_LINE_DIST) - (v.y + dims.halfLength);
          break;
        case 'SOUTH':
          // Approaching from bottom, moving north (-y)
          dist = (v.y - dims.halfLength) - (CENTER + STOP_LINE_DIST);
          break;
        case 'WEST':
          // Approaching from left, moving east (+x)
          dist = (CENTER - STOP_LINE_DIST) - (v.x + dims.halfLength);
          break;
        case 'EAST':
          // Approaching from right, moving west (-x)
          dist = (v.x - dims.halfLength) - (CENTER + STOP_LINE_DIST);
          break;
      }
      v.distanceToStopLine = Math.max(-250, dist);

      // Check legitimate intersection entry
      const vLight = (v.direction === 'NORTH') ? trafficLightState.northLight
        : (v.direction === 'SOUTH') ? trafficLightState.southLight
        : (v.direction === 'EAST') ? trafficLightState.eastLight
        : trafficLightState.westLight;
      const isSelfEmergency = v.priority || v.type === 'POLICE_PATROL' || v.type === 'EMERGENCY_AMBULANCE' || v.type === 'FIRE_ENGINE';
      const isCoop = trafficLightState.mode === 'V2X_COOPERATIVE_ONLY';

      if (v.distanceToStopLine <= 0 && !v.enteredOnGreen) {
        if (isCoop || isSelfEmergency || vLight === 'GREEN' || (vLight === 'YELLOW' && v.beatingYellow)) {
          v.enteredOnGreen = true;
        }
      }

      // In conflict zone? (Bounded by intersection box plus safety margin)
      const inBox = Math.abs(v.x - CENTER) <= (HALF_ROAD + 6) && Math.abs(v.y - CENTER) <= (HALF_ROAD + 6);
      v.inConflictZone = inBox;

      // Has crossed the entire intersection?
      if (dist < -(ROAD_WIDTH + dims.length + 15)) {
        v.crossedIntersection = true;
        // Keep enteredOnGreen true so departing vehicle doesn't get flagged for red light
        v.enteredOnGreen = true;
      }

      // Time to intersection calculation (TTI)
      const speedMs = Math.max(0.1, (v.speed * 1000) / 3600);
      v.timeToIntersection = v.distanceToStopLine > 0 ? v.distanceToStopLine / speedMs : 0;

      // 2b. Track Vehicle Lifecycle Transitions
      let targetLifecycle: VehicleLifecycleState = v.lifecycleState;
      let transitionMsg = '';

      if (v.crossedIntersection) {
        targetLifecycle = 'DEPARTING';
        transitionMsg = `Departing intersection in direction ${v.direction}`;
      } else if (v.inConflictZone) {
        targetLifecycle = 'CROSSING';
        transitionMsg = `Traversing central conflict zone at ${v.speed.toFixed(1)} km/h`;
      } else if (v.distanceToStopLine <= 0 && v.distanceToStopLine > -35) {
        targetLifecycle = 'ENTERING_INTERSECTION';
        transitionMsg = `Crossing stop bar into intersection at ${v.speed.toFixed(1)} km/h`;
      } else if (v.yieldingToEmergency || v.activeManeuver === 'PULL_OVER_EMERGENCY') {
        targetLifecycle = 'PULLING_OVER';
        transitionMsg = `Pulling over towards curb for emergency priority vehicle`;
      } else if (v.v2iReaction === 'WAITING_FOR_BOX_CLEARANCE') {
        targetLifecycle = 'HOLDING_BOX';
        transitionMsg = `Holding before stop bar until cross-traffic clears the box`;
      } else if (v.v2iReaction === 'STOPPED_AT_RED' || (v.distanceToStopLine <= 10 && v.distanceToStopLine > 0 && v.speed < 1.0)) {
        targetLifecycle = 'QUEUED_RED';
        transitionMsg = `Queued at stop bar for red signal or traffic headway`;
      } else if (v.distanceToStopLine > 0 && v.lifecycleState === 'SPAWNED') {
        targetLifecycle = 'APPROACHING';
        transitionMsg = `Cruising along approach corridor towards intersection`;
      }

      if (targetLifecycle !== v.lifecycleState) {
        this.logLifecycleEvent(v, targetLifecycle, transitionMsg);
      }

      // Track stall duration for any vehicle not legitimately waiting at a red stop bar
      const isRedWaiting = (trafficLightState.mode === 'TRAFFIC_LIGHTS') && 
        v.v2iReaction === 'STOPPED_AT_RED' && v.distanceToStopLine > 0 && v.distanceToStopLine <= 14 && !v.priority;

      if (!isRedWaiting && v.speed < 1.2) {
        v.timeStalledSec = (v.timeStalledSec || 0) + dtSeconds;
      } else {
        v.timeStalledSec = Math.max(0, (v.timeStalledSec || 0) - dtSeconds * 1.5);
      }
    }

    // 2c. Anti-Deadlock Conflict Box & Corridor Stall Watchdog: Force-clear any vehicle stuck for > 1.8s
    for (const v of vehicles) {
      if ((v.timeStalledSec || 0) > 1.8) {
        // Check if there is an actual vehicle directly ahead in the same lane
        const dimsV = getVehicleDimensions(v.type);
        const hasCarDirectlyAhead = vehicles.some((other) => {
          if (other.id === v.id) return false;
          if (other.direction !== v.direction || other.lane !== v.lane) return false;
          const distAlong = (v.direction === 'NORTH') ? (other.y - v.y)
            : (v.direction === 'SOUTH') ? (v.y - other.y)
            : (v.direction === 'WEST') ? (other.x - v.x)
            : (v.x - other.x);
          return distAlong > 0 && distAlong < (dimsV.length + 18);
        });

        if (!hasCarDirectlyAhead) {
          v.targetSpeed = Math.max(v.targetSpeed, 40);
          v.speed = Math.max(v.speed, 20);
          v.braking = false;
          v.brakeForce = 0;
          v.activeManeuver = 'NONE';
          v.collisionAlert = false;
          v.yieldingToEmergency = false;
          v.yieldingToRedEmergency = false;
          v.v2iReaction = 'NONE';
          v.timeStalledSec = 0;
          this.logLifecycleEvent(
            v,
            'DEADLOCK_RECOVERED',
            `Anti-deadlock watchdog pulse: accelerating to ${v.targetSpeed} km/h`
          );
        }
      }
    }

    // 3. High-Priority V2X Signal Broadcast & Direct Override of Nearby Vehicles
    const priorityVehicles = vehicles.filter(
      (v) => (v.priority || v.type === 'POLICE_PATROL' || v.type === 'EMERGENCY_AMBULANCE' || v.type === 'FIRE_ENGINE') &&
             v.distanceToStopLine > -50 && !v.crossedIntersection
    );

    // Each priority vehicle continuously broadcasts a high-priority V2X preemptive signal
    for (const pv of priorityVehicles) {
      pv.priority = true;
      pv.v2xPrioritySignalActive = true;
    }

    for (const v of vehicles) {
      const isSelfPriority = v.priority || v.type === 'POLICE_PATROL' || v.type === 'EMERGENCY_AMBULANCE' || v.type === 'FIRE_ENGINE';
      if (isSelfPriority) {
        // High-priority vehicle always has priority right of way
        v.priority = true;
        v.v2xPrioritySignalActive = true;
        v.yieldingToEmergency = false;
        v.prioritySignalReceivedFrom = null;
        v.beatingYellow = false;
        v.targetSpeed = Math.max(v.targetSpeed, 58);
        v.braking = false;
        v.brakeForce = 0;
        continue;
      }

      // If vehicle is ALREADY in the intersection conflict box, expedite clearing — NEVER pull over or brake inside the intersection!
      if (v.inConflictZone || v.distanceToStopLine <= 0) {
        v.yieldingToEmergency = false;
        v.prioritySignalReceivedFrom = null;
        if (v.activeManeuver === 'PULL_OVER_EMERGENCY') {
          v.activeManeuver = 'NONE';
          v.turnSignal = 'NONE';
        }
        v.targetSpeed = Math.max(v.targetSpeed, 40);
        v.braking = false;
        v.brakeForce = 0;
        continue;
      }

      // Check for incoming high-priority V2X signal within direct DSRC/C-V2X sidelink range (~280px / 80m)
      let receivingPrioritySignalFrom: Vehicle | null = null;
      let isAheadInSameCorridor = false;

      for (const pv of priorityVehicles) {
        const distToPv = Math.hypot(v.x - pv.x, v.y - pv.y);
        if (distToPv <= 280) {
          if (pv.direction === v.direction) {
            // Priority vehicle approaching from behind in same travel corridor:
            if (v.distanceToStopLine < pv.distanceToStopLine && (pv.distanceToStopLine - v.distanceToStopLine) < 280) {
              receivingPrioritySignalFrom = pv;
              isAheadInSameCorridor = true;
              break;
            }
          } else {
            // Perpendicular crossing corridor (opposing traffic on 4-lane median does not block cross corridor)
            const isPerpendicular = (
              (v.direction === 'NORTH' || v.direction === 'SOUTH') !==
              (pv.direction === 'NORTH' || pv.direction === 'SOUTH')
            );
            if (isPerpendicular && v.distanceToStopLine > 0 && v.distanceToStopLine < 180) {
              receivingPrioritySignalFrom = pv;
              break;
            }
          }
        }
      }

      if (receivingPrioritySignalFrom) {
        // High-Priority V2X Signal Received! Immediate Logic Override:
        v.prioritySignalReceivedFrom = receivingPrioritySignalFrom.id;
        v.yieldingToEmergency = true;
        v.hazardLights = true;

        if (isAheadInSameCorridor) {
          // Move to Outer Lane (Lane 1) and pull over towards outer curb shoulder, clearing Lane 0 for emergency vehicle
          v.activeManeuver = 'PULL_OVER_EMERGENCY';
          v.targetLane = 1;
          v.turnSignal = 'RIGHT';
          v.evasiveLateralOffset = Math.min(10, v.evasiveLateralOffset + dtSeconds * 20); // pull onto curb shoulder
          v.braking = true;

          // Check if corridor has red signal: MUST NOT blow through red light on shoulder
          const corrLight = (v.direction === 'NORTH') ? trafficLightState.northLight
            : (v.direction === 'SOUTH') ? trafficLightState.southLight
            : (v.direction === 'EAST') ? trafficLightState.eastLight
            : trafficLightState.westLight;
          const isRed = trafficLightState.mode === 'TRAFFIC_LIGHTS' && (corrLight === 'RED' || trafficLightState.isAllRedClearance) && !v.enteredOnGreen;

          if (isRed && v.distanceToStopLine <= 6) {
            v.targetSpeed = 0;
            v.speed = 0;
            v.brakeForce = 100;
          } else if (isRed && v.distanceToStopLine > 6 && v.distanceToStopLine < 80) {
            const distRatio = Math.max(0, (v.distanceToStopLine - 4) / 76);
            v.targetSpeed = Math.min(12, 12 * Math.sqrt(distRatio));
            v.brakeForce = 85;
          } else {
            v.brakeForce = 60;
            v.targetSpeed = 12; // Controlled crawl on outer shoulder
          }
        } else {
          // Perpendicular vehicle: Immediate emergency braking before entering intersection
          v.activeManeuver = 'EMERGENCY_BRAKE';
          v.braking = true;
          v.brakeForce = 100;
          v.targetSpeed = 0;
        }
      } else {
        // Priority signal cleared: recover back to regular cruising
        if (v.prioritySignalReceivedFrom || v.yieldingToEmergency) {
          v.prioritySignalReceivedFrom = null;
          v.yieldingToEmergency = false;
          v.hazardLights = false;
          if (v.activeManeuver === 'PULL_OVER_EMERGENCY') {
            v.activeManeuver = 'NONE';
            v.turnSignal = 'NONE';
          }
        }
      }
    }

    // 3b. Emergency Vehicles Coming from RED Signal & Green-Light Cars Yielding / Sightline Logic
    // If an emergency car is coming from a red signal (or approaching intersection on red),
    // and it is visible to green light cars, the green light cars STOP and WAIT for that car to go so they avoid crashes!
    for (const v of vehicles) {
      const isSelfEmergency = v.priority || v.type === 'POLICE_PATROL' || v.type === 'EMERGENCY_AMBULANCE' || v.type === 'FIRE_ENGINE';
      if (isSelfEmergency || v.crossedIntersection) {
        v.yieldingToRedEmergency = false;
        v.emergencyDetectedId = null;
        v.emergencyDetectedDistance = null;
        continue;
      }

      // Determine what light this vehicle has:
      const vLight = (v.direction === 'NORTH') ? trafficLightState.northLight
        : (v.direction === 'SOUTH') ? trafficLightState.southLight
        : (v.direction === 'EAST') ? trafficLightState.eastLight
        : trafficLightState.westLight;

      // Only green light cars approaching before the stop line yield to emergency vehicles entering on red
      const hasGreenSignal = vLight === 'GREEN' || trafficLightState.mode === 'V2X_COOPERATIVE_ONLY';

      if (hasGreenSignal && v.distanceToStopLine > 2) {
        // Look for any emergency vehicle approaching from a RED approach or moving through the intersection
        let detectedEm: Vehicle | null = null;
        let minSightDistance = Infinity;

        for (const em of priorityVehicles) {
          if (em.id === v.id || em.crossedIntersection) continue;
          if (em.distanceToStopLine < -(ROAD_WIDTH + 20)) continue; // already cleared intersection

          const emLight = (em.direction === 'NORTH') ? trafficLightState.northLight
            : (em.direction === 'SOUTH') ? trafficLightState.southLight
            : (em.direction === 'EAST') ? trafficLightState.eastLight
            : trafficLightState.westLight;

          const isEmOnRed = emLight === 'RED' || emLight === 'YELLOW' || em.inConflictZone || em.direction !== v.direction;

          if (isEmOnRed && em.distanceToStopLine > -45) {
            // Check direct line-of-sight / visibility distance between the green car and the emergency car
            const distPx = Math.hypot(v.x - em.x, v.y - em.y);
            // Visibility range: in the intersection quadrant, line-of-sight is unobstructed within 360px
            // and V2X wireless beacon guarantees non-line-of-sight detection
            if (distPx <= 380) {
              if (distPx < minSightDistance) {
                minSightDistance = distPx;
                detectedEm = em;
              }
            }
          }
        }

        if (detectedEm) {
          // Green light car sees emergency car coming from red signal: STOP AND WAIT BEFORE STOP BAR!
          v.yieldingToRedEmergency = true;
          v.emergencyDetectedId = detectedEm.id;
          v.emergencyDetectedDistance = Math.round(minSightDistance);
          v.braking = true;
          v.brakeForce = 100;
          v.targetSpeed = 0;
          v.v2iReaction = 'WAITING_FOR_EMERGENCY_CROSSING';
          v.activeManeuver = 'EMERGENCY_BRAKE';
          v.maneuverIntensity = 100;

          // Stop cleanly before or at the stop line
          if (v.distanceToStopLine <= 8 && v.distanceToStopLine >= 0) {
            v.speed = 0;
          }
        } else {
          v.yieldingToRedEmergency = false;
          v.emergencyDetectedId = null;
          v.emergencyDetectedDistance = null;
          if (v.v2iReaction === 'WAITING_FOR_EMERGENCY_CROSSING') {
            v.v2iReaction = 'GLOSA_CRUISE_GREEN';
            v.targetSpeed = this.state.weatherState.recommendedSpeedKmh;
            v.braking = false;
            v.brakeForce = 0;
          }
        }
      } else {
        v.yieldingToRedEmergency = false;
        v.emergencyDetectedId = null;
        v.emergencyDetectedDistance = null;
      }
    }

    // 4. Traffic Light RSU Broadcast & Vehicle AI Signal Reaction
    this.updateTrafficLightRSUBroadcast(dtSeconds);

    // 5. Preceding vehicle queuing, dynamic dual-lane overtaking, and gap regulation (Prioritizes Vehicle Spacing via IDM+)
    const weather = this.state.weatherState;
    const safeFollowingGapPx = weather.followingDistanceGapPx;

    for (const v of vehicles) {
      if (v.crossedIntersection && (v.y > CANVAS_SIZE + 40 || v.y < -40 || v.x > CANVAS_SIZE + 40 || v.x < -40)) continue;
      const dimsV = getVehicleDimensions(v.type);
      const physicsV = getVehiclePhysicsSpecs(v.type);

      // Smooth continuous realistic lane change transition
      if (v.lane !== v.targetLane) {
        // If approaching within 80px of stop bar or already in conflict zone, settle lane immediately to avoid diagonal crosswalk intrusion
        if (v.distanceToStopLine <= 80 || v.inConflictZone) {
          v.targetLane = v.lane;
          v.laneChangeProgress = 0;
          v.turnSignal = 'NONE';
          v.overtaking = false;
        } else {
          v.laneChangeProgress = Math.min(1.0, v.laneChangeProgress + dtSeconds * 1.3);
          if (v.laneChangeProgress >= 1.0) {
            v.lane = v.targetLane;
            v.laneChangeProgress = 0;
            v.turnSignal = 'NONE';
            v.overtaking = false;
          }
        }
      }

      // If vehicle is actively holding/waiting for a red-light emergency vehicle, enforce stop!
      if (v.yieldingToRedEmergency) {
        v.targetSpeed = 0;
        v.braking = true;
        v.brakeForce = 100;
        continue;
      }

      // Find vehicles ahead in active lane (or target lane during transition)
      const currentActiveLane = (v.lane !== v.targetLane && v.laneChangeProgress > 0.45) ? v.targetLane : v.lane;
      const sameLaneVehicles = vehicles.filter(
        (other) =>
          other.id !== v.id &&
          other.direction === v.direction &&
          (other.lane === currentActiveLane || (other.targetLane === currentActiveLane && other.laneChangeProgress > 0.35)) &&
          other.distanceToStopLine < v.distanceToStopLine
      );
      sameLaneVehicles.sort((a, b) => b.distanceToStopLine - a.distanceToStopLine);
      const leadVehicle = sameLaneVehicles[0];

      if (leadVehicle) {
        const dimsLead = getVehicleDimensions(leadVehicle.type);
        // True physical bumper-to-bumper gap (actual asphalt between front of v and rear of leadVehicle)
        const centerDistance = v.distanceToStopLine - leadVehicle.distanceToStopLine;
        const physicalBumperGap = Math.max(0, centerDistance - (dimsV.halfLength + dimsLead.halfLength));

        // If this is an emergency vehicle and leadVehicle is yielding/moving to Lane 1, pass cleanly!
        const isSelfEmergency = v.priority || v.type === 'POLICE_PATROL' || v.type === 'EMERGENCY_AMBULANCE' || v.type === 'FIRE_ENGINE';
        if (isSelfEmergency && (leadVehicle.yieldingToEmergency || leadVehicle.targetLane === 1)) {
          v.braking = false;
          v.brakeForce = 0;
          v.targetSpeed = Math.max(v.targetSpeed, 58);
          continue;
        }

        const isLeadSlowOrStopped = leadVehicle.speed < (v.targetSpeed * 0.75) || leadVehicle.braking;

        // Overtaking check: Can we switch to the adjacent lane and pass?
        const otherLane = v.lane === 0 ? 1 : 0;
        const emergencyApproaching = priorityVehicles.some((pv) => pv.direction === v.direction);
        const canUseOtherLane = (otherLane === 1 || !emergencyApproaching) && !v.yieldingToEmergency && !v.inConflictZone;

        // Ensure target lane is clear upstream and downstream
        const otherLaneBlocked = vehicles.some(
          (other) =>
            other.id !== v.id &&
            other.direction === v.direction &&
            (other.lane === otherLane || other.targetLane === otherLane) &&
            Math.abs(other.distanceToStopLine - v.distanceToStopLine) < 64
        );

        if (
          !v.yieldingToEmergency &&
          isLeadSlowOrStopped &&
          canUseOtherLane &&
          !otherLaneBlocked &&
          physicalBumperGap < (safeFollowingGapPx * 1.25) &&
          physicalBumperGap > 25 &&
          v.distanceToStopLine > 120 &&
          !v.inConflictZone &&
          v.lane === v.targetLane
        ) {
          // INITIATE DUAL-LANE OVERTAKE!
          v.targetLane = otherLane;
          v.laneChangeProgress = 0;
          v.overtaking = true;
          v.turnSignal = otherLane === 0 ? 'LEFT' : 'RIGHT';
          v.targetSpeed = Math.min(weather.recommendedSpeedKmh + 6, v.targetSpeed + 4);
        } else {
          // Intelligent Driver Model Plus (IDM+) car-following with strict physical bumper spacing
          v.overtaking = false;
          // Minimum resting cushion between bumpers: at least 18px of clear asphalt
          const minRestingBumperGap = 18 * Math.sqrt(weather.brakingDistanceMultiplier);
          const timeHeadwaySec = 1.25 * Math.sqrt(weather.brakingDistanceMultiplier);
          const vMs = (v.speed * 1000) / 3600;
          const leadMs = (leadVehicle.speed * 1000) / 3600;
          const deltaVMs = vMs - leadMs;
          const aMax = physicsV.maxAccelMs2 * Math.min(1.0, weather.frictionCoefficient / 0.85);
          const bComf = physicsV.comfDecelMs2;

          // IDM+ Desired dynamic gap equation:
          const dynamicHeadwayGap = minRestingBumperGap + Math.max(
            0,
            (vMs * 3.5 * timeHeadwaySec) + (vMs * 3.5 * deltaVMs) / (2 * Math.sqrt(Math.max(0.5, aMax * bComf)))
          );

          if (physicalBumperGap <= minRestingBumperGap) {
            // Reached minimum queue bumper distance: cleanly halt or speed-match
            if (leadVehicle.speed <= 1.0) {
              v.targetSpeed = 0;
              v.brakeForce = 100;
              v.braking = true;
            } else {
              v.targetSpeed = Math.max(0, leadVehicle.speed * 0.85);
              v.brakeForce = 85;
              v.braking = true;
            }
          } else if (physicalBumperGap < dynamicHeadwayGap) {
            // Smooth IDM+ deceleration
            const headwayRatio = (physicalBumperGap - minRestingBumperGap) / Math.max(1, dynamicHeadwayGap - minRestingBumperGap);
            const headwayProgress = Math.max(0, Math.min(1.0, headwayRatio));
            const leadSpeedWeighted = leadVehicle.speed * 0.95;
            const followSpeed = leadSpeedWeighted + (weather.recommendedSpeedKmh - leadSpeedWeighted) * (headwayProgress * headwayProgress);
            v.targetSpeed = Math.min(v.targetSpeed, Math.max(0, followSpeed));
            v.brakeForce = Math.min(90, Math.max(25, (1 - headwayProgress) * 80));
            v.braking = v.speed > v.targetSpeed;
          } else {
            // Clear headway ahead in lane: cruise smoothly
            const isRestricted = v.yieldingToEmergency ||
              v.v2iReaction === 'STOPPED_AT_RED' ||
              v.v2iReaction === 'DECELERATING_FOR_RED' ||
              v.v2iReaction === 'SLOWING_YELLOW' ||
              v.v2iReaction === 'WAITING_FOR_BOX_CLEARANCE' ||
              v.v2iReaction === 'WAITING_FOR_EMERGENCY_CROSSING' ||
              v.activeManeuver === 'EMERGENCY_BRAKE';

            if (!isRestricted) {
              v.braking = false;
              v.brakeForce = 0;
              v.targetSpeed = weather.recommendedSpeedKmh;
            }
          }
        }
      } else {
        // No lead vehicle in this lane: clear to cruise at full speed
        const isRestricted = v.yieldingToEmergency ||
          v.v2iReaction === 'STOPPED_AT_RED' ||
          v.v2iReaction === 'DECELERATING_FOR_RED' ||
          v.v2iReaction === 'SLOWING_YELLOW' ||
          v.v2iReaction === 'WAITING_FOR_BOX_CLEARANCE' ||
          v.v2iReaction === 'WAITING_FOR_EMERGENCY_CROSSING' ||
          v.activeManeuver === 'EMERGENCY_BRAKE';

        if (!isRestricted) {
          v.braking = false;
          v.brakeForce = 0;
          v.targetSpeed = weather.recommendedSpeedKmh;
        }
      }
    }

    // 6. Dynamic Intersection Coordination Arbiter (Virtual Slot Reservation)
    this.coordinateIntersection(dtSeconds);

    // 7. Decentralized V2X Collision Monitoring & Emergency Avoidance
    this.monitorNearbyTelemetryAndAvoidCollisions(dtSeconds);

    // 8. Open-Source Physics Dynamics (Kinematic Bicycle Model & IDM+ Propulsion Engine)
    for (const v of vehicles) {
      const physics = getVehiclePhysicsSpecs(v.type);
      const vMs = (v.speed * 1000) / 3600;

      // Resisting forces: Aerodynamic Drag & Rolling Resistance
      const fAero = 0.5 * 1.225 * physics.dragAreaCdA * (vMs * vMs);
      const fRoll = physics.rollResistanceCoeff * v.massKg * 9.81;
      v.dragForceN = Math.round(fAero + fRoll);
      const aDrag = v.dragForceN / v.massKg;

      // Dynamic Speed adjustment: Accelerate or Decelerate smoothly towards target speed
      if (v.speed > v.targetSpeed) {
        const frictionMu = weather.frictionCoefficient;
        const maxDecelMs2 = frictionMu * 9.81;
        const brakePct = Math.max(25, v.brakeForce) / 100;
        const requestedDecel = Math.min(maxDecelMs2 * 1.1, Math.max(2.2, brakePct * maxDecelMs2));

        // ABS Activation: Anti-lock braking system modulates brake pressure if near adhesion limit
        v.absActive = (requestedDecel > maxDecelMs2 * 0.82) || (weather.condition === 'SNOW_ICE' && v.speed > 5);

        v.longitudinalAccelMs2 = -Math.min(maxDecelMs2, requestedDecel + aDrag);
        v.acceleration = Number(v.longitudinalAccelMs2.toFixed(2));
        v.speed = Math.max(v.targetSpeed, v.speed + (v.longitudinalAccelMs2 * 3.6) * dtSeconds);
        if (v.targetSpeed === 0 && v.speed < 0.8) {
          v.speed = 0;
        }
        v.braking = true;
        // Realistic suspension pitch dive under braking (front compresses down)
        v.pitchAngleDeg = Math.max(-3.5, Math.min(2.0, v.longitudinalAccelMs2 * 0.65));
      } else if (v.speed < v.targetSpeed) {
        v.absActive = false;
        const traction = Math.min(1.0, weather.frictionCoefficient / 0.85);
        const enginePowerW = physics.enginePowerKw * 1000;
        const powerLimitedForce = enginePowerW / Math.max(3.0, vMs);
        const tractionLimitedForce = v.massKg * 9.81 * weather.frictionCoefficient * 0.95;
        const nominalForce = v.massKg * physics.maxAccelMs2 * traction;

        const effectiveForce = Math.min(nominalForce, tractionLimitedForce, powerLimitedForce);
        const aEngine = effectiveForce / v.massKg;
        const boostMultiplier = v.beatingYellow ? 1.35 : (v.overtaking ? 1.2 : 1.0);

        v.longitudinalAccelMs2 = Math.max(0.3, (aEngine * boostMultiplier) - aDrag);
        v.acceleration = Number(v.longitudinalAccelMs2.toFixed(2));
        v.speed = Math.min(v.targetSpeed, v.speed + (v.longitudinalAccelMs2 * 3.6) * dtSeconds);
        v.braking = false;
        v.brakeForce = 0;
        // Realistic suspension pitch squat under acceleration (rear squats down)
        v.pitchAngleDeg = Math.max(-3.5, Math.min(2.0, v.longitudinalAccelMs2 * 0.45));
      } else {
        v.absActive = false;
        v.longitudinalAccelMs2 = 0;
        v.acceleration = 0;
        v.pitchAngleDeg = 0;
        v.braking = false;
        v.brakeForce = 0;
      }

      // Update continuous weather telemetry frame for vehicle
      const currentSpeed = Math.max(8, v.speed);
      v.weatherTelemetry = {
        surfaceFrictionMu: weather.frictionCoefficient,
        brakingDistanceMeters: Number(((currentSpeed * currentSpeed) / (250 * weather.frictionCoefficient)).toFixed(1)),
        safeFollowingDistanceMeters: Number((weather.followingDistanceGapPx / 3.5).toFixed(1)),
        opticalVisibilityMeters: weather.visibilityMeters,
        tractionControlActive: (weather.condition === 'SNOW_ICE' || weather.condition === 'RAIN') && v.speed > 5,
        v2xPenetrationAdvantage: weather.v2xPenetrationAdvantage,
      };

      // Kinematic Bicycle Model: Front wheel steering angle calculation
      let steerAngle = 0;
      if (v.lane !== v.targetLane && v.laneChangeProgress > 0) {
        const p = v.laneChangeProgress;
        const sign = v.targetLane > v.lane ? 1 : -1;
        // Sinusoidal steering curve during lane transition
        steerAngle = Math.sin(p * Math.PI) * sign * 18;
      } else if (v.activeManeuver === 'EVASIVE_STEER_RIGHT') {
        steerAngle = 14;
      } else if (v.activeManeuver === 'EVASIVE_STEER_LEFT') {
        steerAngle = -14;
      } else if (v.activeManeuver === 'PULL_OVER_EMERGENCY') {
        steerAngle = 10;
      }
      v.steerAngleDeg = steerAngle;

      // Lateral Centripetal Acceleration & ESP Stability Control
      v.lateralAccelMs2 = Math.abs(steerAngle) > 0.5
        ? (vMs * vMs) / Math.max(12, v.wheelbaseM / Math.max(0.01, Math.sin((Math.abs(steerAngle) * Math.PI) / 180)))
        : 0;
      v.espActive = v.lateralAccelMs2 > (weather.frictionCoefficient * 9.81 * 0.65);

      // Centrifugal chassis body roll outward
      v.rollAngleDeg = Math.max(-4.5, Math.min(4.5, -(steerAngle / 18) * (v.speed / 45) * 3.2));

      const speedPxPerSec = (v.speed * 1000) / 3600 * 3.5; // Scale factor px/m
      const stepDist = speedPxPerSec * dtSeconds;

      // Multi-lane lateral positioning with smoothstep S-curve interpolation
      const currentOffset = v.lane === 0 ? LANE_INNER_OFFSET : LANE_OUTER_OFFSET;
      const targetOffset = v.targetLane === 0 ? LANE_INNER_OFFSET : LANE_OUTER_OFFSET;
      const p = v.laneChangeProgress;
      const smoothP = p * p * (3 - 2 * p); // smoothstep
      const effectiveOffset = currentOffset + (targetOffset - currentOffset) * smoothP;

      // Keep lateral offset strictly towards outer curb shoulder (never drift into opposing oncoming traffic)
      const clampedEvasive = Math.max(0, Math.min(10, v.evasiveLateralOffset));

      // Pathfinding trajectory update with strict Stop-Line Enforcement on RED
      const dims = getVehicleDimensions(v.type);
      const isTrafficLightMode = this.state.trafficLightState.mode === 'TRAFFIC_LIGHTS';
      const isEmergency = v.priority || v.type === 'POLICE_PATROL' || v.type === 'EMERGENCY_AMBULANCE' || v.type === 'FIRE_ENGINE';
      const tl = this.state.trafficLightState;
      const vLight = (v.direction === 'NORTH') ? tl.northLight
        : (v.direction === 'SOUTH') ? tl.southLight
        : (v.direction === 'EAST') ? tl.eastLight
        : tl.westLight;
      const isRedStopRequired = isTrafficLightMode && 
        (vLight === 'RED' || tl.isAllRedClearance) && 
        !v.enteredOnGreen && 
        !v.crossedIntersection && 
        v.distanceToStopLine > 0 && 
        !isEmergency;

      switch (v.direction) {
        case 'NORTH':
          if (isRedStopRequired && v.distanceToStopLine > 0) {
            const stopY = CENTER - STOP_LINE_DIST - dims.halfLength;
            v.y = Math.min(stopY, v.y + stepDist);
            if (v.y >= stopY - 0.5) {
              v.speed = 0;
              v.targetSpeed = 0;
              v.braking = true;
              v.brakeForce = 100;
              v.acceleration = 0;
              v.v2iReaction = 'STOPPED_AT_RED';
            }
          } else {
            v.y += stepDist;
          }
          v.x = (CENTER - effectiveOffset) - clampedEvasive;
          v.heading = 180;
          break;
        case 'SOUTH':
          if (isRedStopRequired && v.distanceToStopLine > 0) {
            const stopY = CENTER + STOP_LINE_DIST + dims.halfLength;
            v.y = Math.max(stopY, v.y - stepDist);
            if (v.y <= stopY + 0.5) {
              v.speed = 0;
              v.targetSpeed = 0;
              v.braking = true;
              v.brakeForce = 100;
              v.acceleration = 0;
              v.v2iReaction = 'STOPPED_AT_RED';
            }
          } else {
            v.y -= stepDist;
          }
          v.x = (CENTER + effectiveOffset) + clampedEvasive;
          v.heading = 0;
          break;
        case 'WEST':
          if (isRedStopRequired && v.distanceToStopLine > 0) {
            const stopX = CENTER - STOP_LINE_DIST - dims.halfLength;
            v.x = Math.min(stopX, v.x + stepDist);
            if (v.x >= stopX - 0.5) {
              v.speed = 0;
              v.targetSpeed = 0;
              v.braking = true;
              v.brakeForce = 100;
              v.acceleration = 0;
              v.v2iReaction = 'STOPPED_AT_RED';
            }
          } else {
            v.x += stepDist;
          }
          v.y = (CENTER + effectiveOffset) + clampedEvasive;
          v.heading = 90;
          break;
        case 'EAST':
          if (isRedStopRequired && v.distanceToStopLine > 0) {
            const stopX = CENTER + STOP_LINE_DIST + dims.halfLength;
            v.x = Math.max(stopX, v.x - stepDist);
            if (v.x <= stopX + 0.5) {
              v.speed = 0;
              v.targetSpeed = 0;
              v.braking = true;
              v.brakeForce = 100;
              v.acceleration = 0;
              v.v2iReaction = 'STOPPED_AT_RED';
            }
          } else {
            v.x -= stepDist;
          }
          v.y = (CENTER - effectiveOffset) - clampedEvasive;
          v.heading = 270;
          break;
      }
    }

    // 8b. Multi-Directional Physical Non-Penetration Resolution (All Pairs)
    // Prevents lane overlapping at intersection centers and enforces bumper-to-bumper queue spacing
    for (let i = 0; i < vehicles.length; i++) {
      const vA = vehicles[i];
      const dimA = getVehicleDimensions(vA.type);

      for (let j = i + 1; j < vehicles.length; j++) {
        const vB = vehicles[j];
        const dimB = getVehicleDimensions(vB.type);

        const dx = vA.x - vB.x;
        const dy = vA.y - vB.y;
        const dist = Math.hypot(dx, dy);

        // Required physical clearance cushion
        const minClearance = dimA.boundingRadius + dimB.boundingRadius;

        if (dist < minClearance && dist > 0.0001) {
          const isOpposite = (
            (vA.direction === 'NORTH' && vB.direction === 'SOUTH') ||
            (vA.direction === 'SOUTH' && vB.direction === 'NORTH') ||
            (vA.direction === 'EAST' && vB.direction === 'WEST') ||
            (vA.direction === 'WEST' && vB.direction === 'EAST')
          );

          if (isOpposite) {
            // Opposite lanes: verify if physically separated laterally across median or non-overlapping lanes
            if (vA.direction === 'EAST' || vA.direction === 'WEST') {
              const lateralGap = Math.abs(dy) - (dimA.halfWidth + dimB.halfWidth);
              if (lateralGap >= 2) continue; // Separated across yellow centerline, safe passing!
            } else {
              const lateralGap = Math.abs(dx) - (dimA.halfWidth + dimB.halfWidth);
              if (lateralGap >= 2) continue; // Separated across yellow centerline, safe passing!
            }
          } else if (vA.direction === vB.direction) {
            // Same direction: check if in adjacent parallel lanes without lateral encroachment
            if (vA.direction === 'EAST' || vA.direction === 'WEST') {
              const lateralGap = Math.abs(dy) - (dimA.halfWidth + dimB.halfWidth);
              if (lateralGap >= 2) continue; // Distinct lanes (Lane 0 vs Lane 1), safe!
            } else {
              const lateralGap = Math.abs(dx) - (dimA.halfWidth + dimB.halfWidth);
              if (lateralGap >= 2) continue; // Distinct lanes (Lane 0 vs Lane 1), safe!
            }
          }

          const overlap = minClearance - dist;
          const nx = dx / dist;
          const ny = dy / dist;

          // Determine priority & which vehicle yields
          const isEmA = vA.priority || vA.type === 'POLICE_PATROL' || vA.type === 'EMERGENCY_AMBULANCE' || vA.type === 'FIRE_ENGINE';
          const isEmB = vB.priority || vB.type === 'POLICE_PATROL' || vB.type === 'EMERGENCY_AMBULANCE' || vB.type === 'FIRE_ENGINE';

          let yielder = vA;
          let leader = vB;
          let yielderSign = 1; // 1 pushes vA away, -1 pushes vB away

          if (isEmA && !isEmB) {
            yielder = vB;
            leader = vA;
            yielderSign = -1;
          } else if (isEmB && !isEmA) {
            yielder = vA;
            leader = vB;
            yielderSign = 1;
          } else if (vA.direction === vB.direction) {
            // Same corridor: vehicle with larger distanceToStopLine is behind
            if (vA.distanceToStopLine > vB.distanceToStopLine) {
              yielder = vA;
              leader = vB;
              yielderSign = 1;
            } else {
              yielder = vB;
              leader = vA;
              yielderSign = -1;
            }
          } else {
            // Perpendicular crossing at intersection center:
            // Vehicle already in the conflict box has absolute right-of-way
            if (vA.inConflictZone && !vB.inConflictZone) {
              yielder = vB;
              leader = vA;
              yielderSign = -1;
            } else if (vB.inConflictZone && !vA.inConflictZone) {
              yielder = vA;
              leader = vB;
              yielderSign = 1;
            } else {
              // Both in conflict box or both outside: vehicle closer to exit has priority
              if (vA.distanceToStopLine < vB.distanceToStopLine) {
                yielder = vB;
                leader = vA;
                yielderSign = -1;
              } else {
                yielder = vA;
                leader = vB;
                yielderSign = 1;
              }
            }
          }

          // Gentle compliance nudge along separation normal (preserves smooth motion)
          const nudge = Math.min(3, overlap * 0.3);
          yielder.x += nx * nudge * yielderSign;
          yielder.y += ny * nudge * yielderSign;

          // Enforce strict road boundary clamp: NEVER push vehicles across the yellow centerline into opposing traffic!
          if (yielder.direction === 'NORTH') {
            yielder.x = Math.max(CENTER - HALF_ROAD + 8, Math.min(CENTER - 10, yielder.x));
          } else if (yielder.direction === 'SOUTH') {
            yielder.x = Math.max(CENTER + 10, Math.min(CENTER + HALF_ROAD - 8, yielder.x));
          } else if (yielder.direction === 'WEST') {
            yielder.y = Math.max(CENTER + 10, Math.min(CENTER + HALF_ROAD - 8, yielder.y));
          } else if (yielder.direction === 'EAST') {
            yielder.y = Math.max(CENTER - HALF_ROAD + 8, Math.min(CENTER - 10, yielder.y));
          }

          // Enforce Stop Bar clamp: NEVER push a vehicle across the stop bar into the intersection on a red signal!
          const isModeTL = this.state.trafficLightState.mode === 'TRAFFIC_LIGHTS';
          const yLight = (yielder.direction === 'NORTH') ? this.state.trafficLightState.northLight
            : (yielder.direction === 'SOUTH') ? this.state.trafficLightState.southLight
            : (yielder.direction === 'EAST') ? this.state.trafficLightState.eastLight
            : this.state.trafficLightState.westLight;
          const isYielderRed = isModeTL && (yLight === 'RED' || this.state.trafficLightState.isAllRedClearance) && !yielder.enteredOnGreen && !yielder.crossedIntersection && yielder.distanceToStopLine > 0;

          if (isYielderRed) {
            const dimsY = getVehicleDimensions(yielder.type);
            if (yielder.direction === 'NORTH') {
              yielder.y = Math.min(CENTER - STOP_LINE_DIST - dimsY.halfLength, yielder.y);
            } else if (yielder.direction === 'SOUTH') {
              yielder.y = Math.max(CENTER + STOP_LINE_DIST + dimsY.halfLength, yielder.y);
            } else if (yielder.direction === 'WEST') {
              yielder.x = Math.min(CENTER - STOP_LINE_DIST - dimsY.halfLength, yielder.x);
            } else if (yielder.direction === 'EAST') {
              yielder.x = Math.max(CENTER + STOP_LINE_DIST + dimsY.halfLength, yielder.x);
            }
          }

          // Anti-Deadlock Speed Resolution:
          if (leader.inConflictZone) {
            // Vehicle inside conflict box must keep moving to clear intersection!
            leader.targetSpeed = Math.max(leader.targetSpeed, 35);
            leader.braking = false;
            leader.brakeForce = 0;
            yielder.speed = Math.min(yielder.speed, Math.max(12, leader.speed * 0.8));
          } else {
            // Speed attenuation outside intersection: follower matches leader ONLY if in same direction
            if (vA.direction === vB.direction) {
              yielder.speed = Math.min(yielder.speed, Math.max(0, leader.speed * 0.85));
              if (leader.speed <= 0.8 && !leader.inConflictZone) {
                yielder.speed = 0;
                yielder.targetSpeed = 0;
                yielder.braking = true;
              } else if (yielder.targetSpeed === 0 && !yielder.yieldingToRedEmergency && yielder.v2iReaction !== 'STOPPED_AT_RED') {
                yielder.targetSpeed = leader.targetSpeed;
                yielder.braking = false;
              }
            }
          }
        }
      }
    }

    // 8c. Advance Pedestrians Along Sidewalks & Continental Crosswalks
    this.updatePedestrians(dtSeconds);

    // 9. Update Real-Time Spatial Density Grid & Bottleneck Estimator
    this.updateDensityHeatmap(dtSeconds);

    // 10. Generate SAE J2735 BSM Telemetry Packets
    this.broadcastBSMPackets();

    // 11. Clean up vehicles that exited boundary and record stats
    // A vehicle is removed once it has successfully crossed the intersection and reached the exit side
    this.state.vehicles = vehicles.filter((v) => {
      let hasExited = false;
      if (v.crossedIntersection) {
        if (v.direction === 'NORTH' && v.y > CANVAS_SIZE + 60) hasExited = true;
        else if (v.direction === 'SOUTH' && v.y < -60) hasExited = true;
        else if (v.direction === 'WEST' && v.x > CANVAS_SIZE + 60) hasExited = true;
        else if (v.direction === 'EAST' && v.x < -60) hasExited = true;
      } else {
        // Departure-side safety failsafe (cleans up any vehicle that traveled far past the exit boundary)
        if (v.direction === 'NORTH' && v.y > CANVAS_SIZE + 100) hasExited = true;
        else if (v.direction === 'SOUTH' && v.y < -100) hasExited = true;
        else if (v.direction === 'WEST' && v.x > CANVAS_SIZE + 100) hasExited = true;
        else if (v.direction === 'EAST' && v.x < -100) hasExited = true;
      }
      if (hasExited) {
        this.logLifecycleEvent(v, 'EXITED', `Departed simulation network boundary safely`);
        this.state.stats.totalVehiclesPassed++;
        this.state.stats.nearMissesPrevented++;
        return false;
      }
      return true;
    });

    // 12. Clean up old slots
    const now = this.state.simulatedTimeMs;
    this.state.slots = slots.filter((s) => s.exitTimeMs > now - 500);

    // 13. Deterministic Cadence Auto-Spawner & Spawner Loop Re-initialization Watchdog
    this.autoSpawnCooldownSec -= dtSeconds;

    const maxVehicles = 16;
    const currentVehicles = this.state.vehicles.length;
    this.state.spawnerStatus.activeFleetCount = currentVehicles;
    this.state.spawnerStatus.isLoopActive = true;

    // Fast initial fill if fleet has dropped below healthy density, otherwise steady cadence (every ~1.6s)
    const cadenceInterval = currentVehicles < 6 ? 0.35 : 1.6;

    // Automated Spawner Watchdog: if fleet is below capacity and no spawn has occurred for > 4.5s, re-initialize
    const timeSinceLastSpawn = now - (this.state.spawnerStatus.lastSpawnTimeMs || 0);
    if (currentVehicles < maxVehicles && timeSinceLastSpawn > 4500 && this.autoSpawnCooldownSec > 0.5) {
      this.reinitializeSpawner();
    }

    if (currentVehicles < maxVehicles && this.autoSpawnCooldownSec <= 0) {
      const dirs: Direction[] = ['NORTH', 'SOUTH', 'EAST', 'WEST'];
      const shuffledDirs = [...dirs].sort(() => Math.random() - 0.5);
      let spawnedThisTick = false;

      for (const dir of shuffledDirs) {
        const lane0Cars = this.state.vehicles.filter(
          (v) => v.direction === dir && (v.lane === 0 || v.targetLane === 0) && !v.crossedIntersection
        );
        const lane1Cars = this.state.vehicles.filter(
          (v) => v.direction === dir && (v.lane === 1 || v.targetLane === 1) && !v.crossedIntersection
        );

        // A lane is free to spawn if there is no vehicle right at the spawn mouth (within 55px of spawn entrance)
        // and the lane has fewer than 3 cars queued
        const lane0MouthBlocked = lane0Cars.some((v) => v.distanceToStopLine > 235);
        const lane1MouthBlocked = lane1Cars.some((v) => v.distanceToStopLine > 235);

        const lane0Free = !lane0MouthBlocked && lane0Cars.length < 3;
        const lane1Free = !lane1MouthBlocked && lane1Cars.length < 3;

        if (lane0Free || lane1Free) {
          let selectedLane = 0;
          if (lane0Free && lane1Free) {
            selectedLane = lane0Cars.length <= lane1Cars.length ? 0 : 1;
          } else if (lane0Free) {
            selectedLane = 0;
          } else {
            selectedLane = 1;
          }

          const randType = Math.random();
          let vType: VehicleType = 'STANDARD_AV';
          if (randType < 0.04) vType = 'POLICE_PATROL';
          else if (randType < 0.08) vType = 'EMERGENCY_AMBULANCE';
          else if (randType < 0.12) vType = 'FIRE_ENGINE';
          else if (randType < 0.25) vType = 'HEAVY_TRUCK';

          this.spawnVehicle(dir, vType, 'STRAIGHT', 38 + Math.random() * 8, undefined, selectedLane);
          this.autoSpawnCooldownSec = cadenceInterval + Math.random() * 0.4;
          this.state.spawnerStatus.stallWarning = false;
          spawnedThisTick = true;
          break;
        }
      }

      // If all approach mouths were momentarily blocked, set brief backoff and warn
      if (!spawnedThisTick) {
        this.autoSpawnCooldownSec = 0.6;
        this.state.spawnerStatus.stallWarning = true;
      }
    }
  }

  private updatePedestrians(dtSeconds: number) {
    const { pedestrians, trafficLightState, weatherState, vehicles } = this.state;
    const isRainOrSnow = weatherState.condition === 'RAIN' || weatherState.condition === 'SNOW_ICE';

    for (const ped of pedestrians) {
      ped.hasUmbrella = isRainOrSnow;
      const stepDistance = ped.speed * 28 * dtSeconds; // px per second
      ped.stepCycle = (ped.stepCycle + dtSeconds * ped.speed * 2.8) % 1.0;

      if (ped.state === 'WALKING_SIDEWALK') {
        const dx = ped.targetX - ped.x;
        const dy = ped.targetY - ped.y;
        const dist = Math.hypot(dx, dy);

        if (dist > 4) {
          ped.heading = (Math.atan2(dy, dx) * 180) / Math.PI;
          ped.x += (dx / dist) * Math.min(dist, stepDistance);
          ped.y += (dy / dist) * Math.min(dist, stepDistance);
        } else {
          // Reached sidewalk destination: check if near a crosswalk curb or pick a new sidewalk loop waypoint
          const nearNorthCrosswalk = Math.abs(ped.y - (CENTER - STOP_LINE_DIST + 18)) < 28 && Math.abs(ped.x - CENTER) < (HALF_ROAD + 40);
          const nearSouthCrosswalk = Math.abs(ped.y - (CENTER + STOP_LINE_DIST - 18)) < 28 && Math.abs(ped.x - CENTER) < (HALF_ROAD + 40);
          const nearWestCrosswalk = Math.abs(ped.x - (CENTER - STOP_LINE_DIST + 18)) < 28 && Math.abs(ped.y - CENTER) < (HALF_ROAD + 40);
          const nearEastCrosswalk = Math.abs(ped.x - (CENTER + STOP_LINE_DIST - 18)) < 28 && Math.abs(ped.y - CENTER) < (HALF_ROAD + 40);

          if (nearNorthCrosswalk && Math.random() < 0.65) {
            ped.state = 'WAITING_AT_CROSSWALK';
            ped.crosswalkDirection = 'EAST';
            ped.waitingTimeSec = 0;
            ped.targetX = ped.x < CENTER ? (CENTER + HALF_ROAD + 14) : (CENTER - HALF_ROAD - 14);
            ped.targetY = CENTER - STOP_LINE_DIST + 18;
          } else if (nearSouthCrosswalk && Math.random() < 0.65) {
            ped.state = 'WAITING_AT_CROSSWALK';
            ped.crosswalkDirection = 'WEST';
            ped.waitingTimeSec = 0;
            ped.targetX = ped.x < CENTER ? (CENTER + HALF_ROAD + 14) : (CENTER - HALF_ROAD - 14);
            ped.targetY = CENTER + STOP_LINE_DIST - 18;
          } else if (nearWestCrosswalk && Math.random() < 0.65) {
            ped.state = 'WAITING_AT_CROSSWALK';
            ped.crosswalkDirection = 'SOUTH';
            ped.waitingTimeSec = 0;
            ped.targetX = CENTER - STOP_LINE_DIST + 18;
            ped.targetY = ped.y < CENTER ? (CENTER + HALF_ROAD + 14) : (CENTER - HALF_ROAD - 14);
          } else if (nearEastCrosswalk && Math.random() < 0.65) {
            ped.state = 'WAITING_AT_CROSSWALK';
            ped.crosswalkDirection = 'NORTH';
            ped.waitingTimeSec = 0;
            ped.targetX = CENTER + STOP_LINE_DIST - 18;
            ped.targetY = ped.y < CENTER ? (CENTER + HALF_ROAD + 14) : (CENTER - HALF_ROAD - 14);
          } else {
            // Roam naturally within sidewalk quadrant
            const isWest = ped.x < CENTER;
            const isNorth = ped.y < CENTER;
            const minX = isWest ? 45 : CENTER + HALF_ROAD + 14;
            const maxX = isWest ? CENTER - HALF_ROAD - 14 : CANVAS_SIZE - 45;
            const minY = isNorth ? 45 : CENTER + HALF_ROAD + 14;
            const maxY = isNorth ? CENTER - HALF_ROAD - 14 : CANVAS_SIZE - 45;

            ped.targetX = minX + Math.random() * (maxX - minX);
            ped.targetY = minY + Math.random() * (maxY - minY);
          }
        }
      } else if (ped.state === 'WAITING_AT_CROSSWALK') {
        ped.waitingTimeSec += dtSeconds;

        // Check if crosswalk signal allows safe crossing:
        // For North/South crosswalks across the vertical road: safe when EW traffic has green or NS is red
        const isCrossingNS = Math.abs(ped.y - (CENTER - STOP_LINE_DIST + 18)) < 30 || Math.abs(ped.y - (CENTER + STOP_LINE_DIST - 18)) < 30;
        const crosswalkSignalWalk = trafficLightState.mode === 'V2X_COOPERATIVE_ONLY' 
          ? true 
          : (isCrossingNS ? trafficLightState.nsLight === 'RED' : trafficLightState.ewLight === 'RED');

        // Check if any car is actively blocking or traversing the crosswalk
        const carInCrosswalk = vehicles.some((v) => {
          return Math.hypot(v.x - ped.x, v.y - ped.y) < 42 && v.speed > 5;
        });

        if ((crosswalkSignalWalk || ped.waitingTimeSec > 8) && !carInCrosswalk) {
          ped.state = 'CROSSING_STREET';
        }
      } else if (ped.state === 'CROSSING_STREET') {
        const dx = ped.targetX - ped.x;
        const dy = ped.targetY - ped.y;
        const dist = Math.hypot(dx, dy);

        if (dist > 4) {
          ped.heading = (Math.atan2(dy, dx) * 180) / Math.PI;
          ped.x += (dx / dist) * Math.min(dist, stepDistance * 1.2);
          ped.y += (dy / dist) * Math.min(dist, stepDistance * 1.2);
        } else {
          // Finished crossing street safely!
          ped.state = 'WALKING_SIDEWALK';
          const isWest = ped.x < CENTER;
          const isNorth = ped.y < CENTER;
          const minX = isWest ? 45 : CENTER + HALF_ROAD + 14;
          const maxX = isWest ? CENTER - HALF_ROAD - 14 : CANVAS_SIZE - 45;
          const minY = isNorth ? 45 : CENTER + HALF_ROAD + 14;
          const maxY = isNorth ? CENTER - HALF_ROAD - 14 : CANVAS_SIZE - 45;

          ped.targetX = minX + Math.random() * (maxX - minX);
          ped.targetY = minY + Math.random() * (maxY - minY);
        }
      }
    }
  }

  private updateTrafficLightState(dtSeconds: number) {
    const tl = this.state.trafficLightState;
    if (tl.mode === 'V2X_COOPERATIVE_ONLY') {
      // In cooperative mode, physical signals enter standby yellow/caution (never simultaneous green)
      tl.northLight = 'YELLOW';
      tl.southLight = 'YELLOW';
      tl.eastLight = 'YELLOW';
      tl.westLight = 'YELLOW';
      tl.nsLight = 'YELLOW';
      tl.ewLight = 'YELLOW';
      tl.activeDirection = null;
      tl.isAllRedClearance = false;
      tl.clearanceTimeRemainingSec = 0;
      return;
    }

    // 1. Emergency preemption check
    const emergencyVehicles = this.state.vehicles.filter(
      (v) => (v.type === 'POLICE_PATROL' || v.type === 'EMERGENCY_AMBULANCE' || v.type === 'FIRE_ENGINE') &&
             v.distanceToStopLine > -35 && !v.crossedIntersection
    );

    if (emergencyVehicles.length > 0) {
      emergencyVehicles.sort((a, b) => a.distanceToStopLine - b.distanceToStopLine);
      const prioVeh = emergencyVehicles[0];

      if (tl.preemptedDirection !== prioVeh.direction) {
        tl.emergencyPreemptionActive = true;
        tl.preemptedDirection = prioVeh.direction;
        this.forceApproachGreen(prioVeh.direction);
        tl.phaseTimeRemainingSec = 7.0;
      } else {
        tl.emergencyPreemptionActive = true;
        tl.phaseTimeRemainingSec = Math.max(tl.phaseTimeRemainingSec, 3.5);
      }
    } else if (tl.emergencyPreemptionActive) {
      tl.emergencyPreemptionActive = false;
      tl.preemptedDirection = null;
    }

    // 2. Normal sequential phase timer progression: ONE LIGHT AT A TIME
    // Cycle: NORTH (Green -> Yellow -> 3s All-Red) -> EAST (Green -> Yellow -> 3s All-Red) -> SOUTH (Green -> Yellow -> 3s All-Red) -> WEST (Green -> Yellow -> 3s All-Red)
    tl.phaseTimeRemainingSec -= dtSeconds * tl.cycleSpeedMultiplier;
    if (tl.isAllRedClearance) {
      tl.clearanceTimeRemainingSec = Math.max(0, tl.phaseTimeRemainingSec);
    }

    if (tl.phaseTimeRemainingSec <= 0) {
      switch (tl.phase) {
        // --- NORTH APPROACH ---
        case 'NORTH_GREEN':
          this.setTrafficLightPhase('NORTH_YELLOW');
          break;
        case 'NORTH_YELLOW':
          // Exactly 3 seconds of All-Red clearance interval before next green!
          this.setTrafficLightPhase('CLEARANCE_RED_NORTH');
          break;
        case 'CLEARANCE_RED_NORTH':
          // 3 seconds elapsed: cars that crossed on yellow have cleared. Now EAST gets GREEN!
          this.setTrafficLightPhase('EAST_GREEN');
          break;

        // --- EAST APPROACH ---
        case 'EAST_GREEN':
          this.setTrafficLightPhase('EAST_YELLOW');
          break;
        case 'EAST_YELLOW':
          // 3-second All-Red clearance interval!
          this.setTrafficLightPhase('CLEARANCE_RED_EAST');
          break;
        case 'CLEARANCE_RED_EAST':
          // 3 seconds elapsed: SOUTH gets GREEN!
          this.setTrafficLightPhase('SOUTH_GREEN');
          break;

        // --- SOUTH APPROACH ---
        case 'SOUTH_GREEN':
          this.setTrafficLightPhase('SOUTH_YELLOW');
          break;
        case 'SOUTH_YELLOW':
          // 3-second All-Red clearance interval!
          this.setTrafficLightPhase('CLEARANCE_RED_SOUTH');
          break;
        case 'CLEARANCE_RED_SOUTH':
          // 3 seconds elapsed: WEST gets GREEN!
          this.setTrafficLightPhase('WEST_GREEN');
          break;

        // --- WEST APPROACH ---
        case 'WEST_GREEN':
          this.setTrafficLightPhase('WEST_YELLOW');
          break;
        case 'WEST_YELLOW':
          // 3-second All-Red clearance interval!
          this.setTrafficLightPhase('CLEARANCE_RED_WEST');
          break;
        case 'CLEARANCE_RED_WEST':
          // 3 seconds elapsed: Loops back to NORTH GREEN!
          this.setTrafficLightPhase('NORTH_GREEN');
          break;

        // --- Legacy phase fallbacks ---
        case 'NS_GREEN':
          this.setTrafficLightPhase('NORTH_YELLOW');
          break;
        case 'NS_YELLOW':
        case 'ALL_RED_1':
          this.setTrafficLightPhase('CLEARANCE_RED_NORTH');
          break;
        case 'EW_GREEN':
          this.setTrafficLightPhase('EAST_YELLOW');
          break;
        case 'EW_YELLOW':
        case 'ALL_RED_2':
          this.setTrafficLightPhase('CLEARANCE_RED_EAST');
          break;
        default:
          this.setTrafficLightPhase('NORTH_GREEN');
          break;
      }
    }

    // Fail-Safe Invariant: Absolute mutual exclusion interlock (more than one directional green is strictly impossible)
    let greenCount = 0;
    if (tl.northLight === 'GREEN') greenCount++;
    if (tl.eastLight === 'GREEN') greenCount++;
    if (tl.southLight === 'GREEN') greenCount++;
    if (tl.westLight === 'GREEN') greenCount++;
    if (greenCount > 1) {
      // Hardware interlock failure trigger: force safe all-red clearance
      tl.northLight = 'RED';
      tl.southLight = 'RED';
      tl.eastLight = 'RED';
      tl.westLight = 'RED';
      tl.nsLight = 'RED';
      tl.ewLight = 'RED';
      tl.isAllRedClearance = true;
    }
  }

  private updateTrafficLightRSUBroadcast(dtSeconds: number) {
    const tl = this.state.trafficLightState;
    const rsu = this.state.trafficLightRSU;
    const { vehicles } = this.state;

    // 1. Advance RSU internal SPaT state
    rsu.activeSPaT.timestampMs = this.state.simulatedTimeMs;
    rsu.activeSPaT.currentPhase = tl.phase;
    rsu.activeSPaT.activeDirection = tl.activeDirection || 'NONE';
    rsu.activeSPaT.northLight = tl.northLight;
    rsu.activeSPaT.southLight = tl.southLight;
    rsu.activeSPaT.eastLight = tl.eastLight;
    rsu.activeSPaT.westLight = tl.westLight;
    rsu.activeSPaT.nsLight = tl.nsLight;
    rsu.activeSPaT.ewLight = tl.ewLight;
    rsu.activeSPaT.isAllRedClearance = tl.isAllRedClearance;
    rsu.activeSPaT.clearanceTimeRemainingSec = Math.max(0, tl.clearanceTimeRemainingSec);
    rsu.activeSPaT.timeRemainingSec = Math.max(0, tl.phaseTimeRemainingSec);
    rsu.activeSPaT.phaseDurationSec = tl.phaseDurationSec;
    rsu.activeSPaT.emergencyPreemption = tl.emergencyPreemptionActive;
    rsu.activeSPaT.packetCounter++;
    rsu.totalPacketsBroadcast++;

    if (tl.emergencyPreemptionActive) {
      rsu.rsuOperationalStatus = 'EMERGENCY_PREEMPTION';
    } else if (tl.mode === 'V2X_COOPERATIVE_ONLY') {
      rsu.rsuOperationalStatus = 'STANDBY_COOPERATIVE';
    } else {
      rsu.rsuOperationalStatus = 'BROADCASTING_SPAT';
    }

    // 2. Compute Green Light Optimized Speed Advisories (GLOSA) per individual approach
    const computeGlosaForLight = (light: LightColor) => {
      if (light === 'GREEN') {
        return tl.phaseTimeRemainingSec >= 2.5 ? 44 : 36;
      }
      if (light === 'YELLOW') {
        return 22;
      }
      return 0; // Strict RED or ALL-RED clearance: 0 km/h advisory
    };

    const glosaNorth = computeGlosaForLight(tl.northLight);
    const glosaSouth = computeGlosaForLight(tl.southLight);
    const glosaEast = computeGlosaForLight(tl.eastLight);
    const glosaWest = computeGlosaForLight(tl.westLight);

    rsu.activeSPaT.glosaAdvisorySpeedKmh = {
      north: glosaNorth,
      south: glosaSouth,
      east: glosaEast,
      west: glosaWest,
    };

    // 3. Wireless Broadcast SPaT to all vehicles in communication range & Update Vehicle AI
    let connectedCount = 0;

    for (const v of vehicles) {
      const distToRsu = Math.hypot(v.x - rsu.x, v.y - rsu.y);

      if (distToRsu <= rsu.broadcastRangePx) {
        connectedCount++;
        // Determine directional light and advisory speed for this vehicle's specific approach:
        let activeLight: LightColor = 'RED';
        let advisorySpeed = 0;
        switch (v.direction) {
          case 'NORTH':
            activeLight = tl.northLight;
            advisorySpeed = glosaNorth;
            break;
          case 'SOUTH':
            activeLight = tl.southLight;
            advisorySpeed = glosaSouth;
            break;
          case 'EAST':
            activeLight = tl.eastLight;
            advisorySpeed = glosaEast;
            break;
          case 'WEST':
            activeLight = tl.westLight;
            advisorySpeed = glosaWest;
            break;
        }

        const signalStrengthDbm = Math.round(-42 - (distToRsu / rsu.broadcastRangePx) * 44);

        v.v2iSignalReceived = {
          rsuId: rsu.id,
          light: activeLight,
          phase: tl.phase,
          timeRemainingSec: Number(tl.phaseTimeRemainingSec.toFixed(1)),
          advisorySpeedKmh: advisorySpeed,
          signalStrengthDbm,
          emergencyPreemption: tl.emergencyPreemptionActive,
        };

        // Vehicle AI Decision Engine reacting to RSU SPaT Signal:
        const isEmergency = v.type === 'POLICE_PATROL' || v.type === 'EMERGENCY_AMBULANCE' || v.type === 'FIRE_ENGINE';
        if (isEmergency) {
          v.v2iReaction = 'EMERGENCY_OVERRIDE';
          continue;
        }

        // Vehicles pulling over must still halt before a red light at the stop bar
        if (v.yieldingToEmergency) {
          if ((activeLight === 'RED' || tl.isAllRedClearance) && !v.enteredOnGreen) {
            if (v.distanceToStopLine <= 6) {
              v.v2iReaction = 'STOPPED_AT_RED';
              v.speed = 0;
              v.targetSpeed = 0;
              v.braking = true;
              v.brakeForce = 100;
              continue;
            }
          }
        }

        // Check if green-light vehicle is yielding to an emergency vehicle running on red:
        if (v.yieldingToRedEmergency) {
          v.v2iReaction = 'WAITING_FOR_EMERGENCY_CROSSING';
          v.targetSpeed = 0;
          v.braking = true;
          v.brakeForce = 100;
          continue;
        }

        if (tl.mode === 'V2X_COOPERATIVE_ONLY') {
          v.v2iReaction = 'NONE';
          v.beatingYellow = false;
          continue;
        }

        if (v.crossedIntersection || (v.distanceToStopLine <= 0 && v.enteredOnGreen)) {
          // Past stop line on legitimate green/yellow entry: clear intersection
          v.v2iReaction = 'NONE';
          v.beatingYellow = false;
          v.braking = false;
          v.targetSpeed = Math.max(v.targetSpeed, 38);
          continue;
        } else if (activeLight === 'RED' || tl.isAllRedClearance) {
          // RSU Signal = RED or ALL-RED CLEARANCE: Smooth, realistic stop before stop bar
          v.beatingYellow = false;
          if (v.activeManeuver === 'SPEED_UP_YELLOW') {
            v.activeManeuver = 'NONE';
          }

          const redBrakingThreshold = 160 * this.state.weatherState.brakingDistanceMultiplier;

          if (v.distanceToStopLine <= 6 && v.distanceToStopLine > 0) {
            // Clean complete stop right at stop bar
            v.v2iReaction = 'STOPPED_AT_RED';
            v.speed = 0;
            v.targetSpeed = 0;
            v.braking = true;
            v.brakeForce = 100;
            v.acceleration = 0;
          } else if (v.distanceToStopLine > 6 && v.distanceToStopLine < redBrakingThreshold) {
            // Decelerate smoothly following exponential braking curve to reach 0 before stop line
            v.v2iReaction = 'DECELERATING_FOR_RED';
            v.braking = true;
            const distRatio = Math.max(0, (v.distanceToStopLine - 5) / (redBrakingThreshold - 5));
            const cruise = this.state.weatherState.recommendedSpeedKmh;
            v.targetSpeed = Math.min(v.speed, cruise * Math.pow(distRatio, 1.2));
            v.brakeForce = Math.min(100, Math.max(35, (1 - distRatio) * 95));
            v.acceleration = -3.2 * this.state.weatherState.frictionCoefficient;
          }
        } else if (activeLight === 'YELLOW') {
          // RSU Signal = YELLOW: Dilemma Zone Evaluation adjusted by surface grip
          const minStoppingDist = (v.speed / 3.6) ** 2 / (2 * 9.81 * this.state.weatherState.frictionCoefficient) * 3.5;

          if (v.distanceToStopLine < 28 || (this.state.weatherState.frictionCoefficient < 0.55 && v.distanceToStopLine < minStoppingDist)) {
            // Already entering intersection or road is too slick to stop safely: accelerate to clear
            v.v2iReaction = 'ACCELERATING_YELLOW';
            v.targetSpeed = Math.max(v.speed, this.state.weatherState.recommendedSpeedKmh + 4);
            v.braking = false;
            v.acceleration = 2.0;
          } else if (v.distanceToStopLine <= 50 && tl.phaseTimeRemainingSec >= 1.5 && v.driverPersonality === 'HUMAN_AGGRESSIVE') {
            // Aggressive driver only attempts to beat yellow if within 50px AND at least 1.5s remaining
            v.v2iReaction = 'ACCELERATING_YELLOW';
            v.beatingYellow = true;
            v.activeManeuver = 'SPEED_UP_YELLOW';
            v.braking = false;
            v.brakeForce = 0;
            v.targetSpeed = Math.min(54, this.state.weatherState.recommendedSpeedKmh + 8);
            v.acceleration = 3.0;
          } else {
            // All others decelerate smoothly to stop cleanly at stop bar
            v.v2iReaction = 'SLOWING_YELLOW';
            v.beatingYellow = false;
            v.activeManeuver = 'NONE';
            v.braking = true;
            const distRatio = Math.max(0, (v.distanceToStopLine - 4) / 100);
            v.targetSpeed = Math.min(v.speed, this.state.weatherState.recommendedSpeedKmh * Math.sqrt(distRatio));
            v.brakeForce = Math.min(95, Math.max(40, (1 - distRatio) * 85));
            v.acceleration = -3.2;
          }
        } else if (activeLight === 'GREEN') {
          // RSU Signal = GREEN: Accelerate & Cruise capped by weather recommended speed
          v.beatingYellow = false;
          if (v.activeManeuver === 'SPEED_UP_YELLOW') {
            v.activeManeuver = 'NONE';
          }

          // Anti-Gridlock ("Don't Block the Box" Law):
          // If approaching stop line (distanceToStopLine > 0 and < 45px), check if cross-traffic is still inside the intersection box
          const boxBlockedByCrossTraffic = v.distanceToStopLine > 0 && v.distanceToStopLine < 45 && vehicles.some(
            (other) =>
              other.id !== v.id &&
              other.inConflictZone &&
              !other.crossedIntersection &&
              other.direction !== v.direction
          );

          if (boxBlockedByCrossTraffic) {
            // Hold before the stop bar until the intersection conflict box has cleared
            v.v2iReaction = 'WAITING_FOR_BOX_CLEARANCE';
            v.targetSpeed = 0;
            v.braking = true;
            v.brakeForce = 90;
            if (v.distanceToStopLine <= 8) {
              v.speed = 0;
            }
          } else {
            v.braking = false;
            v.brakeForce = 0;
            const weatherSpeedLimit = this.state.weatherState.recommendedSpeedKmh;
            const cruiseSpeed = rsu.glosaActive && advisorySpeed > 0 ? Math.min(advisorySpeed, weatherSpeedLimit) : weatherSpeedLimit;
            v.v2iReaction = 'GLOSA_CRUISE_GREEN';
            v.targetSpeed = cruiseSpeed;
            v.acceleration = 2.0;
          }
        }
      } else {
        // Out of RSU wireless transmission range: still obey physical optical signal!
        v.v2iSignalReceived = null;
        let opticalLight: LightColor = 'RED';
        switch (v.direction) {
          case 'NORTH': opticalLight = tl.northLight; break;
          case 'SOUTH': opticalLight = tl.southLight; break;
          case 'EAST': opticalLight = tl.eastLight; break;
          case 'WEST': opticalLight = tl.westLight; break;
        }
        if (tl.mode === 'TRAFFIC_LIGHTS' && (opticalLight === 'RED' || tl.isAllRedClearance) && !v.enteredOnGreen && !v.crossedIntersection && v.distanceToStopLine > 0) {
          v.v2iReaction = (v.distanceToStopLine <= 6 && v.distanceToStopLine > 0) ? 'STOPPED_AT_RED' : 'DECELERATING_FOR_RED';
          if (v.distanceToStopLine <= 6 && v.distanceToStopLine > 0) {
            v.speed = 0;
            v.targetSpeed = 0;
            v.braking = true;
            v.brakeForce = 100;
          }
        } else {
          v.v2iReaction = 'NONE';
        }
      }
    }

    rsu.connectedVehicleCount = connectedCount;
  }

  public toggleGLOSA() {
    this.state.trafficLightRSU.glosaActive = !this.state.trafficLightRSU.glosaActive;
  }

  public setTrafficLightRSURange(rangePx: number) {
    this.state.trafficLightRSU.broadcastRangePx = Math.max(150, Math.min(600, rangePx));
  }

  private coordinateIntersection(dt: number) {
    const approaching = this.state.vehicles.filter((v) => v.distanceToStopLine > 0 && !v.crossedIntersection);
    const { rsuConfig } = this.state;
    const now = this.state.simulatedTimeMs;

    // 1. RSU Computes Dynamic Priority Score based on Speed & Arrival Time
    for (const v of approaching) {
      const massKg = v.type === 'HEAVY_TRUCK' ? 9000 : (v.type === 'EMERGENCY_AMBULANCE' ? 2800 : 1600);
      const speedMs = Math.max(0.1, (v.speed * 1000) / 3600);
      v.kineticEnergyJoules = Math.round(0.5 * massKg * speedMs * speedMs);

      // Arrival urgency component: closer time-to-intersection gets higher score
      const arrivalUrgency = Math.min(50, (1 / Math.max(0.25, v.timeToIntersection)) * 18);

      // Speed & kinetic efficiency component: preserving momentum of high-speed vehicles
      const speedEfficiency = (v.speed / 50.0) * 35;

      // Heavy inertia / momentum preservation component
      const momentumFactor = (massKg / 1600.0) * (v.speed / 45.0) * 15;

      // Emergency preemption override for police, ambulance, fire
      const isEmergency = v.type === 'POLICE_PATROL' || v.type === 'EMERGENCY_AMBULANCE' || v.type === 'FIRE_ENGINE';
      const emergencyBonus = isEmergency ? 650 : 0;

      let score = (arrivalUrgency * rsuConfig.arrivalWeight) + 
                  (speedEfficiency * rsuConfig.speedWeight) + 
                  (momentumFactor * rsuConfig.momentumWeight) + 
                  emergencyBonus;

      v.dynamicPriorityScore = Math.round(score);

      if (v.dynamicPriorityScore >= 500) {
        v.priorityTier = 'P0_EMERGENCY';
      } else if (v.dynamicPriorityScore >= 42) {
        v.priorityTier = 'P1_MOMENTUM_HIGH';
      } else if (v.dynamicPriorityScore >= 24) {
        v.priorityTier = 'P2_STANDARD';
      } else {
        v.priorityTier = 'P3_YIELD_ADVISORY';
      }
    }

    // 2. RSU Sorts Priority Queue based on active arbitration policy
    approaching.sort((a, b) => {
      // Emergency vehicles always bypass standard queue
      const isEmA = a.type === 'POLICE_PATROL' || a.type === 'EMERGENCY_AMBULANCE' || a.type === 'FIRE_ENGINE';
      const isEmB = b.type === 'POLICE_PATROL' || b.type === 'EMERGENCY_AMBULANCE' || b.type === 'FIRE_ENGINE';
      const prioA = isEmA ? 0 : 1;
      const prioB = isEmB ? 0 : 1;
      if (prioA !== prioB) return prioA - prioB;

      if (rsuConfig.mode === 'DYNAMIC_SPEED_ARRIVAL') {
        return b.dynamicPriorityScore - a.dynamicPriorityScore;
      } else if (rsuConfig.mode === 'KINETIC_MOMENTUM_PRESERVATION') {
        return b.kineticEnergyJoules - a.kineticEnergyJoules;
      } else {
        // STRICT_FCFS
        return a.timeToIntersection - b.timeToIntersection;
      }
    });

    const bookedIntervals: Array<{ start: number; end: number; vehicleId: string; dir: Direction }> = [];
    const queueItems: RSUPriorityQueueItem[] = [];

    // Pre-populate booked intervals with vehicles currently inside the conflict box or crossing the intersection
    for (const curr of this.state.vehicles) {
      if (curr.inConflictZone || (curr.distanceToStopLine <= 0 && !curr.crossedIntersection)) {
        bookedIntervals.push({
          start: now - 800,
          end: now + 1800,
          vehicleId: curr.id,
          dir: curr.direction,
        });
      }
    }

    // 3. RSU Assigns Conflict-Free Space-Time Trajectory Windows
    for (let i = 0; i < approaching.length; i++) {
      const v = approaching[i];
      const isEmergency = v.type === 'POLICE_PATROL' || v.type === 'EMERGENCY_AMBULANCE' || v.type === 'FIRE_ENGINE';
      const estimatedEntry = now + v.timeToIntersection * 1000;
      const traverseDurationMs = 1400; // ~1.4s to clear conflict box
      const estimatedExit = estimatedEntry + traverseDurationMs;

      // Check conflict against already reserved cross-lane trajectories and traffic light signals
      let hasConflict = false;
      let conflictEnd = 0;
      const isTrafficLightMode = this.state.trafficLightState.mode === 'TRAFFIC_LIGHTS';
      const vLight = (v.direction === 'NORTH') ? this.state.trafficLightState.northLight
        : (v.direction === 'SOUTH') ? this.state.trafficLightState.southLight
        : (v.direction === 'EAST') ? this.state.trafficLightState.eastLight
        : this.state.trafficLightState.westLight;

      const tlState = this.state.trafficLightState;
      if (isTrafficLightMode && (vLight === 'RED' || (vLight === 'YELLOW' && !v.beatingYellow) || tlState.isAllRedClearance) && !isEmergency && !v.enteredOnGreen) {
        // Red / Yellow traffic light is an absolute conflict! Vehicle must decelerate and yield at stop line.
        hasConflict = true;
        conflictEnd = now + 4000;
      } else {
        // In zero-light cooperative mode or green traffic light: check for cross-trajectory conflicts
        for (const b of bookedIntervals) {
          const isConflicting = (
            (v.direction === 'NORTH' || v.direction === 'SOUTH') && (b.dir === 'EAST' || b.dir === 'WEST')
          ) || (
            (v.direction === 'EAST' || v.direction === 'WEST') && (b.dir === 'NORTH' || b.dir === 'SOUTH')
          );

          if (isConflicting) {
            const margin = 800;
            if (Math.abs(estimatedEntry - b.start) < (traverseDurationMs + margin)) {
              hasConflict = true;
              conflictEnd = Math.max(conflictEnd, b.end + margin);
            }
          }
        }
      }

      if (hasConflict && !isEmergency) {
        // Vehicle must yield / slow down before stop line - NEVER enters intersection when yielding!
        v.hasSlotReserved = false;
        v.rsuAllocatedEntryMs = conflictEnd;

        if (v.distanceToStopLine <= 6) {
          // Clean stop before stop bar
          v.braking = true;
          v.brakeForce = 100;
          v.speed = 0;
          v.targetSpeed = 0;
          v.rsuAdvisoryAction = 'DECELERATE_YIELD';
        } else if (v.distanceToStopLine < 140) {
          // Smooth quadratic deceleration to halt cleanly at stop bar
          v.braking = true;
          const distRatio = Math.max(0, (v.distanceToStopLine - 4) / 136);
          v.targetSpeed = Math.min(v.targetSpeed, this.state.weatherState.recommendedSpeedKmh * Math.pow(distRatio, 1.2));
          v.brakeForce = Math.min(100, Math.max(35, (1 - distRatio) * 90));
          v.rsuAdvisoryAction = 'DECELERATE_YIELD';
        } else {
          v.targetSpeed = 22;
          v.braking = false;
          v.rsuAdvisoryAction = 'CACC_SPEED_ADJUST';
        }

        queueItems.push({
          vehicleId: v.id,
          name: v.name,
          type: v.type,
          direction: v.direction,
          speedKmh: Number(v.speed.toFixed(1)),
          timeToIntersectionSec: Number(v.timeToIntersection.toFixed(1)),
          distanceToStopLineMeters: Math.max(0, Math.round(v.distanceToStopLine)),
          dynamicPriorityScore: v.dynamicPriorityScore,
          priorityTier: v.priorityTier,
          advisoryAction: v.rsuAdvisoryAction,
          allocatedSlotStartMs: conflictEnd,
          allocatedSlotEndMs: conflictEnd + traverseDurationMs,
          status: 'APPROACHING',
        });
      } else {
        // RSU grants priority passage!
        v.hasSlotReserved = true;
        v.rsuAdvisoryAction = (v.type === 'EMERGENCY_AMBULANCE' || v.type === 'POLICE_PATROL') ? 'EMERGENCY_PREEMPT' : 'PASS_FULL_SPEED';
        v.rsuAllocatedEntryMs = estimatedEntry;

        // If not already constrained by a lead car ahead, set cruising clearance speed
        if (!v.braking) {
          const passSpeed = (v.type === 'EMERGENCY_AMBULANCE' || v.type === 'POLICE_PATROL') ? 55 : 44;
          v.targetSpeed = v.targetSpeed > 0 ? Math.min(passSpeed, v.targetSpeed) : passSpeed;
        }

        bookedIntervals.push({
          start: estimatedEntry,
          end: estimatedExit,
          vehicleId: v.id,
          dir: v.direction,
        });

        // Register slot in scheduler HUD
        if (!this.state.slots.some((s) => s.vehicleId === v.id)) {
          this.state.slots.push({
            slotId: `RSU-${v.id}-${Math.floor(estimatedEntry)}`,
            vehicleId: v.id,
            direction: v.direction,
            entryTimeMs: estimatedEntry,
            exitTimeMs: estimatedExit,
            priority: (v.type === 'POLICE_PATROL' || v.type === 'EMERGENCY_AMBULANCE' || v.type === 'FIRE_ENGINE') ? 1 : 2,
            status: 'SCHEDULED',
          });
        }

        queueItems.push({
          vehicleId: v.id,
          name: v.name,
          type: v.type,
          direction: v.direction,
          speedKmh: Number(v.speed.toFixed(1)),
          timeToIntersectionSec: Number(v.timeToIntersection.toFixed(1)),
          distanceToStopLineMeters: Math.max(0, Math.round(v.distanceToStopLine)),
          dynamicPriorityScore: v.dynamicPriorityScore,
          priorityTier: v.priorityTier,
          advisoryAction: v.rsuAdvisoryAction,
          allocatedSlotStartMs: estimatedEntry,
          allocatedSlotEndMs: estimatedExit,
          status: v.inConflictZone ? 'CROSSING' : 'SCHEDULED',
        });
      }

      // Preceding vehicle collision avoidance (CACC in same lane adapting to bumper distance)
      const weatherFollowingGapPx = this.state.weatherState.followingDistanceGapPx;
      const dimsCurr = getVehicleDimensions(v.type);
      const leadVehicle = this.state.vehicles.find(
        (other) =>
          other.id !== v.id &&
          other.direction === v.direction &&
          (other.lane === v.lane || (other.targetLane === v.lane && other.laneChangeProgress > 0.25)) &&
          other.distanceToStopLine < v.distanceToStopLine &&
          (v.distanceToStopLine - other.distanceToStopLine) < weatherFollowingGapPx
      );

      if (leadVehicle) {
        const dimsLead = getVehicleDimensions(leadVehicle.type);
        const actualBumperGap = (v.distanceToStopLine - leadVehicle.distanceToStopLine) - (dimsCurr.halfLength + dimsLead.halfLength);
        if (actualBumperGap <= 18) {
          v.braking = true;
          v.brakeForce = 100;
          v.targetSpeed = leadVehicle.speed <= 1.0 ? 0 : leadVehicle.speed * 0.85;
        } else {
          v.braking = true;
          v.brakeForce = Math.min(100, Math.max(50, 50 * this.state.weatherState.brakingDistanceMultiplier));
          v.targetSpeed = Math.min(v.targetSpeed, Math.max(0, leadVehicle.speed * 0.9));
        }
      }
    }

    // Ensure all vehicles already inside the intersection conflict box have absolute clearance priority
    for (const v of this.state.vehicles) {
      if (v.inConflictZone && !v.crossedIntersection) {
        v.hasSlotReserved = true;
        v.rsuAdvisoryAction = 'PASS_FULL_SPEED';
        if (v.speed < 24) {
          v.targetSpeed = Math.max(v.targetSpeed, 36);
          v.braking = false;
          v.brakeForce = 0;
        }
      }
    }

    this.state.rsuPriorityQueue = queueItems;
    this.state.stats.totalArbitrationsCompleted += approaching.length;
    this.state.rsuConfig.energySavedKWh += dt * 0.003 * Math.max(1, approaching.length);
  }

  private broadcastBSMPackets() {
    // Generate telemetry broadcast for active vehicles (at sample rate ~3Hz in UI)
    if (Math.random() > 0.4) return;

    for (const v of this.state.vehicles) {
      v.packetSequenceNumber++;
      const seq = v.packetSequenceNumber;
      const now = Date.now();

      // Check for active injected attack
      let isTampered = false;
      let isReplay = false;
      let isRogue = false;
      let isSpoofed = false;

      let telemetrySpeed = Number(v.speed.toFixed(1));
      let telemetryBraking = v.braking;
      let telemetryLat = 37.485200 + (v.y / 100000);
      let telemetryLon = -122.148300 + (v.x / 100000);

      if (this.state.activeAttack === 'TAMPERING' && Math.random() < 0.25) {
        isTampered = true;
        v.tampered = true;
        telemetryBraking = !v.braking; // Flip safety brake status in transit
      }

      if (this.state.activeAttack === 'REPLAY' && Math.random() < 0.25) {
        isReplay = true;
        v.replayActive = true;
      }

      if (this.state.activeAttack === 'SYBIL_ROGUE' && Math.random() < 0.25) {
        isRogue = true;
        v.rogue = true;
      }

      if (this.state.activeAttack === 'GPS_SPOOFING' && Math.random() < 0.25) {
        isSpoofed = true;
        v.spoofedGps = true;
        telemetryLat += 0.05; // 5km teleportation jump
      }

      const payloadString = JSON.stringify({
        vId: v.id,
        seq: isReplay ? Math.max(1, seq - 40) : seq,
        spd: telemetrySpeed,
        brk: telemetryBraking,
        t: isReplay ? now - 180000 : now,
      });

      // Compute cryptographic signature
      const sigHex = `30450220${Math.random().toString(16).substring(2, 10)}${Math.random().toString(16).substring(2, 10)}022100${Math.random().toString(16).substring(2, 10)}`;

      // Verification logic:
      let verified = true;
      let verificationStatus: BSMPacket['security']['verificationStatus'] = 'VALID';
      let rejectionReason: string | undefined = undefined;

      if (isTampered) {
        verified = false;
        verificationStatus = 'TAMPERED_PAYLOAD';
        rejectionReason = 'ECDSA NIST P-256 signature verification failed (SHA-256 digest mismatch)';
        this.state.stats.tamperedPacketsDropped++;
        this.logAttack('TAMPERING', v, 'Payload altered in transit: Emergency brake flag forged to 0.', 'ECDSA_VERIFIER');
      } else if (isReplay) {
        verified = false;
        verificationStatus = 'REPLAY_EXPIRED';
        rejectionReason = 'Monotonic sequence counter <= last seen or timestamp older than 50ms';
        this.state.stats.replaysBlocked++;
        this.logAttack('REPLAY', v, 'Stale packet replayed with old sequence #. Expired fresh window.', 'FRESHNESS_MONITOR');
      } else if (isRogue) {
        verified = false;
        verificationStatus = 'UNTRUSTED_ROOT_CA';
        rejectionReason = 'Signer certificate authority not recognized in IEEE 1609.2 SCMS trust store';
        this.logAttack('SYBIL_ROGUE', v, 'Unknown OBU pseudonym attempting to broadcast unverified telemetry.', 'PKI_REGISTRY');
      } else if (isSpoofed) {
        verified = false;
        verificationStatus = 'PLAUSIBILITY_FAILED';
        rejectionReason = 'Kinematic velocity plausibility check exceeded 120 km/h jump threshold';
        this.logAttack('GPS_SPOOFING', v, 'Kinematic coordinate teleportation detected (+5.2 km displacement).', 'KINEMATIC_FILTER');
      }

      const packet: BSMPacket = {
        id: `bsm-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        timestamp: now,
        simulatedTimeMs: this.state.simulatedTimeMs,
        senderId: v.id,
        vehicleName: v.name,
        pseudonymId: v.pseudonymCertId,
        sequenceNumber: seq,
        direction: v.direction,
        type: v.type,
        priorityFlag: v.priority,
        v2xOverrideCommand: v.priority
          ? (v.distanceToStopLine > 0 ? 'EMERGENCY_PULL_OVER' : 'YIELD_INTERSECTION')
          : undefined,
        telemetry: {
          speedKmh: telemetrySpeed,
          latitude: Number(telemetryLat.toFixed(6)),
          longitude: Number(telemetryLon.toFixed(6)),
          accelerationMs2: Number(v.acceleration.toFixed(2)),
          brakingActive: telemetryBraking,
          brakeForcePct: Math.floor(v.brakeForce),
          headingDeg: v.heading,
          distanceToCenter: Math.floor(v.distanceToStopLine + STOP_LINE_DIST),
          weatherCondition: this.state.weatherState.condition,
          surfaceFrictionMu: this.state.weatherState.frictionCoefficient,
          brakingDistanceMultiplier: this.state.weatherState.brakingDistanceMultiplier,
          brakingDistanceM: Number(((telemetrySpeed * telemetrySpeed) / (250 * this.state.weatherState.frictionCoefficient)).toFixed(1)),
          safeFollowingDistanceM: Number((this.state.weatherState.followingDistanceGapPx / 3.5).toFixed(1)),
          recommendedSpeedKmh: this.state.weatherState.recommendedSpeedKmh,
          opticalVisibilityM: this.state.weatherState.visibilityMeters,
          v2xPenetrationAdvantage: this.state.weatherState.v2xPenetrationAdvantage,
          wipersActive: v.wipersActive,
          fogLightsActive: v.fogLightsActive,
        },
        security: {
          algorithm: 'ECDSA_NIST_P256',
          signatureHex: sigHex,
          certDigest: v.publicKeyFingerprint,
          verified,
          verificationStatus,
          rejectionReason,
        },
      };

      this.state.packets.unshift(packet);
      if (this.state.packets.length > 50) {
        this.state.packets.pop();
      }
    }
  }

  private logAttack(
    type: SecurityAttackLog['attackType'],
    v: Vehicle,
    summary: string,
    detectedBy: SecurityAttackLog['detectedBy']
  ) {
    const existing = this.state.attackLogs.find((l) => l.targetVehicleId === v.id && l.attackType === type);
    if (existing) return;

    this.state.attackLogs.unshift({
      id: `atk-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      timestamp: new Date().toLocaleTimeString(),
      attackType: type,
      targetVehicleId: v.id,
      targetVehicleName: v.name,
      payloadSummary: summary,
      mitigationResult: type === 'SYBIL_ROGUE' ? 'ISOLATED' : 'DETECTED_DROPPED',
      detectedBy,
    });

    if (this.state.attackLogs.length > 25) {
      this.state.attackLogs.pop();
    }
  }

  private monitorNearbyTelemetryAndAvoidCollisions(dtSeconds: number) {
    if (!this.state.collisionMonitoringActive) return;

    const { vehicles } = this.state;
    let activeWarningCount = 0;
    const threatenedVehicles = new Set<string>();

    for (let i = 0; i < vehicles.length; i++) {
      const vA = vehicles[i];
      // Velocity vector of A in px/s
      const speedPxA = (vA.speed * 1000) / 3600 * 3.5;
      let vxA = 0;
      let vyA = 0;
      if (vA.direction === 'NORTH') vyA = speedPxA;
      else if (vA.direction === 'SOUTH') vyA = -speedPxA;
      else if (vA.direction === 'WEST') vxA = speedPxA;
      else if (vA.direction === 'EAST') vxA = -speedPxA;

      for (let j = i + 1; j < vehicles.length; j++) {
        const vB = vehicles[j];

        // 1. Check direct V2V DSRC/C-V2X radio communication range (~270px)
        const currentDist = Math.hypot(vA.x - vB.x, vA.y - vB.y);
        if (currentDist > 270) continue;

        // 2. Message Latency & Dead Reckoning
        // vA receives telemetry from vB that was emitted tau seconds ago
        const effectiveLatencySec = (this.state.globalNetworkLatencyMs + vB.networkLatencyMs) / 1000;
        const speedPxB = (vB.speed * 1000) / 3600 * 3.5;
        let vxB = 0;
        let vyB = 0;
        if (vB.direction === 'NORTH') vyB = speedPxB;
        else if (vB.direction === 'SOUTH') vyB = -speedPxB;
        else if (vB.direction === 'WEST') vxB = speedPxB;
        else if (vB.direction === 'EAST') vxB = -speedPxB;

        // Projected position of B by dead-reckoning forward through message latency
        const deadReckoningDx = vxB * effectiveLatencySec;
        const deadReckoningDy = vyB * effectiveLatencySec;
        vB.deadReckoningOffset = { dx: deadReckoningDx, dy: deadReckoningDy };
        vB.simulatedMessageLatencyMs = effectiveLatencySec * 1000;

        const projBx = vB.x + deadReckoningDx;
        const projBy = vB.y + deadReckoningDy;

        // 3. Closest Point of Approach (CPA)
        const relX = vA.x - projBx;
        const relY = vA.y - projBy;
        const relVx = vxA - vxB;
        const relVy = vyA - vyB;
        const relV2 = relVx * relVx + relVy * relVy;

        if (relV2 > 1.0) {
          // If either vehicle is stopped before the stop line, it is not a crossing threat
          const isPerpendicular = (
            (vA.direction === 'NORTH' || vA.direction === 'SOUTH') !==
            (vB.direction === 'NORTH' || vB.direction === 'SOUTH')
          );

          if (isPerpendicular) {
            // If one is stationary before its stop bar, ignore perpendicular threat
            if ((vA.speed < 2.0 && vA.distanceToStopLine > 0) || (vB.speed < 2.0 && vB.distanceToStopLine > 0)) {
              continue;
            }

            // In Traffic Light mode, enforce signal right-of-way
            if (this.state.trafficLightState.mode === 'TRAFFIC_LIGHTS') {
              const isEmA = vA.priority || vA.type === 'POLICE_PATROL' || vA.type === 'EMERGENCY_AMBULANCE' || vA.type === 'FIRE_ENGINE';
              const isEmB = vB.priority || vB.type === 'POLICE_PATROL' || vB.type === 'EMERGENCY_AMBULANCE' || vB.type === 'FIRE_ENGINE';

              const lightA = (vA.direction === 'NORTH') ? this.state.trafficLightState.northLight
                : (vA.direction === 'SOUTH') ? this.state.trafficLightState.southLight
                : (vA.direction === 'EAST') ? this.state.trafficLightState.eastLight
                : this.state.trafficLightState.westLight;

              const lightB = (vB.direction === 'NORTH') ? this.state.trafficLightState.northLight
                : (vB.direction === 'SOUTH') ? this.state.trafficLightState.southLight
                : (vB.direction === 'EAST') ? this.state.trafficLightState.eastLight
                : this.state.trafficLightState.westLight;

              // If vehicle A has green and vehicle B has red, BUT vehicle B is NOT an emergency vehicle and is stopped before stop line
              if (lightA === 'GREEN' && (lightB === 'RED' || lightB === 'YELLOW') && !isEmB && vB.distanceToStopLine > -8) {
                continue;
              }
              // If vehicle B has green and vehicle A has red, BUT vehicle A is NOT an emergency vehicle and is stopped before stop line
              if (lightB === 'GREEN' && (lightA === 'RED' || lightA === 'YELLOW') && !isEmA && vA.distanceToStopLine > -8) {
                continue;
              }
            }
          }

          const tCPA = -(relX * relVx + relY * relVy) / relV2;

          // Immediate collision threat window adapting to road weather & braking distance
          const weatherBrakingFactor = this.state.weatherState.brakingDistanceMultiplier;
          const threatTtcWindow = 2.2 * Math.sqrt(weatherBrakingFactor);

          if (tCPA > 0.05 && tCPA <= threatTtcWindow) {
            const cpaAx = vA.x + vxA * tCPA;
            const cpaAy = vA.y + vyA * tCPA;
            const cpaBx = projBx + vxB * tCPA;
            const cpaBy = projBy + vyB * tCPA;
            const dCPA = Math.hypot(cpaAx - cpaBx, cpaAy - cpaBy);

            // Critical threshold: closest approach distance scaling with surface grip & stopping distance
            const criticalDistPx = 36 * Math.min(1.4, Math.sqrt(weatherBrakingFactor));
            if (dCPA < criticalDistPx) {
              threatenedVehicles.add(vA.id);
              threatenedVehicles.add(vB.id);
              activeWarningCount++;

              vA.collisionAlert = true;
              vA.predictedTimeToCollision = Number(tCPA.toFixed(2));
              vA.latencyCompensatedTtc = Number(tCPA.toFixed(2));
              vA.conflictingVehicleId = vB.id;

              vB.collisionAlert = true;
              vB.predictedTimeToCollision = Number(tCPA.toFixed(2));
              vB.latencyCompensatedTtc = Number(tCPA.toFixed(2));
              vB.conflictingVehicleId = vA.id;

              // 4. Cooperative Evasive Action Strategy
              if (vA.direction === vB.direction) {
                // Check if vehicles are sharing or transitioning into the same lane
                const inSameLane = (vA.lane === vB.lane) ||
                  (vA.targetLane === vB.lane && vA.laneChangeProgress > 0.3) ||
                  (vB.targetLane === vA.lane && vB.laneChangeProgress > 0.3);

                if (!inSameLane) {
                  // Parallel vehicles in adjacent lanes (Lane 0 vs Lane 1) — safe passing!
                  continue;
                }

                // Same lane (Rear-End Threat)
                const isATrailing = (vA.direction === 'NORTH' && vA.y < vB.y) ||
                                    (vA.direction === 'SOUTH' && vA.y > vB.y) ||
                                    (vA.direction === 'WEST' && vA.x < vB.x) ||
                                    (vA.direction === 'EAST' && vA.x > vB.x);
                const trailer = isATrailing ? vA : vB;
                const leader = isATrailing ? vB : vA;

                trailer.braking = true;
                trailer.brakeForce = 100;
                trailer.targetSpeed = 0;
                trailer.activeManeuver = 'EMERGENCY_BRAKE';
                trailer.maneuverIntensity = 100;

                // If gap is critically short (< 40px), execute subtle evasive steering towards road shoulder
                if (currentDist < 40) {
                  trailer.activeManeuver = 'EVASIVE_STEER_RIGHT';
                  trailer.evasiveLateralOffset = Math.min(8, trailer.evasiveLateralOffset + dtSeconds * 25);
                  this.state.stats.collisionsAvoidedBySteer++;
                } else {
                  this.state.stats.collisionsAvoidedByAEB++;
                }

                this.logCollisionIncident(trailer, leader, tCPA, dCPA, effectiveLatencySec * 1000, trailer.activeManeuver, 'CRUISE');
              } else {
                // Crossing / T-Bone Collision Course
                let yielder = vA;
                let passVehicle = vB;

                const isEmA = vA.priority || vA.type === 'POLICE_PATROL' || vA.type === 'EMERGENCY_AMBULANCE' || vA.type === 'FIRE_ENGINE';
                const isEmB = vB.priority || vB.type === 'POLICE_PATROL' || vB.type === 'EMERGENCY_AMBULANCE' || vB.type === 'FIRE_ENGINE';
                const aPastStop = vA.inConflictZone || vA.distanceToStopLine <= 0;
                const bPastStop = vB.inConflictZone || vB.distanceToStopLine <= 0;

                if (isEmA && !isEmB) {
                  // If non-emergency vehicle is already deep in the conflict zone, let it clear rather than block the intersection
                  if (bPastStop && !aPastStop) {
                    yielder = vB;
                    passVehicle = vA;
                  } else {
                    yielder = vB;
                    passVehicle = vA;
                  }
                } else if (isEmB && !isEmA) {
                  if (aPastStop && !bPastStop) {
                    yielder = vA;
                    passVehicle = vB;
                  } else {
                    yielder = vA;
                    passVehicle = vB;
                  }
                } else if (aPastStop && !bPastStop) {
                  // Vehicle already past stop line or in intersection has absolute right-of-way
                  yielder = vB;
                  passVehicle = vA;
                } else if (bPastStop && !aPastStop) {
                  yielder = vA;
                  passVehicle = vB;
                } else if (aPastStop && bPastStop) {
                  // Both already inside/crossing: vehicle closer to departure exit has priority
                  if (vA.distanceToStopLine <= vB.distanceToStopLine) {
                    yielder = vB;
                    passVehicle = vA;
                  } else {
                    yielder = vA;
                    passVehicle = vB;
                  }
                } else {
                  // Both approaching before stop line: vehicle closer to entering has priority
                  if (vA.distanceToStopLine <= vB.distanceToStopLine) {
                    yielder = vB;
                    passVehicle = vA;
                  } else {
                    yielder = vA;
                    passVehicle = vB;
                  }
                }

                // Execute cooperative avoidance:
                if (yielder.inConflictZone || yielder.distanceToStopLine <= 0) {
                  // Already inside or crossing intersection: DO NOT FREEZE TO 0!
                  // Modulate speed to allow leader to clear safely while maintaining departure forward momentum
                  yielder.targetSpeed = Math.max(18, yielder.speed * 0.75);
                  yielder.braking = yielder.speed > yielder.targetSpeed;
                  yielder.brakeForce = 35;
                  if (yielder.activeManeuver === 'EMERGENCY_BRAKE') {
                    yielder.activeManeuver = 'NONE';
                  }
                } else {
                  // Approaching before stop line: Autonomous Emergency Braking (AEB) cleanly before intersection
                  yielder.braking = true;
                  yielder.brakeForce = 100;
                  yielder.targetSpeed = 0;
                  yielder.activeManeuver = 'EMERGENCY_BRAKE';
                  yielder.maneuverIntensity = 100;
                }

                // Priority vehicle clears intersection without steering disturbance
                passVehicle.braking = false;
                passVehicle.brakeForce = 0;
                passVehicle.activeManeuver = 'NONE';
                passVehicle.targetSpeed = Math.max(passVehicle.targetSpeed, 40);

                this.state.stats.collisionsAvoidedByAEB++;

                this.logCollisionIncident(
                  yielder,
                  passVehicle,
                  tCPA,
                  dCPA,
                  effectiveLatencySec * 1000,
                  'EMERGENCY_BRAKE',
                  'CRUISE'
                );
              }
            }
          }
        }
      }
    }

    // 5. Recovery for vehicles no longer in immediate collision threat
    for (const v of vehicles) {
      if (!threatenedVehicles.has(v.id)) {
        v.collisionAlert = false;
        v.predictedTimeToCollision = null;
        v.conflictingVehicleId = null;

        // If vehicle executed emergency braking for a collision that is now resolved, restore cruising speed
        if (v.activeManeuver === 'EMERGENCY_BRAKE' && !v.yieldingToRedEmergency && v.v2iReaction !== 'STOPPED_AT_RED' && v.v2iReaction !== 'DECELERATING_FOR_RED') {
          v.activeManeuver = 'NONE';
          v.maneuverIntensity = 0;
          v.braking = false;
          v.brakeForce = 0;
          v.targetSpeed = this.state.weatherState.recommendedSpeedKmh;
        }

        // Smoothly ease lateral offset back to 0 (re-center vehicle in lane)
        if (Math.abs(v.evasiveLateralOffset) > 0.2) {
          const step = dtSeconds * 20;
          if (v.evasiveLateralOffset > 0) {
            v.evasiveLateralOffset = Math.max(0, v.evasiveLateralOffset - step);
          } else {
            v.evasiveLateralOffset = Math.min(0, v.evasiveLateralOffset + step);
          }
        } else {
          v.evasiveLateralOffset = 0;
          if (v.activeManeuver !== 'NONE' && v.activeManeuver !== 'SPEED_UP_YELLOW' && v.activeManeuver !== 'PULL_OVER_EMERGENCY') {
            v.activeManeuver = 'NONE';
            v.maneuverIntensity = 0;
          }
        }
      }
    }

    this.state.activeCollisionWarningCount = activeWarningCount;
  }

  private logCollisionIncident(
    vA: Vehicle,
    vB: Vehicle,
    ttc: number,
    cpaDistPx: number,
    latencyMs: number,
    maneuverA: CollisionIncident['maneuverExecutedA'],
    maneuverB: CollisionIncident['maneuverExecutedB']
  ) {
    const existing = this.state.collisionIncidents.find(
      (inc) => (inc.vehicleAId === vA.id && inc.vehicleBId === vB.id) ||
               (inc.vehicleAId === vB.id && inc.vehicleBId === vA.id)
    );
    if (existing) return;

    const outcome: CollisionIncident['outcome'] =
      maneuverA === 'EVASIVE_STEER_RIGHT' || maneuverB === 'EVASIVE_STEER_RIGHT'
        ? 'COLLISION_PREVENTED_BY_STEER'
        : 'COLLISION_PREVENTED_BY_AEB';

    this.state.collisionIncidents.unshift({
      id: `c-inc-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      timestamp: new Date().toLocaleTimeString(),
      vehicleAId: vA.id,
      vehicleAName: vA.name,
      vehicleBId: vB.id,
      vehicleBName: vB.name,
      timeToCollisionSec: Number(ttc.toFixed(2)),
      measuredLatencyMs: Number(latencyMs.toFixed(1)),
      maneuverExecutedA: maneuverA,
      maneuverExecutedB: maneuverB,
      outcome,
      cpaDistanceMeters: Number((cpaDistPx / 3.5).toFixed(1)),
    });

    if (this.state.collisionIncidents.length > 20) {
      this.state.collisionIncidents.pop();
    }

    // Trigger Real-Time Toast Notification Alert
    const threatLevel: CollisionRiskAlert['threatLevel'] = 
      ttc <= 0.85 ? 'CRITICAL' : ttc <= 1.6 ? 'HIGH' : 'WARNING';

    const resolutionAction: CollisionRiskAlert['resolutionAction'] = 
      maneuverA === 'EVASIVE_STEER_RIGHT' || maneuverB === 'EVASIVE_STEER_RIGHT'
        ? 'EVASIVE_STEERING'
        : (vA.braking || vB.braking)
          ? 'AEB_ENGAGED'
          : 'YIELD_DECELERATION';

    const alert: CollisionRiskAlert = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toLocaleTimeString(),
      simulatedTimeMs: this.state.simulatedTimeMs,
      nodeA: {
        id: vA.id,
        name: vA.name,
        type: vA.type,
        direction: vA.direction,
        lane: vA.lane,
        speedKmh: Number(vA.speed.toFixed(1)),
        activeManeuver: maneuverA,
      },
      nodeB: {
        id: vB.id,
        name: vB.name,
        type: vB.type,
        direction: vB.direction,
        lane: vB.lane,
        speedKmh: Number(vB.speed.toFixed(1)),
        activeManeuver: maneuverB,
      },
      timeToCollisionSec: Number(ttc.toFixed(2)),
      cpaDistanceMeters: Number((cpaDistPx / 3.5).toFixed(1)),
      measuredLatencyMs: Number(latencyMs.toFixed(1)),
      threatLevel,
      resolutionAction,
      summary: `${vA.name} [${vA.direction}] and ${vB.name} [${vB.direction}] on collision course. ${outcome.replace(/_/g, ' ')} executed via V2X.`,
    };

    this.emitCollisionAlert(alert);
  }

  private updateDensityHeatmap(dtSeconds: number) {
    const { densityGrid, vehicles, collisionIncidents, activeAttack } = this.state;
    const densityDecay = Math.max(0, 1 - dtSeconds * 0.15); // gentle decay to preserve hotspot memory
    const riskDecay = Math.max(0, 1 - dtSeconds * 0.22); // risk decay
    const interferenceDecay = Math.max(0, 1 - dtSeconds * 0.28); // RF interference decay

    let maxDensity = 0;
    let maxCollisionRisk = 0;
    let maxInterference = 0.04;
    let sumInterference = 0;
    let highRiskZoneCount = 0;

    // 1. Decay current cells toward baseline
    for (const cell of densityGrid) {
      cell.density *= densityDecay;
      if (cell.density < 0.005) cell.density = 0;

      cell.collisionRisk *= riskDecay;
      if (cell.collisionRisk < 0.005) cell.collisionRisk = 0;

      // Ambient baseline RF noise floor is ~0.04 (-93 dBm)
      cell.signalInterference = Math.max(0.04, cell.signalInterference * interferenceDecay);
    }

    // 2. Identify active intersection conflict load
    const vehiclesNearCenter = vehicles.filter(
      (v) => Math.hypot(v.x - CENTER, v.y - CENTER) < (HALF_ROAD + 40) && !v.crossedIntersection
    );
    const uniqueCenterApproaches = new Set(vehiclesNearCenter.map((v) => v.direction));
    const isCenterCrossConflict = uniqueCenterApproaches.size >= 2;

    // 3. Inject Collision Risk from Active Vehicles & Trajectory Conflicts
    for (const v of vehicles) {
      if (v.x < 0 || v.x >= CANVAS_SIZE || v.y < 0 || v.y >= CANVAS_SIZE) continue;

      const col = Math.floor(v.x / CELL_SIZE);
      const row = Math.floor(v.y / CELL_SIZE);

      if (col >= 0 && col < GRID_CELLS && row >= 0 && row < GRID_CELLS) {
        const cell = densityGrid[row * GRID_CELLS + col];
        
        // Heat multiplier for vehicle density & dwell
        let heatRate = 0.6;
        if (v.braking || v.speed < 20) {
          heatRate = 1.6;
        } else if (v.speed < 30) {
          heatRate = 1.0;
        }

        cell.density = Math.min(1.0, cell.density + dtSeconds * heatRate);
        cell.dwellCount += 1;
        cell.avgSpeed = cell.avgSpeed * 0.96 + v.speed * 0.04;

        // Bottleneck score: density weighted by speed reduction
        const speedDeficit = Math.max(0, 1 - (cell.avgSpeed / 45));
        cell.bottleneckScore = Math.min(100, Math.round(cell.density * 55 + speedDeficit * 45));

        // Collision Risk Injection for vehicle's immediate footprint
        let riskRate = 0.25;
        if (v.collisionAlert) {
          riskRate += 3.2; // Critical collision alert active
        }
        if (v.activeManeuver === 'EMERGENCY_BRAKE') {
          riskRate += 3.5;
        } else if (v.activeManeuver === 'EVASIVE_STEER_LEFT' || v.activeManeuver === 'EVASIVE_STEER_RIGHT') {
          riskRate += 2.4;
        } else if (v.braking) {
          riskRate += (v.brakeForce / 100) * 1.6;
        }

        // Proximity to stop line on red signal creates queue compression risk
        if (v.distanceToStopLine <= 24 && v.distanceToStopLine > 0 && v.v2iReaction === 'STOPPED_AT_RED') {
          riskRate += 0.9;
        }

        cell.collisionRisk = Math.min(1.0, cell.collisionRisk + dtSeconds * riskRate);

        // Forward Trajectory Collision Cone Projection (where vehicle is heading in next 1.2s)
        const speedMs = (v.speed * 1000) / 3600;
        const forwardPx = Math.min(75, speedMs * 3.5 * 1.2);
        let fwdX = v.x;
        let fwdY = v.y;
        if (v.direction === 'NORTH') fwdY += forwardPx;
        else if (v.direction === 'SOUTH') fwdY -= forwardPx;
        else if (v.direction === 'WEST') fwdX += forwardPx;
        else if (v.direction === 'EAST') fwdX -= forwardPx;

        const fwdCol = Math.floor(fwdX / CELL_SIZE);
        const fwdRow = Math.floor(fwdY / CELL_SIZE);
        if (fwdCol >= 0 && fwdCol < GRID_CELLS && fwdRow >= 0 && fwdRow < GRID_CELLS) {
          const fwdCell = densityGrid[fwdRow * GRID_CELLS + fwdCol];
          const fwdRiskWeight = v.collisionAlert ? 1.8 : 0.6;
          fwdCell.collisionRisk = Math.min(1.0, fwdCell.collisionRisk + dtSeconds * fwdRiskWeight);
        }
      }
    }

    // 4. Collision Risk in Central Space-Time Conflict Box (Intersecting paths)
    if (isCenterCrossConflict) {
      const conflictBoost = Math.min(1.0, (uniqueCenterApproaches.size - 1) * 0.45);
      for (const cell of densityGrid) {
        if (cell.zone === 'CONFLICT_CENTER') {
          cell.collisionRisk = Math.min(1.0, cell.collisionRisk + dtSeconds * conflictBoost * 1.4);
        }
      }
    }

    // 5. Recent Near-Miss Incidents radiate residual risk hotspot
    const recentIncidents = collisionIncidents.slice(0, 4);
    for (const inc of recentIncidents) {
      // Find approximate center of incident
      const cell = densityGrid.find((c) => c.zone === 'CONFLICT_CENTER');
      if (cell) {
        cell.collisionRisk = Math.min(1.0, cell.collisionRisk + dtSeconds * 0.7);
      }
    }

    // 6. Compute V2X 5.9 GHz Sidelink Signal Interference & RF Channel Contention
    // CSMA/CA Channel Busy Ratio (CBR) rises with vehicle density within local packet transmission range (~130px)
    const attackBoost = activeAttack === 'SYBIL_ROGUE' ? 0.65
      : activeAttack === 'REPLAY' ? 0.42
      : activeAttack === 'TAMPERING' ? 0.35
      : activeAttack === 'GPS_SPOOFING' ? 0.48
      : 0;

    const rsuX = CENTER - 85;
    const rsuY = CENTER - 85;

    for (const cell of densityGrid) {
      // Count local transmitters within 130px radius
      let localTransmitters = 0;
      let hasEmergencyTransmitter = false;

      for (const v of vehicles) {
        const d = Math.hypot(cell.worldX - v.x, cell.worldY - v.y);
        if (d < 135) {
          localTransmitters++;
          if (v.priority || v.type === 'EMERGENCY_AMBULANCE' || v.type === 'POLICE_PATROL' || v.type === 'FIRE_ENGINE') {
            hasEmergencyTransmitter = true;
          }
        }
      }

      // Physical Sidelink channel contention calculation (Half-duplex packet collisions at 5.9 GHz)
      let targetRf = 0.05; // baseline clear noise floor (-92 dBm)
      if (localTransmitters >= 2) {
        targetRf += Math.min(0.45, (localTransmitters - 1) * 0.09);
      }
      if (hasEmergencyTransmitter) {
        targetRf += 0.25; // High-power emergency preemption strobe burst
      }

      // Corner building NLOS multipath shadowing
      if (cell.zone === 'SHOULDER') {
        const distToCenter = Math.hypot(cell.worldX - CENTER, cell.worldY - CENTER);
        if (distToCenter > 130) {
          targetRf += 0.06; // Multipath wall reflection noise
        }
      }

      // Cyber Attack spatial RF distortion injection
      if (attackBoost > 0) {
        if (activeAttack === 'SYBIL_ROGUE') {
          // Rogue node broadcasting spoofed packets centered around intersection mouth
          const distToRogue = Math.hypot(cell.worldX - (CENTER + 30), cell.worldY - (CENTER + 30));
          if (distToRogue < 200) {
            targetRf += attackBoost * (1 - distToRogue / 200);
          }
        } else if (activeAttack === 'GPS_SPOOFING') {
          // Spatial ephemeris phase noise across center
          const distToCenter = Math.hypot(cell.worldX - CENTER, cell.worldY - CENTER);
          if (distToCenter < 240) {
            targetRf += attackBoost * (1 - distToCenter / 240);
          }
        } else {
          // Replay or Tampering broadcast flood across approach corridors
          if (cell.zone !== 'SHOULDER') {
            targetRf += attackBoost * 0.75;
          }
        }
      }

      // RSU SPaT Antenna proximity factor (attenuation with distance from RSU)
      const distToRsu = Math.hypot(cell.worldX - rsuX, cell.worldY - rsuY);
      const rsuPathLoss = Math.min(0.12, (distToRsu / 400) * 0.12);
      targetRf += rsuPathLoss;

      // Smooth exponential filter towards target RF load
      const alpha = Math.min(1.0, dtSeconds * 2.2);
      cell.signalInterference = Math.min(1.0, Math.max(0.04, cell.signalInterference * (1 - alpha) + targetRf * alpha));

      // Convert to physical signal power levels: -95 dBm (clean ambient) to -38 dBm (saturated/jammed)
      cell.interferenceDbm = Math.round(-95 + cell.signalInterference * 57);

      // 7. Composite Risk (Dual-Factor Kinetic Collision + V2X Radio Degradation)
      cell.compositeRisk = Math.min(1.0, cell.collisionRisk * 0.55 + cell.signalInterference * 0.45);

      // Track global extremes
      if (cell.density > maxDensity) maxDensity = cell.density;
      if (cell.collisionRisk > maxCollisionRisk) maxCollisionRisk = cell.collisionRisk;
      if (cell.signalInterference > maxInterference) maxInterference = cell.signalInterference;
      sumInterference += cell.signalInterference;
      if (cell.collisionRisk > 0.45 || cell.signalInterference > 0.6) {
        highRiskZoneCount++;
      }
    }

    this.state.stats.peakDensityIndex = Math.round(maxDensity * 100);

    // Compute top bottleneck zone aggregates
    const zoneScores: Record<string, { sumScore: number; count: number; sumSpeed: number; sumRisk: number; sumInterf: number }> = {
      NORTH_APPROACH: { sumScore: 0, count: 0, sumSpeed: 0, sumRisk: 0, sumInterf: 0 },
      SOUTH_APPROACH: { sumScore: 0, count: 0, sumSpeed: 0, sumRisk: 0, sumInterf: 0 },
      EAST_APPROACH: { sumScore: 0, count: 0, sumSpeed: 0, sumRisk: 0, sumInterf: 0 },
      WEST_APPROACH: { sumScore: 0, count: 0, sumSpeed: 0, sumRisk: 0, sumInterf: 0 },
      CONFLICT_CENTER: { sumScore: 0, count: 0, sumSpeed: 0, sumRisk: 0, sumInterf: 0 },
    };

    for (const cell of densityGrid) {
      if (zoneScores[cell.zone]) {
        zoneScores[cell.zone].sumScore += cell.bottleneckScore;
        zoneScores[cell.zone].sumSpeed += cell.avgSpeed;
        zoneScores[cell.zone].sumRisk += cell.collisionRisk;
        zoneScores[cell.zone].sumInterf += cell.signalInterference;
        zoneScores[cell.zone].count += 1;
      }
    }

    // Determine zone with highest composite risk
    let mostCongestedZone = 'Central Space-Time Conflict Zone';
    let highestZoneRisk = 0;
    for (const [zKey, zData] of Object.entries(zoneScores)) {
      if (zData.count > 0) {
        const avgZoneRisk = (zData.sumRisk + zData.sumInterf) / (zData.count * 2);
        if (avgZoneRisk > highestZoneRisk) {
          highestZoneRisk = avgZoneRisk;
          mostCongestedZone = zKey.replace('_', ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
        }
      }
    }

    // Update real-time spatial heatmap stats HUD
    this.state.spatialHeatmapStats = {
      peakCollisionRisk: Math.round(maxCollisionRisk * 100),
      peakInterferenceDbm: Math.round(-95 + maxInterference * 57),
      highRiskZoneCount,
      channelCongestionPct: Math.min(100, Math.round((sumInterference / densityGrid.length) * 160)),
      mostCongestedZone,
    };

    const zonesMeta: Record<string, { name: string; recGood: string; recHeavy: string }> = {
      NORTH_APPROACH: {
        name: 'North Inbound Stop Corridor',
        recGood: 'Free flow: 10Hz BSM cooperative cruise maintaining target headroom.',
        recHeavy: 'Bottleneck warning: Upstream CACC velocity advisory recommended (-5 km/h).',
      },
      SOUTH_APPROACH: {
        name: 'South Inbound Stop Corridor',
        recGood: 'Clear queue: Slot negotiation proceeding with zero deceleration waves.',
        recHeavy: 'Bottleneck detected: Increase conflict reservation buffer by +200ms.',
      },
      EAST_APPROACH: {
        name: 'East Cross-Traffic Merging Zone',
        recGood: 'Steady merging: Lateral weave corridor fully clear.',
        recHeavy: 'Congestion wave: Priority slot allocation holding North traffic momentarily.',
      },
      WEST_APPROACH: {
        name: 'West Inbound Merging Corridor',
        recGood: 'Synchronized traversal: Inter-vehicle headway gap stable at 45m.',
        recHeavy: 'Elevated dwell time: Deceleration index 68%; dynamic spacing active.',
      },
      CONFLICT_CENTER: {
        name: 'Central Space-Time Conflict Zone',
        recGood: 'Zero conflict: Autonomous slots woven with 1.4s safety buffer.',
        recHeavy: 'Critical conflict density: Emergency AEB standby armed on approaching units.',
      },
    };

    this.state.bottleneckZones = Object.keys(zoneScores).map((key) => {
      const z = zoneScores[key];
      const avgScore = z.count > 0 ? Math.round(z.sumScore / z.count) : 0;
      const avgSpd = z.count > 0 ? Number((z.sumSpeed / z.count).toFixed(1)) : 40;
      const meta = zonesMeta[key];
      const severity: BottleneckZone['severity'] = avgScore > 45 ? 'SEVERE' : avgScore > 20 ? 'MODERATE' : 'OPTIMAL';

      return {
        id: `bz-${key.toLowerCase()}`,
        name: meta.name,
        bottleneckScore: avgScore,
        avgSpeedKmh: avgSpd,
        severity,
        recommendation: severity === 'OPTIMAL' ? meta.recGood : meta.recHeavy,
      };
    }).sort((a, b) => b.bottleneckScore - a.bottleneckScore);
  }

  public triggerCollisionCourseScenario() {
    // Spawns 2 vehicles on direct, unreserved intersecting trajectory at 52 km/h
    // Timed to arrive at the intersection center at the exact same moment
    const vNorth = this.spawnVehicle('NORTH', 'STANDARD_AV', 'STRAIGHT', 52);
    vNorth.y = CENTER - 180;
    vNorth.hasSlotReserved = false;

    const vWest = this.spawnVehicle('WEST', 'STANDARD_AV', 'STRAIGHT', 52);
    vWest.x = CENTER - 180;
    vWest.hasSlotReserved = false;

    this.emitCollisionAlert({
      id: `alert-test-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      simulatedTimeMs: this.state.simulatedTimeMs,
      nodeA: {
        id: vNorth.id,
        name: vNorth.name,
        type: vNorth.type,
        direction: vNorth.direction,
        lane: vNorth.lane,
        speedKmh: 52,
        activeManeuver: 'APPROACHING_INTERSECTION',
      },
      nodeB: {
        id: vWest.id,
        name: vWest.name,
        type: vWest.type,
        direction: vWest.direction,
        lane: vWest.lane,
        speedKmh: 52,
        activeManeuver: 'APPROACHING_INTERSECTION',
      },
      timeToCollisionSec: 1.65,
      cpaDistanceMeters: 0.0,
      measuredLatencyMs: this.state.globalNetworkLatencyMs,
      threatLevel: 'CRITICAL',
      resolutionAction: 'AEB_ENGAGED',
      summary: `Direct conflict scenario initialized: ${vNorth.name} [NORTH] & ${vWest.name} [WEST] on unreserved crossing vector at 52 km/h.`,
    });
  }

  public triggerCollisionStressTest() {
    // Spawns 4 vehicles from North, South, East, West with synchronized high speeds
    // to test dynamic coordination deceleration matrix
    this.spawnVehicle('NORTH', 'STANDARD_AV', 'STRAIGHT', 52);
    this.spawnVehicle('EAST', 'STANDARD_AV', 'STRAIGHT', 50);
    this.spawnVehicle('SOUTH', 'EMERGENCY_AMBULANCE', 'STRAIGHT', 55);
    this.spawnVehicle('WEST', 'STANDARD_AV', 'STRAIGHT', 48);
  }

  public triggerRedEmergencyScenario() {
    // 1. Force North to have GREEN signal
    this.forceApproachGreen('NORTH');

    // 2. Spawn a civilian vehicle on North (cruising towards the green light)
    const vGreen = this.spawnVehicle('NORTH', 'STANDARD_AV', 'STRAIGHT', 42);
    vGreen.y = CENTER - 180;
    vGreen.distanceToStopLine = 76;

    // 3. Spawn an emergency ambulance on West (which faces a RED signal)
    // with sirens and emergency priority active, heading through the intersection
    const vRedEmergency = this.spawnVehicle('WEST', 'EMERGENCY_AMBULANCE', 'STRAIGHT', 55);
    vRedEmergency.x = CENTER - 165;
    vRedEmergency.distanceToStopLine = 61;
    vRedEmergency.priority = true;
    vRedEmergency.v2xPrioritySignalActive = true;
  }
}
