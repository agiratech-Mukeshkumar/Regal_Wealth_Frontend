import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../../auth/AuthContext';
import './AdminAdvisorManagement.css';
import StatusConfirmationModal, { ItemWithStatus } from '../advisor/StatusConfirmationModal';
import DeleteConfirmationModal from './DeleteConfirmationModal';

const apiUrl = process.env.REACT_APP_API_URL;

interface Advisor {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    is_active: boolean;
}

interface AddAdvisorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (newAdvisor: Advisor) => void;
}

const AddAdvisorModal: React.FC<AddAdvisorModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const { token } = useAuth();
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!firstName || !lastName || !email) {
            setError('All fields are required.');
            return;
        }
        setIsSubmitting(true);

        try {
            const response = await fetch(`${apiUrl}/api/admin/advisors`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ first_name: firstName, last_name: lastName, email: email })
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || 'An unknown error occurred.');
            }

            onSuccess(data.advisor);
            handleClose();

        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        setFirstName('');
        setLastName('');
        setEmail('');
        setError('');
        onClose();
    };

    if (!isOpen) {
        return null;
    }

    return (
        <div className="modal-overlay" onClick={handleClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>Add New Advisor</h3>
                    <button onClick={handleClose} className="close-button">&times;</button>
                </div>
                <form onSubmit={handleSubmit} className="modal-form">
                    {error && <p className="modal-error">{error}</p>}
                    <div className="form-group">
                        <label>First Name</label>
                        <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} required />
                    </div>
                    <div className="form-group">
                        <label>Last Name</label>
                        <input type="text" value={lastName} onChange={e => setLastName(e.target.value)} required />
                    </div>
                    <div className="form-group">
                        <label>Email Address</label>
                        <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
                    </div>
                    <div className="modal-actions">
                        <button type="button" className="modal-button cancel" onClick={handleClose}>Cancel</button>
                        <button type="submit" className="modal-button submit" disabled={isSubmitting}>
                            {isSubmitting ? 'Adding...' : 'Add Advisor'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};



const AdminAdvisorManagement: React.FC = () => {
    const { token } = useAuth();
    const [advisors, setAdvisors] = useState<Advisor[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);
    const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false); 
    const [selectedAdvisor, setSelectedAdvisor] = useState<Advisor | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchAdvisors = useCallback(async () => {
        if (!token) return;
        setIsLoading(true);
        setError('');
        try {
            const response = await fetch(`${apiUrl}/api/admin/advisors`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Failed to fetch advisors.');
            const data: Advisor[] = await response.json();
            setAdvisors(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [token]);

    useEffect(() => { fetchAdvisors(); }, [fetchAdvisors]);
    useEffect(() => { setCurrentPage(1); }, [searchTerm]);

    const openStatusModal = (advisor: Advisor) => {
        setSelectedAdvisor(advisor);
        setIsStatusModalOpen(true);
    };

    const openDeleteModal = (advisor: Advisor) => {
        setSelectedAdvisor(advisor);
        setIsDeleteModalOpen(true);
    };

    const closeModal = () => {
        setSelectedAdvisor(null);
        setIsStatusModalOpen(false);
        setIsDeleteModalOpen(false);
        setIsAddModalOpen(false); 
    };

   
    const handleAddSuccess = (newAdvisor: Advisor) => {
        setAdvisors(prev => [newAdvisor, ...prev]);
        closeModal();
    };

    const handleStatusChange = async (advisor: ItemWithStatus) => {
        if (!advisor) return;
        setIsSubmitting(true);
        try {
            await fetch(`${apiUrl}/api/admin/users/${advisor.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ is_active: !advisor.is_active })
            });
            setAdvisors(prev => prev.map(a => a.id === advisor.id ? { ...a, is_active: !a.is_active } : a));
        } catch (err) {
            setError("Failed to update status.");
        } finally {
            setIsSubmitting(false);
            closeModal();
        }
    };

    const handleDelete = async () => {
        if (!selectedAdvisor) return;
        setIsSubmitting(true);
        

        try {
            const response = await fetch(`${apiUrl}/api/admin/users/${selectedAdvisor.id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Failed to delete advisor.');
            setAdvisors(prev => prev.filter(a => a.id !== selectedAdvisor.id));
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
            closeModal();
        }
    };

    const filteredAdvisors = useMemo(() => advisors.filter(adv =>
        `${adv.first_name} ${adv.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        adv.email.toLowerCase().includes(searchTerm.toLowerCase())
    ), [advisors, searchTerm]);

    const paginatedAdvisors = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredAdvisors.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredAdvisors, currentPage, itemsPerPage]);

    const totalPages = Math.ceil(filteredAdvisors.length / itemsPerPage);

    return (
        <>
            <StatusConfirmationModal
                isOpen={isStatusModalOpen}
                item={selectedAdvisor}
                itemType="Advisor"
                onClose={closeModal}
                onConfirm={handleStatusChange}
                isSubmitting={isSubmitting}
            />
            <DeleteConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={closeModal}
                onConfirm={handleDelete}
                itemName={`${selectedAdvisor?.first_name} ${selectedAdvisor?.last_name}`}
                itemType="Advisor"
                isSubmitting={isSubmitting}
            />

            <AddAdvisorModal
                isOpen={isAddModalOpen}
                onClose={closeModal}
                onSuccess={handleAddSuccess}
            />

            <div className="admin-page">
                <header className="page-header">
                    <h2></h2>
                  
                    <button className="add-button-primary" onClick={() => setIsAddModalOpen(true)}>
                        + Add Advisor
                    </button>
                </header>
                <div className="table-container">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Advisor Name</th>
                                <th>Email</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr><td colSpan={4}>Loading advisors...</td></tr>
                            ) : error ? (
                                <tr><td colSpan={4} className="error-row">{error}</td></tr>
                            ) : (
                                paginatedAdvisors.map(advisor => (
                                    <tr key={advisor.id}>
                                        <td>{advisor.first_name} {advisor.last_name}</td>
                                        <td>{advisor.email}</td>
                                        <td>
                                            <button 
                                                className={`status-button ${advisor.is_active ? 'active' : 'inactive'}`}
                                                onClick={() => openStatusModal(advisor)}
                                            >
                                                {advisor.is_active ? 'Active' : 'Inactive'}
                                            </button>
                                        </td>
                                        <td className="actions-cell">
                                            <button className="action-button delete" onClick={() => openDeleteModal(advisor)}>Delete</button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                    <div className="pagination-controls">
                        <span>Page {currentPage} of {totalPages}</span>
                        <div className="nav-buttons">
                            <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1}>Previous</button>
                            <button onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages || totalPages === 0}>Next</button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default AdminAdvisorManagement;