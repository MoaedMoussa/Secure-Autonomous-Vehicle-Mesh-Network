/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Direction = 'NORTH' | 'SOUTH' | 'EAST' | 'WEST';
export type TurnIntent = 'STRAIGHT' | 'LEFT' | 'RIGHT';
export type VehicleType = 'STANDARD_AV' | 'EMERGENCY_AMBULANCE' | 'POLICE_PATROL' | 'FIRE_ENGINE' | 'HEAVY_TRUCK';
export type DriverPersonality = 'HUMAN_AGGRESSIVE' | 'CAUTIOUS_HUMAN' | 'AUTONOMOUS_V2X';
export type LightColor = 'RED' | 'YELLOW' | 'GREEN';
export type TrafficPhase =
  | 'NORTH_GREEN'
  | 'NORTH_YELLOW'
  | 'CLEARANCE_RED_NORTH'
  | 'EAST_GREEN'
  | 'EAST_YELLOW'
  | 'CLEARANCE_RED_EAST'
  | 'SOUTH_GREEN'
  | 'SOUTH_YELLOW'
  | 'CLEARANCE_RED_SOUTH'
  | 'WEST_GREEN'
  | 'WEST_YELLOW'
  | 'CLEARANCE_RED_WEST'
  | 'NS_GREEN'
  | 'NS_YELLOW'
  | 'ALL_RED_1'
  | 'EW_GREEN'
  | 'EW_YELLOW'
  | 'ALL_RED_2';
export type WeatherCondition = 'CLEAR' | 'RAIN' | 'DENSE_FOG' | 'SNOW_ICE';

export interface WeatherState {
  condition: WeatherCondition;
  label: string;
  frictionCoefficient: number; // mu: dry 0.85, rain 0.48, fog 0.70, snow/ice 0.22
  visibilityMeters: number; // clear 250m, rain 85m, fog 30m, snow 55m
  brakingDistanceMultiplier: number; // 1.0x (clear), 1.75x (rain), 1.25x (fog), 2.85x (ice)
  followingDistanceGapPx: number; // Safe car-following gap in px: 54px (clear), 92px (rain), 108px (fog), 135px (ice)
  recommendedSpeedKmh: number; // 45 (clear), 34 (rain), 28 (fog), 22 (ice)
  precipitationIntensity: number; // 0.0 to 1.0
  fogDensity: number; // 0.0 to 1.0
  v2xPenetrationAdvantage: boolean; // 5.9GHz penetrates fog/rain whereas visual cameras degrade
}

export interface TrafficLightControllerState {
  mode: 'TRAFFIC_LIGHTS' | 'V2X_COOPERATIVE_ONLY' | 'HYBRID_SMART';
  phase: TrafficPhase;
  activeDirection: Direction | null;
  northLight: LightColor;
  southLight: LightColor;
  eastLight: LightColor;
  westLight: LightColor;
  nsLight: LightColor; // for backward compatibility
  ewLight: LightColor; // for backward compatibility
  isAllRedClearance: boolean;
  clearanceDurationSec: number; // 3.0s
  clearanceTimeRemainingSec: number;
  phaseTimeRemainingSec: number;
  phaseDurationSec: number;
  emergencyPreemptionActive: boolean;
  preemptedDirection: Direction | null;
  cycleSpeedMultiplier: number;
}

export interface SPaTBroadcast {
  messageId: string;
  intersectionId: string;
  timestampMs: number;
  frequencyGhz: number; // 5.895 GHz (C-V2X / DSRC Channel 172)
  currentPhase: TrafficPhase;
  activeDirection: Direction | 'NONE';
  northLight: LightColor;
  southLight: LightColor;
  eastLight: LightColor;
  westLight: LightColor;
  nsLight: LightColor;
  ewLight: LightColor;
  isAllRedClearance: boolean;
  clearanceTimeRemainingSec: number;
  timeRemainingSec: number;
  phaseDurationSec: number;
  emergencyPreemption: boolean;
  glosaAdvisorySpeedKmh: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  txPowerDbm: number;
  packetCounter: number;
  signature: string;
}

