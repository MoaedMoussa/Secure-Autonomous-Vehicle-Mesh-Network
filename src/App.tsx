/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { IntersectionSimulation } from './utils/simulationEngine';
import { Header } from './components/Header';
import { Breadcrumbs } from './components/Breadcrumbs';
import { SimulationView } from './components/SimulationView';
import { SecurityView } from './components/SecurityView';
import { FleetView } from './components/FleetView';
import { CurriculumView } from './components/CurriculumView';
import { SourcesView } from './components/SourcesView';
import { CustomDomainView } from './components/CustomDomainView';
import { NotFoundView } from './components/NotFoundView';
import { Footer } from './components/Footer';

const PAGE_META: Record<string, { title: string; desc: string }> = {
  simulation: {
    title: 'Live Intersection Simulation | V2X-SecNet',
    desc: 'Simulate dynamic autonomous vehicle coordination without traffic signals using ECDSA-signed SAE J2735 telemetry and low-latency sidelinks.',
  },
  security: {
    title: 'IEEE 1609.2 Crypto & Attack Lab | V2X-SecNet',
    desc: 'Deep packet inspection of SAE J2735 BSM telemetry signed via ECDSA NIST P-256 with live Replay and MITM attack injection.',
  },
  fleet: {
    title: 'Docker Vehicle Nodes & Telemetry | V2X-SecNet',
    desc: 'Containerized Java vehicle agents running virtual threads and communicating over 5.9 GHz direct ITS sidelink channels.',
  },
  curriculum: {
    title: 'Module 0.1.1 Academic Defense | V2X-SecNet',
    desc: 'Academic capstone defense mapping Car-to-Car Communication syllabus 0.1.1, Mobile Security, and Real-Time systems.',
  },
  sources: {
    title: 'Java Nodes & Protocol Architecture | V2X-SecNet',
    desc: 'Production Java vehicle agent source code, Roadside Unit conflict arbiter, Dockerfile, and docker-compose orchestration.',
  },
  domain: {
    title: 'Connect Custom Domain & DNS Settings | V2X-SecNet',
    desc: 'Configure DNS CNAME, A, and TXT records to host the V2X-SecNet platform on your institutional or custom domain.',
  },
  '404': {
    title: '404 - Trajectory Lost | V2X-SecNet',
    desc: 'The requested route or module does not exist in the V2X-SecNet spatial communication topology.',
  },
};

export default function App() {
  // Hash routing
  const getInitialView = () => {
    const hash = window.location.hash.replace('#', '');
    if (hash && PAGE_META[hash]) return hash;
    return 'simulation';
  };

  const [currentView, setCurrentView] = useState<string>(getInitialView);

  // Singleton simulation engine across view changes
  const simulation = useMemo(() => new IntersectionSimulation(), []);

  // Sync hash routing and browser history
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (PAGE_META[hash]) {
        setCurrentView(hash);
      } else if (hash === '404') {
        setCurrentView('404');
      } else if (hash) {
        setCurrentView('404');
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Update document title, meta description, and canonical tag dynamically
  useEffect(() => {
    const meta = PAGE_META[currentView] || PAGE_META['404'];
    document.title = meta.title;

    // Meta description update
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute('content', meta.desc);
    }

    // Canonical tag update
    const canonicalTag = document.getElementById('canonical-tag');
    if (canonicalTag) {
      const baseUrl = window.location.origin;
      const canonicalHref = currentView === 'simulation' ? `${baseUrl}/` : `${baseUrl}/#${currentView}`;
      canonicalTag.setAttribute('href', canonicalHref);
    }
  }, [currentView]);

  const handleNavigate = (view: string) => {
    setCurrentView(view);
    window.location.hash = view;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const simState = simulation.getState();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950">
      {/* Top Header Navigation */}
      <Header
        currentView={currentView}
        onNavigate={handleNavigate}
        activeVehicleCount={simState.vehicles.length}
        avgLatencyMs={simState.stats.avgLatencyMs}
        activeAttack={simState.activeAttack}
      />

      {/* Breadcrumb Navigation Trail with Schema.org microdata */}
      <Breadcrumbs currentView={currentView} onNavigate={handleNavigate} />

      {/* Main Page View Content */}
      <main className="flex-1">
        {currentView === 'simulation' && <SimulationView simulation={simulation} />}
        {currentView === 'security' && <SecurityView simulation={simulation} />}
        {currentView === 'fleet' && <FleetView simulation={simulation} />}
        {currentView === 'curriculum' && <CurriculumView />}
        {currentView === 'sources' && <SourcesView />}
        {currentView === 'domain' && <CustomDomainView />}
        {currentView === '404' && <NotFoundView onNavigate={handleNavigate} />}
      </main>

      {/* Academic Lab Footer with LocalBusiness Schema & Internal Links */}
      <Footer onNavigate={handleNavigate} />
    </div>
  );
}
