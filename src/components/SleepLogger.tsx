import { useState, useEffect } from 'react';
import { Moon, Watch, TrendingUp, TrendingDown, Minus, Coffee, X } from 'lucide-react';
import { SleepLog, CaffeineEntry } from '../lib/supabase';
import { sleepApi, caffeineApi } from '../lib/api';
import { Tooltip } from './Tooltip';
import { useDemoMode } from '../contexts/DemoModeContext';
import { generateMockHealthData } from '../lib/demo-data';

interface DayData {
  date: string;
  dayLabel: string;
  sleepScore: number | null;
  totalSleep: number | null;
  deepSleep: number | null;
  remSleep: number | null;
  sleepEfficiency: number | null;
  caffeineTotal: number;
  caffeineEntries: CaffeineEntry[];
  isToday: boolean;
}

interface WeeklyStats {
  avgSleepScore: number;
  avgCaffeine: number;
  daysWithData: number;
}

function calculateWeeklyStats(days: DayData[]): WeeklyStats {
  const daysWithSleep = days.filter(d => d.sleepScore !== null);
  const daysWithCaffeine = days.filter(d => d.caffeineTotal > 0);

  return {
    avgSleepScore: daysWithSleep.length > 0
      ? daysWithSleep.reduce((sum, d) => sum + (d.sleepScore || 0), 0) / daysWithSleep.length
      : 0,
    avgCaffeine: daysWithCaffeine.length > 0
      ? daysWithCaffeine.reduce((sum, d) => sum + d.caffeineTotal, 0) / daysWithCaffeine.length
      : 0,
    daysWithData: daysWithSleep.length,
  };
}

function getPercentChange(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : null;
  return ((current - previous) / previous) * 100;
}

function TrendIndicator({ value, isPositiveGood }: { value: number | null; isPositiveGood: boolean }) {
  if (value === null) {
    return <Minus className="w-3 h-3 sm:w-4 sm:h-4 text-sand-400" />;
  }

  const isUp = value > 0;
  const isGood = isPositiveGood ? isUp : !isUp;

  return (
    <div className={`flex items-center gap-0.5 ${isGood ? 'text-emerald-600' : 'text-amber-600'}`}>
      {isUp ? (
        <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4" />
      ) : (
        <TrendingDown className="w-3 h-3 sm:w-4 sm:h-4" />
      )}
      <span className="text-xs sm:text-sm font-medium">
        {Math.abs(Math.round(value))}%
      </span>
    </div>
  );
}

function formatDuration(minutes: number | null): string {
  if (!minutes) return '--';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
}

