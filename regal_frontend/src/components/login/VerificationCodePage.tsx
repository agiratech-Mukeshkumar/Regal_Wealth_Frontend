import React, { useState, FormEvent, useRef, useEffect } from 'react';
import { User } from '../../types';
import './VerificationCodePage.css';
import logo from '../../images/Regal_logo.png';

interface VerificationCodePageProps {
  email: string;
  tempToken: string;
  onVerificationSuccess: (finalToken: string, user: User) => void;
}

const VerificationCodePage: React.FC<VerificationCodePageProps> = ({ email, tempToken, onVerificationSuccess }) => {
  const [otp, setOtp] = useState<string[]>(new Array(6).fill(''));
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [resendStatus, setResendStatus] = useState<string>('');
  const [countdown, setCountdown] = useState<number>(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleChange = (element: HTMLInputElement, index: number) => {
    if (isNaN(Number(element.value))) return;
    const newOtp = [...otp];
    newOtp[index] = element.value;
    setOtp(newOtp);
    if (element.nextSibling && element.value) {
      (element.nextSibling as HTMLInputElement).focus();
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const code = otp.join('');
    if (code.length !== 6) {
      setError('Please enter the full 6-digit code.');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/api/auth/verify-2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ temp_token: tempToken, code }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Verification failed.');

      onVerificationSuccess(data.token, data.user);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (countdown > 0) return;

    setResendStatus('Sending...');
    setError('');
    try {
      const response = await fetch('http://localhost:5000/api/auth/resend-2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ temp_token: tempToken }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to resend code.');
      setResendStatus(data.message);
      setCountdown(30);
    } catch (err: any) {
      setError(err.message);
      setResendStatus('');
    }
  };

  const maskEmail = (emailStr: string) => {
    const [name, domain] = emailStr.split('@');
    return `${name.substring(0, 2)}****@${domain}`;
  };

  return (
    <div className="verification-container">
      <img src={logo} alt="Regal Logo" className="verification-logo" />
      <h2 className="verification-title">Enter Verification Code</h2>
      <p className="verification-subtitle">
        Enter the 6-digit verification code sent to <br /> <strong>{maskEmail(email)}</strong>
      </p>
      {error && <p className="verification-error">{error}</p>}
      <form onSubmit={handleSubmit}>
        <div className="otp-inputs">
          {otp.map((data, index) => (
            <input
              key={index}
              type="text"
              maxLength={1}
              className="otp-input"
              value={data}
              onChange={(e) => handleChange(e.target, index)}
              ref={(el) => {
                inputRefs.current[index] = el;
              }}
            />
          ))}
        </div>
        <button type="submit" className="verify-button" disabled={isLoading}>
          {isLoading ? 'Verifying...' : 'Verify Code'}
        </button>
      </form>

      <div className="resend-container">
        {countdown > 0 ? (
          <p className="resend-timer">Resend code in {countdown}s</p>
        ) : (
          <a onClick={handleResendCode} className="resend-link">
            {resendStatus ? resendStatus : 'Resend Code'}
          </a>
        )}
      </div>
    </div>
  );
};

export default VerificationCodePage;
