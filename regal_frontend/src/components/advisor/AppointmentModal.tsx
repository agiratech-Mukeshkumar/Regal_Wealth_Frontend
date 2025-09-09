import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../auth/AuthContext';
import './AppointmentModal.css';


const apiUrl = process.env.REACT_APP_API_URL;


interface AdvisorAppointment {
    start_time: string;
    end_time: string;
}

interface AppointmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    client: {
        id: number;
        first_name: string;
        last_name: string;
    };
    existingAppointments: AdvisorAppointment[];
}

const AppointmentModal: React.FC<AppointmentModalProps> = ({ isOpen, onClose, client, existingAppointments }) => {
    const { token } = useAuth();
    const [title, setTitle] = useState('');
    const [date, setDate] = useState('');
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [notes, setNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [timeZone, setTimeZone] = useState('');

    const todayString = useMemo(() => new Date().toISOString().split('T')[0], []);

    useEffect(() => {
        const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        setTimeZone(userTimeZone);
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError('');
        setSuccess('');

        if (!date || !startTime || !endTime) {
            setError("Please select a date, start time, and end time.");
            setIsSubmitting(false);
            return;
        }

        
        const startDateTime = new Date(`${date}T${startTime}`);
        const endDateTime = new Date(`${date}T${endTime}`);

        if (startDateTime < new Date()) {
            setError("Cannot schedule an appointment for a time that has already passed.");
            setIsSubmitting(false);
            return;
        }

        if (endDateTime <= startDateTime) {
            setError("End time must be after the start time.");
            setIsSubmitting(false);
            return;
        }

        for (const appt of existingAppointments) {
            const existingStart = new Date(appt.start_time);
            const existingEnd = new Date(appt.end_time);
            if (startDateTime < existingEnd && endDateTime > existingStart) {
                setError('This time slot conflicts with an existing appointment.');
                setIsSubmitting(false);
                return;
            }
        }

       
        const formatLocal = (d: Date) => {
            const pad = (n: number) => n.toString().padStart(2, '0');
            return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
        };

        const payload = {
            client_user_id: client.id,
            title,
            start_time: formatLocal(startDateTime),
            end_time: formatLocal(endDateTime),
            notes
        };

        try {
            const response = await fetch(`${apiUrl}/api/advisor/appointments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(payload)
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Failed to schedule appointment.');
            
            setSuccess('Appointment scheduled successfully! The client has been notified.');
            setTimeout(() => {
                onClose();
                setSuccess('');
                setTitle('');
                setDate('');
                setStartTime('');
                setEndTime('');
                setNotes('');
            }, 2000);

        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>Schedule for {client.first_name} {client.last_name}</h3>
                    <button onClick={onClose} className="close-button">&times;</button>
                </div>
                <form onSubmit={handleSubmit} className="modal-form">
                    <div className="input-group">
                        <label>Title</label>
                        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required />
                    </div>
                    
                    <div className="input-group">
                        <label>Date</label>
                        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required min={todayString} />
                    </div>

                    <div className="time-date-group">
                        <div className="input-group">
                            <label>Start Time</label>
                            <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
                        </div>
                        <div className="input-group">
                            <label>End Time</label>
                            <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} required />
                        </div>
                    </div>
                    
                    <div className="timezone-display">Timezone: {timeZone}</div>
                    <div className="input-group">
                        <label>Notes (Optional)</label>
                        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4}></textarea>
                    </div>
                    
                    {error && <p className="error-message">{error}</p>}
                    {success && <p className="success-message">{success}</p>}

                    <div className="modal-actions">
                        <button type="button" className="modal-button cancel" onClick={onClose}>Cancel</button>
                        <button type="submit" className="modal-button submit" disabled={isSubmitting}>
                            {isSubmitting ? 'Scheduling...' : 'Schedule & Notify'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AppointmentModal;
