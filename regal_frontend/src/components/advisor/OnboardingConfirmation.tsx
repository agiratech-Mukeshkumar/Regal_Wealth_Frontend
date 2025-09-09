import React from 'react';
import './StatusConfirmationModal.css'; 

interface Client {
    id: number;
    [key: string]: any;
}

interface OnboardingModalProps {
    isOpen: boolean;
    client: Client | null;
    onClose: () => void;
    onConfirm: (client: Client) => void;
    isSubmitting: boolean;
}

const OnboardingConfirmationModal: React.FC<OnboardingModalProps> = ({ isOpen, client, onClose, onConfirm, isSubmitting }) => {
    if (!isOpen || !client) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content confirmation-modal" onClick={(e) => e.stopPropagation()}>
                <div className="confirmation-icon icon-green">
                    ✓
                </div>
                <h3>Complete Client Onboarding</h3>
                <p>Are you sure you want to mark this client's onboarding as complete?</p>
                <div className="modal-actions">
                    <button type="button" className="modal-button cancel" onClick={onClose}>Cancel</button>
                    <button type="button" className="modal-button confirm-green" onClick={() => onConfirm(client)} disabled={isSubmitting}>
                        {isSubmitting ? 'Confirming...' : 'Confirm'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default OnboardingConfirmationModal;
