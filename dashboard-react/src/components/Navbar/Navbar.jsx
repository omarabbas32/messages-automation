import './Navbar.css';

function Navbar() {
    return (
        <header className="navbar">
            <div className="navbar-container">
                <div className="navbar-brand">
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
            </div>
        </header>
    );
}

export default Navbar;
