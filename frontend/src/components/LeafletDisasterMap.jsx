import React, { useEffect, useRef } from 'react';
import L from 'leaflet';

export default function LeafletDisasterMap({
  scenario,
  deployData,
  area = 4000,
  onUAVMove
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layerGroupRef = useRef(null);

  // We map the 4000x4000m coordinates to a realistic disaster coordinate reference frame
  // e.g., Chennai / SRM Kattankulathur area: 12.8230° N, 80.0440° E
  const CENTER_LAT = 12.8230;
  const CENTER_LNG = 80.0440;
  const METERS_PER_DEG_LAT = 111320;
  const METERS_PER_DEG_LNG = 40075000 * Math.cos(CENTER_LAT * Math.PI / 180) / 360;

  const toLatLng = (x, y) => {
    const lat = CENTER_LAT + ((y - area / 2) / METERS_PER_DEG_LAT);
    const lng = CENTER_LNG + ((x - area / 2) / METERS_PER_DEG_LNG);
    return [lat, lng];
  };

  const toMeters = (lat, lng) => {
    const y = (lat - CENTER_LAT) * METERS_PER_DEG_LAT + area / 2;
    const x = (lng - CENTER_LNG) * METERS_PER_DEG_LNG + area / 2;
    return [x, y];
  };

  // Initialize Leaflet map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [CENTER_LAT, CENTER_LNG],
      zoom: 14,
      zoomControl: true,
      attributionControl: false,
    });

    // Dark cartographic tiles
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      subdomains: 'abcd',
    }).addTo(map);

    const layerGroup = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;
    layerGroupRef.current = layerGroup;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update markers when scenario or deployData changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    const group = layerGroupRef.current;
    if (!map || !group) return;

    group.clearLayers();

    const uavs = deployData?.uavs || [];
    const users = scenario?.users || [];
    const camps = scenario?.camps || [];
    const userStatus = deployData?.user_status || [];
    const R = deployData?.R || 706.5;

    // 1. Draw Relief Camps (Yellow)
    camps.forEach((camp) => {
      const latlng = toLatLng(camp.x, camp.y);
      const campIcon = L.divIcon({
        className: 'custom-camp-icon',
        html: `
          <div style="background-color: #F59E0B; width: 22px; height: 22px; transform: rotate(45deg); border: 2px solid #FFF; box-shadow: 0 0 12px rgba(245,158,11,0.8); display:flex; align-items:center; justify-content:center;">
            <div style="width:6px; height:6px; background-color:#000; border-radius:50%;"></div>
          </div>
        `,
        iconSize: [22, 22],
        iconAnchor: [11, 11]
      });

      const marker = L.marker(latlng, { icon: campIcon });
      marker.bindPopup(`
        <div style="color: #111; font-family: sans-serif; font-size: 13px;">
          <b style="color: #B45309;">Relief Camp ${camp.id}</b><br/>
          Survivors: <b>${camp.user_count}</b><br/>
          Coordinates: (${Math.round(camp.x)}m, ${Math.round(camp.y)}m)
        </div>
      `);
      marker.addTo(group);

      // Camp gathering radius circle
      L.circle(latlng, {
        radius: 350,
        color: '#F59E0B',
        fillColor: '#F59E0B',
        fillOpacity: 0.08,
        weight: 1,
        dashArray: '4, 4'
      }).addTo(group);
    });

    // 2. Draw Sample Users (for performance on Leaflet, draw as CircleMarkers)
    // Subsample slightly if user count is high for smooth Leaflet rendering
    const step = users.length > 500 ? 2 : 1;
    for (let i = 0; i < users.length; i += step) {
      const u = users[i];
      const latlng = toLatLng(u[0], u[1]);
      const status = userStatus[i];
      const isCovered = status ? status.is_covered : false;

      L.circleMarker(latlng, {
        radius: isCovered ? 2.5 : 2,
        color: isCovered ? '#10B981' : '#EF4444',
        fillColor: isCovered ? '#10B981' : '#EF4444',
        fillOpacity: isCovered ? 0.85 : 0.65,
        weight: isCovered ? 1 : 1.2
      }).addTo(group);
    }

    // 3. Draw UAVs (Blue) with coverage circles
    uavs.forEach((uav, idx) => {
      const latlng = toLatLng(uav.x, uav.y);

      // Coverage circle
      L.circle(latlng, {
        radius: R,
        color: '#38BDF8',
        fillColor: '#38BDF8',
        fillOpacity: 0.08,
        weight: 2,
        dashArray: '6, 6'
      }).addTo(group);

      // UAV Draggable Marker
      const uavIcon = L.divIcon({
        className: 'custom-uav-icon',
        html: `
          <div style="background-color: #2563EB; width: 30px; height: 30px; border-radius: 50%; border: 2.5px solid #FFF; display:flex; align-items:center; justify-content:center; box-shadow: 0 0 15px rgba(56,189,248,0.9); font-weight:bold; font-size:11px; color:#FFF; font-family: monospace;">
            U${uav.id}
          </div>
        `,
        iconSize: [30, 30],
        iconAnchor: [15, 15]
      });

      const marker = L.marker(latlng, {
        icon: uavIcon,
        draggable: Boolean(onUAVMove)
      });

      marker.bindPopup(`
        <div style="color: #111; font-family: sans-serif; font-size: 13px;">
          <b style="color: #2563EB;">UAV Base Station ${uav.id}</b><br/>
          Assigned Freq: <b>f${uav.channel + 1}</b><br/>
          Altitude: <b>${deployData?.h || 646} m</b><br/>
          Coverage Radius: <b>${Math.round(R)} m</b><br/>
          Served Users: <b>${uav.served_users || 0}</b><br/>
          Coordinates: (${Math.round(uav.x)}m, ${Math.round(uav.y)}m)
        </div>
      `);

      if (onUAVMove) {
        marker.on('dragend', (e) => {
          const newPos = e.target.getLatLng();
          const [nx, ny] = toMeters(newPos.lat, newPos.lng);
          const updated = uavs.map((u, i) =>
            i === idx ? { ...u, x: Math.round(nx), y: Math.round(ny) } : u
          );
          onUAVMove(updated);
        });
      }

      marker.addTo(group);
    });

  }, [scenario, deployData, area, onUAVMove, R]);

  return (
    <div className="relative w-full h-[540px] rounded-xl overflow-hidden border border-[#21385E] shadow-2xl">
      <div ref={mapContainerRef} className="w-full h-full" />
      <div className="absolute top-3 left-3 z-[1000] bg-[#0A1424]/90 backdrop-blur border border-[#21385E] px-3 py-1.5 rounded-lg text-xs text-gray-300 shadow-lg">
        <b>GIS Disaster Map</b> · Chennai / SRM IST Region
      </div>
    </div>
  );
}
