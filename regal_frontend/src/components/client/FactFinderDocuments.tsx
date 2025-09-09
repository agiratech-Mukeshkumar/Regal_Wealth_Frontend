import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import './FactFinderDocuments.css';

interface Document {
    id: number;
    document_name: string;
    file_path: string;
}
interface UploadQueueItem {
    id: number;
    file: File | null;
    name: string;
    progress: number;
}

const TrashIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg> );
const UploadIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg> );


interface PdfViewerModalProps {
    pdfUrl: string;
    onClose: () => void;
}
const PdfViewerModal: React.FC<PdfViewerModalProps> = ({ pdfUrl, onClose }) => (
    <div className="modal-overlay" onClick={onClose}>
        <div className="upload-modal-content pdf-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
                <h3>Document Viewer</h3>
                <button onClick={onClose} className="close-button">&times;</button>
            </div>
            <div className="pdf-viewer-container">
                <iframe src={pdfUrl} title="PDF Viewer" width="100%" height="100%"></iframe>
            </div>
        </div>
    </div>
);



interface UploadModalProps {
    onClose: () => void;
    onFileSelect: (file: File) => void;
}
const UploadModal: React.FC<UploadModalProps> = ({ onClose, onFileSelect }) => {
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            onFileSelect(e.target.files[0]);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="upload-modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>Upload File</h3>
                    <button onClick={onClose} className="close-button">&times;</button>
                </div>
                <div className="drag-drop-area">
                    <UploadIcon />
                    <p>
                        <label htmlFor="file-upload-input" className="upload-link">
                            Click to upload
                        </label> or drag and drop
                    </p>
                    <small>PNG, PDF or JPG (up to 10 MB)</small>
                    <input id="file-upload-input" type="file" onChange={handleFileChange} accept=".pdf,.png,.jpg,.jpeg" />
                </div>
            </div>
        </div>
    );
};


