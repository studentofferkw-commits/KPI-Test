// FIX: Provided full content for services/api.ts to make it a valid module.

import { 
    User, 
    Role, 
    Team, 
    Task, 
    KpiEntry, 
    CalculatedKpi, 
    ActivityLog, 
    AuditLog, 
    TaskName,
    AgentTaskSummary,
    KpiFactor
} from '../types';
import { calculateKpiPercentages } from './kpiCalculations';
import { DEFAULT_TASKS } from '../constants';

// --- Mock Data ---
const initialUsers: User[] = [
    { id: '1', fullName: 'Owner User', email: 'owner@demo.com', password: '123456', role: Role.Owner, teamId: null },
    { id: '2', fullName: 'Supervisor User', email: 'supervisor@demo.com', password: '123456', role: Role.Supervisor, teamId: null },
    { id: '3', fullName: 'Team Leader User', email: 'leader@demo.com', password: '123456', role: Role.TeamLeader, teamId: 't1' },
    { id: '4', fullName: 'Assistant User', email: 'assistant@demo.com', password: '123456', role: Role.Assistant, teamId: 't1' },
    { id: '5', fullName: 'Agent One', email: 'agent1@demo.com', password: '123456', role: Role.Agent, teamId: 't1' },
    { id: '6', fullName: 'Agent Two', email: 'agent2@demo.com', password: '123456', role: Role.Agent, teamId: 't1' },
    { id: '7', fullName: 'Agent Three', email: 'agent3@demo.com', password: '123456', role: Role.Agent, teamId: 't2' },
];

const initialTeams: Team[] = [
    { id: 't1', teamName: 'Alpha Team', leaderId: '3', assistantId: '4', agents: [] },
    { id: 't2', teamName: 'Bravo Team', leaderId: null, assistantId: null, agents: [] },
];

const initialTasks: Task[] = DEFAULT_TASKS.map((taskName, index) => ({ id: `task-${index + 1}`, taskName }));

const initialKpiFactors: KpiFactor[] = [
    { key: 'Attendance %', calculationSource: 'Attendance %', displayName: 'Attendance', weight: 5, isEditable: true, description: 'Contribution from daily attendance score (0-5).', isDeletable: true, isCustom: false, formula: 'Score (0-5) maps to 0-100%, multiplied by Weight.' },
    { key: 'login %', calculationSource: 'login %', displayName: 'Login', weight: 10, isEditable: true, description: 'Contribution from login time based on duty hours.', isDeletable: true, isCustom: false, formula: 'Login time maps to 0-100% based on duty hours, multiplied by Weight.' },
    { key: 'On Queue %', calculationSource: 'On Queue %', displayName: 'On Queue', weight: 15, isEditable: true, description: 'For Call Center tasks. Contribution from time spent on queue.', isDeletable: true, isCustom: false, formula: 'Queue time maps to 0-100% based on duty hours, multiplied by Weight.' },
    { key: 'Target %', calculationSource: 'Target %', displayName: 'Target', weight: 15, isEditable: true, description: 'For Dispatch tasks. Contribution from meeting targets.', isDeletable: true, isCustom: false, formula: '(Achieved / Baseline Target) * 100 * Weight.' },
    { key: 'Avg Talk %', calculationSource: 'Avg Talk %', displayName: 'Avg Talk', weight: 5, isEditable: true, description: 'For Call Center tasks. Penalty/reward based on average talk time.', isDeletable: true, isCustom: false, formula: 'Starts at max score, penalty applied for time over 90s.' },
    { key: 'ASA %', calculationSource: 'ASA %', displayName: 'ASA', weight: 5, isEditable: true, description: 'For Call Center tasks. Penalty/reward based on Average Speed of Answer.', isDeletable: true, isCustom: false, formula: 'Starts at max score, penalty applied for ASA over 5s.' },
    { key: 'DS Productivity %', calculationSource: 'DS Productivity %', displayName: 'DS Productivity', weight: 10, isEditable: true, description: 'For Dispatch tasks. Penalty for productivity issues.', isDeletable: true, isCustom: false, formula: 'Max score minus penalty points.' },
    { key: 'AMS Productivity %', calculationSource: 'AMS Productivity %', displayName: 'AMS Productivity', weight: 25, isEditable: true, description: 'For AMS & Social Media tasks. Penalty for productivity issues.', isDeletable: true, isCustom: false, formula: 'Max score minus penalty points.' },
    { key: 'Productivity %', calculationSource: 'Productivity %', displayName: 'Productivity', weight: 25, isEditable: true, description: 'For other tasks. Contribution from productivity score.', isDeletable: true, isCustom: false, formula: '(Productivity / 100) * (Weight * 100).' },
    { key: 'Mistakes %', calculationSource: 'Mistakes %', displayName: 'Mistakes', weight: 15, isEditable: true, description: 'Penalty based on number of mistakes.', isDeletable: true, isCustom: false, formula: 'Max score minus penalty points.' },
    { key: 'Bonus %', calculationSource: 'Bonus %', displayName: 'Bonus', weight: 0, isEditable: true, description: 'Bonus points are added directly to the overall score. Weight is not applicable.', isDeletable: true, isCustom: false, formula: 'Direct value added to final score.' },
    { key: 'QA %', calculationSource: 'QA %', displayName: 'QA %', weight: 35, isEditable: true, description: 'Score from Quality Assurance. This value is the maximum possible score.', isDeletable: true, isCustom: false, formula: 'Direct value added to final score.' },
    { key: 'PK %', calculationSource: 'PK %', displayName: 'PK %', weight: 10, isEditable: true, description: 'Score from Product Knowledge test. This value is the maximum possible score.', isDeletable: true, isCustom: false, formula: 'Direct value added to final score.' },
];

