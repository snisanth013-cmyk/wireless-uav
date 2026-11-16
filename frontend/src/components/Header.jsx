import React from 'react';
import { Radio, RefreshCw, Play, ShieldAlert, Cpu, Activity, Zap, Battery, Layers, BookOpen, ExternalLink, CheckCircle2, AlertCircle } from 'lucide-react';

export default function Header({
  activeTab,
  onTabChange,
  backendOnline,
  scenario,
  deployData,
  onNewScenario,
  onRunDeploy,
  loading
}) {
  const tabs = [
    { id: 'overview', label: 'Overview Dashboard', icon: Radio },
    { id: 'disaster', label: '1. Disaster Area', icon: ShieldAlert },
    { id: 'deployment', label: '2. UAV Deployment', icon: Cpu },
    { id: 'wireless', label: '3. Wireless Analysis', icon: Activity },
    { id: 'coverage', label: '4. Coverage Analysis', icon: Layers },
    { id: 'interference', label: '5. Interference Mgmt', icon: Zap },
    { id: 'energy', label: '6. Energy & Fleet', icon: Battery },
    { id: 'benchmarks', label: 'Academic Defense', icon: BookOpen },
  ];

  const covPct = deployData?.metrics?.coverage_pct ?? 0;
  const nCovered = deployData?.metrics?.n_covered ?? 0;
  const totalUsers = scenario?.n_users ?? 850;

  return (
    <header className="sticky top-0 z-40 bg-[#0A1424]/95 backdrop-blur border-b border-[#21385E] shadow-xl">
      {/* Top Banner Bar */}
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 border-b border-[#21385E]/50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#2EC4B6] to-[#2563EB] flex items-center justify-center text-[#04201D] font-bold shadow-md">
            <Radio className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display font-extrabold text-base tracking-wide text-white uppercase">
                UAV-DRN <span className="text-[#2EC4B6] font-normal">Mission Control</span>
              </h1>
              <span className="hidden sm:inline-block text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-[#15294A] text-gray-300 border border-[#21385E]">
                v2.0 · Final Year Project
              </span>
            </div>
            <div className="text-[11px] text-gray-400">
              UAV-Assisted Cellular Networks for Disaster Recovery · SRM Institute of Science & Technology
            </div>
          </div>
        </div>

        {/* Status & Quick Actions */}
        <div className="flex items-center gap-3">
          {/* Backend Status Pill */}
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono border ${
            backendOnline
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
              : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
          }`}>
            <span className={`w-2 h-2 rounded-full ${backendOnline ? 'bg-[#10B981] animate-ping' : 'bg-amber-500'}`} />
            {backendOnline ? 'Simulation Engine Online' : 'Connecting to Flask…'}
          </div>

          {/* Quick Scenario Re-roll */}
          <button
            onClick={onNewScenario}
            disabled={loading}
            className="px-3 py-1.5 bg-[#15294A] hover:bg-[#1E3A68] border border-[#21385E] text-white text-xs font-semibold rounded-lg transition flex items-center gap-1.5 disabled:opacity-50"
            title="Generate a new random survivor and camp distribution"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">New Scenario</span>
          </button>

          {/* Run Placement Optimization */}
          <button
            onClick={onRunDeploy}
            disabled={loading}
            className="px-3.5 py-1.5 bg-[#2EC4B6] hover:bg-[#26a89c] text-[#04201D] text-xs font-bold rounded-lg shadow-md transition flex items-center gap-1.5 disabled:opacity-50"
            title="Run active placement algorithm"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Optimize Swarm</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="max-w-7xl mx-auto px-4 overflow-x-auto no-scrollbar">
        <nav className="flex space-x-1 py-1.5">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition ${
                  isActive
                    ? 'bg-[#15294A] text-[#2EC4B6] border border-[#2EC4B6]/40 shadow-sm'
                    : 'text-gray-400 hover:text-white hover:bg-[#101F36]'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#2EC4B6]' : 'text-gray-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
