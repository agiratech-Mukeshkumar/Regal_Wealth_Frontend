import React, { useState, FormEvent, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext'; // Your global auth state
import { User } from '../../src/types'; // 1. IMPORT the shared User type
import VerificationCodePage from './VerificationCodePage';
import Footer from './Footer';
import './LoginPage.css';
import boat from '../login/boat.jpg';
import background from '../login/login_background.jpg';
import logo from '../login/Regal_logo.png';


// 2. REMOVED the local "interface User" definition that was causing the conflict.


// --- Constants and Icon Components ---
const BACKGROUND_IMAGE_URL = background;
const BOAT_IMAGE_URL = boat;
const LOGO_URL = logo;
const MailIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"></rect><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path></svg> );
const LockIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg> );

const LoginPage: React.FC = () => {
    // --- Global State & Navigation ---
    const { login, isAuthenticated, user } = useAuth();
    const navigate = useNavigate();

    // --- Component State ---
    const [loginStep, setLoginStep] = useState<'login' | 'verify_2fa'>('login');
    const [tempToken, setTempToken] = useState<string>('');
    const [userEmailFor2FA, setUserEmailFor2FA] = useState<string>('');
    const [email, setEmail] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const [error, setError] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    

    // --- Effect for Automatic Redirection ---
    useEffect(() => {
        if (isAuthenticated && user) {
            // Check the user's role and navigate to the correct page
            switch (user.role) {
                case 'admin':
                    navigate('/admin/users');
                    break;
                case 'advisor':
                    navigate('/dashboard');
                    break;
                case 'client':
                    navigate('/fact-finder');
                    break;
                default:
                    navigate('/'); // Fallback
            }
        }
    }, [isAuthenticated, user, navigate]);

    // --- Handlers ---
    const handleLoginSuccess = (finalToken: string, user: User) => {
        login(finalToken, user); // Update global state
        // The useEffect will now handle the redirect
    };

    const handleLoginSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const response = await fetch('http://localhost:5000/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'An error occurred.');
            }
            
            if (data.requires_2fa) {
                setUserEmailFor2FA(data.email);
                setTempToken(data.temp_token);
                setLoginStep('verify_2fa');
            } else {
                handleLoginSuccess(data.token, data.user);
            }

        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };
    
    const renderLoginForm = () => (
        <div className="form-panel">
            <div className="logo-container">
                <img src={LOGO_URL} alt="Regal Wealth Advisors Logo" className="logo-image" />
            </div>
            <h2 className="form-title">Good Morning</h2>
            <p className="form-subtitle">Welcome Back!</p>
            {error && <p className="error-message">{error}</p>}
            <form onSubmit={handleLoginSubmit} className="login-form">
                <div className="input-group">
                    <span className="input-icon"><MailIcon /></span>
                    <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div className="input-group">
                    <span className="input-icon"><LockIcon /></span>
                    <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                </div>
                <button type="submit" disabled={isLoading} className="submit-button">
                    {isLoading ? 'Logging In...' : 'Log In'}
                </button>
            </form>
            <div className="forgot-password"><a href="#">Forgot Password?</a></div>
            <Footer />
        </div>
    );

    return (
        <div className="login-page" style={{ backgroundImage: `url(${BACKGROUND_IMAGE_URL})` }}>
            <div className="login-card">
                <div className="image-panel">
                     <img src={BOAT_IMAGE_URL} alt="Yacht in a city harbor" className="panel-image" />
                    <div className="promo-overlay">
                        <div className="promo-text-box">
                            <p className="promo-subtitle">Trusted Guidance for Life's Big Moments</p>
                            <h1 className="promo-title">Plan the Life You Deserve</h1>
                        </div>
                    </div>
                </div>
                
                {loginStep === 'login' ? (
                    renderLoginForm()
                ) : (
                    <div className="form-panel">
                        <VerificationCodePage 
                            email={userEmailFor2FA} 
                            tempToken={tempToken}
                            onVerificationSuccess={handleLoginSuccess}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

export default LoginPage;
