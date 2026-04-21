import React from 'react';
import { Globe, Share2, Settings, Trash2, Zap, ZapOff, ExternalLink, RefreshCw } from 'lucide-react';

const ModernPageCard = ({ page, onUpdateAI, onDeletePage, onEdit }) => {
  const isInstagram = page.platform === 'instagram';

  return (
    <div className="bg-wink-white group relative border border-wink-gray-200 rounded-xl overflow-hidden hover:shadow-xl hover:border-wink-black transition-all duration-300">
      {/* Platform Header */}
      <div className="bg-wink-gray-50 px-5 py-3 border-b border-wink-gray-100 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {isInstagram ? (
            <Share2 size={16} className="text-wink-black" />
          ) : (
            <Globe size={16} className="text-wink-black" />
          )}
          <span className="text-[10px] font-bold uppercase tracking-widest text-wink-gray-400">
            {page.platform}
          </span>
        </div>
        <div className={`flex items-center space-x-1.5 px-2 py-0.5 rounded-full ${
          page.ai_enabled ? 'bg-wink-black/5 text-wink-black' : 'bg-wink-gray-200 text-wink-gray-500'
        }`}>
          {page.ai_enabled ? <Zap size={10} fill="currentColor" /> : <ZapOff size={10} />}
          <span className="text-[10px] font-bold uppercase">
            {page.ai_enabled ? 'Active' : 'Disabled'}
          </span>
        </div>
      </div>

      <div className="p-5">
        <h3 className="text-lg font-bold text-wink-black truncate leading-tight mb-1">
          {page.page_name}
        </h3>
        <p className="text-xs text-wink-gray-400 font-medium mb-4">
          ID: {page.page_id}
        </p>

        {/* Action Grid */}
        <div className="grid grid-cols-2 gap-2 mt-6">
          <button
            onClick={() => onEdit(page)}
            className="flex items-center justify-center space-x-2 py-2.5 rounded-lg border border-wink-gray-200 text-wink-black hover:bg-wink-black hover:text-wink-white hover:border-wink-black transition-all"
          >
            <Settings size={14} />
            <span className="text-xs font-bold uppercase tracking-tight">Configure</span>
          </button>
          
          <button
            onClick={() => onUpdateAI(page.id, { ai_enabled: !page.ai_enabled })}
            className={`flex items-center justify-center space-x-2 py-2.5 rounded-lg border transition-all ${
              page.ai_enabled 
                ? 'border-wink-gray-200 text-wink-gray-400 hover:border-wink-black hover:text-wink-black'
                : 'border-wink-black bg-wink-black text-wink-white hover:bg-wink-gray-800'
            }`}
          >
             {page.ai_enabled ? <ZapOff size={14} /> : <Zap size={14} />}
             <span className="text-xs font-bold uppercase tracking-tight">
               {page.ai_enabled ? 'Disable' : 'Enable'}
             </span>
          </button>
        </div>
      </div>

      {/* Hover Overlay Delete */}
      <button 
        onClick={() => onDeletePage(page.id, page.page_name)}
        className="absolute top-12 right-2 p-2 bg-wink-white/90 backdrop-blur rounded-lg border border-wink-gray-200 text-wink-gray-400 hover:text-wink-black hover:border-wink-black opacity-0 group-hover:opacity-100 transition-all shadow-sm"
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
};

export default ModernPageCard;
