import React, { useState, useEffect } from 'react';
import { useAuth } from '../../auth/AuthContext';
import './ClientSettingPage.css';

const apiUrl = process.env.REACT_APP_API_URL;

type SecurityPayload = {
    current_password?: string;
    new_password?: string;
    is_2fa_enabled?: boolean; 
    first_name?: string;
    last_name?: string;
    mobile_number?: string;
};

const ClientSettingsPage: React.FC = () => {
    const { token, user, updateUser } = useAuth();

    
    const [isEditingInfo, setIsEditingInfo] = useState(false);
    const [userInfo, setUserInfo] = useState({
        first_name: user?.first_name || '',
        last_name: user?.last_name || '',
        mobile_number: user?.mobile_number, 
        email: user?.email || ''
    });

   
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    
    const [isEmail2fa, setIsEmail2fa] = useState(user?.is_2fa_enabled ?? true);

    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (user) {
            setUserInfo({
                first_name: user.first_name,
                last_name: user.last_name,
                mobile_number: user.mobile_number, 
                email: user.email
            });
            setIsEmail2fa(user.is_2fa_enabled);
        }
    }, [user]);

    const handleApiCall = async (payload: SecurityPayload, successMessage: string) => {
        setIsLoading(true);
        setMessage('');
        setError('');
        try {
            
            const response = await fetch(`${apiUrl}/api/client/settings/security`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(payload)
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message);
            
            setMessage(successMessage);
            if (payload.is_2fa_enabled !== undefined) {
                updateUser({ is_2fa_enabled: payload.is_2fa_enabled });
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleInfoSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        console.log("Saving user info:", userInfo);
        setIsEditingInfo(false);
        setMessage("Personal information updated successfully.");
    };

    const handlePasswordSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            setError("New passwords do not match.");
            return;
        }
        handleApiCall(
            { current_password: currentPassword, new_password: newPassword },
            "Password updated successfully."
        );
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
    };
    
    const handleInfoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setUserInfo({ ...userInfo, [e.target.name]: e.target.value });
    };

    const handle2faToggle = (method: 'email') => {
        if (method === 'email') {
            const newState = !isEmail2fa;
            setIsEmail2fa(newState);
        
            handleApiCall({ is_2fa_enabled: newState }, "2FA settings updated.");
        } 
    };

    const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    return (
        <div className="client-settings-page">
            <header className="settings-header">
                <div className="user-greeting">
                    <img src={`https://i.pravatar.cc/150?u=${user?.email}`} alt="User Avatar" className="avatar" />
                    <div>
                        <h4>Good Morning, {user?.first_name} {user?.last_name}</h4>
                        <p>{today}</p>
                    </div>
                </div>
            </header>

            
            <form onSubmit={handleInfoSubmit} className="settings-section">
                <div className="section-header">
                    <h3>Personal Information</h3>
                    {!isEditingInfo ? (
                        <button type="button" className="edit-button" onClick={() => setIsEditingInfo(true)}>Edit</button>
                    ) : (
                        <button type="submit" className="save-button" disabled={isLoading}>Save</button>
                    )}
                </div>
                <div className="info-grid">
                    <div className="form-group">
                        <label>First Name</label>
                        <input type="text" name="first_name" value={userInfo.first_name} onChange={handleInfoChange} disabled={!isEditingInfo} />
                    </div>
                    <div className="form-group">
                        <label>Last Name</label>
                        <input type="text" name="last_name" value={userInfo.last_name} onChange={handleInfoChange} disabled={!isEditingInfo} />
                    </div>
                    <div className="form-group">
                        <label>Mobile Number</label>
                        <input type="text" name="mobile_number" value={userInfo.mobile_number} onChange={handleInfoChange} disabled={!isEditingInfo} />
                    </div>
                    <div className="form-group">
                        <label>Email Address</label>
                        <input type="email" name="email" value={userInfo.email} disabled />
                    </div>
                </div>
            </form>

           
            <form onSubmit={handlePasswordSubmit} className="settings-section">
                <div className="section-header">
                    <h3>Reset Password</h3>
                </div>
                <div className="password-grid">
                    <input type="password" placeholder="Current Password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required />
                    <input type="password" placeholder="New Password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
                    <input type="password" placeholder="Re-enter New Password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
                </div>
                
                {(currentPassword || newPassword || confirmPassword) && (
                    <div className="form-actions">
                        <button type="submit" className="save-button" disabled={isLoading}>{isLoading ? 'Saving...' : 'Save Password'}</button>
                    </div>
                )}
            </form>

       
            <div className="settings-section">
                <div className="section-header">
                    <h3>Two Factor Authentication</h3>
                </div>
                <div className="toggle-grid">
                    <div className="toggle-option">
                        <span>Email</span>
                        <label className="switch">
                            <input type="checkbox" checked={isEmail2fa} onChange={() => handle2faToggle('email')} />
                            <span className="slider round"></span>
                        </label>
                    </div>
                  
                </div>
            </div>
            
            {message && <p className="form-message success">{message}</p>}
            {error && <p className="form-message error">{error}</p>}
        </div>
    );
};

export default ClientSettingsPage;
