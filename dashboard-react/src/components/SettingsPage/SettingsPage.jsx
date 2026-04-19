import React, { useState, useEffect } from 'react';
import './SettingsPage.css';

const SettingsPage = ({ settings, onSave, onBack }) => {
    const [activeTab, setActiveTab] = useState('account');
    const [apiKey, setApiKey] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState({ text: '', type: '' });

    useEffect(() => {
        if (settings?.openai_api_key) {
            setApiKey(settings.openai_api_key);
        } else {
            setApiKey('');
        }
    }, [settings]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        setSaveMessage({ text: '', type: '' });
        
        const success = await onSave({ openai_api_key: apiKey });
        setIsSaving(false);
        
        if (success) {
            setSaveMessage({ text: 'Settings saved successfully!', type: 'success' });
            setTimeout(() => setSaveMessage({ text: '', type: '' }), 3000);
        } else {
            setSaveMessage({ text: 'Failed to save settings.', type: 'error' });
        }
    };

    const usagePercent = Math.min(100, ((settings?.ai_messages_used || 0) / (settings?.plan === 'pro' ? 1000 : 50)) * 100);

    return (
        <div className="settings-page-wrapper animate-fade-in">
            <div className="settings-page-header">
                <div className="header-left">
                    <button className="back-btn" onClick={onBack}>
                        <i className="fa-solid fa-arrow-left"></i>
                    </button>
                    <h1>Settings</h1>
                </div>
                {saveMessage.text && (
                    <div className={`save-status-toast ${saveMessage.type}`}>
                        <i className={`fa-solid ${saveMessage.type === 'success' ? 'fa-check-circle' : 'fa-circle-exclamation'}`}></i>
                        {saveMessage.text}
                    </div>
                )}
            </div>

            <div className="settings-page-container">
                <aside className="settings-sidebar">
                    <button 
                        className={`sidebar-tab ${activeTab === 'account' ? 'active' : ''}`}
                        onClick={() => setActiveTab('account')}
                    >
                        <i className="fa-solid fa-user-shield"></i>
                        <span>Account & API</span>
                    </button>
                    <button 
                        className={`sidebar-tab ${activeTab === 'usage' ? 'active' : ''}`}
                        onClick={() => setActiveTab('usage')}
                    >
                        <i className="fa-solid fa-chart-line"></i>
                        <span>Plan & Usage</span>
                    </button>
                    <button 
                        className={`sidebar-tab ${activeTab === 'security' ? 'active' : ''}`}
                        disabled
                    >
                        <i className="fa-solid fa-lock"></i>
                        <span>Security (Locked)</span>
                    </button>
                </aside>

                <main className="settings-content-area">
                    {activeTab === 'account' && (
                        <div className="settings-section-card">
                            <div className="section-header">
                                <h3>API Configuration</h3>
                                <p>Manage your connection to OpenAI services.</p>
                            </div>

                            <form onSubmit={handleSubmit} className="settings-form">
                                <div className="form-group">
                                    <label>User Identity</label>
                                    <div className="info-box">
                                        <i className="fa-solid fa-envelope"></i>
                                        <span>{settings?.email}</span>
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label>OpenAI API Key</label>
                                    <div className="input-with-icon">
                                        <i className="fa-solid fa-key"></i>
                                        <input
                                            type="password"
                                            value={apiKey}
                                            onChange={(e) => setApiKey(e.target.value)}
                                            placeholder={settings?.openai_api_key ? "••••••••••••••••" : "Paste your sk-... key"}
                                            className="page-settings-input"
                                        />
                                    </div>
                                    <div className="key-usage-status">
                                        {settings?.is_using_system_key ? (
                                            <div className="status-indicator system">
                                                <i className="fa-solid fa-server"></i>
                                                Using System Default Key (Limited Quota)
                                            </div>
                                        ) : (
                                            <div className="status-indicator personal">
                                                <i className="fa-solid fa-user-check"></i>
                                                Using Personal API Key (Unlimited)
                                            </div>
                                        )}
                                    </div>
                                    <p className="field-hint">
                                        Provide your own API key to bypass the free message limit. Your key is stored securely and used only for your requests.
                                    </p>
                                </div>

                                <div className="form-actions mt-4">
                                    <button type="submit" className="save-settings-btn" disabled={isSaving}>
                                        {isSaving ? <><i className="fa-solid fa-circle-notch fa-spin"></i> Saving...</> : 'Save Changes'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {activeTab === 'usage' && (
                        <div className="settings-section-card">
                            <div className="section-header">
                                <h3>Usage Tracking</h3>
                                <p>Monitor your AI usage and current subscription status.</p>
                            </div>

                            <div className="plan-overview-card">
                                <div className="plan-top">
                                    <div className="plan-title">
                                        <span className="badge">Active Plan</span>
                                        <h2>{settings?.plan === 'pro' ? 'Professional' : 'Free Tier'}</h2>
                                    </div>
                                    <div className="plan-icon-large">
                                        <i className={`fa-solid ${settings?.plan === 'pro' ? 'fa-chess-king' : 'fa-paper-plane'}`}></i>
                                    </div>
                                </div>
                                <div className="plan-perks">
                                    <ul>
                                        <li><i className="fa-solid fa-check"></i> Multi-page support</li>
                                        <li><i className="fa-solid fa-check"></i> Keyword automation</li>
                                        <li><i className="fa-solid ${settings?.plan === 'pro' ? 'fa-check' : 'fa-xmark'}"></i> {settings?.plan === 'pro' ? 'Unlimited message history' : '50 messages / month'}</li>
                                    </ul>
                                </div>
                            </div>

                            <div className="usage-meter-box">
                                <div className="meter-label">
                                    <span>AI Monthly Quota</span>
                                    <span className="meter-numbers">
                                        <strong>{settings?.ai_messages_used || 0}</strong> / {settings?.plan === 'pro' ? '∞' : '50'}
                                    </span>
                                </div>
                                <div className="progress-track">
                                    <div 
                                        className={`progress-fill ${usagePercent > 80 ? 'warning' : ''} ${usagePercent >= 100 ? 'danger' : ''}`}
                                        style={{ width: `${usagePercent}%` }}
                                    ></div>
                                </div>
                                <div className="meter-footer">
                                    <span className="reset-date">
                                        <i className="fa-solid fa-calendar-day"></i>
                                        Next reset: {settings?.ai_messages_reset_at ? new Date(settings.ai_messages_reset_at).toLocaleDateString() : 'N/A'}
                                    </span>
                                </div>
                            </div>

                            {settings?.plan !== 'pro' && (
                                <div className="upgrade-prompt-card">
                                    <div className="prompt-text">
                                        <h4>Need more capacity?</h4>
                                        <p>Upgrade to Pro for higher limits and priority AI support.</p>
                                    </div>
                                    <button className="upgrade-action-btn">Upgrade Now</button>
                                </div>
                            )}
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

export default SettingsPage;
