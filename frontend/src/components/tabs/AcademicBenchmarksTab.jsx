import React, { useState, useEffect } from 'react';
import { Award, Download, CheckCircle2, BookOpen, HelpCircle, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import { fetchBenchmarks } from '../../api';

export default function AcademicBenchmarksTab({ deployData }) {
  const [benchmarks, setBenchmarks] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState(0);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const res = await fetchBenchmarks();
        setBenchmarks(res);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const e2 = benchmarks?.e2 || [];
  const e1 = benchmarks?.e1 || [];
  const e6 = benchmarks?.e6 || {};

  const handleExportJSON = () => {
    const jsonStr = JSON.stringify(benchmarks || deployData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `uav_drn_simulation_report_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const FAQS = [
    {
      q: 'Why does the proposed Hybrid Greedy-PSO outperform Greedy-MCP?',
      a: 'Greedy-MCP optimizes purely for geometric coverage by packing UAVs tightly around survivor clusters. However, on shared wireless spectrum (Reuse 1), neighboring co-channel UAVs create destructive inter-cell interference that drives SINR below 0 dB. The proposed Hybrid Greedy-PSO uses an interference-aware fitness function: it penalizes co-channel proximity while preserving coverage, lifting served users from 86.8% to 92.1% (and preventing the catastrophic coverage drop seen in Greedy-MCP when K increases).'
    },
    {
      q: 'Why does capping UAV altitude at 120 m (small-drone regulation) cause an 83% coverage loss?',
      a: 'According to Al-Hourani\'s A2G channel model, the optimal altitude for Urban environments is h* = 646 m, giving a coverage radius R* = 707 m (coverage area ~1.57 km²). When restricted to 120 m by civil aviation safety rules, the low elevation angle dramatically reduces the Line-of-Sight probability (P_LoS drops to ~18%), forcing the coverage radius down to 292 m (area ~0.27 km²), an 82.9% reduction.'
    },
    {
      q: 'Why does Frequency Reuse 3 have lower sum throughput despite much higher SINR?',
      a: 'This reflects the fundamental Shannon capacity equation: Rate = (B / N_k) · log2(1 + SINR). Frequency Reuse 3 increases median SINR by +12.3 dB (from 8.8 dB to 21.2 dB) by separating co-channel interferers, but it divides the available spectrum into three 5 MHz channels instead of one 15 MHz channel. Because logarithmic SINR growth cannot completely compensate for a 3-fold bandwidth reduction, overall sum throughput drops, while 5th-percentile edge users experience significantly higher connection stability.'
    },
    {
      q: 'How was the propulsion energy model validated against published aerospace literature?',
      a: 'The propulsion model strictly implements the closed-form formulation of Zeng et al. (IEEE Trans. Wireless Commun., 2019). Hover propulsion power P_hover = P0 + Pi = 79.86 W + 88.63 W = 168.49 W. Adding a 40 W cellular small-cell payload totals 208.49 W. With a standard 200 Wh battery pack (80% usable = 160 Wh), on-station endurance is exactly 41.2 minutes.'
    }
  ];

  return (
    <div className="space-y-6">
      {/* College Project Banner */}
      <div className="bg-[#101F36] border border-[#21385E] rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-[#2EC4B6]/20 text-[#2EC4B6]">
              Final Year College Capstone Project
            </span>
            <span className="text-xs text-gray-400">Wireless & Mobile Communication Case Study</span>
          </div>
          <h2 className="text-xl font-bold font-display text-white mt-1">
            Academic Validation & Monte-Carlo Research Benchmarks
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Department of Computer Science and Engineering · SRM Institute of Science and Technology, Kattankulathur
          </p>
        </div>

        <button
          onClick={handleExportJSON}
          className="px-4 py-2 bg-[#2EC4B6] hover:bg-[#26a89c] text-[#04201D] font-bold text-xs uppercase tracking-wider rounded-lg shadow-lg shadow-[#2EC4B6]/20 transition flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          Export Project Data (JSON)
        </button>
      </div>

      {/* Academic Domain & Team Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#101F36] border border-[#21385E] rounded-xl p-4">
          <div className="text-[10px] text-gray-400 uppercase font-semibold">Academic Case Study</div>
          <div className="font-display font-bold text-base text-white mt-1">Department of CSE</div>
          <div className="text-xs text-gray-400">Wireless and Mobile Communication</div>
          <div className="text-[11px] text-[#2EC4B6] mt-2">SRM Institute of Science & Technology</div>
        </div>

        <div className="bg-[#101F36] border border-[#21385E] rounded-xl p-4">
          <div className="text-[10px] text-gray-400 uppercase font-semibold">Student Researchers</div>
          <div className="text-xs text-white space-y-1 mt-1">
            <div>• Sriram R</div>
            <div>• Sharvesha B</div>
            <div>• Aravind Srinivasan</div>
            <div>• Dharunesh V</div>
          </div>
        </div>

        <div className="bg-[#101F36] border border-[#21385E] rounded-xl p-4">
          <div className="text-[10px] text-gray-400 uppercase font-semibold">Validation Scope</div>
          <div className="text-xs text-white space-y-1.5 mt-1">
            <div className="flex items-center gap-1.5 text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" /> 20 Independent Monte-Carlo Seeds
            </div>
            <div className="flex items-center gap-1.5 text-blue-400">
              <CheckCircle2 className="w-3.5 h-3.5" /> 10 Pytest Formal Unit Verifications
            </div>
            <div className="flex items-center gap-1.5 text-amber-400">
              <CheckCircle2 className="w-3.5 h-3.5" /> Al-Hourani A2G & Zeng Energy Models
            </div>
          </div>
        </div>
      </div>

      {/* Real 20-Seed Monte-Carlo Experimental Results Table (E2) */}
      <div className="bg-[#101F36] border border-[#21385E] rounded-xl p-5 space-y-3">
        <div className="flex justify-between items-center">
          <h3 className="font-display text-sm font-bold text-white uppercase tracking-wider">
            Table 1: 20-Seed Monte Carlo Algorithm Benchmark (Urban, K=6 UAVs, 2 GHz, PL_max = 100 dB)
          </h3>
          <span className="text-xs font-mono text-gray-400">Runtime: ~11 min on CPU</span>
        </div>
        <p className="text-xs text-gray-400">
          Direct empirical statistical output from <span className="text-white font-mono">e2_algorithms_summary.csv</span> showing mean values with standard deviations (±σ).
        </p>

        <div className="overflow-x-auto pt-1">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#15294A] text-gray-400 font-mono text-[10px] uppercase">
              <tr>
                <th className="py-2.5 px-3 rounded-l">Algorithm</th>
                <th className="py-2.5 px-3">Coverage Mean (%)</th>
                <th className="py-2.5 px-3">Sum Rate (Mbps)</th>
                <th className="py-2.5 px-3">Mean Rate (Mbps)</th>
                <th className="py-2.5 px-3">Edge Rate 5th %</th>
                <th className="py-2.5 px-3">Jain's Index</th>
                <th className="py-2.5 px-3 rounded-r">Median SINR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#21385E]">
              {e2.length > 0 ? (
                e2.map((row) => (
                  <tr
                    key={row.algorithm}
                    className={`hover:bg-[#15294A]/40 transition ${
                      row.algorithm === 'Hybrid Greedy-PSO' ? 'bg-[#15294A]/60 font-semibold' : ''
                    }`}
                  >
                    <td className="py-2.5 px-3 font-medium text-white flex items-center gap-2">
                      {row.algorithm === 'Hybrid Greedy-PSO' && (
                        <span className="w-2 h-2 rounded-full bg-[#2EC4B6]"></span>
                      )}
                      {row.algorithm}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-[#10B981]">
                      {row.coverage_pct_mean.toFixed(1)}% <span className="text-[10px] text-gray-500 font-normal">±{row.coverage_pct_std.toFixed(1)}</span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-gray-300">
                      {row.sum_rate_mbps_mean.toFixed(1)} <span className="text-[10px] text-gray-500 font-normal">±{row.sum_rate_mbps_std.toFixed(0)}</span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-gray-300">
                      {row.mean_rate_mbps_mean.toFixed(3)}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-gray-300">
                      {row.edge_rate_mbps_mean.toFixed(3)}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-amber-400">
                      {row.jain_mean.toFixed(3)}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[#38BDF8]">
                      {row.median_sinr_db_mean.toFixed(1)} dB
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-4 text-center text-gray-400">Loading benchmark dataset…</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Technical FAQ / Viva Voce Prep Accordion */}
      <div className="bg-[#101F36] border border-[#21385E] rounded-xl p-5 space-y-3">
        <h3 className="font-display text-sm font-bold text-white uppercase tracking-wider mb-2 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-[#2EC4B6]" />
          Technical Defense & Viva Voce Key Inquiries
        </h3>

        <div className="space-y-2">
          {FAQS.map((faq, idx) => {
            const isOpen = expandedFaq === idx;
            return (
              <div
                key={idx}
                className="border border-[#21385E] rounded-lg overflow-hidden bg-[#0A1424]"
              >
                <button
                  onClick={() => setExpandedFaq(isOpen ? -1 : idx)}
                  className="w-full p-3 text-left font-medium text-xs text-white flex justify-between items-center hover:bg-[#15294A]/40 transition"
                >
                  <span className="flex items-center gap-2">
                    <HelpCircle className="w-3.5 h-3.5 text-[#2EC4B6] flex-shrink-0" />
                    {faq.q}
                  </span>
                  {isOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </button>
                {isOpen && (
                  <div className="p-3 pt-0 text-xs text-gray-300 leading-relaxed border-t border-[#21385E]/50 bg-[#0D1B2E]">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
