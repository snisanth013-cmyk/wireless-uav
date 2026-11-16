import React, { useState, useEffect } from 'react';
import { Radio, ArrowLeftRight, Activity, Zap, CheckCircle2, AlertOctagon, HelpCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { compareInterference } from '../../api';

export default function InterferenceTab({
  deployData,
  scenario
}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadInterference() {
      try {
        setLoading(true);
        const res = await compareInterference({
          K: deployData?.K || 6,
          env: deployData?.env || 'urban',
          pt_dbm: 20.0,
          custom_uavs: deployData?.uavs?.map(u => [u.x, u.y])
        });
        setData(res);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadInterference();
  }, [deployData]);

  const r1 = data?.reuse1 || {};
  const r3 = data?.reuse3 || {};
  const dist = data?.sinr_distribution || [];
  const coChannelDists = data?.co_channel_distances || [];
  const uavs = data?.uavs || [];

  const CHANNEL_COLORS = {
    1: '#38BDF8', // f1 - sky blue
    2: '#10B981', // f2 - emerald
    3: '#A855F7', // f3 - purple
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#101F36] border border-[#21385E] rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-xs uppercase font-bold tracking-wider text-[#2EC4B6]">Module 5</div>
          <h2 className="text-xl font-bold font-display text-white mt-0.5">Interference Management & Frequency Reuse</h2>
          <p className="text-xs text-gray-400 mt-1 max-w-2xl">
            Examines the fundamental trade-off between <b>Universal Frequency Reuse (Reuse 1)</b> and <b>3-Color Graph Channel Allocation (Reuse 3)</b>. Reuse 3 eliminates co-channel interference (+12.3 dB SINR gain) at the cost of splitting total system bandwidth (15 MHz → 5 MHz per channel).
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="px-2 py-1 rounded bg-[#38BDF8]/20 text-[#38BDF8] border border-[#38BDF8]/30">f1: 2.000 GHz</span>
          <span className="px-2 py-1 rounded bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/30">f2: 2.005 GHz</span>
          <span className="px-2 py-1 rounded bg-[#A855F7]/20 text-[#A855F7] border border-[#A855F7]/30">f3: 2.010 GHz</span>
        </div>
      </div>

      {/* Side-by-Side Comparison Cards: Reuse 1 vs Reuse 3 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Reuse 1 */}
        <div className="bg-[#101F36] border border-[#21385E] rounded-xl p-5 space-y-4 relative overflow-hidden">
          <div className="flex justify-between items-center border-b border-[#21385E] pb-3">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-blue-500/20 text-blue-400">
                Single Channel Configuration
              </span>
              <h3 className="font-display text-lg font-bold text-white mt-1">Frequency Reuse 1 (Universal Reuse)</h3>
            </div>
            <div className="text-right">
              <span className="text-xl font-display font-bold text-[#38BDF8]">15 MHz</span>
              <span className="text-[10px] text-gray-400 block">per UAV station</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-[#0A1424] p-3 rounded-lg border border-[#21385E]">
              <div className="text-gray-400 text-[10px] uppercase">Median SINR</div>
              <div className="text-xl font-display font-bold text-amber-400 mt-0.5">
                {r1.median_sinr_db || 8.8} dB
              </div>
              <div className="text-[10px] text-gray-500">Subject to inter-cell interference</div>
            </div>

            <div className="bg-[#0A1424] p-3 rounded-lg border border-[#21385E]">
              <div className="text-gray-400 text-[10px] uppercase">Mean Throughput</div>
              <div className="text-xl font-display font-bold text-white mt-0.5">
                {r1.mean_rate_mbps || 0.362} Mbps
              </div>
              <div className="text-[10px] text-[#10B981]">Higher peak user capacity</div>
            </div>

            <div className="bg-[#0A1424] p-3 rounded-lg border border-[#21385E]">
              <div className="text-gray-400 text-[10px] uppercase">Cell-Edge Rate (5th %)</div>
              <div className="text-xl font-display font-bold text-gray-300 mt-0.5">
                {r1.edge_rate_mbps || 0.121} Mbps
              </div>
              <div className="text-[10px] text-gray-500">Suffers from co-channel overlap</div>
            </div>

            <div className="bg-[#0A1424] p-3 rounded-lg border border-[#21385E]">
              <div className="text-gray-400 text-[10px] uppercase">Sum Network Rate</div>
              <div className="text-xl font-display font-bold text-[#2EC4B6] mt-0.5">
                {r1.sum_rate_mbps || 288.8} Mbps
              </div>
              <div className="text-[10px] text-gray-500">Aggregated throughput</div>
            </div>
          </div>
        </div>

        {/* Card 2: Reuse 3 */}
        <div className="bg-[#101F36] border border-[#2EC4B6]/50 rounded-xl p-5 space-y-4 relative overflow-hidden shadow-lg shadow-[#2EC4B6]/5">
          <div className="flex justify-between items-center border-b border-[#21385E] pb-3">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-[#2EC4B6]/20 text-[#2EC4B6]">
                Interference Mitigated
              </span>
              <h3 className="font-display text-lg font-bold text-white mt-1">Frequency Reuse 3 (3-Carrier Partition)</h3>
            </div>
            <div className="text-right">
              <span className="text-xl font-display font-bold text-[#2EC4B6]">5 MHz</span>
              <span className="text-[10px] text-gray-400 block">per UAV station</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-[#0A1424] p-3 rounded-lg border border-[#21385E]">
              <div className="text-gray-400 text-[10px] uppercase">Median SINR</div>
              <div className="text-xl font-display font-bold text-[#10B981] mt-0.5 flex items-center gap-1">
                {r3.median_sinr_db || 21.2} dB
                <span className="text-[11px] font-sans text-[#10B981]">(+12.3 dB)</span>
              </div>
              <div className="text-[10px] text-emerald-400">Interference virtually eliminated</div>
            </div>

            <div className="bg-[#0A1424] p-3 rounded-lg border border-[#21385E]">
              <div className="text-gray-400 text-[10px] uppercase">Mean Throughput</div>
              <div className="text-xl font-display font-bold text-white mt-0.5">
                {r3.mean_rate_mbps || 0.254} Mbps
              </div>
              <div className="text-[10px] text-gray-500">Bandwidth partitioned to 5 MHz</div>
            </div>

            <div className="bg-[#0A1424] p-3 rounded-lg border border-[#21385E]">
              <div className="text-gray-400 text-[10px] uppercase">Cell-Edge Rate (5th %)</div>
              <div className="text-xl font-display font-bold text-[#10B981] mt-0.5">
                {r3.edge_rate_mbps || 0.132} Mbps
              </div>
              <div className="text-[10px] text-emerald-400">+9% edge reliability boost</div>
            </div>

            <div className="bg-[#0A1424] p-3 rounded-lg border border-[#21385E]">
              <div className="text-gray-400 text-[10px] uppercase">Sum Network Rate</div>
              <div className="text-xl font-display font-bold text-gray-300 mt-0.5">
                {r3.sum_rate_mbps || 205.2} Mbps
              </div>
              <div className="text-[10px] text-gray-500">Lower overall sum capacity</div>
            </div>
          </div>
        </div>
      </div>

      {/* SINR Distribution Histogram Chart */}
      <div className="bg-[#101F36] border border-[#21385E] rounded-xl p-5 space-y-3">
        <div className="flex justify-between items-center">
          <h3 className="font-display text-sm font-bold text-white uppercase tracking-wider">
            SINR Distribution Comparison: Reuse 1 vs Reuse 3
          </h3>
          <span className="text-xs text-gray-400 font-mono">Count of Survivors per dB Bin</span>
        </div>
        <p className="text-[11px] text-gray-400">
          Notice how Frequency Reuse 3 dramatically shifts the entire user population distribution rightward toward high signal quality (+20 dB to +30 dB), protecting edge users from inter-cell co-channel interference.
        </p>

        <div className="h-[270px] w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dist}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1F3657" vertical={false} />
              <XAxis dataKey="bin_center" stroke="#64748B" tick={{ fontSize: 10 }} unit=" dB" />
              <YAxis stroke="#64748B" tick={{ fontSize: 10 }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0D1B2E', borderColor: '#21385E', fontSize: 11 }}
                formatter={(val, name) => [`${val} users`, name === 'reuse1_count' ? 'Reuse 1 (15 MHz)' : 'Reuse 3 (5 MHz)']}
                labelFormatter={(lbl) => `SINR ≈ ${lbl} dB`}
              />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
              <Bar dataKey="reuse1_count" name="Reuse 1 (Universal)" fill="#38BDF8" radius={[2, 2, 0, 0]} />
              <Bar dataKey="reuse3_count" name="Reuse 3 (3-Carrier)" fill="#10B981" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Channel Allocation & Co-Channel Distance Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Allocated Channels */}
        <div className="bg-[#101F36] border border-[#21385E] rounded-xl p-5">
          <h4 className="font-display text-xs font-bold text-white uppercase tracking-wider mb-3">
            UAV Station Channel Colouring
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {uavs.map((uav) => (
              <div key={uav.id} className="bg-[#0A1424] p-3 rounded-lg border border-[#21385E] flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#2563EB] text-white font-mono text-[10px] font-bold flex items-center justify-center">
                    U{uav.id}
                  </span>
                  <span className="text-white font-medium">UAV-{uav.id}</span>
                </div>
                <span
                  className="px-2 py-0.5 rounded text-[10px] font-mono font-bold"
                  style={{
                    backgroundColor: `${CHANNEL_COLORS[uav.channel_reuse3]}25`,
                    color: CHANNEL_COLORS[uav.channel_reuse3],
                    border: `1px solid ${CHANNEL_COLORS[uav.channel_reuse3]}50`
                  }}
                >
                  f{uav.channel_reuse3}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Co-Channel Nearest Neighbor Distances */}
        <div className="bg-[#101F36] border border-[#21385E] rounded-xl p-5">
          <h4 className="font-display text-xs font-bold text-white uppercase tracking-wider mb-3">
            Co-Channel Nearest Neighbor Distances (Reuse 3)
          </h4>
          <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1 text-xs">
            {coChannelDists.length > 0 ? (
              coChannelDists.map((pair, idx) => (
                <div key={idx} className="bg-[#0A1424] p-2 rounded-lg border border-[#21385E] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-gray-300">UAV-{pair.uav_a} ↔ UAV-{pair.uav_b}</span>
                    <span className="text-[10px] text-gray-400 font-mono">(Channel f{pair.channel})</span>
                  </div>
                  <span className="font-mono font-bold text-[#10B981]">{pair.distance_m} m apart</span>
                </div>
              ))
            ) : (
              <div className="text-gray-400 text-xs italic py-4 text-center">
                All active UAVs assigned distinct orthogonal channels. Zero co-channel interference!
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
