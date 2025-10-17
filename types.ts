// FIX: Provided full content for types.ts to make it a valid module.

export enum Role {
    Owner = 'Owner',
    Supervisor = 'Supervisor',
    TeamLeader = 'Team Leader',
    Assistant = 'Assistant',
    Agent = 'Agent',
}

export enum TaskName {
    CQ = 'CQ',
    DQ = 'DQ',
    CDQ = 'CDCDQ',
    Dispatch = 'Dispatch',
    Tickets = 'Tickets',
    VOP = 'VOP',
    Approve = 'Approve',
    Missing = 'Missing',
    SocialMedia = 'Social Media',
    '3PL' = '3PL',
}

export interface User {
    id: string;
    fullName: string;
    email: string;
    role: Role;
    teamId: string | null;
    password?: string;
}

export interface Team {
    id: string;
    teamName: string;
    leaderId: string | null;
    assistantId: string | null;
    agents: User[];
}

export interface Task {
    id: string;
    taskName: TaskName;
}

export interface KpiEntry {
    id: string;
    userId: string;
    'Agent name': string;
    Team: string;
    Date: string;
    Day: string;
    Task: TaskName;
    'Duty Hours': number;
    Attendance: number;
    login: string; // HH:mm:ss format
    'On Queue'?: string; // HH:mm:ss format
    'Avg Talk'?: string; // HH:mm:ss format
    ASA?: number;
    Productivity?: number;
    'DS Productivity'?: number;
    'AMS Productivity'?: number;
    Target?: number;
    Mistakes?: number;
    Bonus?: number;
    'QA %'?: number;
    'PK %'?: number;
    Remarks: string;
    [key: string]: any; // Allow for custom, dynamic fields
}

export interface CalculatedKpi extends KpiEntry {
    'Attendance %': number;
    'login %': number;
    'On Queue %': number;
    'Target %': number;
    'Avg Talk %': number;
    'ASA %': number;
    'Productivity %': number;
    'DS Productivity %': number;
    'AMS Productivity %': number;
    'Mistakes %': number;
    'Bonus %': number;
    'Overall %': number;
    'Team %': number;
    [key: string]: any; // Allow for dynamically named properties
}

export interface ActivityLog {
    id: string;
    timestamp: string;
    userId: string;
    userFullName: string;
    action: string;
    affectedTable: string;
    recordId: string;
    details: string;
}

export interface AuditLog {
    id: string;
    timestamp: string;
    userId: string;
    userFullName: string;
    action: 'CREATE' | 'UPDATE';
    agentName: string;
    teamName: string;
    kpiDate: string;
    changes: {
        field: string;
        oldValue: any;
        newValue: any;
    }[];
}

export interface AgentTaskSummary {
    name: string;
    count: number;
    'Average Overall %': number;
    teamRank: string;
    companyRank: string;
}

// Immutable system key for linking to calculation logic
export type SystemKpiKey = 'Attendance %' | 'login %' | 'On Queue %' | 'Target %' | 'Avg Talk %' | 'ASA %' | 'Productivity %' | 'DS Productivity %' | 'AMS Productivity %' | 'Mistakes %' | 'Bonus %' | 'QA %' | 'PK %';

export interface KpiFactor {
    key: string; // The user-editable, unique identifier
    calculationSource?: SystemKpiKey; // The immutable system key for linking to calculation logic
    displayName: string;
    weight: number; // For calculated fields, it's a percentage. For direct entry (QA/PK), it's the max value.
    isEditable: boolean;
    description: string;
    isDeletable: boolean;
    isCustom: boolean;
    formula: string;
}