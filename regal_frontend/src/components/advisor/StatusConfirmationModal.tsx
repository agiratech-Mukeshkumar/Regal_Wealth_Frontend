import React from 'react';
import './StatusConfirmationModal.css';


export interface ItemWithStatus {
    id: number;
    is_active: boolean;
    [key: string]: any; 
}


interface StatusConfirmationModalProps {
    isOpen: boolean;
    item: ItemWithStatus | null;
    itemType: string; 
    onClose: () => void;
    onConfirm: (item: ItemWithStatus) => void;
    isSubmitting: boolean;
}

const StatusConfirmationModal: React.FC<StatusConfirmationModalProps> = ({ isOpen, item, itemType, onClose, onConfirm, isSubmitting }) => {
    if (!isOpen || !item) return null;

    const isActive = item.is_active;
    const actionText = isActive ? "Inactive" : "Active";
    const title = `Mark ${itemType} as ${actionText}`;
    const message = isActive ? `Are you sure you want to mark this ${itemType.toLowerCase()} as Inactive?` : `Are you sure you want to reactivate this ${itemType.toLowerCase()}?`;
    const buttonClass = isActive ? "confirm-red" : "confirm-green";
    const iconClass = isActive ? "icon-red" : "icon-green";

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content confirmation-modal" onClick={(e) => e.stopPropagation()}>
                <div className={`confirmation-icon ${iconClass}`}>
                    {isActive ? '!' : '✓'}
                </div>
                <h3>{title}</h3>
                <p>{message}</p>
                <div className="modal-actions">
                    <button type="button" className="modal-button cancel" onClick={onClose}>Cancel</button>
                    <button type="button" className={`modal-button ${buttonClass}`} onClick={() => onConfirm(item)} disabled={isSubmitting}>
                        {isSubmitting ? 'Confirming...' : 'Confirm'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default StatusConfirmationModal;
