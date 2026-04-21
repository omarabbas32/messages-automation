import { useState, useEffect, useCallback } from 'react';
import PageCard from '../components/PageCard/PageCard';
import './PagesSection.css';

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
            } else {
                window.Swal.fire('Error', 'Failed to generate Facebook login link', 'error');
            }
        } catch (error) {
            console.error('FB Auth Error:', error);
            window.Swal.fire('Error', 'Could not initiate Facebook Login', 'error');
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
            } else {
                window.Swal.fire('Error', 'Failed to generate Instagram login link', 'error');
            }
        } catch (error) {
            console.error('IG Auth Error:', error);
            window.Swal.fire('Error', 'Could not initiate Instagram Login', 'error');
        } finally {
            setIsOAuthLoading(false);
        }
    };

    const handleMessage = useCallback((event) => {
        // Allow messages from our known trusted domains (ngrok backend or same localhost)
        const trustedOrigins = [
            window.location.origin,
            'https://unodious-madonna-propretorial.ngrok-free.dev',
            'http://localhost:3000'
        ];
        
        if (!trustedOrigins.includes(event.origin)) return;
        
        if (event.data?.type === 'FB_AUTH_SUCCESS' || event.data?.type === 'IG_AUTH_SUCCESS') {
            console.log(`✅ ${event.data.type} received:`, event.data.pages);
            const fbPages = event.data.pages;
            // Filter out pages already added
            const existingIds = pages.map(p => p.page_id);
            const newPages = fbPages.filter(p => !existingIds.includes(p.id));
            
            setDiscoveredPages(newPages);
            setSelectedPageIds(newPages.map(p => p.id)); // Select all by default
            
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
        <section className="section">
            <div className="section-header">
                <div className="header-left">
                    <h2 className="section-title">
                        <span className="section-icon"><i className="fa-regular fa-file-lines"></i></span>
                        Facebook Pages
                    </h2>
                </div>
                <div className="header-actions">
                    <button
                        className="btn btn-facebook"
                        onClick={handleConnectFB}
                        disabled={isOAuthLoading}
                    >
                        {isOAuthLoading ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-brands fa-facebook"></i>}
                        Connect FB
                    </button>
                    <button
                        className="btn btn-instagram"
                        onClick={handleConnectIG}
                        disabled={isOAuthLoading}
                    >
                        {isOAuthLoading ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-brands fa-instagram"></i>}
                        Connect IG
                    </button>
                    <button
                        className="btn btn-outline"
                        onClick={() => setIsFormOpen(!isFormOpen)}
                    >
                        <i className="fa-solid fa-keyboard"></i> Manual Add
                    </button>
                </div>
            </div>

            {discoveredPages.length > 0 && (
                <div className="discovery-modal-overlay">
                    <div className="discovery-modal animate-pop-in">
                        <div className="modal-header">
                            <h3>Select Pages to Automate</h3>
                            <button className="close-modal" onClick={() => setDiscoveredPages([])}>&times;</button>
                        </div>
                        <div className="discovered-pages-list">
                            {discoveredPages.map(page => (
                                <div 
                                    key={page.id} 
                                    className={`discovered-page-item ${selectedPageIds.includes(page.id) ? 'selected' : ''}`}
                                    onClick={() => togglePageSelection(page.id)}
                                >
                                    <div className="page-check">
                                        <i className={`fa-solid ${selectedPageIds.includes(page.id) ? 'fa-square-check' : 'fa-square'}`}></i>
                                        {page.platform === 'instagram' && <i className="fa-brands fa-instagram ml-2" style={{ color: '#E1306C' }}></i>}
                                        {(!page.platform || page.platform === 'facebook') && <i className="fa-brands fa-facebook ml-2" style={{ color: '#1877F2' }}></i>}
                                    </div>
                                    <div className="page-info-row">
                                        <span className="page-name">{page.name}</span>
                                        <span className="page-id">{page.platform === 'instagram' ? 'IG ID' : 'Page ID'}: {page.id}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setDiscoveredPages([])}>Cancel</button>
                            <button 
                                className="btn btn-primary" 
                                onClick={handleImportSelected}
                                disabled={selectedPageIds.length === 0}
                            >
                                Import {selectedPageIds.length} Pages
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isFormOpen && (
                <div className="form-card animate-slide-down">
                    <h3 className="form-title">Add New Page</h3>
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label htmlFor="page_id">Page ID</label>
                            <input
                                type="text"
                                id="page_id"
                                name="page_id"
                                value={formData.page_id}
                                onChange={handleChange}
                                required
                                placeholder="Ex: 123456789012345"
                                className="form-input"
                            />
                            <small className="form-hint">You can find this in your Page Settings</small>
                        </div>

                        <div className="form-group">
                            <label htmlFor="page_token">Page Access Token</label>
                            <input
                                type="text"
                                id="page_token"
                                name="page_token"
                                value={formData.page_token}
                                onChange={handleChange}
                                required
                                placeholder="EAAG..."
                                className="form-input"
                            />
                            <small className="form-hint">Token from Facebook Developers Dashboard</small>
                        </div>

                        <div className="form-group">
                            <label htmlFor="page_name">Page Name</label>
                            <input
                                type="text"
                                id="page_name"
                                name="page_name"
                                value={formData.page_name}
                                onChange={handleChange}
                                required
                                placeholder="Ex: My Online Store"
                                className="form-input"
                            />
                        </div>

                        <div className="form-actions">
                            <button type="submit" className="btn btn-primary">Save Page</button>
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => setIsFormOpen(false)}
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="pages-grid">
                {pages.length === 0 ? (
                    <div className="empty-state">
                        <span className="empty-icon"><i className="fa-regular fa-folder-open"></i></span>
                        <p>No pages added yet. Add a new page to get started!</p>
                    </div>
                ) : (
                    pages.map(page => (
                        <PageCard
                            key={page.id}
                            page={page}
                            onDelete={onDeletePage}
                            onUpdateAI={onUpdateAI}
                            onUpdateKnowledge={onUpdateKnowledge}
                            onUpdatePage={onUpdatePage}
                            onUploadInventory={onUploadInventory}
                        />
                    ))
                )}
            </div>
        </section>
    );
}

export default PagesSection;
