import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext'; // 1. IMPORT the useAuth hook
import './ClientDetailPage.css';

// --- Interface Definitions ---
interface Financials {
    income: any[];
    assets: any[];
    liabilities: any[];
}

interface ClientDetail {
    personal_info: { first_name: string; last_name: string; email: string; phone_number: string };
    spouse_info: any;
    family_info: any[];
    investor_profile: { question: string, answer: string }[];
    financials: Financials;
    documents: any[];
}

// --- Reusable Components ---
const InfoCard: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="info-card">
        <div className="card-header">
            <h3>{title}</h3>
            <button className="edit-button">Edit</button>
        </div>
        <div className="card-content">
            {children}
        </div>
    </div>
);

// --- Main Component ---
const ClientDetailPage: React.FC = () => {
    const { token } = useAuth(); // 2. GET the token from context
    const { clientId } = useParams<{ clientId: string }>();
    const [clientData, setClientData] = useState<ClientDetail | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchClientDetails = async () => {
            if (!clientId || !token) return; // Don't fetch if token or ID isn't ready
            setIsLoading(true);
            try {
                // 3. USE the real token in the fetch call
                const response = await fetch(`http://localhost:5000/api/advisor/clients/${clientId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!response.ok) throw new Error('Failed to fetch client details.');
                const data = await response.json();
                setClientData(data);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };
        fetchClientDetails();
    }, [clientId, token]); // 4. ADD token as a dependency

    if (isLoading) return <div className="page-status">Loading client details...</div>;
    if (error) return <div className="page-status error">{error}</div>;
    if (!clientData) return <div className="page-status">No client data found.</div>;

    const { personal_info, investor_profile } = clientData;

    return (
        <div className="client-detail-page">
            <header className="detail-header">
                <h1>{personal_info.first_name} {personal_info.last_name}</h1>
                <p>{personal_info.email}</p>
            </header>
            
            <div className="details-grid">
                <InfoCard title="Personal Information">
                    <p><strong>Full Name:</strong> {personal_info.first_name} {personal_info.last_name}</p>
                    <p><strong>Email:</strong> {personal_info.email}</p>
                    <p><strong>Phone:</strong> {personal_info.phone_number}</p>
                </InfoCard>

                <InfoCard title="Investor Profile">
                    {investor_profile.map((item, index) => (
                        <p key={index}><strong>{item.question}:</strong> {item.answer}</p>
                    ))}
                </InfoCard>

                {/* Add more InfoCard components for spouse, family, assets, etc. */}
            </div>
        </div>
    );
};

export default ClientDetailPage;
