import { useState } from 'react';
import RulesTable from '../components/RulesTable/RulesTable';
import './RulesSection.css';

function RulesSection({ pages, rules, selectedPageId, onSelectPage, onAddRule, onDeleteRule }) {
    const [formData, setFormData] = useState({
        keyword: '',
        reply: ''
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!selectedPageId) return;
        onAddRule({ ...formData, page_id: selectedPageId });
        setFormData({ keyword: '', reply: '' });
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    return (
        <section className="section">
            <div className="section-header">
                <h2 className="section-title">
                    <span className="section-icon"><i className="fa-solid fa-gears"></i></span>
                    Automation Rules
                </h2>
            </div>

            <div className="page-selector-card">
                <label htmlFor="pageSelector">Select Page:</label>
                <select
                    id="pageSelector"
                    className="form-select"
                    value={selectedPageId || ''}
                    onChange={(e) => onSelectPage(e.target.value)}
                >
                    <option value="">-- Choose a page --</option>
                    {pages.map(page => (
                        <option key={page.page_id} value={page.page_id}>
                            {page.page_name} ({page.page_id})
                        </option>
                    ))}
                </select>
            </div>

            {selectedPageId && (
                <div className="rules-section-content animate-fade-in">
                    <div className="form-card">
                        <h3 className="form-title">Add New Rule</h3>
                        <form onSubmit={handleSubmit}>
                            <div className="form-row">
                                <div className="form-group">
                                    <label htmlFor="keyword">Keyword</label>
                                    <input
                                        type="text"
                                        id="keyword"
                                        name="keyword"
                                        value={formData.keyword}
                                        onChange={handleChange}
                                        required
                                        placeholder="Ex: price, product, service"
                                        className="form-input"
                                    />
                                </div>

                                <div className="form-group">
                                    <label htmlFor="reply">Auto Reply</label>
                                    <textarea
                                        id="reply"
                                        name="reply"
                                        value={formData.reply}
                                        onChange={handleChange}
                                        required
                                        placeholder="Ex: The price is $50. Contact us for details..."
                                        className="form-textarea"
                                        rows="3"
                                    />
                                </div>
                            </div>

                            <div className="form-actions">
                                <button type="submit" className="btn btn-primary">
                                    Add Rule
                                </button>
                            </div>
                        </form>
                    </div>

                    <RulesTable rules={rules} onDeleteRule={onDeleteRule} />
                </div>
            )}
        </section>
    );
}

export default RulesSection;
