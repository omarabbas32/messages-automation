import React, { useState } from 'react';
import Sidebar from '../components/Sidebar/Sidebar';
import { Menu, Zap } from 'lucide-react';

const MainLayout = ({ children, activeView, onNavigate, onLogout, userEmail }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-wink-gray-50 flex">
      {/* Sidebar */}
      <Sidebar 
        activeView={activeView} 
        onNavigate={onNavigate} 
        onLogout={onLogout} 
        userEmail={userEmail}
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-64">
        {/* Top Mobile Header */}
        <header className="lg:hidden h-16 bg-wink-white border-b border-wink-gray-200 flex items-center justify-between px-4 sticky top-0 z-30">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-wink-black rounded flex items-center justify-center">
              <Zap size={18} className="text-wink-white" />
            </div>
            <span className="text-xl font-bold tracking-tighter uppercase">Wink</span>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 text-wink-gray-600 hover:bg-wink-gray-100 rounded-lg"
          >
            <Menu size={24} />
          </button>
        </header>

        {/* Dynamic Page Content */}
        <main className="flex-1 p-6 lg:p-10 max-w-7xl mx-auto w-full">
          {children}
        </main>

        {/* Subtle Footer */}
        <footer className="p-6 text-center border-t border-wink-gray-100">
          <p className="text-xs text-wink-gray-400 font-medium">
            &copy; {new Date().getFullYear()} Wink Automation Platform. All rights reserved.
          </p>
        </footer>
      </div>
    </div>
  );
};

export default MainLayout;
