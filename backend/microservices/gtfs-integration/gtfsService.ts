import axios from 'axios';
import { createClient } from 'redis';
import { sheetsService } from '../../src/services/sheetsService';
import { logger } from '../../src/utils/logger';
import * as gtfs from 'gtfs-stream';
import { Readable } from 'stream';

interface GTFSFeed {
  agency: string;
  city: string;
  country: string;
  url: string;
  realtimeUrl?: string;
}

export class GTFSIntegrationService {
  private redis: any;
  private feeds: GTFSFeed[] = [];

  constructor() {
    this.redis = createClient({ url: process.env.REDIS_URL });
    this.redis.connect();
    this.loadFeeds();
  }

  private async loadFeeds() {
    // Cargar feeds desde configuración o Sheets
    this.feeds = [
      {
        agency: 'MIO',
        city: 'Cali',
        country: 'Colombia',
        url: 'https://www.google.com/maps/d/kml?mid=1E7B8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8Z8',
        realtimeUrl: 'https://gtfs.mio.com.co/realtime'
      },
      // Agregar más ciudades
    ];
  }

  async fetchStaticGTFS() {
    for (const feed of this.feeds) {
      try {
        logger.info(`Fetching GTFS for ${feed.city}`);
        
        const response = await axios.get(feed.url, { responseType: 'stream' });
        const stream = response.data;
        
        // Procesar GTFS
        const gtfsStream = gtfs();
        stream.pipe(gtfsStream);
        
        gtfsStream.on('data', async (entity) => {
          await this.processGTFSEntity(entity, feed);
        });
        
        gtfsStream.on('end', () => {
          logger.info(`GTFS processing complete for ${feed.city}`);
        });
      } catch (error) {
        logger.error(`Error fetching GTFS for ${feed.city}:`, error);
      }
    }
  }

  async fetchRealtimeGTFS() {
    for (const feed of this.feeds) {
      if (!feed.realtimeUrl) continue;
      
      try {
        const response = await axios.get(feed.realtimeUrl);
        const data = response.data;
        
        // Procesar VehiclePositions
        if (data.entity) {
          for (const entity of data.entity) {
            if (entity.vehicle) {
              await this.processVehiclePosition(entity.vehicle, feed);
            }
          }
        }
        
        // Procesar TripUpdates
        if (data.entity) {
          for (const entity of data.entity) {
            if (entity.trip_update) {
              await this.processTripUpdate(entity.trip_update, feed);
            }
          }
        }
        
        // Procesar Alerts
        if (data.entity) {
          for (const entity of data.entity) {
            if (entity.alert) {
              await this.processAlert(entity.alert, feed);
            }
          }
        }
      } catch (error) {
        logger.error(`Error fetching realtime GTFS for ${feed.city}:`, error);
      }
    }
  }

  private async processGTFSEntity(entity: any, feed: GTFSFeed) {
    switch (entity.type) {
      case 'route':
        await this.saveRoute(entity, feed);
        break;
      case 'stop':
        await this.saveStop(entity, feed);
        break;
      case 'trip':
        await this.saveTrip(entity, feed);
        break;
      case 'stop_time':
        await this.saveStopTime(entity, feed);
        break;
    }
  }

  private async saveRoute(route: any, feed: GTFSFeed) {
    const routeData = {
      ID_ruta: `r_${feed.agency}_${route.route_id}`,
      codigo_ruta: route.route_short_name,
      nombre_ruta: route.route_long_name,
      tipo_ruta: route.route_type,
      origen: '',
      destino: '',
      distancia_total: 0,
      tiempo_promedio: 0,
      frecuencia_buses: 0,
      horario_inicio: '',
      horario_fin: '',
      numero_buses_asignados: 0,
      agency: feed.agency,
      city: feed.city
    };
    
    await sheetsService.createRoute(routeData);
  }

