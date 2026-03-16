import React, { useState } from 'react';
import type { NextPage } from 'next';
import MainLayout from '../components/Layout/MainLayout';
import TransiMioMap from '../components/Map/TransiMioMap';
import RoutePlanner from '../components/RoutePlanner/RoutePlanner';
import AlertPanel from '../components/Alerts/AlertPanel';
import { useSession } from 'next-auth/react';

const HomePage: NextPage = () => {
  const { data: session } = useSession();
  const [showRoutePlanner, setShowRoutePlanner] = useState(false);
  const [showAlerts, setShowAlerts] = useState(false);

  return (
    <MainLayout>
      <div className="relative w-full h-full">
        <TransiMioMap />
        
        {/* Floating Action Buttons */}
        <div className="absolute bottom-6 right-6 space-y-3">
          <button
            onClick={() => setShowRoutePlanner(!showRoutePlanner)}
            className="w-14 h-14 bg-primary-600 text-white rounded-full shadow-lg hover:bg-primary-700 flex items-center justify-center"
          >
            <span className="text-2xl">🗺️</span>
          </button>
          
          {session && (
            <button
              onClick={() => setShowAlerts(!showAlerts)}
              className="w-14 h-14 bg-transimio-red text-white rounded-full shadow-lg hover:bg-opacity-90 flex items-center justify-center"
            >
              <span className="text-2xl">⚠️</span>
            </button>
          )}
        </div>

        {/* Panels */}
        {showRoutePlanner && (
          <div className="absolute top-6 left-6 w-96 bg-white rounded-lg shadow-xl">
            <RoutePlanner onClose={() => setShowRoutePlanner(false)} />
          </div>
        )}

        {showAlerts && (
          <div className="absolute top-6 right-6 w-80 bg-white rounded-lg shadow-xl">
            <AlertPanel onClose={() => setShowAlerts(false)} />
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default HomePage;