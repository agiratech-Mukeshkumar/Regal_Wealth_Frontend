import React from 'react';
import { Link } from 'react-router-dom';

import incomeTaxImg from '../../images/income-tax.png';
import taxMatrixImg from '../../images/Tax-matrix.png';
import socialSecurityImg from '../../images/Social-security.png';
import retirementSavingsImg from '../../images/Retirement-savings.png';
import './AdvisorToolsHub.css';

interface ToolCardProps {
    title: string;
    description: string;
    value: string;
    subtext: string;
    to: string;
    color: 'blue' | 'grey' | 'pink' | 'violet';
    imageUrl: string;
}

const ToolCard: React.FC<ToolCardProps> = ({ title, description, value, subtext, to, color, imageUrl }) => (
    <Link to={to} className={`tool-card ${color}`}>
        <img src={imageUrl} alt={`${title} illustration`} className="card-illustration" />
        <div className="card-content">
            <p className="card-title">{title}</p>
            <h3 className="card-description">{description}</h3>
            <div className="card-footer">
                <div>
                    <p className="card-value">{value}</p>
                    <p className="card-subtext">{subtext}</p>
                </div>
                <div className="card-arrow-circle">
                    <span>↗</span>
                </div>
            </div>
        </div>
    </Link>
);

const AdvisorToolsHub: React.FC = () => {
    return (
        <div className="tools-hub-page">
            <header className="page-main-header">
                <h2>Planning ahead? Our tools help you secure a better future for you and your loved ones.</h2>
                <p>Use these calculators to make smart, informed choices for every stage of life.</p>
            </header>
            <div className="tools-grid">
                <ToolCard 
                    title="Income Tax"
                    description="Find Out Your Income Tax in Seconds"
                    value="$43,200"
                    subtext="By Age 50+ Based on Contributions"
                    to="/tools/income-tax"
                    color="blue"
                    imageUrl={incomeTaxImg}
                />
                 <ToolCard 
                    title="Tax Matrix"
                    description="Maximize Returns. Minimize Tax Burden."
                    value="$43,200"
                    subtext="Reported Income + 2024"
                    to="#"
                    color="grey"
                    imageUrl={taxMatrixImg}
                />
                 <ToolCard 
                    title="Social Security"
                    description="Know What You'll Receive at Retirement"
                    value="$2,350/mon"
                    subtext="At Age 67+ Based on 2024 Income"
                    to="#"
                    color="pink"
                    imageUrl={socialSecurityImg}
                />
                 <ToolCard 
                    title="Retirement Savings"
                    description="Estimate Future Value of Retirement Accounts"
                    value="$185,000"
                    subtext="By Age 60+ Based on Contributions"
                    to="#"
                    color="violet"
                    imageUrl={retirementSavingsImg}
                />
            </div>
        </div>
    );
};

export default AdvisorToolsHub;