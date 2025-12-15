import './Modal.css';

function Modal({ isOpen, title, message, onConfirm, onCancel, confirmText = 'تأكيد', cancelText = 'إلغاء' }) {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onCancel}>
            <div className="modal-content animate-slide-up" onClick={e => e.stopPropagation()}>
                <h3 className="modal-title">{title}</h3>
                <p className="modal-message">{message}</p>
                <div className="modal-actions">
                    <button className="btn btn-danger" onClick={onConfirm}>
                        {confirmText}
                    </button>
                    <button className="btn btn-secondary" onClick={onCancel}>
                        {cancelText}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default Modal;
