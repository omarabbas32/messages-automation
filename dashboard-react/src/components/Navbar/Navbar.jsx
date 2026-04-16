import React, { useState } from 'react';
import './Navbar.css';

function Navbar({ onNavigate, activeView, onLogout, userEmail }) {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    return (
        <header className="navbar">
            <div className="navbar-container">
                <div className="navbar-brand" onClick={() => onNavigate('dashboard')} style={{ cursor: 'pointer' }}>
                    <img
                        src="/logo.png"
                        alt="Wink Logo"
                        className="navbar-logo"
                    />
                    <div className="navbar-text">
                        <h1 className="navbar-title">Wink WebHook</h1>
                        <p className="navbar-subtitle">Multi-page Automation System</p>
                    </div>
                </div>
                
                <div className="navbar-actions">
                    <button 
                        className={`navbar-settings-btn ${activeView === 'settings' ? 'active' : ''}`} 
                        onClick={() => onNavigate('settings')} 
                        title="Settings"
                    >
                        <i className="fa-solid fa-gear"></i>
                    </button>
                    
                    <div className="user-profile">
                        <div className="user-info" onClick={() => setIsMenuOpen(!isMenuOpen)}>
                            <div className="user-avatar text-secondary">
                                <i className="fa-solid fa-user-circle fa-2xl"></i>
                            </div>
                            <span className="user-email">{userEmail}</span>
                            <i className={`fa-solid fa-chevron-down ml-2 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`}></i>
                        </div>

                        {isMenuOpen && (
                            <div className="user-dropdown">
                                <button onClick={onLogout} className="logout-btn">
                                    <i className="fa-solid fa-right-from-bracket"></i>
                                    Logout
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
}

export default Navbar;
