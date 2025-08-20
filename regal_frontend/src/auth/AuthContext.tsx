import React, { createContext, useState, useContext, ReactNode } from 'react';
import { User } from '../types';

interface AuthContextType {
    token: string | null;
    user: User | null;
    login: (token: string, user: User) => void;
    logout: () => void;
    updateUser: (updatedUserInfo: Partial<User>) => void; // <-- NEW FUNCTION
    isAuthenticated: boolean;
    
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [token, setToken] = useState<string | null>(localStorage.getItem('authToken'));
    const [user, setUser] = useState<User | null>(() => {
        const storedUser = localStorage.getItem('authUser');
        return storedUser ? JSON.parse(storedUser) : null;
    });

    const login = (newToken: string, newUser: User) => {
        setToken(newToken);
        setUser(newUser);
        localStorage.setItem('authToken', newToken);
        localStorage.setItem('authUser', JSON.stringify(newUser));
    };

    const logout = () => {
        setToken(null);
        setUser(null);
        localStorage.removeItem('authToken');
        localStorage.removeItem('authUser');
    };

    // --- THIS IS THE NEW FUNCTION ---
    // It updates the user state and localStorage with new information.
    const updateUser = (updatedUserInfo: Partial<User>) => {
        setUser(prevUser => {
            if (!prevUser) return null;
            const newUser = { ...prevUser, ...updatedUserInfo };
            localStorage.setItem('authUser', JSON.stringify(newUser));
            return newUser;
        });
    };


    const isAuthenticated = !!token;

    const value = { token, user, login, logout, updateUser, isAuthenticated };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
