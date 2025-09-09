import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { useNavigate } from 'react-router-dom';
import './FactFinder.css';

const apiUrl = process.env.REACT_APP_API_URL;
interface OtherIncome {
    source: string;
    income: string;
}


interface FetchedIncomeSource {
    source: string;
    owner: 'Client' | 'Spouse';
    monthly_amount: number;
}

const FactFinderIncome: React.FC = () => {
    const { token } = useAuth();
    const navigate = useNavigate();

 
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
    

    const [otherIncomes, setOtherIncomes] = useState<OtherIncome[]>([]);
    
    const [isLoading, setIsLoading] = useState(false);
    const [isFetching, setIsFetching] = useState(true);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchIncomeData = async () => {
            if (!token) return;
            
            setIsFetching(true);
            try {
                const response = await fetch(`${apiUrl}/api/client/profile/income`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (!response.ok) throw new Error('Failed to fetch income data.');
                
                const savedSources: FetchedIncomeSource[] = await response.json();
                
                if (savedSources.length > 0) {
                    const newIncomeData = { ...incomeData };
                    const newOtherIncomes: OtherIncome[] = [];

                    savedSources.forEach(source => {
                        switch (source.source) {
                            case 'Social Security':
                                if (source.owner === 'Client') newIncomeData.social_security_you = String(source.monthly_amount);
                                else newIncomeData.social_security_spouse = String(source.monthly_amount);
                                break;
                            case 'Pension':
                                if (source.owner === 'Client') newIncomeData.pension_you = String(source.monthly_amount);
                                else newIncomeData.pension_spouse = String(source.monthly_amount);
                                break;
                            case 'Rental Income':
                                if (source.owner === 'Client') newIncomeData.rental_income_you = String(source.monthly_amount);
                                else newIncomeData.rental_income_spouse = String(source.monthly_amount);
                                break;
                            case 'W-2 (Earned Income)':
                                if (source.owner === 'Client') newIncomeData.w2_you = String(source.monthly_amount);
                                else newIncomeData.w2_spouse = String(source.monthly_amount);
                                break;
                            default:
                                newOtherIncomes.push({ source: source.source, income: String(source.monthly_amount) });
                                break;
                        }
                    });

                    setIncomeData(newIncomeData);
                    setOtherIncomes(newOtherIncomes);
                }
            } catch (err: any) {
                setError("Could not load saved income information.");
            } finally {
                setIsFetching(false);
            }
        };

        fetchIncomeData();
    }, [token]);


    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setIncomeData(prev => ({ ...prev, [name]: value }));
    };
    
    
    const addOtherIncome = () => {
        setOtherIncomes(prev => [...prev, { source: '', income: '' }]);
    };
    const updateOtherIncome = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        const updated = [...otherIncomes];
        const key = name as keyof OtherIncome;
        updated[index][key] = value;
        setOtherIncomes(updated);
    };
     const removeOtherIncome = (indexToRemove: number) => {
        setOtherIncomes(prev => prev.filter((_, index) => index !== indexToRemove));
    };


   
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
        setError('');

        const income_sources: FetchedIncomeSource[] = [];
        if (incomeData.social_security_you) income_sources.push({ source: 'Social Security', owner: 'Client', monthly_amount: Number(incomeData.social_security_you) });
        if (incomeData.social_security_spouse) income_sources.push({ source: 'Social Security', owner: 'Spouse', monthly_amount: Number(incomeData.social_security_spouse) });
        if (incomeData.pension_you) income_sources.push({ source: 'Pension', owner: 'Client', monthly_amount: Number(incomeData.pension_you) });
        if (incomeData.pension_spouse) income_sources.push({ source: 'Pension', owner: 'Spouse', monthly_amount: Number(incomeData.pension_spouse) });
        if (incomeData.rental_income_you) income_sources.push({ source: 'Rental Income', owner: 'Client', monthly_amount: Number(incomeData.rental_income_you) });
        if (incomeData.rental_income_spouse) income_sources.push({ source: 'Rental Income', owner: 'Spouse', monthly_amount: Number(incomeData.rental_income_spouse) });
        if (incomeData.w2_you) income_sources.push({ source: 'W-2 (Earned Income)', owner: 'Client', monthly_amount: Number(incomeData.w2_you) });
        if (incomeData.w2_spouse) income_sources.push({ source: 'W-2 (Earned Income)', owner: 'Spouse', monthly_amount: Number(incomeData.w2_spouse) });
        
        otherIncomes.forEach(item => {
            if(item.source && item.income) income_sources.push({ source: item.source, owner: 'Client', monthly_amount: Number(item.income) });
        });

        try {
            const response = await fetch(`${apiUrl}/api/client/profile/income`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ income_sources })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message);
            navigate('/fact-finder/assets');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    if (isFetching) {
        return <div className="fact-finder-page"><div className="wizard-header"><h2>Loading...</h2></div></div>;
    }

    return (
        <div className="fact-finder-page">
            <div className="wizard-header">
                <h2>Where does your money come from? We'll use this to help you to manage and grow your income.</h2>
                <p>Almost there! Understanding your income sources is key to building a strong financial plan.</p>
            </div>
            <form onSubmit={handleSubmit} className="wizard-form">
                <div className="income-form-grid">
                   
                    <div className="income-section">
                        <h4>Social Security</h4>
                        <div className="income-split-group">
                            <div className="form-group"><label>You</label><input type="number" name="social_security_you" value={incomeData.social_security_you} onChange={handleChange} placeholder="$" /></div>
                            <div className="form-group"><label>Spouse</label><input type="number" name="social_security_spouse" value={incomeData.social_security_spouse} onChange={handleChange} placeholder="$" /></div>
                        </div>
                    </div>
                   
                    <div className="income-section">
                        <h4>Pension</h4>
                        <div className="income-split-group">
                            <div className="form-group"><label>You</label><input type="number" name="pension_you" value={incomeData.pension_you} onChange={handleChange} placeholder="$" /></div>
                            <div className="form-group"><label>Spouse</label><input type="number" name="pension_spouse" value={incomeData.pension_spouse} onChange={handleChange} placeholder="$" /></div>
                        </div>
                    </div>
                   
                    <div className="income-section">
                        <h4>Rental Income</h4>
                        <div className="income-split-group">
                            <div className="form-group"><label>You</label><input type="number" name="rental_income_you" value={incomeData.rental_income_you} onChange={handleChange} placeholder="$" /></div>
                            <div className="form-group"><label>Spouse</label><input type="number" name="rental_income_spouse" value={incomeData.rental_income_spouse} onChange={handleChange} placeholder="$" /></div>
                        </div>
                    </div>
                    
                    <div className="income-section">
                        <h4>W-2 (Earned Income)</h4>
                        <div className="income-split-group">
                            <div className="form-group"><label>You</label><input type="number" name="w2_you" value={incomeData.w2_you} onChange={handleChange} placeholder="$" /></div>
                            <div className="form-group"><label>Spouse</label><input type="number" name="w2_spouse" value={incomeData.w2_spouse} onChange={handleChange} placeholder="$" /></div>
                        </div>
                    </div>
                </div>

                
                <div className="form-section">
                    <div className="section-header">
                        <h4>Other Income (If Any)</h4>
                        <button type="button" className="add-button" onClick={addOtherIncome}>+ Add</button>
                    </div>
                    {otherIncomes.map((item, index) => (
                        <div key={index} className="dynamic-row labeled" style={{gridTemplateColumns: '2fr 1fr auto'}}>
                            <div className="form-group"><label>Please Specify the Source</label><input type="text" name="source" value={item.source} onChange={e => updateOtherIncome(index, e)} /></div>
                            <div className="form-group"><label>Income</label><input type="number" name="income" value={item.income} onChange={e => updateOtherIncome(index, e)} placeholder="$" /></div>
                            <button type="button" className="remove-button" onClick={() => removeOtherIncome(index)}>&times;</button>
                        </div>
                    ))}
                </div>

            
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
                {message && <p className="form-message success">{message}</p>}
                {error && <p className="form-message error">{error}</p>}
            </form>
        </div>
    );
};

export default FactFinderIncome;
