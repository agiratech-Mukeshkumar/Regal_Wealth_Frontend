import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import './FactFinder.css';
import { useNavigate } from 'react-router-dom';

const API_BASE = "https://api.countrystatecity.in/v1";
const API_KEY = "MXpQSXdVZ09iVHNEZ21aaUJCa29yN3B3dkRyUnF3VDV3UEROeFpjaQ=="; // <-- replace with your API key

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

    // Dropdown/autocomplete data
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
            setFormData(prev => ({
                ...prev,
                first_name: user.first_name,
                last_name: user.last_name,
                email: user.email
            }));
        }
    }, [user]);

    // ✅ Fetch all countries
    useEffect(() => {
        fetch(`${API_BASE}/countries`, {
            headers: { "X-CSCAPI-KEY": API_KEY }
        })
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    const countryList = data.map(c => ({
                        name: c.name,
                        iso2: c.iso2,
                        phonecode: c.phonecode
                    }));
                    setCountries(countryList);
                } else {
                    console.error("Unexpected response:", data);
                    setCountries([]);
                }
            })
            .catch(err => {
                console.error("Error fetching countries:", err);
                setCountries([]);
            });
    }, []);

    // ✅ Handle input change
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));

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

    // ✅ Select Country
    const handleSelectCountry = (country: any) => {
        setFormData(prev => ({ ...prev, country: country.name, state: "", city: "" }));
        setShowCountrySuggestions(false);

        fetch(`${API_BASE}/countries/${country.iso2}/states`, {
            headers: { "X-CSCAPI-KEY": API_KEY }
        })
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    setStates(data);
                } else {
                    setStates([]);
                }
            })
            .catch(err => console.error("Error fetching states:", err));
    };

    // ✅ Select State
    const handleSelectState = (state: any) => {
        setFormData(prev => ({ ...prev, state: state.name, city: "" }));
        setShowStateSuggestions(false);

        const selectedCountry = countries.find(c => c.name === formData.country);
        if (!selectedCountry) return;

        fetch(`${API_BASE}/countries/${selectedCountry.iso2}/states/${state.iso2}/cities`, {
            headers: { "X-CSCAPI-KEY": API_KEY }
        })
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    setCities(data);
                } else {
                    setCities([]);
                }
            })
            .catch(err => console.error("Error fetching cities:", err));
    };

    // ✅ Select City
    const handleSelectCity = (city: any) => {
        setFormData(prev => ({ ...prev, city: city.name }));
        setShowCitySuggestions(false);
    };

    // ✅ Select Mobile Country
    const handleSelectMobileCountry = (iso2: string) => {
        const selected = countries.find(c => c.iso2 === iso2);
        if (!selected) return;
        setFormData(prev => ({
            ...prev,
            mobile_country: iso2,
            mobile_code: `+${selected.phonecode}`
        }));
    };

    // ✅ Submit form
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage('');
        try {
            const response = await fetch('http://localhost:5000/api/client/profile/personal', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message);
            navigate('/fact-finder/spouse-info');
        } catch (err: any) {
            setMessage(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fact-finder-page">
            <div className="wizard-header">
                <h2>We'll start with basics. This information helps us get to know you and tailor your experience.</h2>
                <p>You're on your way! Accurate details here ensure everything else goes smoothly.</p>
            </div>
            <form onSubmit={handleSubmit} className="wizard-form">

                {/* --- Personal Info Section --- */}
                <div className="form-section">
                    <h4>Personal Information</h4>
                    <div className="form-grid four-columns">
                        <div className="form-group"><label>First Name*</label><input type="text" name="first_name" value={formData.first_name} disabled /></div>
                        <div className="form-group"><label>Last Name*</label><input type="text" name="last_name" value={formData.last_name} disabled /></div>
                        <div className="form-group"><label>Date of Birth*</label><input type="date" name="date_of_birth" value={formData.date_of_birth} onChange={handleChange} required /></div>
                        <div className="form-group"><label>Marital Status*</label>
                            <select name="marital_status" value={formData.marital_status} onChange={handleChange} required>
                                <option value="">Select...</option>
                                <option value="Single">Single</option>
                                <option value="Married">Married</option>
                                <option value="Divorced">Divorced</option>
                                <option value="Widowed">Widowed</option>
                            </select>
                        </div>
                        {/* ... unchanged UI code ... */}

                        {/* ✅ Mobile Dropdown */}
                        <div className="form-group mobile-input">
                            <label>Mobile Number*</label>
                            <div style={{ display: "flex", alignItems: "center" }}>
                                <select  style={{ width: "103px" }}
                                    value={formData.mobile_country}
                                    onChange={(e) => handleSelectMobileCountry(e.target.value)}
                                >
                                    {countries.map((c) => (
                                        <option key={c.iso2} value={c.iso2}>
                                            {c.iso2} (+{c.phonecode})
                                        </option>
                                    ))}
                                </select>

                                    {/* <input 
                                        type="text"
                                        value={formData.mobile_code}
                                        disabled
                                        style={{ width: "30px", marginRight: "5px" }}
                                    /> */}
                                <input style={{ marginLeft:"4px",width: "200px"}}
                                    type="tel"
                                    name="mobile_number"
                                    value={formData.mobile_number}
                                    onChange={handleChange}
                                    required
                                    placeholder="Enter number"
                                />
                            </div>
                        </div>


                        {/* ✅ Autocomplete Country */}
                        {/* ✅ Autocomplete State */}
                        {/* ✅ Autocomplete City */}
                        {/* ... rest unchanged ... */}
                        <div className="form-group"><label>Email Address*</label><input type="email" name="email" value={formData.email} disabled /></div>
                        <div className="form-group"><label>Preferred Method of Contact*</label>
                            <select name="preferred_contact_method" value={formData.preferred_contact_method} onChange={handleChange} required>
                                <option value="">Select...</option>
                                <option value="Email">Email</option>
                                <option value="Mobile">Mobile</option>
                            </select>
                        </div>
                        <div className="form-group"><label>Profile Picture</label><input type="file" /></div>
                    </div>
                </div>

                {/* --- Address Section --- */}
                <div className="form-section">
                    <h4>Address</h4>
                    <div className="form-grid four-columns">
                        <div className="form-group"><label>Address Line 1*</label><input type="text" name="address_line_1" value={formData.address_line_1} onChange={handleChange} required /></div>
                        <div className="form-group"><label>Address Line 2</label><input type="text" name="address_line_2" value={formData.address_line_2} onChange={handleChange} /></div>

                        {/* ✅ Autocomplete Country */}
                        <div className="form-group" style={{ position: "relative" }}>
                            <label>Country*</label>
                            <input
                                type="text"
                                name="country"
                                value={formData.country}
                                onChange={handleChange}
                                onFocus={() => formData.country && setShowCountrySuggestions(true)}
                                required
                            />
                            {showCountrySuggestions && filteredCountries.length > 0 && (
                                <ul className="country-suggestions">
                                    {filteredCountries.map((c, idx) => (
                                        <li key={idx} onClick={() => handleSelectCountry(c)}>{c.name}</li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        {/* ✅ Autocomplete State */}
                        <div className="form-group" style={{ position: "relative" }}>
                            <label>State/Province*</label>
                            <input
                                type="text"
                                name="state"
                                value={formData.state}
                                onChange={handleChange}
                                onFocus={() => formData.state && setShowStateSuggestions(true)}
                                required
                            />
                            {showStateSuggestions && filteredStates.length > 0 && (
                                <ul className="country-suggestions">
                                    {filteredStates.map((s, idx) => (
                                        <li key={idx} onClick={() => handleSelectState(s)}>{s.name}</li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        {/* ✅ Autocomplete City */}
                        <div className="form-group" style={{ position: "relative" }}>
                            <label>City*</label>
                            <input
                                type="text"
                                name="city"
                                value={formData.city}
                                onChange={handleChange}
                                onFocus={() => formData.city && setShowCitySuggestions(true)}
                                required
                            />
                            {showCitySuggestions && filteredCities.length > 0 && (
                                <ul className="country-suggestions">
                                    {filteredCities.map((c, idx) => (
                                        <li key={idx} onClick={() => handleSelectCity(c)}>{c.name}</li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        <div className="form-group"><label>ZIP/Postal Code*</label><input type="text" name="zip_code" value={formData.zip_code} onChange={handleChange} required /></div>
                    </div>
                </div>

                {/* --- Employment Section --- */}
                <div className="form-section">
                    <h4>Employment Information</h4>
                    <div className="form-grid four-columns">
                        <div className="form-group"><label>Occupation*</label><input type="text" name="occupation" value={formData.occupation} onChange={handleChange} required /></div>
                        <div className="form-group"><label>Employer Name</label><input type="text" name="employer_name" value={formData.employer_name} onChange={handleChange} /></div>
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