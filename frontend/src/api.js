/**
 * API client for UAV-DRN Flask Backend
 */

const BASE_URL = '/api';

export async function fetchHealth() {
  const res = await fetch(`${BASE_URL}/health`);
  if (!res.ok) throw new Error('Backend health check failed');
  return res.json();
}

export async function fetchConfig() {
  const res = await fetch(`${BASE_URL}/config`);
  if (!res.ok) throw new Error('Failed to fetch simulation config');
  return res.json();
}

export async function generateScenario(params = {}) {
  const res = await fetch(`${BASE_URL}/scenario/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error('Failed to generate scenario');
  return res.json();
}

export async function analyzeChannel(params = {}) {
  const res = await fetch(`${BASE_URL}/channel/analysis`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error('Failed to analyze channel model');
  return res.json();
}

export async function deployUAVs(params = {}) {
  const res = await fetch(`${BASE_URL}/deploy`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error('Failed to execute UAV deployment');
  return res.json();
}

export async function compareAllAlgorithms(params = {}) {
  const res = await fetch(`${BASE_URL}/deploy/compare-all`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error('Failed to compare algorithms');
  return res.json();
}

export async function compareInterference(params = {}) {
  const res = await fetch(`${BASE_URL}/interference/compare`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error('Failed to analyze interference');
  return res.json();
}

export async function calculateEnergy(params = {}) {
  const res = await fetch(`${BASE_URL}/energy/calculate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error('Failed to calculate energy parameters');
  return res.json();
}

export async function fetchBenchmarks() {
  const res = await fetch(`${BASE_URL}/benchmarks`);
  if (!res.ok) throw new Error('Failed to fetch benchmark results');
  return res.json();
}
