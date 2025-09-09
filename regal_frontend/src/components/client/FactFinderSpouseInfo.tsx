import React, { useState, useEffect } from 'react';
import { useAuth } from '../../auth/AuthContext';
import './FactFinder.css';
import { useNavigate } from 'react-router-dom';

const API_BASE = "https://api.countrystatecity.in/v1";
const API_KEY = "MXpQSXdVZ09iVHNEZ21aaUJCa29yN3B3dkRyUnF3VDV3UEROeFpjaQ==";
const apiUrl = process.env.REACT_APP_API_URL;

const isFieldRequired = (fieldName: string): boolean => {
    const requiredFields = [
        'first_name', 'last_name', 'date_of_birth', 'email', 
        'mobile_number', 'occupation', 'employer_name'
    ];
    return requiredFields.includes(fieldName);
};

const FactFinderSpouseInfo: React.FC = () => {
    const { token } = useAuth();
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        first_name: "",
        last_name: "",
        date_of_birth: "",
        email: "",
        mobile_country: "IN",
        mobile_code: "+91",
        mobile_number: "",
        occupation: "",
        employer_name: ""
    });

    const [isLoading, setIsLoading] = useState(false);
    const [isFetching, setIsFetching] = useState(true);
    const [message, setMessage] = useState('');
    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    const [countries, setCountries] = useState<any[]>([]);

    useEffect(() => {
        fetch(`${API_BASE}/countries`, { headers: { "X-CSCAPI-KEY": API_KEY } })
            .then(res => res.json())
            .then(data => Array.isArray(data) ? setCountries(data.map(c => ({ name: c.name, iso2: c.iso2, phonecode: c.phonecode }))) : [])
            .catch(err => console.error("Error fetching countries:", err));
    }, []);

    useEffect(() => {
        const fetchSpouseData = async () => {
            if (!token) return;
            setIsFetching(true);
            try {
                const response = await fetch(`${apiUrl}/api/client/profile/spouse`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (response.status === 404) return;
                if (!response.ok) throw new Error('Failed to fetch spouse data.');
                const data = await response.json();
                if (data) {
                    setFormData(prev => ({ ...prev, ...data }));
                }
            } catch (err: any) {
                setMessage("Could not load saved information.");
            } finally {
                setIsFetching(false);
            }
        };
        fetchSpouseData();
    }, [token]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const handleSelectMobileCountry = (iso2: string) => {
        const selected = countries.find(c => c.iso2 === iso2);
        if (!selected) return;
        setFormData(prev => ({ ...prev, mobile_country: iso2, mobile_code: `+${selected.phonecode}` }));
    };

    const getValidationError = (name: string, value: string): string => {
        if (isFieldRequired(name) && !value.trim()) {
            return "This field is required.";
        }
        switch (name) {
            case 'date_of_birth':
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                if (new Date(value) > today) return "Date of birth cannot be in the future.";
                break;
            case 'email':
                if (value && !/\S+@\S+\.\S+/.test(value)) return "Please enter a valid email address.";
                break;
            case 'mobile_number':
                if (value && !/^\d{7,15}$/.test(value)) return "Please enter a valid mobile number (7-15 digits).";
                break;
        }
        return '';
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        const error = getValidationError(name, value);
        setErrors(prev => ({ ...prev, [name]: error }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const newErrors: { [key: string]: string } = {};
        let isValid = true;
        (Object.keys(formData) as Array<keyof typeof formData>).forEach(key => {
            const error = getValidationError(key, formData[key]);
            if (error) {
                newErrors[key] = error;
                isValid = false;
            }
        });
        
        setErrors(newErrors);
        if (!isValid) return;

        setIsLoading(true);
        setMessage('');
        try {
            const response = await fetch(`${apiUrl}/api/client/profile/spouse`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(formData)
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message);
            navigate('/fact-finder/family-info');
        } catch (err: any) {
            setMessage(err.message);
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
                <h2>Tell us about your spouse.</h2>
                <p>Providing these details helps us create a more complete financial picture for your household.</p>
            </div>

            <form onSubmit={handleSubmit} noValidate className="wizard-form">
                <div className="form-section">
                    <h4>Spouse's Information</h4>
                    <div className="form-grid four-columns">
                        <div className="form-group">
                            <label>First Name*</label>
                            <input type="text" name="first_name" value={formData.first_name} onChange={handleChange} onBlur={handleBlur} />
                            {errors.first_name && <small className="error-text">{errors.first_name}</small>}
                        </div>
                        <div className="form-group">
                            <label>Last Name*</label>
                            <input type="text" name="last_name" value={formData.last_name} onChange={handleChange} onBlur={handleBlur} />
                            {errors.last_name && <small className="error-text">{errors.last_name}</small>}
                        </div>
                        <div className="form-group">
                            <label>Date of Birth*</label>
                            <input type="date" name="date_of_birth" value={formData.date_of_birth} onChange={handleChange} onBlur={handleBlur} />
                            {errors.date_of_birth && <small className="error-text">{errors.date_of_birth}</small>}
                        </div>
                        <div className="form-group">
                            <label>Email Address*</label>
                            <input type="email" name="email" value={formData.email} onChange={handleChange} onBlur={handleBlur} />
                            {errors.email && <small className="error-text">{errors.email}</small>}
                        </div>
                        <div className="form-group mobile-input">
                            <label>Mobile Number*</label>
                            <div className="mobile-input-group">
                                <select value={formData.mobile_country} onChange={(e) => handleSelectMobileCountry(e.target.value)}>
                                    {countries.map((c) => (<option key={c.iso2} value={c.iso2}>{c.iso2} (+{c.phonecode})</option>))}
                                </select>
                                <div className="mobile-number-wrapper">
                                    <input type="tel" name="mobile_number" value={formData.mobile_number} onChange={handleChange} onBlur={handleBlur} placeholder="Enter number" />
                                    {errors.mobile_number && <small className="error-text">{errors.mobile_number}</small>}
                                </div>
                            </div>
                        </div>
                        <div className="form-group">
                            <label>Occupation*</label>
                            <input type="text" name="occupation" value={formData.occupation} onChange={handleChange} onBlur={handleBlur} />
                            {errors.occupation && <small className="error-text">{errors.occupation}</small>}
                        </div>
                        <div className="form-group">
                            <label>Employer Name*</label>
                            <input type="text" name="employer_name" value={formData.employer_name} onChange={handleChange} onBlur={handleBlur} />
                            {errors.employer_name && <small className="error-text">{errors.employer_name}</small>}
                        </div>
                    </div>
                </div>
                <div className="form-actions">
                     <button type="button" className="secondary-button" onClick={() => navigate('/fact-finder/personal-info')}>Back</button>
                    <button type="submit" className="continue-button" disabled={isLoading}>
                        {isLoading ? 'Saving...' : 'Continue'}
                    </button>
                </div>
                {message && <p className="form-message error">{message}</p>}
            </form>
        </div>
    );
};

export default FactFinderSpouseInfo;
