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
import { db } from './firebase';
import { collection, getDocs, doc, setDoc, addDoc, updateDoc, deleteDoc, writeBatch, getDoc, query, where } from "firebase/firestore";

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

const initialTeams: Omit<Team, 'agents'>[] = [
    { id: 't1', teamName: 'Alpha Team', leaderId: '3', assistantId: '4' },
    { id: 't2', teamName: 'Bravo Team', leaderId: null, assistantId: null },
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
    private users: User[] = [];
    private teams: Team[] = [];
    private tasks: Task[] = [];
    private kpiFactors: KpiFactor[] = [];
    private activityLogs: ActivityLog[] = [];
    private auditLogs: AuditLog[] = [];

    constructor() {
        this.activityLogs = getFromStorage<ActivityLog[]>('activityLogs', []);
        this.auditLogs = getFromStorage<AuditLog[]>('auditLogs', []);
        this.init();
    }

    private async init() {
        const seeded = localStorage.getItem('seeded_v3');
        if (seeded !== 'true') {
            await this.seedData();
            localStorage.setItem('seeded_v3', 'true');
        }
        await this.populateLocalCache();
    }

    private async populateLocalCache() {
        this.users = await this.getUsers();
        this.teams = await this.getTeams();
        this.tasks = await this.getTasks();
        this.kpiFactors = await this.getKpiFactors();
        this.populateTeamsWithAgents();
    }

    private async seedData() {
        console.log("Seeding data to Firestore...");
        await this.seedUsers();
        await this.seedTeams();
        await this.seedTasks();
        await this.seedKpiFactors();
        await this.seedKpis(); 
        console.log("Seeding complete.");
    }

    private async seedUsers() {
        const usersCol = collection(db, 'users');
        const snapshot = await getDocs(usersCol);
        if (snapshot.empty) {
            console.log("Seeding Users...");
            const batch = writeBatch(db);
            initialUsers.forEach(user => {
                const docRef = doc(db, "users", user.id);
                batch.set(docRef, user);
            });
            await batch.commit();
        }
    }

    private async seedTeams() {
        const teamsCol = collection(db, 'teams');
        const snapshot = await getDocs(teamsCol);
        if (snapshot.empty) {
            console.log("Seeding Teams...");
            const batch = writeBatch(db);
            initialTeams.forEach(team => {
                const docRef = doc(db, "teams", team.id);
                batch.set(docRef, team);
            });
            await batch.commit();
        }
    }

    private async seedTasks() {
        const tasksCol = collection(db, 'tasks');
        const snapshot = await getDocs(tasksCol);
        if (snapshot.empty) {
            console.log("Seeding Tasks...");
            const batch = writeBatch(db);
            initialTasks.forEach(task => {
                const docRef = doc(db, "tasks", task.id);
                batch.set(docRef, task);
            });
            await batch.commit();
        }
    }

    private async seedKpiFactors() {
        const factorsCol = collection(db, 'kpiFactors');
        const snapshot = await getDocs(factorsCol);
        if (snapshot.empty) {
            console.log("Seeding KPI Factors...");
            const batch = writeBatch(db);
            initialKpiFactors.forEach(factor => {
                const docRef = doc(db, "kpiFactors", factor.key);
                batch.set(docRef, factor);
            });
            await batch.commit();
        }
    }

    private async seedKpis() {
        const kpisCol = collection(db, 'kpis');
        const snapshot = await getDocs(kpisCol);
        if (snapshot.empty) {
            console.log("Seeding KPIs...");
            const agents = initialUsers.filter(u => u.role === Role.Agent);
            const kpis: Omit<KpiEntry, 'id'>[] = [];
            const today = new Date();
            const qaFactor = initialKpiFactors.find(f => f.calculationSource === 'QA %') ?? { weight: 35 };
            const pkFactor = initialKpiFactors.find(f => f.calculationSource === 'PK %') ?? { weight: 10 };

            for (let i = 0; i < 30; i++) {
                for (const agent of agents) {
                    const date = new Date(today);
                    date.setDate(today.getDate() - i);
                    const dateString = date.toISOString().split('T')[0];
                    const day = date.toLocaleDateString('en-US', { weekday: 'long' });
                    const team = initialTeams.find(t => t.id === agent.teamId);

                    kpis.push({
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
                        'Avg Talk': `00:0${Math.floor(Math.random() * 5)}:${Math.floor(Math.random() * 60)}`,
                        ASA: Math.floor(Math.random() * 10),
                        Mistakes: Math.floor(Math.random() * 5),
                        Bonus: Math.floor(Math.random() * 3),
                        'QA %': Math.floor(Math.random() * (qaFactor.weight - (qaFactor.weight * 0.8) + 1) + (qaFactor.weight * 0.8)),
                        'PK %': Math.floor(Math.random() * (pkFactor.weight - (pkFactor.weight * 0.5) + 1) + (pkFactor.weight * 0.5)),
                        Remarks: 'Seeded data',
                    });
                }
            }
            const batch = writeBatch(db);
            kpis.forEach(kpi => {
                const docRef = doc(collection(db, "kpis"));
                batch.set(docRef, kpi);
            });
            await batch.commit();
        }
    }

    private populateTeamsWithAgents() {
        if (!this.users.length) return;
        this.teams.forEach(team => {
            team.agents = this.users.filter(user => user.teamId === team.id);
        });
    }

    private saveData() {
        setInStorage('activityLogs', this.activityLogs);
        setInStorage('auditLogs', this.auditLogs);
    }

    private getCurrentUser(): User | null {
        return getFromStorage<User | null>('user', null);
    }

    async login(email: string, pass: string): Promise<User> {
        const user = this.users.find(u => u.email === email && u.password === pass);
        if (user) {
            this.logActivity({ action: 'LOGIN', affectedTable: 'users', recordId: user.id, details: 'User logged in' });
            setInStorage('user', user);
            return user;
        }
        throw new Error('Invalid email or password');
    }

    async logActivity(logData: Omit<ActivityLog, 'id' | 'timestamp' | 'userId' | 'userFullName'>): Promise<void> {
        const user = this.getCurrentUser();
        if (!user) return;
        const log: ActivityLog = { id: crypto.randomUUID(), timestamp: new Date().toISOString(), userId: user.id, userFullName: user.fullName, ...logData };
        this.activityLogs.unshift(log);
        this.saveData();
    }

    private logAudit(kpiBefore: KpiEntry | undefined, kpiAfter: KpiEntry) {
        const user = this.getCurrentUser();
        if (!user || user.role === Role.Agent) return;
        const agent = this.users.find(u => u.id === kpiAfter.userId);
        if (!agent) return;
        const action = kpiBefore ? 'UPDATE' : 'CREATE';
        const changes: AuditLog['changes'] = [];
        for (const key in kpiAfter) {
            const field = key as keyof KpiEntry;
            if (String(kpiBefore?.[field]) !== String(kpiAfter[field])) {
                changes.push({ field: String(field), oldValue: kpiBefore?.[field] ?? 'N/A', newValue: kpiAfter[field] ?? 'N/A' });
            }
        }
        if (changes.length === 0) return;
        const auditLog: AuditLog = { id: crypto.randomUUID(), timestamp: new Date().toISOString(), userId: user.id, userFullName: user.fullName, action, agentName: agent.fullName, teamName: kpiAfter.Team, kpiDate: kpiAfter.Date, changes };
        this.auditLogs.unshift(auditLog);
        this.saveData();
    }

    async getUsers(): Promise<User[]> {
        const usersCol = collection(db, 'users');
        const snapshot = await getDocs(usersCol);
        return snapshot.docs.map(doc => doc.data() as User);
    }

    async createUser(userData: Omit<User, 'id'>): Promise<User> {
        const id = crypto.randomUUID();
        const newUser: User = { id, ...userData };
        await setDoc(doc(db, "users", id), newUser);
        this.logActivity({ action: 'CREATE_USER', affectedTable: 'users', recordId: newUser.id, details: `Created user ${newUser.fullName}` });
        await this.populateLocalCache();
        return newUser;
    }

    async updateUser(userId: string, updates: Partial<User>): Promise<User> {
        const userRef = doc(db, "users", userId);
        await updateDoc(userRef, updates);
        this.logActivity({ action: 'UPDATE_USER', affectedTable: 'users', recordId: userId, details: `Updated user info` });
        await this.populateLocalCache();
        const updatedDoc = await getDoc(userRef);
        return updatedDoc.data() as User;
    }

    async deleteUser(userId: string): Promise<void> {
        await deleteDoc(doc(db, "users", userId));
        this.logActivity({ action: 'DELETE_USER', affectedTable: 'users', recordId: userId, details: `Deleted user` });
        await this.populateLocalCache();
    }

    async createUsersBulk(usersData: Omit<User, 'id'>[]): Promise<void> {
        const batch = writeBatch(db);
        usersData.forEach(userData => {
            const id = crypto.randomUUID();
            const docRef = doc(db, "users", id);
            batch.set(docRef, { id, ...userData });
        });
        await batch.commit();
        this.logActivity({ action: 'BULK_CREATE_USERS', affectedTable: 'users', recordId: '', details: `Imported ${usersData.length} users.` });
        await this.populateLocalCache();
    }

    async deleteUsersBulk(userIds: string[]): Promise<void> {
        const batch = writeBatch(db);
        userIds.forEach(id => {
            const docRef = doc(db, "users", id);
            batch.delete(docRef);
        });
        await batch.commit();
        this.logActivity({ action: 'BULK_DELETE_USERS', affectedTable: 'users', recordId: '', details: `Deleted ${userIds.length} users` });
        await this.populateLocalCache();
    }

    async getTeams(): Promise<Team[]> {
        const teamsCol = collection(db, 'teams');
        const snapshot = await getDocs(teamsCol);
        const teamList = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Team));
        this.teams = teamList;
        this.populateTeamsWithAgents();
        return this.teams;
    }

    async getTeamById(teamId: string): Promise<Team | undefined> {
        const teamRef = doc(db, "teams", teamId);
        const teamSnap = await getDoc(teamRef);
        if (teamSnap.exists()) {
            const team = { ...teamSnap.data(), id: teamSnap.id } as Team;
            team.agents = this.users.filter(u => u.teamId === teamId);
            return team;
        }
        return undefined;
    }

    async createTeam(teamName: string): Promise<Team> {
        const newTeamRef = doc(collection(db, "teams"));
        const newTeam: Omit<Team, 'id' | 'agents'> = { teamName, leaderId: null, assistantId: null };
        await setDoc(newTeamRef, newTeam);
        const newTeamWithId = { ...newTeam, id: newTeamRef.id, agents: [] };
        this.logActivity({ action: 'CREATE_TEAM', affectedTable: 'teams', recordId: newTeamRef.id, details: `Created team ${teamName}` });
        await this.populateLocalCache();
        return newTeamWithId;
    }

    async renameTeam(teamId: string, newName: string): Promise<Team> {
        const teamRef = doc(db, "teams", teamId);
        await updateDoc(teamRef, { teamName: newName });
        this.logActivity({ action: 'RENAME_TEAM', affectedTable: 'teams', recordId: teamId, details: `Renamed team to ${newName}` });
        await this.populateLocalCache();
        const updatedTeam = await this.getTeamById(teamId);
        if (!updatedTeam) throw new Error("Team not found after update");
        return updatedTeam;
    }

    async getTasks(): Promise<Task[]> {
        const tasksCol = collection(db, 'tasks');
        const snapshot = await getDocs(tasksCol);
        return snapshot.docs.map(doc => doc.data() as Task);
    }
    
    async getKpiFactors(): Promise<KpiFactor[]> {
        if (this.kpiFactors.length > 0) return this.kpiFactors;
        const factorsCol = collection(db, 'kpiFactors');
        const snapshot = await getDocs(factorsCol);
        if(snapshot.empty) return [];
        return snapshot.docs.map(doc => doc.data() as KpiFactor);
    }

    async updateKpiFactors(factors: KpiFactor[]): Promise<void> {
        const batch = writeBatch(db);
        factors.forEach(factor => {
            const docRef = doc(db, "kpiFactors", factor.key);
            batch.set(docRef, factor);
        });
        await batch.commit();
        this.logActivity({ action: 'UPDATE_KPI_FACTORS', affectedTable: 'settings', recordId: '', details: 'Updated KPI calculation factors.' });
        await this.populateLocalCache();
    }

    async getKpis(filters: { userId?: string, teamId?: string }): Promise<CalculatedKpi[]> {
        const kpisCol = collection(db, 'kpis');
        let q = query(kpisCol);

        if (filters.userId) {
            q = query(q, where("userId", "==", filters.userId));
        }
        if (filters.teamId) {
            const team = await this.getTeamById(filters.teamId);
            if (team) {
                q = query(q, where("Team", "==", team.teamName));
            } else {
                return []; // No team found, no KPIs
            }
        }

        const snapshot = await getDocs(q);
        const kpiEntries = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as KpiEntry));

        const factors = await this.getKpiFactors();
        return kpiEntries.map(kpi => calculateKpiPercentages(kpi, factors)).sort((a,b) => new Date(b.Date).getTime() - new Date(a.Date).getTime());
    }

    async getKpiById(id: string): Promise<KpiEntry | undefined> {
        const kpiRef = doc(db, "kpis", id);
        const kpiSnap = await getDoc(kpiRef);
        return kpiSnap.exists() ? { ...kpiSnap.data(), id: kpiSnap.id } as KpiEntry : undefined;
    }

    async createKpi(kpiData: Partial<KpiEntry>): Promise<KpiEntry> {
        const newKpiRef = doc(collection(db, "kpis"));
        const newKpi = { ...kpiData, id: newKpiRef.id } as KpiEntry; // ensure ID is part of the object
        await setDoc(newKpiRef, newKpi);
        this.logActivity({ action: 'CREATE_KPI', affectedTable: 'kpis', recordId: newKpi.id, details: `Created KPI entry` });
        this.logAudit(undefined, newKpi);
        return newKpi;
    }

    async updateKpi(kpiId: string, updates: Partial<KpiEntry>): Promise<KpiEntry> {
        const kpiRef = doc(db, "kpis", kpiId);
        const kpiBefore = await this.getKpiById(kpiId);
        if(!kpiBefore) throw new Error("KPI not found");
        
        await updateDoc(kpiRef, updates);
        const kpiAfter = { ...kpiBefore, ...updates };

        this.logActivity({ action: 'UPDATE_KPI', affectedTable: 'kpis', recordId: kpiId, details: `Updated KPI entry` });
        this.logAudit(kpiBefore, kpiAfter);
        return kpiAfter;
    }

    async deleteKpi(kpiId: string): Promise<void> {
        const kpiRef = doc(db, "kpis", kpiId);
        await deleteDoc(kpiRef);
        this.logActivity({ action: 'DELETE_KPI', affectedTable: 'kpis', recordId: kpiId, details: `Deleted KPI entry` });
    }

    async deleteKpisBulk(kpiIds: string[]): Promise<void> {
        const batch = writeBatch(db);
        kpiIds.forEach(id => {
            const docRef = doc(db, "kpis", id);
            batch.delete(docRef);
        });
        await batch.commit();
        this.logActivity({ action: 'BULK_DELETE_KPIS', affectedTable: 'kpis', recordId: '', details: `Deleted ${kpiIds.length} KPI entries.` });
    }
    
    async getActivityLogs(): Promise<ActivityLog[]> { return [...this.activityLogs]; }
    async getAuditLogs(): Promise<AuditLog[]> { return [...this.auditLogs]; }

    // --- Deprecated task methods, will be removed ---
    async createTask(taskName: TaskName): Promise<Task> { throw new Error("Deprecated"); }
    async updateTask(taskId: string, newName: TaskName): Promise<Task> { throw new Error("Deprecated"); }
    async deleteTask(taskId: string): Promise<void> { throw new Error("Deprecated"); }
    async deleteTasksBulk(taskIds: string[]): Promise<void> { throw new Error("Deprecated"); }
    async getMissingEntries(teamId: string | null): Promise<any[]> { return []; }
    async getTeamRank(teamId: string, years: string[], months: string[]): Promise<any> { return {}; }
    async getAgentPerformanceSummary(agentId: string, years: string[], months: string[]): Promise<any[]> { return []; }
}

export const api = new ApiService();