import React, { useState, useMemo } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useNavigate } from 'react-router-dom';
import './FactFinder.css'; // We will add new styles to this file

// Interface for the dynamic "Other Income" fields
interface OtherIncome {
    source: string;
    income: string;
}

const FactFinderIncome: React.FC = () => {
    const { token, user } = useAuth();
    const navigate = useNavigate();
    
    // State for the fixed income fields
    const [incomeData, setIncomeData] = useState({
        social_security_you: '',
        social_security_spouse: '',
        pension_you: '',
        pension_spouse: '',
        rental_income_you: '',
        rental_income_spouse: '',
        w2_you: '',
        w2_spouse: '',
        total_monthly_expenses: ''
    });
    
    // State for the dynamic "Other Income" fields
    const [otherIncomes, setOtherIncomes] = useState<OtherIncome[]>([{ source: '', income: '' }]);
    
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');

    // --- Handler for fixed input fields ---
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setIncomeData(prev => ({ ...prev, [name]: value }));
    };
    
    // --- Handlers for dynamic "Other Income" fields ---
    const addOtherIncome = () => {
        setOtherIncomes(prev => [...prev, { source: '', income: '' }]);
    };
    const updateOtherIncome = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        const updated = [...otherIncomes];
        updated[index] = { ...updated[index], [name]: value as keyof OtherIncome };
        setOtherIncomes(updated);
    };

    // --- Calculate Total Monthly Income ---
    const totalMonthlyIncome = useMemo(() => {
        const { total_monthly_expenses, ...incomes } = incomeData;
        const standardIncome = Object.values(incomes).reduce((sum, val) => sum + (Number(val) || 0), 0);
        const otherIncomeTotal = otherIncomes.reduce((sum, item) => sum + (Number(item.income) || 0), 0);
        return standardIncome + otherIncomeTotal;
    }, [incomeData, otherIncomes]);


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage('');

        // Transform the state into the array format the backend expects
        const income_sources = [];
        if (incomeData.social_security_you) income_sources.push({ source: 'Social Security', owner: 'Client', monthly_amount: incomeData.social_security_you });
        if (incomeData.social_security_spouse) income_sources.push({ source: 'Social Security', owner: 'Spouse', monthly_amount: incomeData.social_security_spouse });
        if (incomeData.pension_you) income_sources.push({ source: 'Pension', owner: 'Client', monthly_amount: incomeData.pension_you });
        if (incomeData.pension_spouse) income_sources.push({ source: 'Pension', owner: 'Spouse', monthly_amount: incomeData.pension_spouse });
        // ... add other fixed sources similarly
        otherIncomes.forEach(item => {
            if(item.source && item.income) income_sources.push({ source: item.source, owner: 'Client', monthly_amount: item.income });
        });

        try {
            const response = await fetch('http://localhost:5000/api/client/profile/income', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ income_sources })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message);
            navigate('/fact-finder/assets');
        } catch (err: any) {
            setMessage(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fact-finder-page">
            <div className="wizard-header">
                <h2>Where does your money come from? We'll use this to help you to manage and grow your income.</h2>
                <p>Almost there! Understanding your income sources is key to building a strong financial plan.</p>
            </div>
            <form onSubmit={handleSubmit} className="wizard-form">
                <div className="income-form-grid">
                    {/* Social Security */}
                    <div className="income-section">
                        <h4>Social Security</h4>
                        <div className="income-split-group">
                            <div className="form-group"><label>You</label><input type="number" name="social_security_you" value={incomeData.social_security_you} onChange={handleChange} placeholder="$" /></div>
                            <div className="form-group"><label>Spouse</label><input type="number" name="social_security_spouse" value={incomeData.social_security_spouse} onChange={handleChange} placeholder="$" /></div>
                        </div>
                    </div>
                    {/* Pension */}
                    <div className="income-section">
                        <h4>Pension</h4>
                        <div className="income-split-group">
                            <div className="form-group"><label>You</label><input type="number" name="pension_you" value={incomeData.pension_you} onChange={handleChange} placeholder="$" /></div>
                            <div className="form-group"><label>Spouse</label><input type="number" name="pension_spouse" value={incomeData.pension_spouse} onChange={handleChange} placeholder="$" /></div>
                        </div>
                    </div>
                    {/* Rental Income */}
                    <div className="income-section">
                        <h4>Rental Income</h4>
                        <div className="income-split-group">
                            <div className="form-group"><label>You</label><input type="number" name="rental_income_you" value={incomeData.rental_income_you} onChange={handleChange} placeholder="$" /></div>
                            <div className="form-group"><label>Spouse</label><input type="number" name="rental_income_spouse" value={incomeData.rental_income_spouse} onChange={handleChange} placeholder="$" /></div>
                        </div>
                    </div>
                    {/* W-2 */}
                    <div className="income-section">
                        <h4>W-2 (Earned Income)</h4>
                        <div className="income-split-group">
                            <div className="form-group"><label>You</label><input type="number" name="w2_you" value={incomeData.w2_you} onChange={handleChange} placeholder="$" /></div>
                            <div className="form-group"><label>Spouse</label><input type="number" name="w2_spouse" value={incomeData.w2_spouse} onChange={handleChange} placeholder="$" /></div>
                        </div>
                    </div>
                </div>

                {/* Other Income */}
                <div className="form-section">
                    <div className="section-header">
                        <h4>Other Income (If Any)</h4>
                        <button type="button" className="add-button" onClick={addOtherIncome}>+ Add</button>
                    </div>
                    {otherIncomes.map((item, index) => (
                        <div key={index} className="income-split-group" style={{marginBottom: '1rem'}}>
                            <div className="form-group"><label>Please Specify the Source</label><input type="text" name="source" value={item.source} onChange={e => updateOtherIncome(index, e)} /></div>
                            <div className="form-group"><label>Income</label><input type="number" name="income" value={item.income} onChange={e => updateOtherIncome(index, e)} placeholder="$" /></div>
                        </div>
                    ))}
                </div>

                {/* Totals */}
                <div className="income-totals-grid">
                    <div className="form-group">
                        <label>Total Monthly Income</label>
                        <input type="text" value={`$${totalMonthlyIncome.toLocaleString()}`} readOnly className="total-input" />
                    </div>
                    <div className="form-group">
                        <label>Total Monthly Expenses</label>
                        <input type="number" name="total_monthly_expenses" value={incomeData.total_monthly_expenses} onChange={handleChange} placeholder="$" />
                    </div>
                </div>

                <div className="form-actions">
                    <button type="button" className="secondary-button" onClick={() => navigate('/fact-finder/investor-profile')}>Back</button>
                    <button type="submit" className="continue-button" disabled={isLoading}>
                        {isLoading ? 'Saving...' : 'Continue'}
                    </button>
                </div>
                {message && <p className="form-message">{message}</p>}
            </form>
        </div>
    );
};

export default FactFinderIncome;
