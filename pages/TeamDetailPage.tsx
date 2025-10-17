import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Modal from '../components/ui/Modal';
import { api } from '../services/api';
import { Team, User, CalculatedKpi, Role } from '../types';
import { useAuth } from '../hooks/useAuth';
import { ArrowLeft, PlusCircle, Edit, Trash2 } from 'lucide-react';

const TeamDetailPage: React.FC = () => {
    const { teamId } = useParams<{ teamId: string }>();
    const { user } = useAuth();
    const [team, setTeam] = useState<Team | null>(null);
    const [members, setMembers] = useState<User[]>([]);
    const [kpis, setKpis] = useState<CalculatedKpi[]>([]);
    const [loading, setLoading] = useState(true);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingAgent, setEditingAgent] = useState<User | null>(null);
    const [agentFormData, setAgentFormData] = useState({ fullName: '', email: '', password: '', role: Role.Agent });

    const isUserAdmin = user?.role === Role.Owner || user?.role === Role.Supervisor;

    const fetchData = useCallback(async () => {
        if (!teamId) return;
        setLoading(true);
        try {
            const teamData = await api.getTeamById(teamId);
            setTeam(teamData);
            setMembers(teamData?.agents || []);
            const kpiData = await api.getKpis({ teamId });
            setKpis(kpiData);
        } catch (error) {
            console.error("Failed to fetch team data", error);
        } finally {
            setLoading(false);
        }
    }, [teamId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleOpenModal = (agent: User | null) => {
        setEditingAgent(agent);
        setAgentFormData(agent ? { fullName: agent.fullName, email: agent.email, password: '', role: agent.role } : { fullName: '', email: '', password: '', role: Role.Agent });
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingAgent(null);
    };

    const handleSaveAgent = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!teamId) return;
        try {
            if (editingAgent) {
                const dataToSave: Partial<User> = {
                    fullName: agentFormData.fullName,
                    email: agentFormData.email,
                    role: agentFormData.role,
                };
                if (agentFormData.password) {
                    dataToSave.password = agentFormData.password;
                }
                await api.updateUser(editingAgent.id, dataToSave);
            } else {
                await api.createUser({ ...agentFormData, teamId } as Omit<User, 'id'>);
            }
            fetchData();
            handleCloseModal();
        } catch (error) {
            console.error("Failed to save agent", error);
        }
    };
    
    const handleDeleteAgent = async (agentId: string) => {
        if (window.confirm('Are you sure you want to permanently delete this agent? This action cannot be undone.')) {
            const originalMembers = [...members];
            const originalKpis = [...kpis];

            // Optimistically update UI
            setMembers(currentMembers => currentMembers.filter(m => m.id !== agentId));
            setKpis(currentKpis => currentKpis.filter(kpi => kpi.userId !== agentId));
            
            try {
                await api.deleteUser(agentId); // API call to persist deletion
            } catch (error) {
                console.error("Failed to delete agent", error);
                alert('Failed to delete agent. The data will be restored.');
                // Revert UI on failure
                setMembers(originalMembers);
                setKpis(originalKpis);
            }
        }
    };

    if (loading) return <div>Loading...</div>;
    if (!team) return <div>Team not found.</div>;

    const kpiHeaders = ['Agent name', 'Team', 'Task', 'Date', 'Day', 'Duty Hours', 'Attendance', 'Attendance %', 'login', 'login %', 'On Queue', 'On Queue %', 'Target', 'Target %', 'Avg Talk', 'Avg Talk %', 'ASA', 'ASA %', 'Productivity', 'Productivity %', 'DS Productivity', 'DS Productivity %', 'QA %', 'PK %', 'Mistakes', 'Mistakes %', 'Bonus', 'Bonus %', 'Overall %', 'Team %', 'Remarks'];

    return (
        <div className="space-y-6">
            <Link to="/teams" className="inline-flex items-center text-primary-600 dark:text-primary-400 hover:underline mb-4">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Teams
            </Link>
            <div>
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white">{team.teamName}</h1>
                <p className="text-gray-500 dark:text-gray-400">Team Leader: {members.find(m => m.id === team.leaderId)?.fullName}</p>
            </div>

            <Card>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Team Members</h3>
                    {isUserAdmin && (
                         <Button onClick={() => handleOpenModal(null)}>
                            <PlusCircle className="w-4 h-4 mr-2" /> Add Agent
                        </Button>
                    )}
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                            <tr>
                                <th scope="col" className="px-6 py-3">Name</th>
                                <th scope="col" className="px-6 py-3">Email</th>
                                <th scope="col" className="px-6 py-3">Role</th>
                                {isUserAdmin && <th scope="col" className="px-6 py-3">Actions</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {members.map(member => (
                                <tr key={member.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                    <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">{member.fullName}</td>
                                    <td className="px-6 py-4">{member.email}</td>
                                    <td className="px-6 py-4">{member.role}</td>
                                    {isUserAdmin && (
                                        <td className="px-6 py-4 space-x-2">
                                            <Button size="sm" variant="secondary" onClick={() => handleOpenModal(member)} aria-label="Edit agent"><Edit className="w-4 h-4" /></Button>
                                            <Button size="sm" variant="danger" onClick={() => handleDeleteAgent(member.id)} aria-label="Delete agent"><Trash2 className="w-4 h-4" /></Button>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
            
            <Card title="Agent KPI Details">
                 <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                            <tr>
                                {kpiHeaders.map(header => <th key={header} scope="col" className="px-6 py-3 whitespace-nowrap">{header}</th>)}
                            </tr>
                        </thead>
                        <tbody>
                             {kpis.map(kpi => (
                                <tr key={kpi.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                    {kpiHeaders.map(header => {
                                        const key = header as keyof CalculatedKpi;
                                        const value = kpi[key];
                                        const isPercent = header.includes('%');
                                        return (
                                            <td key={header} className="px-6 py-4 whitespace-nowrap">
                                                {typeof value === 'number' && isPercent ? `${value.toFixed(2)}%` : String(value ?? '')}
                                            </td>
                                        )
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingAgent ? 'Edit Agent' : 'Add New Agent'}>
                <form onSubmit={handleSaveAgent} className="space-y-4">
                    <Input id="fullName" label="Full Name" value={agentFormData.fullName} onChange={e => setAgentFormData({...agentFormData, fullName: e.target.value})} required />
                    <Input id="email" label="Email Address" type="email" value={agentFormData.email} onChange={e => setAgentFormData({...agentFormData, email: e.target.value})} required />
                     <Input 
                        id="password" 
                        label="Password" 
                        type="password" 
                        value={agentFormData.password} 
                        onChange={e => setAgentFormData({...agentFormData, password: e.target.value})} 
                        required={!editingAgent}
                        placeholder={editingAgent ? "Leave blank to keep current" : ""}
                    />
                    <Select id="role" label="Role" value={agentFormData.role} onChange={e => setAgentFormData({...agentFormData, role: e.target.value as Role })}>
                        <option value={Role.Agent}>Agent</option>
                        <option value={Role.Assistant}>Assistant</option>
                        <option value={Role.TeamLeader}>Team Leader</option>
                    </Select>
                    <div className="flex justify-end space-x-2 pt-4">
                        <Button type="button" variant="secondary" onClick={handleCloseModal}>Cancel</Button>
                        <Button type="submit">Save Agent</Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default TeamDetailPage;