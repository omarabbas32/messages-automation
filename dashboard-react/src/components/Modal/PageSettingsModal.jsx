import React, { useState, useEffect } from 'react';
import { X, Save, Brain, MessageSquare, Database, FileText, Upload, AlertCircle, Check, Loader2, Zap } from 'lucide-react';

const PageSettingsModal = ({ page, isOpen, onClose, onUpdatePage, onUpdateAI, onUpdateKnowledge, onUploadInventory }) => {
    const [pageName, setPageName] = useState(page?.page_name || '');
    const [pageToken, setPageToken] = useState('');
    const [aiInstructions, setAiInstructions] = useState(page?.ai_instructions || '');
    const [aiEnabled, setAiEnabled] = useState(page?.ai_enabled ?? true);
    const [aiContextLimit, setAiContextLimit] = useState(page?.ai_context_limit || 5);
    const [knowledgeBase, setKnowledgeBase] = useState(page?.knowledge_base || '');
    const [isSaving, setIsSaving] = useState(false);
    const [activeTab, setActiveTab] = useState('general');
    const [excelFile, setExcelFile] = useState(null);
    const [isUploadingExcel, setIsUploadingExcel] = useState(false);

    useEffect(() => {
        if (page) {
            setPageName(page.page_name || '');
            setAiInstructions(page.ai_instructions || '');
            setAiEnabled(page.ai_enabled ?? true);
            setAiContextLimit(page.ai_context_limit || 5);
            setKnowledgeBase(page.knowledge_base || '');
        }
    }, [page]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            // 1. General Info
            const pageData = { page_name: pageName };
            if (pageToken.trim()) pageData.page_token = pageToken.trim();
            await onUpdatePage(page.id, pageData);

            // 2. AI Config
            await onUpdateAI(page.id, {
                ai_enabled: aiEnabled,
                ai_instructions: aiInstructions,
                ai_context_limit: aiContextLimit
            });

            // 3. Knowledge Base
            await onUpdateKnowledge(page.id, knowledgeBase);

            onClose();
        } catch (error) {
            console.error('Failed to save settings:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleExcelUpload = async () => {
        if (!excelFile) return;
        setIsUploadingExcel(true);
        try {
            await onUploadInventory(page.id, excelFile);
            setExcelFile(null);
        } catch (error) {
            console.error('Excel upload failed:', error);
        } finally {
            setIsUploadingExcel(false);
        }
    };

    if (!isOpen || !page) return null;

    const tabs = [
        { id: 'general', label: 'General', icon: Database },
        { id: 'ai', label: 'AI Intelligence', icon: Brain },
        { id: 'knowledge', label: 'Knowledge Base', icon: FileText },
    ];

    return (
        <div className="fixed inset-0 bg-wink-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-wink-white w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden animate-pop-in flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="p-6 border-b border-wink-gray-100 flex items-center justify-between bg-wink-gray-50/50">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-wink-black rounded-xl flex items-center justify-center shadow-lg">
                            <Zap size={20} className="text-wink-white fill-wink-white" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-wink-black uppercase tracking-tight leading-none mb-1">
                                Configure {page.platform}
                            </h3>
                            <p className="text-[10px] font-bold text-wink-gray-400 uppercase tracking-widest">{page.page_name} • {page.page_id}</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 hover:bg-wink-gray-200 rounded-full transition-all text-wink-gray-400 hover:text-wink-black"
                    >
                        <X size={24} />
                    </button>
                </div>

                <div className="flex flex-1 overflow-hidden">
                    {/* Sidebar Tabs */}
                    <aside className="w-48 bg-wink-gray-50 border-r border-wink-gray-100 p-4 space-y-1">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all font-bold text-[10px] uppercase tracking-widest ${
                                    activeTab === tab.id 
                                    ? 'bg-wink-black text-wink-white shadow-md' 
                                    : 'text-wink-gray-400 hover:text-wink-black hover:bg-wink-gray-200/50'
                                }`}
                            >
                                <tab.icon size={16} />
                                <span>{tab.label}</span>
                            </button>
                        ))}
                    </aside>

                    {/* Content */}
                    <main className="flex-1 p-8 overflow-y-auto">
                        {activeTab === 'general' && (
                            <div className="space-y-6">
                                <section className="space-y-4">
                                    <h4 className="text-xs font-black uppercase tracking-[0.2em] text-wink-gray-400 pb-2 border-b border-wink-gray-100">Identity Details</h4>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-wink-gray-500">Display Name</label>
                                        <input
                                            type="text"
                                            value={pageName}
                                            onChange={(e) => setPageName(e.target.value)}
                                            className="w-full bg-wink-gray-50 border border-wink-gray-100 rounded-xl p-4 text-sm font-bold focus:border-wink-black outline-none transition-all"
                                            placeholder="Brand or Page Name"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-wink-gray-500">Access Token (Update)</label>
                                        <input
                                            type="password"
                                            value={pageToken}
                                            onChange={(e) => setPageToken(e.target.value)}
                                            placeholder="Paste new token only if current expired..."
                                            className="w-full bg-wink-gray-50 border border-wink-gray-100 rounded-xl p-4 text-xs font-mono focus:border-wink-black outline-none transition-all"
                                        />
                                        <div className="flex items-start space-x-2 p-3 bg-wink-gray-50 rounded-lg border border-dashed border-wink-gray-200">
                                            <AlertCircle size={14} className="text-wink-gray-400 mt-0.5 flex-shrink-0" />
                                            <p className="text-[10px] font-medium text-wink-gray-400 leading-relaxed uppercase tracking-tighter">
                                                Meta tokens usually last 60 days. Update this field if your {page.platform} automation stops responding.
                                            </p>
                                        </div>
                                    </div>
                                </section>
                            </div>
                        )}

                        {activeTab === 'ai' && (
                            <div className="space-y-8">
                                <section className="space-y-6">
                                    <div className="flex items-center justify-between pb-2 border-b border-wink-gray-100">
                                        <h4 className="text-xs font-black uppercase tracking-[0.2em] text-wink-gray-400">Behavioral Engine</h4>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input 
                                                type="checkbox" 
                                                checked={aiEnabled} 
                                                onChange={(e) => setAiEnabled(e.target.checked)}
                                                className="sr-only peer"
                                            />
                                            <div className="w-11 h-6 bg-wink-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-wink-black"></div>
                                        </label>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center">
                                            <label className="text-[10px] font-black uppercase text-wink-gray-500">System Instructions</label>
                                            <span className="bg-wink-black text-wink-white text-[8px] px-1.5 py-0.5 rounded font-black tracking-widest uppercase">Prompt</span>
                                        </div>
                                        <textarea
                                            value={aiInstructions}
                                            onChange={(e) => setAiInstructions(e.target.value)}
                                            placeholder="e.g. You are a professional sales agent for HOFF. Be polite, concise, and always offer help with orders..."
                                            className="w-full bg-wink-gray-50 border border-wink-gray-100 rounded-xl p-4 text-sm font-medium focus:border-wink-black outline-none transition-all min-h-[150px] resize-none"
                                        />
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center mb-1">
                                            <label className="text-[10px] font-black uppercase text-wink-gray-500">Conversation Depth</label>
                                            <span className="text-xs font-black text-wink-black">{aiContextLimit} messages</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="1"
                                            max="15"
                                            value={aiContextLimit}
                                            onChange={(e) => setAiContextLimit(parseInt(e.target.value))}
                                            className="w-full h-1.5 bg-wink-gray-100 rounded-lg appearance-none cursor-pointer accent-wink-black"
                                        />
                                        <p className="text-[10px] font-bold text-wink-gray-400 uppercase tracking-tighter">Amount of previous messages the AI analyzes to maintain context.</p>
                                    </div>
                                </section>
                            </div>
                        )}

                        {activeTab === 'knowledge' && (
                            <div className="space-y-8">
                                <section className="space-y-6">
                                    <h4 className="text-xs font-black uppercase tracking-[0.2em] text-wink-gray-400 pb-2 border-b border-wink-gray-100">RAG Knowledge Base</h4>
                                    
                                    <div className="bg-wink-gray-50 border border-wink-gray-200 rounded-2xl p-6">
                                        <div className="flex items-center space-x-3 text-wink-black mb-4">
                                            <Upload size={18} />
                                            <h5 className="text-[10px] font-black uppercase tracking-widest">Excel Inventory Upload</h5>
                                        </div>
                                        <p className="text-xs text-wink-gray-500 mb-4 font-medium leading-relaxed">
                                            Upload your product catalog. Our system will automatically tokenize and embed your inventory for instant AI retrieval.
                                        </p>
                                        <div className="flex items-center space-x-2">
                                            <input 
                                                type="file" 
                                                accept=".xlsx, .xls, .csv"
                                                onChange={(e) => setExcelFile(e.target.files[0])}
                                                className="flex-1 text-xs text-wink-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-[10px] file:font-black file:uppercase file:tracking-widest file:bg-wink-black file:text-wink-white file:cursor-pointer hover:file:opacity-80"
                                            />
                                            <button 
                                                onClick={handleExcelUpload}
                                                disabled={!excelFile || isUploadingExcel}
                                                className="px-6 py-2 bg-wink-black text-wink-white rounded-full text-[10px] font-black uppercase tracking-widest hover:opacity-80 transition-all disabled:opacity-20"
                                            >
                                                {isUploadingExcel ? <Loader2 size={12} className="animate-spin" /> : 'Process'}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-wink-gray-500">Unstructured Knowledge</label>
                                        <textarea
                                            value={knowledgeBase}
                                            onChange={(e) => setKnowledgeBase(e.target.value)}
                                            placeholder="Paste pricing, shipping rules, FAQs, or any business details here..."
                                            className="w-full bg-wink-gray-50 border border-wink-gray-100 rounded-xl p-4 text-sm font-medium focus:border-wink-black outline-none transition-all min-h-[200px]"
                                        />
                                    </div>
                                </section>
                            </div>
                        )}
                    </main>
                </div>

                {/* Footer Actions */}
                <div className="p-6 border-t border-wink-gray-100 bg-wink-gray-50/50 flex items-center justify-between">
                    <button 
                        onClick={onClose}
                        className="text-[10px] font-black uppercase tracking-[0.2em] text-wink-gray-400 hover:text-wink-black transition-all"
                    >
                        Discard Changes
                    </button>
                    <button 
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex items-center space-x-3 bg-wink-black text-wink-white px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-wink-gray-800 transition-all shadow-xl disabled:opacity-50"
                    >
                        {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        <span>Synchronize Settings</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PageSettingsModal;