export function SleepLogger() {
  const [thisWeekData, setThisWeekData] = useState<DayData[]>([]);
  const [lastWeekStats, setLastWeekStats] = useState<WeeklyStats | null>(null);
  const [selectedDay, setSelectedDay] = useState<DayData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(true);
  const [showOuraPopup, setShowOuraPopup] = useState(false);
  const { useDemoData } = useDemoMode();

  useEffect(() => {
    loadData();
  }, [useDemoData]);


  useEffect(() => {
    if (!isConnected) {
      setSelectedDay(null);
    }
  }, [isConnected]);

  const loadData = async () => {
    setLoading(true);
    try {
      let sleepLogs: SleepLog[] = [];
      let caffeineLogs: any[] = [];

      if (useDemoData) {
        // Use demo data generator
        const demoData = generateMockHealthData();
        sleepLogs = demoData.map(d => d.sleepLog);

        // Convert demo caffeine data to the format expected by the component
        caffeineLogs = demoData.map(d => ({
          log_date: d.date,
          entries: d.entries
        }));
      } else {
        // Fetch from API
        const [sleepResponse, caffeineResponse] = await Promise.all([
          sleepApi.getLogs(14),
          caffeineApi.getLogs(14),
        ]);

        sleepLogs = sleepResponse.logs || [];
        caffeineLogs = caffeineResponse.logs || [];
      }

      // Create lookup maps
      const sleepMap = new Map<string, SleepLog>();
      sleepLogs.forEach((log: SleepLog) => {
        const logDate = typeof log.log_date === 'string'
          ? log.log_date.split('T')[0]
          : new Date(log.log_date).toISOString().split('T')[0];
        sleepMap.set(logDate, log);
      });

      const caffeineMap = new Map<string, { total: number; entries: CaffeineEntry[] }>();
      caffeineLogs.forEach((log: any) => {
        const logDate = typeof log.log_date === 'string'
          ? log.log_date.split('T')[0]
          : new Date(log.log_date).toISOString().split('T')[0];

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
        const total = entries.reduce((sum, e) => sum + (e.amount || 0), 0);
        caffeineMap.set(logDate, { total, entries });
      });

      // Build this week's data (last 7 days)
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      const thisWeek: DayData[] = [];
      const lastWeek: DayData[] = [];

      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const dayLabel = date.toLocaleDateString('en-US', { weekday: 'short' });

        const sleepLog = sleepMap.get(dateStr);
        const caffeineData = caffeineMap.get(dateStr);

        thisWeek.push({
          date: dateStr,
          dayLabel,
          sleepScore: sleepLog?.sleep_score || null,
          totalSleep: sleepLog?.total_sleep || null,
          deepSleep: sleepLog?.deep_sleep || null,
          remSleep: sleepLog?.rem_sleep || null,
          sleepEfficiency: sleepLog?.sleep_efficiency || null,
          caffeineTotal: caffeineData?.total || 0,
          caffeineEntries: caffeineData?.entries || [],
          isToday: dateStr === todayStr,
        });
      }

      // Build last week's data (7-14 days ago)
      for (let i = 13; i >= 7; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const dayLabel = date.toLocaleDateString('en-US', { weekday: 'short' });

        const sleepLog = sleepMap.get(dateStr);
        const caffeineData = caffeineMap.get(dateStr);

        lastWeek.push({
          date: dateStr,
          dayLabel,
          sleepScore: sleepLog?.sleep_score || null,
          totalSleep: sleepLog?.total_sleep || null,
          deepSleep: sleepLog?.deep_sleep || null,
          remSleep: sleepLog?.rem_sleep || null,
          sleepEfficiency: sleepLog?.sleep_efficiency || null,
          caffeineTotal: caffeineData?.total || 0,
          caffeineEntries: caffeineData?.entries || [],
          isToday: false,
        });
      }

      setThisWeekData(thisWeek);
      setLastWeekStats(calculateWeeklyStats(lastWeek));
    } catch (error) {
      console.error('Failed to load data:', error);
      setThisWeekData([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-sand-700">Loading...</div>
      </div>
    );
  }

  const thisWeekStats = calculateWeeklyStats(thisWeekData);
  const sleepChange = lastWeekStats && lastWeekStats.daysWithData > 0
    ? getPercentChange(thisWeekStats.avgSleepScore, lastWeekStats.avgSleepScore)
    : null;
  const caffeineChange = lastWeekStats && lastWeekStats.avgCaffeine > 0
    ? getPercentChange(thisWeekStats.avgCaffeine, lastWeekStats.avgCaffeine)
    : null;

  const maxScore = 100;
  const hasData = thisWeekData.some(d => d.sleepScore !== null);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h2 className="text-xl sm:text-2xl font-light text-sand-900">Sleep</h2>
          <p className="text-xs sm:text-sm text-sand-700 mt-1">This week's overview</p>
        </div>
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          {/* Demo Toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <span className="text-[10px] sm:text-xs text-sand-600">Demo: Oura Connected</span>
            <button
              onClick={() => setIsConnected(!isConnected)}
              className={`relative inline-flex h-5 w-9 sm:h-6 sm:w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-sand-500 focus:ring-offset-2 ${isConnected ? 'bg-green-500' : 'bg-sand-300'
                }`}
              role="switch"
              aria-checked={isConnected}
            >
              <span
                className={`inline-block h-4 w-4 sm:h-5 sm:w-5 transform rounded-full bg-white transition-transform ${isConnected ? 'translate-x-5 sm:translate-x-6' : 'translate-x-1'
                  }`}
              />
            </button>
          </label>
          {isConnected && (
            <button
              onClick={() => setShowOuraPopup(true)}
              className="flex items-center gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full bg-green-100 text-green-800 text-[10px] sm:text-xs font-medium hover:bg-green-200 transition-colors cursor-pointer"
            >
              <Watch className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
              <span>Oura</span>
            </button>
          )}
        </div>
      </div>

      {/* Weekly Stats Card */}
      {isConnected && hasData && (
        <div className="glass rounded-2xl p-3 sm:p-4 shadow-soft">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs sm:text-sm text-sand-600 font-medium">Weekly Average</span>
            {sleepChange !== null && (
              <div className="flex items-center gap-1 text-xs text-sand-500">
                <span>vs last week</span>
                <TrendIndicator value={sleepChange} isPositiveGood={true} />
              </div>
            )}
          </div>

          <div className="flex items-end gap-2">
            <div className="text-3xl sm:text-4xl font-light text-sand-900">
              {Math.round(thisWeekStats.avgSleepScore)}
            </div>
            <div className="flex items-center gap-1 pb-1">
              <span className="text-sm sm:text-base text-sand-600">sleep score</span>
              <Tooltip
                title="Sleep Score"
                content="A score from 0-100 measuring overall sleep quality based on duration, efficiency, deep sleep, REM, and restfulness."
              />
            </div>
          </div>

          {thisWeekStats.avgCaffeine > 0 && (
            <div className="mt-3 pt-3 border-t border-sand-100 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-sand-600">
                <Coffee className="w-4 h-4 text-amber-600" />
                <span>{Math.round(thisWeekStats.avgCaffeine)}mg avg/day</span>
              </div>
              {caffeineChange !== null && (
                <TrendIndicator value={caffeineChange} isPositiveGood={false} />
              )}
            </div>
          )}
        </div>
      )}

      {/* Bar Chart */}
      {isConnected && hasData ? (
        <div className="glass rounded-2xl p-3 sm:p-4 shadow-soft">
          <div className="flex items-end justify-between gap-1 sm:gap-2" style={{ height: '160px' }}>
            {thisWeekData.map((day, idx) => {
              const barHeight = day.sleepScore ? (day.sleepScore / maxScore) * 100 : 0;
              const isSelected = selectedDay?.date === day.date;
              const scoreColor = day.sleepScore
                ? day.sleepScore >= 80 ? 'bg-emerald-500'
                  : day.sleepScore >= 60 ? 'bg-amber-500'
                    : 'bg-red-400'
                : 'bg-sand-200';

              return (
                <button
                  key={idx}
                  onClick={() => setSelectedDay(isSelected ? null : day)}
                  className="flex-1 flex flex-col items-center gap-1 group"
                >
                  <div className="w-full flex flex-col items-center justify-end" style={{ height: '120px' }}>
                    {day.sleepScore && (
                      <span className={`text-[10px] sm:text-xs font-medium mb-1 transition-opacity ${isSelected ? 'opacity-100 text-sand-900' : 'opacity-0 group-hover:opacity-100 text-sand-600'
                        }`}>
                        {day.sleepScore}
                      </span>
                    )}
                    <div
                      className={`w-full max-w-[32px] sm:max-w-[40px] rounded-t-lg transition-all ${scoreColor} ${isSelected ? 'ring-2 ring-sand-800 ring-offset-2' : 'hover:opacity-80'
                        }`}
                      style={{ height: `${Math.max(barHeight, 4)}%` }}
                    />
                  </div>
                  <span className={`text-[10px] sm:text-xs ${day.isToday ? 'font-bold text-sand-900' : 'text-sand-500'
                    }`}>
                    {day.dayLabel}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-3 sm:gap-4 mt-3 pt-3 border-t border-sand-100">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-[10px] sm:text-xs text-sand-500">80+</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-amber-500" />
              <span className="text-[10px] sm:text-xs text-sand-500">60-79</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-red-400" />
              <span className="text-[10px] sm:text-xs text-sand-500">&lt;60</span>
            </div>
          </div>
        </div>
      ) : isConnected ? (
        <div className="glass rounded-2xl p-8 shadow-soft text-center">
          <Moon className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 text-sand-400" />
          <p className="text-sand-700">No sleep data yet</p>
          <p className="text-xs text-sand-500 mt-1">Data will appear after your first tracked night</p>
        </div>
      ) : null}

      {/* Selected Day Details */}
      {isConnected && selectedDay && selectedDay.sleepScore && (
        <div className="glass rounded-2xl p-3 sm:p-4 shadow-soft">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="font-medium text-sand-900 text-sm sm:text-base">
                {new Date(selectedDay.date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'short',
                  day: 'numeric'
                })}
              </div>
              {selectedDay.caffeineTotal > 0 && (
                <div className="flex items-center gap-1 text-xs text-amber-600 mt-0.5">
                  <Coffee className="w-3 h-3" />
                  <span>{selectedDay.caffeineTotal}mg caffeine</span>
                </div>
              )}
            </div>
            <button
              onClick={() => setSelectedDay(null)}
              className="p-1.5 hover:bg-sand-200 rounded-lg transition-colors"
            >
              <X className="w-4 h-4 text-sand-500" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            <div className="bg-white rounded-xl p-2 sm:p-3">
              <div className="text-[10px] sm:text-xs text-sand-600 mb-0.5">Sleep Score</div>
              <div className="text-lg sm:text-xl font-semibold text-sand-900">{selectedDay.sleepScore}</div>
            </div>
            <div className="bg-white rounded-xl p-2 sm:p-3">
              <div className="text-[10px] sm:text-xs text-sand-600 mb-0.5">Total Sleep</div>
              <div className="text-lg sm:text-xl font-semibold text-sand-900">
                {formatDuration(selectedDay.totalSleep)}
              </div>
            </div>
            {selectedDay.sleepEfficiency && (
              <div className="bg-white rounded-xl p-2 sm:p-3">
                <div className="text-[10px] sm:text-xs text-sand-600 mb-0.5">Efficiency</div>
                <div className="text-lg sm:text-xl font-semibold text-sand-900">
                  {selectedDay.sleepEfficiency}%
                </div>
              </div>
            )}
            {selectedDay.deepSleep && (
              <div className="bg-white rounded-xl p-2 sm:p-3">
                <div className="text-[10px] sm:text-xs text-sand-600 mb-0.5">Deep Sleep</div>
                <div className="text-lg sm:text-xl font-semibold text-sand-900">
                  {formatDuration(selectedDay.deepSleep)}
                </div>
              </div>
            )}
          </div>

          {selectedDay.caffeineEntries.length > 0 && (
            <div className="mt-3 pt-3 border-t border-sand-100">
              <div className="text-[10px] sm:text-xs text-sand-600 mb-2">Caffeine that day</div>
              <div className="flex flex-wrap gap-1.5">
                {selectedDay.caffeineEntries.map((entry, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-lg bg-amber-50 text-amber-800 text-[10px] sm:text-xs"
                  >
                    <Coffee className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                    <span className="truncate max-w-[80px]">{entry.type}</span>
                    <span>· {entry.amount}mg</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Not connected state */}
      {!isConnected && (
        <div className="glass rounded-2xl p-6 sm:p-8 shadow-soft text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-sand-100 mb-4">
            <Watch className="w-7 h-7 sm:w-8 sm:h-8 text-sand-500" />
          </div>
          <h3 className="text-base sm:text-lg font-medium text-sand-900 mb-2">Connect Your Wearable</h3>
          <p className="text-sm text-sand-600 mb-4">
            Sync your Oura Ring to track sleep automatically.
          </p>
          <button className="px-5 py-2.5 rounded-xl bg-sand-800 text-white text-sm font-medium hover:bg-sand-900 transition-colors">
            Connect Oura Ring
          </button>
        </div>
      )}

      {/* Oura Connection Popup */}
      {showOuraPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4" style={{ background: 'rgba(46, 38, 31, 0.5)' }}>
          <div className="glass rounded-3xl p-4 sm:p-8 shadow-soft max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-green-100">
                  <Watch className="w-5 h-5 sm:w-6 sm:h-6 text-green-800" />
                </div>
                <h3 className="text-lg sm:text-xl font-medium text-sand-900">Oura Ring Connected</h3>
              </div>
              <button
                onClick={() => setShowOuraPopup(false)}
                className="p-2 hover:bg-sand-200 rounded-xl transition-colors"
              >
                <X className="w-5 h-5 text-sand-600" />
              </button>
            </div>

            <div className="space-y-3 sm:space-y-4">
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 flex-shrink-0"></div>
                <p className="text-sm sm:text-base text-sand-700 leading-relaxed">
                  Your Oura Ring is successfully connected and syncing sleep data automatically.
                </p>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 flex-shrink-0"></div>
                <p className="text-sm sm:text-base text-sand-700 leading-relaxed">
                  Sleep metrics including sleep score, duration, deep sleep, REM sleep, and efficiency are tracked each night.
                </p>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 flex-shrink-0"></div>
                <p className="text-sm sm:text-base text-sand-700 leading-relaxed">
                  Data syncs automatically when you wake up, so you can see your sleep insights right away.
                </p>
              </div>
            </div>

            <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-sand-100">
              <button
                onClick={() => setShowOuraPopup(false)}
                className="w-full py-2.5 sm:py-3 px-4 rounded-xl bg-sand-800 text-white text-sm sm:text-base font-medium hover:bg-sand-900 transition-colors"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
