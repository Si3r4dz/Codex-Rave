'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Circle, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icon in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface LocationMapProps {
  latitude: number;
  longitude: number;
  radiusKm: number;
  address?: string;
}

function MapController({ latitude, longitude }: { latitude: number; longitude: number }) {
  const map = useMap();
  
  useEffect(() => {
    map.setView([latitude, longitude], 13);
  }, [latitude, longitude, map]);
  
  return null;
}

export default function LocationMap({ latitude, longitude, radiusKm, address }: LocationMapProps) {
  return (
    <div className="relative w-full h-64 rounded-lg overflow-hidden border border-gray-200 dark:border-slate-700 shadow-md">
      <MapContainer
        center={[latitude, longitude]}
        zoom={13}
        scrollWheelZoom={true}
        className="h-full w-full z-0"
      >
        {/* Base map tiles - using CartoDB for better dark mode support */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          className="dark:brightness-75 dark:invert dark:hue-rotate-180"
        />
        
        {/* User's home location marker */}
        <Marker position={[latitude, longitude]}>
          <Popup>
            <div className="text-center">
              <p className="font-semibold">📍 Twoja lokalizacja</p>
              {address && <p className="text-sm text-gray-600">{address}</p>}
            </div>
          </Popup>
        </Marker>
        
        {/* Search radius circle */}
        <Circle
          center={[latitude, longitude]}
          radius={radiusKm * 1000} // Convert km to meters
          pathOptions={{
            color: '#3b82f6',
            fillColor: '#3b82f6',
            fillOpacity: 0.1,
            weight: 2,
          }}
        />
        
        <MapController latitude={latitude} longitude={longitude} />
      </MapContainer>
      
      {/* Info badge */}
      <div className="absolute top-3 right-3 bg-white dark:bg-slate-800 px-3 py-2 rounded-lg shadow-lg border border-gray-200 dark:border-slate-700 z-[1000]">
        <p className="text-xs font-medium text-gray-700 dark:text-slate-300">
          Promień: {radiusKm} km
        </p>
      </div>
    </div>
  );
}

