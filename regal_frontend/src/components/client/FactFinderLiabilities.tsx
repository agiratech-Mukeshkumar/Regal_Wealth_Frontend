import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { useNavigate } from 'react-router-dom';
import './FactFinder.css';


interface FormField {
    id: number;
    field_label: string;
    field_type: 'Currency' | 'Number' | 'Text' | 'Select' | 'Checkbox';
    is_active: boolean;
    parent_field_id: number | null;
    sub_fields: FormField[];
}

interface SavedLiability {
    liability_type: string;
    balance: number;
}

const generateFieldName = (label: string) => {
    return label.toLowerCase().replace(/[^a-z0-9]/g, '_');
};

const FactFinderLiabilities: React.FC = () => {
    const { token } = useAuth();
    const navigate = useNavigate();
    
    const [formSchema, setFormSchema] = useState<FormField[]>([]);
    const [formData, setFormData] = useState<{ [key: string]: string }>({});
    
    const [isLoading, setIsLoading] = useState(false);
    const [isFetching, setIsFetching] = useState(true);
    const [error, setError] = useState('');

    const fetchPageData = useCallback(async () => {
        if (!token) return;
        setIsFetching(true);
        setError('');
        try {
            const [formRes, dataRes] = await Promise.all([
                fetch(`http://localhost:5000/api/client/forms/liabilities`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch(`http://localhost:5000/api/client/profile/liabilities`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
            ]);

            if (!formRes.ok) throw new Error('Failed to load form structure.');
            const schema: FormField[] = await formRes.json();
            setFormSchema(schema);

            if (dataRes.ok) {
                const savedData: SavedLiability[] = await dataRes.json();
                if (savedData.length > 0) {
                    const prefilledData = savedData.reduce((acc, item) => {
                        const fieldName = generateFieldName(item.liability_type);
                        acc[fieldName] = String(item.balance);
                        return acc;
                    }, {} as { [key: string]: string });
                    setFormData(prefilledData);
                }
            }
        } catch (err: any) {
            setError("Could not load page data.");
        } finally {
            setIsFetching(false);
        }
    }, [token]);

    useEffect(() => {
        fetchPageData();
    }, [fetchPageData]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        if (value && !/^\d*\.?\d*$/.test(value)) return;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const totalLiabilities = useMemo(() => {
        return Object.values(formData).reduce((sum, val) => sum + (Number(val) || 0), 0);
    }, [formData]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        const mainSection = formSchema.find(section => section.parent_field_id === null);
        if (!mainSection) {
            setError("Form structure invalid.");
            setIsLoading(false);
            return;
        }

        const liabilitiesPayload = mainSection.sub_fields
            .map(field => {
                const fieldName = generateFieldName(field.field_label);
                const balance = Number(formData[fieldName]) || 0;
                if (balance > 0) {
                    return {
                        liability_type: field.field_label,
                        description: field.field_label, 
                        balance: balance.toFixed(2)
                    };
                }
                return null;
            })
            .filter(Boolean);

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
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };
    
    if (isFetching) {
        return <div className="fact-finder-page"><h2>Loading...</h2></div>;
    }

    const liabilitiesSection = formSchema.find(section => section.parent_field_id === null);

    return (
        <div className="fact-finder-page">
            <div className="wizard-header">
                <h2>Let's capture your financial commitments.</h2>
                <p>From mortgages to personal loans, understanding your liabilities helps us build accurate, personalized financial recommendations.</p>
            </div>
            <form onSubmit={handleSubmit} className="wizard-form">
                <div className="form-section">
                    <h4>{liabilitiesSection?.field_label || 'Liabilities'}</h4>
                    <div className="liabilities-grid">
                        {liabilitiesSection && liabilitiesSection.sub_fields.length > 0 ? (
                            liabilitiesSection.sub_fields.map(field => {
                                if (!field.is_active) return null;
                                const fieldName = generateFieldName(field.field_label);
                                return (
                                    <div key={field.id} className="form-group">
                                        <label htmlFor={fieldName}>{field.field_label}</label>
                                        <input 
                                            id={fieldName}
                                            type="text"
                                            inputMode="decimal"
                                            name={fieldName}
                                            value={formData[fieldName] || ''}
                                            onChange={handleChange} 
                                            placeholder="$0.00" 
                                        />
                                    </div>
                                );
                            })
                        ) : (
                            <p>No liability fields have been configured.</p>
                        )}
                    </div>
                </div>

                <div className="totals-section">
                    <div className="form-group">
                        <label>Total Liabilities</label>
                        <p className="total-display-field">${totalLiabilities.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>
                </div>

                <div className="form-actions">
                    <button type="button" className="secondary-button" onClick={() => navigate('/fact-finder/assets')}>Back</button>
                    <button type="submit" className="continue-button" disabled={isLoading}>
                        {isLoading ? 'Saving...' : 'Continue'}
                    </button>
                </div>
                {error && <p className="form-message error-text">{error}</p>}
            </form>
        </div>
    );
};

export default FactFinderLiabilities;