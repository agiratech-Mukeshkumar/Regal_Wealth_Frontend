import React, { useState, useEffect } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { useNavigate } from 'react-router-dom';
import './FactFinder.css';

const apiUrl = process.env.REACT_APP_API_URL;
// --- Interface Definitions ---
interface PersonalInfo {
    first_name: string;
    last_name: string;
    email: string;
    mobile_country: string | null;
    mobile_code: string | null;
    mobile_number: string | null;
}
interface SpouseInfo {
    first_name: string;
    last_name: string;
    mobile_number: string;
    email: string;
}
interface FamilyMember {
    full_name: string;
    date_of_birth: string;
    resident_state: string;
    relationship: string;
}
interface InvestorProfileItem {
    question: string;
    answer: string;
}
interface IncomeItem {
    source: string;
    owner: string;
    monthly_amount: number;
}
interface DocumentItem {
    id: number;
    document_name: string;
}
interface AssetItem {
    asset_type: string;
    description: string;
    owner: string;
    balance: number;
}
interface LiabilityItem {
    liability_type: string;
    description: string;
    balance: number;
}
interface ClientProfile {
    personal_info: PersonalInfo;
    spouse_info: SpouseInfo | null;
    family_info: FamilyMember[];
    investor_profile: InvestorProfileItem[];
    income: IncomeItem[];
    documents: DocumentItem[];
    assets: AssetItem[];
    liabilities: LiabilityItem[];
}
interface InvestorAnswer {
    selected: string[];
    details: { [key: string]: string };
}

