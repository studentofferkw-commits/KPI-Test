import React, { useState, useEffect, useCallback, useRef } from 'react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Modal from '../components/ui/Modal';
import { api } from '../services/api';
import { Task, User, Role, Team, TaskName, KpiFactor } from '../types';
import { PlusCircle, Edit, Trash2, Save, X, Download, Upload } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

// Add declaration for the XLSX library loaded from CDN
declare var XLSX: any;

const SettingsPage: React.FC = () => {
    const { user } = useAuth();
    const isOwner = user?.role === Role.Owner;

    // State for Task Management
    const [tasks, setTasks] = useState<Task[]>([]);
    const [isAddingTask, setIsAddingTask] = useState(false);
    const [newTaskName, setNewTaskName] = useState<TaskName | ''>('');
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
    const selectAllTasksRef = useRef<HTMLInputElement>(null);

    // State for User Management
    const [users, setUsers] = useState<User[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [userFormData, setUserFormData] = useState({ fullName: '', email: '', password: '', role: Role.Agent, teamId: '' });
    const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
    const selectAllUsersRef = useRef<HTMLInputElement>(null);
    
    // State for Import Modal
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [importFile, setImportFile] = useState<File | null>(null);
    const [importError, setImportError] = useState<string>('');
    const [isImporting, setIsImporting] = useState(false);

    // State for KPI Factors Management
    const [kpiFactors, setKpiFactors] = useState<KpiFactor[]>([]);
    const [isSavingFactors, setIsSavingFactors] = useState(false);
    const [factorSaveSuccess, setFactorSaveSuccess] = useState(false);
    const [isFactorModalOpen, setIsFactorModalOpen] = useState(false);
    const [newFactorData, setNewFactorData] = useState({ key: '', displayName: '', weight: 10, description: '' });
    const [selectedFactorKeys, setSelectedFactorKeys] = useState<string[]>([]);
    const selectAllFactorsRef = useRef<HTMLInputElement>(null);


    const taskNameOptions = Object.values(TaskName);

    const fetchData = useCallback(async () => {
        const [tasksData, usersData, teamsData] = await Promise.all([
            api.getTasks(),
            api.getUsers(),
            api.getTeams(),
        ]);
        setTasks(tasksData);
        setUsers(usersData);
        setTeams(teamsData);

        if (isOwner) {
            const factorsData = await api.getKpiFactors();
            setKpiFactors(factorsData);
        }
    }, [isOwner]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        if (selectAllTasksRef.current) {
            const numSelected = selectedTaskIds.length;
            const numTotal = tasks.length;
            selectAllTasksRef.current.checked = numSelected === numTotal && numTotal > 0;
            selectAllTasksRef.current.indeterminate = numSelected > 0 && numSelected < numTotal;
        }
    }, [selectedTaskIds, tasks]);

    useEffect(() => {
        if (selectAllUsersRef.current) {
            const numSelected = selectedUserIds.length;
            const numTotal = users.length;
            selectAllUsersRef.current.checked = numSelected === numTotal && numTotal > 0;
            selectAllUsersRef.current.indeterminate = numSelected > 0 && numSelected < numTotal;
        }
    }, [selectedUserIds, users]);

    useEffect(() => {
        if (selectAllFactorsRef.current) {
            const deletableFactors = kpiFactors.filter(f => f.isDeletable);
            const numSelected = selectedFactorKeys.length;
            const numTotalDeletable = deletableFactors.length;
            selectAllFactorsRef.current.checked = numSelected === numTotalDeletable && numTotalDeletable > 0;
            selectAllFactorsRef.current.indeterminate = numSelected > 0 && numSelected < numTotalDeletable;
        }
    }, [selectedFactorKeys, kpiFactors]);


    // --- Task Management Handlers ---
    const handleAddTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTaskName) return;
        await api.createTask(newTaskName as TaskName);
        setNewTaskName('');
        setIsAddingTask(false);
        fetchData();
    };

    const handleUpdateTask = async () => {
        if (!editingTask) return;
        await api.updateTask(editingTask.id, editingTask.taskName);
        setEditingTask(null);
        fetchData();
    };

    const handleDeleteTask = async (taskId: string) => {
        if (window.confirm('Are you sure you want to delete this task? This action cannot be undone.')) {
            await api.deleteTask(taskId);
            fetchData();
        }
    };

    const handleSelectTask = (taskId: string) => {
        setSelectedTaskIds(prev => prev.includes(taskId) ? prev.filter(id => id !== taskId) : [...prev, taskId]);
    };
    
    const handleSelectAllTasks = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedTaskIds(tasks.map(t => t.id));
        } else {
            setSelectedTaskIds([]);
        }
    };
    
    const handleDeleteSelectedTasks = async () => {
        if (selectedTaskIds.length === 0) return;
        if (window.confirm(`Are you sure you want to permanently delete ${selectedTaskIds.length} selected task(s)?`)) {
            await api.deleteTasksBulk(selectedTaskIds);
            setSelectedTaskIds([]);
            fetchData();
        }
    };
    
    // --- User Management Handlers ---
    const handleOpenUserModal = (user: User | null) => {
        setEditingUser(user);
        setUserFormData(user ? { fullName: user.fullName, email: user.email, password: '', role: user.role, teamId: user.teamId || '' } : { fullName: '', email: '', password: '', role: Role.Agent, teamId: '' });
        setIsUserModalOpen(true);
    };
    
    const handleCloseUserModal = () => {
        setIsUserModalOpen(false);
        setEditingUser(null);
    };

    const handleSaveUser = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (editingUser) {
            const dataToSave: Partial<User> = {
                fullName: userFormData.fullName,
                email: userFormData.email,
                role: userFormData.role,
                teamId: userFormData.teamId || null,
            };
            if (userFormData.password) {
                dataToSave.password = userFormData.password;
            }
            await api.updateUser(editingUser.id, dataToSave);
        } else {
            const dataToSave: Omit<User, 'id'> = {
                fullName: userFormData.fullName,
                email: userFormData.email,
                password: userFormData.password,
                role: userFormData.role,
                teamId: userFormData.teamId || null,
            };
            await api.createUser(dataToSave);
        }
        fetchData();
        handleCloseUserModal();
    };
    
    const handleDeleteUser = async (userId: string) => {
        if (window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
            await api.deleteUser(userId);
            fetchData();
        }
    };

    const handleSelectUser = (userId: string) => {
        setSelectedUserIds(prev => prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]);
    };

    const handleSelectAllUsers = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedUserIds(users.map(u => u.id));
        } else {
            setSelectedUserIds([]);
        }
    };

    const handleDeleteSelectedUsers = async () => {
        if (selectedUserIds.length === 0) return;
        if (window.confirm(`Are you sure you want to permanently delete ${selectedUserIds.length} selected user(s)?`)) {
            await api.deleteUsersBulk(selectedUserIds);
            setSelectedUserIds([]);
            fetchData();
        }
    };
    
    // --- Import/Export Handlers ---
    const handleDownloadTemplate = () => {
        const teamNames = teams.map(t => t.teamName);
        const roleNames = Object.values(Role);

        const ws_data = [
            ["fullName", "email", "password", "role", "teamName"]
        ];
        const ws = XLSX.utils.aoa_to_sheet(ws_data);
        
        // Add data validation for dropdowns
        ws['!dataValidation'] = [
            { 
                sqref: 'D2:D1048576', // Apply to the entire column D starting from row 2
                opts: {
                    type: 'list',
                    allowBlank: true,
                    formula1: `"${roleNames.join(',')}"`,
                    showDropDown: true
                }
            },
            {
                sqref: 'E2:E1048576', // Apply to the entire column E starting from row 2
                opts: {
                    type: 'list',
                    allowBlank: true,
                    formula1: `"${teamNames.join(',')}"`,
                    showDropDown: true
                }
            }
        ];
        
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Users Template");

        XLSX.writeFile(wb, "user_import_template.xlsx");
    };


    const handleImportUsers = async () => {
        if (!importFile) {
            setImportError("Please select a file to import.");
            return;
        }
        setIsImporting(true);
        setImportError('');
        try {
            const text = await importFile.text();
            const rows = text.split('\n').slice(1); // Skip header
            const teamMap = new Map(teams.map(t => [t.teamName.toLowerCase(), t.id]));
            const roles = Object.values(Role) as string[];

            const newUsers: Omit<User, 'id'>[] = rows.map((row, index): Omit<User, 'id'> | null => {
                if (!row.trim()) return null; 
                const [fullName, email, password, role, teamName] = row.split(',').map(s => s.trim());
                if (!fullName || !email || !password || !role) {
                    throw new Error(`Row ${index + 2}: Missing required fields (fullName, email, password, role).`);
                }
                if (!roles.includes(role)) {
                    throw new Error(`Row ${index + 2}: Invalid role '${role}'.`);
                }
                const teamId = teamName ? teamMap.get(teamName.toLowerCase()) ?? null : null;
                if (teamName && !teamId) {
                    throw new Error(`Row ${index + 2}: Team '${teamName}' not found.`);
                }
                return { fullName, email, password, role: role as Role, teamId };
            }).filter((u): u is Omit<User, 'id'> => u !== null);

            if (newUsers.length > 0) {
                await api.createUsersBulk(newUsers);
            }
            
            setIsImportModalOpen(false);
            setImportFile(null);
            fetchData();
        } catch (error: any) {
            setImportError(error.message || "An unexpected error occurred during import.");
        } finally {
            setIsImporting(false);
        }
    };

    // --- KPI Factor Handlers ---
    const handleFactorChange = (index: number, field: keyof KpiFactor, value: string | number) => {
        const updatedFactors = [...kpiFactors];
        const factorToUpdate = { ...updatedFactors[index] };

        if (field === 'key') {
            const originalKey = factorToUpdate.key;
            const newKey = String(value);

            if (newKey !== originalKey) {
                 if (!factorToUpdate.isCustom) {
                    const proceed = window.confirm(`WARNING: Changing a system Factor Key from "${originalKey}" to "${newKey}" is an advanced action. The system will continue to calculate correctly, but reports and other parts of the app will now use this new key. Do you want to proceed?`);
                    if (!proceed) return;
                }
                
                const isDuplicate = updatedFactors.some((f, i) => i !== index && f.key === newKey);
                if (isDuplicate) {
                    alert('Factor Key must be unique.');
                    return;
                }
            }
            (factorToUpdate as any)[field] = newKey;
        } else if (field === 'weight') {
            (factorToUpdate as any)[field] = Number(value);
        } else {
            (factorToUpdate as any)[field] = value;
        }

        updatedFactors[index] = factorToUpdate;
        setKpiFactors(updatedFactors);
    };

    const handleSaveFactors = async () => {
        setIsSavingFactors(true);
        setFactorSaveSuccess(false);
        await api.updateKpiFactors(kpiFactors);
        setIsSavingFactors(false);
        setFactorSaveSuccess(true);
        setTimeout(() => setFactorSaveSuccess(false), 3000);
    };

    const handleAddNewFactor = (e: React.FormEvent) => {
        e.preventDefault();
        const key = newFactorData.key.trim().toLowerCase().replace(/\s+/g, '_');
        if (!key || !newFactorData.displayName.trim()) {
            alert("Factor Key and Display Name are required.");
            return;
        }
        if (kpiFactors.some(f => f.key === key)) {
            alert("Factor Key must be unique.");
            return;
        }
        const newFactor: KpiFactor = {
            ...newFactorData,
            key,
            isEditable: true,
            isCustom: true,
            isDeletable: true,
            formula: "Direct Value"
        };
        setKpiFactors([...kpiFactors, newFactor]);
        setIsFactorModalOpen(false);
        setNewFactorData({ key: '', displayName: '', weight: 10, description: '' });
    };

    const handleSelectFactor = (key: string) => {
        setSelectedFactorKeys(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
    };

    const handleSelectAllFactors = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            const deletableFactorKeys = kpiFactors.filter(f => f.isDeletable).map(f => f.key);
            setSelectedFactorKeys(deletableFactorKeys);
        } else {
            setSelectedFactorKeys([]);
        }
    };
    
    const handleDeleteSelectedFactors = async () => {
        if (selectedFactorKeys.length === 0) return;
        if (window.confirm(`Are you sure you want to permanently delete ${selectedFactorKeys.length} selected factor(s)? This will also remove any entered data for these factors from all KPI entries.`)) {
            try {
                const updatedFactors = kpiFactors.filter(f => !selectedFactorKeys.includes(f.key));
                await api.updateKpiFactors(updatedFactors);
                setKpiFactors(updatedFactors);
                setSelectedFactorKeys([]);
            } catch (error) {
                console.error("Failed to delete KPI factors", error);
                alert("An error occurred while deleting the factors. Please try again.");
            }
        }
    };


    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Settings</h1>
            
            {isOwner && (
                <Card>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">KPI Fields & Formulas Management</h3>
                        <div className="flex items-center space-x-2">
                            {selectedFactorKeys.length > 0 && (
                                <Button variant="danger" onClick={handleDeleteSelectedFactors}>
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete ({selectedFactorKeys.length})
                                </Button>
                            )}
                            <Button onClick={() => setIsFactorModalOpen(true)}>
                                <PlusCircle className="w-4 h-4 mr-2" /> Add Custom Factor
                            </Button>
                        </div>
                    </div>
                     <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                             <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                                <tr>
                                    <th className="p-2 w-10">
                                        <div className="flex items-center justify-center">
                                            <input
                                                ref={selectAllFactorsRef}
                                                type="checkbox"
                                                className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                                onChange={handleSelectAllFactors}
                                                aria-label="Select all deletable factors"
                                            />
                                        </div>
                                    </th>
                                    <th className="p-2 min-w-[150px]">Factor Key</th>
                                    <th className="p-2 min-w-[200px]">Display Name</th>
                                    <th className="p-2 min-w-[120px]">Weight / Max</th>
                                    <th className="p-2 min-w-[250px]">Description</th>
                                    <th className="p-2 min-w-[250px]">Calculation Method</th>
                                </tr>
                            </thead>
                            <tbody>
                                {kpiFactors.map((factor, index) => (
                                <tr key={factor.key} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                    <td className="p-2 text-center">
                                        {factor.isDeletable && (
                                            <input
                                                type="checkbox"
                                                className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                                checked={selectedFactorKeys.includes(factor.key)}
                                                onChange={() => handleSelectFactor(factor.key)}
                                                aria-labelledby={`factor-name-${index}`}
                                            />
                                        )}
                                    </td>
                                    <td className="p-2">
                                        <input 
                                            type="text" 
                                            value={factor.key} 
                                            onChange={e => handleFactorChange(index, 'key', e.target.value)} 
                                            className="w-full bg-transparent p-1 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-primary-500 focus:border-primary-500 font-mono text-xs"
                                            title="Unique identifier (e.g. 'daily_attendance_score')"
                                        />
                                    </td>
                                    <td className="p-2" id={`factor-name-${index}`}>
                                        <input type="text" value={factor.displayName} onChange={e => handleFactorChange(index, 'displayName', e.target.value)} className="w-full bg-transparent p-1 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-primary-500 focus:border-primary-500" />
                                    </td>
                                    <td className="p-2">
                                        <input type="number" value={factor.weight} onChange={e => handleFactorChange(index, 'weight', e.target.value)} className="w-full bg-transparent p-1 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-primary-500 focus:border-primary-500" />
                                    </td>
                                     <td className="p-2">
                                        <input type="text" value={factor.description} onChange={e => handleFactorChange(index, 'description', e.target.value)} className="w-full bg-transparent p-1 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-primary-500 focus:border-primary-500" />
                                    </td>
                                    <td className="p-2 text-xs text-gray-600 dark:text-gray-300">{factor.formula}</td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="flex justify-end items-center mt-6">
                        {factorSaveSuccess && <p className="text-green-600 mr-4">Settings saved successfully!</p>}
                        <Button onClick={handleSaveFactors} isLoading={isSavingFactors}>Save KPI Settings</Button>
                    </div>
                </Card>
            )}

            <Card>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Task Management</h3>
                    <div className="flex items-center space-x-2">
                        {selectedTaskIds.length > 0 && (
                            <Button variant="danger" onClick={handleDeleteSelectedTasks}>
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete ({selectedTaskIds.length})
                            </Button>
                        )}
                        {!isAddingTask && <Button onClick={() => setIsAddingTask(true)}><PlusCircle className="w-4 h-4 mr-2" /> Add Task</Button>}
                    </div>
                </div>
                <div className="border-b dark:border-gray-700 mb-2 pb-2">
                    <label className="flex items-center space-x-3 px-2">
                        <input
                            ref={selectAllTasksRef}
                            type="checkbox"
                            className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                            onChange={handleSelectAllTasks}
                        />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Select All</span>
                    </label>
                </div>
                <ul className="space-y-2">
                    {tasks.map(task => (
                        <li key={task.id} className="flex items-center justify-between p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700/50">
                           {editingTask?.id === task.id ? (
                               <div className="flex-grow flex items-center gap-2">
                                   <Select id={`task-edit-${task.id}`} label="" value={editingTask.taskName} onChange={(e) => setEditingTask({...editingTask, taskName: e.target.value as TaskName})}>
                                       {taskNameOptions.map(name => <option key={String(name)} value={String(name)}>{String(name)}</option>)}
                                   </Select>
                                   <Button size="sm" onClick={handleUpdateTask}><Save className="w-4 h-4" /></Button>
                                   <Button size="sm" variant="secondary" onClick={() => setEditingTask(null)}><X className="w-4 h-4" /></Button>
                               </div>
                           ) : (
                               <>
                                   <label className="flex items-center space-x-3 flex-grow cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                            checked={selectedTaskIds.includes(task.id)}
                                            onChange={() => handleSelectTask(task.id)}
                                        />
                                        <span className="text-gray-700 dark:text-gray-300">{task.taskName}</span>
                                   </label>
                                   <div className="space-x-2">
                                       <Button size="sm" variant="secondary" onClick={() => setEditingTask({ ...task })}><Edit className="w-4 h-4" /></Button>
                                       <Button size="sm" variant="danger" onClick={() => handleDeleteTask(task.id)}><Trash2 className="w-4 h-4" /></Button>
                                   </div>
                               </>
                           )}
                        </li>
                    ))}
                    {isAddingTask && (
                        <li className="p-2">
                            <form onSubmit={handleAddTask} className="flex items-end gap-2">
                                <div className="flex-grow">
                                    <Select id="newTaskName" label="New Task Name" value={newTaskName} onChange={e => setNewTaskName(e.target.value as TaskName)} required>
                                        <option value="">Select a task</option>
                                        {taskNameOptions.map(name => <option key={String(name)} value={String(name)}>{String(name)}</option>)}
                                    </Select>
                                </div>
                                <Button type="submit">Add</Button>
                                <Button type="button" variant="secondary" onClick={() => setIsAddingTask(false)}>Cancel</Button>
                            </form>
                        </li>
                    )}
                </ul>
            </Card>
            
            <Card>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">User Management</h3>
                    <div className="flex items-center space-x-2">
                        {selectedUserIds.length > 0 && (
                             <Button variant="danger" onClick={handleDeleteSelectedUsers}>
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete ({selectedUserIds.length})
                            </Button>
                        )}
                        <Button variant="secondary" onClick={handleDownloadTemplate}><Download className="w-4 h-4 mr-2" /> Download Template</Button>
                        <Button variant="secondary" onClick={() => setIsImportModalOpen(true)}><Upload className="w-4 h-4 mr-2" /> Import Users</Button>
                        <Button onClick={() => handleOpenUserModal(null)}><PlusCircle className="w-4 h-4 mr-2" /> Add User</Button>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                            <tr>
                                <th scope="col" className="p-4">
                                    <div className="flex items-center">
                                        <input
                                            ref={selectAllUsersRef}
                                            id="checkbox-all-users"
                                            type="checkbox"
                                            className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 dark:focus:ring-primary-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                                            onChange={handleSelectAllUsers}
                                        />
                                        <label htmlFor="checkbox-all-users" className="sr-only">checkbox</label>
                                    </div>
                                </th>
                                <th scope="col" className="px-6 py-3">Full Name</th>
                                <th scope="col" className="px-6 py-3">Email</th>
                                <th scope="col" className="px-6 py-3">Password</th>
                                <th scope="col" className="px-6 py-3">Role</th>
                                <th scope="col" className="px-6 py-3">Team</th>
                                <th scope="col" className="px-6 py-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(user => (
                                <tr key={user.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                    <td className="w-4 p-4">
                                        <div className="flex items-center">
                                            <input
                                                id={`checkbox-user-${user.id}`}
                                                type="checkbox"
                                                className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 dark:focus:ring-primary-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                                                checked={selectedUserIds.includes(user.id)}
                                                onChange={() => handleSelectUser(user.id)}
                                            />
                                            <label htmlFor={`checkbox-user-${user.id}`} className="sr-only">checkbox</label>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">{user.fullName}</td>
                                    <td className="px-6 py-4">{user.email}</td>
                                    <td className="px-6 py-4">********</td>
                                    <td className="px-6 py-4">{user.role}</td>
                                    <td className="px-6 py-4">{teams.find(t => t.id === user.teamId)?.teamName || 'N/A'}</td>
                                    <td className="px-6 py-4 space-x-2">
                                        <Button size="sm" variant="secondary" onClick={() => handleOpenUserModal(user)}><Edit className="w-4 h-4" /></Button>
                                        <Button size="sm" variant="danger" onClick={() => handleDeleteUser(user.id)}><Trash2 className="w-4 h-4" /></Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            <Modal isOpen={isUserModalOpen} onClose={handleCloseUserModal} title={editingUser ? 'Edit User' : 'Add New User'}>
                <form onSubmit={handleSaveUser} className="space-y-4">
                    <Input id="fullName" label="Full Name" value={userFormData.fullName} onChange={e => setUserFormData({...userFormData, fullName: e.target.value})} required />
                    <Input id="email" label="Email Address" type="email" value={userFormData.email} onChange={e => setUserFormData({...userFormData, email: e.target.value})} required />
                    <Input 
                        id="password" 
                        label="Password" 
                        type="password" 
                        value={userFormData.password} 
                        onChange={e => setUserFormData({...userFormData, password: e.target.value})} 
                        required={!editingUser}
                        placeholder={editingUser ? "Leave blank to keep current" : ""}
                    />
                    <Select id="role" label="Role" value={userFormData.role} onChange={e => setUserFormData({...userFormData, role: e.target.value as Role })}>
                        {Object.values(Role).map(role => <option key={String(role)} value={String(role)}>{String(role)}</option>)}
                    </Select>
                    <Select id="teamId" label="Team" value={userFormData.teamId} onChange={e => setUserFormData({...userFormData, teamId: e.target.value })}>
                        <option value="">No Team</option>
                        {teams.map(team => <option key={team.id} value={team.id}>{team.teamName}</option>)}
                    </Select>
                    <div className="flex justify-end space-x-2 pt-4">
                        <Button type="button" variant="secondary" onClick={handleCloseUserModal}>Cancel</Button>
                        <Button type="submit">Save User</Button>
                    </div>
                </form>
            </Modal>

            <Modal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} title="Import Users from CSV">
                <div className="space-y-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        Upload a CSV file with the columns: <code className="text-xs bg-gray-100 dark:bg-gray-700 p-1 rounded">fullName,email,password,role,teamName</code>.
                        The role must be one of: {Object.values(Role).join(', ')}.
                    </p>
                    <Input 
                        id="importFile" 
                        label="CSV File" 
                        type="file" 
                        accept=".csv"
                        onChange={(e) => setImportFile(e.target.files ? e.target.files[0] : null)}
                    />
                    {importError && <p className="text-sm text-red-600">{importError}</p>}
                    <div className="flex justify-end space-x-2 pt-4">
                        <Button type="button" variant="secondary" onClick={() => setIsImportModalOpen(false)}>Cancel</Button>
                        <Button onClick={handleImportUsers} isLoading={isImporting}>Import</Button>
                    </div>
                </div>
            </Modal>

             <Modal isOpen={isFactorModalOpen} onClose={() => setIsFactorModalOpen(false)} title="Add Custom KPI Factor">
                <form onSubmit={handleAddNewFactor} className="space-y-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Create a new direct-value KPI. It will appear on the KPI entry form automatically.</p>
                    <Input 
                        id="factorKey" 
                        label="Factor Key (unique, no spaces, e.g. 'custom_metric')" 
                        value={newFactorData.key} 
                        onChange={e => setNewFactorData({...newFactorData, key: e.target.value })} 
                        required 
                        pattern="^[a-zA-Z0-9_]+$"
                        title="Only letters, numbers, and underscores are allowed."
                    />
                    <Input 
                        id="factorDisplayName" 
                        label="Display Name" 
                        value={newFactorData.displayName} 
                        onChange={e => setNewFactorData({...newFactorData, displayName: e.target.value})} 
                        required 
                    />
                     <Input 
                        id="factorWeight" 
                        label="Max Value" 
                        type="number"
                        value={newFactorData.weight} 
                        onChange={e => setNewFactorData({...newFactorData, weight: parseInt(e.target.value) || 0})} 
                        required 
                    />
                     <Input 
                        id="factorDescription" 
                        label="Description" 
                        value={newFactorData.description} 
                        onChange={e => setNewFactorData({...newFactorData, description: e.target.value})} 
                        required 
                    />
                    <div className="flex justify-end space-x-2 pt-4">
                        <Button type="button" variant="secondary" onClick={() => setIsFactorModalOpen(false)}>Cancel</Button>
                        <Button type="submit">Add Factor</Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default SettingsPage;