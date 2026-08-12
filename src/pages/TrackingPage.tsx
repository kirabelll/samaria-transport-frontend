import { useState, useEffect, useRef, useCallback } from 'react';
import { MapPin, RefreshCw, Truck, Fuel, Gauge, Clock, Signal, Filter, Search } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import api from '../services/api';

interface GpsVehicle {
  imei: string;
  name: string;
  group: string | null;
  odometer: string;
  engine: string;
  status: string;
  dt_server: string;
  dt_tracker: string;
  lat: string;
  lng: string;
  altitude: string;
  angle: string;
  speed: string;
  fuel_1: string;
  fuel_2: string;
  fuel_can_level_percent: number | null;
  fuel_can_level_value: number | null;
}

// Extract plate number from vehicle name
function extractPlate(name: string): string {
  const match = name.match(/(\d-[\w]+ (?:ET|AA))/i);
  return match ? match[1] : name;
}

// Status color helpers
function getStatusColor(vehicle: GpsVehicle): string {
  if (vehicle.engine === 'on' && Number(vehicle.speed) > 0) return 'text-green-600 bg-green-50 border-green-200';
  if (vehicle.engine === 'on') return 'text-blue-600 bg-blue-50 border-blue-200';
  if (vehicle.status.includes('Stopped')) return 'text-amber-600 bg-amber-50 border-amber-200';
  return 'text-gray-500 bg-gray-50 border-gray-200';
}

function getStatusLabel(vehicle: GpsVehicle): string {
  if (vehicle.engine === 'on' && Number(vehicle.speed) > 0) return 'Moving';
  if (vehicle.engine === 'on') return 'Idle';
  if (vehicle.status.includes('Stopped')) return 'Stopped';
  if (vehicle.status.includes('Offline')) return 'Offline';
  return 'Unknown';
}

function getStatusDot(vehicle: GpsVehicle): string {
  if (vehicle.engine === 'on' && Number(vehicle.speed) > 0) return '#22c55e';
  if (vehicle.engine === 'on') return '#3b82f6';
  if (vehicle.status.includes('Stopped')) return '#f59e0b';
  return '#9ca3af';
}

