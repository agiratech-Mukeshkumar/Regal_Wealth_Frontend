import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { useNavigate } from 'react-router-dom';
import './FactFinder.css';


interface SubField { id: number; label: string; type: 'Textbox' | 'Select' | 'Currency'; }
interface AssetCategory { id: number; label: string; description: string; subFields: SubField[]; }
interface FormData { [key: string]: any[]; }
interface SavedAsset { asset_type: string; description: string; owner: string; balance: number; }

const TrashIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg> );

const FactFinderAssets: React.FC = () => {
    const { token } = useAuth();
    const navigate = useNavigate();
    const [formSchema, setFormSchema] = useState<AssetCategory[]>([]);
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [formData, setFormData] = useState<FormData>({});
    const [isFetching, setIsFetching] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const fetchPageData = useCallback(async () => {
        if (!token) return;
        setIsFetching(true);
        try {
            const [schemaRes, dataRes] = await Promise.all([
                fetch('http://localhost:5000/api/client/forms/assets', { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch('http://localhost:5000/api/client/profile/assets', { headers: { 'Authorization': `Bearer ${token}` } })
            ]);

            if (!schemaRes.ok) throw new Error("Failed to load form structure.");
            const schema: AssetCategory[] = await schemaRes.json();
            setFormSchema(schema);
            
            if (dataRes.ok) {
                const savedData: SavedAsset[] = await dataRes.json();
                if (savedData.length > 0) {
                    const newFormData: FormData = {};
                    const newSelectedCategories: string[] = [];
                    
                    savedData.forEach(asset => {
                        const categoryLabel = asset.asset_type;
                        if (!newSelectedCategories.includes(categoryLabel)) {
                            newSelectedCategories.push(categoryLabel);
                        }

                        const existingEntries = newFormData[categoryLabel] || [];
                        const newEntry: {[key: string]: any} = {};
                        const categorySchema = schema.find(c => c.label === categoryLabel);

                        if (categorySchema) {
                            categorySchema.subFields.forEach(field => {
                                if (field.label.toLowerCase().includes('balance')) {
                                    newEntry[field.label] = asset.balance;
                                } else if (field.label.toLowerCase().includes('owner')) {
                                    newEntry[field.label] = asset.owner;
                                }
                            });
                        }

                       
                        if (asset.description) {
                            
                            let cleanDescription = asset.description;
                            if (cleanDescription.startsWith('"') && cleanDescription.endsWith('"')) {
                                cleanDescription = cleanDescription.substring(1, cleanDescription.length - 1);
                            }

                            const descriptionParts = cleanDescription.split(' - ');
                            descriptionParts.forEach(part => {
                                const [key, ...valueParts] = part.split(': ');
                                const value = valueParts.join(': ');
                                if (key && value && categorySchema) {
                                    const fullLabel = categorySchema.subFields.find(f => f.label.replace('*', '') === key)?.label;
                                    if (fullLabel) {
                                        newEntry[fullLabel] = value.trim();
                                    }
                                }
                            });
                        }
                        
                        newFormData[categoryLabel] = [...existingEntries, newEntry];
                    });
                    setFormData(newFormData);
                    setSelectedCategories(newSelectedCategories);
                }
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsFetching(false);
        }
    }, [token]);

    useEffect(() => {
        fetchPageData();
    }, [fetchPageData]);
    

    const handleCategoryToggle = (categoryLabel: string) => {
        const updatedSelection = selectedCategories.includes(categoryLabel)
            ? selectedCategories.filter(c => c !== categoryLabel)
            : [...selectedCategories, categoryLabel];
        
        setSelectedCategories(updatedSelection);

        if (updatedSelection.includes(categoryLabel) && (!formData[categoryLabel] || formData[categoryLabel].length === 0)) {
            addRow(categoryLabel);
        }
    };

    const addRow = (categoryLabel: string) => {
        const categorySchema = formSchema.find(c => c.label === categoryLabel);
        if (!categorySchema) return;
        
        const newRow = categorySchema.subFields.reduce((acc, field) => {
            acc[field.label] = '';
            return acc;
        }, {} as {[key: string]: any});
        
        setFormData(prev => ({ ...prev, [categoryLabel]: [...(prev[categoryLabel] || []), newRow] }));
    };

    const removeRow = (categoryLabel: string, index: number) => {
        setFormData(prev => ({ ...prev, [categoryLabel]: prev[categoryLabel].filter((_, i) => i !== index) }));
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>, categoryLabel: string, index: number, fieldLabel: string) => {
        const { value } = e.target;
        setFormData(prev => {
            const updatedRows = [...prev[categoryLabel]];
            updatedRows[index][fieldLabel] = value;
            return { ...prev, [categoryLabel]: updatedRows };
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError('');

        const assetsPayload: Partial<SavedAsset>[] = [];
        for (const categoryLabel of selectedCategories) {
            const categoryData = formData[categoryLabel] || [];
            categoryData.forEach(row => {
                const descriptionParts: string[] = [];
                let owner = '';
                let balance = 0;
                let hasData = false;
                for (const fieldLabel in row) {
                    const value = row[fieldLabel];
                    if (value) hasData = true;
                    if (fieldLabel.toLowerCase().includes('balance')) {
                        balance = parseFloat(value) || 0;
                    } else if (fieldLabel.toLowerCase().includes('owner')) {
                        owner = value;
                    } else {
                        if (value) descriptionParts.push(`${fieldLabel.replace('*', '')}: ${value}`);
                    }
                }
                if (hasData) {
                    assetsPayload.push({ asset_type: categoryLabel, description: descriptionParts.join(' - '), owner: owner, balance: balance });
                }
            });
        }

        try {
            await fetch('http://localhost:5000/api/client/profile/assets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ assets: assetsPayload })
            });
            navigate('/fact-finder/liabilities');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };
    
    if (isFetching) return <div className="fact-finder-page"><h2>Loading...</h2></div>;

    return (
        <div className="fact-finder-page">
            <div className="wizard-header">
                <h2>Let's wrap up with your monthly totals and assets. This gives us the full picture.</h2>
                <p>You've made it to the last step! Finish strong and unlock your personalized recommendations.</p>
            </div>
            <form onSubmit={handleSubmit} className="wizard-form">
                <div className="form-section">
                    <h4>What Types of Financial Accounts or Assets Do You Have?*</h4>
                    <div className="asset-types-grid">
                        {formSchema.map(category => (
                             <label key={category.id} className="custom-checkbox-label">
                                <input type="checkbox" checked={selectedCategories.includes(category.label)} onChange={() => handleCategoryToggle(category.label)} />
                                <span>{category.label}</span>
                                <small>{category.description}</small>
                            </label>
                        ))}
                    </div>
                </div>
                {selectedCategories.map(categoryLabel => {
                    const categorySchema = formSchema.find(c => c.label === categoryLabel);
                    if (!categorySchema) return null;
                    return (
                        <div key={categoryLabel} className="form-section asset-details-section">
                            <div className="section-header">
                                <h4>{categorySchema.label} Accounts</h4>
                                <button type="button" className="add-button" onClick={() => addRow(categoryLabel)}>+ Add</button>
                            </div>
                            {formData[categoryLabel] && formData[categoryLabel].map((rowData, index) => (
                                 <div key={index} className="dynamic-row labeled asset-row" style={{ gridTemplateColumns: `repeat(${categorySchema.subFields.length}, 1fr) auto` }}>
                                     {categorySchema.subFields.map(field => (
                                        <div key={field.id} className="form-group">
                                            <label>{field.label}</label>
                                            <input type={field.type === 'Currency' ? 'number' : 'text'} name={field.label} value={rowData[field.label] || ''} onChange={(e) => handleInputChange(e, categoryLabel, index, field.label)} placeholder={field.type === 'Currency' ? '$' : ''} />
                                        </div>
                                     ))}
                                     <button type="button" className="remove-button icon" onClick={() => removeRow(categoryLabel, index)}><TrashIcon /></button>
                                 </div>
                            ))}
                        </div>
                    );
                })}
                <div className="form-actions">
                    <button type="button" className="secondary-button" onClick={() => navigate('/fact-finder/income')}>Back</button>
                    <button type="submit" className="continue-button" disabled={isSubmitting}>
                        {isSubmitting ? 'Saving...' : 'Continue'}
                    </button>
                </div>
                {error && <p className="form-message error-text">{error}</p>}
            </form>
        </div>
    );
};

export default FactFinderAssets;