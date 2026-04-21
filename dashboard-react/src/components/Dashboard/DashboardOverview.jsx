import React from 'react';
import { MessageSquare, Zap, Activity, Users } from 'lucide-react';

const StatCard = ({ title, value, icon: Icon, trend }) => (
  <div className="bg-wink-white p-6 rounded-xl border border-wink-gray-200 hover:border-wink-black transition-all group">
    <div className="flex items-center justify-between mb-4">
      <div className="p-2 bg-wink-gray-50 rounded-lg group-hover:bg-wink-black group-hover:text-wink-white transition-all">
        <Icon size={20} />
      </div>
      {trend && (
        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
          trend.startsWith('+') ? 'bg-wink-gray-100 text-wink-black' : 'bg-wink-gray-100 text-wink-gray-500'
        }`}>
          {trend}
        </span>
      )}
    </div>
    <p className="text-sm font-medium text-wink-gray-500">{title}</p>
    <p className="text-2xl font-bold text-wink-black mt-1">{value}</p>
  </div>
);

const DashboardOverview = ({ pages = [] }) => {
  const activeAutomations = pages.filter(p => p.ai_enabled).length;
  
  return (
    <div className="space-y-8 animate-slide-in-top">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-wink-black">Hi, Welcome back!</h1>
        <p className="text-wink-gray-500 mt-1">Here's what's happening with your automations today.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Pages" 
          value={pages.length} 
          icon={Users} 
          trend="+2 this week"
        />
        <StatCard 
          title="Active AI" 
          value={activeAutomations} 
          icon={Zap} 
          trend="85% active"
        />
        <StatCard 
          title="Messages Handled" 
          value="1,284" 
          icon={MessageSquare} 
          trend="+12% vs last month"
        />
        <StatCard 
          title="System Health" 
          value="100%" 
          icon={Activity} 
        />
      </div>
    </div>
  );
};

export default DashboardOverview;
