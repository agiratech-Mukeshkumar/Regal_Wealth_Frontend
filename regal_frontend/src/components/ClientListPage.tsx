import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import './ClientListPage.css';
import './AddClientModal.css';

// --- Interface Definitions ---
interface Client {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    tier: 'Bronze' | 'Gold' | 'Platinum' | 'Inner Circle' | null;
    onboarding_status: 'Pending' | 'In-Progress' | 'Completed';
    is_active: boolean;
    advisor_name: string;
    next_appointment: string | null;
}

interface DashboardStats {
    meetings_today?: number;
    appointments_weekly?: { day: string; count: number }[];
    clients_by_tier?: { tier: string; count: number }[];
    // Renamed for clarity to match backend, but we'll map it to the UI's needs
    clients_by_onboarding_status?: { onboarding_status: string; count: number }[];
}

// --- AddClientModal Component (No changes needed here) ---
interface AddClientModalProps {
    isOpen: boolean;
    onClose: () => void;
    onClientAdded: (newClient: Client) => void;
}

const AddClientModal: React.FC<AddClientModalProps> = ({ isOpen, onClose, onClientAdded }) => {
    const { token } = useAuth();
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError('');
        try {
            const response = await fetch('http://localhost:5000/api/advisor/clients', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ first_name: firstName, last_name: lastName, email })
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || 'Failed to add client.');
            }
            onClientAdded(data.client);
            onClose();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
         <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>Add New Client</h3>
                    <button onClick={onClose} className="close-button">&times;</button>
                </div>
                <form onSubmit={handleSubmit} className="modal-form">
                     <div className="input-group"><label>First Name</label><input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} required /></div>
                     <div className="input-group"><label>Last Name</label><input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} required /></div>
                     <div className="input-group"><label>Email</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
                    {error && <p className="error-message">{error}</p>}
                    <div className="modal-actions">
                        <button type="button" className="modal-button cancel" onClick={onClose}>Cancel</button>
                        <button type="submit" className="modal-button submit" disabled={isSubmitting}>
                            {isSubmitting ? 'Adding...' : 'Add Client'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};


// --- Helper Components ---
const StatusPill: React.FC<{ status: 'Pending' | 'In-Progress' | 'Completed' | 'Active' | 'Inactive' }> = ({ status }) => {
    const statusClasses = { 'Completed': 'status-pill-green', 'Active': 'status-pill-green', 'In-Progress': 'status-pill-blue', 'Pending': 'status-pill-yellow', 'Inactive': 'status-pill-red' };
    const text = status.replace('-', ' ');
    return <span className={`status-pill ${statusClasses[status]}`}>{text}</span>;
};

const TierDropdown: React.FC<{ client: Client; onUpdate: (id: number, data: Partial<Client>) => void }> = ({ client, onUpdate }) => {
    const tierColors: { [key: string]: string } = { 'Inner Circle': '#eab308', 'Platinum': '#6b7280', 'Gold': '#f59e0b', 'Bronze': '#a16207' };
    const tiers: Client['tier'][] = ['Inner Circle', 'Platinum', 'Gold', 'Bronze'];

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        onUpdate(client.id, { tier: e.target.value as Client['tier'] });
    };

    return (
        <div className="tier-cell">
            <span className="tier-icon" style={{ color: client.tier ? tierColors[client.tier] : '#ccc' }}>●</span>
            {/* The select is kept for functionality but styled to look minimal */}
            <select value={client.tier || ''} onChange={handleChange} onClick={(e) => e.preventDefault()}>
                <option value="" disabled>No Tier</option>
                {tiers.map(t => (
                    <option key={t!} value={t as string}>
                        {t}
                    </option>
                ))}
            </select>
        </div>
    );
};

