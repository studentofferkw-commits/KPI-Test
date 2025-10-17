import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Role } from '../../types';

interface ProtectedRouteProps {
    // FIX: Changed JSX.Element to React.ReactElement to resolve namespace error.
    children: React.ReactElement;
    roles: Role[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, roles }) => {
    const { isAuthenticated, user, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-primary-500"></div>
            </div>
        );
    }
    
    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (roles.length > 0 && (!user || !roles.includes(user.role))) {
        return <Navigate to="/dashboard" state={{ from: location }} replace />;
    }

    return children;
};

export default ProtectedRoute;
