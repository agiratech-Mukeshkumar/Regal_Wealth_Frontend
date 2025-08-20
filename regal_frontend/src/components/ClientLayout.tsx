import React, { useState } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import './ClientLayout.css';
import logo from '../login/Regal_logo.png';

import { 
    FiChevronDown,  FiClipboard, FiGrid, FiMap, 
    FiBell, FiSettings, FiLogOut 
} from 'react-icons/fi';

const LOGO_URL = logo;

const ClientLayout = () => {
    const { logout } = useAuth();
    const [isFactFinderOpen, setFactFinderOpen] = useState(true); 

    return (
        <div className="client-layout">
            <aside className="client-sidebar">
                <div className="sidebar-header">
                    <img src={LOGO_URL} alt="Regal Logo" className="sidebar-logo" />
                </div>
                
                <nav className="sidebar-nav">
                    {/* Collapsible Fact Finder Section */}
                    <div className="nav-section">
                        <button 
                            className="nav-accordion-header" 
                            onClick={() => setFactFinderOpen(!isFactFinderOpen)}
                        >
                            {FiClipboard({ className: "nav-icon" })}
                            <span>Fact Finder</span>
                            {FiChevronDown({ className: `chevron-icon ${isFactFinderOpen ? 'open' : ''}` })}
                        </button>
                        {isFactFinderOpen && (
                            <div className="nav-submenu">
                                <NavLink to="/fact-finder/personal-info">Personal Info</NavLink>
                                <NavLink to="/fact-finder/spouse-info">Spouse Info</NavLink>
                                <NavLink to="/fact-finder/family-info">Family Info</NavLink>
                                <NavLink to="/fact-finder/investor-profile">Investor Profile</NavLink>
                                <NavLink to="/fact-finder/income">Income</NavLink>
                                <NavLink to="/fact-finder/assets">Assets</NavLink>
                                <NavLink to="/fact-finder/liabilities">Liabilities</NavLink>
                                <NavLink to="/fact-finder/documents">Documents</NavLink>
                                <NavLink to="/fact-finder/summary">Summary</NavLink>
                            </div>
                        )}
                    </div>
                    
                    {/* Other Navigation Links */}
                    <div className="nav-section">
                        <NavLink to="/dashboard">{FiGrid({ className: "nav-icon" })}Dashboard</NavLink>
                        <NavLink to="/my-plan">{FiMap({ className: "nav-icon" })}My Plan</NavLink>
                        <NavLink to="/notification">{FiBell({ className: "nav-icon" })}Notification</NavLink>
                        <NavLink to="/settings">{FiSettings({ className: "nav-icon" })}Settings</NavLink>
                    </div>
                </nav>

                <div className="sidebar-footer">
                    <button onClick={logout} className="logout-button">
                        {FiLogOut({ className: "nav-icon" })}
                        <span>Logout</span>
                    </button>
                </div>
            </aside>
            <main className="client-main-content">
                <Outlet />
            </main>
        </div>
    );
};

export default ClientLayout;