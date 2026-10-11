/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Code2, Copy, Check, FileText, Server, Layers, Cpu } from 'lucide-react';

export const SourcesView: React.FC = () => {
  const [activeFile, setActiveFile] = useState<string>('VehicleV2XAgent.java');
  const [copied, setCopied] = useState(false);

  const fileContents: Record<string, { lang: string; desc: string; code: string }> = {
    'VehicleV2XAgent.java': {
      lang: 'java',
      desc: 'Vehicle On-Board Unit (OBU) agent handling 10Hz kinematics broadcast, ECDSA signing, and slot negotiation',
      code: `package org.v2x.secnet.agent;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.WebSocket;
import java.nio.ByteBuffer;
import java.security.*;
import java.time.Duration;
import java.time.Instant;
import java.util.concurrent.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.v2x.secnet.crypto.CryptoEngine;
import org.v2x.secnet.model.BasicSafetyMessage;

/**
 * Autonomous Vehicle V2X Agent running inside isolated Docker container.
 * Communicates via direct sidelink (PC5 / DSRC) or WebSocket broker.
 */
public class VehicleV2XAgent {
    private final String vehicleId;
    private final KeyPair keyPair;
    private final ObjectMapper mapper = new ObjectMapper();
    private final ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor();
    private WebSocket webSocket;
    
    // Telemetry Kinematics State
    private volatile double speedKmh = 40.0;
    private volatile double distanceToIntersection = 250.0;
    private volatile boolean emergencyBrakeActive = false;
    private long sequenceCounter = 0;

    public VehicleV2XAgent(String vehicleId) throws Exception {
        this.vehicleId = vehicleId;
        this.keyPair = CryptoEngine.generateECDSAKeyPair();
        System.out.printf("[%s] Initialized OBU with ECDSA NIST P-256 Public Key: %s%n",
            vehicleId, CryptoEngine.getPublicKeyHex(keyPair.getPublic()));
    }

    public void start(String brokerUri) {
        HttpClient client = HttpClient.newHttpClient();
        client.newWebSocketBuilder()
            .connectTimeout(Duration.ofSeconds(3))
            .buildAsync(URI.create(brokerUri), new WebSocketListener())
            .thenAccept(ws -> {
                this.webSocket = ws;
                startTelemetryBroadcastLoop();
            })
            .exceptionally(ex -> {
                System.err.println("Failed to connect to V2X Broker: " + ex.getMessage());
                return null;
            });
    }

    private void startTelemetryBroadcastLoop() {
        // SAE J2735 standard: 10 Hz broadcast rate (every 100ms)
        scheduler.scheduleAtFixedRate(() -> {
            try {
                broadcastBasicSafetyMessage();
            } catch (Exception e) {
                System.err.println("Broadcast error: " + e.getMessage());
            }
        }, 0, 100, TimeUnit.MILLISECONDS);
    }

    private void broadcastBasicSafetyMessage() throws Exception {
        sequenceCounter++;
        BasicSafetyMessage bsm = new BasicSafetyMessage();
        bsm.setMsgId(0x0014); // SAE J2735 BSM
        bsm.setSequenceNumber(sequenceCounter);
        bsm.setVehicleId(vehicleId);
        bsm.setTimestampMs(Instant.now().toEpochMilli());
        bsm.setSpeedKmh(speedKmh);
        bsm.setDistanceToIntersection(distanceToIntersection);
        bsm.setEmergencyBrakeActive(emergencyBrakeActive);

        // Sign payload with OBU ECDSA private key (IEEE 1609.2)
        byte[] payloadBytes = mapper.writeValueAsBytes(bsm.getCoreData());
        byte[] signature = CryptoEngine.signSHA256ECDSA(keyPair.getPrivate(), payloadBytes);
        bsm.setSignatureHex(CryptoEngine.bytesToHex(signature));
        bsm.setCertDigest(CryptoEngine.getCertDigest(keyPair.getPublic()));

        String jsonPayload = mapper.writeValueAsString(bsm);
        webSocket.sendText(jsonPayload, true);
    }

    private class WebSocketListener implements WebSocket.Listener {
        @Override
        public CompletionStage<?> onText(WebSocket ws, CharSequence data, boolean last) {
            // Handle incoming slot confirmations or emergency preemption alerts
            return WebSocket.Listener.super.onText(ws, data, last);
        }
    }

    public static void main(String[] args) throws Exception {
        String vehId = System.getenv().getOrDefault("VEHICLE_ID", "veh-node-alpha");
        String broker = System.getenv().getOrDefault("BROKER_URL", "ws://v2x-broker:8080/v2x/mesh");
        VehicleV2XAgent agent = new VehicleV2XAgent(vehId);
        agent.start(broker);
        Thread.currentThread().join(); // Keep alive in Docker container
    }
}`,
    },
    'IntersectionCoordinator.java': {
      lang: 'java',
      desc: 'Edge Roadside Unit (RSU) Arbiter computing non-conflicting space-time reservation slots in real-time',
      code: `package org.v2x.secnet.arbiter;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import org.v2x.secnet.crypto.CryptoEngine;
import org.v2x.secnet.model.BasicSafetyMessage;
import org.v2x.secnet.model.ReservationSlot;

/**
 * Roadside Unit (RSU) Intersection Arbiter.
 * Executes First-Come-First-Reserved (FCFR) scheduling with Priority Preemption.
 */
public class IntersectionCoordinator {
    private final Map<String, Long> lastSeenSequence = new ConcurrentHashMap<>();
    private final List<ReservationSlot> activeSlots = new ArrayList<>();
    private static final long FRESHNESS_WINDOW_MS = 50; // Hard real-time limit
    private static final long TRAVERSAL_BUFFER_MS = 1200; // Time needed to clear conflict box

    public synchronized ReservationSlot processIncomingBSM(BasicSafetyMessage bsm) {
        // 1. Freshness & Replay Attack Defense
        long now = System.currentTimeMillis();
        if (Math.abs(now - bsm.getTimestampMs()) > FRESHNESS_WINDOW_MS) {
            System.err.printf("[SECURITY ALERT] Replay or Stale packet detected from %s. Delta=%d ms%n",
                bsm.getVehicleId(), (now - bsm.getTimestampMs()));
            return null; // Reject
        }

        Long prevSeq = lastSeenSequence.get(bsm.getVehicleId());
        if (prevSeq != null && bsm.getSequenceNumber() <= prevSeq) {
            System.err.printf("[SECURITY ALERT] Sequence rollback detected from %s! Prev=%d, Curr=%d%n",
                bsm.getVehicleId(), prevSeq, bsm.getSequenceNumber());
            return null;
        }
        lastSeenSequence.put(bsm.getVehicleId(), bsm.getSequenceNumber());

        // 2. Cryptographic Signature Verification
        boolean isValid = CryptoEngine.verifyECDSA(
            bsm.getCertDigest(),
            bsm.getCoreDataBytes(),
            bsm.getSignatureBytes()
        );
        if (!isValid) {
            System.err.printf("[SECURITY ALERT] Invalid ECDSA Signature on BSM from %s! MITM drop.%n",
                bsm.getVehicleId());
            return null;
        }

        // 3. Dynamic Priority Evaluation (P = W_arrival * Urgency + W_speed * Efficiency + W_momentum * Inertia)
        double speedMs = Math.max(1.0, (bsm.getSpeedKmh() * 1000.0) / 3600.0);
        long ttiMs = (long) ((bsm.getDistanceToIntersection() / speedMs) * 1000.0);
        long requestedEntryTime = now + ttiMs;
        long requestedExitTime = requestedEntryTime + TRAVERSAL_BUFFER_MS;

        double arrivalUrgency = Math.min(50.0, (1.0 / Math.max(0.25, ttiMs / 1000.0)) * 18.0);
        double speedEfficiency = (bsm.getSpeedKmh() / 50.0) * 35.0;
        double momentumFactor = (bsm.getMassKg() / 1600.0) * (bsm.getSpeedKmh() / 45.0) * 15.0;
        double emergencyBonus = bsm.isEmergencyVehicle() ? 600.0 : 0.0;
        double dynamicPriorityScore = (arrivalUrgency * 0.50) + (speedEfficiency * 0.35) + (momentumFactor * 0.15) + emergencyBonus;

        // Check conflicts against already reserved cross-lane trajectories
        for (ReservationSlot slot : activeSlots) {
            if (isConflictingTrajectory(bsm.getApproachDirection(), slot.getApproachDirection())) {
                if (Math.abs(slot.getEntryTimeMs() - requestedEntryTime) < TRAVERSAL_BUFFER_MS) {
                    // Conflict detected: compare dynamic priority scores
                    if (dynamicPriorityScore < slot.getPriorityScore()) {
                        // Yield or CACC deceleration command
                        return ReservationSlot.yieldRequest(slot.getExitTimeMs() + 200);
                    }
                }
            }
        }

        ReservationSlot confirmedSlot = new ReservationSlot(
            UUID.randomUUID().toString(),
            bsm.getVehicleId(),
            bsm.getApproachDirection(),
            requestedEntryTime,
            requestedExitTime
        );
        activeSlots.add(confirmedSlot);
        return confirmedSlot;
    }

    private boolean isConflictingTrajectory(String dirA, String dirB) {
        boolean isNorthSouthA = "NORTH".equals(dirA) || "SOUTH".equals(dirA);
        boolean isNorthSouthB = "NORTH".equals(dirB) || "SOUTH".equals(dirB);
        return isNorthSouthA != isNorthSouthB;
    }
}`,
    },
    'CollisionAvoidanceEngine.java': {
      lang: 'java',
      desc: 'Decentralized Closest Point of Approach (CPA) evaluator with dead-reckoning latency compensation and AEB/steering maneuvers',
      code: `package org.v2x.secnet.safety;

import org.v2x.secnet.model.BasicSafetyMessage;
import org.v2x.secnet.model.VehicleState;

/**
 * Real-time on-board collision prediction & avoidance controller.
 * Dead-reckons peer positions using wireless sidelink message latency tau.
 */
public class CollisionAvoidanceEngine {
    private static final double CRITICAL_TTC_THRESHOLD_SEC = 2.2;
    private static final double CRITICAL_CPA_DISTANCE_METERS = 10.0;
    private static final double MAX_AEB_DECELERATION_MS2 = -8.5; // Emergency brake
    private static final double LATERAL_EVASIVE_OFFSET_METERS = 2.2; // Swerve to shoulder

    public record CollisionAssessment(
        boolean hazardDetected,
        double timeToCollisionSec,
        double cpaDistanceMeters,
        ManeuverAction recommendedAction
    ) {}

    public enum ManeuverAction {
        NONE,
        EMERGENCY_BRAKE_AEB,
        EVASIVE_STEER_RIGHT,
        EVASIVE_STEER_LEFT
    }

    /**
     * Evaluates collision threat against a peer vehicle BSM,
     * applying dead-reckoning projection to counteract message latency.
     */
    public static CollisionAssessment evaluateRisk(
        VehicleState ego,
        BasicSafetyMessage peerBSM,
        double measuredLatencySec
    ) {
        // 1. Dead-reckon peer vehicle position forward by latency tau
        double peerVx = peerBSM.getVelocityX();
        double peerVy = peerBSM.getVelocityY();
        double projectedPeerX = peerBSM.getPositionX() + (peerVx * measuredLatencySec);
        double projectedPeerY = peerBSM.getPositionY() + (peerVy * measuredLatencySec);

        // 2. Relative state vector (Ego vs Projected Peer)
        double deltaX = ego.x() - projectedPeerX;
        double deltaY = ego.y() - projectedPeerY;
        double deltaVx = ego.vx() - peerVx;
        double deltaVy = ego.vy() - peerVy;

        double relativeSpeedSq = (deltaVx * deltaVx) + (deltaVy * deltaVy);
        if (relativeSpeedSq < 0.01) {
            return new CollisionAssessment(false, -1, Double.MAX_VALUE, ManeuverAction.NONE);
        }

        // 3. Time to Closest Point of Approach (t_CPA)
        double tCPA = -((deltaX * deltaVx) + (deltaY * deltaVy)) / relativeSpeedSq;

        // Is collision imminent within warning window?
        if (tCPA > 0.05 && tCPA <= CRITICAL_TTC_THRESHOLD_SEC) {
            double cpaEgoX = ego.x() + (ego.vx() * tCPA);
            double cpaEgoY = ego.y() + (ego.vy() * tCPA);
            double cpaPeerX = projectedPeerX + (peerVx * tCPA);
            double cpaPeerY = projectedPeerY + (peerVy * tCPA);

            double dCPA = Math.hypot(cpaEgoX - cpaPeerX, cpaEgoY - cpaPeerY);

            if (dCPA < CRITICAL_CPA_DISTANCE_METERS) {
                // Determine optimal maneuver: AEB if yielding, or evasive steering if clearance exists
                boolean shouldSteer = ego.speedKmh() > peerBSM.getSpeedKmh();
                ManeuverAction action = shouldSteer 
                    ? ManeuverAction.EVASIVE_STEER_RIGHT 
                    : ManeuverAction.EMERGENCY_BRAKE_AEB;

                return new CollisionAssessment(true, tCPA, dCPA, action);
            }
        }

        return new CollisionAssessment(false, tCPA, Double.MAX_VALUE, ManeuverAction.NONE);
    }
}`,
    },
    'CryptoEngine.java': {
      lang: 'java',
      desc: 'High-assurance ECDSA NIST P-256 cryptographic utility wrapping Java Security and SunEC provider',
      code: `package org.v2x.secnet.crypto;

import java.security.*;
import java.security.spec.ECGenParameterSpec;
import java.util.HexFormat;

public class CryptoEngine {
    private static final String ALGORITHM = "SHA256withECDSA";
    private static final String CURVE_NAME = "secp256r1"; // NIST P-256

    public static KeyPair generateECDSAKeyPair() throws Exception {
        KeyPairGenerator kpg = KeyPairGenerator.getInstance("EC");
        ECGenParameterSpec ecSpec = new ECGenParameterSpec(CURVE_NAME);
        kpg.initialize(ecSpec, new SecureRandom());
        return kpg.generateKeyPair();
    }

    public static byte[] signSHA256ECDSA(PrivateKey privateKey, byte[] data) throws Exception {
        Signature signature = Signature.getInstance(ALGORITHM);
        signature.initSign(privateKey);
        signature.update(data);
        return signature.sign();
    }

    public static boolean verifyECDSA(PublicKey publicKey, byte[] data, byte[] signatureBytes) {
        try {
            Signature signature = Signature.getInstance(ALGORITHM);
            signature.initVerify(publicKey);
            signature.update(data);
            return signature.verify(signatureBytes);
        } catch (Exception e) {
            return false;
        }
    }

    public static String bytesToHex(byte[] bytes) {
        return HexFormat.of().formatHex(bytes);
    }
}`,
    },
    'Dockerfile': {
      lang: 'dockerfile',
      desc: 'Lightweight, hardened multi-stage Docker container for vehicle nodes on OpenJDK 21',
      code: `# Multi-stage hardened build for V2X Node Agent
FROM maven:3.9.6-eclipse-temurin-21-alpine AS builder
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:go-offline
COPY src ./src
RUN mvn clean package -DskipTests

FROM eclipse-temurin:21-jre-alpine
RUN addgroup -S v2xgroup && adduser -S v2xuser -G v2xgroup
WORKDIR /opt/v2x
COPY --from=builder /app/target/v2x-node-agent.jar ./agent.jar

USER v2xuser
ENV JAVA_OPTS="-XX:+UseZGC -XX:MaxRAMPercentage=75 -Djava.security.egd=file:/dev/./urandom"
EXPOSE 8080
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar agent.jar"]`,
    },
    'docker-compose.yml': {
      lang: 'yaml',
      desc: 'Simulated multi-vehicle container mesh network with Mosquitto broker and custom bridge subnet',
      code: `version: '3.8'

services:
  # Roadside Unit Edge Arbiter & Low-Latency Message Broker
  v2x-broker:
    image: eclipse-mosquitto:2.0
    container_name: v2x-rsu-broker
    ports:
      - "1883:1883"
      - "8080:9001" # WebSockets for browser HUD
    networks:
      v2x_mesh:
        ipv4_address: 172.28.0.254

  # Autonomous Vehicle Node 1 (North Approach)
  v2x-node-alpha:
    build: .
    container_name: v2x-node-alpha
    environment:
      - VEHICLE_ID=AutoCab-1
      - DIRECTION=NORTH
      - BROKER_URL=ws://v2x-broker:9001
    networks:
      v2x_mesh:
        ipv4_address: 172.28.0.2
    depends_on:
      - v2x-broker

  # Autonomous Vehicle Node 2 (East Approach)
  v2x-node-bravo:
    build: .
    container_name: v2x-node-bravo
    environment:
      - VEHICLE_ID=AutoCab-2
      - DIRECTION=EAST
      - BROKER_URL=ws://v2x-broker:9001
    networks:
      v2x_mesh:
        ipv4_address: 172.28.0.3
    depends_on:
      - v2x-broker

  # Emergency Ambulance Node (High Priority)
  v2x-node-ambulance:
    build: .
    container_name: v2x-node-ambulance
    environment:
      - VEHICLE_ID=Ambulance-Alpha
      - DIRECTION=SOUTH
      - PRIORITY=1
      - BROKER_URL=ws://v2x-broker:9001
    networks:
      v2x_mesh:
        ipv4_address: 172.28.0.99
    depends_on:
      - v2x-broker

networks:
  v2x_mesh:
    driver: bridge
    ipam:
      config:
        - subnet: 172.28.0.0/16`,
    },
  };

  const current = fileContents[activeFile];

  const handleCopy = () => {
    navigator.clipboard.writeText(current.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Page Header */}
      <div className="border-b border-slate-800 pb-5">
        <div className="flex items-center gap-2 mb-1">
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-cyan-950 text-cyan-400 border border-cyan-800 uppercase tracking-wider">
            Production Software Architecture
          </span>
          <span className="text-slate-500 text-xs">Java 21 • WebSockets / MQTT • Docker Orchestration</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          Microservices Codebase &amp; Distributed Architecture
        </h1>
        <p className="text-slate-400 text-sm mt-1 max-w-3xl">
          Full source files powering the containerized vehicle nodes, the Roadside Unit (RSU) conflict arbiter, and the IEEE 1609.2 cryptographic validation engine.
        </p>
      </div>

      {/* Code Browser */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
        {/* File Tabs */}
        <div className="flex items-center justify-between bg-slate-950 border-b border-slate-800 px-4 py-2 flex-wrap gap-2">
          <div className="flex items-center gap-1.5 overflow-x-auto py-1">
            {Object.keys(fileContents).map((file) => (
              <button
                key={file}
                onClick={() => setActiveFile(file)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                  activeFile === file
                    ? 'bg-slate-800 text-cyan-400 border border-slate-700 shadow'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/80'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>{file}</span>
              </button>
            ))}
          </div>

          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition-colors cursor-pointer"
            title="Copy code to clipboard"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied!' : 'Copy Code'}</span>
          </button>
        </div>

        {/* File Description Header */}
        <div className="bg-slate-900/90 px-4 py-2.5 border-b border-slate-800/80 text-xs text-slate-300 flex items-center justify-between">
          <span className="font-mono text-cyan-400 font-bold">{activeFile}</span>
          <span className="text-slate-400 text-[11px]">{current.desc}</span>
        </div>

        {/* Code Content Block */}
        <pre className="p-4 overflow-x-auto text-xs font-mono text-slate-200 bg-slate-950 leading-relaxed max-h-[550px] overflow-y-auto">
          <code>{current.code}</code>
        </pre>
      </div>
    </div>
  );
};
