import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import AppointmentModal from './AppointmentModal';
import './ClientDetailPage.css';

const apiUrl = process.env.REACT_APP_API_URL;

interface AdvisorAppointment {
    start_time: string;
    end_time: string;
}
interface PersonalInfo {
    first_name: string;
    last_name: string;
    email: string;
    mobile_code: string;
    mobile_number: string;
    tier: string | null;
    onboarding_status: string;
    is_active: boolean;
}
interface SpouseInfo {
    first_name: string;
    last_name: string;
}
interface FamilyMember {
    full_name: string;
    relationship: string;
}
interface Financials {
    income: { source: string, owner: string, monthly_amount: number }[];
    assets: { asset_type: string, description: string, balance: number }[];
    liabilities: { liability_type: string, description: string, balance: number }[];
}
interface Document {
    id: number;
    document_name: string;
}
interface InvestorProfileItem {
    question: string;
    answer: string;
}
interface Appointment {
    id: number;
    title: string;
    start_time: string;
    end_time: string;
    status: string;
}
interface ClientSummary {
    id: number;
    personal_info: PersonalInfo;
    spouse_info: SpouseInfo | null;
    family_info: FamilyMember[];
    financials: Financials;
    documents: Document[];
    investor_profile: InvestorProfileItem[];
    appointments: Appointment[];
}
interface InvestorAnswer {
    selected: string[];
    details: { [key: string]: string };
}



const PdfViewerModal: React.FC<{ pdfUrl: string, onClose: () => void }> = ({ pdfUrl, onClose }) => (
    <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content pdf-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
                <h3>Document Viewer</h3>
                <button onClick={onClose} className="close-button">&times;</button>
            </div>
            <div className="pdf-viewer-container">
                <iframe src={pdfUrl} title="PDF Viewer" width="100%" height="100%"></iframe>
            </div>
        </div>
    </div>
);

const ClientDetailPage: React.FC = () => {
    const { clientId } = useParams<{ clientId: string }>();
    const { token } = useAuth();
    const [client, setClient] = useState<ClientSummary | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [viewingPdfUrl, setViewingPdfUrl] = useState<string | null>(null);
    const [existingAppointments, setExistingAppointments] = useState<AdvisorAppointment[]>([]);

    const fetchClient = useCallback(async () => {
        if (!token || !clientId) return;
        setIsLoading(true);
        try {
            const response = await fetch(`${apiUrl}/api/advisor/clients/${clientId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Failed to fetch client details.');
            const data: ClientSummary = await response.json();
            data.id = parseInt(clientId, 10);
            setClient(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [token, clientId]);

    useEffect(() => {
        const fetchAdvisorSchedule = async () => {
            if (!token) return;
            try {
                const response = await fetch('${apiUrl}/api/advisor/appointments', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (response.ok) {
                    const data = await response.json();
                    setExistingAppointments(data);
                }
            } catch (error) {
                console.error("Failed to fetch advisor's schedule:", error);
            }
        };

        fetchClient();
        fetchAdvisorSchedule();
    }, [fetchClient, token]);

    const financialTotals = useMemo(() => {
        if (!client) return { totalIncome: 0, totalAssets: 0, totalLiabilities: 0, netWorth: 0 };
        const totalIncome = client.financials.income.reduce((sum, item) => sum + Number(item.monthly_amount), 0);
        const totalAssets = client.financials.assets.reduce((sum, item) => sum + Number(item.balance), 0);
        const totalLiabilities = client.financials.liabilities.reduce((sum, item) => sum + Number(item.balance), 0);
        const netWorth = totalAssets - totalLiabilities;
        return { totalIncome, totalAssets, totalLiabilities, netWorth };
    }, [client]);
    
    const groupedAssets = useMemo(() => {
        if (!client) return {};
        return client.financials.assets.reduce((acc, asset) => {
            (acc[asset.asset_type] = acc[asset.asset_type] || []).push(asset);
            return acc;
        }, {} as { [key: string]: { description: string, balance: number }[] });
    }, [client]);

    const handleViewDocument = (docId: number) => {
        const url = `${apiUrl}/api/advisor/clients/${clientId}/documents/${docId}?token=${token}`;
        setViewingPdfUrl(url);
    };

    if (isLoading) return <div className="client-detail-page"><p>Loading client details...</p></div>;
    if (error) return <div className="client-detail-page"><p className="error-message">{error}</p></div>;
    if (!client) return <div className="client-detail-page"><p>No client data found.</p></div>;

    return (
        <>
            {viewingPdfUrl && <PdfViewerModal pdfUrl={viewingPdfUrl} onClose={() => setViewingPdfUrl(null)} />}
            <AppointmentModal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    fetchClient();
                }}
                client={{
                    id: client.id,
                    first_name: client.personal_info.first_name,
                    last_name: client.personal_info.last_name,
                }}
                existingAppointments={existingAppointments}
            />
            <div className="client-detail-page">
                <header className="page-header">
                    <h2>{client.personal_info.first_name} {client.personal_info.last_name}</h2>
                    <button className="schedule-button" onClick={() => setIsModalOpen(true)}>
                        Schedule Appointment
                    </button>
                </header>

                <div className="detail-cards-grid">
                    <div className="detail-card">
                        <h3>Contact Information</h3>
                        <p><strong>Email:</strong> {client.personal_info.email}</p>
                        <p><strong>Mobile:</strong> {client.personal_info.mobile_code} {client.personal_info.mobile_number}</p>
                        {client.spouse_info && <p><strong>Spouse:</strong> {client.spouse_info.first_name} {client.spouse_info.last_name}</p>}
                    </div>
                    <div className="detail-card">
                        <h3>Profile Status</h3>
                        <p><strong>Tier:</strong> {client.personal_info.tier || 'N/A'}</p>
                        <p><strong>Onboarding:</strong> {client.personal_info.onboarding_status}</p>
                        <p><strong>Account:</strong> {client.personal_info.is_active ? 'Active' : 'Inactive'}</p>
                    </div>
                    <div className="detail-card summary-card">
                        <h3>Financial Snapshot</h3>
                        <p><strong>Monthly Income:</strong> ${financialTotals.totalIncome.toLocaleString()}</p>
                        <p><strong>Total Assets:</strong> ${financialTotals.totalAssets.toLocaleString()}</p>
                        <p><strong>Total Liabilities:</strong> ${financialTotals.totalLiabilities.toLocaleString()}</p>
                        <p className="net-worth"><strong>Net Worth:</strong> ${financialTotals.netWorth.toLocaleString()}</p>
                    </div>
                </div>

                <div className="full-details-section">
                    <h3>Fact Finder Summary</h3>

                    <div className="summary-table-container">
                        <h4>Personal & Spouse</h4>
                        <table className="summary-table">
                            <tbody>
                                <tr><td>Client Name</td><td>{client.personal_info.first_name} {client.personal_info.last_name}</td></tr>
                                {client.spouse_info && <tr><td>Spouse Name</td><td>{client.spouse_info.first_name} {client.spouse_info.last_name}</td></tr>}
                            </tbody>
                        </table>
                    </div>

                    {client.family_info && client.family_info.length > 0 && (
                        <div className="summary-table-container">
                            <h4>Family Members</h4>
                            <table className="summary-table">
                                <tbody>
                                    {client.family_info.map((item, i) => <tr key={i}><td>{item.relationship}</td><td>{item.full_name}</td></tr>)}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {client.investor_profile && client.investor_profile.length > 0 && (
                        <div className="summary-table-container">
                            <h4>Investor Profile</h4>
                            <table className="summary-table">
                                <tbody>
                                    {client.investor_profile.map((item, i) => {
                                        let parsedAnswer: InvestorAnswer;
                                        try {
                                            parsedAnswer = JSON.parse(item.answer);
                                        } catch {
                                            return <tr key={i}><td>{item.question}</td><td>{item.answer}</td></tr>;
                                        }
                                        if (!parsedAnswer.selected || parsedAnswer.selected.length === 0) return null;
                                        
                                        return (
                                            <tr key={i}>
                                                <td>{item.question}</td>
                                                <td>
                                                    <ul className="summary-answer-list-advisor">
                                                        {parsedAnswer.selected.map(selection => (
                                                            <li key={selection}>
                                                                {selection}
                                                                {parsedAnswer.details?.[selection] && (
                                                                    <span className="summary-detail-text-advisor">: {parsedAnswer.details[selection]}</span>
                                                                )}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

                    <div className="summary-table-container">
                        <h4>Financials</h4>
                        <h5>Income</h5>
                        <table className="summary-table">
                            <tbody>
                                {client.financials.income.map((item, i) => <tr key={i}><td>{item.owner}'s {item.source}</td><td>${item.monthly_amount.toLocaleString()}</td></tr>)}
                            </tbody>
                        </table>

                        <h5>Assets</h5>
                        {Object.entries(groupedAssets).map(([assetType, assets]) => (
                            <React.Fragment key={assetType}>
                                <h6 className="financials-subtitle">{assetType}</h6>
                                <table className="summary-table sub-table">
                                    <tbody>
                                        {assets.map((item, i) => <tr key={i}><td>{item.description}</td><td>${item.balance.toLocaleString()}</td></tr>)}
                                    </tbody>
                                </table>
                            </React.Fragment>
                        ))}
                        
                        <h5>Liabilities</h5>
                        <table className="summary-table">
                            <tbody>
                                {client.financials.liabilities.map((item, i) => <tr key={i}><td>{item.liability_type}</td><td>${item.balance.toLocaleString()}</td></tr>)}
                            </tbody>
                        </table>
                    </div>

                    <div className="summary-table-container">
                        <h4>Documents</h4>
                        <table className="summary-table">
                            <tbody>
                                {client.documents.map(doc => (
                                    <tr key={doc.id}>
                                        <td>{doc.document_name}</td>
                                        <td><button className="view-doc-button" onClick={() => handleViewDocument(doc.id)}>View Document</button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="summary-table-container">
                        <h4>Appointments</h4>
                        <table className="summary-table">
                            <thead>
                                <tr>
                                    <th>Title</th>
                                    <th>Date</th>
                                    <th>Time</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {client.appointments && client.appointments.length > 0 ? (
                                    client.appointments.map(appt => (
                                        <tr key={appt.id}>
                                            <td>{appt.title}</td>
                                            <td>{new Date(appt.start_time).toLocaleDateString(undefined, {
                                                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                                            })}</td>
                                            <td>
                                                {new Date(appt.start_time).toLocaleTimeString([], {
                                                    hour: '2-digit', minute: '2-digit', hour12: true
                                                })} -
                                                {new Date(appt.end_time).toLocaleTimeString([], {
                                                    hour: '2-digit', minute: '2-digit', hour12: true
                                                })}
                                            </td>
                                            <td>{appt.status}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr><td colSpan={4}>No appointments scheduled.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </>
    );
};

export default ClientDetailPage;