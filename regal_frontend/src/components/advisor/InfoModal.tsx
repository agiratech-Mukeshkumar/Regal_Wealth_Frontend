import React from 'react';
import './InfoModal.css';

interface InfoModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const taxBrackets = [
    { rate: '10%', single: '$0 to $11,925', hoh: '$0 to $17,000', married_jointly: '$0 to $23,850', married_separately: '$0 to $11,925' },
    { rate: '12%', single: '$11,925 to $48,475', hoh: '$17,000 to $64,850', married_jointly: '$23,850 to $96,950', married_separately: '$11,925 to $48,475' },
    { rate: '22%', single: '$48,475 to $103,350', hoh: '$64,850 to $103,350', married_jointly: '$96,950 to $206,700', married_separately: '$48,475 to $103,350', highlight: true },
    { rate: '24%', single: '$103,350 to $197,300', hoh: '$103,350 to $197,300', married_jointly: '$206,700 to $394,600', married_separately: '$103,350 to $197,300' },
    { rate: '32%', single: '$197,300 to $250,525', hoh: '$250,525 to $250,525', married_jointly: '$394,600 to $501,050', married_separately: '$197,300 to $250,525' },
    { rate: '35%', single: '$250,525 to $375,800', hoh: '$375,800 to $375,800', married_jointly: '$501,050 to $751,600', married_separately: '$250,525 to $375,800' },
    { rate: '37%', single: '$375,800 or more', hoh: '$626,350 or more', married_jointly: '$751,600 or more', married_separately: '$375,800 or more' },
];

const InfoModal: React.FC<InfoModalProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>2025 Federal Income Tax Brackets by Filing Status</h3>
                    <button onClick={onClose} className="close-button">&times;</button>
                </div>
                <div className="modal-body">
                    <table className="tax-bracket-table">
                        <thead>
                            <tr>
                                <th>Tax Rate</th>
                                <th>Single</th>
                                <th>Head of Household</th>
                                <th>Married Filing Jointly or Qualifying Surviving Spouse</th>
                                <th>Married Filing Separately</th>
                            </tr>
                        </thead>
                        <tbody>
                            {taxBrackets.map((bracket) => (
                                <tr key={bracket.rate} className={bracket.highlight ? 'highlight' : ''}>
                                    <td>{bracket.rate}</td>
                                    <td>{bracket.single}</td>
                                    <td>{bracket.hoh}</td>
                                    <td>{bracket.married_jointly}</td>
                                    <td>{bracket.married_separately}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default InfoModal;
