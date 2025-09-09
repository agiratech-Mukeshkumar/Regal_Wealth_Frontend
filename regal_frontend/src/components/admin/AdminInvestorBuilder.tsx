import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../auth/AuthContext';
import './AdminInvestorBuilder.css';


interface FormOption {
    id: number;
    option_label: string;
    details_field_label: string | null;
}
interface FormField {
    id: number;
    field_label: string;
    field_type: 'Checkbox' | 'MultipleChoice';
    is_active: boolean;
    options: FormOption[];
}


interface AdminInvestorBuilderProps {
    formName: string;
}

const AdminInvestorBuilder: React.FC<AdminInvestorBuilderProps> = ({ formName }) => {
    const { token } = useAuth();
    const [fields, setFields] = useState<FormField[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchFormStructure = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`http://localhost:5000/api/admin/forms/${formName}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error(`Failed to fetch form: ${response.statusText}`);
            const data = await response.json();
            setFields(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [formName, token]);

    useEffect(() => {
        fetchFormStructure();
    }, [fetchFormStructure]);
    
    const handleUpdateField = async (fieldId: number, updateData: Partial<FormField>) => {
        try {
            await fetch(`http://localhost:5000/api/admin/forms/fields/${fieldId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(updateData),
            });
            setFields(prevFields => prevFields.map(f => f.id === fieldId ? { ...f, ...updateData } : f));
        } catch (err) {
            alert('Failed to update field.');
            fetchFormStructure();
        }
    };
    
    const handleUpdateOption = async (optionId: number, updateData: Partial<FormOption>) => {
        try {
            await fetch(`http://localhost:5000/api/admin/forms/options/${optionId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(updateData),
            });
        } catch (err) {
             alert('Failed to update option.');
        }
    };
    
    const handleAddOption = async (fieldId: number) => {
        try {
            await fetch(`http://localhost:5000/api/admin/forms/fields/${fieldId}/options`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json' 
                },
                body: JSON.stringify({})
            });
            fetchFormStructure();
        } catch(err) {
            alert('Failed to add option.');
        }
    };

    const handleDeleteOption = async (optionId: number) => {
        if (!window.confirm("Are you sure you want to delete this option?")) return;
        try {
            await fetch(`http://localhost:5000/api/admin/forms/options/${optionId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            fetchFormStructure();
        } catch(err) {
            alert('Failed to delete option.');
        }
    };

    const handleAddField = async () => {
        try {
            await fetch(`http://localhost:5000/api/admin/forms/${formName}/fields`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ field_label: 'New Question', field_type: 'Checkbox' }),
            });
            fetchFormStructure();
        } catch(err) {
            alert('Failed to add question.');
        }
    };

    if (isLoading) return <p>Loading form editor...</p>;
    if (error) return <p className="error-text">Error: {error}</p>;

    return (
        
        <div className="form-builder-main">
            <div className="form-builder-actions">
                <button className="add-main-question-btn" onClick={handleAddField}>+ Add Question</button>
            </div>
            {fields.map(field => (
                <div key={field.id} className="main-question-card">
                    <header className="mq-header">
                        <input
                            className="mq-title-input"
                            defaultValue={field.field_label}
                            onBlur={(e) => handleUpdateField(field.id, { field_label: e.target.value })}
                            placeholder="Type your question here"
                        />
                        <select
                            className="sq-type-select"
                            value={field.field_type}
                            onChange={(e) => handleUpdateField(field.id, { field_type: e.target.value as any })}
                        >
                            <option value="Checkbox">Checkboxes</option>
                            <option value="MultipleChoice">Multiple Choice</option>
                        </select>
                    </header>
                    <div className="options-container">
                        {field.options.map(option => (
                            <div key={option.id} className="option-row">
                                <input 
                                    type="text" 
                                    className="option-label-input"
                                    defaultValue={option.option_label}
                                    onBlur={(e) => handleUpdateOption(option.id, { option_label: e.target.value })}
                                    placeholder="Option label"
                                />
                                
                                {field.field_type === 'Checkbox' && (
                                    <div className="option-details-toggle">
                                        <input 
                                            type="checkbox" 
                                            id={`details_${option.id}`} 
                                            checked={!!option.details_field_label}
                                            onChange={(e) => {
                                                const newLabel = e.target.checked ? 'Details' : null;
                                                handleUpdateOption(option.id, { details_field_label: newLabel });
                                                setFields(fields.map(f => f.id === field.id ? { ...f, options: f.options.map(o => o.id === option.id ? {...o, details_field_label: newLabel } : o) } : f));
                                            }}
                                        />
                                        <label htmlFor={`details_${option.id}`}>Add details field</label>
                                    </div>
                                )}

                                {field.field_type === 'Checkbox' && option.details_field_label !== null && (
                                    <input
                                        type="text"
                                        className="details-label-input"
                                        defaultValue={option.details_field_label}
                                        onBlur={(e) => handleUpdateOption(option.id, { details_field_label: e.target.value })}
                                        placeholder="Label for details field"
                                    />
                                )}
                                <button className="delete-option-btn" onClick={() => handleDeleteOption(option.id)}>×</button>
                            </div>
                        ))}
                         <button className="add-sub-question-btn" onClick={() => handleAddOption(field.id)}>+ Add Option</button>
                    </div>
                </div>
            ))}
            
        </div>
    );
};

export default AdminInvestorBuilder;