// --- Main Page Component ---
const ClientListPage: React.FC = () => {
    const { token } = useAuth();
    const [clients, setClients] = useState<Client[]>([]);
    const [stats, setStats] = useState<DashboardStats>({});
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);

    // --- Data Fetching ---
    useEffect(() => {
        const fetchData = async () => {
            if (!token) return;
            setIsLoading(true);
            try {
                const [clientsRes, statsRes] = await Promise.all([
                    fetch('http://localhost:5000/api/advisor/clients', { headers: { 'Authorization': `Bearer ${token}` } }),
                    fetch('http://localhost:5000/api/advisor/dashboard/stats', { headers: { 'Authorization': `Bearer ${token}` } })
                ]);
                if (!clientsRes.ok || !statsRes.ok) throw new Error('Failed to fetch page data.');
                
                const clientsData = await clientsRes.json();
                const statsData = await statsRes.json();
                
                setClients(clientsData);
                setStats(statsData);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [token]);

    // --- Event Handlers ---
    const handleUpdateClient = async (clientId: number, updateData: Partial<Client>) => {
        setClients(prev => prev.map(c => c.id === clientId ? { ...c, ...updateData } : c));
        try {
            await fetch(`http://localhost:5000/api/advisor/clients/${clientId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(updateData)
            });
        } catch (error) {
            console.error("Failed to update client:", error);
            // Re-fetch to revert optimistic update on error - simple but effective
            // A more complex solution might revert the state manually
        }
    };

    const handleClientAdded = (newClient: Client) => {
        setClients(prevClients => [newClient, ...prevClients]);
    };

    // --- Memoized Calculations & Data for Charts ---
    const filteredClients = useMemo(() => {
        return clients.filter(client =>
            `${client.first_name} ${client.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
            client.email.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [clients, searchTerm]);

    const TIER_COLORS: { [key: string]: string } = {
        'Inner Circle': '#eab308',
        'Platinum': '#d1d5db',
        'Gold': '#fbbf24',
        'Bronze': '#a16207',
    };

    const clientStatusData = useMemo(() => {
        const data = stats.clients_by_onboarding_status || [];
        const total = data.reduce((sum, item) => sum + item.count, 0);
        
        // Mapping backend status to the UI labels and colors in the image
        const statusMap = {
            'Completed': { label: 'Active', color: 'blue' },
            'In-Progress': { label: 'In Progress', color: 'yellow' },
            'Pending': { label: 'Pending', color: 'orange' } // Assuming 'orange' for 'Pending'
        };

        return {
            total,
            statuses: data.map(item => ({
                ...statusMap[item.onboarding_status as keyof typeof statusMap],
                count: item.count,
                percentage: total > 0 ? (item.count / total) * 100 : 0,
            }))
        };
    }, [stats.clients_by_onboarding_status]);

    return (
        <>
            <AddClientModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onClientAdded={handleClientAdded} />
            <div className="client-list-page">
                {/* --- Dashboard Widgets Section --- */}
                <div className="dashboard-widgets-grid">
                    <div className="widget-card meetings-card">
                        <h3>Upcoming Meetings</h3>
                        <h4>John Doe</h4>
                        <p>10:00 AM, Today</p>
                        <div className="today-date">
                            <span>Today</span>
                            <span className="date-number">{new Date().getDate()}</span>
                            <span>{stats.meetings_today || 0} Meetings</span>
                        </div>
                    </div>
                    <div className="widget-card">
                        <h3>Appointments</h3>
                        <ResponsiveContainer width="100%" height={120}>
                            <BarChart data={stats.appointments_weekly} margin={{ top: 20, right: 0, left: -20, bottom: 5 }}>
                                <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={12} />
                                <YAxis tickLine={false} axisLine={false} width={20}/>
                                <Tooltip cursor={{fill: 'rgba(59, 130, 246, 0.1)'}} contentStyle={{ borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} />
                                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={15} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="widget-card tier-card">
                        <h3>Tier</h3>
                        <div className="tier-chart-container">
                            <ResponsiveContainer width="100%" height={120}>
                               <PieChart>
                                    <Pie data={stats.clients_by_tier} dataKey="count" nameKey="tier" cx="50%" cy="50%" innerRadius={35} outerRadius={50} paddingAngle={3}>
                                        { (stats.clients_by_tier || []).map((entry) => <Cell key={`cell-${entry.tier}`} fill={TIER_COLORS[entry.tier] || '#cccccc'} />) }
                                    </Pie>
                                    <Tooltip/>
                               </PieChart>
                            </ResponsiveContainer>
                            <div className="tier-legend">
                                {(stats.clients_by_tier || []).map(entry => (
                                    <div key={entry.tier} className="legend-item">
                                        <span className="legend-color-box" style={{ backgroundColor: TIER_COLORS[entry.tier] }}></span>
                                        {entry.tier} - {entry.count}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="widget-card">
                        <h3>Clients</h3>
                         {clientStatusData.statuses.map(status => (
                            <div className="progress-bar-group" key={status.label}>
                                <label>{status.count} {status.label}</label>
                                <div className={`progress-bar ${status.color}`}>
                                    <div style={{width: `${status.percentage}%`}}></div>
                                </div>
                            </div>
                         ))}
                    </div>
                </div>

                {/* --- Clients Table Section --- */}
                <div className="clients-section">
                    <header className="page-header">
                        <h2>Clients</h2>
                        <div className="header-actions">
                            <input type="search" placeholder="Search..." className="search-input" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                            <button className="add-client-button" onClick={() => setIsModalOpen(true)}>+ Add Client</button>
                        </div>
                    </header>
                    <div className="table-container">
                        <table className="clients-table">
                            <thead>
                                <tr>
                                    <th><input type="checkbox" /></th>
                                    <th className="sortable">Client</th>
                                    <th className="sortable">Tier</th>
                                    <th className="sortable">Onboarding</th>
                                    <th className="sortable">Advisor</th>
                                    <th className="sortable">Appointment</th>
                                    <th className="sortable">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading ? (
                                    <tr><td colSpan={7} className="loading-row">Loading clients...</td></tr>
                                ) : error ? (
                                     <tr><td colSpan={7} className="error-row">{error}</td></tr>
                                ) : (
                                    filteredClients.map(client => (
                                        <tr key={client.id}>
                                            <td><input type="checkbox" /></td>
                                            <td>
                                                <Link to={`#`} className="client-info-link"> {/* Link to `/clients/${client.id}` */}
                                                    <div className="avatar">{client.first_name.charAt(0)}{client.last_name.charAt(0)}</div>
                                                    <div>
                                                        <div className="client-name">
                                                            {client.first_name} {client.last_name}
                                                            {/* Example of the "New" tag, logic for this would be based on creation date */}
                                                            {client.first_name === "John" && <span className="new-tag">New</span>}
                                                        </div>
                                                        <div className="client-email">{client.email}</div>
                                                    </div>
                                                </Link>
                                            </td>
                                            <td><TierDropdown client={client} onUpdate={handleUpdateClient} /></td>
                                            <td><StatusPill status={client.onboarding_status} /></td>
                                            <td>{client.advisor_name}</td>
                                            <td>{client.next_appointment || 'N/A'}</td>
                                            <td><StatusPill status={client.is_active ? 'Active' : 'Inactive'} /></td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                         <div className="pagination-controls">
                            <button>Previous</button>
                            <span>(1-10/200) Per page: 10, 25, 50</span>
                            <button>Next</button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default ClientListPage;