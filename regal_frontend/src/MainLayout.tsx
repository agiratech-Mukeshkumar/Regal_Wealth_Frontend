import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { useAuth } from './auth/AuthContext';
import './MainLayout.css'; // We'll create this
import logo from './login/Regal_logo.png'

// Import your logo if you have it locally
// import logo from '../login/Regal_logo.png';
const LOGO_URL =  logo


const MainLayout: React.FC = () => {
    const { user, logout } = useAuth();
    const isAdmin = user?.role === 'admin';
    const isAdvisor = user?.role === 'advisor';

    return (
        <div className="app-layout">
            <aside className="sidebar">
                <div className="sidebar-header">
                    <img src={LOGO_URL} alt="Regal Logo" className="sidebar-logo" />
                </div>
                <nav className="sidebar-nav">
                    {isAdvisor && (
                        <>
                            <NavLink to="/dashboard">Dashboard</NavLink>
                            <NavLink to="/clients">Clients</NavLink>
                            <NavLink to="/tools">Tools</NavLink>
                            <NavLink to="/tools/income-tax">Income Tax</NavLink>
                            <NavLink to="/advisor/settings" >Settings</NavLink>
                        </>
                    )}
                    {isAdmin && (
                         <>
                            {/* We will build these pages next */}
                            <NavLink to="/admin/dashboard">Dashboard</NavLink>
                            <NavLink to="/admin/client-management">Client Management</NavLink>
                            <NavLink to="/admin/advisors">Advisors</NavLink>
                            <NavLink to="/admin/users">User Management</NavLink>

                            {/* --- ADDED SECTION FOR SETTINGS --- */}
                            <p className="nav-heading">Settings</p>
                            <NavLink to="/admin/content-governance">Content Governance</NavLink>
                         </>
                    )}
                </nav>
                <div className="sidebar-footer">
                    <div className="user-profile">
                        <p className="user-name">{user?.first_name}</p>
                        <p className="user-role">{user?.role}</p>
                    </div>
                    <button onClick={logout} className="logout-button">Logout</button>
                </div>
            </aside>
            <main className="main-content-area">
                <Outlet />
            </main>
        </div>
    );
};

export default MainLayout;