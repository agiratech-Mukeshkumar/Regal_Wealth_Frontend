import React, { useState, useEffect, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis } from 'recharts';
import { useAuth } from '../../auth/AuthContext';
import './AdvisorDashboard.css';

const apiUrl = process.env.REACT_APP_API_URL;

interface DashboardData {
  meetings_today: number;
  appointments_weekly: { day: string, count: number }[];
  clients_by_tier: { tier: string, count: number }[];
  clients_by_onboarding_status: { onboarding_status: string, count: number }[];
}

const StatCard: React.FC<{ title: string; value: string | number; subtext?: string }> = ({ title, value, subtext }) => (
    <div className="stat-card">
        <p className="stat-title">{title}</p>
        <p className="stat-value">{value}</p>
        {subtext && <p className="stat-subtext">{subtext}</p>}
    </div>
);


const AdvisorDashboard: React.FC = () => {
    const { token, user } = useAuth();
    const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
    const [error, setError] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            if (!token) return;
            setIsLoading(true);
            try {
                const response = await fetch(`${apiUrl}/api/advisor/dashboard/stats`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                if (!response.ok) {
                    const data = await response.json();
                    throw new Error(data.message || 'Failed to fetch dashboard data.');
                }
                const data: DashboardData = await response.json();
                setDashboardData(data);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [token]);

    const totalClients = useMemo(() => {
        if (!dashboardData) return 0;
        return dashboardData.clients_by_tier.reduce((sum, item) => sum + item.count, 0);
    }, [dashboardData]);
    
    const clientsInProgress = useMemo(() => {
        if (!dashboardData) return 0;
        const inProgress = dashboardData.clients_by_onboarding_status.find(
            status => status.onboarding_status === 'In-Progress'
        );
        return inProgress ? inProgress.count : 0;
    }, [dashboardData]);

    if (isLoading) {
        return <div className="dashboard-loading">Loading Dashboard...</div>;
    }

    if (error) {
        return <div className="dashboard-error">Error: {error}</div>;
    }

    if (!dashboardData) {
        return <div className="dashboard-loading">No dashboard data available.</div>;
    }

    const TIER_COLORS: { [key: string]: string } = {
        'Inner Circle': '#4338ca', 'Platinum': '#e5e7eb',
        'Gold': '#facc15', 'Bronze': '#d97706',
    };

    return (
        <div className="dashboard-layout">
            <header className="dashboard-header">
                <h1>Good Morning, {user?.first_name || 'Advisor'}</h1>
                <p>{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </header>
            
            <section className="stats-grid">
                <StatCard title="Total Clients" value={totalClients} />
                <StatCard title="Meetings Today" value={dashboardData.meetings_today} />
                <StatCard title="Clients In Progress" value={clientsInProgress} subtext="Onboarding status" />
            </section>

            <section className="charts-grid">
                <div className="chart-container">
                    <h3 className="chart-title">Clients by Tier</h3>
                    {/* --- THIS IS THE FIX --- */}
                    <div className="tier-chart-wrapper">
                        <ResponsiveContainer width="50%" height={250}>
                            <PieChart>
                                <Pie data={dashboardData.clients_by_tier} dataKey="count" nameKey="tier" cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5}>
                                    {(dashboardData.clients_by_tier || []).map((entry) => <Cell key={`cell-${entry.tier}`} fill={TIER_COLORS[entry.tier] || '#cccccc'} />)}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="custom-legend">
                            {(dashboardData.clients_by_tier || []).map(entry => (
                                <div key={entry.tier} className="legend-item">
                                    <span className="legend-color-dot" style={{ backgroundColor: TIER_COLORS[entry.tier] }}></span>
                                    {entry.tier} - {entry.count}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="chart-container">
                    <h3 className="chart-title">Appointments This Week</h3>
                     <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={dashboardData.appointments_weekly} margin={{ top: 20, right: 20, left: -10, bottom: 5 }}>
                            <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={12} />
                            <YAxis tickLine={false} axisLine={false} />
                            <Tooltip cursor={{fill: 'rgba(59, 130, 246, 0.1)'}} contentStyle={{ borderRadius: '8px' }} />
                            <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </section>
        </div>
    );
};

export default AdvisorDashboard;