export interface TrafficLightRSUState {
  id: string;
  name: string;
  x: number;
  y: number;
  frequencyGhz: number;
  broadcastRangePx: number;
  totalPacketsBroadcast: number;
  activeSPaT: SPaTBroadcast;
  connectedVehicleCount: number;
  glosaActive: boolean;
  rsuOperationalStatus: 'BROADCASTING_SPAT' | 'EMERGENCY_PREEMPTION' | 'STANDBY_COOPERATIVE';
}

export type VehicleLifecycleState = 
  | 'SPAWNED' 
  | 'APPROACHING' 
  | 'QUEUED_RED' 
  | 'HOLDING_BOX' 
  | 'ENTERING_INTERSECTION' 
  | 'CROSSING' 
  | 'PULLING_OVER'
  | 'DEPARTING' 
  | 'EXITED' 
  | 'DEADLOCK_RECOVERED';

export interface VehicleLifecycleEvent {
  id: string;
  vehicleId: string;
  vehicleName: string;
  vehicleType: VehicleType;
  direction: Direction;
  lane: number;
  state: VehicleLifecycleState;
  previousState?: VehicleLifecycleState;
  timestampMs: number;
  timeStr: string;
  speedKmh: number;
  distanceToStopLine: number;
  message: string;
}

export interface Vehicle {
  id: string;
  name: string;
  type: VehicleType;
  priority: boolean; // High-priority flag (e.g., ambulances, police, fire, emergency convoy)
  v2xPrioritySignalActive: boolean; // Transmitting high-priority V2X preemption broadcast
  prioritySignalReceivedFrom: string | null; // ID of priority vehicle broadcasting override signal
  direction: Direction;
  lane: number; // 0: inner express/emergency corridor, 1: outer cruising/pull-over lane
  targetLane: number; // 0 or 1 for smooth lane-changing transitions
  laneChangeProgress: number; // 0 (settled in current lane) to 1 (lane change complete)
  overtaking: boolean; // currently executing overtaking maneuver in adjacent lane
  turnIntent: TurnIntent;
  x: number;
  y: number;
  speed: number; // km/h
  targetSpeed: number; // km/h
  acceleration: number; // m/s²
  braking: boolean;
  brakeForce: number; // 0 to 100%
  heading: number; // degrees
  color: string;
  distanceToStopLine: number; // meters
  timeToIntersection: number; // seconds
  hasSlotReserved: boolean;
  reservedSlotStart?: number; // simulation timestamp
  reservedSlotEnd?: number;
  inConflictZone: boolean;
  crossedIntersection: boolean;
  enteredOnGreen: boolean; // Successfully passed stop line on green or yellow signal
  // Lifecycle Tracking & Watchdog
  lifecycleState: VehicleLifecycleState;
  timeStalledSec: number;
  // Human & Traffic Light Behavior State
  driverPersonality: DriverPersonality;
  beatingYellow: boolean; // Speeding up to beat yellow light
  yieldingToEmergency: boolean; // Pulling over for police/ambulance/fire
  yieldingToRedEmergency: boolean; // Green-light vehicle holding at stop line / yielding to emergency vehicle approaching/crossing on RED
  emergencyDetectedId: string | null; // ID of emergency vehicle being yielded to
  emergencyDetectedDistance: number | null; // Distance to conflicting emergency vehicle in px
  hazardLights: boolean;
  headlights: boolean;
  turnSignal: 'NONE' | 'LEFT' | 'RIGHT' | 'HAZARD';
  wipersActive: boolean;
  fogLightsActive: boolean;
  // Realistic Kinematic Bicycle & IDM+ Dynamics
  massKg: number; // Vehicle curb + payload mass (e.g. 1550kg sedan, 2800kg ambulance, 8500kg truck)
  wheelbaseM: number; // Axle-to-axle distance L (e.g. 2.7m sedan, 3.4m emergency, 6.8m heavy)
  steerAngleDeg: number; // Front wheel steering angle delta (-30 to +30 deg)
  pitchAngleDeg: number; // Chassis dive under braking / squat under accel (-3 to +3 deg)
  rollAngleDeg: number; // Centrifugal body roll during turns / lane changes (-4 to +4 deg)
  longitudinalAccelMs2: number; // IDM+ computed longitudinal acceleration (m/s²)
  lateralAccelMs2: number; // Centripetal lateral acceleration (m/s²)
  absActive: boolean; // Anti-lock braking system pulsating on low friction
  espActive: boolean; // Electronic stability program active
  enginePowerKw: number; // Engine output rating
  dragForceN: number; // Aerodynamic drag + rolling resistance opposing motion (N)
  weatherTelemetry: {
    surfaceFrictionMu: number;
    brakingDistanceMeters: number;
    safeFollowingDistanceMeters: number;
    opticalVisibilityMeters: number;
    tractionControlActive: boolean;
    v2xPenetrationAdvantage: boolean;
  };
  // V2I / Traffic Light RSU Signal Reception & AI Reaction
  v2iSignalReceived?: {
    rsuId: string;
    light: LightColor;
    phase: TrafficPhase;
    timeRemainingSec: number;
    advisorySpeedKmh: number;
    signalStrengthDbm: number;
    emergencyPreemption: boolean;
  } | null;
  v2iReaction: 'DECELERATING_FOR_RED' | 'STOPPED_AT_RED' | 'GLOSA_CRUISE_GREEN' | 'ACCELERATING_YELLOW' | 'SLOWING_YELLOW' | 'EMERGENCY_OVERRIDE' | 'WAITING_FOR_EMERGENCY_CROSSING' | 'WAITING_FOR_BOX_CLEARANCE' | 'NONE';
  // Collision Detection & Avoidance State
  collisionAlert: boolean;
  activeManeuver: 'NONE' | 'EMERGENCY_BRAKE' | 'EVASIVE_STEER_LEFT' | 'EVASIVE_STEER_RIGHT' | 'PULL_OVER_EMERGENCY' | 'LANE_CHANGE_EVADE' | 'SPEED_UP_YELLOW';
  maneuverIntensity: number; // 0 to 100%
  evasiveLateralOffset: number; // Lateral offset in px from lane centerline
  predictedTimeToCollision: number | null; // TTC in seconds
  conflictingVehicleId: string | null;
  latencyCompensatedTtc: number | null;
  simulatedMessageLatencyMs: number;
  deadReckoningOffset: { dx: number; dy: number };
  // RSU Dynamic Priority & Arbitration State
  dynamicPriorityScore: number; // Calculated by RSU based on speed & arrival time
  priorityTier: 'P0_EMERGENCY' | 'P1_MOMENTUM_HIGH' | 'P2_STANDARD' | 'P3_YIELD_ADVISORY';
  rsuAdvisoryAction: 'PASS_FULL_SPEED' | 'CACC_SPEED_ADJUST' | 'COAST' | 'DECELERATE_YIELD' | 'EMERGENCY_PREEMPT';
  rsuAllocatedEntryMs: number | null;
  kineticEnergyJoules: number;
  // Security parameters
  pseudonymCertId: string;
  publicKeyFingerprint: string;
  packetSequenceNumber: number;
  tampered: boolean;
  rogue: boolean;
  spoofedGps: boolean;
  replayActive: boolean;
  // Diagnostics
  dockerContainerId: string;
  containerIp: string;
  cpuUsage: number;
  memoryMb: number;
  networkLatencyMs: number;
}

