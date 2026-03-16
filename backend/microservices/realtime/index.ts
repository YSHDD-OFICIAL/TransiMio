import { Server } from 'socket.io';
import { redisClient } from '../../src/server';
import { sheetsService } from '../../src/services/sheetsService';
import { logger } from '../../src/utils/logger';

export class RealtimeService {
  private io: Server;
  private vehicleUpdates: Map<string, any> = new Map();

  constructor(io: Server) {
    this.io = io;
    this.initialize();
  }

  private initialize() {
    // Procesar actualizaciones cada 100ms
    setInterval(() => this.broadcastUpdates(), 100);
    
    // Persistir en Sheets cada minuto
    setInterval(() => this.persistToSheets(), 60000);
  }

  // Recibir actualización de vehículo
  public handleVehicleUpdate(vehicleId: string, data: any) {
    this.vehicleUpdates.set(vehicleId, {
      ...data,
      lastUpdate: Date.now()
    });

    // Actualizar en Redis para acceso rápido
    redisClient.set(
      `vehicle:${vehicleId}`,
      JSON.stringify(data),
      { EX: 30 }
    );
  }

  // Broadcast a clientes suscritos
  private broadcastUpdates() {
    const updates = Array.from(this.vehicleUpdates.entries()).map(([id, data]) => ({
      id,
      ...data
    }));

    if (updates.length > 0) {
      this.io.emit('vehicle_updates', updates);
      this.vehicleUpdates.clear();
    }
  }

  // Persistir en Google Sheets
  private async persistToSheets() {
    try {
      const vehicles = await redisClient.keys('vehicle:*');
      
      for (const key of vehicles) {
        const data = await redisClient.get(key);
        if (data) {
          const vehicle = JSON.parse(data);
          await sheetsService.updateVehicleLocation(
            key.replace('vehicle:', ''),
            vehicle
          );
        }
      }
      
      logger.info(`Persisted ${vehicles.length} vehicle locations to Sheets`);
    } catch (error) {
      logger.error('Error persisting to Sheets:', error);
    }
  }

  // Detectar vehículos fuera de ruta
  private detectOffRoute(vehicleId: string, location: any) {
    // Implementar lógica de geocerca
    const route = this.getVehicleRoute(vehicleId);
    if (route && this.isOutsideRoute(location, route)) {
      this.io.emit('alert', {
        type: 'off_route',
        vehicleId,
        location,
        severity: 'orange',
        timestamp: new Date().toISOString()
      });
    }
  }

  private getVehicleRoute(vehicleId: string) {
    // Obtener ruta del vehículo desde caché
    return null;
  }

  private isOutsideRoute(location: any, route: any): boolean {
    // Implementar algoritmo de distancia a polilínea
    return false;
  }
}