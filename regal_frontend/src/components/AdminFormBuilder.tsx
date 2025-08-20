import React, { useState, useEffect } from 'react';

import './AdminFormBuilder.css';
import { useAuth } from '../auth/AuthContext';

// --- Interface Definitions ---
interface FormField {
    id: number;
    field_label: string;
    field_type: 'Checkbox' | 'MultipleChoice' | 'Text';
    options_json: string | null;
}

// --- Add/Edit Modal Component ---
interface FieldModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    field: FormField | null; // Pass field data for editing
    formName: string; // Pass formName to know which form to update
}

const FieldModal: React.FC<FieldModalProps> = ({ isOpen, onClose, onSave, field, formName }) => {
    const { token } = useAuth();
    const [label, setLabel] = useState('');
    const [type, setType] = useState<'Checkbox' | 'MultipleChoice' | 'Text'>('Text');
    const [options, setOptions] = useState(''); // Comma-separated options
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (field) {
            setLabel(field.field_label);
            setType(field.field_type);
            setOptions(field.options_json ? JSON.parse(field.options_json).join(', ') : '');
        } else {
            // Reset for new field
            setLabel('');
            setType('Text');
            setOptions('');
        }
    }, [field, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        const payload = {
            field_label: label,
            field_type: type,
            options_json: type === 'MultipleChoice' ? JSON.stringify(options.split(',').map(opt => opt.trim())) : null
        };

        try {
            const url = field 
                ? `http://localhost:5000/api/admin/forms/fields/${field.id}` 
                : `http://localhost:5000/api/admin/forms/${formName}/fields`;
            const method = field ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(payload)
            });

            if (!response.ok) throw new Error('Failed to save the field.');
            
            onSave(); // Trigger a refresh on the parent component
            onClose();
        } catch (err) {
            alert(err); // Simple error handling
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>{field ? 'Edit Field' : 'Add New Field'}</h3>
                    <button onClick={onClose} className="close-button">&times;</button>
                </div>
                <form onSubmit={handleSubmit} className="modal-form">
                    <div className="form-group">
                        <label>Question / Label</label>
                        <input type="text" value={label} onChange={e => setLabel(e.target.value)} required />
                    </div>
                    <div className="form-group">
                        <label>Field Type</label>
                        <select value={type} onChange={e => setType(e.target.value as any)} required>
                            <option value="Text">Text</option>
                            <option value="Checkbox">Checkbox</option>
                            <option value="MultipleChoice">Multiple Choice (Radio)</option>
                        </select>
                    </div>
                    {type === 'MultipleChoice' && (
                        <div className="form-group">
                            <label>Options (comma-separated)</label>
                            <textarea value={options} onChange={e => setOptions(e.target.value)} placeholder="e.g., Option A, Option B, Option C" />
                        </div>
                    )}
                    <div className="modal-actions">
                        <button type="button" className="modal-button cancel" onClick={onClose}>Cancel</button>
                        <button type="submit" className="modal-button submit" disabled={isSubmitting}>
                            {isSubmitting ? 'Saving...' : 'Save Field'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// --- Main Form Builder Component ---
interface AdminFormBuilderProps {
    formName: string;
    title: string;
}

const AdminFormBuilder: React.FC<AdminFormBuilderProps> = ({ formName, title }) => {
    const { token } = useAuth();
    const [fields, setFields] = useState<FormField[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingField, setEditingField] = useState<FormField | null>(null);

    const fetchFormFields = async () => {
        if (!token) return;
        setIsLoading(true);
        try {
            const response = await fetch(`http://localhost:5000/api/admin/forms/${formName}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Failed to fetch form fields.');
            const data: FormField[] = await response.json();
            setFields(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchFormFields();
    }, [formName, token]);

    const handleDelete = async (fieldId: number) => {
        if (window.confirm('Are you sure you want to delete this field?')) {
            try {
                const response = await fetch(`http://localhost:5000/api/admin/forms/fields/${fieldId}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!response.ok) throw new Error('Failed to delete field.');
                fetchFormFields();
            } catch (err: any) {
                alert(err.message);
            }
        }
    };

    const handleOpenModal = (field: FormField | null) => {
        setEditingField(field);
        setIsModalOpen(true);
    };
    
    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingField(null);
    };

    return (
        <>
            <FieldModal 
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                onSave={fetchFormFields}
                field={editingField}
                formName={formName}
            />
            <div className="form-builder-wrapper">
                <header className="form-builder-header">
                    <h3>{title}</h3>
                    <button className="add-field-button" onClick={() => handleOpenModal(null)}>+ Add New Field</button>
                </header>

                <div className="form-builder-container">
                    {isLoading ? (
                        <p>Loading form fields...</p>
                    ) : error ? (
                        <p className="error-message">{error}</p>
                    ) : (
                        fields.map((field, index) => (
                            <div key={field.id} className="form-field-card">
                                <div className="field-info">
                                    <span className="field-order">{index + 1}</span>
                                    <div className="field-details">
                                        <p className="field-label">{field.field_label}</p>
                                        <p className="field-type">Type: {field.field_type}</p>
                                    </div>
                                </div>
                                <div className="field-actions">
                                    <button className="action-button edit" onClick={() => handleOpenModal(field)}>Edit</button>
                                    <button className="action-button delete" onClick={() => handleDelete(field.id)}>Delete</button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </>
    );
};

export default AdminFormBuilder;
