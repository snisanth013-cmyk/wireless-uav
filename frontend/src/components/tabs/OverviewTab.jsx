import React from 'react';
import { Radio, Users, Activity, BatteryCharging, Zap, ShieldAlert, Cpu, Award, ArrowUpRight, CheckCircle2 } from 'lucide-react';
import InteractiveMap from '../InteractiveMap';

export default function OverviewTab({
  scenario,
  deployData,
  energyData,
  onAlgorithmChange,
  onKChange,
  onUAVMove,
  onRunDeploy,
  loading
}) {
  const metrics = deployData?.metrics || {};
  const covPct = metrics.coverage_pct ?? 0;
  const medianSinr = metrics.median_sinr_db ?? 0;
  const sumRate = metrics.sum_rate_mbps ?? 0;
  const jain = metrics.jain_fairness ?? 0;
  const K = deployData?.K || 6;
  const activeAlg = deployData?.algorithm || 'Hybrid Greedy-PSO';

  return (
    <div className="space-y-6">
      {/* College Project Announcement Banner */}
      <div className="bg-gradient-to-r from-[#101F36] via-[#15294A] to-[#101F36] border border-[#21385E] rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#2EC4B6]/10 border border-[#2EC4B6]/30 flex items-center justify-center text-[#2EC4B6]">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-[#2EC4B6]/20 text-[#2EC4B6]">
                Academic Case Study
              </span>
              <span className="text-xs text-gray-400">SRM Institute of Science & Technology</span>
            </div>
            <h2 className="text-base font-semibold text-white mt-0.5">
              UAV-Assisted Cellular Networks for Disaster Recovery (UAV-DRN)
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-6 text-xs text-gray-300">
          <div>
            <span className="text-gray-400 block text-[10px] uppercase">Domain</span>
            <span className="font-medium text-white">Wireless & Mobile Communication</span>
          </div>
          <div>
            <span className="text-gray-400 block text-[10px] uppercase">Simulation</span>
            <span className="font-mono text-white">4×4 km Disaster Zone</span>
          </div>
          <div className="hidden sm:block pl-4 border-l border-[#21385E]">
            <span className="text-gray-400 block text-[10px] uppercase">Engine Status</span>
            <span className="text-[#10B981] font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Al-Hourani A2G Active
            </span>
          </div>
        </div>
      </div>

      {/* Primary KPI Metric Tiles */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Metric 1 */}
        <div className="bg-[#101F36] border border-[#21385E] rounded-xl p-4 relative overflow-hidden">
          <div className="text-xs text-gray-400 font-medium uppercase tracking-wide">Network Coverage</div>
          <div className="text-3xl font-display font-bold mt-1 text-[#10B981]">
            {covPct > 0 ? `${covPct}%` : '–'}
          </div>
          <div className="text-[11px] text-gray-400 mt-1">
            {metrics.n_covered || 0} of {scenario?.n_users || 0} survivors
          </div>
          <div className="absolute top-2 right-2 text-[#10B981]/20">
            <Radio className="w-8 h-8" />
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-[#101F36] border border-[#21385E] rounded-xl p-4 relative overflow-hidden">
          <div className="text-xs text-gray-400 font-medium uppercase tracking-wide">Active UAV Stations</div>
          <div className="text-3xl font-display font-bold mt-1 text-[#38BDF8]">
            {K} <span className="text-sm font-normal text-gray-400">drones</span>
          </div>
          <div className="text-[11px] text-gray-400 mt-1">
            Altitude: {deployData?.h || 646}m (R={Math.round(deployData?.R || 707)}m)
          </div>
          <div className="absolute top-2 right-2 text-[#38BDF8]/20">
            <Cpu className="w-8 h-8" />
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-[#101F36] border border-[#21385E] rounded-xl p-4 relative overflow-hidden">
          <div className="text-xs text-gray-400 font-medium uppercase tracking-wide">Median SINR</div>
          <div className="text-3xl font-display font-bold mt-1 text-[#2EC4B6]">
            {medianSinr.toFixed(1)} <span className="text-sm font-normal text-gray-400">dB</span>
          </div>
          <div className="text-[11px] text-gray-400 mt-1">
            Service threshold: ≥ 0.0 dB
          </div>
          <div className="absolute top-2 right-2 text-[#2EC4B6]/20">
            <Activity className="w-8 h-8" />
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-[#101F36] border border-[#21385E] rounded-xl p-4 relative overflow-hidden">
          <div className="text-xs text-gray-400 font-medium uppercase tracking-wide">Sum Throughput</div>
          <div className="text-3xl font-display font-bold mt-1 text-white">
            {sumRate.toFixed(1)} <span className="text-sm font-normal text-gray-400">Mbps</span>
          </div>
          <div className="text-[11px] text-gray-400 mt-1">
            5th-pct edge: {metrics.edge_rate_mbps?.toFixed(2) || '0.14'} Mbps
          </div>
          <div className="absolute top-2 right-2 text-white/10">
            <Zap className="w-8 h-8" />
          </div>
        </div>

        {/* Metric 5 */}
        <div className="bg-[#101F36] border border-[#21385E] rounded-xl p-4 relative overflow-hidden">
          <div className="text-xs text-gray-400 font-medium uppercase tracking-wide">Jain's Fairness</div>
          <div className="text-3xl font-display font-bold mt-1 text-amber-400">
            {jain.toFixed(3)}
          </div>
          <div className="text-[11px] text-gray-400 mt-1">
            Resource equity (0 to 1 scale)
          </div>
          <div className="absolute top-2 right-2 text-amber-400/20">
            <Award className="w-8 h-8" />
          </div>
        </div>

        {/* Metric 6 */}
        <div className="bg-[#101F36] border border-[#21385E] rounded-xl p-4 relative overflow-hidden">
          <div className="text-xs text-gray-400 font-medium uppercase tracking-wide">24h Fleet Required</div>
          <div className="text-3xl font-display font-bold mt-1 text-orange-400">
            {energyData?.fleet_required?.battery_swap || 9} <span className="text-sm font-normal text-gray-400">UAVs</span>
          </div>
          <div className="text-[11px] text-gray-400 mt-1">
            Battery swap (or 6 tethered)
          </div>
          <div className="absolute top-2 right-2 text-orange-400/20">
            <BatteryCharging className="w-8 h-8" />
          </div>
        </div>
      </div>

      {/* Main Grid: Interactive Map + Quick Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Interactive Map (7 cols) */}
        <div className="lg:col-span-8 space-y-4">
          <InteractiveMap
            scenario={scenario}
            deployData={deployData}
            onUAVMove={onUAVMove}
            isDraggable={true}
          />
        </div>

        {/* Right Column: Mission Control Panel (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Quick Deployment Box */}
          <div className="bg-[#101F36] border border-[#21385E] rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#21385E] pb-3">
              <h3 className="font-display text-base font-bold text-white uppercase tracking-wider">
                Deployment Mission Control
              </h3>
              <span className="text-[11px] font-mono text-[#2EC4B6]">
                {deployData?.runtime_ms ? `${deployData.runtime_ms} ms` : 'Ready'}
              </span>
            </div>

            {/* Algorithm Selector */}
            <div className="space-y-1.5">
              <label className="text-xs text-gray-300 font-medium flex justify-between">
                <span>Placement Algorithm</span>
                <span className="text-[#38BDF8] font-mono">{activeAlg}</span>
              </label>
              <select
                value={activeAlg}
                onChange={(e) => onAlgorithmChange(e.target.value)}
                className="w-full bg-[#15294A] border border-[#21385E] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#2EC4B6]"
              >
                <option value="Hybrid Greedy-PSO">Hybrid Greedy-PSO (Proposed Research Model)</option>
                <option value="Greedy-MCP">Greedy Maximum Coverage (Greedy-MCP)</option>
                <option value="K-means">K-Means Centroid Clustering</option>
                <option value="Grid">Regular Geometric Grid</option>
                <option value="Random">Random Deployment (Baseline)</option>
              </select>
            </div>

            {/* Slider: Number of UAVs (K) */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-gray-300 font-medium">
                <span>UAV Fleet Size (K)</span>
                <span className="font-mono text-[#38BDF8] font-bold">{K} drones</span>
              </div>
              <input
                type="range"
                min="1"
                max="12"
                value={K}
                onChange={(e) => onKChange(parseInt(e.target.value))}
                className="w-full accent-[#38BDF8]"
              />
              <div className="flex justify-between text-[10px] text-gray-500 font-mono">
                <span>1 UAV</span>
                <span>K=6 (Optimal)</span>
                <span>12 UAVs</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2">
              <button
                onClick={onRunDeploy}
                disabled={loading}
                className="w-full py-2.5 px-4 bg-[#2EC4B6] hover:bg-[#26a89c] text-[#04201D] font-bold rounded-lg shadow-lg shadow-[#2EC4B6]/20 transition flex items-center justify-center gap-2 text-sm disabled:opacity-50"
              >
                {loading ? 'Optimizing Placement Swarm…' : 'Re-Deploy UAV Network'}
                <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>

            {/* Algorithm Quick Insights */}
            <div className="bg-[#0A1424] p-3 rounded-lg border border-[#21385E] text-xs text-gray-300 space-y-1.5">
              <div className="text-[11px] font-semibold text-[#2EC4B6] uppercase">Why Hybrid Greedy-PSO?</div>
              <p className="text-gray-400 leading-relaxed text-[11px]">
                Standard Greedy-MCP clusters drones too close together, causing severe co-channel interference on shared frequencies. The <b>Hybrid Greedy-PSO</b> seeds particles with Greedy & K-means, then searches with an interference-aware fitness objective, boosting served users to <b>92.1%</b>.
              </p>
            </div>
          </div>

          {/* Active UAV Base Station List */}
          <div className="bg-[#101F36] border border-[#21385E] rounded-xl p-5 space-y-3">
            <h4 className="font-display text-sm font-bold text-white uppercase tracking-wider flex items-center justify-between">
              <span>Active Small-Cell UAVs</span>
              <span className="text-xs font-mono text-gray-400 font-normal">Urban A2G</span>
            </h4>

            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {(deployData?.uavs || []).map((uav) => (
                <div
                  key={uav.id}
                  className="bg-[#15294A] border border-[#21385E] rounded-lg p-2.5 flex items-center justify-between text-xs hover:border-[#38BDF8]/50 transition"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-[#2563EB] text-white font-mono font-bold flex items-center justify-center text-[10px]">
                      U{uav.id}
                    </span>
                    <div>
                      <div className="font-medium text-white">Station {uav.id}</div>
                      <div className="text-[10px] text-gray-400 font-mono">({uav.x}m, {uav.y}m)</div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-[#10B981] font-semibold">{uav.served_users} users</div>
                    <div className="text-[10px] text-gray-400">Mean: {uav.mean_sinr_db} dB</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
