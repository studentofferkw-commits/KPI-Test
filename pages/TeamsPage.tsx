import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import { api } from '../services/api';
import { Team, User, Role } from '../types';
import { Users, User as UserIcon, Edit, Save, X, PlusCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const TeamsPage: React.FC = () => {
    const { user } = useAuth();
    const [teams, setTeams] = useState<Team[]>([]);
    const [editingTeam, setEditingTeam] = useState<{ id: string, name: string } | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newTeamName, setNewTeamName] = useState('');

    const fetchTeams = async () => {
        const data = await api.getTeams();
        setTeams(data);
    };

    useEffect(() => {
        fetchTeams();
    }, []);

    const handleRename = async () => {
        if (!editingTeam || !editingTeam.name.trim()) return;
        try {
            await api.renameTeam(editingTeam.id, editingTeam.name);
            setTeams(teams.map(t => t.id === editingTeam.id ? { ...t, teamName: editingTeam.name } : t));
            setEditingTeam(null);
        } catch (error) {
            console.error("Failed to rename team", error);
        }
    };

    const handleAddTeam = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTeamName.trim()) return;
        try {
            await api.createTeam(newTeamName);
            setNewTeamName('');
            setIsAddModalOpen(false);
            fetchTeams(); // Refetch teams to include the new one
        } catch (error) {
            console.error("Failed to add team", error);
        }
    };

    const isUserAdmin = user?.role === Role.Owner || user?.role === Role.Supervisor;

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Team Dashboard</h1>
                {isUserAdmin && <Button onClick={() => setIsAddModalOpen(true)}><PlusCircle className="w-4 h-4 mr-2" /> Add New Team</Button>}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {teams.map(team => (
                    <Card key={team.id} className="hover:shadow-xl transition-shadow flex flex-col">
                        <div className="flex justify-between items-start mb-4">
                            {editingTeam?.id === team.id ? (
                                <div className="flex items-center gap-2 w-full">
                                    <input
                                        type="text"
                                        value={editingTeam.name}
                                        onChange={(e) => setEditingTeam({ ...editingTeam, name: e.target.value })}
                                        className="block w-full px-3 py-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm text-gray-900 dark:text-white"
                                        autoFocus
                                    />
                                    <Button size="sm" onClick={handleRename} aria-label="Save"><Save className="w-4 h-4" /></Button>
                                    <Button size="sm" variant="secondary" onClick={() => setEditingTeam(null)} aria-label="Cancel"><X className="w-4 h-4" /></Button>
                                </div>
                            ) : (
                                <>
                                    <h3 className="text-xl font-bold text-primary-600 dark:text-primary-400">{team.teamName}</h3>
                                    {isUserAdmin && (
                                        <Button size="sm" variant="secondary" onClick={() => setEditingTeam({ id: team.id, name: team.teamName })} aria-label="Edit team name">
                                            <Edit className="w-4 h-4" />
                                        </Button>
                                    )}
                                </>
                            )}
                        </div>
                        <div className="flex-grow space-y-2 text-sm text-gray-600 dark:text-gray-300">
                            <p className="flex items-center"><UserIcon className="w-4 h-4 mr-2" /> <strong>Leader:</strong> {team.agents.find(a => a.id === team.leaderId)?.fullName || 'N/A'}</p>
                            <p className="flex items-center"><UserIcon className="w-4 h-4 mr-2" /> <strong>Assistant:</strong> {team.agents.find(a => a.id === team.assistantId)?.fullName || 'N/A'}</p>
                            <p className="flex items-center"><Users className="w-4 h-4 mr-2" /> <strong>Agents:</strong> {team.agents.length}</p>
                        </div>
                        <div className="mt-auto pt-4">
                            <Link to={`/teams/${team.id}`}>
                                <Button variant="secondary" className="w-full">
                                    View Details
                                </Button>
                            </Link>
                        </div>
                    </Card>
                ))}
            </div>
            <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Add New Team">
                <form onSubmit={handleAddTeam} className="space-y-4">
                    <Input id="newTeamName" label="Team Name" value={newTeamName} onChange={e => setNewTeamName(e.target.value)} required autoFocus />
                    <div className="flex justify-end space-x-2 pt-4">
                        <Button type="button" variant="secondary" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
                        <Button type="submit">Create Team</Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default TeamsPage;