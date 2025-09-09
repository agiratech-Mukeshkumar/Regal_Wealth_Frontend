import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import {
    PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
    CartesianGrid
} from 'recharts';
import './ClientListPage.css';
import './AddClientModal.css';
import StatusConfirmationModal, { ItemWithStatus } from './StatusConfirmationModal';
import OnboardingConfirmationModal from './OnboardingConfirmation';


const apiUrl = process.env.REACT_APP_API_URL;

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
    clients_by_tier?: { tier: string | null; count: number }[];
    clients_by_onboarding_status?: { onboarding_status: string; count: number }[];
}

interface NextAppointment {
    client_name: string;
    start_time: string;
    title: string;
}


interface AddClientModalProps {
    isOpen: boolean;
    onClose: () => void;
    onClientAdded: () => void;
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
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ first_name: firstName, last_name: lastName, email })
            });

            const data = await response.json();
            if (!response.ok) { throw new Error(data.message || 'Failed to add client.'); }

            
            onClientAdded();
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
                <div className="modal-header"><h3>Add New Client</h3><button onClick={onClose} className="close-button">&times;</button></div>
                <form onSubmit={handleSubmit} className="modal-form">
                    <div className="input-group"><label>First Name</label><input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} required /></div>
                    <div className="input-group"><label>Last Name</label><input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} required /></div>
                    <div className="input-group"><label>Email</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
                    {error && <p className="error-message">{error}</p>}
                    <div className="modal-actions">
                        <button type="button" className="modal-button cancel" onClick={onClose}>Cancel</button>
                        <button type="submit" className="modal-button submit" disabled={isSubmitting}>{isSubmitting ? 'Adding...' : 'Add Client'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};


const TIER_COLORS: { [key: string]: string } = { 'Inner Circle': '#1E2551', 'Platinum': '#C8C8C8', 'Gold': '#FFC72C', 'Bronze': '#CD853F' };
const APPOINTMENT_BAR_COLORS = ['#1E2551', '#2F3A72', '#3B82F6', '#4A90F8', '#5FD0F9', '#78E1FA', '#9EEFFF'];

const TierDropdown: React.FC<{ client: Client; onUpdate: (id: number, data: Partial<Client>) => void }> = ({ client, onUpdate }) => {
    const tiers: Client['tier'][] = ['Inner Circle', 'Platinum', 'Gold', 'Bronze'];
    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => onUpdate(client.id, { tier: e.target.value as Client['tier'] });
    return (
        <div className="tier-cell">
            <span className="tier-icon" style={{ backgroundColor: client.tier ? TIER_COLORS[client.tier] : '#e5e7eb' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" /></svg>
            </span>
            <select value={client.tier || ''} onChange={handleChange} className="tier-dropdown" onClick={(e) => e.stopPropagation()}>
                <option value="" disabled>Select Tier</option>
                {tiers.map(t => <option key={t!} value={t as string}>{t}</option>)}
            </select>
        </div>
    );
};

const StatusPill: React.FC<{ status: string }> = ({ status }) => {
    const statusClasses: { [key: string]: string } = { 'Completed': 'status-pill-green', 'In-Progress': 'status-pill-blue', 'Pending': 'status-pill-yellow' };
    return <span className={`status-pill ${statusClasses[status] || 'status-pill-gray'}`}>{status.replace('-', ' ')}</span>;
};

const CustomBar = (props: any) => {
    const { x, y, width, height, value, index } = props;
    const fill = APPOINTMENT_BAR_COLORS[index % APPOINTMENT_BAR_COLORS.length];
    return (
        <g>
            <rect x={x} y={y} width={width} height={height} fill={fill} rx={4} ry={4} />
            <text x={x + width / 2} y={y - 5} fill={fill} textAnchor="middle" dominantBaseline="middle" fontSize={12} fontWeight="bold">{value}</text>
        </g>
    );
};

const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, value }: any) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * Math.PI / 180);
    const y = cy + radius * Math.sin(-midAngle * Math.PI / 180);
    return <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight="bold">{value}</text>;
};

