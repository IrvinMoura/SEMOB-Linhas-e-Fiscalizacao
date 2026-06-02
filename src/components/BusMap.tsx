'use client';

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';

interface BusMapProps {
  latitude: number | null;
  longitude: number | null;
  routeCoordinates: [number, number, string?][] | null;
  streetName?: string;
  neighborhoodName?: string;
  lineCode?: string;
  lineName?: string;
  isEditing?: boolean;
  onRouteUpdate?: (coords: [number, number, string?][]) => void;
}

export default function BusMap({
  latitude,
  longitude,
  routeCoordinates,
  streetName = '',
  neighborhoodName = '',
  lineCode = '',
  lineName = '',
  isEditing = false,
  onRouteUpdate
}: BusMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const polylinesRef = useRef<any[]>([]);
  const markersRef = useRef<L.Marker[]>([]);
  const terminalMarkerRef = useRef<L.Marker | null>(null);
  
  const [localRoute, setLocalRoute] = useState<[number, number, string?][]>(routeCoordinates || []);
  const [showPC1, setShowPC1] = useState(true);
  const [showPC2, setShowPC2] = useState(true);

  // Update localRoute if prop changes (when not in active drawing session)
  useEffect(() => {
    if (!isEditing) {
      setLocalRoute(routeCoordinates || []);
    }
  }, [routeCoordinates, isEditing]);

  // Sync state back to parent if requested
  useEffect(() => {
    if (isEditing && onRouteUpdate) {
      onRouteUpdate(localRoute);
    }
  }, [localRoute, isEditing, onRouteUpdate]);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Load polyline decorator dynamically to prevent SSR errors
    require('leaflet-polylinedecorator');

    // Initialize Map if not already done
    if (!mapRef.current) {
      // Default to Feira de Santana city center coordinates
      const initialLat = latitude || -12.257321;
      const initialLon = longitude || -38.959828;
      const initialZoom = latitude && longitude ? 15 : 13;

      mapRef.current = L.map(mapContainerRef.current, {
        zoomControl: true,
        scrollWheelZoom: true,
      }).setView([initialLat, initialLon], initialZoom);

      // Add high quality libre OpenStreetMap carto tile layer
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20
      }).addTo(mapRef.current);
    }

    const map = mapRef.current;

    // Clear old map layers
    polylinesRef.current.forEach(p => p.remove());
    polylinesRef.current = [];
    
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    if (terminalMarkerRef.current) {
      terminalMarkerRef.current.remove();
      terminalMarkerRef.current = null;
    }

    // Custom CSS Premium Icons using SVG (prevent relative path issues)
    const terminalIcon = L.divIcon({
      html: `
        <div style="
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          background: var(--accent-primary);
          color: white;
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 4px 10px rgba(0,0,0,0.3);
          transform: translateY(-8px);
        ">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-1.1 0-2 .9-2 2v7c0 .6.4 1 1 1h1"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="16.5" cy="17.5" r="2.5"/></svg>
        </div>
        <div style="
          position: absolute;
          width: 0;
          height: 0;
          border-left: 8px solid transparent;
          border-right: 8px solid transparent;
          border-top: 8px solid var(--accent-primary);
          bottom: 2px;
          left: 10px;
        "></div>
      `,
      className: 'custom-terminal-marker',
      iconSize: [36, 44],
      iconAnchor: [18, 44]
    });

    const routeWaypointIcon = L.divIcon({
      html: `
        <div style="
          width: 14px;
          height: 14px;
          background: #ef4444;
          border: 2px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 5px rgba(0,0,0,0.3);
        "></div>
      `,
      className: 'custom-route-waypoint',
      iconSize: [14, 14],
      iconAnchor: [7, 7]
    });

    // 1. Draw Terminal Marker (Final de Linha)
    if (latitude && longitude) {
      terminalMarkerRef.current = L.marker([latitude, longitude], { icon: terminalIcon }).addTo(map);
      
      const popupContent = `
        <div style="padding: 4px; font-family: var(--font-outfit);">
          <h4 style="margin: 0 0 4px 0; color: var(--accent-primary); font-size: 1.1rem; font-weight: 700;">🚍 Linha ${lineCode}</h4>
          <p style="margin: 0 0 6px 0; font-weight: 500; font-size: 0.95rem;">${lineName}</p>
          <strong style="display: block; font-size: 0.85rem; color: var(--text-secondary);">📍 Final de Linha:</strong>
          <span style="font-size: 0.85rem;">${streetName}${neighborhoodName ? ` - ${neighborhoodName}` : ''}</span>
        </div>
      `;
      terminalMarkerRef.current.bindPopup(popupContent);

      // Removed initial setView here so we can handle it dynamically at the end
    }

    // Helper to draw polyline with arrows
    const drawLineWithArrows = (points: L.LatLngTuple[], color: string) => {
      const poly = L.polyline(points, {
        color: color,
        weight: 6,
        opacity: 0.85,
        lineJoin: 'round'
      }).addTo(map);
      
      // @ts-ignore
      const decorator = L.polylineDecorator(poly, {
        patterns: [
          {
            offset: '5%',
            repeat: '100px', // Setinha a cada 100 pixels na tela
            symbol: L.Symbol.arrowHead({
              pixelSize: 14,
              polygon: true,
              pathOptions: { fillOpacity: 1, color: '#ffffff', fillColor: color, weight: 2 }
            })
          }
        ]
      }).addTo(map);

      polylinesRef.current.push(poly);
      polylinesRef.current.push(decorator);
    };

    // 2. Draw Route Polyline
    if (localRoute && localRoute.length > 0) {
      const pc1: L.LatLngTuple[] = [];
      const pc2: L.LatLngTuple[] = [];
      const rest: L.LatLngTuple[] = [];
      
      localRoute.forEach(pt => {
        if (pt[2] === 'PC1') pc1.push([pt[0], pt[1]]);
        else if (pt[2] === 'PC2') pc2.push([pt[0], pt[1]]);
        else rest.push([pt[0], pt[1]]);
      });

      if (showPC1 && pc1.length > 0) {
        drawLineWithArrows(pc1, '#3b82f6'); // blue
      }
      
      if (showPC2 && pc2.length > 0) {
        drawLineWithArrows(pc2, '#ef4444'); // red
      }

      if (rest.length > 0) {
        drawLineWithArrows(rest, 'var(--accent-primary)');
      }

      // Draw interactive markers for waypoints in editing modeg mode
      if (isEditing) {
        localRoute.forEach((pt, index) => {
          const marker = L.marker([pt[0], pt[1]], {
            icon: routeWaypointIcon,
            draggable: true
          }).addTo(map);

          marker.bindTooltip(`Ponto ${index + 1}<br><span style="font-size: 0.75rem; color: #ef4444;">Clique para remover</span>`, {
            direction: 'top',
            offset: [0, -5]
          });

          // Handle waypoint click to delete it
          marker.on('click', () => {
            setLocalRoute(prev => prev.filter((_, i) => i !== index));
          });

          // Handle waypoint drag
          marker.on('dragend', () => {
            const newPos = marker.getLatLng();
            setLocalRoute(prev => {
              const updated = [...prev];
              updated[index] = [newPos.lat, newPos.lng];
              return updated;
            });
          });

          markersRef.current.push(marker);
        });
      }

    }

    // Automatically adjust view based on route or terminal
    if (localRoute && localRoute.length > 1) {
      const bounds = L.latLngBounds(localRoute.map(pt => [pt[0], pt[1]]));
      if (latitude && longitude) {
        bounds.extend([latitude, longitude]);
      }
      map.flyToBounds(bounds, { padding: [40, 40], duration: 1.5 });
    } else if (latitude && longitude) {
      map.flyTo([latitude, longitude], 17, { duration: 1.5 });
    }

    // 3. Handle Map Click Event in Editing Mode to DRAW points
    const handleMapClick = (e: L.LeafletMouseEvent) => {
      if (!isEditing) return;
      const { lat, lng } = e.latlng;
      setLocalRoute(prev => [...prev, [lat, lng]]);
    };

    map.on('click', handleMapClick);

    // Cleanup on destroy/change
    return () => {
      map.off('click', handleMapClick);
    };

  }, [latitude, longitude, localRoute, isEditing, lineCode, lineName, streetName, neighborhoodName, showPC1, showPC2]);

  // Handle toggle logic
  const hasPC1 = localRoute.some(pt => pt[2] === 'PC1');
  const hasPC2 = localRoute.some(pt => pt[2] === 'PC2');

  // Visual interface buttons for Route Editing mode
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%', minHeight: '300px' }} />
      
      <style>{`
        .custom-toggle {
          appearance: none;
          width: 36px;
          height: 20px;
          background: #cbd5e1;
          border-radius: 20px;
          position: relative;
          cursor: pointer;
          outline: none;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          margin: 0;
        }
        .custom-toggle::after {
          content: '';
          position: absolute;
          top: 2px;
          left: 2px;
          width: 16px;
          height: 16px;
          background: white;
          border-radius: 50%;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 1px 3px rgba(0,0,0,0.3);
        }
        .custom-toggle:checked {
          background: var(--toggle-color);
        }
        .custom-toggle:checked::after {
          transform: translateX(16px);
        }
      `}</style>

      {(hasPC1 || hasPC2) && (
        <div style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          background: 'var(--card-bg)',
          backdropFilter: 'blur(var(--glass-blur))',
          padding: '12px 14px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--card-border)',
          boxShadow: 'var(--shadow-md)'
        }}>
          {hasPC1 && (
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer', color: '#3b82f6' }}>
              <input 
                type="checkbox" 
                className="custom-toggle" 
                style={{ '--toggle-color': '#3b82f6' } as any}
                checked={showPC1} 
                onChange={(e) => setShowPC1(e.target.checked)} 
              />
              Ida (PC1)
            </label>
          )}
          {hasPC2 && (
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer', color: '#ef4444' }}>
              <input 
                type="checkbox" 
                className="custom-toggle" 
                style={{ '--toggle-color': '#ef4444' } as any}
                checked={showPC2} 
                onChange={(e) => setShowPC2(e.target.checked)} 
              />
              Volta (PC2)
            </label>
          )}
        </div>
      )}

      {isEditing && (
        <div style={{
          position: 'absolute',
          bottom: '12px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1000,
          display: 'flex',
          gap: '8px',
          background: 'var(--card-bg)',
          backdropFilter: 'blur(var(--glass-blur))',
          padding: '8px 12px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--card-border)',
          boxShadow: 'var(--shadow-lg)'
        }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setLocalRoute(prev => prev.slice(0, -1));
            }}
            disabled={localRoute.length === 0}
            style={{
              padding: '6px 12px',
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--card-border)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              opacity: localRoute.length === 0 ? 0.5 : 1
            }}
            title="Remove o último ponto criado"
          >
            ↩️ Desfazer
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (confirm('Deseja realmente limpar toda a rota desenhada?')) {
                setLocalRoute([]);
              }
            }}
            disabled={localRoute.length === 0}
            style={{
              padding: '6px 12px',
              background: 'var(--danger-bg)',
              color: 'var(--danger)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              opacity: localRoute.length === 0 ? 0.5 : 1
            }}
          >
            🗑️ Limpar Rota
          </button>
          <span style={{
            display: 'flex',
            alignItems: 'center',
            fontSize: '0.8rem',
            color: 'var(--text-secondary)',
            fontWeight: 500
          }}>
            📍 {localRoute.length} pt{localRoute.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}
    </div>
  );
}
