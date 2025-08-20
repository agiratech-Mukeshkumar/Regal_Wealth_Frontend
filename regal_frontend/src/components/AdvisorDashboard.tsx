import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { useAuth } from '../auth/AuthContext'; // 1. IMPORT the useAuth hook
import './AdvisorDashboard.css';

interface TierStat {
  tier: string;
  count: number;
}

interface DashboardData {
  total_clients: number;
  clients_by_tier: TierStat[];
}

// Reusable Stat Card Component
const StatCard: React.FC<{ title: string; value: string | number }> = ({ title, value }) => (
    <div className="stat-card">
        <p className="stat-title">{title}</p>
        <p className="stat-value">{value}</p>
    </div>
);

// Donut Chart for Client Tiers
const ClientTierChart: React.FC<{ data: TierStat[] }> = ({ data }) => {
    const COLORS = ['#003f5c', '#58508d', '#bc5090', '#ff6361', '#ffa600'];
    const chartData = data.map(item => ({...item, tier: item.tier ? item.tier.charAt(0).toUpperCase() + item.tier.slice(1) : 'N/A' }));

    return (
        <div className="chart-container">
            <h3 className="chart-title">Clients by Tier</h3>
            <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                    <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        fill="#8884d8"
                        paddingAngle={5}
                        dataKey="count"
                        nameKey="tier"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                    >
                        {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
};


// Main Dashboard Page Component
const AdvisorDashboard: React.FC = () => {
    const { token } = useAuth(); // 2. GET the token from the AuthContext
    const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
    const [error, setError] = useState<string>('');

    useEffect(() => {
        const fetchData = async () => {
            if (!token) {
                // Don't fetch if the token hasn't been loaded from localStorage yet
                return;
            }
            try {
                // 3. USE the real token in the Authorization header
                const response = await fetch('http://localhost:5000/api/advisor/dashboard/stats', {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                
                if (!response.ok) {
                    const data = await response.json();
                    throw new Error(data.message || 'Failed to fetch dashboard data.');
                }
                const data: DashboardData = await response.json();
                setDashboardData(data);
            } catch (err: any) {
                setError(err.message);
            }
        };

        fetchData();
    }, [token]); // 4. ADD token as a dependency to run the effect when it's available

    if (error) {
        return <div className="dashboard-error">Error: {error}</div>;
    }

    if (!dashboardData) {
        return <div className="dashboard-loading">Loading Dashboard...</div>;
    }

    return (
        // ... your JSX remains the same ...
        <div className="dashboard-layout">
            <main className="main-content">
                <header className="dashboard-header">
                    <h1>Good Morning, Andy</h1>
                    <p>Monday, August 11, 2025</p>
                </header>
                
                <section className="stats-grid">
                    <StatCard title="Total Clients" value={dashboardData.total_clients} />
                    <StatCard title="Upcoming Meetings" value="12" />
                    <StatCard title="Pending Tasks" value="5" />
                </section>

                <section className="charts-grid">
                    <ClientTierChart data={dashboardData.clients_by_tier} />
                </section>
            </main>
        </div>
    );
};

export default AdvisorDashboard;
