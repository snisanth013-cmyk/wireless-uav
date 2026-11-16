import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import OverviewTab from './components/tabs/OverviewTab';
import DisasterAreaTab from './components/tabs/DisasterAreaTab';
import UAVDeploymentTab from './components/tabs/UAVDeploymentTab';
import WirelessAnalysisTab from './components/tabs/WirelessAnalysisTab';
import CoverageTab from './components/tabs/CoverageTab';
import InterferenceTab from './components/tabs/InterferenceTab';
import EnergyTab from './components/tabs/EnergyTab';
import AcademicBenchmarksTab from './components/tabs/AcademicBenchmarksTab';

import {
  fetchHealth,
  fetchConfig,
  generateScenario,
  analyzeChannel,
  deployUAVs,
  compareAllAlgorithms,
  calculateEnergy,
  fetchBenchmarks
} from './api';

export default function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [backendOnline, setBackendOnline] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Initializing simulation environment…');

  // Simulation State
  const [config, setConfig] = useState(null);
  const [scenario, setScenario] = useState(null);
  const [channelData, setChannelData] = useState(null);
  const [deployData, setDeployData] = useState(null);
  const [comparisonData, setComparisonData] = useState(null);
  const [energyData, setEnergyData] = useState(null);
  const [benchmarks, setBenchmarks] = useState(null);

  // Active Parameters
  const [algorithm, setAlgorithm] = useState('Hybrid Greedy-PSO');
  const [K, setK] = useState(6);
  const [env, setEnv] = useState('urban');
  const [seed, setSeed] = useState(3);
  const [area, setArea] = useState(4000);

  // Initial Load
  useEffect(() => {
    async function initSystem() {
      try {
        setLoading(true);
        setStatusMessage('Connecting to Python Flask simulation engine…');

        // Check health
        await fetchHealth();
        setBackendOnline(true);

        // Fetch config & initial channel model
        const [cfg, chRes, enRes, bmRes] = await Promise.all([
          fetchConfig(),
          analyzeChannel({ env: 'urban', pl_max: 100.0, fc: 2e9 }),
          calculateEnergy({ K: 6 }),
          fetchBenchmarks()
        ]);
        setConfig(cfg);
        setChannelData(chRes);
        setEnergyData(enRes);
        setBenchmarks(bmRes);

        // Generate default scenario
        setStatusMessage('Synthesizing disaster area scenario with 6 relief camps…');
        const scenRes = await generateScenario({ seed: 3, area: 4000, n_camps: 6 });
        setScenario(scenRes);

        // Initial deployment with Hybrid Greedy-PSO
        setStatusMessage('Executing Hybrid Greedy-PSO swarm placement…');
        const depRes = await deployUAVs({
          algorithm: 'Hybrid Greedy-PSO',
          K: 6,
          env: 'urban',
          seed: 3,
          area: 4000,
          users: scenRes.users
        });
        setDeployData(depRes);

        // Preload comparisons
        compareAllAlgorithms({
          K: 6,
          env: 'urban',
          seed: 3,
          area: 4000,
          users: scenRes.users
        }).then(res => setComparisonData(res)).catch(() => {});

        setStatusMessage('UAV-DRN Simulation Engine ready.');
      } catch (err) {
        console.error('Initialization error:', err);
        setBackendOnline(false);
        setStatusMessage('Simulation engine offline or connecting…');
      } finally {
        setLoading(false);
      }
    }

    initSystem();
  }, []);

  // Handler: Generate New Scenario
  const handleGenerateScenario = useCallback(async (customParams = {}) => {
    try {
      setLoading(true);
      const newSeed = customParams.seed || Math.floor(Math.random() * 10000) + 1;
      setSeed(newSeed);
      setStatusMessage(`Synthesizing new scenario (seed=${newSeed})…`);

      const scenRes = await generateScenario({
        seed: newSeed,
        area: customParams.area || area,
        n_camps: customParams.n_camps || 6,
        ...customParams
      });
      setScenario(scenRes);

      // Re-run deployment on new scenario
      const depRes = await deployUAVs({
        algorithm,
        K,
        env,
        seed: newSeed,
        area: customParams.area || area,
        users: scenRes.users
      });
      setDeployData(depRes);

      // Refresh comparison
      compareAllAlgorithms({
        K,
        env,
        seed: newSeed,
        area: customParams.area || area,
        users: scenRes.users
      }).then(res => setComparisonData(res)).catch(() => {});

      setStatusMessage(`Scenario generated: ${scenRes.n_users} survivors across ${scenRes.n_camps} relief camps.`);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [algorithm, K, env, area]);

  // Handler: Quick New Scenario with random seed
  const handleQuickNewScenario = useCallback(() => {
    handleGenerateScenario();
  }, [handleGenerateScenario]);

  // Handler: Run / Re-Deploy UAV Network
  const handleRunDeploy = useCallback(async () => {
    if (!scenario?.users) return;
    try {
      setLoading(true);
      setStatusMessage(`Deploying ${K} UAVs using ${algorithm}…`);
      const depRes = await deployUAVs({
        algorithm,
        K,
        env,
        seed,
        area,
        users: scenario.users
      });
      setDeployData(depRes);
      setStatusMessage(`Placement completed: ${depRes.metrics.coverage_pct}% coverage in ${depRes.runtime_ms} ms.`);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [algorithm, K, env, seed, area, scenario]);

  // Handler: Algorithm Change
  const handleAlgorithmChange = useCallback((newAlg) => {
    setAlgorithm(newAlg);
    if (!scenario?.users) return;
    setLoading(true);
    deployUAVs({
      algorithm: newAlg,
      K,
      env,
      seed,
      area,
      users: scenario.users
    }).then(depRes => {
      setDeployData(depRes);
      setStatusMessage(`Switched to ${newAlg} algorithm.`);
    }).catch(console.error).finally(() => setLoading(false));
  }, [K, env, seed, area, scenario]);

  // Handler: Fleet Size (K) Change
  const handleKChange = useCallback((newK) => {
    setK(newK);
    if (!scenario?.users) return;
    setLoading(true);
    deployUAVs({
      algorithm,
      K: newK,
      env,
      seed,
      area,
      users: scenario.users
    }).then(depRes => {
      setDeployData(depRes);
      // Update energy for new K
      calculateEnergy({ K: newK }).then(enRes => setEnergyData(enRes)).catch(() => {});
    }).catch(console.error).finally(() => setLoading(false));
  }, [algorithm, env, seed, area, scenario]);

  // Handler: Environment Change
  const handleEnvironmentChange = useCallback((newEnv) => {
    setEnv(newEnv);
    if (!scenario?.users) return;
    deployUAVs({
      algorithm,
      K,
      env: newEnv,
      seed,
      area,
      users: scenario.users
    }).then(depRes => setDeployData(depRes)).catch(console.error);
  }, [algorithm, K, seed, area, scenario]);

  // Handler: Compare All 5 Algorithms
  const handleCompareAll = useCallback(async () => {
    if (!scenario?.users) return;
    try {
      setLoading(true);
      setStatusMessage('Benchmarking all 5 algorithms simultaneously…');
      const res = await compareAllAlgorithms({
        K,
        env,
        seed,
        area,
        users: scenario.users
      });
      setComparisonData(res);
      setStatusMessage('5-Algorithm benchmark complete.');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [K, env, seed, area, scenario]);

  // Handler: Interactive Drag & Drop UAV Move
  const handleUAVMove = useCallback((updatedUavs) => {
    if (!scenario?.users) return;
    const positions = updatedUavs.map(u => [u.x, u.y]);
    // Evaluate placement in real-time
    deployUAVs({
      algorithm: 'Custom',
      K: positions.length,
      env,
      seed,
      area,
      users: scenario.users,
      custom_uavs: positions
    }).then(depRes => {
      setDeployData(depRes);
    }).catch(console.error);
  }, [env, seed, area, scenario]);

  return (
    <div className="min-h-screen bg-[#070E1A] text-white flex flex-col font-sans selection:bg-[#2EC4B6] selection:text-[#04201D]">
      {/* Top Header */}
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        backendOnline={backendOnline}
        scenario={scenario}
        deployData={deployData}
        onNewScenario={handleQuickNewScenario}
        onRunDeploy={handleRunDeploy}
        loading={loading}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6">
        {activeTab === 'overview' && (
          <OverviewTab
            scenario={scenario}
            deployData={deployData}
            energyData={energyData}
            onAlgorithmChange={handleAlgorithmChange}
            onKChange={handleKChange}
            onUAVMove={handleUAVMove}
            onRunDeploy={handleRunDeploy}
            loading={loading}
          />
        )}

        {activeTab === 'disaster' && (
          <DisasterAreaTab
            scenario={scenario}
            deployData={deployData}
            onGenerateScenario={handleGenerateScenario}
            onUAVMove={handleUAVMove}
            loading={loading}
          />
        )}

        {activeTab === 'deployment' && (
          <UAVDeploymentTab
            scenario={scenario}
            deployData={deployData}
            comparisonData={comparisonData}
            onAlgorithmChange={handleAlgorithmChange}
            onKChange={handleKChange}
            onRunDeploy={handleRunDeploy}
            onCompareAll={handleCompareAll}
            onUAVMove={handleUAVMove}
            loading={loading}
          />
        )}

        {activeTab === 'wireless' && (
          <WirelessAnalysisTab
            channelData={channelData}
            onEnvironmentChange={handleEnvironmentChange}
            deployData={deployData}
          />
        )}

        {activeTab === 'coverage' && (
          <CoverageTab
            scenario={scenario}
            deployData={deployData}
            onUAVMove={handleUAVMove}
          />
        )}

        {activeTab === 'interference' && (
          <InterferenceTab
            deployData={deployData}
            scenario={scenario}
          />
        )}

        {activeTab === 'energy' && (
          <EnergyTab
            deployData={deployData}
          />
        )}

        {activeTab === 'benchmarks' && (
          <AcademicBenchmarksTab
            deployData={deployData}
          />
        )}
      </main>

      {/* Global Status Footer */}
      <footer className="bg-[#0A1424] border-t border-[#21385E] py-3 text-xs text-gray-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#2EC4B6]"></span>
            <span className="font-mono text-gray-300">{statusMessage}</span>
          </div>

          <div className="flex items-center gap-4 text-gray-400 text-[11px]">
            <span>SRM Institute of Science and Technology · Department of CSE</span>
            <span>Wireless & Mobile Communication Case Study</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