// Helper to get a value from localStorage
const getFromStorage = <T>(key: string, defaultValue: T): T => {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
        console.error(`Error reading from localStorage key “${key}”:`, error);
        return defaultValue;
    }
};

// Helper to set a value in localStorage
const setInStorage = <T>(key: string, value: T): void => {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
        console.error(`Error writing to localStorage key “${key}”:`, error);
    }
};


class ApiService {
    private users: User[];
    private teams: Team[];
    private tasks: Task[];
    private kpis: KpiEntry[];
    private activityLogs: ActivityLog[];
    private auditLogs: AuditLog[];
    private kpiFactors: KpiFactor[];

    constructor() {
        this.users = getFromStorage<User[]>('users', initialUsers);
        this.teams = getFromStorage<Team[]>('teams', initialTeams);
        this.tasks = getFromStorage<Task[]>('tasks', initialTasks);
        this.kpis = getFromStorage<KpiEntry[]>('kpis', []);
        this.activityLogs = getFromStorage<ActivityLog[]>('activityLogs', []);
        this.auditLogs = getFromStorage<AuditLog[]>('auditLogs', []);
        this.kpiFactors = getFromStorage<KpiFactor[]>('kpiFactors', initialKpiFactors);
        
        if (localStorage.getItem('seeded') !== 'true') {
            this.seedData();
            localStorage.setItem('seeded', 'true');
        }
        
        this.populateTeamsWithAgents();
    }
    
    private async seedData() {
        // Create some random KPI data for the last 30 days for agents
        const agents = this.users.filter(u => u.role === Role.Agent);
        const kpis: KpiEntry[] = [];
        const today = new Date();
        const factors = await this.getKpiFactors();
        const qaFactor = factors.find(f => f.calculationSource === 'QA %') ?? { weight: 35 };
        const pkFactor = factors.find(f => f.calculationSource === 'PK %') ?? { weight: 10 };

        for (let i = 0; i < 30; i++) {
            for (const agent of agents) {
                 const date = new Date(today);
                 date.setDate(today.getDate() - i);
                 const dateString = date.toISOString().split('T')[0];
                 const day = date.toLocaleDateString('en-US', { weekday: 'long' });

                 const team = this.teams.find(t => t.id === agent.teamId);

                 kpis.push({
                     id: crypto.randomUUID(),
                     userId: agent.id,
                     'Agent name': agent.fullName,
                     Team: team?.teamName || 'Unknown',
                     Date: dateString,
                     Day: day,
                     Task: TaskName.CQ,
                     'Duty Hours': 8,
                     Attendance: 5,
                     login: '08:00:00',
                     'On Queue': '07:30:00',
                     'Avg Talk': `00:0${Math.floor(Math.random()*5)}:${Math.floor(Math.random()*60)}`,
                     ASA: Math.floor(Math.random() * 10),
                     Mistakes: Math.floor(Math.random() * 5),
                     Bonus: Math.floor(Math.random() * 3),
                     'QA %': Math.floor(Math.random() * (qaFactor.weight - (qaFactor.weight * 0.8) + 1) + (qaFactor.weight * 0.8)),
                     'PK %': Math.floor(Math.random() * (pkFactor.weight - (pkFactor.weight * 0.5) + 1) + (pkFactor.weight * 0.5)),
                     Remarks: 'Seeded data',
                 });
            }
        }
        this.kpis = kpis;
        this.saveData();
    }

