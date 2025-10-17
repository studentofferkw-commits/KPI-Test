import { KpiEntry, CalculatedKpi, TaskName, KpiFactor } from '../types';

// Helper to convert HH:mm:ss to seconds
const timeToSeconds = (time: string): number => {
    if (!time || typeof time !== 'string') return 0;
    const parts = time.split(':').map(Number);
    if (parts.length !== 3 || parts.some(isNaN)) return 0;
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
};

// Helper to generate a time map from 1% to 100% based on the time for 1%
const generateTimeMap = (secondsPerPercent: number): Record<number, number> => {
    if (secondsPerPercent <= 0) return {};
    const map: Record<number, number> = {};
    for (let i = 1; i <= 100; i++) {
        map[Math.round(i * secondsPerPercent)] = i;
    }
    return map;
};


// Helper to find the matching percentage from a time-based map
const findTimeMapping = (seconds: number, map: Record<number, number>): number => {
    const keys = Object.keys(map).map(Number).sort((a, b) => a - b);
    let foundKey = 0;
    for (const key of keys) {
        if (seconds >= key) {
            foundKey = key;
        } else {
            break;
        }
    }
    return map[foundKey] || 0;
};

interface DutyHourConfig {
    login: { map: Record<number, number> };
    onQueue: { map: Record<number, number> };
    target: { baseline: Partial<Record<TaskName, number>> };
}

// --- MAPPING TABLES ---
const dutyHourTables: Record<number, DutyHourConfig> = {
    4: {
        login:   { map: generateTimeMap(144) },   // 1% = 0:02:24
        onQueue: { map: generateTimeMap(126) },   // 1% = 0:02:06
        target:  { baseline: { [TaskName.VOP]: 100, [TaskName.Tickets]: 80, [TaskName.Dispatch]: 68 } }
    },
    5: {
        login:   { map: generateTimeMap(180) },   // 1% = 0:03:00
        onQueue: { map: generateTimeMap(162) },   // 1% = 0:02:42
        target:  { baseline: { [TaskName.VOP]: 125, [TaskName.Tickets]: 100, [TaskName.Dispatch]: 85 } }
    },
     6: {
        login:   { map: generateTimeMap(216) },   // 1% = 0:03:36
        onQueue: { map: generateTimeMap(180) },   // 1% = 0:03:00
        target:  { baseline: { [TaskName.VOP]: 150, [TaskName.Tickets]: 120, [TaskName.Dispatch]: 102 } }
    },
    7: {
        login:   { map: generateTimeMap(252) },   // 1% = 0:04:12
        onQueue: { map: generateTimeMap(216) },   // 1% = 0:03:36
        target:  { baseline: { [TaskName.VOP]: 175, [TaskName.Tickets]: 140, [TaskName.Dispatch]: 119 } }
    },
    8: {
        login:   { map: generateTimeMap(288) },   // 1% = 0:04:48
        onQueue: { map: generateTimeMap(234) },   // 1% = 0:03:54
        target:  { baseline: { [TaskName.VOP]: 200, [TaskName.Tickets]: 160, [TaskName.Dispatch]: 136 } }
    },
    9: {
        login:   { map: generateTimeMap(324) },   // 1% = 0:05:24
        onQueue: { map: generateTimeMap(270) },   // 1% = 0:04:30
        target:  { baseline: { [TaskName.VOP]: 225, [TaskName.Tickets]: 180, [TaskName.Dispatch]: 153 } }
    }
};

const attendanceMap: Record<number, number> = { 0: 0, 1: 20, 2: 40, 3: 60, 4: 80, 5: 100 };
const asaPenaltyMap: Record<number, number> = { 6: 1, 7: 2, 8: 3, 9: 4, 10: 5 };

// --- CALCULATION FUNCTIONS ---

const calculateAttendancePercent = (attendance: number, weight: number): number => (attendanceMap[attendance] ?? 0) * weight;

