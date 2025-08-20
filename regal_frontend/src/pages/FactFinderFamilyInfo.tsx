import React, { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import './FactFinder.css';
import { useNavigate } from 'react-router-dom';

interface FamilyMember {
    relationship: 'Child' | 'Grandchild';
    full_name: string;
    date_of_birth: string;
    resident_state: string;
}

// --- Trash Icon Component ---
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
    const [message, setMessage] = useState('');

    const addMember = (relationship: 'Child' | 'Grandchild') => {
        setFamilyMembers(prev => [...prev, {
            relationship,
            full_name: '',
            date_of_birth: '',
            resident_state: ''
        }]);
    };

    const removeMember = (indexToRemove: number) => {
        setFamilyMembers(prev => prev.filter((_, index) => index !== indexToRemove));
    };

    const handleMemberChange = (index: number, event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = event.target;
        const updatedMembers = [...familyMembers];
        updatedMembers[index] = { ...updatedMembers[index], [name]: value };
        setFamilyMembers(updatedMembers);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage('');
        try {
            const response = await fetch('http://localhost:5000/api/client/profile/family', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
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
        return familyMembers.filter(m => m.relationship === relationship).map((member, index) => {
            // Find the original index to ensure correct removal
            const originalIndex = familyMembers.findIndex(fm => fm === member);
            return (
                <div key={originalIndex} className="dynamic-row labeled">
                    <div className="form-group"><label>Name*</label><input type="text" name="full_name" value={member.full_name} onChange={e => handleMemberChange(originalIndex, e)} required /></div>
                    <div className="form-group"><label>Date of Birth*</label><input type="date" name="date_of_birth" value={member.date_of_birth} onChange={e => handleMemberChange(originalIndex, e)} required /></div>
                    <div className="form-group"><label>Resident State*</label><select name="resident_state" value={member.resident_state} onChange={e => handleMemberChange(originalIndex, e)} required><option value="">Select</option><option value="Pennsylvania">Pennsylvania</option><option value="New York">New York</option></select></div>
                    <button type="button" className="remove-button icon" onClick={() => removeMember(originalIndex)}><TrashIcon /></button>
                </div>
            );
        });
    };

    return (
        <div className="fact-finder-page">
            <div className="wizard-header">
                <h2>Tell us about your children and grandchildren. This helps us plan for you loved ones.</h2>
                <p>Family is important! Sharing these details helps us look out for everyone you care about.</p>
            </div>
            <form onSubmit={handleSubmit} className="wizard-form">
                <div className="form-section">
                    <div className="section-header">
                        <h4>Children Information</h4>
                        <a href="#" onClick={(e) => { e.preventDefault(); addMember('Child'); }} className="add-link">Add Child +</a>
                    </div>
                    {renderMemberInputs('Child')}
                </div>

                <div className="form-section">
                    <div className="section-header">
                        <h4>Grandchildren Information</h4>
                        <a href="#" onClick={(e) => { e.preventDefault(); addMember('Grandchild'); }} className="add-link">Add Child +</a>
                    </div>
                    {renderMemberInputs('Grandchild')}
                </div>
                
                <div className="form-actions">
                    <button type="button" className="secondary-button" onClick={() => navigate('/fact-finder/spouse-info')}>Back</button>
                    <button type="submit" className="continue-button" disabled={isLoading}>
                        {isLoading ? 'Saving...' : 'Continue'}
                    </button>
                </div>
                {message && <p className="form-message">{message}</p>}
            </form>
        </div>
    );
};

export default FactFinderFamilyInfo;

