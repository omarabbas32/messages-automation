import React, { useState, useEffect } from 'react';
import './SettingsPage.css';

const SettingsPage = ({ settings, onSave, onBack }) => {
    const [activeTab, setActiveTab] = useState('account');
    const [profile, setProfile] = useState({
        display_name: ''
    });
    const [aiConfig, setAiConfig] = useState({
        model: 'gpt-4o-mini',
        temperature: 0.7,
        max_tokens: 250,
        global_instructions: ''
    });
    const [passwords, setPasswords] = useState({
        current: '',
        new: '',
        confirm: ''
    });
    const [apiKey, setApiKey] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState({ text: '', type: '' });

    useEffect(() => {
        if (settings) {
            setApiKey(settings.openai_api_key || '');
            setProfile({
                display_name: settings.display_name || ''
            });
            setAiConfig({
                model: settings.ai_default_model || 'gpt-4o-mini',
                temperature: settings.ai_default_temperature ?? 0.7,
                max_tokens: settings.ai_default_max_tokens ?? 250,
                global_instructions: settings.ai_global_instructions || ''
            });
        }
    }, [settings]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        setSaveMessage({ text: '', type: '' });
        
        const success = await onSave({ 
            openai_api_key: apiKey,
            display_name: profile.display_name,
            ai_default_model: aiConfig.model,
            ai_default_temperature: aiConfig.temperature,
            ai_default_max_tokens: aiConfig.max_tokens,
            ai_global_instructions: aiConfig.global_instructions
        });
        setIsSaving(false);
        
        if (success) {
            setSaveMessage({ text: 'Settings saved successfully!', type: 'success' });
            setTimeout(() => setSaveMessage({ text: '', type: '' }), 3000);
        } else {
            setSaveMessage({ text: 'Failed to save settings.', type: 'error' });
        }
    };

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        if (passwords.new !== passwords.confirm) {
            setSaveMessage({ text: 'New passwords do not match.', type: 'error' });
            return;
        }

        setIsSaving(true);
        try {
            const token = localStorage.getItem('accessToken');
            const response = await fetch('/api/user/password', {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    current_password: passwords.current,
                    new_password: passwords.new
                })
            });

            const data = await response.json();
            setIsSaving(false);

            if (data.success) {
                setSaveMessage({ text: 'Password updated successfully!', type: 'success' });
                setPasswords({ current: '', new: '', confirm: '' });
                setTimeout(() => setSaveMessage({ text: '', type: '' }), 3000);
            } else {
                setSaveMessage({ text: data.error || 'Failed to update password.', type: 'error' });
            }
        } catch (error) {
            setIsSaving(false);
            setSaveMessage({ text: 'Network error.', type: 'error' });
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
                        onClick={() => setActiveTab('security')}
                    >
                        <i className="fa-solid fa-lock"></i>
                        <span>Security & Password</span>
                    </button>
                </aside>

                <main className="settings-content-area">
                    {activeTab === 'account' && (
                        <div className="settings-section-card">
                            <div className="section-header">
                                <h3>Account & AI Configuration</h3>
                                <p>Manage your profile and global AI behavior.</p>
                            </div>

                            <form onSubmit={handleSubmit} className="settings-form">
                                <div className="settings-grid">
                                    <div className="form-column">
                                        <div className="settings-sub-header">
                                            <h4><i className="fa-solid fa-user-circle"></i> Profile Settings</h4>
                                        </div>
                                        <div className="form-group">
                                            <label>Full Name / Display Name</label>
                                            <div className="info-box">
                                                <i className="fa-solid fa-signature"></i>
                                                <input
                                                    type="text"
                                                    value={profile.display_name}
                                                    onChange={(e) => setProfile({ ...profile, display_name: e.target.value })}
                                                    placeholder="Your name or company name"
                                                    className="transparent-input"
                                                />
                                            </div>
                                        </div>
                                        <div className="form-group">
                                            <label>User Identity</label>
                                            <div className="info-box read-only">
                                                <i className="fa-solid fa-envelope"></i>
                                                <span>{settings?.email}</span>
                                            </div>
                                        </div>

                                        <div className="settings-sub-header mt-4">
                                            <h4><i className="fa-solid fa-microchip"></i> AI Engine Defaults</h4>
                                        </div>
                                        <div className="form-group">
                                            <label>Preferred AI Model</label>
                                            <select 
                                                className="page-settings-input select"
                                                value={aiConfig.model}
                                                onChange={(e) => setAiConfig({ ...aiConfig, model: e.target.value })}
                                            >
                                                <option value="gpt-4o-mini">GPT-4o Mini (Fast & Cost Efficient)</option>
                                                <option value="gpt-4o">GPT-4o (Most Intelligent)</option>
                                                <option value="gpt-3.5-turbo">GPT-3.5 Turbo (Legacy)</option>
                                            </select>
                                        </div>

                                        <div className="form-group">
                                            <label>Temperature (Creativity: {aiConfig.temperature})</label>
                                            <div className="slider-wrapper">
                                                <span>Balanced</span>
                                                <input
                                                    type="range"
                                                    min="0"
                                                    max="1"
                                                    step="0.1"
                                                    value={aiConfig.temperature}
                                                    onChange={(e) => setAiConfig({ ...aiConfig, temperature: parseFloat(e.target.value) })}
                                                    className="settings-slider"
                                                />
                                                <span>Creative</span>
                                            </div>
                                        </div>

                                        <div className="form-group">
                                            <label>Max Tokens Per Response</label>
                                            <input
                                                type="number"
                                                min="50"
                                                max="2000"
                                                value={aiConfig.max_tokens}
                                                onChange={(e) => setAiConfig({ ...aiConfig, max_tokens: parseInt(e.target.value) })}
                                                className="page-settings-input"
                                            />
                                            <p className="field-hint">Defines how long the AI response can be (roughly 4 characters per token).</p>
                                        </div>
                                    </div>

                                    <div className="form-column">
                                        <div className="settings-sub-header">
                                            <h4><i className="fa-solid fa-key"></i> API Configuration</h4>
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
                                        </div>

                                        <div className="settings-sub-header mt-4">
                                            <h4><i className="fa-solid fa-brain"></i> Global System Instructions</h4>
                                        </div>
                                        <div className="form-group">
                                            <label>Primary AI Directive</label>
                                            <textarea
                                                value={aiConfig.global_instructions}
                                                onChange={(e) => setAiConfig({ ...aiConfig, global_instructions: e.target.value })}
                                                placeholder="Example: Always speak in a professional tone. Never mention competitors."
                                                className="page-settings-input textarea"
                                                rows="5"
                                            ></textarea>
                                            <p className="field-hint">This text will be added as a prefix to the AI's system prompt for ALL your pages.</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="form-actions mt-4">
                                    <button type="submit" className="save-settings-btn" disabled={isSaving}>
                                        {isSaving ? <><i className="fa-solid fa-circle-notch fa-spin"></i> Saving...</> : 'Save All Changes'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {activeTab === 'security' && (
                        <div className="settings-section-card animate-fade-in">
                            <div className="section-header">
                                <h3>Security & Access</h3>
                                <p>Manage your account password and security preferences.</p>
                            </div>

                            <form onSubmit={handlePasswordChange} className="settings-form max-w-lg">
                                <div className="form-group">
                                    <label>Current Password</label>
                                    <div className="input-with-icon">
                                        <i className="fa-solid fa-shield-halved"></i>
                                        <input
                                            type="password"
                                            value={passwords.current}
                                            onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                                            className="page-settings-input"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label>New Password</label>
                                    <div className="input-with-icon">
                                        <i className="fa-solid fa-lock"></i>
                                        <input
                                            type="password"
                                            value={passwords.new}
                                            onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                                            className="page-settings-input"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label>Confirm New Password</label>
                                    <div className="input-with-icon">
                                        <i className="fa-solid fa-check-double"></i>
                                        <input
                                            type="password"
                                            value={passwords.confirm}
                                            onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                                            className="page-settings-input"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="form-actions mt-4">
                                    <button type="submit" className="save-settings-btn" disabled={isSaving}>
                                        {isSaving ? <><i className="fa-solid fa-circle-notch fa-spin"></i> Updating...</> : 'Update Password'}
                                    </button>
                                </div>

                                <div className="security-notice mt-6">
                                    <div className="notice-box danger">
                                        <i className="fa-solid fa-warning"></i>
                                        <div>
                                            <strong>Danger Zone</strong>
                                            <p>If you lose your password, and do not have an API key configured, we may not be able to recover your automated page responses.</p>
                                        </div>
                                    </div>
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

                            <div className="token-usage-card animate-fade-in">
                                <div className="token-stat">
                                    <div className="token-icon">
                                        <i className="fa-solid fa-microchip"></i>
                                    </div>
                                    <div className="token-info">
                                        <label>Total Brain Power Consumed</label>
                                        <h3>{(settings?.ai_tokens_used || 0).toLocaleString()} <small>Tokens</small></h3>
                                    </div>
                                </div>
                                <div className="token-explanation">
                                    <i className="fa-solid fa-circle-info"></i>
                                    <p>Tokens are the core billing units for AI. 50 tokens in Arabic is roughly 30-40 words. This tracking helps you optimize your "Max Tokens" setting.</p>
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
