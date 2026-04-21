import React from 'react';
import { Home, Laylo, Settings, LogOut, Menu, X, Facebook, Instagram, MessageSquare, Zap } from 'lucide-react';

const SidebarItem = ({ icon: Icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${
      active 
        ? 'bg-wink-black text-wink-white shadow-lg' 
        : 'text-wink-gray-500 hover:bg-wink-gray-100 hover:text-wink-black'
    }`}
  >
    <Icon size={20} />
    <span className="font-medium">{label}</span>
  </button>
);

const Sidebar = ({ activeView, onNavigate, onLogout, userEmail, isOpen, setIsOpen }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-wink-black/20 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside className={`fixed top-0 left-0 h-full bg-wink-white border-r border-wink-gray-200 z-50 transition-transform duration-300 transform 
        ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 w-64 flex flex-col`}>
        
        {/* Header/Logo */}
        <div className="p-6 flex items-center justify-between border-b border-wink-gray-100">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-wink-black rounded flex items-center justify-center">
              <Zap size={20} className="text-wink-white" />
            </div>
            <span className="text-2xl font-bold tracking-tighter text-wink-black uppercase">Wink</span>
          </div>
          <button onClick={() => setIsOpen(false)} className="lg:hidden text-wink-gray-500">
            <X size={24} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {menuItems.map((item) => (
            <SidebarItem
              key={item.id}
              icon={item.icon}
              label={item.label}
              active={activeView === item.id}
              onClick={() => {
                onNavigate(item.id);
                if (window.innerWidth < 1024) setIsOpen(false);
              }}
            />
          ))}
        </nav>

        {/* Footer/User */}
        <div className="p-4 border-t border-wink-gray-100 space-y-4">
          <div className="px-4 py-2">
            <p className="text-xs font-semibold text-wink-gray-400 uppercase tracking-wider mb-1">Account</p>
            <p className="text-sm font-medium text-wink-black truncate">{userEmail}</p>
          </div>
          
          <button
            onClick={onLogout}
            className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-wink-gray-500 hover:bg-wink-gray-100 hover:text-wink-black transition-all"
          >
            <LogOut size={20} />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
