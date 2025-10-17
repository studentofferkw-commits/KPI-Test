

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { api } from '../services/api';
import { CalculatedKpi, KpiFactor, Role, TaskName, Team } from '../types';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import { Download, Edit, FileText, ArrowUp, ArrowDown, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const ReportsPage: React.FC = () => {
    const [kpis, setKpis] = useState<CalculatedKpi[]>([]);
    const [filteredKpis, setFilteredKpis] = useState<CalculatedKpi[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const { user } = useAuth();
    
    const [filters, setFilters] = useState({ agentName: '', team: '', task: '', dateFrom: '', dateTo: '' });
    const [teams, setTeams] = useState<Team[]>([]);
    const [tasks, setTasks] = useState<TaskName[]>([]);
    const [kpiFactors, setKpiFactors] = useState<KpiFactor[]>([]);
    const [sortConfig, setSortConfig] = useState<{ key: keyof CalculatedKpi; direction: 'ascending' | 'descending' } | null>(null);
    const [selectedKpiIds, setSelectedKpiIds] = useState<string[]>([]);
    
    const selectAllCheckboxRef = useRef<HTMLInputElement>(null);

    const canModify = user && [Role.Owner, Role.Supervisor].includes(user.role);

    const kpiHeaders = useMemo(() => {
        const orderedHeaders: string[] = [];
        const addedKeys = new Set<string>();

        const addHeader = (key: string) => {
            if (key && !addedKeys.has(key)) {
                orderedHeaders.push(key);
                addedKeys.add(key);
            }
        };

        addHeader('Agent name');
        addHeader('Team');
        addHeader('Task');
        addHeader('Date');
        addHeader('Day');
        addHeader('Duty Hours');

        const findFactor = (source: string) => kpiFactors.find(f => f.calculationSource === source);

        let factor = findFactor('Attendance %'); addHeader('Attendance'); if (factor) addHeader(factor.key);
        factor = findFactor('login %'); addHeader('login'); if (factor) addHeader(factor.key);
        factor = findFactor('On Queue %'); addHeader('On Queue'); if(factor) addHeader(factor.key);
        factor = findFactor('Target %'); addHeader('Target'); if(factor) addHeader(factor.key);
        factor = findFactor('Avg Talk %'); addHeader('Avg Talk'); if(factor) addHeader(factor.key);
        factor = findFactor('ASA %'); addHeader('ASA'); if(factor) addHeader(factor.key);
        factor = findFactor('Productivity %'); addHeader('Productivity'); if(factor) addHeader(factor.key);
        factor = findFactor('DS Productivity %'); addHeader('DS Productivity'); if(factor) addHeader(factor.key);
        factor = findFactor('AMS Productivity %'); addHeader('AMS Productivity'); if(factor) addHeader(factor.key);
        factor = findFactor('Mistakes %'); addHeader('Mistakes'); if(factor) addHeader(factor.key);
        factor = findFactor('Bonus %'); addHeader('Bonus'); if(factor) addHeader(factor.key);
        factor = findFactor('QA %'); if(factor) addHeader(factor.key);
        factor = findFactor('PK %'); if(factor) addHeader(factor.key);

        kpiFactors.forEach(f => { if (f.isCustom) addHeader(f.key); });

        addHeader('Overall %');
        addHeader('Team %');
        addHeader('Remarks');

        return orderedHeaders as (keyof CalculatedKpi)[];
    }, [kpiFactors]);

    const formatCell = (value: any, header: string): string => {
        if (value === null || typeof value === 'undefined') return '';
        const factor = kpiFactors.find(f => f.key === header);
        const isPercentageBased = header.includes('%') || (factor && factor.calculationSource?.includes('%'));

        if (typeof value === 'number' && isPercentageBased) {
            return `${value.toFixed(2)}%`;
        }
        return String(value);
    }

    useEffect(() => {
        const fetchData = async () => {
            if (!user) return;
            setLoading(true);
            
            let apiFilters = {};
            if (user.role === Role.Agent) {
                apiFilters = { userId: user.id };
            } else if ((user.role === Role.TeamLeader || user.role === Role.Assistant) && user.teamId) {
                apiFilters = { teamId: user.teamId };
            }

            const [kpiData, teamsData, tasksData, factorsData] = await Promise.all([
                api.getKpis(apiFilters),
                api.getTeams(),
                api.getTasks(),
                api.getKpiFactors()
            ]);

            setKpis(kpiData);
            setFilteredKpis(kpiData);
            setTeams(teamsData);
            setTasks(tasksData.map(t => t.taskName));
            setKpiFactors(factorsData);
            setLoading(false);
        };
        fetchData();
    }, [user]);
    
    useEffect(() => {
        let result = kpis;
        if (filters.agentName) {
            result = result.filter(kpi => kpi['Agent name'].toLowerCase().includes(filters.agentName.toLowerCase()));
        }
        if (filters.team) {
            result = result.filter(kpi => kpi.Team.toLowerCase().includes(filters.team.toLowerCase()));
        }
        if (filters.task) {
            result = result.filter(kpi => kpi.Task === filters.task);
        }
        if (filters.dateFrom) {
            result = result.filter(kpi => new Date(kpi.Date) >= new Date(filters.dateFrom));
        }
        if (filters.dateTo) {
             result = result.filter(kpi => new Date(kpi.Date) <= new Date(filters.dateTo));
        }
        setFilteredKpis(result);
        setSelectedKpiIds([]); // Clear selection when filters change
    }, [filters, kpis]);

    const sortedAndFilteredKpis = useMemo(() => {
        let sortableKpis = [...filteredKpis];
        if (sortConfig !== null) {
            sortableKpis.sort((a, b) => {
                const aValue = a[sortConfig.key];
                const bValue = b[sortConfig.key];
                
                if (aValue === null || typeof aValue === 'undefined') return 1;
                if (bValue === null || typeof bValue === 'undefined') return -1;
                
                if (sortConfig.key === 'Date') {
                     const dateA = new Date(aValue as string).getTime();
                     const dateB = new Date(bValue as string).getTime();
                     if (dateA < dateB) return sortConfig.direction === 'ascending' ? -1 : 1;
                     if (dateA > dateB) return sortConfig.direction === 'ascending' ? 1 : -1;
                     return 0;
                }

                if (aValue < bValue) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
            });
        }
        return sortableKpis;
    }, [filteredKpis, sortConfig]);
    
    useEffect(() => {
        if (selectAllCheckboxRef.current) {
            const numSelected = selectedKpiIds.length;
            const numTotal = sortedAndFilteredKpis.length;
            selectAllCheckboxRef.current.checked = numSelected === numTotal && numTotal > 0;
            selectAllCheckboxRef.current.indeterminate = numSelected > 0 && numSelected < numTotal;
        }
    }, [selectedKpiIds, sortedAndFilteredKpis]);

    const requestSort = (key: keyof CalculatedKpi) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFilters({ ...filters, [e.target.name]: e.target.value });
    };

    const clearFilters = () => {
        setFilters({ agentName: '', team: '', task: '', dateFrom: '', dateTo: '' });
        setSortConfig(null);
    };

    const handleSelectKpi = (kpiId: string) => {
        setSelectedKpiIds(prev => prev.includes(kpiId) ? prev.filter(id => id !== kpiId) : [...prev, kpiId]);
    };

    const handleSelectAllKpis = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedKpiIds(sortedAndFilteredKpis.map(kpi => kpi.id));
        } else {
            setSelectedKpiIds([]);
        }
    };
    
    const handleDeleteKpi = async (kpiId: string) => {
        if (!canModify) return;
        if (window.confirm('Are you sure you want to permanently delete this KPI entry?')) {
            await api.deleteKpi(kpiId);
            setKpis(prev => prev.filter(kpi => kpi.id !== kpiId));
        }
    };

    const handleDeleteSelectedKpis = async () => {
        if (selectedKpiIds.length === 0 || !canModify) return;
        if (window.confirm(`Are you sure you want to permanently delete ${selectedKpiIds.length} selected KPI entries?`)) {
            await api.deleteKpisBulk(selectedKpiIds);
            setKpis(prev => prev.filter(kpi => !selectedKpiIds.includes(kpi.id)));
            setSelectedKpiIds([]);
        }
    };

    const exportData = (format: 'excel' | 'pdf') => {
        const dataToExport = sortedAndFilteredKpis;
        if (dataToExport.length === 0) {
            alert("No data available to export.");
            return;
        }

        if (format === 'excel') {
            const headers = kpiHeaders.join(',');
            const rows = dataToExport.map(kpi => 
                kpiHeaders.map(header => {
                    const value = formatCell(kpi[header], header as string).replace(/"/g, '""');
                    return `"${value}"`;
                }).join(',')
            );
            const csvContent = [headers, ...rows].join('\n');
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement("a");
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", "kpi_report.csv");
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } else if (format === 'pdf') {
            const { jsPDF } = (window as any).jspdf;
            const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
            
            const head = [kpiHeaders.map(h => String(h))];
            const body = dataToExport.map(kpi => 
                kpiHeaders.map(header => formatCell(kpi[header], header as string))
            );

            (doc as any).autoTable({
                head: head,
                body: body,
                styles: {
                    fontSize: 4,
                    cellPadding: 1.5,
                },
                headStyles: {
                    fillColor: [37, 99, 235],
                    fontSize: 4.5,
                    textColor: [255, 255, 255],
                },
                margin: { top: 40 },
                didDrawPage: (data: any) => {
                    doc.setFontSize(20);
                    doc.text('KPI Report', data.settings.margin.left, 30);
                },
            });
            
            doc.save('kpi_report.pdf');
        }
        api.logActivity({ action: 'EXPORT', affectedTable: 'kpis', details: `Exported as ${format}`, recordId: '' });
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Reports</h1>
                <div className="flex space-x-2">
                    {canModify && selectedKpiIds.length > 0 && (
                        <Button variant="danger" onClick={handleDeleteSelectedKpis}>
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete ({selectedKpiIds.length})
                        </Button>
                    )}
                    <Button variant="secondary" onClick={() => exportData('excel')}>
                        <Download className="w-4 h-4 mr-2" /> Export EXCEL
                    </Button>
                    <Button variant="secondary" onClick={() => exportData('pdf')}>
                        <FileText className="w-4 h-4 mr-2" /> Export PDF
                    </Button>
                </div>
            </div>

            <Card title="Filters">
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                     <Input id="agentName" name="agentName" label="Agent Name" value={filters.agentName} onChange={handleFilterChange} />
                     <Input id="team" name="team" label="Team" value={filters.team} onChange={handleFilterChange} />
                     <Select id="task" name="task" label="Task" value={filters.task} onChange={handleFilterChange}>
                        <option value="">All Tasks</option>
                        {tasks.map(task => <option key={task} value={task}>{task}</option>)}
                     </Select>
                     <div className="grid grid-cols-2 gap-2">
                        <Input id="dateFrom" name="dateFrom" label="From" type="date" value={filters.dateFrom} onChange={handleFilterChange} />
                        <Input id="dateTo" name="dateTo" label="To" type="date" value={filters.dateTo} onChange={handleFilterChange} />
                     </div>
                 </div>
                 <div className="flex justify-end mt-4">
                    <Button variant="secondary" onClick={clearFilters}>Clear Filters</Button>
                 </div>
            </Card>

            <Card>
                <div className="overflow-x-auto max-h-[65vh]">
                    {loading ? <p>Loading reports...</p> : (
                        <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400 sticky top-0">
                                <tr>
                                    {canModify && (
                                        <th scope="col" className="p-4">
                                            <div className="flex items-center">
                                                <input
                                                    ref={selectAllCheckboxRef}
                                                    id="checkbox-all-kpis"
                                                    type="checkbox"
                                                    className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 dark:focus:ring-primary-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                                                    onChange={handleSelectAllKpis}
                                                />
                                                <label htmlFor="checkbox-all-kpis" className="sr-only">checkbox</label>
                                            </div>
                                        </th>
                                    )}
                                    {kpiHeaders.map(header => (
                                        <th key={String(header)} scope="col" className="px-6 py-3 whitespace-nowrap">
                                            <button onClick={() => requestSort(header)} className="flex items-center gap-1 font-bold text-left w-full uppercase">
                                                <span>{String(header)}</span>
                                                {sortConfig && sortConfig.key === header && (
                                                    <span>
                                                        {sortConfig.direction === 'ascending' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                                                    </span>
                                                )}
                                            </button>
                                        </th>
                                    ))}
                                     {canModify && <th scope="col" className="px-6 py-3">Actions</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {sortedAndFilteredKpis.map(kpi => (
                                    <tr key={kpi.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                        {canModify && (
                                            <td className="w-4 p-4">
                                                <div className="flex items-center">
                                                    <input
                                                        id={`checkbox-kpi-${kpi.id}`}
                                                        type="checkbox"
                                                        className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 dark:focus:ring-primary-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                                                        checked={selectedKpiIds.includes(kpi.id)}
                                                        onChange={() => handleSelectKpi(kpi.id)}
                                                    />
                                                    <label htmlFor={`checkbox-kpi-${kpi.id}`} className="sr-only">checkbox</label>
                                                </div>
                                            </td>
                                        )}
                                        {kpiHeaders.map(header => (
                                            <td key={String(header)} className={`px-6 py-4 whitespace-nowrap ${header === 'Overall %' ? 'font-bold text-lg text-primary-600 dark:text-primary-400' : ''}`}>
                                                {formatCell(kpi[header], header as string)}
                                            </td>
                                        ))}
                                        {canModify && (
                                            <td className="px-6 py-4">
                                                <div className="flex items-center space-x-2">
                                                    <Button size="sm" variant="secondary" onClick={() => navigate(`/kpi-entry/${kpi.id}`)}>
                                                        <Edit className="w-4 h-4" />
                                                    </Button>
                                                    <Button size="sm" variant="danger" onClick={() => handleDeleteKpi(kpi.id)}>
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </Card>
        </div>
    );
};

export default ReportsPage;