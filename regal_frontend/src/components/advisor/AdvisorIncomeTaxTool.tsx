import React, {useState}from 'react';
import { useAuth } from '../../auth/AuthContext';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts';
import './AdvisorIncomeTaxTool.css'; // We'll create this

// --- Interface for API response ---
interface TaxResults {
    gross_income: number;
    total_deductions: number;
    taxable_income: number;
    final_tax_owed: number;
    effective_tax_rate_percent: number;
    marginal_tax_rate_percent: number;
}

const AdvisorIncomeTaxTool: React.FC = () => {
    const { token } = useAuth();
    const [formData, setFormData] = useState({
        gross_income: "150000",
        deductions: "37250", // Standard Deduction + Contributions + Other
        credits: "0"
    });
    const [results, setResults] = useState<TaxResults | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const response = await fetch('http://localhost:5000/api/advisor/tools/income-tax', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(formData)
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Calculation failed.');
            setResults(data.results);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };
    
    // Data for the pie chart
    const pieChartData = [
        { name: 'Federal Tax', value: results?.final_tax_owed || 0 },
        { name: 'FICA Tax', value: 871 }, // Example values
        { name: 'State Tax', value: 271 },
        { name: 'Local Tax', value: 4336 }
    ];
    const COLORS = ['#1d4ed8', '#3b82f6', '#60a5fa', '#93c5fd'];

    return (
        <div className="admin-page">
            <div className="tool-layout">
                {/* --- Left Side: Input Form --- */}
                <div className="tool-form-section">
                    <h2 className="tool-title">Income Tax</h2>
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label>Annual Income*</label>
                            <input type="number" name="gross_income" value={formData.gross_income} onChange={handleChange} />
                        </div>
                        <div className="form-group">
                            <label>Deductions*</label>
                            <input type="number" name="deductions" value={formData.deductions} onChange={handleChange} />
                        </div>
                        {/* Add more fields as needed */}
                        <button type="submit" className="calculate-button" disabled={isLoading}>
                            {isLoading ? 'Calculating...' : 'Calculate'}
                        </button>
                    </form>

                     {/* --- Bottom: Tax Burden Chart --- */}
                     {results && (
                        <div className="tax-burden-chart">
                            <h4>Total Estimated 2025 Tax Burden</h4>
                            <ResponsiveContainer width="100%" height={200}>
                                <PieChart>
                                    <Pie data={pieChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} fill="#8884d8">
                                        {pieChartData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                    </Pie>
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>
                {/* --- Right Side: Results Breakdown --- */}
                {results && (
                    <div className="tool-results-section">
                        <h4>Breakdown</h4>
                        <div className="result-card">
                            <p>For the 2025 tax year, your estimated taxes owed are</p>
                            <h2 className="taxes-owed">${results.final_tax_owed.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h2>
                        </div>
                        <div className="result-group">
                            <h5>Taxable Income</h5>
                            <div className="result-row"><span>Gross Income</span><span>${results.gross_income.toLocaleString()}</span></div>
                            <div className="result-row"><span>Total Deductions</span><span>-${results.total_deductions.toLocaleString()}</span></div>
                            <div className="result-row total"><span>Taxable Income</span><span>${results.taxable_income.toLocaleString()}</span></div>
                        </div>
                        <div className="result-group">
                            <h5>Estimated Federal Taxes</h5>
                            {/* ... more rows for detailed breakdown ... */}
                             <div className="result-row total"><span>Taxes Owed</span><span>${results.final_tax_owed.toLocaleString()}</span></div>
                        </div>
                        <div className="tax-rate-cards">
                            <div className="rate-card"><span>Effective Tax Rate</span><strong>{results.effective_tax_rate_percent}%</strong></div>
                            <div className="rate-card"><span>Marginal Tax Rate</span><strong>{results.marginal_tax_rate_percent}%</strong></div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
export default AdvisorIncomeTaxTool;
