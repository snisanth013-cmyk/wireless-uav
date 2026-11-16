import React, { useState } from 'react';
import { Cpu, Play, BarChart2, Zap, Award, Activity, Clock, CheckCircle2, ChevronRight, Shuffle, Grid, Share2, Target, Sparkles } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, Cell } from 'recharts';
import InteractiveMap from '../InteractiveMap';

export default function UAVDeploymentTab({
  scenario,
  deployData,
  comparisonData,
  onAlgorithmChange,
  onKChange,
  onRunDeploy,
  onCompareAll,
  onUAVMove,
  loading
}) {
  const [selectedAlg, setSelectedAlg] = useState(deployData?.algorithm || 'Hybrid Greedy-PSO');
  const [isComparing, setIsComparing] = useState(false);
  const K = deployData?.K || 6;

  const ALG_INFO = {
    'Random': {
      icon: Shuffle,
      color: '#94A3B8',
      desc: 'Uniform random coordinates across [0, area]². Worst baseline with high overlap and large coverage gaps.',
      complexity: 'O(K)',
      typicalCov: '~39%'
    },
    'Grid': {
      icon: Grid,
      color: '#38BDF8',
      desc: 'Demand-blind regular grid partition. Spreads UAVs evenly but ignores relief camp clustering.',
      complexity: 'O(K)',
      typicalCov: '~68%'
    },
    'K-means': {
      icon: Share2,
      color: '#A855F7',
      desc: 'Standard Euclidean k-means clustering on survivor coordinates. Fast and cluster-aware, but geometric only.',
      complexity: 'O(N · K · iters)',
      typicalCov: '~89%'
    },
    'Greedy-MCP': {
      icon: Target,
      color: '#F97316',
      desc: 'Classic (1 - 1/e) approximation: sequentially picks candidates covering the most still-uncovered users, then refines centroids.',
      complexity: 'O(K · C · N)',
      typicalCov: '~87%'
    },
    'Hybrid Greedy-PSO': {
      icon: Sparkles,
      color: '#2EC4B6',
      desc: 'Proposed Research Algorithm: Warm-starts PSO swarm with Greedy-MCP and K-Means seeds, optimizing an interference-aware SINR fitness objective.',
      complexity: 'O(P · iters · N · K)',
      typicalCov: '~92.1%'
    }
  };

  const handleSelectAlg = (name) => {
    setSelectedAlg(name);
    onAlgorithmChange(name);
  };

  const handleRunComparison = async () => {
    setIsComparing(true);
    await onCompareAll();
    setIsComparing(false);
  };

  const comparisons = comparisonData?.comparisons || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#101F36] border border-[#21385E] rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-xs uppercase font-bold tracking-wider text-[#2EC4B6]">Module 2</div>
          <h2 className="text-xl font-bold font-display text-white mt-0.5">UAV Deployment & Algorithm Comparison</h2>
          <p className="text-xs text-gray-400 mt-1 max-w-2xl">
            Evaluate and contrast 5 drone base station placement strategies. From demand-blind grid baselines to the proposed <b>Hybrid Greedy-PSO</b> algorithm that balances user density coverage with inter-cell interference mitigation.
          </p>
        </div>

        <button
          onClick={handleRunComparison}
          disabled={loading || isComparing}
          className="px-4 py-2 bg-[#2EC4B6] hover:bg-[#26a89c] text-[#04201D] font-bold text-xs uppercase tracking-wider rounded-lg shadow-lg shadow-[#2EC4B6]/20 transition flex items-center gap-2 disabled:opacity-50"
        >
          <BarChart2 className="w-4 h-4" />
          {isComparing ? 'Running 5-Algorithm Sweep…' : 'Benchmark All 5 Algorithms'}
        </button>
      </div>

      {/* 5 Algorithm Selection Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {Object.entries(ALG_INFO).map(([name, info]) => {
          const Icon = info.icon;
          const isSelected = selectedAlg === name;
          return (
            <button
              key={name}
              onClick={() => handleSelectAlg(name)}
              className={`p-3.5 rounded-xl border text-left transition relative overflow-hidden flex flex-col justify-between ${
                isSelected
                  ? 'bg-[#15294A] border-[#2EC4B6] shadow-lg shadow-[#2EC4B6]/10'
                  : 'bg-[#101F36] border-[#21385E] hover:border-gray-500'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${info.color}20`, color: info.color }}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  {name === 'Hybrid Greedy-PSO' && (
                    <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-[#2EC4B6]/20 text-[#2EC4B6]">
                      Proposed
                    </span>
                  )}
                </div>
                <div className="font-display font-bold text-sm text-white">{name}</div>
                <p className="text-[11px] text-gray-400 mt-1 line-clamp-2 leading-relaxed">{info.desc}</p>
              </div>

              <div className="mt-3 pt-2 border-t border-[#21385E] flex justify-between items-center text-[10px]">
                <span className="text-gray-500 font-mono">{info.complexity}</span>
                <span className="font-bold" style={{ color: info.color }}>{info.typicalCov}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Main Grid: Interactive Map + Controls & Side-by-Side Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Map View (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <InteractiveMap
            scenario={scenario}
            deployData={deployData}
            onUAVMove={onUAVMove}
            isDraggable={true}
          />

          {/* Active Placement Telemetry */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-[#101F36] border border-[#21385E] rounded-xl p-3 text-center">
              <div className="text-[10px] text-gray-400 uppercase">Coverage</div>
              <div className="text-xl font-display font-bold text-[#10B981] mt-0.5">
                {deployData?.metrics?.coverage_pct}%
              </div>
              <div className="text-[10px] text-gray-400">
                {deployData?.metrics?.n_covered} users
              </div>
            </div>

            <div className="bg-[#101F36] border border-[#21385E] rounded-xl p-3 text-center">
              <div className="text-[10px] text-gray-400 uppercase">Sum Throughput</div>
              <div className="text-xl font-display font-bold text-white mt-0.5">
                {deployData?.metrics?.sum_rate_mbps} Mbps
              </div>
              <div className="text-[10px] text-gray-400">
                Edge: {deployData?.metrics?.edge_rate_mbps} Mbps
              </div>
            </div>

            <div className="bg-[#101F36] border border-[#21385E] rounded-xl p-3 text-center">
              <div className="text-[10px] text-gray-400 uppercase">Execution Time</div>
              <div className="text-xl font-display font-bold text-[#38BDF8] mt-0.5">
                {deployData?.runtime_ms} ms
              </div>
              <div className="text-[10px] text-gray-400">
                Swarm Convergence
              </div>
            </div>
          </div>
        </div>

        {/* Comparison Table & Chart (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Controls Box */}
          <div className="bg-[#101F36] border border-[#21385E] rounded-xl p-4 space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-300 font-semibold">Active Fleet Size (K)</span>
              <span className="font-mono text-[#38BDF8] font-bold">{K} UAVs</span>
            </div>
            <input
              type="range"
              min="1"
              max="12"
              value={K}
              onChange={(e) => onKChange(parseInt(e.target.value))}
              className="w-full accent-[#38BDF8]"
            />
            <div className="flex gap-2 pt-1">
              <button
                onClick={onRunDeploy}
                disabled={loading}
                className="flex-1 py-2 bg-[#15294A] hover:bg-[#1E3A68] border border-[#21385E] text-white text-xs font-semibold rounded-lg transition"
              >
                Execute {selectedAlg}
              </button>
              <button
                onClick={handleRunComparison}
                disabled={loading || isComparing}
                className="flex-1 py-2 bg-[#2EC4B6] hover:bg-[#26a89c] text-[#04201D] text-xs font-bold rounded-lg transition"
              >
                Compare All 5
              </button>
            </div>
          </div>

          {/* Comparison Bar Chart */}
          <div className="bg-[#101F36] border border-[#21385E] rounded-xl p-4 space-y-3">
            <h4 className="font-display text-xs font-bold text-white uppercase tracking-wider flex items-center justify-between">
              <span>Coverage Performance Comparison (%)</span>
              <span className="text-[10px] text-gray-400 font-mono">K={K} UAVs</span>
            </h4>

            <div className="h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={comparisons.length > 0 ? comparisons : [
                  { algorithm: 'Random', coverage_pct: 39.3 },
                  { algorithm: 'Grid', coverage_pct: 68.4 },
                  { algorithm: 'K-means', coverage_pct: 89.6 },
                  { algorithm: 'Greedy-MCP', coverage_pct: 86.8 },
                  { algorithm: 'Hybrid Greedy-PSO', coverage_pct: 92.1 }
                ]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1F3657" vertical={false} />
                  <XAxis dataKey="algorithm" stroke="#64748B" tick={{ fontSize: 10 }} interval={0} />
                  <YAxis stroke="#64748B" domain={[0, 100]} tick={{ fontSize: 10 }} unit="%" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0D1B2E', borderColor: '#21385E', fontSize: 11 }}
                    formatter={(val) => [`${val}%`, 'Coverage']}
                  />
                  <Bar dataKey="coverage_pct" radius={[4, 4, 0, 0]}>
                    {comparisons.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={ALG_INFO[entry.algorithm]?.color || '#2EC4B6'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Full Comparison Metrics Table */}
          <div className="bg-[#101F36] border border-[#21385E] rounded-xl p-4">
            <h4 className="font-display text-xs font-bold text-white uppercase tracking-wider mb-2.5">
              Comparative Metrics Table
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#15294A] text-gray-400 font-mono text-[10px] uppercase">
                  <tr>
                    <th className="py-2 px-2.5 rounded-l">Algorithm</th>
                    <th className="py-2 px-2">Coverage</th>
                    <th className="py-2 px-2">Sum Rate</th>
                    <th className="py-2 px-2">Jain</th>
                    <th className="py-2 px-2 rounded-r">SINR</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#21385E]">
                  {(comparisons.length > 0 ? comparisons : [
                    { algorithm: 'Random', coverage_pct: 39.3, sum_rate_mbps: 187.4, jain_fairness: 0.35, median_sinr_db: 2.3 },
                    { algorithm: 'Grid', coverage_pct: 68.4, sum_rate_mbps: 267.7, jain_fairness: 0.50, median_sinr_db: 6.7 },
                    { algorithm: 'K-means', coverage_pct: 89.6, sum_rate_mbps: 277.1, jain_fairness: 0.74, median_sinr_db: 7.8 },
                    { algorithm: 'Greedy-MCP', coverage_pct: 86.8, sum_rate_mbps: 256.9, jain_fairness: 0.69, median_sinr_db: 7.3 },
                    { algorithm: 'Hybrid Greedy-PSO', coverage_pct: 92.1, sum_rate_mbps: 288.8, jain_fairness: 0.68, median_sinr_db: 8.8 }
                  ]).map((c) => (
                    <tr
                      key={c.algorithm}
                      className={`hover:bg-[#15294A]/40 transition ${
                        c.algorithm === selectedAlg ? 'bg-[#15294A]/60 font-medium' : ''
                      }`}
                    >
                      <td className="py-2 px-2.5 font-medium flex items-center gap-1.5">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: ALG_INFO[c.algorithm]?.color }}
                        ></span>
                        <span className="truncate">{c.algorithm}</span>
                      </td>
                      <td className="py-2 px-2 font-mono font-bold text-[#10B981]">
                        {c.coverage_pct}%
                      </td>
                      <td className="py-2 px-2 font-mono text-gray-300">
                        {c.sum_rate_mbps}M
                      </td>
                      <td className="py-2 px-2 font-mono text-amber-400">
                        {c.jain_fairness}
                      </td>
                      <td className="py-2 px-2 font-mono text-[#38BDF8]">
                        {c.median_sinr_db}dB
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
