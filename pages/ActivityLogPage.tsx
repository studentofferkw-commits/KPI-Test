
import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { ActivityLog } from '../types';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';

const SessionLogPage: React.FC = () => {
    const [logs, setLogs] = useState<ActivityLog[]>([]);
    const [filteredLogs, setFilteredLogs] = useState<ActivityLog[]>([]);
    const [filter, setFilter] = useState({ user: '', dateFrom: '', dateTo: '' });

    useEffect(() => {
        const fetchLogs = async () => {
            const data = await api.getActivityLogs();
            setLogs(data);
            setFilteredLogs(data);
        };
        fetchLogs();
    }, []);

    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFilter({ ...filter, [e.target.name]: e.target.value });
    };
    
    useEffect(() => {
        let result = logs;
        if (filter.user) {
            result = result.filter(log => log.userFullName.toLowerCase().includes(filter.user.toLowerCase()));
        }
        if(filter.dateFrom) {
            result = result.filter(log => new Date(log.timestamp) >= new Date(filter.dateFrom));
        }
        if(filter.dateTo) {
             result = result.filter(log => new Date(log.timestamp) <= new Date(filter.dateTo));
        }
        setFilteredLogs(result);
    }, [filter, logs]);


    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Session Log</h1>

            <Card>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border-b dark:border-gray-700">
                    <Input id="userFilter" label="Filter by user" name="user" value={filter.user} onChange={handleFilterChange} />
                    <Input id="dateFrom" label="From" type="date" name="dateFrom" value={filter.dateFrom} onChange={handleFilterChange} />
                    <Input id="dateTo" label="To" type="date" name="dateTo" value={filter.dateTo} onChange={handleFilterChange} />
                 </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                            <tr>
                                <th scope="col" className="px-6 py-3">Timestamp</th>
                                <th scope="col" className="px-6 py-3">User</th>
                                <th scope="col" className="px-6 py-3">Action</th>
                                <th scope="col" className="px-6 py-3">Details</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredLogs.map(log => (
                                <tr key={log.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                    <td className="px-6 py-4 whitespace-nowrap">{new Date(log.timestamp).toLocaleString()}</td>
                                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{log.userFullName}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                            log.action.includes('CREATE') ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
                                            log.action.includes('UPDATE') ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' :
                                            log.action.includes('DELETE') ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' :
                                            'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
                                        }`}>{log.action}</span>
                                    </td>
                                    <td className="px-6 py-4">{log.affectedTable} (ID: {log.recordId})</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};

export default SessionLogPage;