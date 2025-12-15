import { useEffect, useState } from 'react';
import './Toast.css';

function Toast({ message, type = 'info', isVisible, onClose, duration = 3000 }) {
    const [isShowing, setIsShowing] = useState(false);

    useEffect(() => {
        if (isVisible) {
            setIsShowing(true);
            const timer = setTimeout(() => {
                setIsShowing(false);
                setTimeout(onClose, 300);
            }, duration);
            return () => clearTimeout(timer);
        }
    }, [isVisible, duration, onClose]);

    if (!isVisible && !isShowing) return null;

    const getIcon = () => {
        switch (type) {
            case 'success': return '✓';
            case 'error': return '✕';
            default: return 'ℹ';
        }
    };

    return (
        <div className={`toast toast-${type} ${isShowing ? 'show' : 'hide'}`}>
            <span className="toast-icon">{getIcon()}</span>
            <span className="toast-message">{message}</span>
        </div>
    );
}

export default Toast;
