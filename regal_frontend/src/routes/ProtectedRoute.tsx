import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

const ProtectedRoute: React.FC = () => {
    const { isAuthenticated } = useAuth();

    if (!isAuthenticated) {
        // If not authenticated, redirect to the login page
        return <Navigate to="/login" />;
    }

    // If authenticated, render the child routes
    return <Outlet />;
};

export default ProtectedRoute;