const FactFinderSummary: React.FC = () => {
    const { token } = useAuth();
    const navigate = useNavigate();
    const [profile, setProfile] = useState<ClientProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    useEffect(() => {
        const fetchProfile = async () => {
            if (!token) return;
            try {
                const response = await fetch(`${apiUrl}/api/client/profile`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!response.ok) throw new Error('Failed to load summary data.');
                const data: ClientProfile = await response.json();
                setProfile(data);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };
        fetchProfile();
    }, [token]);

    const handleSubmit = async () => {
        setIsSubmitting(true);
        setError('');
        try {
            const response = await fetch(`${apiUrl}/api/client/profile/submit`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message);
            setSuccessMessage(data.message);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) return <div className="fact-finder-page">Loading your summary...</div>;
    if (error) return <div className="fact-finder-page error-message">{error}</div>;
    if (successMessage) {
        return (
            <div className="fact-finder-page">
                <div className="wizard-header">
                    <h2>Thank you for submitting your details!</h2>
                    <p>{successMessage}</p>
                </div>
            </div>
        );
    }
    
    if (!profile || !profile.personal_info) {
        return <div className="fact-finder-page">No profile data found.</div>;
    }

    const formatMobileNumber = (info: PersonalInfo) => {
        if (!info.mobile_number) return 'N/A';
        return `${info.mobile_code || ''} ${info.mobile_number}`;
    };
    
    const groupedAssets = profile.assets.reduce((acc, asset) => {
      (acc[asset.asset_type] = acc[asset.asset_type] || []).push(asset);
      return acc;
    }, {} as { [key: string]: AssetItem[] });

    return (
        <div className="fact-finder-page summary-page-layout">
            <div className="summary-content">
                <div className="wizard-header">
                    <h2>Summary</h2>
                    <p>Please review all your information for accuracy before submitting.</p>
                </div>

                {/*  Personal Info Section  */}
                <div className="summary-section">
                    <div className="summary-header"><h4>Personal Information</h4><button onClick={() => navigate('/fact-finder/personal-info')} className="edit-button">Edit</button></div>
                    <div className="summary-grid"><p>Full Name</p><p>: {profile.personal_info.first_name} {profile.personal_info.last_name}</p></div>
                    <div className="summary-grid"><p>Email</p><p>: {profile.personal_info.email}</p></div>
                    <div className="summary-grid"><p>Mobile Number</p><p>: {formatMobileNumber(profile.personal_info)}</p></div>
                </div>

                {/*  Spouse Info Section  */}
                {profile.spouse_info && (
                    <div className="summary-section">
                        <div className="summary-header"><h4>Spouse Information</h4><button onClick={() => navigate('/fact-finder/spouse-info')} className="edit-button">Edit</button></div>
                        <div className="summary-grid"><p>Full Name</p><p>: {profile.spouse_info.first_name} {profile.spouse_info.last_name}</p></div>
                        <div className="summary-grid"><p>Mobile Number</p><p>: {profile.spouse_info.mobile_number}</p></div>
                        <div className="summary-grid"><p>Email</p><p>: {profile.spouse_info.email}</p></div>
                    </div>
                )}

                {/*  Family Info Section  */}
                {profile.family_info && profile.family_info.length > 0 && (
                     <div className="summary-section">
                        <div className="summary-header"><h4>Family Info</h4><button onClick={() => navigate('/fact-finder/family-info')} className="edit-button">Edit</button></div>
                        {profile.family_info.map((member, index) => (
                            <div key={index} className="summary-item-block">
                                <p className="summary-question">{member.relationship} - {member.full_name}</p>
                                <div className="summary-grid sub-item"><p>Date of Birth</p><p>: {member.date_of_birth}</p></div>
                                <div className="summary-grid sub-item"><p>Resident State</p><p>: {member.resident_state}</p></div>
                            </div>
                        ))}
                    </div>
                )}

                {/*  Investor Profile Section  */}
                {profile.investor_profile && profile.investor_profile.length > 0 && (
                     <div className="summary-section">
                        <div className="summary-header"><h4>Investor Profile</h4><button onClick={() => navigate('/fact-finder/investor-profile')} className="edit-button">Edit</button></div>
                        {profile.investor_profile.map((item, index) => {
                            let parsedAnswer: InvestorAnswer;
                            try {
                                parsedAnswer = JSON.parse(item.answer);
                            } catch {
                                return <div key={index} className="summary-grid"><p>{item.question}</p><p>: {item.answer}</p></div>;
                            }
                            if (!parsedAnswer.selected || parsedAnswer.selected.length === 0) return null;
                            return (
                                <div key={index} className="summary-item-block">
                                    <p className="summary-question">{item.question}</p>
                                    <ul className="summary-answer-list">
                                        {parsedAnswer.selected.map(selection => (
                                            <li key={selection}>
                                                {selection}
                                                {parsedAnswer.details?.[selection] && (
                                                    <span className="summary-detail-text">: {parsedAnswer.details[selection]}</span>
                                                )}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/*  Income Section  */}
                {profile.income && profile.income.length > 0 && (
                     <div className="summary-section">
                        <div className="summary-header"><h4>Income</h4><button onClick={() => navigate('/fact-finder/income')} className="edit-button">Edit</button></div>
                        {profile.income.map((item, index) => (
                            <div key={index} className="summary-grid"><p>{item.owner}'s {item.source}</p><p>: ${item.monthly_amount.toLocaleString()}</p></div>
                        ))}
                    </div>
                )}
                
                {/*  Assets Section  */}
                {profile.assets && profile.assets.length > 0 && (
                     <div className="summary-section">
                        <div className="summary-header"><h4>Assets</h4><button onClick={() => navigate('/fact-finder/assets')} className="edit-button">Edit</button></div>
                        {Object.entries(groupedAssets).map(([assetType, assets]) => (
                            <div key={assetType} className="summary-item-block">
                                <p className="summary-question">{assetType}</p>
                                {assets.map((item, index) => (
                                    <div key={index} className="summary-grid sub-item"><p>{item.description || 'N/A'}</p><p>: ${item.balance.toLocaleString()}</p></div>
                                ))}
                            </div>
                        ))}
                    </div>
                )}

                {/*  Liabilities Section */}
                {profile.liabilities && profile.liabilities.length > 0 && (
                     <div className="summary-section">
                        <div className="summary-header"><h4>Liabilities</h4><button onClick={() => navigate('/fact-finder/liabilities')} className="edit-button">Edit</button></div>
                        {profile.liabilities.map((item, index) => (
                            <div key={index} className="summary-grid"><p>{item.liability_type}</p><p>: ${item.balance.toLocaleString()}</p></div>
                        ))}
                    </div>
                )}

                {/*  Documents Section  */}
                {profile.documents && profile.documents.length > 0 && (
                     <div className="summary-section">
                        <div className="summary-header"><h4>Documents</h4><button onClick={() => navigate('/fact-finder/documents')} className="edit-button">Edit</button></div>
                        {profile.documents.map((doc, index) => (
                            <div key={index} className="summary-grid"><p>Document</p><p>: {doc.document_name}</p></div>
                        ))}
                    </div>
                )}
                
                <div className="form-actions" style={{ justifyContent: 'space-between', marginTop: '2rem' }}>
                    <button type="button" className="secondary-button" onClick={() => navigate('/fact-finder/documents')}>Back</button>
                    <button onClick={handleSubmit} className="continue-button" disabled={isSubmitting}>
                        {isSubmitting ? 'Submitting...' : 'Submit'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FactFinderSummary;