const ClientListPage: React.FC = () => {
    const { token, user } = useAuth();
    const [clients, setClients] = useState<Client[]>([]);
    const [stats, setStats] = useState<DashboardStats>({});
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [nextAppointment, setNextAppointment] = useState<NextAppointment | null>(null);
    const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
    const [selectedClientForStatus, setSelectedClientForStatus] = useState<Client | null>(null);
    const [isOnboardingModalOpen, setIsOnboardingModalOpen] = useState(false);
    const [selectedClientForOnboarding, setSelectedClientForOnboarding] = useState<Client | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const [selectedClientIds, setSelectedClientIds] = useState<Set<number>>(new Set());
    const headerCheckboxRef = useRef<HTMLInputElement>(null);

    const fetchData = async () => {
        if (!token) return;
        setIsLoading(true);
        try {
            const [clientsRes, statsRes, nextAppointmentRes] = await Promise.all([
                fetch(`${apiUrl}/api/advisor/clients`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${apiUrl}/api/advisor/dashboard/stats`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${apiUrl}/api/advisor/dashboard/next-appointment`, { headers: { 'Authorization': `Bearer ${token}` } })
            ]);
            if (!clientsRes.ok || !statsRes.ok || !nextAppointmentRes.ok) throw new Error('Failed to fetch page data.');
            const clientsData = await clientsRes.json();
            const statsData = await statsRes.json();
            const nextAppointmentData = await nextAppointmentRes.json();

            setClients(clientsData);
            setStats(statsData);
            setNextAppointment(nextAppointmentData);

        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [token]);

    useEffect(() => { setCurrentPage(1); }, [searchTerm, itemsPerPage]);

    const handleTierUpdate = async (clientId: number, updateData: Partial<Client>) => {
        const updatedClients = clients.map(c => c.id === clientId ? { ...c, ...updateData } : c);
        setClients(updatedClients);

        const newTierCounts: { [key: string]: number } = {};
        updatedClients.forEach(client => {
            if (client.tier) {
                newTierCounts[client.tier] = (newTierCounts[client.tier] || 0) + 1;
            }
        });

        const newClientsByTier = Object.entries(newTierCounts)
            .map(([tier, count]) => ({ tier, count }))
            .sort((a, b) => a.tier.localeCompare(b.tier));

        setStats(prevStats => ({ ...prevStats, clients_by_tier: newClientsByTier }));

        try {
            await fetch(`${apiUrl}/api/advisor/clients/${clientId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(updateData)
            });
        } catch (error) {
            console.error("Failed to update client tier:", error);
            setClients(clients);
        }
    };

   
    const handleClientAdded = () => {
        fetchData();
    };

    const handleStatusChange = async (client: ItemWithStatus) => {
        if (!client) return;
        setIsSubmitting(true);
        try {
            const response = await fetch(`${apiUrl}/api/advisor/clients/${client.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ is_active: !client.is_active })
            });
            if (!response.ok) throw new Error('Failed to update status.');
            await fetchData();
        } catch (err) {
            setError("Failed to update client status. Please try again.");
        } finally {
            setIsSubmitting(false);
            setIsStatusModalOpen(false);
            setSelectedClientForStatus(null);
        }
    };

    const handleCompleteOnboarding = async (client: Client) => {
        if (!client) return;
        setIsSubmitting(true);
        try {
            const response = await fetch(`${apiUrl}/api/advisor/clients/${client.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ onboarding_status: 'Completed' })
            });
            if (!response.ok) throw new Error('Failed to complete onboarding.');
            await fetchData();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
            setIsOnboardingModalOpen(false);
            setSelectedClientForOnboarding(null);
        }
    };

    const filteredClients = useMemo(() => clients.filter(c =>
        `${c.first_name} ${c.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.email.toLowerCase().includes(searchTerm.toLowerCase())
    ), [clients, searchTerm]);

    const paginatedClients = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredClients.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredClients, currentPage, itemsPerPage]);

    useEffect(() => {
        if (headerCheckboxRef.current) {
            const numSelected = selectedClientIds.size;
            const numPaginated = paginatedClients.length;
            headerCheckboxRef.current.checked = numSelected === numPaginated && numPaginated > 0;
            headerCheckboxRef.current.indeterminate = numSelected > 0 && numSelected < numPaginated;
        }
    }, [selectedClientIds, paginatedClients]);

    const totalPages = Math.ceil(filteredClients.length / itemsPerPage);

    const meetingDisplay = useMemo(() => {
        if (!nextAppointment) {
            return { dayLabel: 'Today', dateNumber: new Date().getDate(), month: new Date().toLocaleString('default', { month: 'long' }) };
        }
        const appointmentDate = new Date(nextAppointment.start_time);
        const today = new Date();
        const isToday = appointmentDate.toDateString() === today.toDateString();
        return {
            dayLabel: isToday ? 'Today' : appointmentDate.toLocaleDateString('en-US', { weekday: 'short' }),
            dateNumber: appointmentDate.getDate(),
            month: appointmentDate.toLocaleString('default', { month: 'long' })
        };
    }, [nextAppointment]);

    const clientStatusData = useMemo(() => {
        if (!stats.clients_by_onboarding_status) return { total: 0, statuses: [] };
        const data = stats.clients_by_onboarding_status;
        const total = data.reduce((sum, item) => sum + item.count, 0);
        const statusMap = {
            'Completed': { label: 'Completed', colorClass: 'active-blue' },
            'In-Progress': { label: 'In-Progress', colorClass: 'in-progress-cyan' },
            'Pending': { label: 'Pending', colorClass: 'pending-darkblue' }
        };
        const statuses = data.map(item => ({
            ...statusMap[item.onboarding_status as keyof typeof statusMap],
            count: item.count,
            percentage: total > 0 ? Math.round((item.count / total) * 100) : 0,
        }));
        return { total, statuses };
    }, [stats.clients_by_onboarding_status]);

    const filteredTierData = useMemo(() => {
        return stats.clients_by_tier?.filter(entry => entry.tier !== null) || [];
    }, [stats.clients_by_tier]);

    const handleSelectClient = (clientId: number) => {
        setSelectedClientIds(prevSelected => {
            const newSelected = new Set(prevSelected);
            if (newSelected.has(clientId)) {
                newSelected.delete(clientId);
            } else {
                newSelected.add(clientId);
            }
            return newSelected;
        });
    };

    const handleSelectAllClients = () => {
        if (selectedClientIds.size === paginatedClients.length) {
            setSelectedClientIds(new Set());
        } else {
            setSelectedClientIds(new Set(paginatedClients.map(c => c.id)));
        }
    };
    return (
        <>
            <AddClientModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} onClientAdded={handleClientAdded} />
            <StatusConfirmationModal isOpen={isStatusModalOpen} item={selectedClientForStatus} itemType="Client" onClose={() => setIsStatusModalOpen(false)} onConfirm={handleStatusChange} isSubmitting={isSubmitting} />
            <OnboardingConfirmationModal isOpen={isOnboardingModalOpen} client={selectedClientForOnboarding} onClose={() => setIsOnboardingModalOpen(false)} onConfirm={(client) => handleCompleteOnboarding(client as Client)} isSubmitting={isSubmitting} />

            <div className="client-list-page">


                <div className="dashboard-widgets-grid">
                    <div className="widget-card meetings-card-new">
                        <h3>Upcoming Meetings</h3>
                        <div className="meeting-details">
                            {nextAppointment ? (
                                <>
                                    <p className="meeting-client-name">Client: {nextAppointment.client_name}</p>
                                    <p className="meeting-title">Title: {nextAppointment.title}</p>
                                    <p className="meeting-time"> Time: {new Date(nextAppointment.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                </>
                            ) : (<p className="meeting-client-name">No Upcoming Meetings</p>)}
                        </div>
                        <div className="meeting-date-display">
                            <p className="date-day">Day: {meetingDisplay.dayLabel}</p>
                            <p className="date-number">Date: {meetingDisplay.dateNumber}</p>
                            <p className="date-month">Month: {meetingDisplay.month}</p>
                        </div>
                    </div>

                    <div className="widget-card">
                        <h3>Appointments</h3>
                        <ResponsiveContainer width="100%" height={180}>
                            <BarChart data={stats.appointments_weekly} margin={{ top: 20, right: 0, left: -10, bottom: 5 }}>
                                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#e0e0e0" />
                                <XAxis dataKey="day" axisLine={false} tickLine={false} style={{ fontSize: '12px', fill: '#666' }} />
                                <YAxis axisLine={false} tickLine={false} orientation="left" style={{ fontSize: '12px', fill: '#666' }}
                                    tickCount={3} interval="preserveStartEnd" domain={[0, (dataMax: number) => Math.max(20, dataMax + 5)]} />
                                <Tooltip cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }} contentStyle={{ borderRadius: '8px' }} />
                                <Bar dataKey="count" shape={<CustomBar />} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="widget-card tier-card-v2">
                        <h3>Tier</h3>
                        <div className="tier-widget-content-new">
                            <div className="tier-widget-legend-new">
                                {filteredTierData.map(entry => (
                                    <div key={entry.tier} className="legend-item-v2">
                                        <span className="legend-icon" style={{ backgroundColor: TIER_COLORS[entry.tier!] }}>
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" /></svg>
                                        </span>
                                        {entry.tier} - {entry.count}
                                    </div>
                                ))}
                            </div>
                            <ResponsiveContainer width="100%" height={150}>
                                <PieChart>
                                    <Pie data={filteredTierData} dataKey="count" nameKey="tier"
                                        cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={3}
                                        cornerRadius={5} label={renderCustomizedLabel} labelLine={false}
                                    >
                                        {filteredTierData.map((entry) => <Cell key={`cell-${entry.tier}`} fill={TIER_COLORS[entry.tier!] || '#cccccc'} />)}
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="widget-card">
                        <h3>Clients - Onboarding Status</h3>
                        <div className="client-status-widget-new">
                            {clientStatusData.statuses.map(status => (
                                <div className="progress-bar-group-new" key={status.label}>
                                    <div className="progress-label">
                                        <span>{status.count} ({status.label})</span>
                                        <span className="percentage-label">{status.percentage}%</span>
                                    </div>
                                    <div className="progress-bar-container">
                                        <div className={`progress-fill ${status.colorClass}`} style={{ width: `${status.percentage}%` }}></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="clients-section">
                    <header className="page-header">
                        <h2>Clients</h2>
                        <div className="header-actions">
                            <input type="search" placeholder="Search..." className="search-input" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                            <button className="add-client-button" onClick={() => setIsAddModalOpen(true)}>+ Add Client</button>
                        </div>
                    </header>
                    <div className="table-container">
                        <table className="clients-table">
                            <thead><tr><th>
                                
                                <input
                                    type="checkbox"
                                    ref={headerCheckboxRef}
                                    onChange={handleSelectAllClients}
                                />
                            </th><th>Client</th><th>Tier</th><th>Onboarding</th><th>Advisor</th><th>Next Appointment</th><th>Status</th></tr></thead>
                            <tbody>
                                {isLoading ? (<tr><td colSpan={7} className="loading-row">Loading...</td></tr>)
                                    : error ? (<tr><td colSpan={7} className="error-row">{error}</td></tr>)
                                        : (paginatedClients.map(client => (
                                            <tr key={client.id}>
                                                <td>
                                                    
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedClientIds.has(client.id)}
                                                        onChange={() => handleSelectClient(client.id)}
                                                    />
                                                </td>
                                                <td>
                                                    <Link to={`/clients/${client.id}`} className="client-info-link">
                                                        <div className="avatar">{client.first_name.charAt(0)}{client.last_name.charAt(0)}</div>
                                                        <div>
                                                            <div className="client-name">{client.first_name} {client.last_name}</div>
                                                            <div className="client-email">{client.email}</div>
                                                        </div>
                                                    </Link>
                                                </td>
                                                <td><TierDropdown client={client} onUpdate={handleTierUpdate} /></td>
                                                <td>
                                                    {client.onboarding_status === 'Pending' ? (<button className="status-button pending" onClick={() => { setSelectedClientForOnboarding(client); setIsOnboardingModalOpen(true); }}>Pending -&gt;</button>)
                                                        : (<StatusPill status={client.onboarding_status} />)}
                                                </td>
                                                <td>{client.advisor_name}</td>
                                                <td>{client.next_appointment || 'N/A'}</td>
                                                <td>
                                                    <button className={`status-button ${client.is_active ? 'active' : 'inactive'}`} onClick={() => { setSelectedClientForStatus(client); setIsStatusModalOpen(true); }}>
                                                        {client.is_active ? 'Active' : 'Inactive'}
                                                    </button>
                                                </td>
                                            </tr>
                                        )))}
                            </tbody>
                        </table>
                        <div className="pagination-controls">
                            <div className="per-page-selector"><span>Per page: </span><select value={itemsPerPage} onChange={(e) => setItemsPerPage(Number(e.target.value))}><option value={10}>10</option><option value={25}>25</option><option value={50}>50</option></select></div>
                            <span>{(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, filteredClients.length)} of {filteredClients.length}</span>
                            <div className="nav-buttons">
                                <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1}>Previous</button>
                                <button onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages}>Next</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default ClientListPage;