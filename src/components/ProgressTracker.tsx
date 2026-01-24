import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Minus, Coffee, Moon } from 'lucide-react';
import { caffeineApi, sleepApi } from '../lib/api';
import { CaffeineEntry } from '../lib/supabase';

interface WeeklyStats {
  avgCaffeine: number;
  avgSleepScore: number;
  daysLogged: number;
}

function calculateWeeklyStats(
  caffeineLogs: any[],
  sleepLogs: any[],
  weekStart: Date,
  weekEnd: Date
): WeeklyStats {
  let totalCaffeine = 0;
  let totalSleep = 0;
  let caffeineDays = 0;
  let sleepDays = 0;

  caffeineLogs.forEach((log: any) => {
    const logDate = new Date(log.log_date);
    if (logDate >= weekStart && logDate <= weekEnd) {
      let entries: CaffeineEntry[] = [];
      if (Array.isArray(log.entries)) {
        entries = log.entries;
      } else if (typeof log.entries === 'string') {
        try {
          entries = JSON.parse(log.entries);
        } catch {
          entries = [];
        }
      }
      const dayTotal = entries.reduce((sum, e) => sum + (e.amount || 0), 0);
      if (dayTotal > 0) {
        totalCaffeine += dayTotal;
        caffeineDays++;
      }
    }
  });

  sleepLogs.forEach((log: any) => {
    const logDate = new Date(log.log_date);
    if (logDate >= weekStart && logDate <= weekEnd && log.sleep_score) {
      totalSleep += log.sleep_score;
      sleepDays++;
    }
  });

  return {
    avgCaffeine: caffeineDays > 0 ? totalCaffeine / caffeineDays : 0,
    avgSleepScore: sleepDays > 0 ? totalSleep / sleepDays : 0,
    daysLogged: Math.max(caffeineDays, sleepDays),
  };
}

function getPercentChange(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : null;
  return ((current - previous) / previous) * 100;
}

function TrendIndicator({
  value,
  isPositiveGood
}: {
  value: number | null;
  isPositiveGood: boolean;
}) {
  if (value === null) {
    return <Minus className="w-4 h-4 text-sand-400" />;
  }

  const isUp = value > 0;
  const isGood = isPositiveGood ? !isUp : isUp; // For caffeine, down is good

  return (
    <div className={`flex items-center gap-1 ${isGood ? 'text-emerald-600' : 'text-amber-600'}`}>
      {isUp ? (
        <TrendingUp className="w-4 h-4" />
      ) : (
        <TrendingDown className="w-4 h-4" />
      )}
      <span className="text-sm font-medium">
        {Math.abs(Math.round(value))}%
      </span>
    </div>
  );
}

export function ProgressTracker() {
  const [thisWeek, setThisWeek] = useState<WeeklyStats | null>(null);
  const [lastWeek, setLastWeek] = useState<WeeklyStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProgress();
  }, []);

  const loadProgress = async () => {
    setLoading(true);
    try {
      const [caffeineResponse, sleepResponse] = await Promise.all([
        caffeineApi.getLogs(21),
        sleepApi.getLogs(21),
      ]);

      const caffeineLogs = caffeineResponse.logs || [];
      const sleepLogs = sleepResponse.logs || [];

      const today = new Date();
      today.setHours(23, 59, 59, 999);

      // This week: last 7 days
      const thisWeekStart = new Date(today);
      thisWeekStart.setDate(thisWeekStart.getDate() - 6);
      thisWeekStart.setHours(0, 0, 0, 0);

      // Last week: 7-14 days ago
      const lastWeekEnd = new Date(thisWeekStart);
      lastWeekEnd.setDate(lastWeekEnd.getDate() - 1);
      lastWeekEnd.setHours(23, 59, 59, 999);

      const lastWeekStart = new Date(lastWeekEnd);
      lastWeekStart.setDate(lastWeekStart.getDate() - 6);
      lastWeekStart.setHours(0, 0, 0, 0);

      const thisWeekStats = calculateWeeklyStats(caffeineLogs, sleepLogs, thisWeekStart, today);
      const lastWeekStats = calculateWeeklyStats(caffeineLogs, sleepLogs, lastWeekStart, lastWeekEnd);

      setThisWeek(thisWeekStats);
      setLastWeek(lastWeekStats);
    } catch (error) {
      console.error('Failed to load progress:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="glass rounded-2xl p-4 shadow-soft animate-pulse">
        <div className="h-16 bg-sand-200 rounded-xl"></div>
      </div>
    );
  }

  if (!thisWeek || thisWeek.daysLogged === 0) {
    return null; // Don't show if no data
  }

  const caffeineChange = lastWeek && lastWeek.daysLogged > 0
    ? getPercentChange(thisWeek.avgCaffeine, lastWeek.avgCaffeine)
    : null;

  const sleepChange = lastWeek && lastWeek.daysLogged > 0
    ? getPercentChange(thisWeek.avgSleepScore, lastWeek.avgSleepScore)
    : null;

  const getMessage = () => {
    if (caffeineChange === null || sleepChange === null) {
      return "Keep logging to see your weekly trends";
    }

    if (caffeineChange < -10 && sleepChange > 5) {
      return "Great progress! Less caffeine, better sleep";
    } else if (caffeineChange > 10 && sleepChange < -5) {
      return "Your caffeine is up and sleep is down";
    } else if (caffeineChange < -5) {
      return "Nice! You're cutting back on caffeine";
    } else if (sleepChange > 5) {
      return "Your sleep is improving this week";
    } else if (Math.abs(caffeineChange) < 10 && Math.abs(sleepChange) < 5) {
      return "Staying consistent this week";
    }
    return "Track your caffeine to optimize sleep";
  };

  return (
    <div className="glass rounded-2xl p-3 sm:p-4 shadow-soft mb-6">
      <div className="text-xs text-sand-600 mb-2 sm:mb-3 font-medium">This Week vs Last Week</div>

      <div className="grid grid-cols-2 gap-2 sm:gap-4">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="flex-shrink-0 flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-amber-100">
            <Coffee className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-700" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-base sm:text-lg font-light text-sand-900 truncate">
              {Math.round(thisWeek.avgCaffeine)}mg
            </div>
            <div className="text-[10px] sm:text-xs text-sand-500">avg/day</div>
          </div>
          <TrendIndicator value={caffeineChange} isPositiveGood={false} />
        </div>

        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="flex-shrink-0 flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-indigo-100">
            <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-700" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-base sm:text-lg font-light text-sand-900 truncate">
              {Math.round(thisWeek.avgSleepScore)}
            </div>
            <div className="text-[10px] sm:text-xs text-sand-500">sleep score</div>
          </div>
          <TrendIndicator value={sleepChange} isPositiveGood={true} />
        </div>
      </div>

      <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-sand-100">
        <p className="text-[11px] sm:text-xs text-sand-600">{getMessage()}</p>
      </div>
    </div>
  );
}
