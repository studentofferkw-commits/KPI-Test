import React, { useEffect, useState, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Card from '../components/ui/Card';
// FIX: Import AgentTaskSummary from types.ts, not api.ts
import { api } from '../services/api';
import { CalculatedKpi, Role, Team, User, TaskName, AgentTaskSummary } from '../types';
import { useAuth } from '../hooks/useAuth';
import Button from '../components/ui/Button';
import { ChevronDown } from 'lucide-react';

// --- Enhanced MultiSelect Component ---
interface MultiSelectOption {
    value: string;
    label: string;
}

interface MultiSelectDropdownProps {
    label: string;
    options: MultiSelectOption[];
    selectedValues: string[];
    onChange: (selected: string[]) => void;
    placeholder?: string;
}

const MultiSelectDropdown: React.FC<MultiSelectDropdownProps> = ({ label, options, selectedValues, onChange, placeholder }) => {
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const allValues = useMemo(() => options.map(o => o.value), [options]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [ref]);

    const handleSelect = (value: string) => {
        const newSelected = selectedValues.includes(value)
            ? selectedValues.filter(v => v !== value)
            : [...selectedValues, value];
        onChange(newSelected);
    };
    
    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            onChange(allValues);
        } else {
            onChange([]);
        }
    };
    
    const isAllSelected = selectedValues.length > 0 && selectedValues.length === options.length;
    
    const displayValue = () => {
        if (selectedValues.length === 0) return placeholder || `Select ${label}`;
        if (selectedValues.length === options.length && options.length > 1) return `All ${label} selected`;
        if (selectedValues.length > 1) return `${selectedValues.length} of ${options.length} selected`;
        const selectedOption = options.find(o => o.value === selectedValues[0]);
        return selectedOption ? selectedOption.label : `1 selected`;
    };


    return (
        <div className="relative" ref={ref}>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
            <button 
                type="button" 
                onClick={() => setIsOpen(!isOpen)} 
                className="block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-left flex justify-between items-center"
            >
                <span className="text-gray-900 dark:text-white truncate">
                    {selectedValues.length > 0 ? displayValue() : <span className="text-gray-500 dark:text-gray-400">{placeholder || `Select ${label}`}</span>}
                </span>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
                <div className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-800 shadow-lg border dark:border-gray-600 rounded-md max-h-60 overflow-y-auto">
                    <div className="p-2 space-y-1">
                        <label className="flex items-center space-x-2 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer border-b dark:border-gray-600">
                            <input
                                type="checkbox"
                                className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                checked={isAllSelected}
                                onChange={handleSelectAll}
                            />
                            <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">Select All</span>
                        </label>
                        {options.map(option => (
                            <label key={option.value} className="flex items-center space-x-2 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                    checked={selectedValues.includes(option.value)} 
                                    onChange={() => handleSelect(option.value)} 
                                />
                                <span className="text-sm text-gray-700 dark:text-gray-300">{option.label}</span>
                            </label>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};


const MissingEntriesCard: React.FC = () => {
    const { user } = useAuth();
    const [missing, setMissing] = useState<{ teamName: string, missingDates: string[], count: number }[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchMissing = async () => {
            if (!user) return;
            setLoading(true);
            
            let teamIdToFilter: string | null = null;
            if (user.role === Role.TeamLeader || user.role === Role.Assistant) {
                teamIdToFilter = user.teamId;
            }

            const data = await api.getMissingEntries(teamIdToFilter);
            setMissing(data);
            setLoading(false);
        };
        fetchMissing();
    }, [user]);
    
    if (loading) {
        return (
            <Card title="Missing Entries (Current Month)">
                <p>Loading missing entry data...</p>
            </Card>
        )
    }

    if (missing.length === 0) {
        return (
            <Card title="Missing Entries (Current Month)">
                <p className="text-green-500">All teams have submitted their daily entries for this month. Great job!</p>
            </Card>
        );
    }
    
    return (
         <Card title="Missing Entries (Current Month)">
            <ul className="space-y-4">
                {missing.map(item => (
                    <li key={item.teamName} className="p-3 bg-yellow-100 dark:bg-yellow-900/50 rounded-lg">
                        <p className="font-semibold text-yellow-800 dark:text-yellow-300">
                            Team {item.teamName}
                            <span className="ml-2 text-sm font-normal">({item.count} day{item.count > 1 ? 's' : ''} missing)</span>
                        </p>
                        <div className="flex flex-wrap gap-1 mt-2">
                            {item.missingDates.map(date => (
                                <span key={date} className="text-xs bg-yellow-200 dark:bg-yellow-700 text-yellow-800 dark:text-yellow-200 px-2 py-1 rounded-full">
                                    {date}
                                </span>
                            ))}
                        </div>
                    </li>
                ))}
            </ul>
        </Card>
    )
}

const TeamLeaderDashboard: React.FC = () => {
    const { user } = useAuth();
    const [teamKpiData, setTeamKpiData] = useState<CalculatedKpi[]>([]);
    const [team, setTeam] = useState<Team | null>(null);
    const [teamRank, setTeamRank] = useState<{ rank: number; totalTeams: number } | null>(null);
    const [loading, setLoading] = useState(true);

    const [selectedYears, setSelectedYears] = useState<string[]>([]);
    const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
    const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
    const [selectedTasks, setSelectedTasks] = useState<string[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            if (!user || !user.teamId) return;
            setLoading(true);
            try {
                const [kpiResult, teamResult] = await Promise.all([
                    api.getKpis({ teamId: user.teamId }),
                    api.getTeamById(user.teamId),
                ]);
                 setTeamKpiData(kpiResult);
                 setTeam(teamResult || null);
            } catch (error) {
                console.error("Failed to fetch team leader dashboard data:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [user]);
    
    useEffect(() => {
        if (user?.teamId) {
             const years = selectedYears.length > 0 ? selectedYears : [new Date().getFullYear().toString()];
             const months = selectedMonths.length > 0 ? selectedMonths : [(new Date().getMonth() + 1).toString()];
             api.getTeamRank(user.teamId, years, months).then(setTeamRank);
        }
    }, [user, selectedYears, selectedMonths, teamKpiData]);

    const availableYears = useMemo(() => Array.from(new Set(teamKpiData.map(kpi => new Date(kpi.Date).getFullYear().toString()))).sort((a, b) => b.localeCompare(a)).map(y => ({value: y, label: y})), [teamKpiData]);
    const monthOptions = useMemo(() => Array.from({ length: 12 }, (_, i) => ({ value: (i + 1).toString(), label: new Date(0, i).toLocaleString('default', { month: 'long' }) })), []);
    const agentOptions = useMemo(() => team?.agents.map(a => ({ value: a.id, label: a.fullName })) || [], [team]);
    const taskOptions = useMemo(() => Array.from(new Set(teamKpiData.map(k => k.Task))).map(t => ({ value: t, label: t })), [teamKpiData]);
    
    const filteredKpiData = useMemo(() => {
        let data = teamKpiData;
        
        const useDefaultDateFilter = selectedYears.length === 0 && selectedMonths.length === 0;
        const yearsToFilter = useDefaultDateFilter ? [new Date().getFullYear().toString()] : selectedYears;
        const monthsToFilter = useDefaultDateFilter ? [(new Date().getMonth() + 1).toString()] : selectedMonths;
        
        if (yearsToFilter.length > 0) {
            data = data.filter(kpi => yearsToFilter.includes(new Date(kpi.Date).getFullYear().toString()));
        }
        if (monthsToFilter.length > 0) {
            data = data.filter(kpi => monthsToFilter.includes((new Date(kpi.Date).getMonth() + 1).toString()));
        }

        if (selectedAgents.length > 0) {
            data = data.filter(kpi => selectedAgents.includes(kpi.userId));
        }
        if (selectedTasks.length > 0) {
            data = data.filter(kpi => selectedTasks.includes(kpi.Task));
        }
        return data;
    }, [teamKpiData, selectedYears, selectedMonths, selectedAgents, selectedTasks]);

    const teamMembers = team?.agents.length ?? 0;
    const teamPerformance = filteredKpiData.length > 0 ? (filteredKpiData.reduce((sum, kpi) => sum + kpi['Overall %'], 0) / filteredKpiData.length).toFixed(2) : 0;
    const todaysTeamEntries = teamKpiData.filter(kpi => kpi.Date === new Date().toISOString().split('T')[0]).length;
    
    const agentPerformanceData = useMemo(() => {
        const performanceData: Record<string, { total: number; count: number }> = {};
        for (const kpi of filteredKpiData) {
            if (!performanceData[kpi.userId]) {
                performanceData[kpi.userId] = { total: 0, count: 0 };
            }
            performanceData[kpi.userId].total += kpi['Overall %'];
            performanceData[kpi.userId].count++;
        }

        return team?.agents.map(agent => {
            const data = performanceData[agent.id];
            return {
                name: agent.fullName,
                'Overall %': data && data.count > 0 ? parseFloat((data.total / data.count).toFixed(2)) : 0,
            };
        }) || [];
    }, [filteredKpiData, team]);

    const performanceTrendData = useMemo(() => {
        const dailyAverages: Record<string, { total: number; count: number }> = {};
        filteredKpiData.forEach(kpi => {
            const day = new Date(kpi.Date).getDate().toString();
            if (!dailyAverages[day]) { dailyAverages[day] = { total: 0, count: 0 }; }
            dailyAverages[day].total += kpi['Overall %'];
            dailyAverages[day].count++;
        });
        return Object.entries(dailyAverages).map(([day, data]) => ({ day, 'Performance': parseFloat((data.total / data.count).toFixed(2)) })).sort((a, b) => parseInt(a.day) - parseInt(b.day));
    }, [filteredKpiData]);

     const handleClearFilters = () => {
        setSelectedYears([]);
        setSelectedMonths([]);
        setSelectedAgents([]);
        setSelectedTasks([]);
    };

    if (loading) return <div className="flex items-center justify-center h-64"><div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-primary-500"></div></div>;

     return (
        <div className="space-y-6">
             <Card title="Filters" className="relative z-20">
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    <MultiSelectDropdown label="Year" options={availableYears} selectedValues={selectedYears} onChange={setSelectedYears} placeholder="Select Year" />
                    <MultiSelectDropdown label="Month" options={monthOptions} selectedValues={selectedMonths} onChange={setSelectedMonths} placeholder="Select Month" />
                    <MultiSelectDropdown label="Agents" options={agentOptions} selectedValues={selectedAgents} onChange={setSelectedAgents} placeholder="Select Agents" />
                    <MultiSelectDropdown label="Tasks" options={taskOptions} selectedValues={selectedTasks} onChange={setSelectedTasks} placeholder="Select Tasks" />
                    <div className="flex items-end"><Button variant="secondary" onClick={handleClearFilters} className="w-full">Reset</Button></div>
                </div>
            </Card>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Link to={`/teams/${user?.teamId}`} className="block"><Card className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors h-full"><h4 className="text-gray-500 dark:text-gray-400">Team Members</h4><p className="text-3xl font-bold">{teamMembers}</p></Card></Link>
                <Card><h4 className="text-gray-500 dark:text-gray-400">Team Rank</h4><p className="text-3xl font-bold text-blue-500">{teamRank ? `${teamRank.rank} of ${teamRank.totalTeams}` : 'N/A'}</p></Card>
                <Card><h4 className="text-gray-500 dark:text-gray-400">Team Performance</h4><p className="text-3xl font-bold text-green-500">{teamPerformance}%</p></Card>
                <Card><h4 className="text-gray-500 dark:text-gray-400">Today's Team Entries</h4><p className="text-3xl font-bold">{todaysTeamEntries}</p></Card>
            </div>
             <Card title="Team Performance Trend (Daily Average)"><div className="h-96"><ResponsiveContainer width="100%" height="100%"><LineChart data={performanceTrendData}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(156, 163, 175, 0.3)" /><XAxis dataKey="day" tick={{ fill: 'currentColor', fontSize: 12 }} /><YAxis tick={{ fill: 'currentColor', fontSize: 12 }} domain={['dataMin - 5', 'dataMax + 5']}/><Tooltip contentStyle={{ backgroundColor: 'rgba(31, 41, 55, 0.8)', borderColor: 'rgba(156, 163, 175, 0.3)', color: '#fff' }} /><Legend /><Line type="monotone" dataKey="Performance" stroke="#3b82f6" strokeWidth={2} activeDot={{ r: 8 }} /></LineChart></ResponsiveContainer></div></Card>
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
                <div className="lg:col-span-2"><Card title="Agent Performance (Overall %)"><div className="h-96"><ResponsiveContainer width="100%" height="100%"><BarChart data={agentPerformanceData}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(156, 163, 175, 0.3)" /><XAxis dataKey="name" tick={{ fill: 'currentColor', fontSize: 12 }} /><YAxis tick={{ fill: 'currentColor', fontSize: 12 }} /><Tooltip contentStyle={{ backgroundColor: 'rgba(31, 41, 55, 0.8)', borderColor: 'rgba(156, 163, 175, 0.3)', color: '#fff' }}/><Legend /><Bar dataKey="Overall %" fill="#3b82f6" /></BarChart></ResponsiveContainer></div></Card></div>
                <div><MissingEntriesCard /></div>
            </div>
        </div>
    );
};

const AdminDashboard: React.FC = () => {
    const [allKpiData, setAllKpiData] = useState<CalculatedKpi[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [agents, setAgents] = useState<User[]>([]);
    const [tasks, setTasks] = useState<TaskName[]>([]);
    const [loading, setLoading] = useState(true);

    const [selectedYears, setSelectedYears] = useState<string[]>([]);
    const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
    const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
    const [selectedTasks, setSelectedTasks] = useState<string[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [kpiResult, teamsResult, usersResult, tasksResult] = await Promise.all([api.getKpis({}), api.getTeams(), api.getUsers(), api.getTasks()]);
                setAllKpiData(kpiResult);
                setTeams(teamsResult);
                setAllUsers(usersResult);
                setAgents(usersResult.filter(u => u.role === Role.Agent));
                setTasks(tasksResult.map(t => t.taskName));
            } catch (error) { console.error("Failed to fetch dashboard data:", error); } 
            finally { setLoading(false); }
        };
        fetchData();
    }, []);

    const availableYears = useMemo(() => Array.from(new Set(allKpiData.map(kpi => new Date(kpi.Date).getFullYear().toString()))).sort((a, b) => b.localeCompare(a)).map(y => ({value: y, label: y})), [allKpiData]);
    const monthOptions = useMemo(() => Array.from({ length: 12 }, (_, i) => ({ value: (i + 1).toString(), label: new Date(0, i).toLocaleString('default', { month: 'long' }) })), []);
    const teamOptions = useMemo(() => teams.map(t => ({ value: t.teamName, label: t.teamName })), [teams]);
    const taskOptions = useMemo(() => tasks.map(t => ({ value: t, label: t })), [tasks]);

    const filteredKpiData = useMemo(() => {
        let data = allKpiData;

        const useDefaultDateFilter = selectedYears.length === 0 && selectedMonths.length === 0;
        
        const yearsToFilter = useDefaultDateFilter ? [new Date().getFullYear().toString()] : selectedYears;
        const monthsToFilter = useDefaultDateFilter ? [(new Date().getMonth() + 1).toString()] : selectedMonths;
        
        if (yearsToFilter.length > 0) {
            data = data.filter(kpi => yearsToFilter.includes(new Date(kpi.Date).getFullYear().toString()));
        }
        if (monthsToFilter.length > 0) {
            data = data.filter(kpi => monthsToFilter.includes((new Date(kpi.Date).getMonth() + 1).toString()));
        }
        
        if (selectedTeams.length > 0) {
            data = data.filter(kpi => selectedTeams.includes(kpi.Team));
        }
        if (selectedTasks.length > 0) {
            data = data.filter(kpi => selectedTasks.includes(kpi.Task));
        }

        return data;
    }, [allKpiData, selectedYears, selectedMonths, selectedTeams, selectedTasks]);
    
    const totalTeams = teams.length;
    const totalAgents = agents.length;
    const totalTeamLeaders = useMemo(() => allUsers.filter(u => u.role === Role.TeamLeader).length, [allUsers]);
    const totalAssistants = useMemo(() => allUsers.filter(u => u.role === Role.Assistant).length, [allUsers]);
    const totalStaff = useMemo(() => allUsers.filter(u => [Role.Agent, Role.TeamLeader, Role.Assistant].includes(u.role)).length, [allUsers]);

    const overallPerformance = filteredKpiData.length > 0 ? (filteredKpiData.reduce((sum, kpi) => sum + kpi['Overall %'], 0) / filteredKpiData.length).toFixed(2) : 0;
    const todaysEntries = allKpiData.filter(kpi => kpi.Date === new Date().toISOString().split('T')[0]).length;
    
    const teamChartData = useMemo(() => {
        const performanceData: Record<string, { total: number; count: number }> = {};
        for (const kpi of filteredKpiData) {
            if (!performanceData[kpi.Team]) {
                performanceData[kpi.Team] = { total: 0, count: 0 };
            }
            performanceData[kpi.Team].total += kpi['Overall %'];
            performanceData[kpi.Team].count++;
        }
    
        return teams.map(team => {
            const data = performanceData[team.teamName];
            return {
                name: team.teamName,
                'Overall %': data && data.count > 0 ? parseFloat((data.total / data.count).toFixed(2)) : 0,
            };
        });
    }, [filteredKpiData, teams]);
    
    const performanceTrendData = useMemo(() => {
        const dailyAverages: Record<string, { total: number; count: number }> = {};
        filteredKpiData.forEach(kpi => {
            const day = new Date(kpi.Date).getDate().toString();
            if (!dailyAverages[day]) { dailyAverages[day] = { total: 0, count: 0 }; }
            dailyAverages[day].total += kpi['Overall %'];
            dailyAverages[day].count++;
        });
        return Object.entries(dailyAverages).map(([day, data]) => ({ day, 'Performance': parseFloat((data.total / data.count).toFixed(2)) })).sort((a, b) => parseInt(a.day) - parseInt(b.day));
    }, [filteredKpiData]);

    const handleClearFilters = () => {
        setSelectedYears([]);
        setSelectedMonths([]);
        setSelectedTeams([]);
        setSelectedTasks([]);
    };

    if (loading) return <div className="flex items-center justify-center h-64"><div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-primary-500"></div></div>;

    return (
        <div className="space-y-6">
            <Card title="Filters" className="relative z-20">
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    <MultiSelectDropdown label="Year" options={availableYears} selectedValues={selectedYears} onChange={setSelectedYears} placeholder="Select Year" />
                    <MultiSelectDropdown label="Month" options={monthOptions} selectedValues={selectedMonths} onChange={setSelectedMonths} placeholder="Select Month" />
                    <MultiSelectDropdown label="Teams" options={teamOptions} selectedValues={selectedTeams} onChange={setSelectedTeams} placeholder="Select Teams"/>
                    <MultiSelectDropdown label="Tasks" options={taskOptions} selectedValues={selectedTasks} onChange={setSelectedTasks} placeholder="Select Tasks"/>
                    <div className="flex items-end"><Button variant="secondary" onClick={handleClearFilters} className="w-full">Reset</Button></div>
                </div>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                 <Link to="/teams" className="block"><Card className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors h-full"><h4 className="text-gray-500 dark:text-gray-400">Total Teams</h4><p className="text-3xl font-bold">{totalTeams}</p></Card></Link>
                 <Link to="/reports" className="block"><Card className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors h-full"><h4 className="text-gray-500 dark:text-gray-400">Total Agents</h4><p className="text-3xl font-bold">{totalAgents}</p></Card></Link>
                 <Card><h4 className="text-gray-500 dark:text-gray-400">Team Leaders</h4><p className="text-3xl font-bold">{totalTeamLeaders}</p></Card>
                 <Card><h4 className="text-gray-500 dark:text-gray-400">Assistants</h4><p className="text-3xl font-bold">{totalAssistants}</p></Card>
                 <Card><h4 className="text-gray-500 dark:text-gray-400">Total Staff</h4><p className="text-3xl font-bold">{totalStaff}</p></Card>
                 <Card><h4 className="text-gray-500 dark:text-gray-400">Filtered Performance</h4><p className="text-3xl font-bold text-green-500">{overallPerformance}%</p></Card>
                 <Card><h4 className="text-gray-500 dark:text-gray-400">Today's Entries</h4><p className="text-3xl font-bold">{todaysEntries}</p></Card>
            </div>
            
            <Card title="Performance Trend (Daily Average)"><div className="h-96"><ResponsiveContainer width="100%" height="100%"><LineChart data={performanceTrendData}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(156, 163, 175, 0.3)" /><XAxis dataKey="day" tick={{ fill: 'currentColor', fontSize: 12 }} /><YAxis tick={{ fill: 'currentColor', fontSize: 12 }} domain={['dataMin - 5', 'dataMax + 5']}/><Tooltip contentStyle={{ backgroundColor: 'rgba(31, 41, 55, 0.8)', borderColor: 'rgba(156, 163, 175, 0.3)', color: '#fff' }} cursor={{ stroke: '#3b82f6', strokeWidth: 1 }} /><Legend /><Line type="monotone" dataKey="Performance" stroke="#3b82f6" strokeWidth={2} activeDot={{ r: 8 }} /></LineChart></ResponsiveContainer></div></Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
                <div className="lg:col-span-2"><Card title="Team Performance (Overall %)"><div className="h-96"><ResponsiveContainer width="100%" height="100%"><BarChart data={teamChartData}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(156, 163, 175, 0.3)" /><XAxis dataKey="name" tick={{ fill: 'currentColor', fontSize: 12 }} /><YAxis tick={{ fill: 'currentColor', fontSize: 12 }} /><Tooltip contentStyle={{ backgroundColor: 'rgba(31, 41, 55, 0.8)', borderColor: 'rgba(156, 163, 175, 0.3)', color: '#fff' }} cursor={{ fill: 'rgba(156, 163, 175, 0.1)' }}/><Legend /><Bar dataKey="Overall %" fill="#3b82f6" /></BarChart></ResponsiveContainer></div></Card></div>
                <div><MissingEntriesCard /></div>
            </div>
        </div>
    )
}

const AgentDashboard: React.FC = () => {
    const { user } = useAuth();
    const [kpis, setKpis] = useState<CalculatedKpi[]>([]); 
    const [taskSummary, setTaskSummary] = useState<AgentTaskSummary[]>([]);
    const [loading, setLoading] = useState(true);
    
    const [selectedYears, setSelectedYears] = useState<string[]>([]);
    const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
    const [selectedTasks, setSelectedTasks] = useState<string[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            if (!user) return;
            setLoading(true);
            try {
                // Fetch all KPIs once to populate filters
                const allKpiData = await api.getKpis({ userId: user.id });
                setKpis(allKpiData);
            } catch (error) {
                console.error("Failed to fetch agent dashboard KPIs", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [user]);

    useEffect(() => {
        const fetchSummary = async () => {
            if (!user) return;
            setLoading(true);
            try {
                 const useDefaultDateFilter = selectedYears.length === 0 && selectedMonths.length === 0;
                 const years = useDefaultDateFilter ? [new Date().getFullYear().toString()] : selectedYears;
                 const months = useDefaultDateFilter ? [(new Date().getMonth() + 1).toString()] : selectedMonths;
                const summaryData = await api.getAgentPerformanceSummary(user.id, years, months);
                setTaskSummary(summaryData);
            } catch (error) {
                 console.error("Failed to fetch agent summary data", error);
            } finally {
                setLoading(false);
            }
        }
        fetchSummary();
    }, [user, selectedYears, selectedMonths]);

    const availableYears = useMemo(() => { if (kpis.length === 0) return [{value: new Date().getFullYear().toString(), label: new Date().getFullYear().toString()}]; return Array.from(new Set(kpis.map(kpi => new Date(kpi.Date).getFullYear().toString()))).sort((a, b) => b.localeCompare(a)).map(y => ({value: y, label: y})); }, [kpis]);
    const monthOptions = useMemo(() => Array.from({ length: 12 }, (_, i) => ({ value: (i + 1).toString(), label: new Date(0, i).toLocaleString('default', { month: 'long' }) })), []);
    const taskOptions = useMemo(() => Array.from(new Set(kpis.map(k => k.Task))).map(t => ({ value: t, label: t })), [kpis]);

    const filteredKpiData = useMemo(() => {
        let data = kpis;
        const useDefaultDateFilter = selectedYears.length === 0 && selectedMonths.length === 0;
        const yearsToFilter = useDefaultDateFilter ? [new Date().getFullYear().toString()] : selectedYears;
        const monthsToFilter = useDefaultDateFilter ? [(new Date().getMonth() + 1).toString()] : selectedMonths;

        if (yearsToFilter.length > 0) {
            data = data.filter(kpi => yearsToFilter.includes(new Date(kpi.Date).getFullYear().toString()));
        }
        if (monthsToFilter.length > 0) {
            data = data.filter(kpi => monthsToFilter.includes((new Date(kpi.Date).getMonth() + 1).toString()));
        }

        if (selectedTasks.length > 0) {
            data = data.filter(kpi => selectedTasks.includes(kpi.Task));
        }

        return data;
    }, [kpis, selectedYears, selectedMonths, selectedTasks]);
    
    const filteredTaskSummary = useMemo(() => {
        if (selectedTasks.length === 0) return taskSummary;
        return taskSummary.filter(summary => selectedTasks.includes(summary.name));
    }, [taskSummary, selectedTasks]);

    const performanceTrendData = useMemo(() => {
        const dailyAverages: Record<string, { total: number; count: number }> = {};
        filteredKpiData.forEach(kpi => {
            const day = new Date(kpi.Date).getDate().toString();
            if (!dailyAverages[day]) { dailyAverages[day] = { total: 0, count: 0 }; }
            dailyAverages[day].total += kpi['Overall %'];
            dailyAverages[day].count++;
        });
        return Object.entries(dailyAverages).map(([day, data]) => ({ day, 'Performance': parseFloat((data.total / data.count).toFixed(2)), })).sort((a, b) => parseInt(a.day) - parseInt(b.day));
    }, [filteredKpiData]);

    const handleClearFilters = () => {
        setSelectedYears([]);
        setSelectedMonths([]);
        setSelectedTasks([]);
    };

    if (loading && kpis.length === 0) return <div className="flex items-center justify-center h-64"><div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-primary-500"></div></div>;

    const totalEntries = filteredKpiData.length;
    const lastEntryDate = totalEntries > 0 ? filteredKpiData.reduce((latest, entry) => new Date(entry.Date) > new Date(latest.Date) ? entry : latest).Date : 'N/A';
    const overallAverage = totalEntries > 0 ? parseFloat((filteredKpiData.reduce((sum, kpi) => sum + kpi['Overall %'], 0) / totalEntries).toFixed(2)) : 0;
    
    return (
        <>
            <Card title="Filters" className="relative z-20">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                     <MultiSelectDropdown label="Year" options={availableYears} selectedValues={selectedYears} onChange={setSelectedYears} placeholder="Select Year"/>
                    <MultiSelectDropdown label="Month" options={monthOptions} selectedValues={selectedMonths} onChange={setSelectedMonths} placeholder="Select Month" />
                    <MultiSelectDropdown label="Tasks" options={taskOptions} selectedValues={selectedTasks} onChange={setSelectedTasks} placeholder="Select Tasks"/>
                    <div className="flex items-end"><Button variant="secondary" onClick={handleClearFilters} className="w-full">Reset</Button></div>
                </div>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                <Card><h4 className="text-gray-500 dark:text-gray-400">Total Entries (Filtered)</h4><p className="text-3xl font-bold">{totalEntries}</p></Card>
                <Card><h4 className="text-gray-500 dark:text-gray-400">Last Entry in Period</h4><p className="text-3xl font-bold">{lastEntryDate}</p></Card>
                <Card><h4 className="text-gray-500 dark:text-gray-400">Your Performance (Filtered)</h4><p className="text-3xl font-bold text-primary-500">{overallAverage}%</p></Card>
            </div>
            
             <Card title="Performance Trend (Daily Average)" className="mt-6"><div className="h-96"><ResponsiveContainer width="100%" height="100%"><LineChart data={performanceTrendData}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(156, 163, 175, 0.3)" /><XAxis dataKey="day" tick={{ fill: 'currentColor', fontSize: 12 }} /><YAxis tick={{ fill: 'currentColor', fontSize: 12 }} domain={['dataMin - 5', 'dataMax + 5']}/><Tooltip contentStyle={{ backgroundColor: 'rgba(31, 41, 55, 0.8)', borderColor: 'rgba(156, 163, 175, 0.3)', color: '#fff' }} cursor={{ stroke: '#3b82f6', strokeWidth: 1 }}/><Legend /><Line type="monotone" dataKey="Performance" stroke="#3b82f6" strokeWidth={2} activeDot={{ r: 8 }} /></LineChart></ResponsiveContainer></div></Card>

             <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                <Card title="Performance by Task"><div className="h-80"><ResponsiveContainer width="100%" height="100%"><BarChart data={filteredTaskSummary} layout="vertical"><CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(156, 163, 175, 0.3)" /><XAxis type="number" tick={{ fill: 'currentColor', fontSize: 12 }} /><YAxis type="category" dataKey="name" width={80} tick={{ fill: 'currentColor', fontSize: 12 }} /><Tooltip contentStyle={{ backgroundColor: 'rgba(31, 41, 55, 0.8)', borderColor: 'rgba(156, 163, 175, 0.3)', color: '#fff' }} cursor={{ fill: 'rgba(156, 163, 175, 0.1)' }}/><Bar dataKey="Average Overall %" fill="#3b82f6" /></BarChart></ResponsiveContainer></div></Card>
                <Card title="Task Summary"><div className="overflow-x-auto"><table className="w-full text-sm text-left text-gray-500 dark:text-gray-400"><thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400"><tr><th scope="col" className="px-6 py-3">Task Name</th><th scope="col" className="px-6 py-3">Entries</th><th scope="col" className="px-6 py-3">Avg. Overall %</th><th scope="col" className="px-6 py-3">Team Rank</th><th scope="col" className="px-6 py-3">OPS Rank</th></tr></thead><tbody>{filteredTaskSummary.map(task => (<tr key={task.name} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700"><td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">{task.name}</td><td className="px-6 py-4">{task.count}</td><td className="px-6 py-4 font-bold text-primary-600 dark:text-primary-400">{task['Average Overall %']}%</td><td className="px-6 py-4 font-semibold">{task.teamRank}</td><td className="px-6 py-4 font-semibold">{task.companyRank}</td></tr>))}</tbody></table></div></Card>
             </div>
        </>
    )
}

const DashboardPage: React.FC = () => {
    const { user } = useAuth();
    
    if (!user) {
        return <div className="flex items-center justify-center h-full"><p>Loading user data...</p></div>
    }

    const renderDashboard = () => {
        switch(user.role) {
            case Role.Agent:
                return <AgentDashboard />;
            case Role.TeamLeader:
            case Role.Assistant:
                return <TeamLeaderDashboard />;
            case Role.Owner:
            case Role.Supervisor:
                return <AdminDashboard />;
            default:
                return <p>No dashboard available for your role.</p>;
        }
    }

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Welcome, {user.fullName}!</h1>
            {renderDashboard()}
        </div>
    );
};

export default DashboardPage;
