import React, { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import './FactFinder.css';
import { useNavigate } from 'react-router-dom';

const FactFinderSpouseInfo: React.FC = () => {
    const { token } = useAuth();
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        // Spouse Information
        first_name: "",
        last_name: "",
        date_of_birth: "",
        marital_status: "",
        mobile_number: "",
        email: "",
        // Employment Information
        occupation: "",
        employer_name: ""
    });
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage('');
        try {
            const response = await fetch('http://localhost:5000/api/client/profile/spouse', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message);
            navigate("/fact-finder/family-info");
        } catch (err: any) {
            setMessage(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fact-finder-page">
            <div className="wizard-header">
                <h2>If you're married, we'll need a few details about your spouse to provide best recommendations.</h2>
                <p>Working together means better planning. Don't worry, you can always update this later!</p>
            </div>
            <form onSubmit={handleSubmit} className="wizard-form">
                
                <div className="form-section">
                    <h4>Spouse Information</h4>
                    <div className="form-grid four-columns">
                        <div className="form-group"><label>First Name*</label><input type="text" name="first_name" value={formData.first_name} onChange={handleChange} required /></div>
                        <div className="form-group"><label>Last Name*</label><input type="text" name="last_name" value={formData.last_name} onChange={handleChange} required /></div>
                        <div className="form-group"><label>Date of Birth*</label><input type="date" name="date_of_birth" value={formData.date_of_birth} onChange={handleChange} required /></div>
                        <div className="form-group"><label>Marital Status*</label><select name="marital_status" value={formData.marital_status} onChange={handleChange} required><option value="">Select...</option><option value="Married">Married</option></select></div>
                        <div className="form-group"><label>Mobile Number*</label><input type="tel" name="mobile_number" value={formData.mobile_number} onChange={handleChange} required /></div>
                        <div className="form-group"><label>Email Address*</label><input type="email" name="email" value={formData.email} onChange={handleChange} required /></div>
                        <div className="form-group"><label>Profile Picture</label><input type="file" /></div>
                    </div>
                </div>

                <div className="form-section">
                    <h4>Employment Information</h4>
                     <div className="form-grid two-columns">
                        <div className="form-group"><label>Occupation*</label><input type="text" name="occupation" value={formData.occupation} onChange={handleChange} required /></div>
                        <div className="form-group"><label>Employer Name</label><input type="text" name="employer_name" value={formData.employer_name} onChange={handleChange} /></div>
                    </div>
                </div>
                
                <div className="form-actions">
                    <button type="button" className="secondary-button" onClick={() => navigate('/fact-finder/personal-info')}>Back</button>
                    <button type="submit" className="continue-button" disabled={isLoading}>
                        {isLoading ? 'Saving...' : 'Continue'}
                    </button>
                </div>
                {message && <p className="form-message">{message}</p>}
            </form>
        </div>
    );
};

export default FactFinderSpouseInfo;
