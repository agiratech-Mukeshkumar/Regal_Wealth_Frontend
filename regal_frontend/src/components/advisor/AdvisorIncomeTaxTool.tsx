import React, { useState, useMemo } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import InfoModal from './InfoModal';
import './AdvisorIncomeTaxTool.css';

const apiUrl = process.env.REACT_APP_API_URL;

interface TaxResults {
    gross_income: number;
    total_deductions: number;
    taxable_income: number;
    final_tax_owed: number;
    effective_tax_rate_percent: number;
    marginal_tax_rate_percent: number;
    tax_brackets: { limit: number; rate: number }[];
}


const MarginalTaxRateChart: React.FC<{ taxableIncome: number }> = ({ taxableIncome }) => {

    const brackets = [
        { income: 23850, rate: '10%' },
        { income: 73100, rate: '12%' },
        { income: 190750, rate: '22%' },
        { income: 187980, rate: '24%' },
    ];

    return (
        <div className="marginal-rate-chart">
            <div className="chart-header">
                <h5>Marginal Tax Rates</h5>
                <span>Married Filing Jointly, 2025</span>
            </div>
            <div className="chart-legend">
                <div className="legend-item"><span className="dot blue"></span>10%</div>
                <div className="legend-item"><span className="dot teal"></span>12%</div>
                <div className="legend-item"><span className="dot cyan"></span>22%</div>
                <div className="legend-item"><span className="dot sky"></span>24%</div>
                <div className="legend-item"><span className="dot gray"></span>37%</div>
            </div>
            <div className="chart-bar-container">
                {brackets.map((bracket, index) => (
                    <div key={index} className="chart-bar-segment">
                        <div className="bar">
                            <span>${bracket.income.toLocaleString()} ({bracket.rate})</span>
                        </div>
                        <div className="label">${bracket.income.toLocaleString()}</div>
                    </div>
                ))}
            </div>
        </div>
    );
};


