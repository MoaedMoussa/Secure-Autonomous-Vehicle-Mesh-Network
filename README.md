# V2X-SecNet: Secure Autonomous Vehicle Mesh & Real-Time Intersection Coordination

[![IEEE 1609.2 Compliant](https://img.shields.io/badge/Standard-IEEE%201609.2-06b6d4?style=flat-square)](https://standards.ieee.org/)
[![SAE J2735 BSM](https://img.shields.io/badge/Telemetry-SAE%20J2735%20BSM-3b82f6?style=flat-square)](https://www.sae.org/)
[![ECDSA NIST P-256](https://img.shields.io/badge/Crypto-ECDSA%20P--256-10b981?style=flat-square)](https://csrc.nist.gov/)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg?style=flat-square)](LICENSE)

> **Repository Description**:
> Real-time zero-traffic-light intersection coordination platform with IEEE 1609.2 / ECC encrypted V2X vehicle telemetry, Docker node simulation, and collision avoidance.

---

## 📌 Project Overview

**V2X-SecNet** is an academic and industrial simulation platform demonstrating zero-traffic-light autonomous intersection coordination. It utilizes decentralized peer-to-peer (V2V) and vehicle-to-infrastructure (V2I/RSU) sidelink communications running on 5.9 GHz ITS bands (DSRC / C-V2X PC5).

Vehicles dynamically negotiate conflict-free time slots and trajectory corridors through cryptographically signed **SAE J2735 Basic Safety Messages (BSM)** verified via **ECDSA NIST P-256** signatures, eliminating traditional signal delays while guaranteeing safety boundaries.

---

## 🚀 Key Capabilities

- **Zero-Traffic-Light Coordination**: Dynamic Virtual First-Come-First-Reserved (FCFR) conflict arbitration with emergency vehicle priority preemption.
- **IEEE 1609.2 Cryptographic Security**: Hardware Security Module (HSM) simulation, ECDSA NIST P-256 digital signatures, certificate validation, and replay attack defense windows (<50ms).
- **Live Cyber-Physical Attack Injection**: Test system resilience under Replay Attacks, MITM tampering, GPS Spoofing, and Rogue Vehicle Sybil injections.
- **Real-Time Collision Toast Sentinel**: Avionics-style toast notification system with dual-node conflict inspection, Time-to-Collision (TTC), Closest Point of Approach (CPA), and emergency braking (AEB) telemetry.
- **D3.js Spatial Risk Heatmaps**: Multi-layer spatial density, RF signal interference (dBm), and collision risk distribution overlays.
- **Dockerized Java Microservice Nodes**: Isolated container nodes (`VehicleV2XAgent.java`) streaming kinematics and signed BSM packets at 10 Hz over WebSockets/MQTT.
- **Curriculum & Academic Alignment**: Mapped to Car-to-Car Communication (Module 0.1.1), Mobile Security & Applied Cryptography, and Hard Real-Time Communication Systems.

---

## 🛠️ Tech Stack

- **Frontend HUD**: React 19, TypeScript, Tailwind CSS, Lucide Icons
- **Data Visualization**: D3.js (Spatial Density, RF Jamming, Collision Grids)
- **Node Backend Architecture**: Java 21, Virtual Threads, Jackson JSON, Java Crypto Architecture (JCA)
- **Containerization**: Docker, Docker Compose orchestration
- **Networking**: IEEE 802.11p DSRC / 3GPP Rel 15 PC5 Sidelink emulation, WebSockets (<5ms latency)

---

## 🚦 Getting Started

### Prerequisites
- Node.js >= 18.0.0
- npm or bun

### Installation & Run

```bash
# Clone the repository
git clone https://github.com/your-org/v2x-secnet.git
cd v2x-secnet

# Install dependencies
npm install

# Start development server
npm run dev
```

Visit `http://localhost:3000` to interact with the live intersection simulation.

### Production Build

```bash
npm run build
npm run preview
```

---

## 🏷️ GitHub Repository Metadata

- **Short Description (GitHub About)**:
  `Real-time zero-traffic-light intersection coordination platform with IEEE 1609.2 / ECC encrypted V2X vehicle telemetry, Docker node simulation, and collision avoidance.`
- **Website**:
  `https://v2x-secnet.org/`
- **Recommended GitHub Topics**:
  `v2x` `autonomous-vehicles` `ieee-1609-2` `sae-j2735` `connected-vehicles` `collision-avoidance` `cryptography` `ecdsa` `dsrc` `c-v2x` `docker` `traffic-simulation` `d3js` `react19` `typescript`

---

## 📄 License
This project is licensed under the Apache 2.0 License.
