import { useState } from 'react';
import './PageCard.css';

function PageCard({ page, onDelete, onUpdateAI, onUpdateKnowledge, onUpdatePage, onUploadInventory }) {
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [pageName, setPageName] = useState(page.page_name || '');
    const [pageToken, setPageToken] = useState(''); // Token is sensitive, don't show existing one
    const [aiInstructions, setAiInstructions] = useState(page.ai_instructions || '');
    const [aiEnabled, setAiEnabled] = useState(page.ai_enabled !== false);
    const [aiContextLimit, setAiContextLimit] = useState(page.ai_context_limit || 5);
    const [knowledgeBase, setKnowledgeBase] = useState(page.knowledge_base || '');
    const [isSaving, setIsSaving] = useState(false);
    const [excelFile, setExcelFile] = useState(null);
    const [isUploadingExcel, setIsUploadingExcel] = useState(false);

    const handleFileChange = (e) => {
        setExcelFile(e.target.files[0]);
    };

    const handleExcelUpload = async () => {
        if (!excelFile) {
            window.Swal.fire('Notice', 'Please select an Excel file first.', 'info');
            return;
        }
        setIsUploadingExcel(true);
        try {
            const success = await onUploadInventory(page.id, excelFile);
            if (success) {
                setExcelFile(null);
                const fileInput = document.getElementById(`excel-upload-${page.id}`);
                if (fileInput) fileInput.value = '';
            }
        } catch (err) {
            console.error("Upload error:", err);
        } finally {
            setIsUploadingExcel(false);
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    const handleSaveSettings = async () => {
        setIsSaving(true);
        
        // 1. Update general page metadata (name, token if provided)
        const updateData = { page_name: pageName };
        if (pageToken.trim()) {
            updateData.page_token = pageToken.trim();
        }
        const successMeta = await onUpdatePage(page.id, updateData);

        // 2. Update AI settings
        const successAI = await onUpdateAI(page.id, {
            ai_enabled: aiEnabled,
            ai_instructions: aiInstructions,
            ai_context_limit: aiContextLimit
        });

        // 3. Update Knowledge Base
        const successKB = await onUpdateKnowledge(page.id, knowledgeBase);

        if (successMeta && successAI && successKB) {
            setIsSettingsOpen(false);
            setPageToken(''); // Clear token field after save
            window.Swal.fire({
                title: 'Settings Saved!',
                text: 'Page settings, AI and Knowledge Base updated successfully.',
                icon: 'success',
                confirmButtonColor: '#000000'
            });
        }
        setIsSaving(false);
    };

    return (
        <article className="page-card animate-slide-up">
            <div className="page-card-header">
                <h3 className="page-card-title">{page.page_name}</h3>
                <span className={`badge ${aiEnabled ? 'badge-active' : 'badge-inactive'}`}>
                    {aiEnabled ? 'AI Active' : 'AI Paused'}
                </span>
            </div>

            <div className="page-card-body">
                <div className="page-info">
                    <div className="page-info-item">
                        <span className="page-info-label">Page ID:</span>
                        <code className="page-info-value">{page.page_id}</code>
                    </div>
                    <div className="page-info-item">
                        <span className="page-info-label">Added on:</span>
                        <span className="page-info-value">{formatDate(page.created_at)}</span>
                    </div>
                </div>
            </div>

            {isSettingsOpen && (
                <div className="settings-overlay animate-fade-in">
                    <div className="settings-content">
                        <div className="settings-header">
                            <h4>Page & AI Configuration</h4>
                            <button className="close-btn" onClick={() => setIsSettingsOpen(false)}>×</button>
                        </div>

                        <div className="settings-section mb-4">
                            <h5 className="settings-subtitle">General Settings</h5>
                            <div className="form-group mb-2">
                                <label>Page Name</label>
                                <input 
                                    type="text"
                                    value={pageName}
                                    onChange={(e) => setPageName(e.target.value)}
                                    className="form-input"
                                    placeholder="Facebook Page Name"
                                />
                            </div>
                            <div className="form-group">
                                <label>New Page Access Token</label>
                                <input 
                                    type="password"
                                    value={pageToken}
                                    onChange={(e) => setPageToken(e.target.value)}
                                    className="form-input"
                                    placeholder="Paste new token here to update (EAAG...)"
                                />
                                <small className="form-hint">Leave blank to keep current token. Required if token expired.</small>
                            </div>
                        </div>

                        <div className="settings-section mb-4">
                            <h5 className="settings-subtitle">AI Assistant</h5>
                            <div className="form-group mb-2 mt-2">
                            <label className="toggle-label">
                                <span>Enable AI Assistant</span>
                                <input 
                                    type="checkbox" 
                                    checked={aiEnabled} 
                                    onChange={(e) => setAiEnabled(e.target.checked)}
                                />
                            </label>
                        </div>

                        <div className="form-group">
                            <label>AI Instructions (System Prompt)</label>
                            <textarea 
                                value={aiInstructions}
                                onChange={(e) => setAiInstructions(e.target.value)}
                                placeholder="How should the AI behave? (e.g. You are a helpful sales assistant...)"
                                rows="3"
                                className="form-textarea"
                            />
                        </div>

                        <div className="form-group mb-2">
                            <label>Context History (Messages)</label>
                            <input 
                                type="number"
                                min="1"
                                max="10"
                                value={aiContextLimit}
                                onChange={(e) => setAiContextLimit(parseInt(e.target.value) || 1)}
                                className="form-input"
                                style={{ width: '80px' }}
                            />
                            <small className="form-hint ml-2">How many previous messages should the AI remember? (Max: 10)</small>
                        </div>

                        <div className="form-group">
                            <label>Knowledge Base (Page Data)</label>
                            <textarea 
                                value={knowledgeBase}
                                onChange={(e) => setKnowledgeBase(e.target.value)}
                                placeholder="Paste your products, prices, FAQs, and business info here..."
                                rows="6"
                                className="form-textarea"
                            />
                             <small className="form-hint">The AI will use this info to answer specific questions.</small>
                         </div>

                         <div className="form-group pt-3 border-t mt-2">
                            <label className="flex items-center gap-2 font-bold mb-2">
                                <i className="fa-solid fa-file-excel text-green-600"></i>
                                Excel Product Inventory
                            </label>
                            <div className="flex gap-2">
                                <input 
                                    type="file" 
                                    id={`excel-upload-${page.id}`}
                                    accept=".xlsx, .xls, .csv"
                                    onChange={handleFileChange}
                                    className="form-input flex-1"
                                />
                                <button 
                                    className="btn btn-secondary btn-sm"
                                    onClick={handleExcelUpload}
                                    disabled={isUploadingExcel || !excelFile}
                                >
                                    {isUploadingExcel ? 'Processing...' : 'Upload'}
                                </button>
                            </div>
                            <small className="form-hint">AI will learn your product list from this file.</small>
                         </div>
                        </div>

                        <div className="settings-actions mt-4">
                            <button 
                                className="btn btn-primary btn-sm w-full" 
                                onClick={handleSaveSettings}
                                disabled={isSaving}
                            >
                                {isSaving ? 'Saving...' : 'Save All Settings'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="page-card-footer">
                <div className="footer-actions">
                    <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => setIsSettingsOpen(true)}
                    >
                        <i className="fa-solid fa-brain"></i> Knowledge Base
                    </button>
                    <button
                        className="btn btn-danger btn-sm"
                        onClick={() => onDelete(page.id, page.page_name)}
                    >
                        <i className="fa-solid fa-trash"></i>
                    </button>
                </div>
            </div>
        </article>
    );
}

export default PageCard;
