import React, {useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useNavigate } from 'react-router-dom';
import './FactFinder.css';

// --- Expanded Interface Definitions to match the full API response ---
interface PersonalInfo {
    first_name: string;
    last_name: string;
    email: string;
    phone_number: string;
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
interface ClientProfile {
    personal_info: PersonalInfo;
    spouse_info: SpouseInfo | null;
    family_info: FamilyMember[];
    investor_profile: InvestorProfileItem[];
    income: IncomeItem[];
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
                const response = await fetch('http://localhost:5000/api/client/profile', {
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
            const response = await fetch('http://localhost:5000/api/client/profile/submit', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message);
            setSuccessMessage(data.message);
        } catch (err: any)
{
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
    
    // --- THIS IS THE FIX ---
    // We check if the profile object exists before trying to render its contents.
    if (!profile) {
        return <div className="fact-finder-page">No profile data found.</div>;
    }

    return (
        <div className="fact-finder-page summary-page-layout">
            <div className="summary-content">
                {/* --- Personal Info Section --- */}
                <div className="summary-section">
                    <div className="summary-header"><h4>Personal Information</h4><button onClick={() => navigate('/fact-finder/personal-info')} className="edit-button">Edit</button></div>
                    <div className="summary-grid"><p>Full Name</p><p>: {profile.personal_info.first_name} {profile.personal_info.last_name}</p></div>
                    <div className="summary-grid"><p>Email</p><p>: {profile.personal_info.email}</p></div>
                    <div className="summary-grid"><p>Mobile Number</p><p>: {profile.personal_info.phone_number}</p></div>
                </div>

                {/* --- Spouse Info Section (conditionally rendered) --- */}
                {profile.spouse_info && (
                    <div className="summary-section">
                        <div className="summary-header"><h4>Spouse Information</h4><button onClick={() => navigate('/fact-finder/spouse-info')} className="edit-button">Edit</button></div>
                        <div className="summary-grid"><p>Full Name</p><p>: {profile.spouse_info.first_name} {profile.spouse_info.last_name}</p></div>
                        <div className="summary-grid"><p>Mobile Number</p><p>: {profile.spouse_info.mobile_number}</p></div>
                        <div className="summary-grid"><p>Email</p><p>: {profile.spouse_info.email}</p></div>
                    </div>
                )}

                {/* --- Family Info Section --- */}
                {profile.family_info && profile.family_info.length > 0 && (
                     <div className="summary-section">
                        <div className="summary-header"><h4>Family Info</h4><button onClick={() => navigate('/fact-finder/family-info')} className="edit-button">Edit</button></div>
                        {profile.family_info.filter(m => m.relationship === 'Child').map((member, index) => (
                            <React.Fragment key={index}>
                                <div className="summary-grid"><p>Children Name</p><p>: {member.full_name}</p></div>
                                <div className="summary-grid"><p>Children DOB</p><p>: {member.date_of_birth}</p></div>
                                <div className="summary-grid"><p>Children State</p><p>: {member.resident_state}</p></div>
                            </React.Fragment>
                        ))}
                    </div>
                )}

                {/* --- Investor Profile Section --- */}
                {profile.investor_profile && profile.investor_profile.length > 0 && (
                     <div className="summary-section">
                        <div className="summary-header"><h4>Investor Profile</h4><button onClick={() => navigate('/fact-finder/investor-profile')} className="edit-button">Edit</button></div>
                        {profile.investor_profile.map((item, index) => (
                            <div key={index} className="summary-grid"><p>{item.question}</p><p>: {item.answer}</p></div>
                        ))}
                    </div>
                )}

                {/* --- Income Section --- */}
                {profile.income && profile.income.length > 0 && (
                     <div className="summary-section">
                        <div className="summary-header"><h4>Income</h4><button onClick={() => navigate('/fact-finder/income')} className="edit-button">Edit</button></div>
                        {profile.income.map((item, index) => (
                            <div key={index} className="summary-grid"><p>{item.owner}'s {item.source}</p><p>: ${item.monthly_amount.toLocaleString()}</p></div>
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
