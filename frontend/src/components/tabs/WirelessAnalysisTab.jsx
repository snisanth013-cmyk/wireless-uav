import React, { useState, useEffect } from 'react';
import { Radio, Signal, HelpCircle, Layers, ArrowRight, ShieldCheck, AlertTriangle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, ReferenceLine } from 'recharts';
import { analyzeChannel } from '../../api';

export default function WirelessAnalysisTab({
  channelData,
  onEnvironmentChange,
  deployData
}) {
  const [selectedEnv, setSelectedEnv] = useState(channelData?.environment || 'urban');
  const [localChannel, setLocalChannel] = useState(channelData);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadEnvData() {
      try {
        setLoading(true);
        const res = await analyzeChannel({ env: selectedEnv, pl_max: 100.0, fc: 2e9 });
        setLocalChannel(res);
        if (onEnvironmentChange) onEnvironmentChange(selectedEnv);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadEnvData();
  }, [selectedEnv]);

  const ch = localChannel || channelData || {};
  const comparative = ch.comparative || [];
  const rhCurve = ch.rh_curve || [];
  const plosCurve = ch.plos_curve || [];

  // Group PLOS by theta
  const plosByTheta = [];
  for (let th = 0; th <= 90; th += 2) {
    const obj = { theta: th };
    plosCurve.filter(p => p.theta === th).forEach(p => {
      obj[p.env] = (p.p_los * 100);
    });
    if (Object.keys(obj).length > 1) {
      plosByTheta.push(obj);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#101F36] border border-[#21385E] rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-xs uppercase font-bold tracking-wider text-[#2EC4B6]">Module 3</div>
          <h2 className="text-xl font-bold font-display text-white mt-0.5">Wireless Communication & A2G Channel Analysis</h2>
          <p className="text-xs text-gray-400 mt-1 max-w-2xl">
            Implements the rigorous <b>Al-Hourani et al. (IEEE WCL 2014)</b> Air-to-Ground (A2G) channel model. Calculates probabilistic Line-of-Sight P_LoS(θ), excess path losses, optimal altitude h*, and small-drone 120m regulatory caps.
          </p>
        </div>

        {/* Environment Selector Pills */}
        <div className="flex bg-[#0A1424] border border-[#21385E] p-1 rounded-lg text-xs">
          {[
            { id: 'suburban', label: 'Suburban' },
            { id: 'urban', label: 'Urban' },
            { id: 'dense_urban', label: 'Dense Urban' },
            { id: 'highrise_urban', label: 'High-Rise' }
          ].map(e => (
            <button
              key={e.id}
              onClick={() => setSelectedEnv(e.id)}
              className={`px-3 py-1.5 rounded-md font-medium transition ${
                selectedEnv === e.id
                  ? 'bg-[#2EC4B6] text-[#04201D] font-bold'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {e.label}
            </button>
          ))}
        </div>
      </div>

      {/* Primary Mathematical KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#101F36] border border-[#21385E] rounded-xl p-4">
          <div className="text-xs text-gray-400 uppercase font-semibold">Optimal Altitude (h*)</div>
          <div className="text-2xl font-display font-bold text-[#38BDF8] mt-1">
            {ch.h_opt} <span className="text-sm font-normal text-gray-400">metres</span>
          </div>
          <div className="text-[11px] text-gray-400 mt-1">
            Maximizes ground coverage radius
          </div>
        </div>

        <div className="bg-[#101F36] border border-[#21385E] rounded-xl p-4">
          <div className="text-xs text-gray-400 uppercase font-semibold">Maximum Cell Radius (R*)</div>
          <div className="text-2xl font-display font-bold text-[#10B981] mt-1">
            {ch.R_opt} <span className="text-sm font-normal text-gray-400">metres</span>
          </div>
          <div className="text-[11px] text-gray-400 mt-1">
            Area = {((Math.PI * (ch.R_opt || 706)**2) / 1e6).toFixed(2)} km² per UAV
          </div>
        </div>

        <div className="bg-[#101F36] border border-[#21385E] rounded-xl p-4">
          <div className="text-xs text-gray-400 uppercase font-semibold">Optimal Elevation Angle (θ*)</div>
          <div className="text-2xl font-display font-bold text-amber-400 mt-1">
            {ch.theta_opt}°
          </div>
          <div className="text-[11px] text-gray-400 mt-1">
            Intrinsic property of city geometry
          </div>
        </div>

        <div className="bg-[#101F36] border border-[#21385E] rounded-xl p-4">
          <div className="text-xs text-red-400 uppercase font-semibold">120m Regulation Penalty</div>
          <div className="text-2xl font-display font-bold text-[#EF4444] mt-1">
            −{ch.area_loss_pct}%
          </div>
          <div className="text-[11px] text-gray-400 mt-1">
            Radius drops to {ch.R_120} m at 120m cap
          </div>
        </div>
      </div>

      {/* Two Technical Charts: R(h) & P_LoS(theta) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: R(h) Curve */}
        <div className="bg-[#101F36] border border-[#21385E] rounded-xl p-5 space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="font-display text-sm font-bold text-white uppercase tracking-wider">
              Coverage Radius vs Altitude R(h) · {ch.name}
            </h3>
            <span className="text-xs font-mono text-[#2EC4B6]">
              Peak: ({ch.h_opt}m, {ch.R_opt}m)
            </span>
          </div>
          <p className="text-[11px] text-gray-400">
            Higher altitude increases elevation angle and improves P_LoS, but excessive altitude increases Free-Space Path Loss (d²). The optimal altitude h* balances these competing effects.
          </p>

          <div className="h-[260px] w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={rhCurve}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1F3657" vertical={false} />
                <XAxis dataKey="h" stroke="#64748B" tick={{ fontSize: 10 }} unit="m" />
                <YAxis stroke="#64748B" tick={{ fontSize: 10 }} unit="m" domain={[0, 'dataMax + 100']} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0D1B2E', borderColor: '#21385E', fontSize: 11 }}
                  formatter={(val) => [`${val} m`, 'Coverage Radius R']}
                  labelFormatter={(lbl) => `Altitude h = ${lbl} m`}
                />
                <ReferenceLine x={120} stroke="#EF4444" strokeDasharray="4 4" label={{ value: '120m Cap', fill: '#EF4444', fontSize: 10, position: 'top' }} />
                <ReferenceLine x={ch.h_opt} stroke="#38BDF8" strokeDasharray="3 3" label={{ value: 'h*', fill: '#38BDF8', fontSize: 10 }} />
                <Line
                  type="monotone"
                  dataKey="R"
                  stroke="#2EC4B6"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: P_LoS(theta) Curves */}
        <div className="bg-[#101F36] border border-[#21385E] rounded-xl p-5 space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="font-display text-sm font-bold text-white uppercase tracking-wider">
              Line of Sight Probability P_LoS(θ)
            </h3>
            <span className="text-xs text-gray-400 font-mono">ITU-R Models</span>
          </div>
          <p className="text-[11px] text-gray-400">
            Sigmoidal S-curves determined by building density and heights: Suburban (teal), Urban (blue), Dense Urban (purple), High-rise (red).
          </p>

          <div className="h-[260px] w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={plosByTheta}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1F3657" vertical={false} />
                <XAxis dataKey="theta" stroke="#64748B" tick={{ fontSize: 10 }} unit="°" />
                <YAxis stroke="#64748B" tick={{ fontSize: 10 }} unit="%" domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0D1B2E', borderColor: '#21385E', fontSize: 11 }}
                  formatter={(val, name) => [`${Number(val).toFixed(1)}%`, name]}
                />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
                <Line type="monotone" dataKey="suburban" name="Suburban" stroke="#2EC4B6" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="urban" name="Urban" stroke="#38BDF8" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="dense_urban" name="Dense Urban" stroke="#A855F7" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="highrise_urban" name="High-Rise" stroke="#EF4444" dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Comparative Across All 4 Environments Table */}
      <div className="bg-[#101F36] border border-[#21385E] rounded-xl p-5">
        <h3 className="font-display text-sm font-bold text-white uppercase tracking-wider mb-3">
          Cross-Environment A2G Benchmark (2 GHz Carrier, PL_max = 100 dB)
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#15294A] text-gray-400 uppercase font-mono text-[10px]">
              <tr>
                <th className="py-2.5 px-3 rounded-l">Environment</th>
                <th className="py-2.5 px-3">a (shape)</th>
                <th className="py-2.5 px-3">b (scale)</th>
                <th className="py-2.5 px-3">Optimal Altitude h*</th>
                <th className="py-2.5 px-3">Coverage Radius R*</th>
                <th className="py-2.5 px-3">Elevation θ*</th>
                <th className="py-2.5 px-3">Radius at 120m</th>
                <th className="py-2.5 px-3 rounded-r">Area Loss (%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#21385E]">
              {comparative.map((c) => (
                <tr
                  key={c.environment}
                  className={`hover:bg-[#15294A]/40 transition ${
                    c.environment === selectedEnv ? 'bg-[#15294A]/60 font-semibold' : ''
                  }`}
                >
                  <td className="py-2.5 px-3 font-medium text-white flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${
                      c.environment === 'suburban' ? 'bg-[#2EC4B6]' :
                      c.environment === 'urban' ? 'bg-[#38BDF8]' :
                      c.environment === 'dense_urban' ? 'bg-[#A855F7]' : 'bg-[#EF4444]'
                    }`} />
                    {c.name}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-gray-400">
                    {c.environment === 'suburban' ? 4.88 : c.environment === 'urban' ? 9.61 : c.environment === 'dense_urban' ? 12.08 : 27.23}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-gray-400">
                    {c.environment === 'suburban' ? 0.43 : c.environment === 'urban' ? 0.16 : c.environment === 'dense_urban' ? 0.11 : 0.08}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-[#38BDF8] font-bold">{c.h_opt} m</td>
                  <td className="py-2.5 px-3 font-mono text-[#10B981] font-bold">{c.R_opt} m</td>
                  <td className="py-2.5 px-3 font-mono text-amber-400">{c.theta_opt}°</td>
                  <td className="py-2.5 px-3 font-mono text-gray-300">{c.R_120} m</td>
                  <td className="py-2.5 px-3 font-mono text-red-400 font-bold">−{c.area_loss_pct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mathematical Formulations Display */}
      <div className="bg-[#101F36] border border-[#21385E] rounded-xl p-5 space-y-3">
        <h4 className="font-display text-xs font-bold text-white uppercase tracking-wider">
          Air-to-Ground Mathematical Equations Implemented
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono text-gray-300">
          <div className="bg-[#0A1424] p-3 rounded-lg border border-[#21385E]">
            <div className="text-[10px] text-[#2EC4B6] font-sans font-bold uppercase mb-1">LoS Probability</div>
            P_LoS(θ) = 1 / [1 + a · exp(−b(θ − a))]
          </div>
          <div className="bg-[#0A1424] p-3 rounded-lg border border-[#21385E]">
            <div className="text-[10px] text-[#2EC4B6] font-sans font-bold uppercase mb-1">Mean Path Loss</div>
            PL(h, r) = FSPL(d) + P_LoS · η_LoS + (1 − P_LoS) · η_NLoS
          </div>
          <div className="bg-[#0A1424] p-3 rounded-lg border border-[#21385E]">
            <div className="text-[10px] text-[#2EC4B6] font-sans font-bold uppercase mb-1">Shannon User Rate</div>
            R_i = (B / N_k) · log2(1 + SINR_i)
          </div>
        </div>
      </div>
    </div>
  );
}