export interface BSMPacket {
  id: string;
  timestamp: number;
  simulatedTimeMs: number;
  senderId: string;
  vehicleName: string;
  pseudonymId: string;
  sequenceNumber: number;
  direction: Direction;
  type: VehicleType;
  priorityFlag: boolean; // SAE J2735 Emergency Priority Broadcast Flag
  v2xOverrideCommand?: 'EMERGENCY_PULL_OVER' | 'LANE_CHANGE_EVADE' | 'YIELD_INTERSECTION';
  telemetry: {
    speedKmh: number;
    latitude: number;
    longitude: number;
    accelerationMs2: number;
    brakingActive: boolean;
    brakeForcePct: number;
    headingDeg: number;
    distanceToCenter: number;
    weatherCondition?: WeatherCondition;
    surfaceFrictionMu?: number;
    brakingDistanceMultiplier?: number;
    brakingDistanceM?: number;
    safeFollowingDistanceM?: number;
    recommendedSpeedKmh?: number;
    opticalVisibilityM?: number;
    v2xPenetrationAdvantage?: boolean;
    wipersActive?: boolean;
    fogLightsActive?: boolean;
  };
  security: {
    algorithm: 'ECDSA_NIST_P256' | 'RSA_2048';
    signatureHex: string;
    certDigest: string;
    verified: boolean;
    verificationStatus: 'VALID' | 'TAMPERED_PAYLOAD' | 'REPLAY_EXPIRED' | 'UNTRUSTED_ROOT_CA' | 'PLAUSIBILITY_FAILED';
    rejectionReason?: string;
  };
}

