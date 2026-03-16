import React from 'react';
import { motion } from 'framer-motion';

interface VehicleMarkerProps {
  vehicle: {
    id: string;
    type: 'bus' | 'metro' | 'train';
    status: 'on-time' | 'delayed' | 'off-route';
    speed: number;
    direction: number;
  };
}

export const VehicleMarker: React.FC<VehicleMarkerProps> = ({ vehicle }) => {
  const getColor = () => {
    switch (vehicle.status) {
      case 'delayed': return '#FF8C00';
      case 'off-route': return '#CC3300';
      default: return '#0066CC';
    }
  };

  const getIcon = () => {
    switch (vehicle.type) {
      case 'bus': return '🚌';
      case 'metro': return '🚇';
      case 'train': return '🚆';
      default: return '🚌';
    }
  };

  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      whileHover={{ scale: 1.2 }}
      className="relative cursor-pointer"
      style={{ transform: `rotate(${vehicle.direction}deg)` }}
    >
      <div 
        className="w-8 h-8 rounded-full flex items-center justify-center text-lg shadow-lg"
        style={{ backgroundColor: getColor() }}
      >
        {getIcon()}
      </div>
      {vehicle.speed > 0 && (
        <motion.div
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-blue-500 rounded-full"
        />
      )}
    </motion.div>
  );
};
