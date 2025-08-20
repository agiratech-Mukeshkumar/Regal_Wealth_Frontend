import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import './FactFinder.css';
import { useNavigate } from 'react-router-dom';

// --- Interface Definitions ---
interface FormField {
    id: number;
    field_label: string;
    field_type: 'Checkbox' | 'MultipleChoice' | 'Text';
    options_json: string | null;
}

interface Answer {
    form_field_id: number;
    answer: string; // For MultipleChoice, this is the selected option. For Checkbox, it's a JSON string of selected options.
}

const FactFinderInvestorProfile: React.FC = () => {
    const { token } = useAuth();
    const navigate = useNavigate();
    const [formFields, setFormFields] = useState<FormField[]>([]);
    const [answers, setAnswers] = useState<{ [key: number]: any }>({}); // Can hold string or array
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        const fetchForm = async () => {
            if (!token) return;
            try {
                const response = await fetch('http://localhost:5000/api/client/forms/investor-profile', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!response.ok) throw new Error('Failed to load form questions.');
                const data: FormField[] = await response.json();
                setFormFields(data);
            } catch (err: any) {
                setMessage(err.message);
            } finally {
                setIsLoading(false);
            }
        };
        fetchForm();
    }, [token]);

    const handleAnswerChange = (fieldId: number, value: string, fieldType: FormField['field_type']) => {
        if (fieldType === 'Checkbox') {
            const currentAnswers = answers[fieldId] || [];
            const newAnswers = currentAnswers.includes(value)
                ? currentAnswers.filter((item: string) => item !== value)
                : [...currentAnswers, value];
            setAnswers(prev => ({ ...prev, [fieldId]: newAnswers }));
        } else {
            setAnswers(prev => ({ ...prev, [fieldId]: value }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setMessage('');

        const answersPayload: Answer[] = Object.entries(answers).map(([fieldId, answer]) => ({
            form_field_id: Number(fieldId),
            answer: Array.isArray(answer) ? JSON.stringify(answer) : answer
        }));

        try {
            const response = await fetch('http://localhost:5000/api/client/profile/questionnaire', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ answers: answersPayload })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message);
            navigate('/fact-finder/income');
        } catch (err: any) {
            setMessage(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderField = (field: FormField) => {
        const options = field.options_json ? JSON.parse(field.options_json) : [];
        switch (field.field_type) {
            case 'Checkbox':
                return (
                    <div className="checkbox-group">
                        {options.map((option: string) => (
                            <label key={option}>
                                <input
                                    type="checkbox"
                                    value={option}
                                    checked={(answers[field.id] || []).includes(option)}
                                    onChange={() => handleAnswerChange(field.id, option, 'Checkbox')}
                                />
                                {option}
                            </label>
                        ))}
                    </div>
                );
            case 'MultipleChoice':
                return (
                    <div className="radio-group">
                        {options.map((option: string) => (
                            <label key={option}>
                                <input
                                    type="radio"
                                    name={`field_${field.id}`}
                                    value={option}
                                    checked={answers[field.id] === option}
                                    onChange={(e) => handleAnswerChange(field.id, e.target.value, 'MultipleChoice')}
                                />
                                {option}
                            </label>
                        ))}
                    </div>
                );
            default:
                return <p>Unsupported field type: {field.field_type}</p>;
        }
    };

    if (isLoading) return <div className="fact-finder-page">Loading form...</div>;

    return (
        <div className="fact-finder-page">
            <div className="wizard-header">
                <h2>Let's get a snapshot of your financial situation. This will help us provide the most relevant advice.</h2>
                <p>You're doing great! The more we know, the better we can help you reach your goals.</p>
            </div>
            <form onSubmit={handleSubmit} className="wizard-form">
                {formFields.map(field => (
                    <div key={field.id} className="form-section">
                        <h4>{field.field_label}</h4>
                        {renderField(field)}
                    </div>
                ))}
                <div className="form-actions">
                    <button type="button" className="secondary-button" onClick={() => navigate('/fact-finder/family-info')}>Back</button>
                    <button type="submit" className="continue-button" disabled={isSubmitting}>
                        {isSubmitting ? 'Saving...' : 'Continue'}
                    </button>
                </div>
                {message && <p className="form-message">{message}</p>}
            </form>
        </div>
    );
};

export default FactFinderInvestorProfile;
