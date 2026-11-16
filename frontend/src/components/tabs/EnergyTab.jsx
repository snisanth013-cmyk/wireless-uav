import React, { useState, useEffect } from 'react';
import { BatteryCharging, Zap, Wind, Clock, ArrowRight, ShieldCheck, CheckCircle2, RotateCw, RefreshCw, AlertTriangle, Layers } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, ReferenceLine } from 'recharts';
import { calculateEnergy } from '../../api';

export default function EnergyTab({ deployData }) {
  const [params, setParams] = useState({
    K: deployData?.K || 6,
    battery_wh: 200,
    usable: 0.8,
    payload_w: 40,
    transit_min: 4,
    cruise_ms: 10,
    turnaround_swap_min: 10,
    turnaround_recharge_min: 60,
    horizon_h: 24
  });

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadEnergy() {
      try {
        setLoading(true);
        const res = await calculateEnergy(params);
        setData(res);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadEnergy();
  }, [params]);

  const powerCurve = data?.power_curve || [];
  const swapAvail = data?.swap_availability_curve || [];
  const rechargeAvail = data?.recharge_availability_curve || [];
  const tetheredVsBattery = data?.tethered_vs_battery || [];
  const fleetReq = data?.fleet_required || { battery_swap: 9, battery_recharge: 16, tethered: 6 };

  // Combine availability curves for dual plotting
  const combinedAvail = [];
  const maxFleet = Math.max(
    ...swapAvail.map(s => s.fleet_size),
    ...rechargeAvail.map(r => r.fleet_size),
    20
  );
  for (let f = params.K; f <= maxFleet; f++) {
    const s = swapAvail.find(x => x.fleet_size === f);
    const r = rechargeAvail.find(x => x.fleet_size === f);
    if (s || r) {
      combinedAvail.push({
        fleet_size: f,
        swap_avail: s ? s.availability_pct : 100,
        recharge_avail: r ? r.availability_pct : null,
      });
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#101F36] border border-[#21385E] rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-xs uppercase font-bold tracking-wider text-[#2EC4B6]">Module 6</div>
          <h2 className="text-xl font-bold font-display text-white mt-0.5">Energy Management & Fleet Rotation Operations</h2>
          <p className="text-xs text-gray-400 mt-1 max-w-2xl">
            Rotary-wing aerodynamics based on <b>Y. Zeng et al. (IEEE TWC 2019)</b>. Calculates hover power drain, on-station loiter endurance, and 24-hour continuous mission availability comparing <b>Battery Swapping</b>, <b>Battery Recharging</b>, and <b>Tethered Drones</b>.
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="px-3 py-1.5 rounded-lg bg-[#0A1424] border border-[#21385E]">
            <span className="text-gray-400 block text-[10px] uppercase">Hover Power</span>
            <span className="font-mono font-bold text-amber-400">{data?.hover_propulsion_w || 168.5} W</span>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-[#0A1424] border border-[#21385E]">
            <span className="text-gray-400 block text-[10px] uppercase">Radio Payload</span>
            <span className="font-mono font-bold text-[#38BDF8]">{params.payload_w} W</span>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-[#0A1424] border border-[#21385E]">
            <span className="text-gray-400 block text-[10px] uppercase">Total Loiter</span>
            <span className="font-mono font-bold text-[#10B981]">{data?.total_hover_power_w || 208.5} W</span>
          </div>
        </div>
      </div>

      {/* KPI Cards: Endurance & Fleet Sizing */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#101F36] border border-[#21385E] rounded-xl p-4">
          <div className="text-xs text-gray-400 uppercase font-semibold">On-Station Loiter Time</div>
          <div className="text-2xl font-display font-bold text-[#10B981] mt-1">
            {data?.on_station_min || 41.2} <span className="text-sm font-normal text-gray-400">minutes</span>
          </div>
          <div className="text-[11px] text-gray-400 mt-1">
            Usable battery = {(params.battery_wh * params.usable).toFixed(0)} Wh (20% reserve)
          </div>
        </div>

        <div className="bg-[#101F36] border border-[#21385E] rounded-xl p-4">
          <div className="text-xs text-gray-400 uppercase font-semibold">Total Sortie Duration</div>
          <div className="text-2xl font-display font-bold text-white mt-1">
            {data?.total_sortie_min || 49.2} <span className="text-sm font-normal text-gray-400">minutes</span>
          </div>
          <div className="text-[11px] text-gray-400 mt-1">
            Includes 2 × {params.transit_min}m transit from depot
          </div>
        </div>

        <div className="bg-[#101F36] border border-[#21385E] rounded-xl p-4">
          <div className="text-xs text-orange-400 uppercase font-semibold">24h Fleet (Battery Swap)</div>
          <div className="text-2xl font-display font-bold text-orange-400 mt-1">
            {fleetReq.battery_swap} <span className="text-sm font-normal text-gray-400">drones</span>
          </div>
          <div className="text-[11px] text-gray-400 mt-1">
            10-min battery swap turnaround
          </div>
        </div>

        <div className="bg-[#101F36] border border-[#21385E] rounded-xl p-4">
          <div className="text-xs text-blue-400 uppercase font-semibold">24h Fleet (Tethered Drones)</div>
          <div className="text-2xl font-display font-bold text-blue-400 mt-1">
            {fleetReq.tethered} <span className="text-sm font-normal text-gray-400">drones</span>
          </div>
          <div className="text-[11px] text-gray-400 mt-1">
            Ground tether cable (100% on station)
          </div>
        </div>
      </div>

      {/* Two Technical Charts: P(V) Curve & Fleet Availability Simulation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: P(V) Propulsion Power Curve */}
        <div className="bg-[#101F36] border border-[#21385E] rounded-xl p-5 space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="font-display text-sm font-bold text-white uppercase tracking-wider">
              UAV Power Consumption vs Airspeed P(V)
            </h3>
            <span className="text-xs font-mono text-[#2EC4B6]">
              V* = {data?.optimal_airspeed_ms || 10.3} m/s
            </span>
          </div>
          <p className="text-[11px] text-gray-400">
            Induced power decreases with forward speed while parasitic drag increases with V³, yielding a minimum-power cruise airspeed of ~10.3 m/s (37 km/h) for transit between depot and stations.
          </p>

          <div className="h-[250px] w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={powerCurve}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1F3657" vertical={false} />
                <XAxis dataKey="speed_ms" stroke="#64748B" tick={{ fontSize: 10 }} unit=" m/s" />
                <YAxis stroke="#64748B" tick={{ fontSize: 10 }} unit=" W" domain={[100, 320]} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0D1B2E', borderColor: '#21385E', fontSize: 11 }}
                  formatter={(val, name) => [`${val} W`, name === 'power_w' ? 'Propulsion Power' : 'Total Power (+40W Payload)']}
                  labelFormatter={(lbl) => `Airspeed V = ${lbl} m/s`}
                />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
                <ReferenceLine x={data?.optimal_airspeed_ms || 10.25} stroke="#10B981" strokeDasharray="3 3" label={{ value: 'V*', fill: '#10B981', fontSize: 10 }} />
                <Line type="monotone" dataKey="power_w" name="Propulsion P(V)" stroke="#38BDF8" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="total_w" name="Total Power P_total" stroke="#F59E0B" dot={false} strokeWidth={2.5} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: 24h Availability vs Fleet Size Simulation */}
        <div className="bg-[#101F36] border border-[#21385E] rounded-xl p-5 space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="font-display text-sm font-bold text-white uppercase tracking-wider">
              24-Hour Continuous Fleet Availability
            </h3>
            <span className="text-xs text-gray-400 font-mono">Event-Driven Simulation</span>
          </div>
          <p className="text-[11px] text-gray-400">
            Simulates staggered hand-over departures and depot battery charging queue. Battery swap achieves 100% availability with 9 UAVs; recharging requires 16 UAVs due to 60-min recharge queue.
          </p>

          <div className="h-[250px] w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={combinedAvail}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1F3657" vertical={false} />
                <XAxis dataKey="fleet_size" stroke="#64748B" tick={{ fontSize: 10 }} unit=" UAVs" />
                <YAxis stroke="#64748B" tick={{ fontSize: 10 }} unit="%" domain={[50, 105]} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0D1B2E', borderColor: '#21385E', fontSize: 11 }}
                  formatter={(val, name) => [`${val}%`, name === 'swap_avail' ? 'Battery Swap (10m)' : 'Battery Recharge (60m)']}
                  labelFormatter={(lbl) => `Fleet Size = ${lbl} UAVs`}
                />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
                <ReferenceLine y={100} stroke="#2EC4B6" strokeDasharray="3 3" />
                <Line type="monotone" dataKey="swap_avail" name="Battery Swap (10m turnaround)" stroke="#10B981" strokeWidth={2.5} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="recharge_avail" name="Battery Recharge (60m turnaround)" stroke="#EF4444" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Tethered UAV vs Battery-Powered UAV Comparison Table */}
      <div className="bg-[#101F36] border border-[#21385E] rounded-xl p-5 space-y-3">
        <h3 className="font-display text-sm font-bold text-white uppercase tracking-wider flex items-center justify-between">
          <span>In-Depth Architecture Comparison: Tethered UAV vs Battery-Powered UAV</span>
          <span className="text-xs font-mono text-gray-400 font-normal">Disaster Recovery Trade-Off Matrix</span>
        </h3>
        <p className="text-xs text-gray-400">
          Tethered UAVs deliver continuous power via micro-tether cables from ground generators, eliminating flight time limits. Battery drones offer untethered 3D spatial repositioning anywhere across the 16 km² zone.
        </p>

        <div className="overflow-x-auto pt-2">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#15294A] text-gray-400 font-mono text-[10px] uppercase">
              <tr>
                <th className="py-2.5 px-3 rounded-l">Evaluation Metric</th>
                <th className="py-2.5 px-3">Battery-Powered Drone Swarm</th>
                <th className="py-2.5 px-3 rounded-r text-[#38BDF8]">Tethered UAV Base Station</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#21385E]">
              {tetheredVsBattery.map((row, idx) => (
                <tr key={idx} className="hover:bg-[#15294A]/40 transition">
                  <td className="py-2.5 px-3 font-semibold text-white">
                    {row.metric}
                  </td>
                  <td className="py-2.5 px-3 text-gray-300">
                    {row.battery_drone}
                  </td>
                  <td className="py-2.5 px-3 font-medium text-[#38BDF8]">
                    {row.tethered_drone}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
