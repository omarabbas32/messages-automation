import React, { useState, useEffect } from 'react';
import { User, Settings as SettingsIcon, Shield, Lock, Activity, Key, Save, ArrowLeft, Check, AlertCircle, Info, ChevronRight, Zap } from 'lucide-react';

const SettingsPage = ({ settings, onUpdateSettings, onNavigate }) => {
    const [activeTab, setActiveTab] = useState('account');
    const [profile, setProfile] = useState({ display_name: '' });
    const [aiConfig, setAiConfig] = useState({
        model: 'gpt-4o-mini',
        temperature: 0.7,
        max_tokens: 250,
        global_instructions: ''
    });
    const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
    const [apiKey, setApiKey] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [status, setStatus] = useState({ text: '', type: '' });

    useEffect(() => {
        if (settings) {
            setApiKey(settings.openai_api_key || '');
            setProfile({ display_name: settings.display_name || '' });
            setAiConfig({
                model: settings.ai_default_model || 'gpt-4o-mini',
                temperature: settings.ai_default_temperature ?? 0.7,
                max_tokens: settings.ai_default_max_tokens ?? 250,
                global_instructions: settings.ai_global_instructions || ''
            });
        }
    }, [settings]);

    const handleSaveSettings = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        setStatus({ text: '', type: '' });
        
        const success = await onUpdateSettings({ 
            openai_api_key: apiKey,
            display_name: profile.display_name,
            ai_default_model: aiConfig.model,
            ai_default_temperature: aiConfig.temperature,
            ai_default_max_tokens: aiConfig.max_tokens,
            ai_global_instructions: aiConfig.global_instructions
        });
        
        setIsSaving(false);
        if (success) {
            setStatus({ text: 'Changes saved effectively.', type: 'success' });
            setTimeout(() => setStatus({ text: '', type: '' }), 3000);
        }
    };

    const usagePercent = Math.min(100, ((settings?.ai_messages_used || 0) / (settings?.plan === 'pro' ? 1000 : 50)) * 100);

    const tabs = [
        { id: 'account', label: 'Account & AI', icon: SettingsIcon },
        { id: 'usage', label: 'Plan & Usage', icon: Activity },
        { id: 'security', label: 'Security', icon: Shield },
    ];

    return (
        <div className="max-w-5xl mx-auto animate-slide-in-top">
            {/* Page Header */}
            <div className="flex items-center justify-between mb-10">
                <div className="flex items-center space-x-4">
                    <button 
                        onClick={() => onNavigate('dashboard')} 
                        className="p-2 hover:bg-wink-gray-100 rounded-full transition-all text-wink-gray-400 hover:text-wink-black"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <h1 className="text-3xl font-black tracking-tight text-wink-black uppercase">Workspace Settings</h1>
                </div>
                {status.text && (
                    <div className={`flex items-center space-x-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest animate-pop-in ${
                        status.type === 'success' ? 'bg-wink-black text-wink-white' : 'bg-red-50 text-red-600 border border-red-100'
                    }`}>
                        {status.type === 'success' ? <Check size={14} /> : <AlertCircle size={14} />}
                        <span>{status.text}</span>
                    </div>
                )}
            </div>

            <div className="flex flex-col lg:flex-row gap-10">
                {/* Internal Nav */}
                <aside className="lg:w-64 space-y-1">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 group ${
                                activeTab === tab.id 
                                ? 'bg-wink-black text-wink-white shadow-lg' 
                                : 'text-wink-gray-500 hover:bg-wink-gray-100'
                            }`}
                        >
                            <div className="flex items-center space-x-3">
                                <tab.icon size={18} />
                                <span className="font-bold text-sm uppercase tracking-tighter">{tab.label}</span>
                            </div>
                            <ChevronRight size={14} className={activeTab === tab.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} />
                        </button>
                    ))}
                </aside>

                {/* Content Area */}
                <main className="flex-1 bg-wink-white border border-wink-gray-200 rounded-3xl p-8 lg:p-12 shadow-sm min-h-[500px]">
                    {activeTab === 'account' && (
                        <form onSubmit={handleSaveSettings} className="space-y-10">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                <div className="space-y-6">
                                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-wink-gray-400 mb-6">Identity Profile</h3>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-wink-gray-500">Display Name</label>
                                        <input
                                            type="text"
                                            value={profile.display_name}
                                            onChange={(e) => setProfile({ ...profile, display_name: e.target.value })}
                                            className="w-full bg-wink-gray-50 border border-wink-gray-100 rounded-lg p-3 text-sm font-bold focus:border-wink-black outline-none transition-all"
                                            placeholder="Your name or business name"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-wink-gray-500">Email Address</label>
                                        <div className="flex items-center space-x-2 px-3 py-3 bg-wink-gray-100 border border-wink-gray-200 rounded-lg text-wink-gray-400 text-sm font-medium">
                                            <User size={14} />
                                            <span>{settings?.email}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-wink-gray-400 mb-6">Model Intelligence</h3>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-wink-gray-500">Preferred AI Engine</label>
                                        <select
                                            value={aiConfig.model}
                                            onChange={(e) => setAiConfig({ ...aiConfig, model: e.target.value })}
                                            className="w-full bg-wink-gray-50 border border-wink-gray-100 rounded-lg p-3 text-sm font-bold focus:border-wink-black outline-none transition-all appearance-none cursor-pointer"
                                        >
                                            <option value="gpt-4o-mini">GPT-4o Mini (Efficiency)</option>
                                            <option value="gpt-4o">GPT-4o (Max Intelligence)</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center mb-1">
                                            <label className="text-[10px] font-black uppercase text-wink-gray-500">Creativity / Temperature</label>
                                            <span className="text-xs font-bold text-wink-black">{aiConfig.temperature}</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="0"
                                            max="1"
                                            step="0.1"
                                            value={aiConfig.temperature}
                                            onChange={(e) => setAiConfig({ ...aiConfig, temperature: parseFloat(e.target.value) })}
                                            className="w-full h-1 bg-wink-gray-100 rounded-lg appearance-none cursor-pointer accent-wink-black"
                                        />
                                    </div>
                                </div>

                                <div className="md:col-span-2 space-y-6 pt-6 border-t border-wink-gray-100">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-wink-gray-400">Global AI Directive</h3>
                                        <div className="flex items-center space-x-1 text-[10px] font-bold text-wink-gray-400 uppercase">
                                            <Zap size={10} className="fill-wink-gray-400" />
                                            <span>Universal across all pages</span>
                                        </div>
                                    </div>
                                    <textarea
                                        value={aiConfig.global_instructions}
                                        onChange={(e) => setAiConfig({ ...aiConfig, global_instructions: e.target.value })}
                                        placeholder="Enter instructions that should apply to all automations..."
                                        className="w-full bg-wink-gray-50 border border-wink-gray-100 rounded-xl p-6 text-sm font-medium focus:border-wink-black outline-none transition-all min-h-[120px]"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isSaving}
                                className="w-full bg-wink-black text-wink-white py-4 rounded-xl font-black uppercase tracking-[0.1em] hover:bg-wink-gray-800 transition-all flex items-center justify-center space-x-3 shadow-xl disabled:opacity-50"
                            >
                                {isSaving ? <div className="w-5 h-5 border-2 border-wink-gray-600 border-t-wink-white rounded-full animate-spin" /> : <Save size={18} />}
                                <span>Save Workspace Configuration</span>
                            </button>
                        </form>
                    )}

                    {activeTab === 'usage' && (
                        <div className="space-y-12">
                            <div className="bg-wink-black rounded-2xl p-8 text-wink-white relative overflow-hidden group">
                                <Activity className="absolute -right-4 -bottom-4 w-32 h-32 text-wink-gray-800 opacity-50 group-hover:scale-110 transition-transform" />
                                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                                    <div>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-wink-gray-500">Current Plan</span>
                                        <h2 className="text-4xl font-black mt-2 uppercase tracking-tighter">{settings?.plan === 'pro' ? 'Professional' : 'Standard'}</h2>
                                        <p className="text-wink-gray-400 mt-2 text-sm max-w-xs font-medium">Your current usage is within the parameters of your subscription.</p>
                                    </div>
                                    <button className="bg-wink-white text-wink-black px-8 py-3 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-wink-gray-100 transition-all shadow-lg whitespace-nowrap">
                                        Upgrade Capacity
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-8">
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-black uppercase tracking-widest text-wink-gray-400">Monthly Quota</span>
                                        <span className="text-sm font-bold text-wink-black">{settings?.ai_messages_used || 0} / {settings?.plan === 'pro' ? '∞' : '50'}</span>
                                    </div>
                                    <div className="w-full h-1.5 bg-wink-gray-100 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-wink-black rounded-full transition-all duration-1000" 
                                            style={{ width: `${usagePercent}%` }} 
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="border border-wink-gray-100 rounded-2xl p-6 bg-wink-gray-50/50">
                                        <div className="flex items-center space-x-3 text-wink-gray-400 mb-4">
                                            <Zap size={18} />
                                            <span className="text-[10px] font-black uppercase tracking-widest">Efficiency</span>
                                        </div>
                                        <p className="text-2xl font-black text-wink-black">{(settings?.ai_tokens_used || 0).toLocaleString()}</p>
                                        <p className="text-xs text-wink-gray-500 font-medium">Tokens processed this period</p>
                                    </div>
                                    <div className="border border-wink-gray-100 rounded-2xl p-6 bg-wink-gray-50/50">
                                        <div className="flex items-center space-x-3 text-wink-gray-400 mb-4">
                                            <Lock size={18} />
                                            <span className="text-[10px] font-black uppercase tracking-widest">Status</span>
                                        </div>
                                        <p className="text-2xl font-black text-wink-black uppercase tracking-tighter">Active</p>
                                        <p className="text-xs text-wink-gray-500 font-medium">Subscription is healthy</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'security' && (
                        <div className="space-y-10">
                            <div className="bg-wink-gray-50 border border-wink-gray-100 rounded-2xl p-8 flex items-start space-x-6">
                                <div className="p-3 bg-wink-white border border-wink-gray-200 rounded-xl shadow-sm">
                                    <Key size={24} className="text-wink-black" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-black uppercase tracking-tighter text-wink-black mb-1">OpenAI API Key</h4>
                                    <p className="text-xs text-wink-gray-500 font-medium mb-6">Connect your personal key for unlimited messaging capacity.</p>
                                    <div className="flex items-center space-x-2">
                                        <input
                                            type="password"
                                            value={apiKey}
                                            onChange={(e) => setApiKey(e.target.value)}
                                            placeholder="sk-...."
                                            className="bg-wink-white border border-wink-gray-200 rounded-lg px-4 py-2 text-xs font-mono focus:border-wink-black outline-none transition-all w-64 shadow-sm"
                                        />
                                        <button className="bg-wink-black text-wink-white px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-wink-gray-800 transition-all">Update</button>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-10 border-t border-wink-gray-100">
                                <h4 className="text-xs font-black uppercase tracking-[0.2em] text-wink-gray-400 mb-8">Access Management</h4>
                                <div className="space-y-6 max-w-sm">
                                    <button className="w-full flex items-center justify-between px-6 py-4 border border-wink-gray-200 rounded-xl hover:border-wink-black text-sm font-bold text-wink-black transition-all group">
                                        <span>Change Password</span>
                                        <Lock size={16} className="text-wink-gray-400 group-hover:text-wink-black" />
                                    </button>
                                    <button className="w-full flex items-center justify-between px-6 py-4 border border-wink-gray-200 rounded-xl hover:border-wink-black text-sm font-bold text-wink-black transition-all group">
                                        <span>Two-Factor Authentication</span>
                                        <Shield size={16} className="text-wink-gray-400 group-hover:text-wink-black" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

export default SettingsPage;