const calculateLoginPercent = (login: string, dutyHours: number, weight: number): number => {
    const config = dutyHourTables[dutyHours]?.login;
    if (!config) return 0;
    const seconds = timeToSeconds(login);
    const mappedPercent = findTimeMapping(seconds, config.map);
    return mappedPercent * weight;
};

const calculateOnQueuePercent = (onQueue: string, dutyHours: number, weight: number): number => {
    const config = dutyHourTables[dutyHours]?.onQueue;
    if (!config) return 0;
    const seconds = timeToSeconds(onQueue);
    const mappedPercent = findTimeMapping(seconds, config.map);
    return mappedPercent * weight;
};

const calculateTargetPercent = (target: number | undefined, task: TaskName, dutyHours: number, weight: number): number => {
    if (typeof target !== 'number') return 0;
    const config = dutyHourTables[dutyHours]?.target;
    const baseline = config?.baseline[task];
    if (typeof baseline !== 'number' || baseline === 0 || !config) return 0;
    const rawPercent = (target / baseline) * 100;
    return rawPercent * weight;
};

const calculateAvgTalkPercent = (avgTalk: string | undefined, weight: number): number => {
    if (!avgTalk) return 0;
    const seconds = timeToSeconds(avgTalk);
    const maxScore = weight * 100; // e.g., if weight is 0.05, max score is 5
    if (seconds <= 90) return maxScore;
    const secondsOver = seconds - 90;
    const penalty = (secondsOver / 2) * 0.25;
    return Math.max(0, maxScore - penalty);
};

const calculateAsaPercent = (asa: number, weight: number): number => {
    const maxScore = weight * 100;
    if (asa < 6) return maxScore;
    const penalty = asaPenaltyMap[Math.floor(asa)] ?? maxScore;
    return Math.max(0, maxScore - penalty);
};

const calculateProductivityPercent = (productivity: number | undefined, weight: number): number => {
    if (typeof productivity !== 'number') return 0;
     return (productivity / 100) * (weight * 100);
}

const calculateAmsPercent = (ams: number | undefined, weight: number): number => {
    const maxScore = weight * 100;
    if (typeof ams !== 'number') return maxScore;
    const penalty = Math.min(ams, maxScore);
    return maxScore - penalty;
};

const calculateDsPercent = (ds: number | undefined, weight: number): number => {
     const maxScore = weight * 100;
     if (typeof ds !== 'number') return maxScore;
    const penalty = Math.min(ds, maxScore);
    return maxScore - penalty;
};

const calculateMistakesPercent = (mistakes: number | undefined, weight: number): number => {
    const maxScore = weight * 100;
    if (typeof mistakes !== 'number') return maxScore;
    const penalty = Math.min(mistakes, maxScore);
    return maxScore - penalty;
};

