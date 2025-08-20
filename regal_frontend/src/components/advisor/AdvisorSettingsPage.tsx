import React, { useState, useEffect } from 'react';

import '../../pages/FactFinder.css'; // Reusing styles
import { useAuth } from '../../auth/AuthContext';

// Define a specific type for the data sent to the API
type SecurityPayload = {
    current_password?: string;
    new_password?: string;
    is_2fa_enabled?: boolean;
};

const AdvisorSettingsPage: React.FC = () => {
    const { token, user, updateUser } = useAuth(); // Get the updateUser function from context
    
    // Initialize state from the global user object
    const [is2faEnabled, setIs2faEnabled] = useState<boolean>(user?.is_2fa_enabled ?? true);
    
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // --- THIS IS THE BUG FIX ---
    // This useEffect hook runs whenever the global 'user' object changes (e.g., after a new login).
    // It ensures the local state of the toggle is always in sync with the latest user data.
    useEffect(() => {
        if (user) {
            setIs2faEnabled(user.is_2fa_enabled);
        }
    }, [user]);

    const handleSaveChanges = async (payload: SecurityPayload) => {
        setIsLoading(true);
        setMessage('');
        setError('');
        try {
            // Call the advisor-specific endpoint
            const response = await fetch('http://localhost:5000/api/advisor/settings/security', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(payload)
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message);
            
            setMessage(data.message);

            // After a successful API call, update the global user state
            if (payload.is_2fa_enabled !== undefined) {
                updateUser({ is_2fa_enabled: payload.is_2fa_enabled });
            }

        } catch (err: any) {
            setError(err.message);
            // If the API call fails, revert the toggle to its original state
            if (payload.is_2fa_enabled !== undefined) {
                 setIs2faEnabled(user?.is_2fa_enabled ?? true);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handlePasswordSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            setError("New passwords do not match.");
            return;
        }
        handleSaveChanges({ current_password: currentPassword, new_password: newPassword });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
    };

    const handle2faToggle = () => {
        const newState = !is2faEnabled;
        setIs2faEnabled(newState); // Optimistically update the UI
        handleSaveChanges({ is_2fa_enabled: newState });
    };

    return (
        <div className="fact-finder-page">
            <div className="wizard-header">
                <h2>Account Settings</h2>
                <p>Manage your password and account security.</p>
            </div>

            {/* --- 2FA Section --- */}
            <div className="wizard-form">
                <h4>Two-Factor Authentication (2FA)</h4>
                <div className="setting-toggle">
                    <p>Enable an extra layer of security on your account.</p>
                    <label className="switch">
                        <input type="checkbox" checked={is2faEnabled} onChange={handle2faToggle} />
                        <span className="slider round"></span>
                    </label>
                </div>
            </div>

            {/* --- Password Section --- */}
            <div className="wizard-form" style={{marginTop: '2rem'}}>
                 <h4>Reset Password</h4>
                 <form onSubmit={handlePasswordSubmit}>
                    <div className="form-grid">
                        <div className="form-group">
                            <label>Current Password</label>
                            <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required />
                        </div>
                        <div className="form-group"></div> {/* Spacer */}
                        <div className="form-group">
                            <label>New Password</label>
                            <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
                        </div>
                         <div className="form-group">
                            <label>Confirm New Password</label>
                            <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
                        </div>
                    </div>
                    <div className="form-actions">
                        <button type="submit" disabled={isLoading}>{isLoading ? 'Saving...' : 'Change Password'}</button>
                    </div>
                 </form>
            </div>
            
            {message && <p className="form-message" style={{color: 'green'}}>{message}</p>}
            {error && <p className="form-message" style={{color: 'red'}}>{error}</p>}
        </div>
    );
};

export default AdvisorSettingsPage;
