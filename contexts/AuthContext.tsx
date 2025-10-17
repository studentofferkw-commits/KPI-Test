import React, { createContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { User, Role } from '../types';
import { api } from '../services/api';
import { useNavigate } from 'react-router-dom';

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    login: (email: string, pass: string) => Promise<void>;
    logout: () => void;
    loading: boolean;
    updateUserContext: (user: User) => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    const checkUser = useCallback(async () => {
        try {
            const storedUser = localStorage.getItem('user');
            if (storedUser) {
                const parsedUser: User = JSON.parse(storedUser);
                setUser(parsedUser);
            }
        } catch (error) {
            console.error("Failed to check user session", error);
            setUser(null);
            localStorage.removeItem('user');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        checkUser();
    }, [checkUser]);

    const login = async (email: string, pass: string) => {
        setLoading(true);
        try {
            const loggedInUser = await api.login(email, pass);
            setUser(loggedInUser);
            localStorage.setItem('user', JSON.stringify(loggedInUser));
            navigate('/dashboard');
        } catch (error) {
            console.error(error);
            throw error;
        } finally {
            setLoading(false);
        }
    };

    const logout = () => {
        if (user) {
            // Log the logout activity before clearing the user session
            api.logActivity({ action: 'LOGOUT', affectedTable: 'users', recordId: user.id, details: 'User logged out' });
        }
        setUser(null);
        localStorage.removeItem('user');
        // The user reported that navigation on logout was not working.
        // While navigate() should work, we can force it with a direct location change
        // to ensure the user is always returned to the login page.
        window.location.hash = '/login';
    };

    const updateUserContext = (updatedUser: User) => {
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
    };
    
    return (
        <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout, loading, updateUserContext }}>
            {children}
        </AuthContext.Provider>
    );
};