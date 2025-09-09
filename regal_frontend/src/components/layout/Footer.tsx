import React from 'react';
import './Footer.css';


interface FooterProps {
  theme?: 'light' | 'default';
}

const Footer: React.FC<FooterProps> = ({ theme = 'default' }) => {
 
    const themeClass = theme === 'light' ? 'light-theme' : '';

    return (
        <div className={`footer-container ${themeClass}`}>
            <p>© 2025 Regal Wealth Advisors. All Rights Reserved. | <a href="#">Privacy Policy</a> | <a href="#">Contact Us</a></p>      
        </div>
    );
};

export default Footer;
