import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../auth/AuthContext';
import './AdminModals.css'; 

const apiUrl = process.env.REACT_APP_API_URL;

interface Advisor {
    id: number;
    first_name: string;
    last_name: string;
}
interface AssignModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAssign: (advisorId: number) => void;
    clientName: string;
}

const AssignAdvisorModal: React.FC<AssignModalProps> = ({ isOpen, onClose, onAssign, clientName }) => {
    const { token } = useAuth();
    const [advisors, setAdvisors] = useState<Advisor[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedAdvisorId, setSelectedAdvisorId] = useState<number | null>(null);

    useEffect(() => {
        if (isOpen) {
            const fetchAdvisors = async () => {
                setIsLoading(true);
                try {
                    const response = await fetch(`${apiUrl}/api/admin/advisors`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (!response.ok) throw new Error('Failed to fetch advisors.');
                    const data: Advisor[] = await response.json();
                    setAdvisors(data);
                } catch (err) {
                    console.error(err);
                } finally {
                    setIsLoading(false);
                }
            };
            fetchAdvisors();
        }
    }, [isOpen, token]);

    const filteredAdvisors = useMemo(() => {
        return advisors.filter(adv => 
            `${adv.first_name} ${adv.last_name}`.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [advisors, searchTerm]);

    const handleConfirm = () => {
        if (selectedAdvisorId) {
            onAssign(selectedAdvisorId);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>Assign Advisor for {clientName}</h3>
                    <button onClick={onClose} className="close-button">&times;</button>
                </div>
                <div className="modal-body">
                    <input
                        type="search"
                        placeholder="Search for an advisor..."
                        className="modal-search-input"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                    <div className="advisor-list">
                        {isLoading ? <p>Loading advisors...</p> : 
                            filteredAdvisors.map(adv => (
                                <label key={adv.id} className="advisor-list-item">
                                    <input 
                                        type="radio" 
                                        name="advisor" 
                                        checked={selectedAdvisorId === adv.id}
                                        onChange={() => setSelectedAdvisorId(adv.id)}
                                    />
                                    <span>{adv.first_name} {adv.last_name}</span>
                                </label>
                            ))
                        }
                    </div>
                </div>
                <div className="modal-actions">
                    <button type="button" className="modal-button cancel" onClick={onClose}>Cancel</button>
                    <button 
                        type="button" 
                        className="modal-button submit" 
                        onClick={handleConfirm} 
                        disabled={!selectedAdvisorId}
                    >
                        Confirm Assignment
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AssignAdvisorModal;