// Time ago helper
function timeAgo(dt: string): string {
  if (!dt) return 'N/A';
  const now = new Date();
  const then = new Date(dt.replace(' ', 'T') + 'Z');
  const diff = Math.floor((now.getTime() - then.getTime()) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// Create truck icon for map marker
function createTruckIcon(color: string, angle: number): L.DivIcon {
  return L.divIcon({
    className: 'custom-truck-marker',
    html: `<div style="
      width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;
      background: ${color}; border-radius: 50%; border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3); transform: rotate(${angle}deg);
    ">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 2L12 22M12 2L6 8M12 2L18 8"/>
      </svg>
    </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -20],
  });
}

export default function TrackingPage() {
  const [vehicles, setVehicles] = useState<GpsVehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);
  const [filterGroup, setFilterGroup] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [showList, setShowList] = useState(false); // mobile: toggle vehicle list

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Record<string, L.Marker>>({});
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchVehicles = useCallback(async () => {
    try {
      const { data } = await api.get('/tracking/vehicles');
      setVehicles(data.vehicles || []);
      setLastUpdate(new Date());
    } catch (e) {
      console.error('Failed to fetch GPS data:', e);
    }
    setLoading(false);
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;
    const map = L.map(mapRef.current, {
      center: [9.0, 38.75],
      zoom: 7,
      zoomControl: true,
    });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 19,
    }).addTo(map);
    mapInstanceRef.current = map;

    return () => { map.remove(); mapInstanceRef.current = null; };
  }, []);

  // Fetch data on mount and set auto-refresh
  useEffect(() => {
    fetchVehicles();
  }, [fetchVehicles]);

  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(fetchVehicles, 30000); // Every 30 seconds
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [autoRefresh, fetchVehicles]);

  // Update map markers when vehicles change
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || vehicles.length === 0) return;

    // Remove old markers
    Object.values(markersRef.current).forEach(m => m.remove());
    markersRef.current = {};

    const bounds: L.LatLngExpression[] = [];

    vehicles.forEach(v => {
      const lat = parseFloat(v.lat);
      const lng = parseFloat(v.lng);
      if (!lat || !lng) return;

      const color = getStatusDot(v);
      const angle = parseInt(v.angle) || 0;
      const icon = createTruckIcon(color, angle);

      const marker = L.marker([lat, lng], { icon }).addTo(map);
      marker.bindPopup(`
        <div style="min-width:200px">
          <div style="font-weight:bold;font-size:14px;margin-bottom:4px">${v.name}</div>
          <div style="font-size:12px;color:#666;margin-bottom:8px">${v.group || 'No group'}</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:12px">
            <div><b>Status:</b> ${getStatusLabel(v)}</div>
            <div><b>Engine:</b> ${v.engine}</div>
            <div><b>Speed:</b> ${v.speed} km/h</div>
            <div><b>Odometer:</b> ${Number(v.odometer).toLocaleString()} km</div>
            <div><b>Fuel:</b> ${v.fuel_can_level_percent != null ? v.fuel_can_level_percent + '%' : 'N/A'}</div>
            <div><b>Updated:</b> ${timeAgo(v.dt_tracker)}</div>
          </div>
        </div>
      `);

      marker.on('click', () => setSelectedVehicle(v.imei));
      markersRef.current[v.imei] = marker;
      bounds.push([lat, lng]);
    });

    if (bounds.length > 0 && !selectedVehicle) {
      map.fitBounds(bounds as L.LatLngBoundsExpression, { padding: [50, 50], maxZoom: 12 });
    }
  }, [vehicles]);

  // Pan to selected vehicle
  useEffect(() => {
    if (!selectedVehicle || !mapInstanceRef.current) return;
    const marker = markersRef.current[selectedVehicle];
    if (marker) {
      mapInstanceRef.current.setView(marker.getLatLng(), 14, { animate: true });
      marker.openPopup();
    }
  }, [selectedVehicle]);

  // Get unique groups
  const groups = [...new Set(vehicles.map(v => v.group).filter(Boolean))] as string[];

  // Filter vehicles
  const filtered = vehicles.filter(v => {
    if (filterGroup !== 'all' && v.group !== filterGroup) return false;
    if (filterStatus === 'moving' && !(v.engine === 'on' && Number(v.speed) > 0)) return false;
    if (filterStatus === 'idle' && !(v.engine === 'on' && Number(v.speed) === 0)) return false;
    if (filterStatus === 'stopped' && !v.status.includes('Stopped')) return false;
    if (filterStatus === 'offline' && !v.status.includes('Offline')) return false;
    if (search && !v.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // Stats
  const stats = {
    total: vehicles.length,
    moving: vehicles.filter(v => v.engine === 'on' && Number(v.speed) > 0).length,
    idle: vehicles.filter(v => v.engine === 'on' && Number(v.speed) === 0).length,
    stopped: vehicles.filter(v => v.status.includes('Stopped')).length,
    offline: vehicles.filter(v => v.status.includes('Offline')).length,
  };

  return (
    <div className="h-[calc(100vh-64px)] sm:h-[calc(100vh-64px)] flex flex-col -m-3 sm:-m-6">
      {/* Top bar */}
      <div className="px-3 sm:px-4 py-2 sm:py-3 bg-white border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between flex-shrink-0 gap-2">
        <div className="flex items-center justify-between sm:justify-start gap-2 sm:gap-3">
          <h1 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-red-500" /> Live Tracking
          </h1>
          {/* Mobile list toggle */}
          <button onClick={() => setShowList(!showList)}
            className="sm:hidden px-2.5 py-1 bg-gray-100 text-gray-600 rounded-lg text-xs font-medium">
            {showList ? 'Map' : `Vehicles (${stats.total})`}
          </button>
        </div>
        {/* Status pills - scrollable on mobile */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
          <button onClick={() => setFilterStatus('all')}
            className={`px-2.5 py-1 rounded-full text-xs font-medium transition whitespace-nowrap ${filterStatus === 'all' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            All ({stats.total})
          </button>
          <button onClick={() => setFilterStatus('moving')}
            className={`px-2.5 py-1 rounded-full text-xs font-medium transition whitespace-nowrap ${filterStatus === 'moving' ? 'bg-green-600 text-white' : 'bg-green-50 text-green-700 hover:bg-green-100'}`}>
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 mr-1" />Moving ({stats.moving})
          </button>
          <button onClick={() => setFilterStatus('idle')}
            className={`px-2.5 py-1 rounded-full text-xs font-medium transition whitespace-nowrap ${filterStatus === 'idle' ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'}`}>
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500 mr-1" />Idle ({stats.idle})
          </button>
          <button onClick={() => setFilterStatus('stopped')}
            className={`px-2.5 py-1 rounded-full text-xs font-medium transition whitespace-nowrap ${filterStatus === 'stopped' ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'}`}>
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500 mr-1" />Stopped ({stats.stopped})
          </button>
          <button onClick={() => setFilterStatus('offline')}
            className={`px-2.5 py-1 rounded-full text-xs font-medium transition whitespace-nowrap ${filterStatus === 'offline' ? 'bg-gray-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-gray-400 mr-1" />Offline ({stats.offline})
          </button>
          <div className="hidden sm:flex items-center gap-2 ml-2">
            <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer whitespace-nowrap">
              <input type="checkbox" checked={autoRefresh} onChange={e => setAutoRefresh(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
              Auto
            </label>
            <button onClick={() => { setLoading(true); fetchVehicles(); }}
              className="flex items-center gap-1 px-2.5 py-1 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700">
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Vehicle list panel - side on desktop, overlay on mobile */}
        <div className={`
          ${showList ? 'flex' : 'hidden'} sm:flex
          absolute inset-0 z-20 sm:static sm:z-auto
          w-full sm:w-80 flex-shrink-0 bg-white sm:border-r border-gray-200 flex-col overflow-hidden
        `}>
          {/* Search and filter */}
          <div className="p-3 border-b border-gray-100 space-y-2">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-2.5 top-2" />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search vehicles..."
                className="w-full pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500" />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-gray-400" />
              <select value={filterGroup} onChange={e => setFilterGroup(e.target.value)}
                className="flex-1 text-xs border border-gray-200 rounded-lg py-1 px-2 focus:ring-1 focus:ring-blue-500">
                <option value="all">All Groups</option>
                {groups.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
          </div>

          {/* Vehicle list */}
          <div className="flex-1 overflow-y-auto">
            {loading && vehicles.length === 0 ? (
              <div className="p-6 text-center text-gray-400 text-sm">Loading GPS data...</div>
            ) : filtered.length === 0 ? (
              <div className="p-6 text-center text-gray-400 text-sm">No vehicles found</div>
            ) : (
              filtered.map(v => (
                <div key={v.imei}
                  onClick={() => { setSelectedVehicle(v.imei); setShowList(false); }}
                  className={`px-3 py-2.5 border-b border-gray-50 cursor-pointer transition hover:bg-gray-50
                    ${selectedVehicle === v.imei ? 'bg-blue-50 border-l-2 border-l-blue-500' : ''}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-900 truncate flex-1">{v.name}</span>
                    <span className={`ml-2 px-1.5 py-0.5 rounded text-[10px] font-medium border ${getStatusColor(v)}`}>
                      {getStatusLabel(v)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-gray-400">
                    <span className="flex items-center gap-0.5">
                      <Gauge className="w-3 h-3" />{v.speed} km/h
                    </span>
                    <span className="flex items-center gap-0.5">
                      <Clock className="w-3 h-3" />{timeAgo(v.dt_tracker)}
                    </span>
                    {v.fuel_can_level_percent != null && (
                      <span className="flex items-center gap-0.5">
                        <Fuel className="w-3 h-3" />{v.fuel_can_level_percent}%
                      </span>
                    )}
                  </div>
                  {v.group && (
                    <span className="text-[10px] text-gray-300">{v.group}</span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Map */}
        <div className={`flex-1 relative ${showList ? 'hidden sm:block' : ''}`}>
          <div ref={mapRef} className="absolute inset-0" />

          {/* Selected vehicle detail overlay */}
          {selectedVehicle && (() => {
            const v = vehicles.find(x => x.imei === selectedVehicle);
            if (!v) return null;
            return (
              <div className="absolute bottom-2 left-2 right-2 sm:bottom-4 sm:left-auto sm:right-4 sm:w-96 bg-white rounded-xl shadow-xl border border-gray-200 p-3 sm:p-4 z-[1000]">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-base font-bold text-gray-900">{v.name}</h3>
                    <p className="text-xs text-gray-400">{v.group || 'No group'} &middot; IMEI: {v.imei}</p>
                  </div>
                  <button onClick={() => setSelectedVehicle(null)}
                    className="text-gray-400 hover:text-gray-600 text-lg leading-none">&times;</button>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-gray-50 rounded-lg p-2 text-center">
                    <Signal className="w-4 h-4 mx-auto mb-1 text-gray-400" />
                    <p className="text-xs font-bold text-gray-900">{getStatusLabel(v)}</p>
                    <p className="text-[10px] text-gray-400">Engine {v.engine}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2 text-center">
                    <Gauge className="w-4 h-4 mx-auto mb-1 text-gray-400" />
                    <p className="text-xs font-bold text-gray-900">{v.speed} km/h</p>
                    <p className="text-[10px] text-gray-400">Speed</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2 text-center">
                    <Truck className="w-4 h-4 mx-auto mb-1 text-gray-400" />
                    <p className="text-xs font-bold text-gray-900">{Number(v.odometer).toLocaleString()}</p>
                    <p className="text-[10px] text-gray-400">Km total</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2 text-center">
                    <Fuel className="w-4 h-4 mx-auto mb-1 text-gray-400" />
                    <p className="text-xs font-bold text-gray-900">
                      {v.fuel_can_level_percent != null ? v.fuel_can_level_percent + '%' : 'N/A'}
                    </p>
                    <p className="text-[10px] text-gray-400">Fuel</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2 text-center">
                    <MapPin className="w-4 h-4 mx-auto mb-1 text-gray-400" />
                    <p className="text-xs font-bold text-gray-900">{Number(v.altitude).toLocaleString()}m</p>
                    <p className="text-[10px] text-gray-400">Altitude</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2 text-center">
                    <Clock className="w-4 h-4 mx-auto mb-1 text-gray-400" />
                    <p className="text-xs font-bold text-gray-900">{timeAgo(v.dt_tracker)}</p>
                    <p className="text-[10px] text-gray-400">Last update</p>
                  </div>
                </div>
                <div className="mt-3 text-[10px] text-gray-300 flex items-center justify-between">
                  <span>Lat: {v.lat}, Lng: {v.lng}</span>
                  <span>Heading: {v.angle}&deg;</span>
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
