import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Layers, Eye, Move, Radio, Users, ShieldAlert, Crosshair, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

export default function InteractiveMap({
  scenario,
  deployData,
  area = 4000,
  onUAVMove,
  isDraggable = true,
  showHeatmap = false
}) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [draggedUavIndex, setDraggedUavIndex] = useState(-1);
  const [hoveredEntity, setHoveredEntity] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Layer visibility toggles
  const [layers, setLayers] = useState({
    users: true,
    camps: true,
    uavs: true,
    coverageCircles: true,
    associationLines: true,
    interferenceLines: false,
    grid: true,
  });

  const uavs = deployData?.uavs || [];
  const users = scenario?.users || [];
  const camps = scenario?.camps || [];
  const userStatus = deployData?.user_status || [];
  const R = deployData?.R || 706.5;
  const reuse = deployData?.reuse || 1;

  // Convert world coordinates (0..area) to canvas coordinates
  const toCanvas = useCallback((wx, wy, width, height) => {
    const sc = width / area;
    return {
      cx: wx * sc,
      cy: height - wy * sc,
    };
  }, [area]);

  // Convert canvas coordinates to world coordinates (0..area)
  const toWorld = useCallback((cx, cy, width, height) => {
    const sc = width / area;
    return {
      wx: Math.max(0, Math.min(area, cx / sc)),
      wy: Math.max(0, Math.min(area, (height - cy) / sc)),
    };
  }, [area]);

  // Render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;
    const sc = W / area;

    // 1. Clear background
    ctx.fillStyle = '#06101E';
    ctx.fillRect(0, 0, W, H);

    // 2. Draw 1 km Grid & Coordinates
    if (layers.grid) {
      ctx.strokeStyle = 'rgba(33, 56, 94, 0.45)';
      ctx.lineWidth = 1;
      ctx.fillStyle = '#4B6282';
      ctx.font = '11px "JetBrains Mono", monospace';

      const gridStep = 1000;
      for (let x = gridStep; x < area; x += gridStep) {
        const { cx } = toCanvas(x, 0, W, H);
        ctx.beginPath();
        ctx.moveTo(cx, 0);
        ctx.lineTo(cx, H);
        ctx.stroke();
        ctx.fillText(`${x / 1000} km`, cx + 4, H - 6);
      }
      for (let y = gridStep; y < area; y += gridStep) {
        const { cy } = toCanvas(0, y, W, H);
        ctx.beginPath();
        ctx.moveTo(0, cy);
        ctx.lineTo(W, cy);
        ctx.stroke();
        ctx.fillText(`${y / 1000} km`, 6, cy - 4);
      }
    }

    // 3. Draw Relief Camp Halos & Priority Zones
    if (layers.camps) {
      camps.forEach((camp) => {
        const { cx, cy } = toCanvas(camp.x, camp.y, W, H);
        // Cluster halo (190m sigma)
        const sigmaRadius = 190 * sc * 2.2;
        const grad = ctx.createRadialGradient(cx, cy, 5, cx, cy, sigmaRadius);
        grad.addColorStop(0, 'rgba(234, 179, 8, 0.22)');
        grad.addColorStop(1, 'rgba(234, 179, 8, 0.0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, sigmaRadius, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // 4. Draw User Associations (lines from user to serving UAV)
    if (layers.associationLines && uavs.length > 0 && userStatus.length > 0) {
      ctx.lineWidth = 0.5;
      users.forEach((u, i) => {
        const status = userStatus[i];
        if (status?.is_covered && status.serving_uav) {
          const uav = uavs[status.serving_uav - 1];
          if (uav) {
            const { cx: ux, cy: uy } = toCanvas(u[0], u[1], W, H);
            const { cx: vx, cy: vy } = toCanvas(uav.x, uav.y, W, H);
            ctx.strokeStyle = 'rgba(46, 196, 182, 0.12)';
            ctx.beginPath();
            ctx.moveTo(ux, uy);
            ctx.lineTo(vx, vy);
            ctx.stroke();
          }
        }
      });
    }

    // 5. Draw Co-Channel Interference Lines (for Reuse 3 or nearby UAVs)
    if (layers.interferenceLines && uavs.length > 1) {
      ctx.lineWidth = 1.2;
      ctx.setLineDash([4, 4]);
      for (let i = 0; i < uavs.length; i++) {
        for (let j = i + 1; j < uavs.length; j++) {
          if (uavs[i].channel === uavs[j].channel) {
            const { cx: x1, cy: y1 } = toCanvas(uavs[i].x, uavs[i].y, W, H);
            const { cx: x2, cy: y2 } = toCanvas(uavs[j].x, uavs[j].y, W, H);
            ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
          }
        }
      }
      ctx.setLineDash([]);
    }

    // 6. Draw Users (Green = Covered, Red = Uncovered)
    if (layers.users) {
      users.forEach((u, i) => {
        const { cx, cy } = toCanvas(u[0], u[1], W, H);
        const status = userStatus[i];
        const isCovered = status ? status.is_covered : false;

        if (isCovered) {
          // Green: Covered user
          ctx.fillStyle = '#10B981';
          ctx.beginPath();
          ctx.arc(cx, cy, 2.4, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Red: Uncovered user
          ctx.strokeStyle = '#EF4444';
          ctx.lineWidth = 1.4;
          const s = 2.5;
          ctx.beginPath();
          ctx.moveTo(cx - s, cy - s);
          ctx.lineTo(cx + s, cy + s);
          ctx.moveTo(cx + s, cy - s);
          ctx.lineTo(cx - s, cy + s);
          ctx.stroke();
        }
      });
    }

    // 7. Draw Relief Camps (Yellow diamonds)
    if (layers.camps) {
      camps.forEach((camp) => {
        const { cx, cy } = toCanvas(camp.x, camp.y, W, H);
        const s = 9;

        // Glow
        ctx.fillStyle = 'rgba(234, 179, 8, 0.35)';
        ctx.beginPath();
        ctx.arc(cx, cy, s + 4, 0, Math.PI * 2);
        ctx.fill();

        // Yellow diamond
        ctx.fillStyle = '#F59E0B';
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cx, cy - s);
        ctx.lineTo(cx + s, cy);
        ctx.lineTo(cx, cy + s);
        ctx.lineTo(cx - s, cy);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Label
        ctx.fillStyle = '#FEF08A';
        ctx.font = 'bold 11px "Barlow", sans-serif';
        ctx.fillText(`Camp ${camp.id} (${camp.user_count})`, cx + 12, cy + 4);
      });
    }

    // 8. Draw UAV Base Stations and Coverage Rings (Blue)
    if (layers.uavs) {
      uavs.forEach((uav, k) => {
        const { cx, cy } = toCanvas(uav.x, uav.y, W, H);
        const pixelRadius = R * sc;

        // Coverage radius circle (Blue dashed)
        if (layers.coverageCircles) {
          ctx.strokeStyle = 'rgba(56, 189, 248, 0.65)';
          ctx.lineWidth = 1.8;
          ctx.setLineDash([7, 5]);
          ctx.beginPath();
          ctx.arc(cx, cy, pixelRadius, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);

          // Soft blue fill for coverage area
          ctx.fillStyle = 'rgba(56, 189, 248, 0.05)';
          ctx.beginPath();
          ctx.arc(cx, cy, pixelRadius, 0, Math.PI * 2);
          ctx.fill();
        }

        // UAV Icon (Blue drone chevron / quadcopter)
        const isSelected = draggedUavIndex === k;
        ctx.fillStyle = isSelected ? '#38BDF8' : '#2563EB';
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.arc(cx, cy, 11, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Quadcopter crossbars
        ctx.strokeStyle = '#93C5FD';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(cx - 15, cy - 15);
        ctx.lineTo(cx + 15, cy + 15);
        ctx.moveTo(cx - 15, cy + 15);
        ctx.lineTo(cx + 15, cy - 15);
        ctx.stroke();

        // Rotor endpoints
        const rotorR = 4;
        ctx.fillStyle = '#60A5FA';
        [
          [cx - 15, cy - 15],
          [cx + 15, cy + 15],
          [cx - 15, cy + 15],
          [cx + 15, cy - 15],
        ].forEach(([rx, ry]) => {
          ctx.beginPath();
          ctx.arc(rx, ry, rotorR, 0, Math.PI * 2);
          ctx.fill();
        });

        // UAV Label with Channel Tag
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 12px "JetBrains Mono", monospace';
        const labelText = reuse > 1 ? `U${uav.id} · f${uav.channel + 1}` : `UAV-${uav.id}`;
        ctx.fillText(labelText, cx + 18, cy - 10);

        // Served users badge
        ctx.fillStyle = '#38BDF8';
        ctx.font = '11px "Barlow", sans-serif';
        ctx.fillText(`${uav.served_users || 0} users`, cx + 18, cy + 6);
      });
    }

  }, [scenario, deployData, layers, draggedUavIndex, toCanvas, area, camps, users, uavs, userStatus, R, reuse]);

  // Pointer interaction for Drag & Drop
  const handlePointerDown = (e) => {
    if (!isDraggable || !onUAVMove) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cx = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const cy = ((e.clientY - rect.top) / rect.height) * canvas.height;

    // Check hit test against UAVs
    let foundIndex = -1;
    let minDist = 30; // hit tolerance in pixels
    uavs.forEach((uav, idx) => {
      const { cx: ux, cy: uy } = toCanvas(uav.x, uav.y, canvas.width, canvas.height);
      const d = Math.hypot(cx - ux, cy - uy);
      if (d < minDist) {
        minDist = d;
        foundIndex = idx;
      }
    });

    if (foundIndex >= 0) {
      setDraggedUavIndex(foundIndex);
      canvas.setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cx = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const cy = ((e.clientY - rect.top) / rect.height) * canvas.height;

    setMousePos({ x: e.clientX, y: e.clientY });

    if (draggedUavIndex >= 0 && onUAVMove) {
      const { wx, wy } = toWorld(cx, cy, canvas.width, canvas.height);
      const updatedUavs = uavs.map((u, i) =>
        i === draggedUavIndex ? { ...u, x: Math.round(wx), y: Math.round(wy) } : u
      );
      onUAVMove(updatedUavs);
    } else {
      // Hover detection
      let hovered = null;
      uavs.forEach((uav) => {
        const { cx: ux, cy: uy } = toCanvas(uav.x, uav.y, canvas.width, canvas.height);
        if (Math.hypot(cx - ux, cy - uy) < 18) {
          hovered = { type: 'UAV', data: uav };
        }
      });
      if (!hovered) {
        camps.forEach((camp) => {
          const { cx: cx2, cy: cy2 } = toCanvas(camp.x, camp.y, canvas.width, canvas.height);
          if (Math.hypot(cx - cx2, cy - cy2) < 15) {
            hovered = { type: 'Camp', data: camp };
          }
        });
      }
      setHoveredEntity(hovered);
    }
  };

  const handlePointerUp = (e) => {
    if (draggedUavIndex >= 0) {
      try {
        canvasRef.current.releasePointerCapture(e.pointerId);
      } catch (err) {}
      setDraggedUavIndex(-1);
    }
  };

  return (
    <div className="relative w-full bg-[#0A1424] border border-[#21385E] rounded-xl overflow-hidden shadow-2xl flex flex-col" ref={containerRef}>
      {/* Top Map Action Bar */}
      <div className="px-4 py-3 bg-[#0D1B2E] border-b border-[#21385E] flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Color Legend with counts */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[#10B981] shadow-sm"></span>
            <span className="text-gray-300 font-medium">Covered ({deployData?.metrics?.n_covered || 0})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 text-[#EF4444] font-bold flex items-center justify-center">✕</span>
            <span className="text-gray-300 font-medium">Uncovered ({deployData?.metrics?.n_uncovered || 0})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-[#38BDF8]"></span>
            <span className="text-gray-300 font-medium">UAV Base Station ({uavs.length})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rotate-45 bg-[#F59E0B]"></span>
            <span className="text-gray-300 font-medium">Relief Camps ({camps.length})</span>
          </div>
        </div>

        {/* Layer Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setLayers(l => ({ ...l, coverageCircles: !l.coverageCircles }))}
            className={`px-2.5 py-1 rounded text-xs transition ${
              layers.coverageCircles ? 'bg-[#15294A] text-[#2EC4B6] border border-[#2EC4B6]/40' : 'bg-[#0A1424] text-gray-400'
            }`}
            title="Toggle UAV Coverage Circles"
          >
            Rings (R={Math.round(R)}m)
          </button>
          <button
            onClick={() => setLayers(l => ({ ...l, associationLines: !l.associationLines }))}
            className={`px-2.5 py-1 rounded text-xs transition ${
              layers.associationLines ? 'bg-[#15294A] text-[#2EC4B6] border border-[#2EC4B6]/40' : 'bg-[#0A1424] text-gray-400'
            }`}
            title="Toggle User Association Rays"
          >
            Associations
          </button>
          <button
            onClick={() => setLayers(l => ({ ...l, interferenceLines: !l.interferenceLines }))}
            className={`px-2.5 py-1 rounded text-xs transition ${
              layers.interferenceLines ? 'bg-[#15294A] text-[#EF4444] border border-[#EF4444]/40' : 'bg-[#0A1424] text-gray-400'
            }`}
            title="Toggle Co-Channel Interference Lines"
          >
            Interference
          </button>
        </div>
      </div>

      {/* Main Canvas Viewport */}
      <div className="relative w-full aspect-square bg-[#06101E] cursor-crosshair">
        <canvas
          ref={canvasRef}
          width={900}
          height={900}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className={`w-full h-full block ${draggedUavIndex >= 0 ? 'cursor-grabbing' : 'cursor-grab'}`}
        />

        {/* Interactive Drag Hint */}
        {isDraggable && (
          <div className="absolute bottom-3 left-3 bg-[#0A1424]/90 backdrop-blur border border-[#21385E] px-3 py-1.5 rounded-lg text-xs text-gray-300 flex items-center gap-2 pointer-events-none shadow-lg">
            <Move className="w-3.5 h-3.5 text-[#38BDF8]" />
            <span>Interactive: Drag any <b>UAV drone</b> to test coverage live</span>
          </div>
        )}

        {/* Coverage summary overlay chip */}
        <div className="absolute top-3 right-3 bg-[#0D1B2E]/95 backdrop-blur border border-[#21385E] px-3 py-2 rounded-lg shadow-xl text-right">
          <div className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Active Coverage</div>
          <div className="text-xl font-bold font-display text-[#10B981]">
            {deployData?.metrics?.coverage_pct ? `${deployData.metrics.coverage_pct}%` : '–'}
          </div>
          <div className="text-[11px] text-gray-300">
            {deployData?.metrics?.n_covered || 0} / {scenario?.n_users || 0} served
          </div>
        </div>

        {/* Hover Tooltip */}
        {hoveredEntity && (
          <div
            className="fixed pointer-events-none z-50 bg-[#0D1B2E] border border-[#2EC4B6] p-2.5 rounded-lg text-xs shadow-2xl text-white transform -translate-x-1/2 -translate-y-full mb-2"
            style={{ left: mousePos.x, top: mousePos.y - 10 }}
          >
            {hoveredEntity.type === 'UAV' && (
              <div>
                <div className="font-bold text-[#38BDF8] flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5" />
                  UAV #{hoveredEntity.data.id} ({reuse > 1 ? `Freq f${hoveredEntity.data.channel + 1}` : 'Universal Reuse'})
                </div>
                <div className="text-gray-300 mt-1">Coordinates: X={hoveredEntity.data.x}m, Y={hoveredEntity.data.y}m</div>
                <div className="text-[#10B981]">Served Users: {hoveredEntity.data.served_users}</div>
                <div className="text-gray-400">Mean SINR: {hoveredEntity.data.mean_sinr_db} dB</div>
              </div>
            )}
            {hoveredEntity.type === 'Camp' && (
              <div>
                <div className="font-bold text-[#F59E0B] flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  Relief Camp #{hoveredEntity.data.id}
                </div>
                <div className="text-gray-300 mt-1">Coordinates: X={Math.round(hoveredEntity.data.x)}m, Y={Math.round(hoveredEntity.data.y)}m</div>
                <div className="text-yellow-300">Population: {hoveredEntity.data.user_count} survivors</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Coordinates & Scale Bar */}
      <div className="px-4 py-2 bg-[#0D1B2E] border-t border-[#21385E] flex items-center justify-between text-xs text-gray-400">
        <div>Geographical Simulation Area: <span className="text-white font-mono">{area}m × {area}m</span> (16 km²)</div>
        <div>UAV Altitude: <span className="text-[#38BDF8] font-mono">{deployData?.h || 646}m</span> · Path Loss Max: <span className="text-white font-mono">100 dB</span></div>
      </div>
    </div>
  );
}