const FactFinderDocuments: React.FC = () => {
    const { token } = useAuth();
    const navigate = useNavigate();
    
    const [fetchedDocuments, setFetchedDocuments] = useState<Document[]>([]);
    const [uploadQueue, setUploadQueue] = useState<UploadQueueItem[]>([]);
    const [isFetching, setIsFetching] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState('');
    
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [isPdfViewerOpen, setIsPdfViewerOpen] = useState(false);
    const [activePdfUrl, setActivePdfUrl] = useState('');
    const [activeRowId, setActiveRowId] = useState<number | null>(null);

  
    useEffect(() => {
        const fetchDocuments = async () => {
            if (!token) return;
            setIsFetching(true);
            try {
                const response = await fetch('http://localhost:5000/api/client/documents', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!response.ok) throw new Error('Failed to fetch documents.');
                const data: Document[] = await response.json();
                setFetchedDocuments(data);
            } catch (error) {
                console.error(error);
                setMessage("Could not load existing documents.");
            } finally {
                setIsFetching(false);
            }
        };
        fetchDocuments();
    }, [token]);

    const addUploadRow = () => {
        setUploadQueue(prev => [...prev, {
            id: Date.now(),
            file: null,
            name: `Document ${prev.length + fetchedDocuments.length + 1}`,
            progress: 0,
        }]);
    };

    const removeUploadRow = (id: number) => setUploadQueue(prev => prev.filter(item => item.id !== id));
    
    const handleNameChange = (id: number, value: string) => {
        setUploadQueue(prev => prev.map(item => item.id === id ? { ...item, name: value } : item));
    };

    const openUploadModal = (id: number) => {
        setActiveRowId(id);
        setIsUploadModalOpen(true);
    };

    const handleFileSelected = (file: File) => {
        if (activeRowId !== null) {
            setUploadQueue(prev => prev.map(item => 
                item.id === activeRowId ? { ...item, file: file, name: file.name, progress: 0 } : item
            ));
        }
        setIsUploadModalOpen(false);
        setActiveRowId(null);
    };

    const handleViewDocument = (docId: number) => {
        const url = `http://localhost:5000/api/client/documents/${docId}?token=${token}`;
        setActivePdfUrl(url);
        setIsPdfViewerOpen(true);
    };

    const handleDeleteDocument = async (docId: number) => {
        if (!window.confirm("Are you sure you want to delete this document?")) return;
        try {
            const response = await fetch(`http://localhost:5000/api/client/documents/${docId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Failed to delete document.');
            setFetchedDocuments(prev => prev.filter(doc => doc.id !== docId));
        } catch (error) {
            console.error(error);
            setMessage("Could not delete the document.");
        }
    };

    const handleContinue = async () => {
        setIsSubmitting(true);
        setMessage('');

        const filesToUpload = uploadQueue.filter(item => item.file);

        const uploadPromises = filesToUpload.map(item => {
            const formData = new FormData();
            formData.append('file', item.file!);
            formData.append('document_name', item.name);

            setUploadQueue(prev => prev.map(q => q.id === item.id ? { ...q, progress: 100 } : q));

            return fetch('http://localhost:5000/api/client/documents/upload', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });
        });

        try {
            const results = await Promise.all(uploadPromises);
            const hasError = results.some(res => !res.ok);
            if (hasError) throw new Error('One or more uploads failed.');
            
            navigate('/fact-finder/summary');
        } catch (err: any) {
            setMessage(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };
    
    return (
        <>
            {isUploadModalOpen && <UploadModal onClose={() => setIsUploadModalOpen(false)} onFileSelect={handleFileSelected} />}
            {isPdfViewerOpen && <PdfViewerModal pdfUrl={activePdfUrl} onClose={() => setIsPdfViewerOpen(false)} />}
            
            <div className="fact-finder-page documents-page">
                <div className="wizard-header">
                    <h2>Help us get the full picture.</h2>
                    <p>Upload statements, assets, or portfolio docs securely to refine your financial roadmap.</p>
                </div>
                <div className="wizard-form document-page-content">
                    <div className="document-table-header">
                        <span>Supported file types: PDF, JPG, PNG (up to 10 MB)</span>
                        <button onClick={addUploadRow} className="add-link">Add +</button>
                    </div>
                    
                    <table className="document-table">
                        <thead>
                            <tr>
                                <th>Document Name</th>
                                <th>File</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {isFetching && <tr><td colSpan={3}>Loading documents...</td></tr>}

                            
                            {fetchedDocuments.map(doc => (
                                <tr key={`doc-${doc.id}`}>
                                    <td><span className="document-name-text">{doc.document_name}</span></td>
                                    <td><span className="file-name-text">{doc.file_path.split('_').pop()}</span></td>
                                    <td className="actions-cell">
                                        <button className="text-btn view" onClick={() => handleViewDocument(doc.id)}>View</button>
                                        <button className="text-btn delete" onClick={() => handleDeleteDocument(doc.id)}>Delete</button>
                                    </td>
                                </tr>
                            ))}

                            {uploadQueue.map(item => (
                                <tr key={item.id}>
                                    <td>
                                        <input type="text" value={item.name} onChange={e => handleNameChange(item.id, e.target.value)} className="document-name-input" />
                                    </td>
                                    <td>
                                        <button type="button" className="choose-file-btn" onClick={() => openUploadModal(item.id)}>
                                            {item.file ? item.file.name : 'Choose File'}
                                        </button>
                                        {item.file && (
                                            <div className="progress-bar-container">
                                                <div className="progress-bar" style={{ width: `${item.progress}%` }}></div>
                                            </div>
                                        )}
                                    </td>
                                    <td className="actions-cell">
                                        <button className="icon-btn delete" onClick={() => removeUploadRow(item.id)}><TrashIcon /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <div className="form-actions">
                        <button type="button" className="secondary-button" onClick={() => navigate('/fact-finder/liabilities')}>Back</button>
                        <button onClick={handleContinue} className="continue-button" disabled={isSubmitting}>
                            {isSubmitting ? 'Uploading...' : 'Continue'}
                        </button>
                    </div>
                    {message && <p className="form-message error">{message}</p>}
                </div>
            </div>
        </>
    );
};

export default FactFinderDocuments;

