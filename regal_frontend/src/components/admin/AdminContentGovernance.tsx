import React, { useState,useEffect } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
// Import the form builder
import './AdminContentGovernance.css';
import { useAuth } from '../../auth/AuthContext';
import AdminFormBuilder from '../AdminFormBuilder';

type ContentTab = 'cepa' | 'cookies' | 'privacy-policy' | 'investor-profile' | 'assets' | 'liabilities';

// --- Text Editor Component ---
const TextEditor: React.FC<{ pageSlug: string }> = ({ pageSlug }) => {
    const { token } = useAuth();
    const [content, setContent] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        // Fetch content logic here...
    }, [pageSlug, token]);

    const handleUpdate = async () => {
        // Update content logic here...
    };

    return (
        <div className="editor-container">
            {isLoading ? <p>Loading...</p> : <ReactQuill theme="snow" value={content} onChange={setContent} />}
            <div className="editor-actions">
                <button className="update-button" onClick={handleUpdate}>Update</button>
            </div>
        </div>
    );
};


// --- Main Governance Page Component ---
const AdminContentGovernance: React.FC = () => {
    const [activeTab, setActiveTab] = useState<ContentTab>('cepa');

    const renderContent = () => {
        switch (activeTab) {
            case 'cepa':
            case 'cookies':
            case 'privacy-policy':
                return <TextEditor pageSlug={activeTab} />;
            case 'investor-profile':
                return <AdminFormBuilder formName="investor_profile" title="Investor Profile Questions" />;
            case 'assets':
                return <AdminFormBuilder formName="assets" title="Asset Form Fields" />;
            case 'liabilities':
                return <AdminFormBuilder formName="liabilities" title="Liability Form Fields" />;
            default:
                return null;
        }
    };

    return (
        <div className="admin-page">
            <header className="page-header">
                <h2>Settings: Content Governance</h2>
            </header>
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
