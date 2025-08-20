import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useNavigate } from 'react-router-dom';
import './FactFinder.css';

interface FormField {
    id: number;
    field_label: string;
    field_type: 'Number'; // For this form, we only expect Number type
}

const FactFinderLiabilities: React.FC = () => {
    const { token } = useAuth();
    const navigate = useNavigate();
    
    const [formFields, setFormFields] = useState<FormField[]>([]);
    const [liabilitiesData, setLiabilitiesData] = useState<{ [key: string]: string }>({});
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        const fetchFormStructure = async () => {
            if (!token) return;
            try {
                const response = await fetch(`http://localhost:5000/api/client/forms/liabilities`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const fields: FormField[] = await response.json();
                setFormFields(fields);
            } catch (error) {
                console.error("Failed to fetch form structure", error);
            }
        };
        fetchFormStructure();
    }, [token]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setLiabilitiesData(prev => ({ ...prev, [name]: value }));
    };

    const totalLiabilities = useMemo(() => {
        return Object.values(liabilitiesData).reduce((sum, val) => sum + (Number(val) || 0), 0);
    }, [liabilitiesData]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage('');

        // Transform the state object into the array format the backend expects
        const liabilitiesPayload = Object.entries(liabilitiesData)
            .filter(([key, value]) => Number(value) > 0)
            .map(([key, value]) => ({
                liability_type: key.replace(/_/g, ' '),
                description: key.replace(/_/g, ' '),
                balance: value
            }));

        try {
            const response = await fetch('http://localhost:5000/api/client/profile/liabilities', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ liabilities: liabilitiesPayload })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message);
            navigate('/fact-finder/documents');
        } catch (err: any) {
            setMessage(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fact-finder-page">
            <div className="wizard-header">
                <h2>Let's capture your financial commitments.</h2>
                <p>From mortgages to personal loans, understanding your liabilities helps us build accurate, personalized financial recommendations.</p>
            </div>
            <form onSubmit={handleSubmit} className="wizard-form">
                <div className="form-section">
                    <h4>Liabilities</h4>
                    <div className="liabilities-grid">
                        {formFields.map(field => (
                            <div key={field.id} className="form-group">
                                <label>{field.field_label}*</label>
                                <input 
                                    type="number" 
                                    name={field.field_label.toLowerCase().replace(/\(s\)| /g, '_')}
                                    value={liabilitiesData[field.field_label.toLowerCase().replace(/\(s\)| /g, '_')] || ''}
                                    onChange={handleChange} 
                                    placeholder="$" 
                                />
                            </div>
                        ))}
                    </div>
                </div>

                <div className="totals-section">
                    <div className="form-group">
                        <label>Total Liabilities</label>
                        <input type="text" value={`$${totalLiabilities.toLocaleString()}`} readOnly className="total-input" />
                    </div>
                </div>

                <div className="form-actions">
                    <button type="button" className="secondary-button" onClick={() => navigate('/fact-finder/assets')}>Back</button>
                    <button type="submit" className="continue-button" disabled={isLoading}>
                        {isLoading ? 'Saving...' : 'Continue'}
                    </button>
                </div>
                {message && <p className="form-message">{message}</p>}
            </form>
        </div>
    );
};

export default FactFinderLiabilities;
