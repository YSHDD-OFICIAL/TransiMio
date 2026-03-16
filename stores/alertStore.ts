import { create } from 'zustand';
import api from '../services/api';

interface Alert {
  id: string;
  type: 'accident' | 'delay' | 'off-route' | 'stolen' | 'emergency' | 'mechanical';
  severity: 'red' | 'orange' | 'yellow';
  latitude: number;
  longitude: number;
  description: string;
  vehicleId?: string;
  createdAt: string;
}

interface AlertStore {
  alerts: Alert[];
  fetchAlerts: () => Promise<void>;
  reportAlert: (alert: Partial<Alert>) => Promise<void>;
}

export const useAlertStore = create<AlertStore>((set) => ({
  alerts: [],

  fetchAlerts: async () => {
    try {
      const response = await api.get('/alerts/active');
      set({ alerts: response.data });
    } catch (error) {
      console.error('Error fetching alerts:', error);
    }
  },

  reportAlert: async (alert) => {
    try {
      await api.post('/alerts/report', alert);
      // Refresh alerts
      const response = await api.get('/alerts/active');
      set({ alerts: response.data });
    } catch (error) {
      console.error('Error reporting alert:', error);
    }
  }
}));