
import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import TeamsPage from './pages/TeamsPage';
import TeamDetailPage from './pages/TeamDetailPage';
import KpiEntryPage from './pages/KpiEntryPage';
import ReportsPage from './pages/ReportsPage';
import ActivityLogPage from './pages/ActivityLogPage';
import SettingsPage from './pages/SettingsPage';
import ProfilePage from './pages/ProfilePage';
import AuditTrailPage from './pages/AuditTrailPage';
import Layout from './components/layout/Layout';
import ProtectedRoute from './components/auth/ProtectedRoute';
// FIX: Added missing import for 'Role'
import { Role } from './types';

const App: React.FC = () => {
    return (
        <HashRouter>
            <AuthProvider>
                <Routes>
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/" element={<Layout />}>
                        <Route index element={<Navigate to="/dashboard" replace />} />
                        <Route path="dashboard" element={
                            <ProtectedRoute roles={[Role.Owner, Role.Supervisor, Role.TeamLeader, Role.Assistant, Role.Agent]}>
                                <DashboardPage />
                            </ProtectedRoute>
                        } />
                        <Route path="teams" element={
                            <ProtectedRoute roles={[Role.Owner, Role.Supervisor]}>
                                <TeamsPage />
                            </ProtectedRoute>
                        } />
                        <Route path="teams/:teamId" element={
                            <ProtectedRoute roles={[Role.Owner, Role.Supervisor, Role.TeamLeader, Role.Assistant]}>
                                <TeamDetailPage />
                            </ProtectedRoute>
                        } />
                        <Route path="kpi-entry" element={
                            <ProtectedRoute roles={[Role.Owner, Role.TeamLeader, Role.Assistant]}>
                                <KpiEntryPage />
                            </ProtectedRoute>
                        } />
                         <Route path="kpi-entry/:entryId" element={
                            <ProtectedRoute roles={[Role.Owner, Role.Supervisor, Role.TeamLeader, Role.Assistant]}>
                                <KpiEntryPage />
                            </ProtectedRoute>
                        } />
                        <Route path="reports" element={
                            <ProtectedRoute roles={[Role.Owner, Role.Supervisor, Role.TeamLeader, Role.Assistant, Role.Agent]}>
                                <ReportsPage />
                            </ProtectedRoute>
                        } />
                        <Route path="activity-log" element={
                            <ProtectedRoute roles={[Role.Owner, Role.Supervisor]}>
                                <AuditTrailPage />
                            </ProtectedRoute>
                        } />
                        <Route path="session-log" element={
                            <ProtectedRoute roles={[Role.Owner, Role.Supervisor]}>
                                <ActivityLogPage />
                            </ProtectedRoute>
                        } />
                        <Route path="settings" element={
                            <ProtectedRoute roles={[Role.Owner, Role.Supervisor]}>
                                <SettingsPage />
                            </ProtectedRoute>
                        } />
                         <Route path="profile" element={
                            <ProtectedRoute roles={[Role.Owner, Role.Supervisor, Role.TeamLeader, Role.Assistant, Role.Agent]}>
                                <ProfilePage />
                            </ProtectedRoute>
                        } />
                    </Route>
                    <Route path="*" element={<Navigate to="/" />} />
                </Routes>
            </AuthProvider>
        </HashRouter>
    );
};

export default App;