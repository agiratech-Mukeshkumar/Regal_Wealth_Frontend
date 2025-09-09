import React, { useState, useEffect } from 'react';
import { useAuth } from '../../auth/AuthContext';
import './FactFinder.css';
import { useNavigate } from 'react-router-dom';


const apiUrl = process.env.REACT_APP_API_URL;

interface FamilyMember {
    relationship: 'Child' | 'Grandchild';
    full_name: string;
    date_of_birth: string;
    resident_state: string;
}


type FamilyMemberErrors = {
    [key in keyof Omit<FamilyMember, 'relationship'>]?: string;
};

const TrashIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 6h18"></path>
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
    </svg>
);


const FactFinderFamilyInfo: React.FC = () => {
    const { token } = useAuth();
    const navigate = useNavigate();
    const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isFetching, setIsFetching] = useState(true);
    const [message, setMessage] = useState('');
    
    const [errors, setErrors] = useState<FamilyMemberErrors[]>([]);

    useEffect(() => {
        const fetchFamilyData = async () => {
            if (!token) return;
            setIsFetching(true);
            try {
                const response = await fetch(`${apiUrl}/api/client/profile/family`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                if (!response.ok) throw new Error('Failed to fetch family data.');
                
                const data = await response.json();
                if (data && Array.isArray(data)) {
                    setFamilyMembers(data);
                    
                    setErrors(Array(data.length).fill({}));
                }
            } catch (err: any) {
                setMessage("Could not load your saved information.");
            } finally {
                setIsFetching(false);
            }
        };

        fetchFamilyData();
    }, [token]);

    const addMember = (relationship: 'Child' | 'Grandchild') => {
        setFamilyMembers(prev => [...prev, { relationship, full_name: '', date_of_birth: '', resident_state: '' }]);
    
        setErrors(prev => [...prev, {}]);
    };

    const removeMember = (indexToRemove: number) => {
        setFamilyMembers(prev => prev.filter((_, index) => index !== indexToRemove));
        
        setErrors(prev => prev.filter((_, index) => index !== indexToRemove));
    };

  
    const getValidationError = (name: string, value: string): string => {
        if (!value.trim()) {
            return "This field is required.";
        }
        if (name === 'date_of_birth') {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (new Date(value) > today) {
                return "Date cannot be in the future.";
            }
        }
        return '';
    };

    const handleMemberChange = (index: number, event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = event.target;
        const updatedMembers = [...familyMembers];
        updatedMembers[index] = { ...updatedMembers[index], [name]: value };
        setFamilyMembers(updatedMembers);

        if (errors[index]?.[name as keyof FamilyMemberErrors]) {
            const updatedErrors = [...errors];
            updatedErrors[index] = { ...updatedErrors[index], [name]: '' };
            setErrors(updatedErrors);
        }
    };

    const handleBlur = (index: number, event: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = event.target;
        const error = getValidationError(name, value);
        const updatedErrors = [...errors];
        updatedErrors[index] = { ...updatedErrors[index], [name]: error };
        setErrors(updatedErrors);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        let isValid = true;
        const newErrors: FamilyMemberErrors[] = [];

        familyMembers.forEach((member, index) => {
            const memberErrors: FamilyMemberErrors = {};
            
            // FIX: Instead of looping over all keys, explicitly define which fields to validate.
            const fieldsToValidate: Array<keyof FamilyMemberErrors> = ['full_name', 'date_of_birth', 'resident_state'];

            fieldsToValidate.forEach(key => {
                // Ensure the value is treated as a string before validation
                const value = String(member[key] || '');
                const error = getValidationError(key, value);
                if (error) {
                    memberErrors[key] = error;
                    isValid = false;
                }
            });

            newErrors[index] = memberErrors;
        });

        setErrors(newErrors);
        if (!isValid) return;

        setIsLoading(true);
        setMessage('');
        try {
            const response = await fetch(`${apiUrl}/api/client/profile/family`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ family_members: familyMembers })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message);
            navigate('/fact-finder/investor-profile');
        } catch (err: any) {
            setMessage(err.message);
        } finally {
            setIsLoading(false);
        }
    };
    
    const renderMemberInputs = (relationship: 'Child' | 'Grandchild') => {
        return familyMembers.map((member, originalIndex) => {
            if (member.relationship !== relationship) return null;
            
            const memberErrors = errors[originalIndex] || {};

            return (
                <div key={originalIndex} className="dynamic-row labeled">
                    <div className="form-group">
                        <label>Name*</label>
                        <input type="text" name="full_name" value={member.full_name} onChange={e => handleMemberChange(originalIndex, e)} onBlur={e => handleBlur(originalIndex, e)} />
                        {memberErrors.full_name && <small className="error-text">{memberErrors.full_name}</small>}
                    </div>
                    <div className="form-group">
                        <label>Date of Birth*</label>
                        <input type="date" name="date_of_birth" value={member.date_of_birth} onChange={e => handleMemberChange(originalIndex, e)} onBlur={e => handleBlur(originalIndex, e)} />
                        {memberErrors.date_of_birth && <small className="error-text">{memberErrors.date_of_birth}</small>}
                    </div>
                    <div className="form-group">
                        <label>Resident State*</label>
                        <select name="resident_state" value={member.resident_state} onChange={e => handleMemberChange(originalIndex, e)} onBlur={e => handleBlur(originalIndex, e)}>
                            <option value="">Select</option>
                            <option value="Pennsylvania">Pennsylvania</option>
                            <option value="New York">New York</option>
                           
                        </select>
                        {memberErrors.resident_state && <small className="error-text">{memberErrors.resident_state}</small>}
                    </div>
                    <button type="button" className="remove-button icon" onClick={() => removeMember(originalIndex)}><TrashIcon /></button>
                </div>
            );
        });
    };

    if (isFetching) {
        return <div className="fact-finder-page"><div className="wizard-header"><h2>Loading...</h2></div></div>;
    }

    return (
        <div className="fact-finder-page">
            <div className="wizard-header">
                <h2>Tell us about your children and grandchildren. This helps us plan for your loved ones.</h2>
                <p>Family is important! Sharing these details helps us look out for everyone you care about.</p>
            </div>
            <form onSubmit={handleSubmit} noValidate className="wizard-form">
                <div className="form-section">
                    <div className="section-header">
                        <h4>Children Information</h4>
                        <button type="button" onClick={() => addMember('Child')} className="add-button">Add Child +</button>
                    </div>
                    {renderMemberInputs('Child')}
                </div>
                <div className="form-section">
                    <div className="section-header">
                        <h4>Grandchildren Information</h4>
                        <button type="button" onClick={() => addMember('Grandchild')} className="add-button">Add Grandchild +</button>
                    </div>
                    {renderMemberInputs('Grandchild')}
                </div>
                <div className="form-actions">
                    <button type="button" className="secondary-button" onClick={() => navigate('/fact-finder/spouse-info')}>Back</button>
                    <button type="submit" className="continue-button" disabled={isLoading}>
                        {isLoading ? 'Saving...' : 'Continue'}
                    </button>
                </div>
                {message && <p className="form-message success">{message}</p>}
            </form>
        </div>
    );
};

export default FactFinderFamilyInfo;