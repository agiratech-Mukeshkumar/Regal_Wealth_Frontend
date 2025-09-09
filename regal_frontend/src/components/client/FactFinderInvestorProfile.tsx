import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { useNavigate } from 'react-router-dom';
import './FactFinder.css';

const apiUrl = process.env.REACT_APP_API_URL;
interface FormOption {
    id: number;
    option_label: string;
    details_field_label: string | null;
}
interface FormField {
    id: number;
    field_label: string;
    field_type: 'Checkbox' | 'MultipleChoice';
    options: FormOption[];
}
interface Answer {
    selected: string[];
    details: { [key: string]: string };
}

const FactFinderInvestorProfile: React.FC = () => {
    const { token } = useAuth();
    const navigate = useNavigate();
    const [formSchema, setFormSchema] = useState<FormField[]>([]);
    const [answers, setAnswers] = useState<{ [key: number]: Answer }>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const fetchPageData = useCallback(async () => {
        if (!token) return;
        setIsLoading(true);
        try {
            const [formRes, answersRes] = await Promise.all([
                fetch(`${apiUrl}/api/client/forms/investor-profile`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch(`${apiUrl}/api/client/profile/questionnaire`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
            ]);

            if (!formRes.ok) throw new Error('Failed to load form questions.');
            const schema: FormField[] = await formRes.json();
            setFormSchema(schema);

            if (answersRes.ok) {
                const savedAnswers: { form_field_id: number; answer: string }[] = await answersRes.json();
                const initialAnswers: { [key: number]: Answer } = {};
                savedAnswers.forEach(saved => {
                    try {
                        initialAnswers[saved.form_field_id] = JSON.parse(saved.answer);
                    } catch {
                        initialAnswers[saved.form_field_id] = { selected: [], details: {} };
                    }
                });
                setAnswers(initialAnswers);
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [token]);

    useEffect(() => {
        fetchPageData();
    }, [fetchPageData]);

    const handleSelectionChange = (fieldId: number, optionLabel: string, fieldType: FormField['field_type']) => {
        setAnswers(prev => {
            const currentAnswer = prev[fieldId] || { selected: [], details: {} };
            let newSelected: string[];

            if (fieldType === 'MultipleChoice') {
                newSelected = [optionLabel];
            } else { 
                newSelected = currentAnswer.selected.includes(optionLabel)
                    ? currentAnswer.selected.filter(item => item !== optionLabel)
                    : [...currentAnswer.selected, optionLabel];
            }
            return { ...prev, [fieldId]: { ...currentAnswer, selected: newSelected } };
        });
    };

    const handleDetailChange = (fieldId: number, optionLabel: string, value: string) => {
        setAnswers(prev => {
            const currentAnswer = prev[fieldId] || { selected: [], details: {} };
            const newDetails = { ...currentAnswer.details, [optionLabel]: value };
            return { ...prev, [fieldId]: { ...currentAnswer, details: newDetails } };
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError('');

        const answersPayload = Object.entries(answers).map(([fieldId, answer]) => ({
            form_field_id: Number(fieldId),
            answer: JSON.stringify(answer)
        }));

        try {
            const response = await fetch(`${apiUrl}/api/client/profile/questionnaire`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ answers: answersPayload })
            });
            if (!response.ok) { const data = await response.json(); throw new Error(data.message); }
            navigate('/fact-finder/income');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };
    
    if (isLoading) return <div className="fact-finder-page"><h2>Loading...</h2></div>;

    return (
        <div className="fact-finder-page">
            <div className="wizard-header">
                <h2>Let's get a snapshot of your financial situation.</h2>
                <p>You're doing great! The more we know, the better we can help you reach your goals.</p>
            </div>
            <form onSubmit={handleSubmit} className="wizard-form">
                {formSchema.map(field => {
                    const currentAnswers = answers[field.id] || { selected: [], details: {} };
                    return (
                        <div key={field.id} className="form-section">
                            <h4>{field.field_label}</h4>
                            <div className="options-group">
                                {field.options.map(option => {
                                    const isSelected = currentAnswers.selected.includes(option.option_label);
                                    return (
                                        <div key={option.id} className="option-item">
                                            <label>
                                                <input
                                                    type={field.field_type === 'Checkbox' ? 'checkbox' : 'radio'}
                                                    name={`field_${field.id}`}
                                                    value={option.option_label}
                                                    checked={isSelected}
                                                    onChange={() => handleSelectionChange(field.id, option.option_label, field.field_type)}
                                                />
                                                {option.option_label}
                                            </label>
                                            {isSelected && option.details_field_label && (
                                                <div className="details-field form-group">
                                                    <label htmlFor={`details_${option.id}`}>{option.details_field_label}</label>
                                                    <input
                                                        type="text"
                                                        id={`details_${option.id}`}
                                                        value={currentAnswers.details[option.option_label] || ''}
                                                        onChange={(e) => handleDetailChange(field.id, option.option_label, e.target.value)}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
                <div className="form-actions">
                    <button type="button" className="secondary-button" onClick={() => navigate('/fact-finder/family-info')}>Back</button>
                    <button type="submit" className="continue-button" disabled={isSubmitting}>
                        {isSubmitting ? 'Saving...' : 'Continue'}
                    </button>
                </div>
                {error && <p className="form-message error-text">{error}</p>}
            </form>
        </div>
    );
};

export default FactFinderInvestorProfile;