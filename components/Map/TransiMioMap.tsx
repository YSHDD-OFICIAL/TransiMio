import React, { useEffect, useRef, useState } from 'react';
import Map, { 
  Source, 
  Layer, 
  Marker, 
  Popup,
  NavigationControl,
  FullscreenControl,
  GeolocateControl
} from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useVehicleStore } from '../../stores/vehicleStore';
import { useAlertStore } from '../../stores/alertStore';
import { VehicleMarker } from './VehicleMarker';
import { StationMarker } from './StationMarker';
import { AlertMarker } from './AlertMarker';
import MapControls from './MapControls';
import type { MapRef, ViewState } from 'react-map-gl';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

interface TransiMioMapProps {
  initialViewState?: Partial<ViewState>;
  onMapLoad?: (map: mapboxgl.Map) => void;
}

const TransiMioMap: React.FC<TransiMioMapProps> = ({ 
  initialViewState = {
    longitude: -76.532,
    latitude: 3.4516,
    zoom: 12
  },
  onMapLoad 
}) => {
  const mapRef = useRef<MapRef>(null);
  const [viewState, setViewState] = useState(initialViewState);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [selectedStation, setSelectedStation] = useState(null);
  const [layers, setLayers] = useState({
    vehicles: true,
    stations: true,
    routes: true,
    alerts: true,
    traffic: false
  });

  const { vehicles, fetchVehicles } = useVehicleStore();
  const { alerts, fetchAlerts } = useAlertStore();

  useEffect(() => {
    // Conectar WebSocket para vehículos en tiempo real
    const ws = new WebSocket(process.env.NEXT_PUBLIC_WS_URL!);
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'vehicle_update') {
        useVehicleStore.getState().updateVehicle(data.vehicle);
      }
    };

    // Fetch inicial
    fetchVehicles();
    fetchAlerts();

    // Actualizar cada 30 segundos
    const interval = setInterval(() => {
      fetchVehicles();
      fetchAlerts();
    }, 30000);

    return () => {
      ws.close();
      clearInterval(interval);
    };
  }, []);

  const handleMapLoad = (event: any) => {
    const map = event.target;
    if (onMapLoad) onMapLoad(map);
    
    // Agregar capas personalizadas
    map.addSource('routes', {
      type: 'geojson',
      data: '/api/routes/geojson'
    });

    map.addLayer({
      id: 'route-lines',
      type: 'line',
      source: 'routes',
      layout: {
        'line-join': 'round',
        'line-cap': 'round'
      },
      paint: {
        'line-color': '#0066CC',
        'line-width': 3,
        'line-opacity': 0.7
      }
    });
  };

  return (
    <div className="relative w-full h-full">
      <Map
        ref={mapRef}
        {...viewState}
        onMove={evt => setViewState(evt.viewState)}
        mapStyle="mapbox://styles/mapbox/light-v11"
        mapboxAccessToken={MAPBOX_TOKEN}
        onLoad={handleMapLoad}
        style={{ width: '100%', height: '100%' }}
      >
        <NavigationControl position="top-right" />
        <FullscreenControl position="top-right" />
        <GeolocateControl position="top-right" />

        {/* Capa de vehículos */}
        {layers.vehicles && vehicles.map(vehicle => (
          <Marker
            key={vehicle.id}
            longitude={vehicle.longitude}
            latitude={vehicle.latitude}
            anchor="center"
            onClick={e => {
              e.originalEvent.stopPropagation();
              setSelectedVehicle(vehicle);
            }}
          >
            <VehicleMarker vehicle={vehicle} />
          </Marker>
        ))}

        {/* Capa de estaciones */}
        {layers.stations && stations.map(station => (
          <Marker
            key={station.id}
            longitude={station.longitude}
            latitude={station.latitude}
            anchor="bottom"
          >
            <StationMarker station={station} />
          </Marker>
        ))}

        {/* Capa de alertas */}
        {layers.alerts && alerts.map(alert => (
          <Marker
            key={alert.id}
            longitude={alert.longitude}
            latitude={alert.latitude}
            anchor="center"
          >
            <AlertMarker alert={alert} />
          </Marker>
        ))}

        {/* Popups */}
        {selectedVehicle && (
          <Popup
            longitude={selectedVehicle.longitude}
            latitude={selectedVehicle.latitude}
            anchor="bottom"
            onClose={() => setSelectedVehicle(null)}
            closeButton={true}
            className="vehicle-popup"
          >
            <VehicleInfo vehicle={selectedVehicle} />
          </Popup>
        )}

        {selectedStation && (
          <Popup
            longitude={selectedStation.longitude}
            latitude={selectedStation.latitude}
            anchor="bottom"
            onClose={() => setSelectedStation(null)}
          >
            <StationInfo station={selectedStation} />
          </Popup>
        )}
      </Map>

      <MapControls 
        layers={layers}
        onLayerToggle={setLayers}
        onSearch={(query) => {
          // Implementar búsqueda
        }}
      />
    </div>
  );
};

export default TransiMioMap;
