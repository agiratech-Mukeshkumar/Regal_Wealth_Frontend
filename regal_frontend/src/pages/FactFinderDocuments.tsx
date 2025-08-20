import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import './FactFinder.css';

// --- Interface Definitions ---
interface Document {
    id: number;
    document_name: string;
    file_path: string; // The backend sends the path
}
interface UploadQueueItem {
    file: File | null;
    name: string;
}

const TrashIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg> );

const FactFinderDocuments: React.FC = () => {
    const { token } = useAuth();
    const navigate = useNavigate();
    
    const [uploadedDocuments, setUploadedDocuments] = useState<Document[]>([]);
    const [uploadQueue, setUploadQueue] = useState<UploadQueueItem[]>([{ file: null, name: '' }]);
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');

    // Fetch existing documents when the component loads
    useEffect(() => {
        const fetchDocuments = async () => {
            if (!token) return;
            try {
                const response = await fetch('http://localhost:5000/api/client/documents', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!response.ok) throw new Error('Failed to fetch documents.');
                const data: Document[] = await response.json();
                setUploadedDocuments(data);
            } catch (error) {
                console.error(error);
            }
        };
        fetchDocuments();
    }, [token]);

    // --- Handlers for the upload queue ---
    const addUploadRow = () => setUploadQueue(prev => [...prev, { file: null, name: '' }]);
    const removeUploadRow = (index: number) => setUploadQueue(prev => prev.filter((_, i) => i !== index));
    
    const handleQueueNameChange = (index: number, value: string) => {
        const updated = [...uploadQueue];
        updated[index].name = value;
        setUploadQueue(updated);
    };
    const handleQueueFileChange = (index: number, file: File | null) => {
        const updated = [...uploadQueue];
        updated[index].file = file;
        if (file && !updated[index].name) { // Auto-fill name if empty
            updated[index].name = file.name;
        }
        setUploadQueue(updated);
    };

    const handleContinue = async () => {
        setIsLoading(true);
        setMessage('');

        // Create an array of upload promises
        const uploadPromises = uploadQueue
            .filter(item => item.file) // Only upload rows that have a file
            .map(item => {
                const formData = new FormData();
                formData.append('file', item.file!);
                formData.append('document_name', item.name);
                return fetch('http://localhost:5000/api/client/documents/upload', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: formData
                });
            });

        try {
            await Promise.all(uploadPromises);
            navigate('/fact-finder/summary');
        } catch (err: any) {
            setMessage('One or more uploads failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fact-finder-page">
            <div className="wizard-header">
                <h2>Help us get the full picture.</h2>
                <p>Upload statements, assets, or portfolio docs securely to refine your financial roadmap.</p>
            </div>
            <div className="wizard-form">
                <div className="form-section">
                    <div className="section-header">
                        <h4>Upload New Documents</h4>
                        <button type="button" onClick={addUploadRow} className="add-button">Add +</button>
                    </div>
                    <div className="document-upload-ro  ws">
                        {uploadQueue.map((item, index) => (
                            <div key={index} className="document-upload-row">
                                <input type="text" placeholder="Document Name" value={item.name} onChange={e => handleQueueNameChange(index, e.target.value)} />
                                <input type="file" onChange={e => handleQueueFileChange(index, e.target.files ? e.target.files[0] : null)} />
                                <button type="button" className="remove-button icon" onClick={() => removeUploadRow(index)}><TrashIcon /></button>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="form-section">
                    <h4>Uploaded Documents</h4>
                    <div className="document-list-container">
                        {uploadedDocuments.length > 0 ? (
                            uploadedDocuments.map(doc => (
                                <div key={doc.id} className="document-list-item">
                                    <span>{doc.document_name}</span>
                                    {/* In a real app, this would be a download link */}
                                    <small>{doc.file_path.split('_').pop()}</small>
                                </div>
                            ))
                        ) : (
                            <p>No documents uploaded yet.</p>
                        )}
                    </div>
                </div>

                <div className="form-actions">
                    <button type="button" className="secondary-button" onClick={() => navigate('/fact-finder/liabilities')}>Back</button>
                    <button onClick={handleContinue} className="continue-button" disabled={isLoading}>
                        {isLoading ? 'Uploading...' : 'Continue'}
                    </button>
                </div>
                {message && <p className="form-message">{message}</p>}
            </div>
        </div>
    );
};

export default FactFinderDocuments;
