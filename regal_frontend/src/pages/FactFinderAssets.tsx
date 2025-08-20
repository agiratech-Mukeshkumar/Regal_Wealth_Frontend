import React, { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useNavigate } from 'react-router-dom';
import './FactFinder.css';

// --- Interface Definitions for different asset types ---
interface BankAccount {
    bank_name: string;
    account_type: string;
    owner: string;
    balance: string;
}

// --- THIS IS THE FIX ---
// Create a specific type for the data being sent to the backend API.
interface AssetPayload {
    asset_type: string;
    description: string;
    owner: string;
    balance: string;
}

const TrashIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg> );

const FactFinderAssets: React.FC = () => {
    const { token } = useAuth();    
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');

    // State to track which asset types are selected
    const [selectedTypes, setSelectedTypes] = useState({
        banking: false,
        investments: false,
        life_insurance: false,
        real_estate: false,
        retirement: false,
    });
    
    // State for the actual data of each asset type
    const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
    // Add similar state for other asset types, e.g., const [investments, setInvestments] = useState([]);

    const handleTypeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, checked } = e.target;
        setSelectedTypes(prev => ({ ...prev, [name]: checked }));
    };
    
    // Generic handlers for dynamic rows
    const addItem = <T,>(setter: React.Dispatch<React.SetStateAction<T[]>>, newItem: T) => setter(prev => [...prev, newItem]);
    const removeItem = <T,>(setter: React.Dispatch<React.SetStateAction<T[]>>, index: number) => setter(prev => prev.filter((_, i) => i !== index));
    const updateItem = <T,>(setter: React.Dispatch<React.SetStateAction<T[]>>, index: number, e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setter(prev => {
            const updated = [...prev];
            updated[index] = { ...updated[index], [name]: value };
            return updated;
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage('');

        // Transform the structured state into the flat array the backend expects
        const assetsPayload: AssetPayload[] = [];
        if (selectedTypes.banking) {
            bankAccounts.forEach(acc => assetsPayload.push({ 
                asset_type: 'Banking', 
                description: `${acc.bank_name} - ${acc.account_type}`,
                owner: acc.owner,
                balance: acc.balance 
            }));
        }
        // ... add logic for other asset types here ...

        try {
            const response = await fetch('http://localhost:5000/api/client/profile/assets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ assets: assetsPayload })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message);
            navigate('/fact-finder/liabilities');
        } catch (err: any) {
            setMessage(err.message);
        } finally {
            setIsLoading(false);
        }
    };

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
                        <label className="custom-checkbox-label"><input type="checkbox" name="banking" checked={selectedTypes.banking} onChange={handleTypeChange} /><span>Banking</span><small>Checking, savings, or credit union accounts</small></label>
                        <label className="custom-checkbox-label"><input type="checkbox" name="investments" checked={selectedTypes.investments} onChange={handleTypeChange} /><span>Investments</span><small>Stocks, Bonds, Crypto, Mutual Funds</small></label>
                        <label className="custom-checkbox-label"><input type="checkbox" name="life_insurance" checked={selectedTypes.life_insurance} onChange={handleTypeChange} /><span>Life Insurance</span><small>Active policies and current coverage details</small></label>
                        <label className="custom-checkbox-label"><input type="checkbox" name="real_estate" checked={selectedTypes.real_estate} onChange={handleTypeChange} /><span>Real Estate</span><small>Primary Residence or Investment Properties</small></label>
                        <label className="custom-checkbox-label"><input type="checkbox" name="retirement" checked={selectedTypes.retirement} onChange={handleTypeChange} /><span>Retirement Account</span><small>401k, 401a, 403b, IRA, and More</small></label>
                    </div>
                </div>
                
                {/* Conditionally render the Bank Accounts section */}
                {selectedTypes.banking && (
                    <div className="form-section asset-details-section">
                        <div className="section-header">
                            <h4>Bank Accounts</h4>
                            <button type="button" className="add-button" onClick={() => addItem(setBankAccounts, { bank_name: '', account_type: '', owner: 'Client', balance: '' })}>+ Add</button>
                        </div>
                        {bankAccounts.map((item, index) => (
                             <div key={index} className="dynamic-row labeled asset-row">
                                <div className="form-group"><label>Bank Name*</label><input type="text" name="bank_name" value={item.bank_name} onChange={e => updateItem(setBankAccounts, index, e)} /></div>
                                <div className="form-group"><label>Account Type*</label><input type="text" name="account_type" value={item.account_type} onChange={e => updateItem(setBankAccounts, index, e)} /></div>
                                <div className="form-group"><label>Account Owner*</label><input type="text" name="owner" value={item.owner} onChange={e => updateItem(setBankAccounts, index, e)} /></div>
                                <div className="form-group"><label>Balance*</label><input type="number" name="balance" value={item.balance} onChange={e => updateItem(setBankAccounts, index, e)} placeholder="$" /></div>
                                <button type="button" className="remove-button icon" onClick={() => removeItem(setBankAccounts, index)}><TrashIcon /></button>
                            </div>
                        ))}
                    </div>
                )}
                
                {/* Add other conditional sections for Investments, Real Estate, etc. here */}

                <div className="form-actions">
                    <button type="button" className="secondary-button" onClick={() => navigate('/fact-finder/income')}>Back</button>
                    <button type="submit" className="continue-button" disabled={isLoading}>{isLoading ? 'Saving...' : 'Continue'}</button>
                </div>
                {message && <p className="form-message">{message}</p>}
            </form>
        </div>
    );
};

export default FactFinderAssets;
