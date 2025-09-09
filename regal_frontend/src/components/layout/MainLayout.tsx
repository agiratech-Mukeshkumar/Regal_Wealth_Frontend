import React, { useState } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import './MainLayout.css';
import logo from '../../images/side_logo.png';
import Footer from './Footer';

import {
    FiChevronDown, FiClipboard, FiGrid, FiTool, FiBell,
    FiSettings, FiLogOut, FiUsers, FiUser, FiFileText
} from 'react-icons/fi';

const LOGO_URL = logo;

const MainLayout: React.FC = () => {
    const { user, logout } = useAuth();
    const location = useLocation();

    const [isToolsOpen, setIsToolsOpen] = useState(location.pathname.startsWith('/tools'));

    const isAdmin = user?.role === 'admin';
    const isAdvisor = user?.role === 'advisor';
    const isClient = user?.role === 'client';

    const today = new Date().toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    
    });

    const currentHour = new Date().getHours();
    let greeting = "Hello";

    if (currentHour < 12) {
        greeting = "Good Morning";
    } else if (currentHour < 18) {
        greeting = "Good Afternoon";
    } else {
        greeting = "Good Evening";
    }

    return (
        <div className="app-layout">
            {/* Sidebar */}

            <aside className="sidebar">
                <div className="sidebar-inner">
                    <div className="sidebar-header">
                        <img src={LOGO_URL} alt="Regal Logo" className="sidebar-logo" />
                    </div>
                    <div className="user-greeting">
                        <img
                            src={`https://i.pravatar.cc/150?u=${user?.email}`}
                            alt="User Avatar"
                            className="avatar"
                        />
                        <div>
                            <h4>{greeting}, {user?.first_name}</h4>
                            <p>{today}</p>
                        </div>

                    </div>
                    <br />
                    <nav className="sidebar-nav">
                        {/* Advisor Links */}
                        {isAdvisor && (
                            <>
                                <NavLink to="/dashboard">
                                    {FiGrid({ className: "nav-icon" })}Dashboard
                                </NavLink>
                                <NavLink to="/clients">
                                    {FiUsers({ className: "nav-icon" })} Clients
                                </NavLink>

                                
                                <div className="nav-collapsible">
                                    <NavLink
                                        to="/tools"
                                        className={`nav-parent ${location.pathname.startsWith('/tools') ? 'active' : ''}`}
                                        onClick={() => setIsToolsOpen(!isToolsOpen)}
                                    >
                                        {FiTool({ className: "nav-icon" })} Tools
                                        {FiChevronDown({ className: `chevron-icon ${isToolsOpen ? 'open' : ''}` })}
                                    </NavLink>
                                    {isToolsOpen && (
                                        <div className="nav-submenu">
                                            <NavLink to="/tools/income-tax">Income Tax</NavLink>
                                            <NavLink to="/tools/social-security">Social Security</NavLink>
                                            <NavLink to="/tools/retirement-income">Retirement Income</NavLink>
                                            <NavLink to="/tools/matrix">Matrix</NavLink>
                                        </div>
                                    )}
                                </div>

                                <NavLink to="/notifications">
                                    {FiBell({ className: "nav-icon" })}Notification
                                </NavLink>
                                <NavLink to="/advisor/settings">
                                    {FiSettings({ className: "nav-icon" })} Settings
                                </NavLink>
                            </>
                        )}

                        {/* Client Links */}
                        {isClient && (
                            <>
                                <div className="nav-collapsible">
                                    <button
                                        onClick={() => setIsToolsOpen(!isToolsOpen)}
                                        className={`nav-parent ${location.pathname.startsWith('/fact-finder') ? 'active' : ''}`}
                                    >
                                        {FiClipboard({ className: "nav-icon" })} Fact Finder
                                        {FiChevronDown({ className: `chevron-icon ${isToolsOpen ? 'open' : ''}` })}
                                    </button>
                                    {isToolsOpen && (
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
                                <NavLink to="/client/dashboard">
                                    {FiGrid({ className: "nav-icon" })} Dashboard
                                </NavLink>
                                <NavLink to="/my-plan">
                                    {FiFileText({ className: "nav-icon" })} My Plan
                                </NavLink>
                                <NavLink to="/notifications">
                                    {FiBell({ className: "nav-icon" })} Notification
                                </NavLink>
                                <NavLink to="/settings">
                                    {FiSettings({ className: "nav-icon" })}Settings
                                </NavLink>
                            </>
                        )}

                        {/* Admin Links */}
                        {isAdmin && (
                            <>
                                <NavLink to="/admin/dashboard">
                                    {FiGrid({ className: "nav-icon" })} Dashboard
                                </NavLink>
                                <NavLink to="/admin/client-management">
                                    {FiUsers({ className: "nav-icon" })} Client Management
                                </NavLink>
                                <NavLink to="/admin/advisors">
                                    {FiUser({ className: "nav-icon" })} Advisors
                                </NavLink>
                                
                                <NavLink to="/admin/content-governance">
                                    {FiFileText({ className: "nav-icon" })}Content Governance
                                </NavLink>
                            </>
                        )}
                    </nav>
                    <div className="sidebar-footer">
                        <button onClick={logout} className="logout-button">
                            {FiLogOut({ className: "nav-icon" })} Logout
                        </button>
                    </div>
                </div>
            </aside>



            {/* Main Content */}
            <div className="main-content-wrapper">

                <main className="main-content-area">
                    <Outlet />
                </main>
                <Footer />
            </div>
        </div>
    );
};

export default MainLayout;
