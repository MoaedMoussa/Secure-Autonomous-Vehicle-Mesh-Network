/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Globe, 
  CheckCircle2, 
  Copy, 
  Check, 
  RotateCw, 
  ShieldCheck, 
  Server, 
  ArrowRight,
  AlertCircle
} from 'lucide-react';

export const CustomDomainView: React.FC = () => {
  const [domainInput, setDomainInput] = useState('v2x-secnet.org');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationStep, setVerificationStep] = useState<number>(3); // 0: Idle, 1: DNS, 2: SSL, 3: Active
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const dnsRecords = [
    {
      type: 'CNAME',
      name: domainInput.startsWith('www.') ? 'www' : '@',
      value: 'cname.ais-hosting.app',
      ttl: '300s (Auto)',
      status: 'VERIFIED',
    },
    {
      type: 'A',
      name: '@',
      value: '34.149.87.45',
      ttl: '3600s',
      status: 'VERIFIED',
    },
    {
      type: 'TXT',
      name: '_v2x-challenge',
      value: `v2x-domain-verify=tok_${Math.abs(domainInput.split('').reduce((a, b) => ((a << 5) - a) + b.charCodeAt(0), 0)).toString(16)}`,
      ttl: '300s',
      status: 'VERIFIED',
    },
  ];

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleRunVerification = () => {
    setIsVerifying(true);
    setVerificationStep(1);

    setTimeout(() => {
      setVerificationStep(2);
      setTimeout(() => {
        setVerificationStep(3);
        setIsVerifying(false);
      }, 1000);
    }, 1200);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Page Header */}
      <div className="border-b border-slate-800 pb-5">
        <div className="flex items-center gap-2 mb-1">
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-cyan-950 text-cyan-400 border border-cyan-800 uppercase tracking-wider">
            Production Deployment &amp; Networking
          </span>
          <span className="text-slate-500 text-xs">Custom Domain Routing • SSL/TLS 1.3</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          Connect Custom Domain &amp; Configure DNS
        </h1>
        <p className="text-slate-400 text-sm mt-1 max-w-3xl">
          Point your custom domain or academic institutional subdomain to this V2X-SecNet platform instance with automated SSL certificate provisioning and global edge CDN caching.
        </p>
      </div>

      {/* Main Settings Card */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
        <div>
          <label htmlFor="domain-input" className="block text-xs font-semibold text-slate-300 mb-2">
            Target Domain Name
          </label>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1">
              <Globe className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="domain-input"
                type="text"
                value={domainInput}
                onChange={(e) => setDomainInput(e.target.value.toLowerCase().trim())}
                placeholder="e.g. v2x-secnet.org or lab.university.edu"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm font-mono text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
              />
            </div>
            <button
              onClick={handleRunVerification}
              disabled={isVerifying || !domainInput}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isVerifying ? 'animate-spin' : ''}`} />
              <span>{isVerifying ? 'Verifying DNS...' : 'Verify DNS & SSL'}</span>
            </button>
          </div>
        </div>

        {/* Verification Status Pill */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-950/80 border border-emerald-800 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-white font-bold text-sm font-mono">{domainInput}</span>
                <span className="px-2 py-0.2 rounded text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold">
                  HTTPS ACTIVE
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Managed Let&apos;s Encrypt wildcard certificate valid with TLS 1.3
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-300">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <CheckCircle2 className="w-4 h-4" /> DNS Resolved
            </span>
            <span className="text-slate-600">&bull;</span>
            <span className="flex items-center gap-1.5 text-emerald-400">
              <CheckCircle2 className="w-4 h-4" /> SSL Issued
            </span>
            <span className="text-slate-600">&bull;</span>
            <span className="flex items-center gap-1.5 text-emerald-400">
              <CheckCircle2 className="w-4 h-4" /> Edge Routed
            </span>
          </div>
        </div>

        {/* DNS Table */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Server className="w-4 h-4 text-cyan-400" />
            Required DNS Records at Registrar (Cloudflare, GoDaddy, Namecheap, Route 53)
          </h2>

          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Name / Host</th>
                  <th className="py-3 px-4">Value / Target</th>
                  <th className="py-3 px-4">TTL</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-950/60 font-mono text-slate-300">
                {dnsRecords.map((rec, i) => (
                  <tr key={i} className="hover:bg-slate-900/60">
                    <td className="py-3 px-4 font-bold text-cyan-400">{rec.type}</td>
                    <td className="py-3 px-4">{rec.name}</td>
                    <td className="py-3 px-4 text-slate-200 select-all truncate max-w-[280px]">
                      {rec.value}
                    </td>
                    <td className="py-3 px-4 text-slate-400">{rec.ttl}</td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleCopy(rec.value, `dns-${i}`)}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs transition-colors inline-flex items-center gap-1 cursor-pointer font-sans"
                        title="Copy record value"
                      >
                        {copiedKey === `dns-${i}` ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                        <span>{copiedKey === `dns-${i}` ? 'Copied' : 'Copy'}</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Step-by-Step Instructions */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs space-y-2 text-slate-400">
          <div className="font-bold text-slate-200 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-cyan-400" />
            Domain Setup Checklist:
          </div>
          <ol className="list-decimal list-inside space-y-1 pl-1 leading-relaxed">
            <li>Log in to your DNS provider (e.g. Cloudflare, Namecheap, GoDaddy, AWS Route 53).</li>
            <li>Add the <strong>CNAME</strong> and <strong>A</strong> records shown in the table above.</li>
            <li>Add the <strong>TXT</strong> ownership verification record.</li>
            <li>Click <strong>Verify DNS &amp; SSL</strong> above. Propagation typically completes within 60 to 300 seconds.</li>
          </ol>
        </div>
      </div>
    </div>
  );
};
