import React, { useState, useEffect } from 'react';
import { useAuth } from '../../auth/AuthContext';
import './FactFinder.css';
import { useNavigate } from 'react-router-dom';

const API_BASE = "https://api.countrystatecity.in/v1";
const API_KEY = "MXpQSXdVZ09iVHNEZ21aaUJCa29yN3B3dkRyUnF3VDV3UEROeFpjaQ=="; 


const isFieldRequired = (fieldName: string): boolean => {
    const requiredFields = [
        'date_of_birth', 'marital_status', 'mobile_number', 'preferred_contact_method',
        'address_line_1', 'city', 'state', 'country', 'zip_code', 'occupation'
    ];
    return requiredFields.includes(fieldName);
};


const FactFinderPersonalInfo: React.FC = () => {
    const { token, user } = useAuth();
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        first_name: user?.first_name || "",
        last_name: user?.last_name || "",
        date_of_birth: "",
        marital_status: "",
        mobile_country: "IN",
        mobile_code: "+91",
        mobile_number: "",
        email: user?.email || "",
        preferred_contact_method: "",
        address_line_1: "",
        address_line_2: "",
        city: "",
        state: "",
        country: "",
        zip_code: "",
        occupation: "",
        employer_name: ""
    });

    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [isFetching, setIsFetching] = useState(true);
    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    const [countries, setCountries] = useState<any[]>([]);
    const [states, setStates] = useState<any[]>([]);
    const [cities, setCities] = useState<any[]>([]);
    const [filteredCountries, setFilteredCountries] = useState<any[]>([]);
    const [filteredStates, setFilteredStates] = useState<any[]>([]);
    const [filteredCities, setFilteredCities] = useState<any[]>([]);
    const [showCountrySuggestions, setShowCountrySuggestions] = useState(false);
    const [showStateSuggestions, setShowStateSuggestions] = useState(false);
    const [showCitySuggestions, setShowCitySuggestions] = useState(false);

    useEffect(() => {
        if (user) {
            setFormData(prev => ({ ...prev, first_name: user.first_name, last_name: user.last_name, email: user.email }));
        }
    }, [user]);

    useEffect(() => {
        const fetchProfileData = async () => {
            if (!token) return;
            setIsFetching(true);
            try {
                const response = await fetch('http://localhost:5000/api/client/profile/personal', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (response.status === 404) return;
                if (!response.ok) throw new Error('Failed to fetch profile data.');
                
                const data = await response.json();
                if (data) {
                    setFormData(prev => ({ ...prev, ...data, date_of_birth: data.date_of_birth || "" }));
                }
            } catch (err: any) {
                setMessage("Could not load your saved information.");
            } finally {
                setIsFetching(false);
            }
        };
        fetchProfileData();
    }, [token]);

    useEffect(() => {
        fetch(`${API_BASE}/countries`, { headers: { "X-CSCAPI-KEY": API_KEY } })
            .then(res => res.json())
            .then(data => Array.isArray(data) ? setCountries(data.map(c => ({ name: c.name, iso2: c.iso2, phonecode: c.phonecode }))) : setCountries([]))
            .catch(err => console.error("Error fetching countries:", err));
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }

    
        if (name === "country") {
            setStates([]);
            setCities([]);
            if (value.trim() === "") {
                setFilteredCountries([]);
                setShowCountrySuggestions(false);
            } else {
                const matches = countries.filter(c =>
                    c.name.toLowerCase().includes(value.toLowerCase())
                );
                setFilteredCountries(matches);
                setShowCountrySuggestions(true);
            }
        }
        if (name === "state") {
            setCities([]);
            if (value.trim() === "") {
                setFilteredStates([]);
                setShowStateSuggestions(false);
            } else {
                const matches = states.filter(s =>
                    s.name.toLowerCase().includes(value.toLowerCase())
                );
                setFilteredStates(matches);
                setShowStateSuggestions(true);
            }
        }
        if (name === "city") {
            if (value.trim() === "") {
                setFilteredCities([]);
                setShowCitySuggestions(false);
            } else {
                const matches = cities.filter(c =>
                    c.name.toLowerCase().includes(value.toLowerCase())
                );
                setFilteredCities(matches);
                setShowCitySuggestions(true);
            }
        }
    };
    
    const handleSelectCountry = (country: any) => {
        setFormData(prev => ({ ...prev, country: country.name, state: "", city: "" }));
        setShowCountrySuggestions(false);
        fetch(`${API_BASE}/countries/${country.iso2}/states`, { headers: { "X-CSCAPI-KEY": API_KEY } })
            .then(res => res.json()).then(data => setStates(Array.isArray(data) ? data : [])).catch(err => console.error(err));
    };

    const handleSelectState = (state: any) => {
        setFormData(prev => ({ ...prev, state: state.name, city: "" }));
        setShowStateSuggestions(false);
        const selectedCountry = countries.find(c => c.name === formData.country);
        if (!selectedCountry) return;
        fetch(`${API_BASE}/countries/${selectedCountry.iso2}/states/${state.iso2}/cities`, { headers: { "X-CSCAPI-KEY": API_KEY } })
            .then(res => res.json()).then(data => setCities(Array.isArray(data) ? data : [])).catch(err => console.error(err));
    };

    const handleSelectCity = (city: any) => {
        setFormData(prev => ({ ...prev, city: city.name }));
        setShowCitySuggestions(false);
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
            case 'mobile_number':
                if (value && !/^\d{7,15}$/.test(value)) return "Please enter a valid mobile number (7-15 digits).";
                break;
            case 'zip_code':
                if (value && !/^[A-Za-z0-9\s-]{3,10}$/.test(value)) return "Please enter a valid postal code.";
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
            const response = await fetch('http://localhost:5000/api/client/profile/personal', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(formData)
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message);
            
            if (formData.marital_status === 'Single' || formData.marital_status === 'Widowed') {
                 navigate('/fact-finder/family-info');
            } else {
                 navigate('/fact-finder/spouse-info');
            }
        } catch (err: any) {
            setMessage(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    if (isFetching) { return <div className="fact-finder-page"><h2>Loading...</h2></div>; }

    return (
        <div className="fact-finder-page">
            <div className="wizard-header">
                <h2>We'll start with basics. This information helps us get to know you and tailor your experience.</h2>
                <p>You're on your way! Accurate details here ensure everything else goes smoothly.</p>
            </div>
            <form onSubmit={handleSubmit} noValidate className="wizard-form">
                <div className="form-section">
                    <h4>Personal Information</h4>
                    <div className="form-grid four-columns">
                        <div className="form-group">
                            <label>First Name*</label>
                            <input type="text" name="first_name" value={formData.first_name} disabled />
                        </div>
                        <div className="form-group">
                            <label>Last Name*</label>
                            <input type="text" name="last_name" value={formData.last_name} disabled />
                        </div>
                        <div className="form-group">
                            <label>Date of Birth*</label>
                            <input type="date" name="date_of_birth" value={formData.date_of_birth} onChange={handleChange} onBlur={handleBlur} />
                            {errors.date_of_birth && <small className="error-text">{errors.date_of_birth}</small>}
                        </div>
                        <div className="form-group">
                            <label>Marital Status*</label>
                            <select name="marital_status" value={formData.marital_status} onChange={handleChange} onBlur={handleBlur}>
                                <option value="">Select...</option>
                                <option value="Single">Single</option>
                                <option value="Married">Married</option>
                                <option value="Divorced">Divorced</option>
                                <option value="Widowed">Widowed</option>
                            </select>
                            {errors.marital_status && <small className="error-text">{errors.marital_status}</small>}
                        </div>
                        <div className="form-group mobile-input">
                            <label>Mobile Number*</label>
                            <div className="mobile-input-group">
                                <select value={formData.mobile_country} onChange={(e) => handleSelectMobileCountry(e.target.value)}>
                                    {countries.map((c) => (<option key={c.iso2} value={c.iso2}>{c.iso2} ({c.phonecode})</option>))}
                                </select>
                                <div className="mobile-number-wrapper">
                                    <input type="tel" name="mobile_number" value={formData.mobile_number} onChange={handleChange} onBlur={handleBlur} placeholder="Enter number" />
                                    {errors.mobile_number && <small className="error-text">{errors.mobile_number}</small>}
                                </div>
                            </div>
                        </div>
                        <div className="form-group">
                            <label>Email Address*</label>
                            <input type="email" name="email" value={formData.email} disabled />
                        </div>
                        <div className="form-group">
                            <label>Preferred Method of Contact*</label>
                            <select name="preferred_contact_method" value={formData.preferred_contact_method} onChange={handleChange} onBlur={handleBlur}>
                                <option value="">Select...</option>
                                <option value="Email">Email</option>
                                <option value="Mobile">Mobile</option>
                            </select>
                            {errors.preferred_contact_method && <small className="error-text">{errors.preferred_contact_method}</small>}
                        </div>
                        <div className="form-group"><label>Profile Picture</label><input type="file" /></div>
                    </div>
                </div>

                <div className="form-section">
                    <h4>Address</h4>
                    <div className="form-grid four-columns">
                         <div className="form-group">
                            <label>Address Line 1*</label>
                            <input type="text" name="address_line_1" value={formData.address_line_1} onChange={handleChange} onBlur={handleBlur} />
                            {errors.address_line_1 && <small className="error-text">{errors.address_line_1}</small>}
                        </div>
                        <div className="form-group">
                            <label>Address Line 2</label>
                            <input type="text" name="address_line_2" value={formData.address_line_2} onChange={handleChange} />
                        </div>
                        <div className="form-group" style={{ position: 'relative' }}>
                            <label>Country*</label>
                            <input type="text" name="country" value={formData.country} onChange={handleChange} onBlur={handleBlur} />
                            {showCountrySuggestions && filteredCountries.length > 0 && (
                                <ul className="country-suggestions">
                                    {filteredCountries.map((c, idx) => (<li key={idx} onClick={() => handleSelectCountry(c)}>{c.name}</li>))}
                                </ul>
                            )}
                            {errors.country && <small className="error-text">{errors.country}</small>}
                        </div>
                         <div className="form-group" style={{ position: 'relative' }}>
                            <label>State/Province*</label>
                            <input type="text" name="state" value={formData.state} onChange={handleChange} onBlur={handleBlur} />
                            {showStateSuggestions && filteredStates.length > 0 && (
                                <ul className="country-suggestions">
                                    {filteredStates.map((s, idx) => (<li key={idx} onClick={() => handleSelectState(s)}>{s.name}</li>))}
                                </ul>
                            )}
                            {errors.state && <small className="error-text">{errors.state}</small>}
                        </div>
                        <div className="form-group" style={{ position: 'relative' }}>
                            <label>City*</label>
                            <input type="text" name="city" value={formData.city} onChange={handleChange} onBlur={handleBlur} />
                            {showCitySuggestions && filteredCities.length > 0 && (
                                <ul className="country-suggestions">
                                    {filteredCities.map((c, idx) => (<li key={idx} onClick={() => handleSelectCity(c)}>{c.name}</li>))}
                                </ul>
                            )}
                            {errors.city && <small className="error-text">{errors.city}</small>}
                        </div>
                        <div className="form-group">
                            <label>ZIP/Postal Code*</label>
                            <input type="text" name="zip_code" value={formData.zip_code} onChange={handleChange} onBlur={handleBlur} />
                            {errors.zip_code && <small className="error-text">{errors.zip_code}</small>}
                        </div>
                    </div>
                </div>

                <div className="form-section">
                    <h4>Employment Information</h4>
                    <div className="form-grid four-columns">
                         <div className="form-group">
                            <label>Occupation*</label>
                            <input type="text" name="occupation" value={formData.occupation} onChange={handleChange} onBlur={handleBlur} />
                            {errors.occupation && <small className="error-text">{errors.occupation}</small>}
                        </div>
                        <div className="form-group">
                            <label>Employer Name</label>
                            <input type="text" name="employer_name" value={formData.employer_name} onChange={handleChange} />
                        </div>
                    </div>
                </div>

                <div className="form-actions">
                    <button type="submit" className="continue-button" disabled={isLoading}>
                        {isLoading ? 'Saving...' : 'Continue'}
                    </button>
                </div>
                {message && <p className="form-message">{message}</p>}
            </form>
        </div>
    );
};

export default FactFinderPersonalInfo;

