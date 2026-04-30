import { useState, useEffect, useCallback, useRef } from 'react';
import { Users, Download, Trash2, Phone, Mail, Globe, Share2, Filter, Calendar, RefreshCw, Search, ChevronLeft, ChevronRight } from 'lucide-react';

const STATUS_OPTIONS = [
    { value: 'new',        label: 'New',        cls: 'bg-blue-50 text-blue-700' },
    { value: 'contacted',  label: 'Contacted',  cls: 'bg-amber-50 text-amber-700' },
    { value: 'qualified',  label: 'Qualified',  cls: 'bg-emerald-50 text-emerald-700' },
    { value: 'closed',     label: 'Closed',     cls: 'bg-purple-50 text-purple-700' },
    { value: 'archived',   label: 'Archived',   cls: 'bg-wink-gray-100 text-wink-gray-500' }
];

const PER_PAGE = 50;

function formatDate(s) {
    if (!s) return '—';
    return new Date(s).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function datesAreSameDay(a, b) {
    if (!a || !b) return false;
    const da = new Date(a), db = new Date(b);
    return da.toDateString() === db.toDateString();
}

function LeadsSection({ pages, apiFetch, getToken }) {
    const [leads, setLeads]               = useState([]);
    const [total, setTotal]               = useState(0);
    const [page, setPage]                 = useState(1);
    const [pageFilter, setPageFilter]     = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [search, setSearch]             = useState('');
    const [searchInput, setSearchInput]   = useState('');
    const [isLoading, setIsLoading]       = useState(false);
    const debounceRef                     = useRef(null);

    const loadLeads = useCallback(async (targetPage = page) => {
        try {
            setIsLoading(true);
            const params = [`page=${targetPage}`, `per_page=${PER_PAGE}`];
            if (pageFilter !== 'all')   params.push(`page_id=${encodeURIComponent(pageFilter)}`);
            if (statusFilter !== 'all') params.push(`status=${encodeURIComponent(statusFilter)}`);
            if (search)                 params.push(`search=${encodeURIComponent(search)}`);
            const res = await apiFetch(`/api/leads?${params.join('&')}`);
            if (res.success) {
                setLeads(res.data || []);
                setTotal(res.total ?? 0);
            }
        } catch (err) {
            console.error('Failed to load leads:', err);
        } finally {
            setIsLoading(false);
        }
    }, [page, pageFilter, statusFilter, search, apiFetch]);

    useEffect(() => { loadLeads(); }, [loadLeads]);

    const handleFilterChange = (setter) => (e) => {
        setter(e.target.value);
        setPage(1);
    };

    const handleSearchInput = (e) => {
        setSearchInput(e.target.value);
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            setSearch(e.target.value);
            setPage(1);
        }, 350);
    };

    const handleStatusChange = async (id, newStatus) => {
        try {
            const res = await apiFetch(`/api/leads/${id}`, {
                method: 'PATCH',
                body: JSON.stringify({ status: newStatus })
            });
            if (res.success) {
                setLeads(prev => prev.map(l => l.id === id ? { ...l, status: newStatus } : l));
            }
        } catch (err) {
            window.Swal?.fire('Error', err.message, 'error');
        }
    };

    const handleDelete = (id) => {
        window.Swal?.fire({
            title: 'Delete this lead?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#000',
            confirmButtonText: 'Yes, delete'
        }).then(async (r) => {
            if (!r.isConfirmed) return;
            try {
                const res = await apiFetch(`/api/leads/${id}`, { method: 'DELETE' });
                if (res.success) {
                    setLeads(prev => prev.filter(l => l.id !== id));
                    setTotal(prev => prev - 1);
                }
            } catch (err) {
                window.Swal?.fire('Error', err.message, 'error');
            }
        });
    };

    const handleExportCsv = async () => {
        try {
            const params = pageFilter !== 'all' ? `?page_id=${encodeURIComponent(pageFilter)}` : '';
            const token = await getToken();
            const res = await fetch(`/api/leads/export.csv${params}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Export failed');
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `leads-${Date.now()}.csv`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        } catch (err) {
            window.Swal?.fire('Export failed', err.message, 'error');
        }
    };

    const totalPages  = Math.max(1, Math.ceil(total / PER_PAGE));
    const rangeStart  = total === 0 ? 0 : (page - 1) * PER_PAGE + 1;
    const rangeEnd    = Math.min(page * PER_PAGE, total);

    return (
        <section className="animate-slide-in-top">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
                <div>
                    <div className="flex items-center space-x-3 mb-2">
                        <Users size={24} className="text-wink-black" />
                        <h2 className="text-2xl font-black tracking-tight text-wink-black uppercase">Leads</h2>
                        <span className="text-xs font-bold uppercase tracking-tight bg-wink-black text-wink-white px-2.5 py-0.5 rounded">
                            {total}
                        </span>
                    </div>
                    <p className="text-wink-gray-400 font-medium">
                        Phone numbers and emails captured automatically from inbound messages.
                    </p>
                </div>

                <div className="flex flex-wrap gap-3">
                    <button
                        onClick={() => loadLeads(page)}
                        disabled={isLoading}
                        className="flex items-center space-x-2 border border-wink-gray-200 text-wink-black px-5 py-2.5 rounded-lg font-bold text-sm uppercase tracking-tight hover:bg-wink-gray-100 transition-all disabled:opacity-50"
                    >
                        <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
                        <span>Refresh</span>
                    </button>
                    <button
                        onClick={handleExportCsv}
                        disabled={total === 0}
                        className="flex items-center space-x-2 bg-wink-black text-wink-white px-5 py-2.5 rounded-lg font-bold text-sm uppercase tracking-tight hover:bg-wink-gray-800 transition-all disabled:opacity-30"
                    >
                        <Download size={16} />
                        <span>Export CSV</span>
                    </button>
                </div>
            </div>

            {/* Filters + Search */}
            <div className="bg-wink-white border border-wink-gray-200 rounded-2xl p-4 mb-8 flex flex-wrap items-center gap-3 shadow-sm">
                <div className="flex items-center space-x-2 px-2 text-[10px] font-bold uppercase tracking-[0.2em] text-wink-gray-400">
                    <Filter size={12} />
                    <span>Filter:</span>
                </div>

                <select
                    value={pageFilter}
                    onChange={handleFilterChange(setPageFilter)}
                    className="bg-wink-gray-50 border border-wink-gray-100 rounded-lg px-3 py-2 text-xs font-bold uppercase tracking-tight focus:border-wink-black outline-none"
                >
                    <option value="all">All Pages</option>
                    {pages.map(p => (
                        <option key={p.page_id} value={p.page_id}>{p.page_name}</option>
                    ))}
                </select>

                <select
                    value={statusFilter}
                    onChange={handleFilterChange(setStatusFilter)}
                    className="bg-wink-gray-50 border border-wink-gray-100 rounded-lg px-3 py-2 text-xs font-bold uppercase tracking-tight focus:border-wink-black outline-none"
                >
                    <option value="all">All Statuses</option>
                    {STATUS_OPTIONS.map(s => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                </select>

                <div className="flex items-center space-x-2 bg-wink-gray-50 border border-wink-gray-100 rounded-lg px-3 py-2 ml-auto min-w-[200px]">
                    <Search size={12} className="text-wink-gray-400 shrink-0" />
                    <input
                        type="text"
                        value={searchInput}
                        onChange={handleSearchInput}
                        placeholder="Name, phone, email…"
                        className="bg-transparent text-xs font-medium outline-none w-full placeholder:text-wink-gray-300"
                    />
                </div>
            </div>

            {/* Table */}
            {total === 0 && !isLoading ? (
                <div className="py-20 flex flex-col items-center justify-center border-2 border-dashed border-wink-gray-200 rounded-3xl opacity-60 bg-wink-gray-50/50">
                    <Users size={48} className="text-wink-gray-300 mb-4" />
                    <p className="font-bold text-wink-gray-400 text-center max-w-md">
                        {search || pageFilter !== 'all' || statusFilter !== 'all'
                            ? 'No leads match your filters.'
                            : 'No leads yet. Phone numbers and emails will appear here automatically as customers message you.'}
                    </p>
                </div>
            ) : (
                <>
                    <div className="bg-wink-white border border-wink-gray-200 rounded-2xl overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-wink-gray-50 border-b border-wink-gray-100">
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-wink-gray-400">Page</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-wink-gray-400">Contact</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-wink-gray-400">Context</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-wink-gray-400">Status</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-wink-gray-400">Dates</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-wink-gray-400 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-wink-gray-50">
                                    {isLoading
                                        ? Array.from({ length: 5 }).map((_, i) => (
                                            <tr key={i} className="animate-pulse">
                                                {Array.from({ length: 6 }).map((__, j) => (
                                                    <td key={j} className="px-6 py-5">
                                                        <div className="h-3 bg-wink-gray-100 rounded w-3/4" />
                                                    </td>
                                                ))}
                                            </tr>
                                        ))
                                        : leads.map(lead => {
                                            const isInstagram = (pages.find(p => p.page_id === lead.page_id)?.platform) === 'instagram';
                                            const showUpdated = !datesAreSameDay(lead.created_at, lead.updated_at);
                                            return (
                                                <tr key={lead.id} className="hover:bg-wink-gray-50/50 transition-all">
                                                    <td className="px-6 py-5">
                                                        <div className="flex items-center space-x-2">
                                                            {isInstagram ? <Share2 size={14} /> : <Globe size={14} />}
                                                            <span className="font-bold text-wink-black text-sm" dir="auto">
                                                                {lead.page_name || lead.page_id}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-5">
                                                        <div className="flex flex-col space-y-1">
                                                            {lead.name && (
                                                                <span className="font-bold text-wink-black text-sm" dir="auto">{lead.name}</span>
                                                            )}
                                                            {lead.phone && (
                                                                <a href={`tel:${lead.phone}`} className="flex items-center space-x-2 text-xs text-wink-gray-600 hover:text-wink-black">
                                                                    <Phone size={12} />
                                                                    <span className="font-mono">{lead.phone}</span>
                                                                </a>
                                                            )}
                                                            {lead.email && (
                                                                <a href={`mailto:${lead.email}`} className="flex items-center space-x-2 text-xs text-wink-gray-600 hover:text-wink-black">
                                                                    <Mail size={12} />
                                                                    <span>{lead.email}</span>
                                                                </a>
                                                            )}
                                                            <span className="text-[10px] text-wink-gray-300 font-mono uppercase">PSID {lead.sender_id}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-5">
                                                        <div className="max-w-xs">
                                                            <p className="text-xs text-wink-gray-500 line-clamp-2 italic" dir="auto">
                                                                {lead.notes || 'No context captured'}
                                                            </p>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-5">
                                                        <select
                                                            value={lead.status}
                                                            onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                                                            className={`text-[10px] font-black uppercase tracking-tight px-2.5 py-1 rounded border-0 outline-none cursor-pointer ${
                                                                STATUS_OPTIONS.find(s => s.value === lead.status)?.cls || 'bg-wink-gray-100'
                                                            }`}
                                                        >
                                                            {STATUS_OPTIONS.map(s => (
                                                                <option key={s.value} value={s.value}>{s.label}</option>
                                                            ))}
                                                        </select>
                                                    </td>
                                                    <td className="px-6 py-5">
                                                        <div className="flex flex-col space-y-1">
                                                            <div className="flex items-center space-x-1.5 text-wink-gray-400">
                                                                <Calendar size={11} />
                                                                <span className="text-[10px] font-bold uppercase">{formatDate(lead.created_at)}</span>
                                                            </div>
                                                            {showUpdated && (
                                                                <div className="flex items-center space-x-1.5 text-wink-gray-300">
                                                                    <RefreshCw size={10} />
                                                                    <span className="text-[10px] font-medium uppercase">{formatDate(lead.updated_at)}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-5 text-right">
                                                        <button
                                                            onClick={() => handleDelete(lead.id)}
                                                            className="p-2 text-wink-gray-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    }
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between mt-6">
                            <span className="text-xs font-medium text-wink-gray-400">
                                Showing {rangeStart}–{rangeEnd} of {total} leads
                            </span>
                            <div className="flex items-center space-x-2">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1 || isLoading}
                                    className="p-2 border border-wink-gray-200 rounded-lg hover:bg-wink-gray-100 transition-all disabled:opacity-30"
                                >
                                    <ChevronLeft size={16} />
                                </button>
                                <span className="text-xs font-bold text-wink-black px-3">
                                    {page} / {totalPages}
                                </span>
                                <button
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages || isLoading}
                                    className="p-2 border border-wink-gray-200 rounded-lg hover:bg-wink-gray-100 transition-all disabled:opacity-30"
                                >
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </section>
    );
}

export default LeadsSection;
