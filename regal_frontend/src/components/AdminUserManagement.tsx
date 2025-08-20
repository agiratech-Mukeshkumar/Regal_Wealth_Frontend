import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext'; // 1. IMPORT the useAuth hook
import './AdminUserManagement.css';

interface User {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    role: 'admin' | 'advisor' | 'client';
    is_active: boolean;
}

const AdminUserManagement: React.FC = () => {
    const { token } = useAuth(); // 2. GET the token from context
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchUsers = async () => {
        if (!token) return; // Don't fetch if token isn't ready
        setIsLoading(true);
        try {
            // 3. USE the real token in the fetch call
            const response = await fetch('http://localhost:5000/api/admin/users', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Failed to fetch users.');
            const data: User[] = await response.json();
            setUsers(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, [token]); // 4. ADD token as a dependency

    const handleDelete = async (userId: number) => {
        if (window.confirm('Are you sure you want to permanently delete this user?')) {
            try {
                // Also use the real token here
                const response = await fetch(`http://localhost:5000/api/admin/users/${userId}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!response.ok) throw new Error('Failed to delete user.');
                // Refresh the list after deleting
                fetchUsers();
            } catch (err: any) {
                alert(err.message);
            }
        }
    };

    return (
        <div className="admin-page">
            <header className="page-header">
                <h2>User Management</h2>
                <button className="add-user-button">+ Add User</button>
            </header>

            <div className="table-container">
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Role</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr><td colSpan={5}>Loading users...</td></tr>
                        ) : error ? (
                            <tr><td colSpan={5} className="error-row">{error}</td></tr>
                        ) : (
                            users.map(user => (
                                <tr key={user.id}>
                                    <td>{user.first_name} {user.last_name}</td>
                                    <td>{user.email}</td>
                                    <td className="role-cell">{user.role}</td>
                                    <td>{user.is_active ? 'Active' : 'Inactive'}</td>
                                    <td className="actions-cell">
                                        <button className="action-button edit">Edit</button>
                                        <button className="action-button delete" onClick={() => handleDelete(user.id)}>Delete</button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AdminUserManagement;
