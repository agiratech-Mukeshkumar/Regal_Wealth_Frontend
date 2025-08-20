import React, { useState } from 'react';
import './FactFinder.css'; // Reuse the shared CSS
import { useNavigate } from 'react-router-dom';

// --- Interface Definitions ---
interface IncomeSource { source: string; owner: 'Client' | 'Spouse'; monthly_amount: string; }
interface Asset { asset_type: string; description: string; owner: string; balance: string; }
interface Liability { liability_type: string; description: string; balance: string; }

const FactFinderFinancials: React.FC = () => {
    const [incomeSources, setIncomeSources] = useState<IncomeSource[]>([]);
    const [assets, setAssets] = useState<Asset[]>([]);
    const [liabilities, setLiabilities] = useState<Liability[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');
    const navigate = useNavigate()

    // --- Generic Handler Functions ---
    const addItem = <T,>(setter: React.Dispatch<React.SetStateAction<T[]>>, newItem: T) => {
        setter(prev => [...prev, newItem]);
    };
    const removeItem = <T,>(setter: React.Dispatch<React.SetStateAction<T[]>>, indexToRemove: number) => {
        setter(prev => prev.filter((_, index) => index !== indexToRemove));
    };
    const updateItem = <T,>(setter: React.Dispatch<React.SetStateAction<T[]>>, indexToUpdate: number, event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = event.target;
        setter(prev => {
            const updatedItems = [...prev];
            updatedItems[indexToUpdate] = { ...updatedItems[indexToUpdate], [name]: value };
            return updatedItems;
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage('');
        try {
            const token = "your_client_jwt_token_here";
            const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };
            
            // Submit all three sections concurrently
            const responses = await Promise.all([
                fetch('http://localhost:5000/api/client/profile/income', { method: 'POST', headers, body: JSON.stringify({ income_sources: incomeSources }) }),
                fetch('http://localhost:5000/api/client/profile/assets', { method: 'POST', headers, body: JSON.stringify({ assets }) }),
                fetch('http://localhost:5000/api/client/profile/liabilities', { method: 'POST', headers, body: JSON.stringify({ liabilities }) })
            ]);

            // Check if any request failed
            for (const response of responses) {
                if (!response.ok) {
                    const data = await response.json();
                    throw new Error(data.message || 'An error occurred while saving.');
                }
            }

            navigate('/')
            // Navigate to next step (Documents)
        } catch (err: any) {
            setMessage(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fact-finder-page">
            <div className="wizard-header">
                <h2>Let's wrap up with your monthly totals.</h2>
                <p>This gives us the full picture to provide personalized recommendations.</p>
            </div>
            <form onSubmit={handleSubmit} className="wizard-form">

                {/* --- Income Section --- */}
                <div className="dynamic-section">
                    <div className="section-header"><h4>Income Sources</h4><button type="button" className="add-button" onClick={() => addItem(setIncomeSources, { source: '', owner: 'Client', monthly_amount: '' })}>+ Add Income</button></div>
                    {incomeSources.map((item, index) => (
                        <div key={index} className="dynamic-row">
                            <input type="text" name="source" placeholder="Source (e.g., W-2, Pension)" value={item.source} onChange={e => updateItem(setIncomeSources, index, e)} />
                            <select name="owner" value={item.owner} onChange={e => updateItem(setIncomeSources, index, e)}><option value="Client">Client</option><option value="Spouse">Spouse</option></select>
                            <input type="number" name="monthly_amount" placeholder="Monthly Amount" value={item.monthly_amount} onChange={e => updateItem(setIncomeSources, index, e)} />
                            <button type="button" className="remove-button" onClick={() => removeItem(setIncomeSources, index)}>&times;</button>
                        </div>
                    ))}
                </div>

                {/* --- Assets Section --- */}
                <div className="dynamic-section">
                    <div className="section-header"><h4>Assets</h4><button type="button" className="add-button" onClick={() => addItem(setAssets, { asset_type: 'Banking', description: '', owner: 'Client', balance: '' })}>+ Add Asset</button></div>
                    {assets.map((item, index) => (
                         <div key={index} className="dynamic-row">
                            <input type="text" name="description" placeholder="Description (e.g., Chase Checking)" value={item.description} onChange={e => updateItem(setAssets, index, e)} />
                            <input type="text" name="asset_type" placeholder="Type (e.g., Banking)" value={item.asset_type} onChange={e => updateItem(setAssets, index, e)} />
                            <input type="number" name="balance" placeholder="Balance" value={item.balance} onChange={e => updateItem(setAssets, index, e)} />
                            <button type="button" className="remove-button" onClick={() => removeItem(setAssets, index)}>&times;</button>
                        </div>
                    ))}
                </div>

                {/* --- Liabilities Section --- */}
                <div className="dynamic-section">
                    <div className="section-header"><h4>Liabilities</h4><button type="button" className="add-button" onClick={() => addItem(setLiabilities, { liability_type: 'Credit Card', description: '', balance: '' })}>+ Add Liability</button></div>
                     {liabilities.map((item, index) => (
                         <div key={index} className="dynamic-row">
                            <input type="text" name="description" placeholder="Description (e.g., Mortgage)" value={item.description} onChange={e => updateItem(setLiabilities, index, e)} />
                            <input type="text" name="liability_type" placeholder="Type (e.g., Loan)" value={item.liability_type} onChange={e => updateItem(setLiabilities, index, e)} />
                            <input type="number" name="balance" placeholder="Outstanding Balance" value={item.balance} onChange={e => updateItem(setLiabilities, index, e)} />
                            <button type="button" className="remove-button" onClick={() => removeItem(setLiabilities, index)}>&times;</button>
                        </div>
                    ))}
                </div>

                <div className="form-actions">
                    <button type="button" className="secondary-button">Back</button>
                    <button type="submit" disabled={isLoading}>{isLoading ? 'Saving...' : 'Save & Continue'}</button>
                </div>
                {message && <p className="form-message">{message}</p>}
            </form>
        </div>
    );
};

export default FactFinderFinancials;