  private async saveStop(stop: any, feed: GTFSFeed) {
    const stopData = {
      ID_estacion: `s_${feed.agency}_${stop.stop_id}`,
      nombre_estacion: stop.stop_name,
      codigo_estacion: stop.stop_code || '',
      latitud: stop.stop_lat,
      longitud: stop.stop_lon,
      direccion: '',
      lineas_que_pasan: '',
      capacidad_pasajeros: 0,
      accesibilidad: stop.wheelchair_boarding === 1 ? 'SI' : 'NO',
      tipo_estacion: this.getStopType(stop.location_type)
    };
    
    await sheetsService.createStation(stopData);
  }

  private async processVehiclePosition(vehicle: any, feed: GTFSFeed) {
    const position = {
      vehicleId: `v_${feed.agency}_${vehicle.vehicle.id}`,
      lat: vehicle.position.latitude,
      lng: vehicle.position.longitude,
      speed: vehicle.position.speed || 0,
      direction: vehicle.position.bearing || 0,
      timestamp: new Date(vehicle.timestamp * 1000).toISOString(),
      status: vehicle.current_status || 'operativo'
    };
    
    // Publicar en Redis para WebSocket
    await this.redis.publish('vehicle_updates', JSON.stringify(position));
    
    // Guardar en Sheets (asíncrono)
    sheetsService.updateVehicleLocation(position.vehicleId, position);
  }

  private async processTripUpdate(tripUpdate: any, feed: GTFSFeed) {
    // Calcular retrasos y actualizar ETAs
    if (tripUpdate.stop_time_update) {
      for (const update of tripUpdate.stop_time_update) {
        const delay = update.arrival?.delay || 0;
        
        if (Math.abs(delay) > 300) { // Más de 5 minutos
          await this.createDelayAlert(tripUpdate, update, feed);
        }
      }
    }
  }

  private async processAlert(alert: any, feed: GTFSFeed) {
    const alertData = {
      ID_incidente: `a_${Date.now()}`,
      tipo_incidente: this.mapAlertType(alert.cause),
      fecha: new Date().toISOString().split('T')[0],
      hora: new Date().toISOString().split('T')[1],
      latitud: 0,
      longitud: 0,
      descripcion: alert.header_text?.translation?.[0]?.text || '',
      vehiculo_relacionado: '',
      conductor_relacionado: '',
      estado_incidente: 'activo'
    };
    
    await sheetsService.createIncidente(alertData);
  }

  private getStopType(locationType: number): string {
    const types = ['estación', 'entrada', 'zona', 'intercambiador'];
    return types[locationType] || 'estación';
  }

  private mapAlertType(cause: string): string {
    const mapping: Record<string, string> = {
      'ACCIDENT': 'accidente',
      'DELAY': 'retraso',
      'MAINTENANCE': 'fallo mecanico',
      'WEATHER': 'emergencia'
    };
    return mapping[cause] || 'informacion';
  }

  private async createDelayAlert(tripUpdate: any, stopUpdate: any, feed: GTFSFeed) {
    const alert = {
      ID_incidente: `d_${Date.now()}`,
      tipo_incidente: 'retraso',
      fecha: new Date().toISOString().split('T')[0],
      hora: new Date().toISOString().split('T')[1],
      latitud: 0,
      longitud: 0,
      descripcion: `Retraso de ${stopUpdate.arrival.delay} segundos en ruta ${tripUpdate.trip.route_id}`,
      vehiculo_relacionado: tripUpdate.vehicle?.id || '',
      conductor_relacionado: '',
      estado_incidente: 'activo'
    };
    
    await sheetsService.createIncidente(alert);
  }
}

// Ejecutar cada 5 minutos
const gtfsService = new GTFSIntegrationService();
setInterval(() => gtfsService.fetchRealtimeGTFS(), 5 * 60 * 1000);
setInterval(() => gtfsService.fetchStaticGTFS(), 24 * 60 * 60 * 1000);