export interface ReservationSlot {
  slotId: string;
  vehicleId: string;
  direction: Direction;
  entryTimeMs: number;
  exitTimeMs: number;
  priority: number; // 1 = highest (ambulance), 2 = standard
  status: 'SCHEDULED' | 'ACTIVE' | 'CLEARED' | 'CANCELLED';
}

export interface SecurityAttackLog {
  id: string;
  timestamp: string;
  attackType: 'REPLAY' | 'TAMPERING' | 'SYBIL_ROGUE' | 'GPS_SPOOFING';
  targetVehicleId: string;
  targetVehicleName: string;
  payloadSummary: string;
  mitigationResult: 'BLOCKED' | 'DETECTED_DROPPED' | 'ISOLATED';
  detectedBy: 'ECDSA_VERIFIER' | 'FRESHNESS_MONITOR' | 'PKI_REGISTRY' | 'KINEMATIC_FILTER';
}

export interface CollisionIncident {
  id: string;
  timestamp: string;
  vehicleAId: string;
  vehicleAName: string;
  vehicleBId: string;
  vehicleBName: string;
  timeToCollisionSec: number;
  measuredLatencyMs: number;
  maneuverExecutedA: 'EMERGENCY_BRAKE' | 'EVASIVE_STEER_LEFT' | 'EVASIVE_STEER_RIGHT' | 'CRUISE';
  maneuverExecutedB: 'EMERGENCY_BRAKE' | 'EVASIVE_STEER_LEFT' | 'EVASIVE_STEER_RIGHT' | 'CRUISE';
  outcome: 'IMPACT_AVOIDED' | 'COLLISION_PREVENTED_BY_STEER' | 'COLLISION_PREVENTED_BY_AEB';
  cpaDistanceMeters: number;
}

export interface CollisionRiskAlert {
  id: string;
  timestamp: string;
  simulatedTimeMs: number;
  nodeA: {
    id: string;
    name: string;
    type: VehicleType;
    direction: Direction;
    lane: number;
    speedKmh: number;
    activeManeuver: string;
  };
  nodeB: {
    id: string;
    name: string;
    type: VehicleType;
    direction: Direction;
    lane: number;
    speedKmh: number;
    activeManeuver: string;
  };
  timeToCollisionSec: number;
  cpaDistanceMeters: number;
  measuredLatencyMs: number;
  threatLevel: 'CRITICAL' | 'HIGH' | 'WARNING';
  resolutionAction: 'AEB_ENGAGED' | 'EVASIVE_STEERING' | 'YIELD_DECELERATION';
  summary: string;
}

