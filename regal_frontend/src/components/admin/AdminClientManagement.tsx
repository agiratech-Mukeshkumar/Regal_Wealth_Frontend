import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../auth/AuthContext';
import './AdminClientManagement.css';
import AssignAdvisorModal from './AssignAdvisorModal';
import DeleteConfirmationModal from './DeleteConfirmationModal';

const apiUrl = process.env.REACT_APP_API_URL;

interface Client {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    is_active: boolean;
    advisor_name: string | null;
}

const AdminClientManagement: React.FC = () => {
    const { token } = useAuth();
    const [clients, setClients] = useState<Client[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);

    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchClients = useCallback(async () => {
        if (!token) return;
        setIsLoading(true);
        setError('');
        try {
            const response = await fetch(`${apiUrl}/api/admin/clients`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Failed to fetch clients.');
            const data: Client[] = await response.json();
            setClients(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [token]);

    useEffect(() => { fetchClients(); }, [fetchClients]);
    useEffect(() => { setCurrentPage(1); }, [searchTerm]);


    const openAssignModal = (client: Client) => {
        setSelectedClient(client);
        setIsAssignModalOpen(true);
    };

    const openDeleteModal = (client: Client) => {
        setSelectedClient(client);
        setIsDeleteModalOpen(true);
    };

    const closeModal = () => {
        setSelectedClient(null);
        setIsAssignModalOpen(false);
        setIsDeleteModalOpen(false);
    };

    const handleAssignAdvisor = async (advisorId: number) => {
        if (!selectedClient) return;
        setIsSubmitting(true);
        try {
            const response = await fetch(`${apiUrl}/api/admin/clients/${selectedClient.id}/assign`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ advisor_id: advisorId })
            });
            if (!response.ok) throw new Error('Failed to assign advisor.');
            fetchClients(); 
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
            closeModal();
        }
    };

    const handleDeleteClient = async () => {
        if (!selectedClient) return;
        setIsSubmitting(true);
        try {
            const response = await fetch(`${apiUrl}/api/admin/users/${selectedClient.id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Failed to delete client.');
            setClients(prev => prev.filter(c => c.id !== selectedClient.id)); 
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
            closeModal();
        }
    };

    const filteredClients = useMemo(() => clients.filter(client =>
        `${client.first_name} ${client.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (client.advisor_name && client.advisor_name.toLowerCase().includes(searchTerm.toLowerCase()))
    ), [clients, searchTerm]);

    const paginatedClients = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredClients.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredClients, currentPage, itemsPerPage]);

    const totalPages = Math.ceil(filteredClients.length / itemsPerPage);

    return (
        <>
            <AssignAdvisorModal 
                isOpen={isAssignModalOpen}
                onClose={closeModal}
                onAssign={handleAssignAdvisor}
                clientName={`${selectedClient?.first_name} ${selectedClient?.last_name}`}
            />
            <DeleteConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={closeModal}
                onConfirm={handleDeleteClient}
                itemName={`${selectedClient?.first_name} ${selectedClient?.last_name}`}
                itemType="Client"
            />

            <div className="admin-page">
                <header className="page-header">
                    <h2></h2>
                    <input
                        type="search"
                        placeholder="Search by client, email, or advisor..."
                        className="search-input"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </header>

                <div className="table-container">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Client Name</th>
                                <th>Email</th>
                                <th>Assigned Advisor</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr><td colSpan={5}>Loading clients...</td></tr>
                            ) : error ? (
                                <tr><td colSpan={5} className="error-row">{error}</td></tr>
                            ) : (
                                paginatedClients.map(client => (
                                    <tr key={client.id}>
                                        <td>{client.first_name} {client.last_name}</td>
                                        <td>{client.email}</td>
                                        <td>{client.advisor_name || <span className="unassigned-text">Unassigned</span>}</td>
                                        <td>{client.is_active ? 'Active' : 'Inactive'}</td>
                                        <td className="actions-cell">
                                            <button className="action-button edit" onClick={() => openAssignModal(client)}>Assign</button>
                                            <button className="action-button delete" onClick={() => openDeleteModal(client)}>Delete</button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                    <div className="pagination-controls">
                        <span>Page {currentPage} of {totalPages}</span>
                        <div className="nav-buttons">
                            <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1}>Previous</button>
                            <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages || totalPages === 0}>Next</button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default AdminClientManagement;

