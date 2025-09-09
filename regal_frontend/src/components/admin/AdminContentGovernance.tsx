import React, { useState, useEffect, useCallback } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import './AdminContentGovernance.css';
import { useAuth } from '../../auth/AuthContext';
import AdminLiabilitiesBuilder from './AdminLiabilitiesBuilder';
import AdminInvestorBuilder from './AdminInvestorBuilder';
import AdminAssetsBuilder from './AdminAssetsBuilder';

type ContentTab = 'cepa' | 'cookies' | 'privacy-policy' | 'investor-profile' | 'assets' | 'liabilities';
const apiUrl = process.env.REACT_APP_API_URL;

const TextEditor: React.FC<{ pageSlug: string }> = ({ pageSlug }) => {
    const { token } = useAuth();
    const [content, setContent] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState('');

    const fetchContent = useCallback(async () => {
        if (!token || !pageSlug) return;
        setIsLoading(true);
        try {
            const response = await fetch(`${apiUrl}/api/admin/content/${pageSlug}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error("Failed to fetch content.");
            const data = await response.json();
            setContent(data.content_html || '');
        } catch (error) {
            setMessage("Error loading content.");
        } finally {
            setIsLoading(false);
        }
    }, [pageSlug, token]);

    useEffect(() => {
        fetchContent();
    }, [fetchContent]);

    const handleUpdate = async () => {
        if (!token) return;
        setIsSaving(true);
        setMessage('');
        try {
            const response = await fetch(`${apiUrl}/api/admin/content/${pageSlug}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ content_html: content })
            });
            if (!response.ok) throw new Error("Failed to save content.");
            setMessage("Content updated successfully!");
            setTimeout(() => setMessage(''), 3000); 
        } catch (error) {
            setMessage("Error saving content.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="editor-container">
            {isLoading ? (
                <p>Loading content...</p>
            ) : (
                <ReactQuill theme="snow" value={content} onChange={setContent} />
            )}
            <div className="editor-actions">
                {message && <span className="save-message">{message}</span>}
                <button className="update-button" onClick={handleUpdate} disabled={isSaving}>
                    {isSaving ? 'Saving...' : 'Update Content'}
                </button>
            </div>
        </div>
    );
};



const AdminContentGovernance: React.FC = () => {
    const [activeTab, setActiveTab] = useState<ContentTab>('cepa');

    const renderContent = () => {
        switch (activeTab) {
            case 'cepa':
            case 'cookies':
            case 'privacy-policy':
                return <TextEditor pageSlug={activeTab} />;
            
            case 'investor-profile':
                return <AdminInvestorBuilder formName="investor_profile" />;

            case 'assets':
                return <AdminAssetsBuilder />;
                
            case 'liabilities':
                return <AdminLiabilitiesBuilder formName="liabilities" />;
                
            default:
                return null;
        }
    };

    return (
        <div className="admin-page">
            <header className="page-header"></header>
            <div className="content-gov-container">
                <div className="content-tabs">
                    <button onClick={() => setActiveTab('cepa')} className={activeTab === 'cepa' ? 'active' : ''}>CEPA</button>
                    <button onClick={() => setActiveTab('cookies')} className={activeTab === 'cookies' ? 'active' : ''}>Cookies</button>
                    <button onClick={() => setActiveTab('privacy-policy')} className={activeTab === 'privacy-policy' ? 'active' : ''}>Privacy Policy</button>
                    <button onClick={() => setActiveTab('assets')} className={activeTab === 'assets' ? 'active' : ''}>Assets</button>
                    <button onClick={() => setActiveTab('liabilities')} className={activeTab === 'liabilities' ? 'active' : ''}>Liabilities</button>
                    <button onClick={() => setActiveTab('investor-profile')} className={activeTab === 'investor-profile' ? 'active' : ''}>Investor Profile</button>
                </div>
                {renderContent()}
            </div>
        </div>
    );
};

export default AdminContentGovernance;