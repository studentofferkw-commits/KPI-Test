import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Role } from '../../types';
import { LayoutDashboard, Users, FileBarChart, History, Settings, FilePlus, ShieldCheck, ClipboardList } from 'lucide-react';

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({isOpen, onClose}) => {
    const { user } = useAuth();

    const navLinks = [
        { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: [Role.Owner, Role.Supervisor, Role.TeamLeader, Role.Assistant, Role.Agent] },
        { to: '/kpi-entry', label: 'KPI Entry', icon: FilePlus, roles: [Role.Owner, Role.TeamLeader, Role.Assistant] },
        { to: '/reports', label: 'Reports', icon: FileBarChart, roles: [Role.Owner, Role.Supervisor, Role.TeamLeader, Role.Assistant, Role.Agent] },
        { to: '/teams', label: 'Teams', icon: Users, roles: [Role.Owner, Role.Supervisor] },
        { to: '/activity-log', label: 'Activity Log', icon: ClipboardList, roles: [Role.Owner, Role.Supervisor] },
        { to: '/session-log', label: 'Session Log', icon: History, roles: [Role.Owner, Role.Supervisor] },
        { to: '/settings', label: 'Settings', icon: Settings, roles: [Role.Owner, Role.Supervisor] },
    ].filter(link => user && link.roles.includes(user.role));

    const NavItem: React.FC<{ to: string, label: string, icon: React.ElementType }> = ({ to, label, icon: Icon }) => (
        <NavLink
            to={to}
            onClick={onClose}
            className={({ isActive }) =>
                `flex items-center px-4 py-3 text-lg font-medium rounded-lg transition-colors duration-200 ${
                    isActive
                        ? 'bg-primary-500 text-white'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`
            }
        >
            <Icon className="mr-4 h-6 w-6" />
            <span>{label}</span>
        </NavLink>
    );
    
    return (
        <>
            <div className={`fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={onClose}></div>
            <aside className={`fixed top-0 left-0 w-64 h-full bg-white dark:bg-gray-800 shadow-lg z-40 transform transition-transform lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="flex items-center justify-center h-20 border-b dark:border-gray-700">
                    <ShieldCheck className="h-10 w-10 text-primary-500" />
                    <span className="ml-3 text-2xl font-bold text-gray-800 dark:text-white">KPI Pro</span>
                </div>
                <nav className="p-4 space-y-2">
                    {navLinks.map(link => (
                        <NavItem key={link.to} to={link.to} label={link.label} icon={link.icon} />
                    ))}
                </nav>
            </aside>
        </>
    );
};

export default Sidebar;