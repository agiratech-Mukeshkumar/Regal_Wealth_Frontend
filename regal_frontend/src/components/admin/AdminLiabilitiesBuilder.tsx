import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../auth/AuthContext';
import './AdminLiabilitiesBuilder.css'; 

const PlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;
const MoreVerticalIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>;
const GrabHandleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="#9ca3af" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle><circle cx="5" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle></svg>;



interface FormOption {
    id: number;
    option_label: string;
}
interface FormField {
    id: number;
    field_label: string;
    field_type: 'Currency' | 'Number' | 'Text' | 'Select' | 'Checkbox';
    is_active: boolean;
    parent_field_id: number | null;
    options: FormOption[];
    sub_fields: FormField[];
}



const KebabMenu: React.FC<{ onEdit: () => void; onDelete: () => void; }> = ({ onEdit, onDelete }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className="kebab-menu">
            <button onClick={() => setIsOpen(!isOpen)}><MoreVerticalIcon /></button>
            {isOpen && (
                <div className="kebab-dropdown">
                    <a href="#!" onClick={(e) => { e.preventDefault(); onEdit(); setIsOpen(false); }}>Edit</a>
                    <a href="#!" onClick={(e) => { e.preventDefault(); onDelete(); setIsOpen(false); }} className="delete">Delete</a>
                </div>
            )}
        </div>
    );
};

const ToggleSwitch: React.FC<{ checked: boolean; onChange: (isChecked: boolean) => void; }> = ({ checked, onChange }) => (
    <label className="toggle-switch">
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span className="slider"></span>
    </label>
);


interface AdminFormBuilderProps {
    formName: string;
}

const AdminLiabilitiesBuilder: React.FC<AdminFormBuilderProps> = ({ formName }) => {
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
            const response = await fetch(`http://localhost:5000/api/admin/forms/fields/${fieldId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(updateData),
            });
            if (!response.ok) throw new Error('Failed to update field.');
          
            fetchFormStructure();
        } catch (err: any) {
            alert(`Error updating field: ${err.message}`);
        }
    };
    
    const handleDeleteField = async (fieldId: number) => {
        if (!window.confirm("Are you sure you want to delete this question and all its sub-questions?")) return;
        try {
            const response = await fetch(`http://localhost:5000/api/admin/forms/fields/${fieldId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` },
            });
            if (!response.ok) throw new Error('Failed to delete field.');
            fetchFormStructure();
        } catch (err: any) {
            alert(`Error deleting field: ${err.message}`);
        }
    };
    
    const handleAddField = async (label: string, type: FormField['field_type'], parentId: number | null = null) => {
        try {
            const response = await fetch(`http://localhost:5000/api/admin/forms/${formName}/fields`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ field_label: label, field_type: type, parent_field_id: parentId }),
            });
            if (!response.ok) throw new Error('Failed to add field.');
            fetchFormStructure();
        } catch (err: any) {
            alert(`Error adding field: ${err.message}`);
        }
    };


    if (isLoading) return <p>Loading form editor...</p>;
    if (error) return <p className="error-text">Error: {error}</p>;

    return (
        <div className="form-builder-main">
            <div className="form-builder-actions">
                <button 
                    className="add-main-question-btn" 
                    onClick={() => handleAddField('New Main Question', 'Text')}
                >
                    <PlusIcon/> Add Main Question
                </button>
            </div>
            <div className="form-fields-list">
                {fields.map(mainQuestion => (
                    <div key={mainQuestion.id} className="main-question-card">
                        <header className="mq-header">
                            <GrabHandleIcon />
                            <input
                                className="mq-title-input"
                                defaultValue={mainQuestion.field_label}
                                onBlur={(e) => handleUpdateField(mainQuestion.id, { field_label: e.target.value })}
                            />
                            <div className="mq-controls">
                                <ToggleSwitch 
                                    checked={mainQuestion.is_active} 
                                    onChange={(isChecked) => handleUpdateField(mainQuestion.id, { is_active: isChecked })}
                                />
                                <KebabMenu onEdit={() => {}} onDelete={() => handleDeleteField(mainQuestion.id)} />
                            </div>
                        </header>
                        <div className="sub-questions-container">
                            {mainQuestion.sub_fields.map(subQuestion => (
                                <div key={subQuestion.id} className="sub-question-row">
                                    <input 
                                        className="sq-label-input" 
                                        defaultValue={subQuestion.field_label}
                                        onBlur={(e) => handleUpdateField(subQuestion.id, { field_label: e.target.value })}
                                    />
                                    <select 
                                        className="sq-type-select" 
                                        value={subQuestion.field_type}
                                        onChange={(e) => handleUpdateField(subQuestion.id, { field_type: e.target.value as FormField['field_type'] })}
                                    >
                                        <option value="Currency">$ Currency</option>
                                        <option value="Number">Number</option>
                                        <option value="Text">Text</option>
                                        <option value="Select">Dropdown</option>
                                    </select>
                                    <ToggleSwitch
                                        checked={subQuestion.is_active}
                                        onChange={(isChecked) => handleUpdateField(subQuestion.id, { is_active: isChecked })}
                                    />
                                    <KebabMenu onEdit={() => {}} onDelete={() => handleDeleteField(subQuestion.id)} />
                                </div>
                            ))}
                            <button 
                                className="add-sub-question-btn"
                                onClick={() => handleAddField('New Sub-Question', 'Currency', mainQuestion.id)}
                            >
                                <PlusIcon/> Add Sub-Question
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default AdminLiabilitiesBuilder;