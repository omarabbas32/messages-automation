import { Trash2, Calendar, Hash, Zap } from 'lucide-react';

function RulesTable({ rules, onDeleteRule }) {
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
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-wink-gray-400 text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-wink-gray-50">
                        {rules.map((rule) => (
                            <tr key={rule.id} className="hover:bg-wink-gray-50/50 transition-all group">
                                <td className="px-6 py-5">
                                    <div className="flex items-center space-x-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-wink-black animate-pulse"></div>
                                        <span className="font-bold text-wink-black uppercase text-xs tracking-tighter bg-wink-gray-100 px-2 py-0.5 rounded">
                                            {rule.keyword}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-6 py-5">
                                    <div className="flex flex-col space-y-2">
                                        <p className="text-xs font-medium text-wink-gray-600 line-clamp-2 max-w-sm">
                                            {rule.reply}
                                        </p>
                                        {rule.image_url && (
                                            <div className="flex items-center space-x-2">
                                                <div className="w-8 h-8 rounded bg-wink-gray-100 overflow-hidden border border-wink-gray-200">
                                                    <img src={rule.image_url} alt="Reply" className="w-full h-full object-cover" />
                                                </div>
                                                <span className="text-[10px] text-wink-gray-400 font-bold uppercase">Image Attached</span>
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
                                    <button
                                        onClick={() => onDeleteRule(rule.id, rule.keyword)}
                                        className="p-2 text-wink-gray-300 hover:text-wink-black hover:bg-wink-gray-100 rounded-lg transition-all"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default RulesTable;
