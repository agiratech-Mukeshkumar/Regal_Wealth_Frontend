import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../auth/AuthContext';
import './AdminAssetsBuilder.css';


const PlusIcon = () => <svg xmlns="http://www.w.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;
const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>;

interface SubField {
    id: number;
    label: string;
    type: 'Textbox' | 'Select' | 'Currency';
}
interface AssetCategory {
    id: number;
    label: string;
    description: string;
    subFields: SubField[];
}

const AdminAssetsBuilder: React.FC = () => {
    const { token } = useAuth();
    const [assetCategories, setAssetCategories] = useState<AssetCategory[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchAssetSchema = useCallback(async () => {
        setIsLoading(true);
        if (!token) return;
        try {
            const response = await fetch('http://localhost:5000/api/admin/forms/assets', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error("Failed to fetch asset schema.");
            const data = await response.json();
            setAssetCategories(data);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    }, [token]);

    useEffect(() => {
        fetchAssetSchema();
    }, [fetchAssetSchema]);

    const handleAddCategory = async () => {
        await fetch('http://localhost:5000/api/admin/forms/assets/categories', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({})
        });
        fetchAssetSchema();
    };

    const handleUpdateCategory = async (catId: number, label: string, description: string) => {
        await fetch(`http://localhost:5000/api/admin/forms/assets/categories/${catId}`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ label, description })
        });
    };

    const handleDeleteCategory = async (catId: number) => {
        if (!window.confirm("Delete this entire category and all its fields?")) return;
        await fetch(`http://localhost:5000/api/admin/forms/assets/categories/${catId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        fetchAssetSchema();
    };

    const handleAddSubField = async (catId: number) => {
        await fetch(`http://localhost:5000/api/admin/forms/assets/categories/${catId}/fields`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({})
        });
        fetchAssetSchema();
    };
    
    const handleUpdateSubField = async (fieldId: number, updatedField: Partial<SubField>) => {
        await fetch(`http://localhost:5000/api/admin/forms/fields/${fieldId}`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedField)
        });
    };

    const handleDeleteSubField = async (fieldId: number) => {
        await fetch(`http://localhost:5000/api/admin/forms/fields/${fieldId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        fetchAssetSchema();
    };

    if (isLoading) return <p>Loading asset form builder...</p>;

    return (
        <div className="assets-builder-main">
            <div className="primary-question-card">
                <h4>What Types of Financial Accounts or Assets Do You Have?</h4>
                <div className="asset-categories-list">
                    {assetCategories.map(category => (
                        <div key={category.id} className="category-option-row">
                            <input type="checkbox" disabled />
                            <div className="category-labels">
                                <input 
                                    type="text" 
                                    defaultValue={category.label} 
                                    className="category-label-input" 
                                    onBlur={(e) => handleUpdateCategory(category.id, e.target.value, category.description)}
                                />
                                <input 
                                    type="text" 
                                    defaultValue={category.description} 
                                    className="category-desc-input" 
                                    onBlur={(e) => handleUpdateCategory(category.id, category.label, e.target.value)}
                                />
                            </div>
                            <button className="delete-btn" onClick={() => handleDeleteCategory(category.id)}><TrashIcon /></button>
                        </div>
                    ))}
                </div>
                <button className="add-option-btn" onClick={handleAddCategory}>+ Add option or Add "Other"</button>
            </div>

            {assetCategories.map(category => (
                 <div key={category.id} className="sub-form-card">
                    <header className="sub-form-header">
                        <h4>{category.label} Fields</h4>
                    </header>
                    <div className="sub-fields-list">
                        {category.subFields.map(field => (
                            <div key={field.id} className="sub-field-row">
                                <input 
                                    type="text" 
                                    defaultValue={field.label} 
                                    className="sub-field-label-input" 
                                    onBlur={(e) => handleUpdateSubField(field.id, { label: e.target.value })}
                                />
                                <select 
                                    defaultValue={field.type} 
                                    className="sub-field-type-select"
                                    onChange={(e) => handleUpdateSubField(field.id, { type: e.target.value as SubField['type'] })}
                                >
                                    <option value="Textbox">Textbox</option>
                                    <option value="Select">Select/Dropdown</option>
                                    <option value="Currency">$ Number</option>
                                </select>
                                <button className="delete-btn" onClick={() => handleDeleteSubField(field.id)}><TrashIcon /></button>
                            </div>
                        ))}
                        <button className="add-option-btn" onClick={() => handleAddSubField(category.id)}>+ Add Field</button>
                    </div>
                 </div>
            ))}
        </div>
    );
};

export default AdminAssetsBuilder;