export const calculateKpiPercentages = (entry: KpiEntry, factors: KpiFactor[]): CalculatedKpi => {
    const calculatedPercentages: { [key: string]: number } = {};

    const calculationFunctions: { [key: string]: (entry: KpiEntry, weight: number) => number } = {
        'Attendance %': (e, w) => calculateAttendancePercent(e.Attendance, w),
        'login %': (e, w) => calculateLoginPercent(e.login, e['Duty Hours'], w),
        'On Queue %': (e, w) => calculateOnQueuePercent(e['On Queue'] ?? '', e['Duty Hours'], w),
        'Target %': (e, w) => calculateTargetPercent(e.Target, e.Task, e['Duty Hours'], w),
        'Avg Talk %': (e, w) => calculateAvgTalkPercent(e['Avg Talk'], w),
        'ASA %': (e, w) => calculateAsaPercent(e.ASA ?? 0, w),
        'DS Productivity %': (e, w) => calculateDsPercent(e['DS Productivity'], w),
        'AMS Productivity %': (e, w) => calculateAmsPercent(e['AMS Productivity'], w),
        'Productivity %': (e, w) => calculateProductivityPercent(e.Productivity, w),
        'Mistakes %': (e, w) => calculateMistakesPercent(e.Mistakes, w),
    };
    
    for (const factor of factors) {
        if (factor.isCustom || !factor.calculationSource) continue;

        const weight = factor.weight / 100;
        const calcFunc = calculationFunctions[factor.calculationSource];
        
        if (calcFunc) {
            const task = entry.Task;
            const source = factor.calculationSource;
            let shouldCalculate = false;

            if ([TaskName.CQ, TaskName.DQ, TaskName.CDQ].includes(task)) {
                 if (['On Queue %', 'Avg Talk %', 'ASA %', 'Attendance %', 'login %', 'Mistakes %'].includes(source)) shouldCalculate = true;
            } else if ([TaskName.Dispatch, TaskName.Tickets, TaskName.VOP].includes(task)) {
                 if (['Target %', 'DS Productivity %', 'Attendance %', 'login %', 'Mistakes %'].includes(source)) shouldCalculate = true;
            } else if ([TaskName.Approve, TaskName.Missing].includes(task)) {
                 if (['AMS Productivity %', 'Attendance %', 'login %', 'Mistakes %'].includes(source)) shouldCalculate = true;
            } else if (task === TaskName.SocialMedia) {
                 if (['AMS Productivity %', 'ASA %', 'Attendance %', 'login %', 'Mistakes %'].includes(source)) shouldCalculate = true;
            } else {
                 if (['Productivity %', 'Target %', 'Attendance %', 'login %', 'Mistakes %'].includes(source)) shouldCalculate = true;
            }
            
            calculatedPercentages[factor.key] = shouldCalculate ? calcFunc(entry, weight) : 0;
        }
    }

    const bonusFactor = factors.find(f => f.calculationSource === 'Bonus %');
    if (bonusFactor) calculatedPercentages[bonusFactor.key] = entry.Bonus ?? 0;
    
    const qaFactor = factors.find(f => f.calculationSource === 'QA %');
    if (qaFactor) calculatedPercentages[qaFactor.key] = entry['QA %'] ?? 0;
    
    const pkFactor = factors.find(f => f.calculationSource === 'PK %');
    if (pkFactor) calculatedPercentages[pkFactor.key] = entry['PK %'] ?? 0;

    factors.filter(f => f.isCustom).forEach(factor => {
        calculatedPercentages[factor.key] = Number(entry[factor.key] || 0);
    });
    
    const componentSum = Object.entries(calculatedPercentages).reduce((sum, [key, value]) => {
        const factor = factors.find(f => f.key === key);
        if (factor && (factor.calculationSource === 'Bonus %' || factor.calculationSource === 'QA %' || factor.calculationSource === 'PK %' || factor.isCustom)) {
            return sum;
        }
        return sum + (Number(value) || 0);
    }, 0);

    const overall = componentSum +
                    (qaFactor ? calculatedPercentages[qaFactor.key] || 0 : 0) +
                    (pkFactor ? calculatedPercentages[pkFactor.key] || 0 : 0) +
                    (bonusFactor ? calculatedPercentages[bonusFactor.key] || 0 : 0) +
                    factors.filter(f => f.isCustom).reduce((sum, f) => sum + (calculatedPercentages[f.key] || 0), 0);

    // FIX: The `result` object literal was missing required properties from `CalculatedKpi`.
    // Adding default values for all required percentage fields ensures the object matches the type,
    // and they are then overwritten by the spread of `calculatedPercentages`.
    const result: CalculatedKpi = {
        ...entry,
        'Attendance %': 0,
        'login %': 0,
        'On Queue %': 0,
        'Target %': 0,
        'Avg Talk %': 0,
        'ASA %': 0,
        'Productivity %': 0,
        'DS Productivity %': 0,
        'AMS Productivity %': 0,
        'Mistakes %': 0,
        'Bonus %': 0,
        // FIX: Removed duplicate 'Overall %' property which caused a syntax error.
        'Team %': 0,
        ...calculatedPercentages,
        'Overall %': overall > 0 ? parseFloat(overall.toFixed(2)) : 0,
    };

    return result;
};
