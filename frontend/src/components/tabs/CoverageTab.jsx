import React, { useState } from 'react';
import { ShieldCheck, XCircle, Radio, Users, Activity, Zap, Award, Layers } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, AreaChart, Area } from 'recharts';
import InteractiveMap from '../InteractiveMap';

export default function CoverageTab({
  scenario,
  deployData,
  onUAVMove
}) {
  const metrics = deployData?.metrics || {};
  const userStatus = deployData?.user_status || [];
  const uavs = deployData?.uavs || [];
  const totalUsers = metrics.n_users || scenario?.n_users || 0;
  const nCovered = metrics.n_covered || 0;
  const nUncovered = metrics.n_uncovered || 0;
  const covPct = metrics.coverage_pct ?? 0;

  // Build SINR distribution histogram
  const sinrBins = [
    { range: '< 0 dB (Out of Service)', count: 0, fill: '#EF4444' },
    { range: '0 to 5 dB (Marginal)', count: 0, fill: '#F59E0B' },
    { range: '5 to 10 dB (Good)', count: 0, fill: '#38BDF8' },
    { range: '10 to 15 dB (Very Good)', count: 0, fill: '#2EC4B6' },
    { range: '> 15 dB (Excellent)', count: 0, fill: '#10B981' }
  ];

  userStatus.forEach(u => {
    if (!u.is_covered || u.sinr_db < 0) {
      sinrBins[0].count++;
    } else if (u.sinr_db < 5) {
      sinrBins[1].count++;
    } else if (u.sinr_db < 10) {
      sinrBins[2].count++;
    } else if (u.sinr_db < 15) {
      sinrBins[3].count++;
    } else {
      sinrBins[4].count++;
    }
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#101F36] border border-[#21385E] rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-xs uppercase font-bold tracking-wider text-[#2EC4B6]">Module 4</div>
          <h2 className="text-xl font-bold font-display text-white mt-0.5">Coverage & User Association Analysis</h2>
          <p className="text-xs text-gray-400 mt-1 max-w-2xl">
            Calculates dual-condition coverage verification: each user must satisfy both allowable maximum path loss (PL ≤ 100 dB) <b>AND</b> positive Signal-to-Interference-plus-Noise Ratio (SINR ≥ 0 dB).
          </p>
        </div>

        {/* Color Legend Badge */}
        <div className="flex flex-wrap items-center gap-3 bg-[#0A1424] border border-[#21385E] px-3 py-2 rounded-lg text-xs">
          <span className="flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-full bg-[#10B981]"></i> Green: Covered</span>
          <span className="flex items-center gap-1.5"><i className="w-2.5 h-2.5 text-[#EF4444] font-bold">✕</i> Red: Uncovered</span>
          <span className="flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-sm bg-[#38BDF8]"></i> Blue: UAV</span>
          <span className="flex items-center gap-1.5"><i className="w-2.5 h-2.5 rotate-45 bg-[#F59E0B]"></i> Yellow: Camps</span>
        </div>
      </div>

      {/* 4 Essential Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#101F36] border border-[#21385E] rounded-xl p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-gray-400 uppercase font-semibold">Total Target Users</div>
            <div className="text-2xl font-display font-bold text-white mt-1">{totalUsers}</div>
            <div className="text-[11px] text-gray-400">In 4×4 km Disaster Zone</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#101F36] border border-[#21385E] rounded-xl p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-emerald-400 uppercase font-semibold">Covered Users (Green)</div>
            <div className="text-2xl font-display font-bold text-[#10B981] mt-1">{nCovered}</div>
            <div className="text-[11px] text-emerald-400/80 font-bold">{covPct}% Coverage</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-[#10B981]">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#101F36] border border-[#21385E] rounded-xl p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-red-400 uppercase font-semibold">Uncovered Users (Red)</div>
            <div className="text-2xl font-display font-bold text-[#EF4444] mt-1">{nUncovered}</div>
            <div className="text-[11px] text-red-400/80">{(100 - covPct).toFixed(1)}% Gap</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-[#EF4444]">
            <XCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#101F36] border border-[#21385E] rounded-xl p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-gray-400 uppercase font-semibold">Median Signal Quality</div>
            <div className="text-2xl font-display font-bold text-[#2EC4B6] mt-1">
              {metrics.median_sinr_db?.toFixed(1) || '8.8'} <span className="text-sm font-normal text-gray-400">dB</span>
            </div>
            <div className="text-[11px] text-gray-400">Jain Equity: {metrics.jain_fairness?.toFixed(3) || '0.68'}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#2EC4B6]/10 flex items-center justify-center text-[#2EC4B6]">
            <Activity className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Grid: Map + Per-UAV Load Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Map (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <InteractiveMap
            scenario={scenario}
            deployData={deployData}
            onUAVMove={onUAVMove}
            isDraggable={true}
          />
        </div>

        {/* Right Distribution Panels (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Signal Quality Distribution Chart */}
          <div className="bg-[#101F36] border border-[#21385E] rounded-xl p-4 space-y-3">
            <h4 className="font-display text-xs font-bold text-white uppercase tracking-wider">
              Signal Quality & SINR Distribution
            </h4>
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sinrBins} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#1F3657" horizontal={false} />
                  <XAxis type="number" stroke="#64748B" tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="range" stroke="#64748B" tick={{ fontSize: 9 }} width={120} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0D1B2E', borderColor: '#21385E', fontSize: 11 }}
                    formatter={(val) => [`${val} survivors`, 'Count']}
                  />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {sinrBins.map((entry, index) => (
                      <Bar key={`bar-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Per-UAV Small Cell Load Balancing Table */}
          <div className="bg-[#101F36] border border-[#21385E] rounded-xl p-4">
            <h4 className="font-display text-xs font-bold text-white uppercase tracking-wider mb-2.5 flex items-center justify-between">
              <span>Per-UAV Load Balancing</span>
              <span className="text-[10px] text-gray-400 font-mono">15 MHz Spectrum</span>
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#15294A] text-gray-400 font-mono text-[10px] uppercase">
                  <tr>
                    <th className="py-2 px-2.5 rounded-l">Drone BS</th>
                    <th className="py-2 px-2">Served Users</th>
                    <th className="py-2 px-2">Load Share</th>
                    <th className="py-2 px-2 rounded-r">Mean SINR</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#21385E]">
                  {uavs.map((uav) => {
                    const share = nCovered > 0 ? ((uav.served_users / nCovered) * 100).toFixed(1) : 0;
                    return (
                      <tr key={uav.id} className="hover:bg-[#15294A]/40 transition">
                        <td className="py-2 px-2.5 font-medium flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-[#2563EB] text-white font-mono text-[9px] flex items-center justify-center font-bold">
                            U{uav.id}
                          </span>
                          <span className="text-white">UAV-{uav.id}</span>
                        </td>
                        <td className="py-2 px-2 font-mono font-bold text-[#10B981]">
                          {uav.served_users}
                        </td>
                        <td className="py-2 px-2">
                          <div className="flex items-center gap-1.5">
                            <div className="w-16 h-2 bg-[#0A1424] rounded-full overflow-hidden">
                              <div className="h-full bg-[#38BDF8]" style={{ width: `${share}%` }} />
                            </div>
                            <span className="text-gray-400 font-mono text-[10px]">{share}%</span>
                          </div>
                        </td>
                        <td className="py-2 px-2 font-mono text-gray-300">
                          {uav.mean_sinr_db} dB
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