    private populateTeamsWithAgents() {
        this.teams.forEach(team => {
            team.agents = this.users.filter(user => user.teamId === team.id);
        });
    }

    private saveData() {
        setInStorage('users', this.users);
        setInStorage('teams', this.teams);
        setInStorage('tasks', this.tasks);
        setInStorage('kpis', this.kpis);
        setInStorage('activityLogs', this.activityLogs);
        setInStorage('auditLogs', this.auditLogs);
        setInStorage('kpiFactors', this.kpiFactors);
    }

    private getCurrentUser(): User | null {
        const storedUser = localStorage.getItem('user');
        return storedUser ? JSON.parse(storedUser) : null;
    }

    // --- Auth ---
    async login(email: string, pass: string): Promise<User> {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                const user = this.users.find(u => u.email === email && u.password === pass);
                if (user) {
                    this.logActivity({ action: 'LOGIN', affectedTable: 'users', recordId: user.id, details: 'User logged in' });
                    resolve(user);
                } else {
                    reject(new Error('Invalid email or password'));
                }
            }, 500);
        });
    }

    // --- Logging ---
    async logActivity(logData: Omit<ActivityLog, 'id' | 'timestamp' | 'userId' | 'userFullName'>): Promise<void> {
        const user = this.getCurrentUser();
        if (!user) return; // Don't log if no user is signed in
        const log: ActivityLog = {
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            userId: user.id,
            userFullName: user.fullName,
            ...logData,
        };
        this.activityLogs.unshift(log);
        this.saveData();
    }
    
    private logAudit(kpiBefore: KpiEntry | undefined, kpiAfter: KpiEntry) {
         const user = this.getCurrentUser();
         if (!user || user.role === Role.Agent) return; // Only log for non-agents
         
         const agent = this.users.find(u => u.id === kpiAfter.userId);
         if (!agent) return;

         const action = kpiBefore ? 'UPDATE' : 'CREATE';
         const changes: AuditLog['changes'] = [];

         for (const key in kpiAfter) {
             const field = key as keyof KpiEntry;
             const oldValue = kpiBefore?.[field];
             const newValue = kpiAfter[field];
             if (String(oldValue) !== String(newValue)) {
                 // FIX: Use `key` (which is a string) for the 'field' property to match the AuditLog type.
                 changes.push({ field: key, oldValue: oldValue ?? 'N/A', newValue: newValue ?? 'N/A' });
             }
         }
         
         if (changes.length === 0) return;

         const auditLog: AuditLog = {
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            userId: user.id,
            userFullName: user.fullName,
            action,
            agentName: agent.fullName,
            teamName: kpiAfter.Team,
            kpiDate: kpiAfter.Date,
            changes,
        };
        this.auditLogs.unshift(auditLog);
        this.saveData();
    }

    // --- Users ---
    async getUsers(): Promise<User[]> { return [...this.users]; }
    async createUser(userData: Omit<User, 'id'>): Promise<User> {
        const newUser: User = { id: crypto.randomUUID(), ...userData };
        this.users.push(newUser);
        this.logActivity({ action: 'CREATE_USER', affectedTable: 'users', recordId: newUser.id, details: `Created user ${newUser.fullName}` });
        this.saveData();
        this.populateTeamsWithAgents();
        return newUser;
    }
    async updateUser(userId: string, updates: Partial<User> & { currentPassword?: string }): Promise<User> {
        const userIndex = this.users.findIndex(u => u.id === userId);
        if (userIndex === -1) throw new Error("User not found");

        const userToUpdate = this.users[userIndex];
        
        if (updates.password && updates.currentPassword && userToUpdate.password !== updates.currentPassword) {
            throw new Error("Current password does not match.");
        }
        
        const { currentPassword, ...safeUpdates } = updates;
        
        Object.assign(this.users[userIndex], safeUpdates);
        this.logActivity({ action: 'UPDATE_USER', affectedTable: 'users', recordId: userId, details: `Updated user ${this.users[userIndex].fullName}` });
        this.saveData();
        this.populateTeamsWithAgents();
        return this.users[userIndex];
    }
    async deleteUser(userId: string): Promise<void> {
        const userName = this.users.find(u => u.id === userId)?.fullName;
        this.users = this.users.filter(u => u.id !== userId);
        this.logActivity({ action: 'DELETE_USER', affectedTable: 'users', recordId: userId, details: `Deleted user ${userName}` });
        this.saveData();
        this.populateTeamsWithAgents();
    }
    async createUsersBulk(usersData: Omit<User, 'id'>[]): Promise<void> {
        usersData.forEach(userData => {
            const newUser: User = { id: crypto.randomUUID(), ...userData };
            this.users.push(newUser);
        });
        this.logActivity({ action: 'BULK_CREATE_USERS', affectedTable: 'users', recordId: '', details: `Imported ${usersData.length} users.` });
        this.saveData();
        this.populateTeamsWithAgents();
    }

    async deleteUsersBulk(userIds: string[]): Promise<void> {
        const deletedUsers = this.users.filter(u => userIds.includes(u.id));
        this.users = this.users.filter(u => !userIds.includes(u.id));
        this.logActivity({ action: 'BULK_DELETE_USERS', affectedTable: 'users', recordId: '', details: `Deleted ${deletedUsers.length} users: ${deletedUsers.map(u => u.fullName).join(', ')}` });
        this.saveData();
        this.populateTeamsWithAgents();
    }
    
    // --- Teams ---
    async getTeams(): Promise<Team[]> { return [...this.teams]; }
    async getTeamById(teamId: string): Promise<Team | undefined> { 
        return this.teams.find(t => t.id === teamId);
    }
    async createTeam(teamName: string): Promise<Team> {
        const newTeam: Team = { id: crypto.randomUUID(), teamName, leaderId: null, assistantId: null, agents: [] };
        this.teams.push(newTeam);
        this.logActivity({ action: 'CREATE_TEAM', affectedTable: 'teams', recordId: newTeam.id, details: `Created team ${teamName}` });
        this.saveData();
        return newTeam;
    }
    async renameTeam(teamId: string, newName: string): Promise<Team> {
        const teamIndex = this.teams.findIndex(t => t.id === teamId);
        if (teamIndex === -1) throw new Error("Team not found");
        const oldName = this.teams[teamIndex].teamName;
        this.teams[teamIndex].teamName = newName;
        this.logActivity({ action: 'RENAME_TEAM', affectedTable: 'teams', recordId: teamId, details: `Renamed team from ${oldName} to ${newName}` });
        this.saveData();
        return this.teams[teamIndex];
    }

    // --- Tasks ---
    async getTasks(): Promise<Task[]> { return [...this.tasks]; }
    async createTask(taskName: TaskName): Promise<Task> {
        if(this.tasks.some(t => t.taskName === taskName)) throw new Error("Task already exists");
        const newTask: Task = { id: crypto.randomUUID(), taskName };
        this.tasks.push(newTask);
        this.logActivity({ action: 'CREATE_TASK', affectedTable: 'tasks', recordId: newTask.id, details: `Created task ${taskName}` });
        this.saveData();
        return newTask;
    }
    async updateTask(taskId: string, newName: TaskName): Promise<Task> {
        const taskIndex = this.tasks.findIndex(t => t.id === taskId);
        if (taskIndex === -1) throw new Error("Task not found");
        const oldName = this.tasks[taskIndex].taskName;
        this.tasks[taskIndex].taskName = newName;
        this.logActivity({ action: 'UPDATE_TASK', affectedTable: 'tasks', recordId: taskId, details: `Updated task from ${oldName} to ${newName}` });
        this.saveData();
        return this.tasks[taskIndex];
    }
    async deleteTask(taskId: string): Promise<void> {
        const taskName = this.tasks.find(t => t.id === taskId)?.taskName;
        this.tasks = this.tasks.filter(t => t.id !== taskId);
        this.logActivity({ action: 'DELETE_TASK', affectedTable: 'tasks', recordId: taskId, details: `Deleted task ${taskName}` });
        this.saveData();
    }
    async deleteTasksBulk(taskIds: string[]): Promise<void> {
        const deletedTasks = this.tasks.filter(t => taskIds.includes(t.id));
        this.tasks = this.tasks.filter(t => !taskIds.includes(t.id));
        this.logActivity({ action: 'BULK_DELETE_TASKS', affectedTable: 'tasks', recordId: '', details: `Deleted ${deletedTasks.length} tasks: ${deletedTasks.map(t => t.taskName).join(', ')}` });
        this.saveData();
    }
    
    // --- KPIs ---
    async getKpis(filters: { userId?: string, teamId?: string }): Promise<CalculatedKpi[]> {
        let results = this.kpis;
        if(filters.userId) {
            results = results.filter(k => k.userId === filters.userId);
        }
        if(filters.teamId) {
            const team = this.teams.find(t => t.id === filters.teamId);
            if(team) {
                results = results.filter(k => k.Team === team.teamName);
            } else {
                return [];
            }
        }
        const factors = await this.getKpiFactors();
        return results.map(kpi => calculateKpiPercentages(kpi, factors)).sort((a,b) => new Date(b.Date).getTime() - new Date(a.Date).getTime());
    }
    async getKpiById(id: string): Promise<KpiEntry | undefined> {
        return this.kpis.find(k => k.id === id);
    }
    // FIX: Changed parameter type to Partial<KpiEntry> and added a type assertion to fix type error caused by Omit on an interface with an index signature.
    async createKpi(kpiData: Partial<KpiEntry>): Promise<KpiEntry> {
        const newKpi = { id: crypto.randomUUID(), ...kpiData } as KpiEntry;
        this.kpis.push(newKpi);
        this.logActivity({ action: 'CREATE_KPI', affectedTable: 'kpis', recordId: newKpi.id, details: `Created KPI entry for ${newKpi['Agent name']} on ${newKpi.Date}` });
        this.logAudit(undefined, newKpi);
        this.saveData();
        return newKpi;
    }
    async updateKpi(kpiId: string, updates: Partial<KpiEntry>): Promise<KpiEntry> {
        const kpiIndex = this.kpis.findIndex(k => k.id === kpiId);
        if (kpiIndex === -1) throw new Error("KPI not found");
        
        const kpiBefore = { ...this.kpis[kpiIndex] };
        Object.assign(this.kpis[kpiIndex], updates);
        const kpiAfter = this.kpis[kpiIndex];
        
        this.logActivity({ action: 'UPDATE_KPI', affectedTable: 'kpis', recordId: kpiId, details: `Updated KPI entry for ${kpiAfter['Agent name']} on ${kpiAfter.Date}` });
        this.logAudit(kpiBefore, kpiAfter);

        this.saveData();
        return kpiAfter;
    }

    async deleteKpi(kpiId: string): Promise<void> {
        const kpi = this.kpis.find(k => k.id === kpiId);
        if (kpi) {
            this.kpis = this.kpis.filter(k => k.id !== kpiId);
            this.logActivity({ action: 'DELETE_KPI', affectedTable: 'kpis', recordId: kpiId, details: `Deleted KPI entry for ${kpi['Agent name']} on ${kpi.Date}` });
            this.saveData();
        }
    }

    async deleteKpisBulk(kpiIds: string[]): Promise<void> {
        const count = kpiIds.length;
        this.kpis = this.kpis.filter(k => !kpiIds.includes(k.id));
        this.logActivity({ action: 'BULK_DELETE_KPIS', affectedTable: 'kpis', recordId: '', details: `Deleted ${count} KPI entries.` });
        this.saveData();
    }
    
    // --- KPI Factors ---
    async getKpiFactors(): Promise<KpiFactor[]> {
        return [...this.kpiFactors];
    }
    async updateKpiFactors(factors: KpiFactor[]): Promise<void> {
        this.kpiFactors = factors;
        this.logActivity({ action: 'UPDATE_KPI_FACTORS', affectedTable: 'settings', recordId: '', details: 'Updated KPI calculation factors.' });
        this.saveData();
    }

    // --- Reports & Dashboards ---
    async getMissingEntries(teamId: string | null): Promise<{ teamName: string; missingDates: string[]; count: number }[]> {
        const relevantTeams = teamId ? this.teams.filter(t => t.id === teamId) : this.teams;
        const results: { teamName: string; missingDates: string[]; count: number }[] = [];
        const today = new Date();
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

        for (const team of relevantTeams) {
            const agentsInTeam = team.agents.filter(a => a.role === Role.Agent);
            if (agentsInTeam.length === 0) continue;

            const missingDatesForTeam = new Set<string>();
            for (let d = new Date(firstDayOfMonth); d <= today; d.setDate(d.getDate() + 1)) {
                // Skip weekends
                if (d.getDay() === 0 || d.getDay() === 6) continue;
                
                const dateString = d.toISOString().split('T')[0];
                const entriesOnDate = this.kpis.filter(kpi => kpi.Date === dateString && kpi.Team === team.teamName);
                
                if (entriesOnDate.length < agentsInTeam.length) {
                    missingDatesForTeam.add(d.getDate().toString());
                }
            }
            if (missingDatesForTeam.size > 0) {
                 results.push({
                    teamName: team.teamName,
                    missingDates: Array.from(missingDatesForTeam).sort((a,b) => parseInt(a) - parseInt(b)),
                    count: missingDatesForTeam.size
                });
            }
        }
        return results;
    }
    
    async getTeamRank(teamId: string, years: string[], months: string[]): Promise<{ rank: number, totalTeams: number }> {
        const teamAverages: { teamName: string; avg: number }[] = [];
        const factors = await this.getKpiFactors();
        const allKpis = this.kpis.map(kpi => calculateKpiPercentages(kpi, factors));

        for (const team of this.teams) {
            const teamKpis = allKpis.filter(kpi => {
                const kpiDate = new Date(kpi.Date);
                return kpi.Team === team.teamName &&
                       years.includes(kpiDate.getFullYear().toString()) &&
                       months.includes((kpiDate.getMonth() + 1).toString());
            });
            if (teamKpis.length > 0) {
                const avg = teamKpis.reduce((sum, kpi) => sum + kpi['Overall %'], 0) / teamKpis.length;
                teamAverages.push({ teamName: team.teamName, avg });
            }
        }

        teamAverages.sort((a, b) => b.avg - a.avg);
        const myTeamName = this.teams.find(t => t.id === teamId)?.teamName;
        const rank = teamAverages.findIndex(t => t.teamName === myTeamName) + 1;

        return { rank: rank > 0 ? rank : 0, totalTeams: teamAverages.length };
    }

    async getAgentPerformanceSummary(agentId: string, years: string[], months: string[]): Promise<AgentTaskSummary[]> {
        const factors = await this.getKpiFactors();
        const agentKpis = this.kpis
            .filter(kpi => {
                const kpiDate = new Date(kpi.Date);
                return kpi.userId === agentId &&
                       years.includes(kpiDate.getFullYear().toString()) &&
                       months.includes((kpiDate.getMonth() + 1).toString());
            })
            .map(kpi => calculateKpiPercentages(kpi, factors));
        
        if (agentKpis.length === 0) return [];
        
        const agent = this.users.find(u => u.id === agentId);
        const teamName = this.teams.find(t => t.id === agent?.teamId)?.teamName;

        const summaryByTask: Record<string, { total: number; count: number }> = {};
        for(const kpi of agentKpis) {
            if(!summaryByTask[kpi.Task]) summaryByTask[kpi.Task] = { total: 0, count: 0 };
            summaryByTask[kpi.Task].total += kpi['Overall %'];
            summaryByTask[kpi.Task].count++;
        }
        
        // This is a simplified ranking. A real implementation would be more complex.
        return Object.entries(summaryByTask).map(([task, data]) => ({
            name: task,
            count: data.count,
            'Average Overall %': parseFloat((data.total / data.count).toFixed(2)),
            teamRank: '1 of 5', // Mock
            companyRank: '3 of 20' // Mock
        }));
    }

    // --- Logs ---
    async getActivityLogs(): Promise<ActivityLog[]> { return [...this.activityLogs]; }
    async getAuditLogs(): Promise<AuditLog[]> { return [...this.auditLogs]; }
}

export const api = new ApiService();