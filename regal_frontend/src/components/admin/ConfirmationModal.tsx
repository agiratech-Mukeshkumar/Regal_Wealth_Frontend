import React from 'react';
import './ConfirmationModal.css';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText: string;
    variant: 'delete' | 'inactive' | 'active';
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ isOpen, onClose, onConfirm, title, message, confirmText, variant }) => {
    if (!isOpen) return null;

    const variantClasses = {
        delete: 'variant-delete',
        inactive: 'variant-inactive',
        active: 'variant-active',
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="confirmation-modal" onClick={(e) => e.stopPropagation()}>
                <div className={`icon-container ${variantClasses[variant]}`}>
                    {/* You can use SVG icons here */}
                    {variant === 'active' ? '✓' : '!'}
                </div>
                <h3 className="modal-title">{title}</h3>
                <p className="modal-message">{message}</p>
                <div className="modal-actions">
                    <button onClick={onClose} className="modal-button cancel">Cancel</button>
                    <button onClick={onConfirm} className={`modal-button confirm ${variantClasses[variant]}`}>
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmationModal;