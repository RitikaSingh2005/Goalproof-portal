import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

const PageLayout = () => {
  return (
    <div className="min-h-screen bg-dark-900 transition-colors duration-300 font-sans text-white overflow-hidden relative">
      {/* Background glowing effects */}
      <div className="absolute top-[-20%] left-[-10%] w-[50rem] h-[50rem] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[40rem] h-[40rem] bg-fuchsia-600/10 rounded-full blur-[120px] pointer-events-none"></div>
      
      <Sidebar />
      
      <div className="pl-64 flex flex-col min-h-screen relative z-10">
        <Navbar />
        <main className="flex-1 p-8 lg:p-12 custom-scrollbar overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default PageLayout;
