import { useState } from 'react';
import RulesTable from '../components/RulesTable/RulesTable';
import { Settings2, Plus, Save, X, MessageSquare, Target, Globe, Share2, Image as ImageIcon } from 'lucide-react';

function RulesSection({ pages, rules, selectedPageId, onSelectPage, onAddRule, onDeleteRule, onUpdateRule, onUploadImage }) {
    const [formData, setFormData] = useState({
        keyword: '',
        reply: '',
        image_urls: []
    });
    const [editingRule, setEditingRule] = useState(null);
    const [uploading, setUploading] = useState(false);

    const resetForm = () => {
        setFormData({ keyword: '', reply: '', image_urls: [] });
        setEditingRule(null);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!selectedPageId) return;
        if (editingRule) {
            onUpdateRule(editingRule.id, {
                keyword: formData.keyword,
                reply: formData.reply,
                image_urls: formData.image_urls
            });
        } else {
            onAddRule({
                keyword: formData.keyword,
                reply: formData.reply,
                image_urls: formData.image_urls,
                page_id: selectedPageId
            });
        }
        resetForm();
    };

    const handleEdit = (rule) => {
        setEditingRule(rule);
        setFormData({
            keyword: rule.keyword,
            reply: rule.reply,
            image_urls: rule.image_urls || []
        });
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const removeImage = (index) => {
        setFormData(prev => ({
            ...prev,
            image_urls: prev.image_urls.filter((_, i) => i !== index)
        }));
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setUploading(true);
        const url = await onUploadImage(file);
        if (url) {
            setFormData(prev => ({
                ...prev,
                image_urls: [...prev.image_urls, url]
            }));
        }
        setUploading(false);
        e.target.value = '';
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
                    {/* Add / Edit Rule Form */}
                    <div className={`lg:col-span-1 bg-wink-white border ${editingRule ? 'border-blue-500' : 'border-wink-black'} rounded-2xl p-8 shadow-xl`}>
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center space-x-3 text-wink-black">
                                {editingRule ? <Save size={20} /> : <Plus size={20} />}
                                <h3 className="font-black uppercase tracking-tighter">
                                    {editingRule ? 'Edit Rule' : 'Define New Rule'}
                                </h3>
                            </div>
                            {editingRule && (
                                <button onClick={resetForm} className="p-1.5 hover:bg-wink-gray-100 rounded-lg transition-all">
                                    <X size={16} className="text-wink-gray-400" />
                                </button>
                            )}
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
                                    <span>Images ({formData.image_urls.length})</span>
                                </div>

                                {/* Image previews */}
                                {formData.image_urls.length > 0 && (
                                    <div className="grid grid-cols-3 gap-2">
                                        {formData.image_urls.map((url, i) => (
                                            <div key={i} className="relative group aspect-square">
                                                <img src={url} alt={`Image ${i + 1}`} className="w-full h-full object-cover rounded-lg border border-wink-gray-100" />
                                                <button
                                                    type="button"
                                                    onClick={() => removeImage(i)}
                                                    className="absolute top-1 right-1 bg-wink-black text-wink-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Upload button */}
                                <label className={`flex flex-col items-center justify-center w-full h-20 border-2 border-dashed border-wink-gray-200 rounded-lg cursor-pointer hover:border-wink-black transition-all ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                                    <ImageIcon size={18} className="text-wink-gray-300 mb-1" />
                                    <span className="text-xs text-wink-gray-400 font-medium">
                                        {uploading ? 'Uploading...' : 'Click to add image'}
                                    </span>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={handleFileUpload}
                                    />
                                </label>
                            </div>

                            <button type="submit" className={`w-full py-4 rounded-xl font-black uppercase tracking-widest shadow-lg transition-all flex items-center justify-center space-x-2 ${
                                editingRule
                                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                                    : 'bg-wink-black text-wink-white hover:bg-wink-gray-800'
                            }`}>
                                {editingRule ? <Save size={18} /> : <Plus size={18} />}
                                <span>{editingRule ? 'Save Changes' : 'Add Rule'}</span>
                            </button>
                        </form>
                    </div>

                    {/* Rules Table Area */}
                    <div className="lg:col-span-2">
                        <RulesTable
                            rules={rules.filter(r => r.page_id === selectedPageId)}
                            onDeleteRule={onDeleteRule}
                            onEditRule={handleEdit}
                            editingRuleId={editingRule?.id}
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
