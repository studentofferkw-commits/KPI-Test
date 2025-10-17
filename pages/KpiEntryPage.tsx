import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { api } from '../services/api';
import { KpiEntry, TaskName, User, Role, Team, KpiFactor } from '../types';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Card from '../components/ui/Card';

const getDayFromDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = { weekday: 'long' };
    return new Intl.DateTimeFormat('en-US', options).format(date);
};

const KpiEntryPage: React.FC = () => {
    const { entryId } = useParams<{ entryId?: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [tasks, setTasks] = useState<TaskName[]>([]);
    const [agents, setAgents] = useState<User[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);
    const [kpiFactors, setKpiFactors] = useState<KpiFactor[]>([]);
    const [formData, setFormData] = useState<Partial<KpiEntry>>({
        Date: new Date().toISOString().split('T')[0],
        Day: getDayFromDate(new Date().toISOString().split('T')[0]),
        Task: TaskName.CQ,
        'Duty Hours': 8,
        Team: '',
        userId: '',
        'Agent name': '',
        Attendance: 5,
        login: '08:00:00',
        'On Queue': '07:30:00',
        'Avg Talk': '00:03:00',
        ASA: 4,
        Productivity: 100,
        Target: 225,
        Bonus: 0,
        Mistakes: 0,
        Remarks: '',
        'QA %': undefined,
        'PK %': undefined,
    });

    const canEditAdminFields = entryId && user && [Role.Owner, Role.Supervisor].includes(user.role);
    const isSupervisor = user?.role === Role.Supervisor;
    const isCreating = !entryId;
    const isDisabled = isSupervisor && isCreating;
    const isAdmin = user && [Role.Owner, Role.Supervisor].includes(user.role);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            const [masterTasks, factors] = await Promise.all([api.getTasks(), api.getKpiFactors()]);
            setTasks(masterTasks.map(t => t.taskName));
            setKpiFactors(factors);

            if (user) {
                let availableAgents: User[] = [];
                if (user.role === Role.Agent) {
                    availableAgents = [user];
                    const agentTeam = await api.getTeamById(user.teamId ?? '');
                    setFormData(prev => ({ ...prev, userId: user.id, 'Agent name': user.fullName, Team: agentTeam?.teamName ?? '' }));
                } else if ((user.role === Role.TeamLeader || user.role === Role.Assistant) && user.teamId) {
                    const team = await api.getTeamById(user.teamId);
                    availableAgents = team?.agents || [];
                    setFormData(prev => ({ ...prev, Team: team?.teamName }));
                } else if (isAdmin) {
                    const [allUsers, allTeams] = await Promise.all([api.getUsers(), api.getTeams()]);
                    availableAgents = allUsers.filter(u => u.role === Role.Agent);
                    setTeams(allTeams);
                }
                setAgents(availableAgents);

                if (entryId) {
                    const entry = await api.getKpiById(entryId);
                    if (entry) setFormData(entry);
                }
            }
            setIsLoading(false);
        };
        fetchData();
    }, [user, entryId, isAdmin]);
    
    const factorMap = useMemo(() => new Map(kpiFactors.map(f => [f.key, f])), [kpiFactors]);
    const getDisplayName = (key: KpiFactor['key'], defaultName: string) => factorMap.get(key)?.displayName ?? defaultName;
    const getMaxValue = (key: KpiFactor['key']) => factorMap.get(key)?.weight;
    const customFactors = useMemo(() => kpiFactors.filter(f => f.isCustom), [kpiFactors]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        const parsedValue = (e.target as HTMLInputElement).type === 'number' 
            ? (value === '' ? undefined : parseFloat(value))
            : value;

        setFormData(prev => {
            const updated = { ...prev, [name]: parsedValue };
            if (name === 'Date') {
                updated.Day = getDayFromDate(value);
            }
             if (name === 'userId') {
                const selectedAgent = agents.find(a => a.id === value);
                if(selectedAgent) {
                    updated['Agent name'] = selectedAgent.fullName;
                    const agentTeam = teams.find(t => t.id === selectedAgent.teamId);
                    updated['Team'] = agentTeam ? agentTeam.teamName : '';
                } else {
                    updated['Agent name'] = '';
                    updated['Team'] = '';
                }
            }
            return updated;
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        
        const dataToSave: Partial<KpiEntry> = { ...formData };
        const selectedTask = dataToSave.Task;

        if (selectedTask && [TaskName.CQ, TaskName.DQ, TaskName.CDQ].includes(selectedTask)) {
            dataToSave.Target = undefined;
            dataToSave.Productivity = undefined;
        }

        try {
            if (entryId) {
                await api.updateKpi(entryId, dataToSave as KpiEntry);
            } else {
                await api.createKpi(dataToSave as KpiEntry);
            }
            navigate('/reports');
        } catch (error) {
            console.error('Failed to save KPI entry', error);
        } finally {
            setIsLoading(false);
        }
    };
    
    const selectedTask = formData.Task;
    const isCallCenterTask = selectedTask && [TaskName.CQ, TaskName.DQ, TaskName.CDQ].includes(selectedTask);
    const isDispatchTask = selectedTask && [TaskName.Dispatch, TaskName.Tickets, TaskName.VOP].includes(selectedTask);
    const isAMSTask = selectedTask && [TaskName.Approve, TaskName.Missing].includes(selectedTask);
    const isSocialMediaTask = selectedTask === TaskName.SocialMedia;


    if (isLoading && !user) return <p>Loading...</p>

    return (
        <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-6">
                {entryId ? 'Edit' : 'Create'} KPI Entry
            </h1>
            <Card>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {user?.role !== Role.Agent && (
                            <Select id="userId" name="userId" label="Agent Name" value={formData.userId} onChange={handleChange} required disabled={isDisabled}>
                                <option value="">Select Agent</option>
                                {agents.map(agent => <option key={agent.id} value={agent.id}>{agent.fullName}</option>)}
                            </Select>
                        )}
                        {isAdmin ? (
                             <Select id="Team" name="Team" label="Team" value={formData.Team} disabled>
                                 <option value="">{formData.Team || 'Select an agent'}</option>
                                 {teams.map(team => <option key={team.id} value={team.teamName}>{team.teamName}</option>)}
                             </Select>
                        ) : (
                             <Input id="Team" name="Team" label="Team" type="text" value={formData.Team} readOnly />
                        )}
                        <Select id="Task" name="Task" label="Task" value={formData.Task} onChange={handleChange} required disabled={isDisabled}>
                            {tasks.map(task => <option key={task} value={task}>{task}</option>)}
                        </Select>
                        <Input id="Date" name="Date" label="Date" type="date" value={formData.Date} onChange={handleChange} required disabled={isDisabled}/>
                        <Input id="Day" name="Day" label="Day" type="text" value={formData.Day} readOnly />
                        <Select id="Duty Hours" name="Duty Hours" label="Duty Hours" value={formData['Duty Hours']} onChange={handleChange} required disabled={isDisabled}>
                            {[4, 5, 6, 7, 8, 9].map(h => <option key={h} value={h}>{h}</option>)}
                        </Select>
                        <Input id="Attendance" name="Attendance" label={getDisplayName('Attendance %', 'Attendance')} type="number" min="0" max="5" value={formData.Attendance ?? ''} onChange={handleChange} required disabled={isDisabled} />
                         <Input id="login" name="login" label={getDisplayName('login %', 'Login Time')} type="text" pattern="[0-2][0-9]:[0-5][0-9]:[0-5][0-9]" placeholder="HH:mm:ss" title="Enter time in HH:mm:ss format" value={formData.login} onChange={handleChange} required disabled={isDisabled}/>
                    </div>

                    <hr className="my-6 border-gray-200 dark:border-gray-700" />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {isCallCenterTask && (
                             <>
                                <Input id="On Queue" name="On Queue" label={getDisplayName('On Queue %', 'On Queue')} type="text" pattern="[0-2][0-9]:[0-5][0-9]:[0-5][0-9]" placeholder="HH:mm:ss" title="Enter time in HH:mm:ss format" value={formData['On Queue'] ?? ''} onChange={handleChange} disabled={isDisabled} />
                                <Input id="Avg Talk" name="Avg Talk" label={getDisplayName('Avg Talk %', 'Avg Talk')} type="text" pattern="[0-2][0-9]:[0-5][0-9]:[0-5][0-9]" placeholder="HH:mm:ss" title="Enter time in HH:mm:ss format" value={formData['Avg Talk'] ?? ''} onChange={handleChange} disabled={isDisabled}/>
                                <Input id="ASA" name="ASA" label={getDisplayName('ASA %', 'ASA')} type="number" step="0.01" value={formData.ASA ?? ''} onChange={handleChange} disabled={isDisabled}/>
                            </>
                        )}
                         {isDispatchTask && (
                             <>
                                <Input id="DS Productivity" name="DS Productivity" label={getDisplayName('DS Productivity %', 'DS Productivity')} type="number" value={formData['DS Productivity'] ?? ''} onChange={handleChange} disabled={isDisabled}/>
                                <Input id="Target" name="Target" label={getDisplayName('Target %', 'Target')} type="number" value={formData.Target ?? ''} onChange={handleChange} required disabled={isDisabled}/>
                             </>
                        )}
                        {isAMSTask && (
                            <Input id="AMS Productivity" name="AMS Productivity" label={getDisplayName('AMS Productivity %', 'AMS Productivity')} type="number" value={formData['AMS Productivity'] ?? ''} onChange={handleChange} disabled={isDisabled}/>
                        )}
                        {isSocialMediaTask && (
                             <>
                                <Input id="AMS Productivity" name="AMS Productivity" label={getDisplayName('AMS Productivity %', 'AMS Productivity')} type="number" value={formData['AMS Productivity'] ?? ''} onChange={handleChange} disabled={isDisabled}/>
                                <Input id="ASA" name="ASA" label={getDisplayName('ASA %', 'ASA')} type="number" step="0.01" value={formData.ASA ?? ''} onChange={handleChange} disabled={isDisabled}/>
                            </>
                        )}
                        {(isCallCenterTask || isDispatchTask || isAMSTask || isSocialMediaTask) && (
                            <Input id="Mistakes" name="Mistakes" label={getDisplayName('Mistakes %', 'Mistakes')} type="number" value={formData.Mistakes ?? ''} onChange={handleChange} disabled={isDisabled}/>
                        )}
                        {(isCallCenterTask || isDispatchTask || isAMSTask || isSocialMediaTask) && (
                            <Input id="Bonus" name="Bonus" label={getDisplayName('Bonus %', 'Bonus')} type="number" value={formData.Bonus ?? ''} onChange={handleChange} required disabled={isDisabled}/>
                        )}
                        { !isCallCenterTask && !isDispatchTask && !isAMSTask && !isSocialMediaTask && (
                             <>
                                <Input id="Productivity" name="Productivity" label={getDisplayName('Productivity %', 'Productivity')} type="number" value={formData.Productivity ?? ''} onChange={handleChange} required disabled={isDisabled}/>
                                <Input id="Target" name="Target" label={getDisplayName('Target %', 'Target')} type="number" value={formData.Target ?? ''} onChange={handleChange} required disabled={isDisabled}/>
                             </>
                           )
                        }
                        
                        {/* Admin and Custom Fields */}
                        {canEditAdminFields && (
                            <>
                                <Input id="QA %" name="QA %" label={getDisplayName('QA %', 'QA %')} type="number" min="0" max={getMaxValue('QA %') ?? 35} step="0.01" value={formData['QA %'] ?? ''} onChange={handleChange} disabled={isSupervisor && !entryId}/>
                                <Input id="PK %" name="PK %" label={getDisplayName('PK %', 'PK %')} type="number" min="0" max={getMaxValue('PK %') ?? 10} step="0.01" value={formData['PK %'] ?? ''} onChange={handleChange} disabled={isSupervisor && !entryId}/>
                            </>
                        )}
                        {customFactors.map(factor => (
                            <Input
                                key={factor.key}
                                id={factor.key}
                                name={factor.key}
                                label={factor.displayName}
                                type="number"
                                min="0"
                                max={factor.weight}
                                step="0.01"
                                value={formData[factor.key] ?? ''}
                                onChange={handleChange}
                                disabled={isDisabled}
                                title={factor.description}
                            />
                        ))}
                    </div>

                    <div className="mt-6">
                        <label htmlFor="Remarks" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Remarks</label>
                        <textarea id="Remarks" name="Remarks" rows={3}
                            className="block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm text-gray-900 dark:text-white"
                            value={formData.Remarks} onChange={handleChange} disabled={isDisabled} />
                    </div>

                    {!isDisabled && (
                         <div className="flex justify-end pt-4 space-x-2">
                             {entryId && <Button type="button" variant="secondary" onClick={() => navigate('/reports')}>Cancel</Button>}
                            <Button type="submit" isLoading={isLoading}>
                                {entryId ? 'Update Entry' : 'Save Entry'}
                            </Button>
                        </div>
                    )}
                </form>
            </Card>
        </div>
    );
};

export default KpiEntryPage;