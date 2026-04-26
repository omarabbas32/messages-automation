import { Trash2, Pencil, Calendar, Hash, Image as ImageIcon, MessageSquare, MessageCircle } from 'lucide-react';

const SCOPE_BADGE = {
    message: { label: 'DM', icon: MessageSquare, cls: 'bg-wink-gray-100 text-wink-gray-500' },
    comment: { label: 'Comment', icon: MessageCircle, cls: 'bg-blue-50 text-blue-700' },
    both:    { label: 'Both', icon: MessageCircle, cls: 'bg-emerald-50 text-emerald-700' }
};

function RulesTable({ rules, onDeleteRule, onEditRule, editingRuleId }) {
    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    if (rules.length === 0) {
        return (
            <div className="bg-wink-white border border-wink-gray-200 rounded-2xl p-10 text-center">
                <div className="w-12 h-12 bg-wink-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Hash size={20} className="text-wink-gray-300" />
                </div>
                <p className="text-wink-gray-400 font-medium">No rules defined for this identity.</p>
            </div>
        );
    }

    return (
        <div className="bg-wink-white border border-wink-gray-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-wink-gray-50 border-b border-wink-gray-100">
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-wink-gray-400">Trigger</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-wink-gray-400">Automated Response</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-wink-gray-400">Created</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-wink-gray-400 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-wink-gray-50">
                        {rules.map((rule) => {
                            const images = rule.image_urls || [];
                            const isEditing = editingRuleId === rule.id;
                            return (
                                <tr key={rule.id} className={`hover:bg-wink-gray-50/50 transition-all group ${isEditing ? 'bg-blue-50/50 ring-1 ring-blue-200' : ''}`}>
                                    <td className="px-6 py-5">
                                        <div className="flex items-center flex-wrap gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-wink-black animate-pulse"></div>
                                            <span className="font-bold text-wink-black uppercase text-xs tracking-tighter bg-wink-gray-100 px-2 py-0.5 rounded">
                                                {rule.keyword}
                                            </span>
                                            {(() => {
                                                const badge = SCOPE_BADGE[rule.scope] || SCOPE_BADGE.message;
                                                const Icon = badge.icon;
                                                return (
                                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tight ${badge.cls}`}>
                                                        <Icon size={10} />
                                                        {badge.label}
                                                    </span>
                                                );
                                            })()}
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex flex-col space-y-2">
                                            <p className="text-xs font-medium text-wink-gray-600 line-clamp-2 max-w-sm">
                                                {rule.reply}
                                            </p>
                                            {images.length > 0 && (
                                                <div className="flex items-center space-x-1.5">
                                                    {images.map((url, i) => (
                                                        <div key={i} className="w-8 h-8 rounded bg-wink-gray-100 overflow-hidden border border-wink-gray-200 flex-shrink-0">
                                                            <img src={url} alt={`Image ${i + 1}`} className="w-full h-full object-cover" />
                                                        </div>
                                                    ))}
                                                    <span className="text-[10px] text-wink-gray-400 font-bold uppercase">
                                                        {images.length} {images.length === 1 ? 'image' : 'images'}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex items-center space-x-2 text-wink-gray-400">
                                            <Calendar size={12} />
                                            <span className="text-[10px] font-bold uppercase">{formatDate(rule.created_at)}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5 text-right">
                                        <div className="flex items-center justify-end space-x-1">
                                            <button
                                                onClick={() => onEditRule(rule)}
                                                className={`p-2 rounded-lg transition-all ${isEditing ? 'text-blue-600 bg-blue-100' : 'text-wink-gray-300 hover:text-wink-black hover:bg-wink-gray-100'}`}
                                            >
                                                <Pencil size={16} />
                                            </button>
                                            <button
                                                onClick={() => onDeleteRule(rule.id, rule.keyword)}
                                                className="p-2 text-wink-gray-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default RulesTable;
