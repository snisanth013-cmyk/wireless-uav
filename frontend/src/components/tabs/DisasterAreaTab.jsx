import React, { useState } from 'react';
import { ShieldAlert, Users, Sliders, RefreshCw, MapPin, Compass, BarChart3, Layers, Map as MapIcon } from 'lucide-react';
import InteractiveMap from '../InteractiveMap';
import LeafletDisasterMap from '../LeafletDisasterMap';

export default function DisasterAreaTab({
  scenario,
  deployData,
  onGenerateScenario,
  onUAVMove,
  loading
}) {
  const [useLeaflet, setUseLeaflet] = useState(false);
  const [params, setParams] = useState({
    area: 4000,
    n_camps: 6,
    camp_min: 70,
    camp_max: 160,
    sigma: 190,
    n_scattered: 160,
    min_sep: 700,
    seed: scenario?.seed || 3
  });

  const camps = scenario?.camps || [];
  const users = scenario?.users || [];
  const totalUsers = users.length;
  const clusteredCount = camps.reduce((sum, c) => sum + c.user_count, 0);
  const scatteredCount = totalUsers - clusteredCount;

  const handleSubmit = (e) => {
    e.preventDefault();
    onGenerateScenario(params);
  };

  const handleRandomSeed = () => {
    const newSeed = Math.floor(Math.random() * 10000) + 1;
    setParams(p => ({ ...p, seed: newSeed }));
    onGenerateScenario({ ...params, seed: newSeed });
  };

  return (
    <div className="space-y-6">
      {/* Header and description */}
      <div className="bg-[#101F36] border border-[#21385E] rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-xs uppercase font-bold tracking-wider text-[#2EC4B6]">Module 1</div>
          <h2 className="text-xl font-bold font-display text-white mt-0.5">Disaster Area Geographical Simulation</h2>
          <p className="text-xs text-gray-400 mt-1 max-w-2xl">
            Simulates a catastrophic event destroying terrestrial base stations. Survivors assemble organically into relief camps under Gaussian spatial clustering (<span className="text-white font-mono">σ = 190m</span>) with scattered stragglers across a <span className="text-white font-mono">4 × 4 km</span> disaster recovery zone.
          </p>
        </div>

        {/* View Mode Toggle: Interactive Canvas vs Leaflet GIS */}
        <div className="flex items-center bg-[#0A1424] border border-[#21385E] rounded-lg p-1 text-xs">
          <button
            onClick={() => setUseLeaflet(false)}
            className={`px-3 py-1.5 rounded-md font-medium transition flex items-center gap-1.5 ${
              !useLeaflet ? 'bg-[#2EC4B6] text-[#04201D] font-bold' : 'text-gray-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            2D Canvas Mission Map
          </button>
          <button
            onClick={() => setUseLeaflet(true)}
            className={`px-3 py-1.5 rounded-md font-medium transition flex items-center gap-1.5 ${
              useLeaflet ? 'bg-[#2EC4B6] text-[#04201D] font-bold' : 'text-gray-400 hover:text-white'
            }`}
          >
            <MapIcon className="w-3.5 h-3.5" />
            Leaflet GIS Satellite
          </button>
        </div>
      </div>

      {/* Grid: Map + Configuration Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Map View (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          {useLeaflet ? (
            <LeafletDisasterMap
              scenario={scenario}
              deployData={deployData}
              area={params.area}
              onUAVMove={onUAVMove}
            />
          ) : (
            <InteractiveMap
              scenario={scenario}
              deployData={deployData}
              area={params.area}
              onUAVMove={onUAVMove}
              isDraggable={true}
            />
          )}

          {/* Relief Camp Summary Table */}
          <div className="bg-[#101F36] border border-[#21385E] rounded-xl p-4">
            <h3 className="font-display text-sm font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-[#F59E0B]" />
              Identified Relief Camp Zones ({camps.length} Camps)
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#15294A] text-gray-400 uppercase font-mono text-[10px]">
                  <tr>
                    <th className="py-2 px-3 rounded-l">Camp ID</th>
                    <th className="py-2 px-3">X Coord (m)</th>
                    <th className="py-2 px-3">Y Coord (m)</th>
                    <th className="py-2 px-3">Population</th>
                    <th className="py-2 px-3">Cluster Share</th>
                    <th className="py-2 px-3 rounded-r">Priority Level</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#21385E]">
                  {camps.map((camp) => (
                    <tr key={camp.id} className="hover:bg-[#15294A]/50 transition">
                      <td className="py-2 px-3 font-mono font-bold text-[#F59E0B]">
                        Camp #{camp.id}
                      </td>
                      <td className="py-2 px-3 font-mono text-gray-300">{Math.round(camp.x)}</td>
                      <td className="py-2 px-3 font-mono text-gray-300">{Math.round(camp.y)}</td>
                      <td className="py-2 px-3 font-semibold text-white">{camp.user_count} survivors</td>
                      <td className="py-2 px-3 text-gray-400">
                        {((camp.user_count / totalUsers) * 100).toFixed(1)}%
                      </td>
                      <td className="py-2 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          camp.user_count > 120 ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                          camp.user_count > 90 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                          'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                        }`}>
                          {camp.user_count > 120 ? 'Critical' : camp.user_count > 90 ? 'High' : 'Moderate'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Configuration Controls (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <form onSubmit={handleSubmit} className="bg-[#101F36] border border-[#21385E] rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#21385E] pb-3">
              <h3 className="font-display text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[#2EC4B6]" />
                Scenario Generator Parameters
              </h3>
              <button
                type="button"
                onClick={handleRandomSeed}
                className="text-xs text-[#2EC4B6] hover:underline flex items-center gap-1"
                title="Generate Random Seed"
              >
                <RefreshCw className="w-3 h-3" />
                Randomize
              </button>
            </div>

            {/* Area Size */}
            <div className="space-y-1">
              <label className="text-xs text-gray-300 flex justify-between">
                <span>Simulation Dimension (L)</span>
                <span className="font-mono text-white">{params.area} m × {params.area} m</span>
              </label>
              <input
                type="range"
                min="2000"
                max="8000"
                step="500"
                value={params.area}
                onChange={(e) => setParams(p => ({ ...p, area: Number(e.target.value) }))}
                className="w-full accent-[#2EC4B6]"
              />
            </div>

            {/* Number of Camps */}
            <div className="space-y-1">
              <label className="text-xs text-gray-300 flex justify-between">
                <span>Number of Relief Camps</span>
                <span className="font-mono text-[#F59E0B] font-bold">{params.n_camps} camps</span>
              </label>
              <input
                type="range"
                min="3"
                max="10"
                value={params.n_camps}
                onChange={(e) => setParams(p => ({ ...p, n_camps: Number(e.target.value) }))}
                className="w-full accent-[#F59E0B]"
              />
            </div>

            {/* Camp Cluster Dispersion (Sigma) */}
            <div className="space-y-1">
              <label className="text-xs text-gray-300 flex justify-between">
                <span>Camp Cluster Spread (σ)</span>
                <span className="font-mono text-white">{params.sigma} m</span>
              </label>
              <input
                type="range"
                min="80"
                max="350"
                step="10"
                value={params.sigma}
                onChange={(e) => setParams(p => ({ ...p, sigma: Number(e.target.value) }))}
                className="w-full accent-[#2EC4B6]"
              />
            </div>

            {/* Min Separation */}
            <div className="space-y-1">
              <label className="text-xs text-gray-300 flex justify-between">
                <span>Min Separation Distance</span>
                <span className="font-mono text-white">{params.min_sep} m</span>
              </label>
              <input
                type="range"
                min="400"
                max="1200"
                step="50"
                value={params.min_sep}
                onChange={(e) => setParams(p => ({ ...p, min_sep: Number(e.target.value) }))}
                className="w-full accent-[#2EC4B6]"
              />
            </div>

            {/* Scattered Stragglers */}
            <div className="space-y-1">
              <label className="text-xs text-gray-300 flex justify-between">
                <span>Scattered Stragglers</span>
                <span className="font-mono text-white">{params.n_scattered} users</span>
              </label>
              <input
                type="range"
                min="50"
                max="300"
                step="10"
                value={params.n_scattered}
                onChange={(e) => setParams(p => ({ ...p, n_scattered: Number(e.target.value) }))}
                className="w-full accent-[#2EC4B6]"
              />
            </div>

            {/* Seed */}
            <div className="space-y-1">
              <label className="text-xs text-gray-300 flex justify-between">
                <span>Random Seed (Reproducibility)</span>
                <span className="font-mono text-[#38BDF8]">seed={params.seed}</span>
              </label>
              <input
                type="number"
                value={params.seed}
                onChange={(e) => setParams(p => ({ ...p, seed: Number(e.target.value) }))}
                className="w-full bg-[#15294A] border border-[#21385E] rounded-lg px-3 py-1.5 text-xs text-white"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-[#2EC4B6] hover:bg-[#26a89c] text-[#04201D] font-bold text-xs uppercase tracking-wider rounded-lg transition disabled:opacity-50"
            >
              {loading ? 'Synthesizing Area…' : 'Generate New Scenario'}
            </button>
          </form>

          {/* Population Breakdown Box */}
          <div className="bg-[#101F36] border border-[#21385E] rounded-xl p-5 space-y-3">
            <h4 className="font-display text-sm font-bold text-white uppercase tracking-wider">
              Disaster Zone Population Demographics
            </h4>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center py-1.5 border-b border-[#21385E]">
                <span className="text-gray-400">Total User Endpoints</span>
                <span className="font-mono font-bold text-white text-sm">{totalUsers}</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-[#21385E]">
                <span className="text-gray-400">Clustered in Relief Camps</span>
                <span className="font-mono font-bold text-[#F59E0B] text-sm">
                  {clusteredCount} ({((clusteredCount / totalUsers) * 100).toFixed(1)}%)
                </span>
              </div>
              <div className="flex justify-between items-center py-1.5">
                <span className="text-gray-400">Isolated Scattered Users</span>
                <span className="font-mono font-bold text-red-400 text-sm">
                  {scatteredCount} ({((scatteredCount / totalUsers) * 100).toFixed(1)}%)
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
