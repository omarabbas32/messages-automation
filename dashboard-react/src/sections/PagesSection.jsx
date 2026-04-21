import { useState, useEffect, useCallback } from 'react';
import ModernPageCard from '../components/PageCard/ModernPageCard';
import { Globe, Share2, Keyboard, LayoutGrid, Plus, X, CheckSquare, Square, Search, Loader2 } from 'lucide-react';

function PagesSection({ pages, onAddPage, onBulkConnect, onGetFBAuthUrl, onGetIGAuthUrl, onDeletePage, onUpdateAI, onUpdateKnowledge, onUpdatePage, onUploadInventory }) {
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isOAuthLoading, setIsOAuthLoading] = useState(false);
    const [discoveredPages, setDiscoveredPages] = useState([]);
    const [selectedPageIds, setSelectedPageIds] = useState([]);
    const [formData, setFormData] = useState({
        page_id: '',
        page_token: '',
        page_name: ''
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        onAddPage(formData);
        setFormData({ page_id: '', page_token: '', page_name: '' });
        setIsFormOpen(false);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleConnectFB = async () => {
        try {
            setIsOAuthLoading(true);
            const authUrl = await onGetFBAuthUrl();
            if (authUrl) {
                const width = 600, height = 700;
                const left = window.screen.width / 2 - width / 2;
                const top = window.screen.height / 2 - height / 2;
                window.open(authUrl, 'facebook-login', `width=${width},height=${height},left=${left},top=${top}`);
            }
        } catch (error) {
            console.error('FB Auth Error:', error);
        } finally {
            setIsOAuthLoading(false);
        }
    };

    const handleConnectIG = async () => {
        try {
            setIsOAuthLoading(true);
            const authUrl = await onGetIGAuthUrl();
            if (authUrl) {
                const width = 600, height = 700;
                const left = window.screen.width / 2 - width / 2;
                const top = window.screen.height / 2 - height / 2;
                window.open(authUrl, 'instagram-login', `width=${width},height=${height},left=${left},top=${top}`);
            }
        } catch (error) {
            console.error('IG Auth Error:', error);
        } finally {
            setIsOAuthLoading(false);
        }
    };

    const handleMessage = useCallback((event) => {
        const trustedOrigins = [window.location.origin, 'https://ads.winkadvertising.net', 'http://localhost:3000'];
        if (!trustedOrigins.includes(event.origin)) return;
        
        if (event.data?.type === 'FB_AUTH_SUCCESS' || event.data?.type === 'IG_AUTH_SUCCESS') {
            const fbPages = event.data.pages;
            const existingIds = pages.map(p => p.page_id);
            const newPages = fbPages.filter(p => !existingIds.includes(p.id));
            
            setDiscoveredPages(newPages);
            setSelectedPageIds(newPages.map(p => p.id));
            if (newPages.length === 0) {
                window.Swal.fire('Notice', 'All your accounts are already connected!', 'info');
            }
        }
    }, [pages]);

    useEffect(() => {
        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [handleMessage]);

    const handleImportSelected = async () => {
        const toImport = discoveredPages.filter(p => selectedPageIds.includes(p.id));
        if (toImport.length === 0) return;
        const success = await onBulkConnect(toImport);
        if (success) {
            setDiscoveredPages([]);
            setSelectedPageIds([]);
        }
    };

    const togglePageSelection = (id) => {
        setSelectedPageIds(prev => 
            prev.includes(id) ? prev.filter(pid => pid !== id) : [...prev, id]
        );
    };

    return (
        <section className="animate-slide-in-top delay-100">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
                <div>
                    <div className="flex items-center space-x-3 mb-2">
                        <LayoutGrid size={24} className="text-wink-black" />
                        <h2 className="text-2xl font-black tracking-tight text-wink-black uppercase">Your Pages</h2>
                    </div>
                    <p className="text-wink-gray-400 font-medium">Manage and automate your social identities.</p>
                </div>

                <div className="flex flex-wrap gap-3">
                    <button
                        onClick={handleConnectFB}
                        disabled={isOAuthLoading}
                        className="flex items-center space-x-2 bg-wink-black text-wink-white px-5 py-2.5 rounded-lg font-bold text-sm uppercase tracking-tight hover:bg-wink-gray-800 transition-all disabled:opacity-50"
                    >
                        {isOAuthLoading ? <Loader2 size={16} className="animate-spin" /> : <Facebook size={16} />}
                        <span>Connect FB</span>
                    </button>
                    <button
                        onClick={handleConnectIG}
                        disabled={isOAuthLoading}
                        className="flex items-center space-x-2 bg-wink-black text-wink-white px-5 py-2.5 rounded-lg font-bold text-sm uppercase tracking-tight hover:bg-wink-gray-800 transition-all disabled:opacity-50"
                    >
                        {isOAuthLoading ? <Loader2 size={16} className="animate-spin" /> : <Instagram size={16} />}
                        <span>Connect IG</span>
                    </button>
                    <button
                        onClick={() => setIsFormOpen(!isFormOpen)}
                        className="flex items-center space-x-2 border border-wink-gray-200 text-wink-black px-5 py-2.5 rounded-lg font-bold text-sm uppercase tracking-tight hover:bg-wink-gray-100 transition-all"
                    >
                        <Keyboard size={16} />
                        <span>Manual Add</span>
                    </button>
                </div>
            </div>

            {/* Discovery Modal */}
            {discoveredPages.length > 0 && (
                <div className="fixed inset-0 bg-wink-black/40 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                    <div className="bg-wink-white w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden animate-pop-in border border-wink-gray-200">
                        <div className="p-6 border-b border-wink-gray-100 flex items-center justify-between">
                            <h3 className="text-xl font-black text-wink-black uppercase tracking-tight">Select Pages</h3>
                            <button onClick={() => setDiscoveredPages([])} className="text-wink-gray-400 hover:text-wink-black">
                                <X size={24} />
                            </button>
                        </div>
                        <div className="max-h-[400px] overflow-y-auto p-4 space-y-2">
                             {discoveredPages.map(page => (
                                <div 
                                    key={page.id} 
                                    onClick={() => togglePageSelection(page.id)}
                                    className={`flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer ${
                                        selectedPageIds.includes(page.id) 
                                            ? 'border-wink-black bg-wink-black/5' 
                                            : 'border-wink-gray-100 hover:border-wink-gray-300 bg-wink-gray-50'
                                    }`}
                                >
                                    <div className="flex items-center space-x-4">
                                        <div className={selectedPageIds.includes(page.id) ? 'text-wink-black' : 'text-wink-gray-300'}>
                                            {selectedPageIds.includes(page.id) ? <CheckSquare size={20} /> : <Square size={20} />}
                                        </div>
                                        <div>
                                            <p className="font-bold text-wink-black">{page.name}</p>
                                            <p className="text-xs text-wink-gray-400 font-mono tracking-tighter uppercase">{page.platform || 'facebook'} • {page.id}</p>
                                        </div>
                                    </div>
                                    {page.platform === 'instagram' ? <Share2 size={18} /> : <Globe size={18} />}
                                </div>
                             ))}
                        </div>
                        <div className="p-6 border-t border-wink-gray-100 flex items-center justify-between bg-wink-gray-50/50">
                            <button onClick={() => setDiscoveredPages([])} className="text-sm font-bold text-wink-gray-500 hover:text-wink-black uppercase tracking-widest">Cancel</button>
                            <button 
                                onClick={handleImportSelected}
                                disabled={selectedPageIds.length === 0}
                                className="bg-wink-black text-wink-white px-8 py-3 rounded-lg font-black uppercase text-sm tracking-widest hover:bg-wink-gray-800 transition-all disabled:opacity-20"
                            >
                                Import {selectedPageIds.length} Identity
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Manual Form */}
            {isFormOpen && (
                <div className="bg-wink-white border border-wink-black p-8 rounded-2xl mb-12 animate-pop-in shadow-xl">
                    <div className="flex items-center justify-between mb-8">
                        <h3 className="text-xl font-black text-wink-black uppercase tracking-tighter">Add Page Manually</h3>
                        <X className="cursor-pointer text-wink-gray-400 hover:text-wink-black" onClick={() => setIsFormOpen(false)} />
                    </div>
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-wink-gray-400">Page ID / IG ID</label>
                            <input
                                type="text"
                                name="page_id"
                                value={formData.page_id}
                                onChange={handleChange}
                                required
                                placeholder="123456789..."
                                className="w-full bg-wink-gray-50 border border-wink-gray-100 rounded-lg p-3 text-sm font-bold focus:border-wink-black outline-none transition-all"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-wink-gray-400">Full Name</label>
                            <input
                                type="text"
                                name="page_name"
                                value={formData.page_name}
                                onChange={handleChange}
                                required
                                placeholder="Wink Online Store"
                                className="w-full bg-wink-gray-50 border border-wink-gray-100 rounded-lg p-3 text-sm font-bold focus:border-wink-black outline-none transition-all"
                            />
                        </div>
                        <div className="md:col-span-2 space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-wink-gray-400">Access Token</label>
                            <input
                                type="text"
                                name="page_token"
                                value={formData.page_token}
                                onChange={handleChange}
                                required
                                placeholder="EAAG..."
                                className="w-full bg-wink-gray-50 border border-wink-gray-100 rounded-lg p-3 text-sm font-mono text-xs focus:border-wink-black outline-none transition-all"
                            />
                        </div>
                        <div className="md:col-span-2 pt-4 flex space-x-4">
                            <button type="submit" className="flex-1 bg-wink-black text-wink-white py-4 rounded-xl font-black uppercase tracking-widest hover:bg-wink-gray-800 shadow-lg transition-all">Save Identity</button>
                            <button type="button" onClick={() => setIsFormOpen(false)} className="px-6 py-4 rounded-xl border border-wink-gray-200 font-bold uppercase text-sm tracking-widest">Cancel</button>
                        </div>
                    </form>
                </div>
            )}

            {/* Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {pages.length === 0 ? (
                    <div className="col-span-full py-20 flex flex-col items-center justify-center border-2 border-dashed border-wink-gray-200 rounded-3xl opacity-50 bg-wink-gray-50/50">
                        <Search size={48} className="text-wink-gray-300 mb-4" />
                        <p className="font-bold text-wink-gray-400">Connect an account to start automating.</p>
                    </div>
                ) : (
                    pages.map(page => (
                        <ModernPageCard
                            key={page.id}
                            page={page}
                            onDeletePage={onDeletePage}
                            onUpdateAI={onUpdateAI}
                            onEdit={() => {}} // We'll handle this later
                        />
                    ))
                )}
            </div>
        </section>
    );
}

export default PagesSection;
