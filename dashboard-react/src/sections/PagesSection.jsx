import { useState } from 'react';
import PageCard from '../components/PageCard/PageCard';
import './PagesSection.css';

function PagesSection({ pages, onAddPage, onDeletePage, onUpdateAI, onUpdateKnowledge, onUpdatePage }) {
    const [isFormOpen, setIsFormOpen] = useState(false);
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

    return (
        <section className="section">
            <div className="section-header">
                <h2 className="section-title">
                    <span className="section-icon"><i className="fa-regular fa-file-lines"></i></span>
                    Facebook Pages
                </h2>
                <button
                    className="btn btn-primary"
                    onClick={() => setIsFormOpen(!isFormOpen)}
                >
                    <span><i className="fa-solid fa-plus"></i></span> Add New Page
                </button>
            </div>

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
                        />
                    ))
                )}
            </div>
        </section>
    );
}

export default PagesSection;
