import React from 'react';
import Head from 'next/head';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import { useSession } from 'next-auth/react';
import { Toaster } from 'react-hot-toast';

interface MainLayoutProps {
  children: React.ReactNode;
  title?: string;
}

const MainLayout: React.FC<MainLayoutProps> = ({ 
  children, 
  title = 'TransiMio - Transporte Público Inteligente' 
}) => {
  const { data: session } = useSession();

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content="Plataforma global de transporte público en tiempo real" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Montserrat:wght@600;700;800&display=swap" rel="stylesheet" />
      </Head>

      <div className="min-h-screen bg-gray-50">
        <Navbar />
        
        <div className="flex h-[calc(100vh-64px)]">
          {session && <Sidebar />}
          
          <main className={`flex-1 overflow-hidden ${!session ? 'w-full' : ''}`}>
            {children}
          </main>
        </div>
        
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
          }}
        />
      </div>
    </>
  );
};

export default MainLayout;
