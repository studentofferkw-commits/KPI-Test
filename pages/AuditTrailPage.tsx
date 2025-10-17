import React, { useState, useEffect, useMemo, useRef } from 'react';
import { api } from '../services/api';
import { AuditLog, User } from '../types';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { ChevronDown } from 'lucide-react';

// --- MultiSelect Component ---
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

    const displayValue = () => {
        if (selectedValues.length === 0) return placeholder || `Select ${label}`;
        if (selectedValues.length > 1) return `${selectedValues.length} selected`;
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
                <span className="text-gray-900 dark:text-white truncate">{displayValue()}</span>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
                <div className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-800 shadow-lg border dark:border-gray-600 rounded-md max-h-60 overflow-y-auto">
                    <div className="p-2 space-y-1">
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


const ActivityLogPage: React.FC = () => {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);

    const [filters, setFilters] = useState({
        users: [] as string[],
        agents: [] as string[],
        actions: [] as string[],
        dateFrom: '',
        dateTo: '',
    });
    
    useEffect(() => {
        const fetchLogs = async () => {
            setLoading(true);
            const logsData = await api.getAuditLogs();
            setLogs(logsData);
            setLoading(false);
        };
        fetchLogs();
    }, []);

    const userOptions = useMemo(() => Array.from(new Set(logs.map(l => l.userFullName))).map(name => ({ value: name, label: name })), [logs]);
    const agentOptions = useMemo(() => Array.from(new Set(logs.map(l => l.agentName))).map(name => ({ value: name, label: name })), [logs]);
    const actionOptions = [{ value: 'CREATE', label: 'Create' }, { value: 'UPDATE', label: 'Update' }];

    const filteredLogs = useMemo(() => {
        let result = logs;

        const useDefaultDate = !filters.dateFrom && !filters.dateTo;
        if (useDefaultDate) {
            const today = new Date();
            const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
            result = result.filter(log => new Date(log.timestamp) >= firstDay);
        } else {
             if (filters.dateFrom) {
                result = result.filter(log => new Date(log.timestamp) >= new Date(filters.dateFrom));
            }
            if (filters.dateTo) {
                result = result.filter(log => new Date(log.timestamp) <= new Date(new Date(filters.dateTo).setHours(23, 59, 59, 999)));
            }
        }
        
        if (filters.users.length > 0) {
            result = result.filter(log => filters.users.includes(log.userFullName));
        }
        if (filters.agents.length > 0) {
            result = result.filter(log => filters.agents.includes(log.agentName));
        }
        if (filters.actions.length > 0) {
            result = result.filter(log => filters.actions.includes(log.action));
        }

        return result;
    }, [filters, logs]);

    const handleClearFilters = () => {
        setFilters({ users: [], agents: [], actions: [], dateFrom: '', dateTo: '' });
    };

    const formatValueToString = (value: any): string => {
        if (value === null || typeof value === 'undefined' || value === '') return 'N/A';
        return String(value);
    };

    const renderChangesCompact = (log: AuditLog) => {
        const changesString = log.changes.map(change => {
            if (log.action === 'UPDATE') {
                return `${change.field}: "${formatValueToString(change.oldValue)}" → "${formatValueToString(change.newValue)}"`;
            }
            return `${change.field}: "${formatValueToString(change.newValue)}"`;
        }).join('; ');
    
        return (
            <p className="text-xs text-gray-600 dark:text-gray-400 whitespace-normal break-words">
                {changesString}
            </p>
        );
    }

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Activity Log</h1>

            <Card title="Filters">
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    <MultiSelectDropdown label="User" options={userOptions} selectedValues={filters.users} onChange={(v) => setFilters(f => ({ ...f, users: v }))} placeholder="Select User" />
                    <MultiSelectDropdown label="Agent" options={agentOptions} selectedValues={filters.agents} onChange={(v) => setFilters(f => ({ ...f, agents: v }))} placeholder="Select Agent"/>
                    <MultiSelectDropdown label="Action" options={actionOptions} selectedValues={filters.actions} onChange={(v) => setFilters(f => ({ ...f, actions: v }))} placeholder="Select Action"/>
                    <Input id="dateFrom" label="From" type="date" value={filters.dateFrom} onChange={e => setFilters(f => ({ ...f, dateFrom: e.target.value }))} />
                    <Input id="dateTo" label="To" type="date" value={filters.dateTo} onChange={e => setFilters(f => ({ ...f, dateTo: e.target.value }))} />
                </div>
                <div className="flex justify-end mt-4">
                    <Button variant="secondary" onClick={handleClearFilters}>Reset Filters</Button>
                </div>
            </Card>

            <Card>
                <div className="overflow-x-auto">
                    {loading ? <p>Loading logs...</p> : (
                        <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                                <tr>
                                    <th scope="col" className="px-4 py-3">Timestamp</th>
                                    <th scope="col" className="px-4 py-3">User</th>
                                    <th scope="col" className="px-4 py-3">Action</th>
                                    <th scope="col" className="px-4 py-3">Agent</th>
                                    <th scope="col" className="px-4 py-3">KPI Date</th>
                                    <th scope="col" className="px-4 py-3 min-w-[450px]">Changes</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredLogs.map(log => (
                                    <tr key={log.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                        <td className="px-4 py-4 whitespace-nowrap align-top">{new Date(log.timestamp).toLocaleString()}</td>
                                        <td className="px-4 py-4 font-medium text-gray-900 dark:text-white align-top">{log.userFullName}</td>
                                        <td className="px-4 py-4 align-top">
                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                                log.action === 'CREATE' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
                                                'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
                                            }`}>{log.action}</span>
                                        </td>
                                        <td className="px-4 py-4 align-top">{log.agentName} ({log.teamName})</td>
                                        <td className="px-4 py-4 align-top">{log.kpiDate}</td>
                                        <td className="px-4 py-4 align-top">
                                            {renderChangesCompact(log)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                     { !loading && filteredLogs.length === 0 && <p className="p-4 text-center text-gray-500">No logs found for the selected filters.</p>}
                </div>
            </Card>
        </div>
    );
};

export default ActivityLogPage;