import { google } from 'googleapis';
import { JWT } from 'google-auth-library';
import { logger } from '../utils/logger';

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_ID;
const SHEETS = {
  USUARIOS: 'USUARIOS',
  CONDUCTORES: 'CONDUCTORES',
  VEHICULOS: 'VEHICULOS',
  RUTAS: 'RUTAS',
  ESTACIONES: 'ESTACIONES',
  INCIDENTES: 'INCIDENTES',
  UBICACIONES: 'UBICACION_VEHICULOS_TIEMPO_REAL',
  REPORTES: 'REPORTES_USUARIOS',
  CALIFICACIONES: 'CALIFICACIONES',
  SEGURIDAD: 'REGISTRO_SEGURIDAD'
};

let sheets: any;

export const connectSheets = async () => {
  try {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    sheets = google.sheets({ version: 'v4', auth });
    logger.info('Google Sheets initialized');
  } catch (error) {
    logger.error('Error connecting to Google Sheets:', error);
    throw error;
  }
};

export const sheetsService = {
  // Usuarios
  async getUsuarios() {
    try {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEETS.USUARIOS}!A2:Z`,
      });
      
      const rows = response.data.values || [];
      const headers = await getHeaders(SHEETS.USUARIOS);
      
      return rows.map(row => {
        const obj: any = {};
        headers.forEach((header: string, index: number) => {
          obj[header] = row[index] || '';
        });
        return obj;
      });
    } catch (error) {
      logger.error('Error getting usuarios:', error);
      throw error;
    }
  },

  async createUsuario(data: any) {
    try {
      const headers = await getHeaders(SHEETS.USUARIOS);
      const values = headers.map(header => data[header] || '');
      
      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEETS.USUARIOS}!A:Z`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [values]
        }
      });
      
      logger.info(`Usuario creado: ${data.email}`);
      return { success: true, id: data.ID_usuario };
    } catch (error) {
      logger.error('Error creating usuario:', error);
      throw error;
    }
  },

  // Vehículos en tiempo real
  async updateVehicleLocation(vehicleId: string, location: any) {
    try {
      const timestamp = new Date().toISOString();
      const values = [
        generateId(),
        vehicleId,
        location.lat,
        location.lng,
        location.speed || 0,
        location.direction || 0,
        timestamp,
        location.status || 'operativo'
      ];

      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEETS.UBICACIONES}!A:H`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [values]
        }
      });

      // También actualizar en Redis para acceso rápido
      await redisClient.set(
        `vehicle:${vehicleId}:location`,
        JSON.stringify({ ...location, timestamp }),
        { EX: 30 } // expira en 30 segundos
      );
    } catch (error) {
      logger.error('Error updating vehicle location:', error);
    }
  },

  // Incidentes
  async createIncidente(data: any) {
    try {
      const headers = await getHeaders(SHEETS.INCIDENTES);
      const values = headers.map(header => data[header] || '');
      
      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEETS.INCIDENTES}!A:Z`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [values]
        }
      });

      // Emitir alerta por WebSocket si es grave
      if (data.tipo_incidente === 'emergencia' || data.tipo_incidente === 'accidente') {
        io.emit('new_alert', {
          type: data.tipo_incidente,
          severity: 'red',
          location: { lat: data.latitud, lng: data.longitud },
          description: data.descripcion
        });
      }

      return { success: true };
    } catch (error) {
      logger.error('Error creating incidente:', error);
      throw error;
    }
  },

  // Reportes de usuarios
  async createReporte(data: any) {
    try {
      const headers = await getHeaders(SHEETS.REPORTES);
      const values = headers.map(header => data[header] || '');
      
      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEETS.REPORTES}!A:Z`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [values]
        }
      });

      return { success: true };
    } catch (error) {
      logger.error('Error creating reporte:', error);
      throw error;
    }
  }
};

async function getHeaders(sheetName: string): Promise<string[]> {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetName}!1:1`,
    });
    return response.data.values?.[0] || [];
  } catch (error) {
    logger.error('Error getting headers:', error);
    return [];
  }
}

function generateId(): string {
  return `id_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}