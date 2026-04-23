import { useState } from 'react';
import RulesTable from '../components/RulesTable/RulesTable';
import { Settings2, Plus, MessageSquare, Target, ChevronDown, Globe, Share2, Image as ImageIcon } from 'lucide-react';

function RulesSection({ pages, rules, selectedPageId, onSelectPage, onAddRule, onDeleteRule, onUploadImage }) {
    const [formData, setFormData] = useState({
        keyword: '',
        reply: '',
        image_url: ''
    });
    const [uploading, setUploading] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!selectedPageId) return;
        onAddRule({ ...formData, page_id: selectedPageId });
        setFormData({ keyword: '', reply: '', image_url: '' });
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    return (
        <section className="animate-slide-in-top delay-200 pb-20">
            {/* Header */}
            <div className="mb-10">
                <div className="flex items-center space-x-3 mb-2">
                    <Settings2 size={24} className="text-wink-black" />
                    <h2 className="text-2xl font-black tracking-tight text-wink-black uppercase">Automation Rules</h2>
                </div>
                <p className="text-wink-gray-400 font-medium">Fine-tune how your AI interacts with specific triggers.</p>
            </div>

            {/* Page Selector Strip */}
            <div className="bg-wink-white border border-wink-gray-200 rounded-2xl p-3 mb-12 flex flex-wrap gap-2 shadow-sm mt-8">
                 <div className="flex items-center px-4 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-wink-gray-400">
                    Active Scope:
                 </div>
                 <div className="flex flex-wrap gap-2">
                    {pages.length === 0 ? (
                        <div className="px-4 py-2 text-sm text-wink-gray-300 italic">No identities connected.</div>
                    ) : (
                        pages.map(page => (
                            <button
                                key={page.id}
                                onClick={() => onSelectPage(page.page_id)}
                                className={`flex items-center space-x-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-tight transition-all ${
                                    selectedPageId === page.page_id 
                                    ? 'bg-wink-black text-wink-white shadow-xl scale-105' 
                                    : 'bg-wink-gray-50 text-wink-gray-400 hover:bg-wink-gray-100 hover:text-wink-black'
                                }`}
                            >
                                {page.platform === 'instagram' ? <Share2 size={12} /> : <Globe size={12} />}
                                <span>{page.page_name}</span>
                            </button>
                        ))
                    )}
                 </div>
            </div>

            {selectedPageId ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-start">
                    {/* Add Rule Form */}
                    <div className="lg:col-span-1 bg-wink-white border border-wink-black rounded-2xl p-8 shadow-xl">
                        <div className="flex items-center space-x-3 mb-8 text-wink-black">
                            <Plus size={20} />
                            <h3 className="font-black uppercase tracking-tighter">Define New Rule</h3>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <div className="flex items-center space-x-2 text-[10px] font-black uppercase tracking-widest text-wink-gray-400">
                                    <Target size={12} />
                                    <span>Trigger Keyword</span>
                                </div>
                                <input
                                    type="text"
                                    name="keyword"
                                    value={formData.keyword}
                                    onChange={handleChange}
                                    required
                                    placeholder="e.g. price, menu, address"
                                    className="w-full bg-wink-gray-50 border border-wink-gray-100 rounded-lg p-3 text-sm font-bold focus:border-wink-black outline-none transition-all placeholder:font-normal"
                                />
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center space-x-2 text-[10px] font-black uppercase tracking-widest text-wink-gray-400">
                                    <MessageSquare size={12} />
                                    <span>Automated Reply</span>
                                </div>
                                <textarea
                                    name="reply"
                                    value={formData.reply}
                                    onChange={handleChange}
                                    required
                                    placeholder="Type the response here..."
                                    className="w-full bg-wink-gray-50 border border-wink-gray-100 rounded-lg p-3 text-sm font-bold focus:border-wink-black outline-none transition-all min-h-[120px] placeholder:font-normal"
                                />
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center space-x-2 text-[10px] font-black uppercase tracking-widest text-wink-gray-400">
                                    <ImageIcon size={12} />
                                    <span>Attach Image (Optional)</span>
                                </div>
                                {formData.image_url ? (
                                    <div className="relative group">
                                        <img src={formData.image_url} alt="Preview" className="w-full h-32 object-cover rounded-lg border border-wink-gray-100" />
                                        <button
                                            type="button"
                                            onClick={() => setFormData(prev => ({ ...prev, image_url: '' }))}
                                            className="absolute top-2 right-2 bg-wink-black text-wink-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ) : (
                                    <label className={`flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-wink-gray-200 rounded-lg cursor-pointer hover:border-wink-black transition-all ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                                        <ImageIcon size={20} className="text-wink-gray-300 mb-1" />
                                        <span className="text-xs text-wink-gray-400 font-medium">
                                            {uploading ? 'Uploading...' : 'Click to upload'}
                                        </span>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={async (e) => {
                                                const file = e.target.files[0];
                                                if (!file) return;
                                                setUploading(true);
                                                const url = await onUploadImage(file);
                                                if (url) setFormData(prev => ({ ...prev, image_url: url }));
                                                setUploading(false);
                                                e.target.value = '';
                                            }}
                                        />
                                    </label>
                                )}
                            </div>

                            <button type="submit" className="w-full bg-wink-black text-wink-white py-4 rounded-xl font-black uppercase tracking-widest hover:bg-wink-gray-800 shadow-lg transition-all flex items-center justify-center space-x-2">
                                <Plus size={18} />
                                <span>Add Rule</span>
                            </button>
                        </form>
                    </div>

                    {/* Rules Table Area */}
                    <div className="lg:col-span-2">
                        <RulesTable 
                            rules={rules.filter(r => r.page_id === selectedPageId)} 
                            onDeleteRule={onDeleteRule} 
                        />
                    </div>
                </div>
            ) : (
                <div className="py-20 flex flex-col items-center justify-center border-2 border-dashed border-wink-gray-200 rounded-3xl opacity-50 bg-wink-gray-50/50">
                    <Target size={48} className="text-wink-gray-300 mb-4" />
                    <p className="font-bold text-wink-gray-400">Select an identity above to manage its rules.</p>
                </div>
            )}
        </section>
    );
}

export default RulesSection;
