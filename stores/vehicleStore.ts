import { create } from 'zustand';
import api from '../services/api';

interface Vehicle {
  id: string;
  number: string;
  type: 'bus' | 'metro' | 'train';
  latitude: number;
  longitude: number;
  speed: number;
  direction: number;
  status: 'on-time' | 'delayed' | 'off-route';
  nextStop: string;
  eta: string;
  occupancy: 'low' | 'medium' | 'high';
}

interface VehicleStore {
  vehicles: Vehicle[];
  selectedVehicle: Vehicle | null;
  isLoading: boolean;
  error: string | null;
  fetchVehicles: () => Promise<void>;
  updateVehicle: (vehicle: Vehicle) => void;
  setSelectedVehicle: (vehicle: Vehicle | null) => void;
}

export const useVehicleStore = create<VehicleStore>((set, get) => ({
  vehicles: [],
  selectedVehicle: null,
  isLoading: false,
  error: null,

  fetchVehicles: async () => {
    set({ isLoading: true });
    try {
      const response = await api.get('/vehicles/realtime');
      set({ vehicles: response.data, isLoading: false });
    } catch (error) {
      set({ error: error.message, isLoading: false });
    }
  },

  updateVehicle: (updatedVehicle) => {
    set((state) => ({
      vehicles: state.vehicles.map(v => 
        v.id === updatedVehicle.id ? updatedVehicle : v
      )
    }));
  },

  setSelectedVehicle: (vehicle) => set({ selectedVehicle: vehicle })
}));