export type HeatmapMode = 'COLLISION_RISK' | 'SIGNAL_INTERFERENCE' | 'COMPOSITE_RISK' | 'VEHICLE_DENSITY';

export interface DensityCell {
  col: number;
  row: number;
  worldX: number;
  worldY: number;
  density: number; // 0 to 1 normalized
  dwellCount: number;
  avgSpeed: number; // km/h
  bottleneckScore: number; // 0 to 100
  zone: 'NORTH_APPROACH' | 'SOUTH_APPROACH' | 'EAST_APPROACH' | 'WEST_APPROACH' | 'CONFLICT_CENTER' | 'OUTBOUND' | 'SHOULDER';
  // V2X Spatial Heatmap metrics
  collisionRisk: number; // 0 to 1 normalized collision probability index
  signalInterference: number; // 0 to 1 normalized RF channel interference / congestion index
  interferenceDbm: number; // -95 dBm (clear/ambient) to -35 dBm (jammed/saturated)
  compositeRisk: number; // 0 to 1 combined dual-factor risk index
}

export interface BottleneckZone {
  id: string;
  name: string;
  bottleneckScore: number;
  avgSpeedKmh: number;
  severity: 'OPTIMAL' | 'MODERATE' | 'SEVERE';
  recommendation: string;
}

export interface RSUArbiterConfig {
  mode: 'DYNAMIC_SPEED_ARRIVAL' | 'STRICT_FCFS' | 'KINETIC_MOMENTUM_PRESERVATION';
  arrivalWeight: number; // 0 to 1
  speedWeight: number; // 0 to 1
  momentumWeight: number; // 0 to 1
  decisionCycleHz: number; // e.g. 50 Hz
  edgeDecisionLatencyMs: number;
  energySavedKWh: number;
  delayReductionPct: number;
}

export interface RSUPriorityQueueItem {
  vehicleId: string;
  name: string;
  type: VehicleType;
  direction: Direction;
  speedKmh: number;
  timeToIntersectionSec: number;
  distanceToStopLineMeters: number;
  dynamicPriorityScore: number;
  priorityTier: 'P0_EMERGENCY' | 'P1_MOMENTUM_HIGH' | 'P2_STANDARD' | 'P3_YIELD_ADVISORY';
  advisoryAction: 'PASS_FULL_SPEED' | 'CACC_SPEED_ADJUST' | 'COAST' | 'DECELERATE_YIELD' | 'EMERGENCY_PREEMPT';
  allocatedSlotStartMs: number;
  allocatedSlotEndMs: number;
  status: 'SCHEDULED' | 'APPROACHING' | 'CROSSING' | 'CLEARED';
}

export interface Pedestrian {
  id: string;
  name: string;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  speed: number;
  heading: number; // 0..360
  state: 'WALKING_SIDEWALK' | 'WAITING_AT_CROSSWALK' | 'CROSSING_STREET' | 'CROSSING_COMPLETE';
  crosswalkDirection?: Direction;
  clothingColor: string;
  hairColor: string;
  hasUmbrella: boolean;
  stepCycle: number;
  waitingTimeSec: number;
}

export interface UrbanTree {
  id: string;
  x: number;
  y: number;
  radius: number;
  type: 'OAK' | 'MAPLE' | 'CHERRY' | 'PINE';
  shadowLength: number;
}

export interface UrbanAmenity {
  id: string;
  type: 'BENCH' | 'BUS_SHELTER' | 'STREET_LAMP' | 'CAFE_TABLE' | 'BIKE_RACK' | 'TRASH_CAN' | 'FLOWER_BED';
  x: number;
  y: number;
  rotationDeg: number;
}