const AdvisorIncomeTaxTool: React.FC = () => {
    const { token } = useAuth();

    const [formData, setFormData] = useState({
        filing_status: 'married_jointly',
        is_over_65: false,
        spouse_over_65: false,
        gross_income: "",
        itemized_deductions: "",
        dependents: "",
        fica: "",
        state_tax: "",
        local_tax: "",
        contrib_401k: "",
        contrib_ira: "",
        other_deductions: "",
        tax_credit: ""
    });
    const [results, setResults] = useState<TaxResults | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        if (type === 'checkbox') {
            const { checked } = e.target as HTMLInputElement;
            setFormData({ ...formData, [name]: checked });
        } else {
            setFormData({ ...formData, [name]: value });
        }
    };


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        setResults(null);

        const totalDeductions =
            (Number(formData.itemized_deductions) || 0) +
            (Number(formData.contrib_401k) || 0) +
            (Number(formData.contrib_ira) || 0) +
            (Number(formData.other_deductions) || 0);

        const apiPayload = {
            gross_income: Number(formData.gross_income) || 0,
            filing_status: formData.filing_status,
            deductions: totalDeductions,
            credits: Number(formData.tax_credit) || 0,
            dependents: Number(formData.dependents) || 0
        };

        try {
            const response = await fetch(`${apiUrl}/api/advisor/tools/income-tax`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(apiPayload)
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || 'Calculation failed. Please check your inputs.');
            }
            setResults(data.results);
        } catch (err: any) {
            setError(err.message);
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };


    const displayData = useMemo(() => {
        if (!results) return null;

        const grossIncome = results.gross_income;
        const retirementContributions = (Number(formData.contrib_401k) || 0) + (Number(formData.contrib_ira) || 0);
        const otherDeductions = Number(formData.other_deductions) || 0;
        const standardOrItemizedDeduction = results.total_deductions - retirementContributions - otherDeductions;

        const federalTax = results.final_tax_owed;
        const ficaTax = (grossIncome * (Number(formData.fica) / 100));
        const stateTax = (grossIncome * (Number(formData.state_tax) / 100));
        const localTax = (grossIncome * (Number(formData.local_tax) / 100));

        const pieChartData = [
            { name: 'Federal Tax', value: federalTax },
            { name: 'FICA Tax', value: ficaTax },
            { name: 'State Tax', value: stateTax },
            { name: 'Local Tax', value: localTax }
        ].filter(item => item.value > 0);

        const totalBurden = pieChartData.reduce((sum, item) => sum + item.value, 0);

        return {
            retirementContributions,
            otherDeductions,
            standardOrItemizedDeduction,
            pieChartData,
            totalBurden
        };
    }, [results, formData]);

    const COLORS = ['#1d4ed8', '#3b82f6', '#60a5fa', '#93c5fd'];

    return (
        <div className="tax-tool-page">
            <InfoModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
            <div className="tool-layout">
                <div className="tool-form-section">
                    <h2 className="tool-title">Income Tax</h2>
                    <form onSubmit={handleSubmit}>

                        <div className="form-grid">
                            <div className="form-group span-2">
                                <label>Filing Status*</label>
                                <select name="filing_status" value={formData.filing_status} onChange={handleChange}>
                                    <option value="single">Single</option>
                                    <option value="married_jointly">Married Filing Jointly</option>
                                    <option value="married_separately">Married Filing Separately</option>
                                    <option value="hoh">Head of Household</option>
                                </select>
                                <div className="checkbox-group">
                                    <label><input type="checkbox" name="is_over_65" checked={formData.is_over_65} onChange={handleChange} /> Check if you are 65 or older</label>
                                    <label><input type="checkbox" name="spouse_over_65" checked={formData.spouse_over_65} onChange={handleChange} /> Check if you spouse is 65 or older</label>
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Annual Income*</label>
                                <input type="number" placeholder="$" name="gross_income" value={formData.gross_income} onChange={handleChange} required />
                            </div>
                            <div className="form-group">
                                <label>Itemized Deductions</label>
                                <input type="number" placeholder="$" name="itemized_deductions" value={formData.itemized_deductions} onChange={handleChange} />
                            </div>
                            <div className="form-group">
                                <label>Dependents qualifying for child tax credit</label>
                                <input type="number" placeholder="Number" name="dependents" value={formData.dependents} onChange={handleChange} />
                            </div>
                            <div className="form-group">
                                <label>FICA</label>
                                <input type="number" placeholder="%" name="fica" value={formData.fica} onChange={handleChange} />
                            </div>
                            <div className="form-group">
                                <label>State</label>
                                <input type="number" placeholder="%" name="state_tax" value={formData.state_tax} onChange={handleChange} />
                            </div>
                            <div className="form-group">
                                <label>Local</label>
                                <input type="number" placeholder="%" name="local_tax" value={formData.local_tax} onChange={handleChange} />
                            </div>
                            <div className="form-group">
                                <label>401(k) Contributions</label>
                                <input type="number" placeholder="$" name="contrib_401k" value={formData.contrib_401k} onChange={handleChange} />
                            </div>
                            <div className="form-group">
                                <label>IRA Contributions</label>
                                <input type="number" placeholder="$" name="contrib_ira" value={formData.contrib_ira} onChange={handleChange} />
                            </div>
                            <div className="form-group">
                                <label>Other Deductions</label>
                                <input type="number" placeholder="$" name="other_deductions" value={formData.other_deductions} onChange={handleChange} />
                            </div>
                            <div className="form-group">
                                <label>Tax Credit</label>
                                <input type="number" placeholder="$" name="tax_credit" value={formData.tax_credit} onChange={handleChange} />
                            </div>
                        </div>
                        <div className="form-actions">
                            <input type="text" placeholder="Plan Name" className="plan-name-input" />
                            <button type="button" className="save-button">Save</button>
                            <button type="submit" className="calculate-button" disabled={isLoading}>
                                {isLoading ? 'Calculating...' : 'Calculate'}
                            </button>
                        </div>
                    </form>

                    {results && displayData && (
                        <div className="tax-burden-section">

                            <div className="burden-summary">
                                <h4>Total Estimated 2025 Tax Burden</h4>
                                <ul>
                                    {displayData.pieChartData.map((entry, index) => (
                                        <li key={entry.name}>
                                            <span className="legend-dot" style={{ backgroundColor: COLORS[index] }}></span>
                                            {entry.name}
                                            <span className="legend-value">${entry.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                        </li>
                                    ))}
                                </ul>
                                <div className="total-burden">
                                    Total Estimated Tax Burden
                                    <span>${displayData.totalBurden.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                            </div>
                            <div className="burden-chart">
                                <ResponsiveContainer width="100%" height={200}>
                                    <PieChart>
                                        <Pie data={displayData.pieChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={80} fill="#8884d8" paddingAngle={5}>
                                            {displayData.pieChartData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                        </Pie>
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}
                </div>

                <div className="tool-results-section">
                    <div className="results-header">
                        <h4>Breakdown</h4>
                        <button className="info-button" onClick={() => setIsModalOpen(true)}>ⓘ</button>
                    </div>
                    {!results && !isLoading && <div className="no-results">{error ? <span className="error-message">{error}</span> : 'Please fill out the form and click "Calculate" to see your results.'}</div>}
                    {isLoading && <div className="no-results">Calculating...</div>}

                    {results && displayData && (
                        <>

                            <div className="result-card">
                                <p>For the 2025 tax year, your estimated taxes owed are</p>
                                <h2 className="taxes-owed">${results.final_tax_owed.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h2>
                            </div>
                            <div className="result-group">
                                <h5>Taxable Income</h5>
                                <div className="result-row"><span>Gross Income</span><span>${results.gross_income.toLocaleString()}</span></div>
                                <div className="result-row"><span>{formData.itemized_deductions ? 'Itemized' : 'Standard'} Deduction</span><span>-${displayData.standardOrItemizedDeduction.toLocaleString()}</span></div>
                                <div className="result-row"><span>Gross Retirement Contributions</span><span>-${displayData.retirementContributions.toLocaleString()}</span></div>
                                <div className="result-row"><span>Other Deductions</span><span>-${displayData.otherDeductions.toLocaleString()}</span></div>
                                <div className="result-row total"><span>Taxable Income</span><span>${results.taxable_income.toLocaleString()}</span></div>
                            </div>
                            <div className="result-group">
                                <h5>Estimated Federal Taxes</h5>
                                <div className="result-row"><span>Taxes Before Adjustments</span><span>${(results.final_tax_owed).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></div>
                                <div className="result-row"><span>Federal Taxes Withheld</span><span>-$0</span></div>
                                <div className="result-row"><span>Tax Credits</span><span>-${Number(formData.tax_credit).toLocaleString()}</span></div>
                                <div className="result-row total dark"><span>Taxes Owed</span><span>${results.final_tax_owed.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></div>
                            </div>
                            <h5 className="tax-rate-header">Tax Rate</h5>
                            <div className="tax-rate-cards">
                                <div className="rate-card"><span>Effective Tax Rate</span><strong>{results.effective_tax_rate_percent}%</strong></div>
                                <div className="rate-card"><span>Marginal Tax Rate</span><strong>{results.marginal_tax_rate_percent}%</strong></div>
                            </div>
                            <MarginalTaxRateChart taxableIncome={results.taxable_income} />
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
export default AdvisorIncomeTaxTool;
