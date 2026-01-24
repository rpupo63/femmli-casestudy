import { useState, useEffect, useRef } from 'react';
import { TrendingUp, Activity, BarChart3, Coffee, Clock, X } from 'lucide-react';
import { CaffeineEntry } from '../lib/supabase';
import { caffeineApi, sleepApi } from '../lib/api';
import { generateMockHealthData } from '../lib/demo-data';
import { Tooltip } from './Tooltip';
import { useDemoMode } from '../contexts/DemoModeContext';

interface DayData {
  date: string;
  caffeine: number;
  sleepScore: number;
  entries: CaffeineEntry[];
}

export function Insights() {
  const [data, setData] = useState<DayData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPoint, setSelectedPoint] = useState<DayData | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const { useDemoData } = useDemoMode();

  useEffect(() => {
    loadData();
  }, [useDemoData]);

  const loadData = async () => {
    setLoading(true);

    if (useDemoData) {
      // Use simulated data generator
      const demoData = generateMockHealthData();
      setData(demoData);
      setLoading(false);
      return;
    }

    try {
      // Fetch caffeine logs and sleep logs
      const [caffeineResponse, sleepResponse] = await Promise.all([
        caffeineApi.getLogs(14),
        sleepApi.getLogs(14),
      ]);

      const caffeineLogs = caffeineResponse.logs || [];
      const sleepLogs = sleepResponse.logs || [];


      // Create maps for easy lookup
      const caffeineMap = new Map<string, { total: number; entries: CaffeineEntry[] }>();
      const sleepMap = new Map<string, number>();

      caffeineLogs.forEach((log: any) => {
        // Ensure entries is an array (handle JSONB parsing)
        let entries: CaffeineEntry[] = [];
        if (Array.isArray(log.entries)) {
          entries = log.entries;
        } else if (typeof log.entries === 'string') {
          try {
            entries = JSON.parse(log.entries);
          } catch (e) {
            console.warn('Failed to parse entries:', e);
            entries = [];
          }
        }

        // Normalize log_date to YYYY-MM-DD format (handle both date strings and timestamps)
        const logDate = typeof log.log_date === 'string'
          ? log.log_date.split('T')[0]
          : new Date(log.log_date).toISOString().split('T')[0];

        const total = entries.reduce((sum: number, entry: CaffeineEntry) => sum + (entry.amount || 0), 0);
        if (total > 0 || entries.length > 0) {
          caffeineMap.set(logDate, { total, entries });
        }
      });

      sleepLogs.forEach((log: any) => {
        if (log.sleep_score) {
          // Normalize log_date to YYYY-MM-DD format (handle both date strings and timestamps)
          const logDate = typeof log.log_date === 'string'
            ? log.log_date.split('T')[0]
            : new Date(log.log_date).toISOString().split('T')[0];
          sleepMap.set(logDate, log.sleep_score);
        }
      });

      // Combine data for the last 14 days - only include days with real data
      const combinedData: DayData[] = [];
      const today = new Date();

      for (let i = 0; i < 14; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateString = date.toISOString().split('T')[0];

        const caffeineData = caffeineMap.get(dateString);
        const sleepScore = sleepMap.get(dateString);

        // Only include data points where we have both caffeine and sleep data
        // This ensures the scatter plot shows real correlations, not fabricated ones
        if (caffeineData && sleepScore) {
          combinedData.push({
            date: dateString,
            caffeine: caffeineData.total,
            sleepScore,
            entries: caffeineData.entries,
          });
        } else if (caffeineData && !sleepScore) {
          // If we have caffeine data but no sleep data, still include for caffeine stats
          combinedData.push({
            date: dateString,
            caffeine: caffeineData.total,
            sleepScore: 0, // Mark as 0 to indicate no sleep data
            entries: caffeineData.entries,
          });
        } else if (sleepScore && !caffeineData) {
          // If we have sleep data but no caffeine data (no caffeine that day)
          combinedData.push({
            date: dateString,
            caffeine: 0,
            sleepScore,
            entries: [],
          });
        }
      }

      combinedData.sort((a, b) => a.date.localeCompare(b.date));

      setData(combinedData);
    } catch (error) {
      console.error('Failed to load insights data:', error);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to determine if a time entry is morning (before 2pm)
  const isMorningTime = (timeStr: string): boolean => {
    const time = timeStr.toLowerCase();
    if (time === 'morning') return true;
    if (time === 'afternoon' || time === 'evening') return false;
    // Try to parse as time string (HH:MM format)
    const hourMatch = timeStr.match(/^(\d+):/);
    if (hourMatch) {
      const hour = parseInt(hourMatch[1]);
      return hour < 14; // Before 2pm
    }
    return false; // Default to afternoon if can't parse
  };

  const getInsights = () => {
    // Filter for data with valid sleep scores for sleep-related insights
    const dataWithSleep = data.filter(d => d.sleepScore > 0);

    if (data.length === 0) {
      return {
        description: "Start logging your caffeine to see personalized insights.",
        recommendation: ""
      };
    }

    const avgCaffeine = data.reduce((sum, d) => sum + d.caffeine, 0) / data.length;

    let morningCaffeine = 0;
    let afternoonCaffeine = 0;
    let morningDays = 0;
    let afternoonDays = 0;
    let teaAmount = 0;
    let coffeeAmount = 0;

    data.forEach(day => {
      day.entries.forEach(entry => {
        const amount = entry.amount;
        const isMorning = isMorningTime(entry.time);

        if (isMorning) {
          morningCaffeine += amount;
          morningDays++;
        } else {
          afternoonCaffeine += amount;
          afternoonDays++;
        }

        if (entry.type.toLowerCase().includes('tea')) {
          teaAmount += amount;
        } else if (entry.type.toLowerCase().includes('coffee') || entry.type.toLowerCase().includes('espresso')) {
          coffeeAmount += amount;
        }
      });
    });

    // Only consider days with valid sleep data for sleep-related calculations
    const lowCaffeineDays = dataWithSleep.filter(d => d.caffeine < 150);
    const highCaffeineDays = dataWithSleep.filter(d => d.caffeine > 250);

    const avgLowSleep = lowCaffeineDays.length > 0
      ? lowCaffeineDays.reduce((sum, d) => sum + d.sleepScore, 0) / lowCaffeineDays.length
      : 0;
    const avgHighSleep = highCaffeineDays.length > 0
      ? highCaffeineDays.reduce((sum, d) => sum + d.sleepScore, 0) / highCaffeineDays.length
      : 0;

    let description = "";
    let recommendation = "";

    if (avgCaffeine > 250) {
      const sleepDiff = Math.round(avgLowSleep - avgHighSleep);
      description = `Your caffeine intake averages ${Math.round(avgCaffeine)}mg per day. On high-caffeine days (250mg+), your sleep quality drops by ${sleepDiff} points compared to low-caffeine days.`;

      if (afternoonCaffeine > morningCaffeine * 0.4) {
        recommendation = "Try limiting caffeine after 2pm. Morning coffee is fine, but afternoon caffeine significantly impacts sleep quality.";
      } else if (teaAmount > coffeeAmount) {
        recommendation = "Tea in the afternoon has less impact than coffee. Consider switching afternoon coffee to tea, or cut afternoon caffeine entirely.";
      } else {
        recommendation = "Cut back to under 200mg daily. Start by reducing your afternoon coffee intake first.";
      }
    } else if (avgCaffeine > 150 && avgCaffeine <= 250) {
      description = `Your caffeine intake averages ${Math.round(avgCaffeine)}mg per day, which is moderate. The data shows a clear relationship between higher caffeine and lower sleep scores.`;

      if (afternoonCaffeine > morningCaffeine * 0.3) {
        recommendation = "Your timing could be better. Morning caffeine (before noon) has minimal sleep impact. Try avoiding caffeine after 2pm.";
      } else {
        recommendation = "You're in a good range. Keep caffeine in the morning and you'll maintain better sleep quality.";
      }
    } else {
      description = `Your caffeine intake averages ${Math.round(avgCaffeine)}mg per day, which is low. Your sleep quality remains consistently good.`;

      if (morningDays > afternoonDays * 2) {
        recommendation = "You're doing great! Keeping caffeine in the morning hours is the ideal pattern for sleep quality.";
      } else {
        recommendation = "Your moderate intake works well. If you ever increase, stick to morning consumption for best sleep results.";
      }
    }

    return { description, recommendation };
  };

  const getInsightBubbles = () => {
    if (data.length === 0) return [];

    const avgCaffeine = data.reduce((sum, d) => sum + d.caffeine, 0) / data.length;

    let coffeeTotal = 0;
    let teaTotal = 0;
    let morningTotal = 0;
    let afternoonTotal = 0;

    data.forEach(day => {
      day.entries.forEach(entry => {
        const type = entry.type.toLowerCase();

        if (type.includes('coffee') || type.includes('espresso')) {
          coffeeTotal += entry.amount;
        } else if (type.includes('tea')) {
          teaTotal += entry.amount;
        }

        if (isMorningTime(entry.time)) {
          morningTotal += entry.amount;
        } else {
          afternoonTotal += entry.amount;
        }
      });
    });

    const totalCaffeine = coffeeTotal + teaTotal;
    const coffeePercent = totalCaffeine > 0 ? Math.round((coffeeTotal / totalCaffeine) * 100) : 0;
    const morningPercent = (morningTotal + afternoonTotal) > 0
      ? Math.round((morningTotal / (morningTotal + afternoonTotal)) * 100)
      : 0;

    const bubbles = [
      {
        Icon: BarChart3,
        value: `${Math.round(avgCaffeine)}mg`,
        label: 'Daily Average',
        insight: `Your typical daily intake over the past 2 weeks`,
        color: 'text-amber-600'
      },
      {
        Icon: Coffee,
        value: `${coffeePercent}%`,
        label: coffeePercent > 60 ? 'Coffee Drinker' : 'Tea Preference',
        insight: coffeePercent > 60
          ? 'Most of your caffeine comes from coffee'
          : 'You prefer tea over coffee',
        color: coffeePercent > 60 ? 'text-amber-700' : 'text-green-600'
      },
      {
        Icon: Clock,
        value: `${morningPercent}%`,
        label: 'Timing Pattern',
        insight: morningPercent > 70
          ? 'Great! Most caffeine before 2pm'
          : 'Consider shifting to earlier hours',
        color: morningPercent > 70 ? 'text-emerald-600' : 'text-orange-600'
      }
    ];

    return bubbles;
  };

  const insights = getInsights();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-sand-700">Loading insights...</div>
      </div>
    );
  }

  const maxCaffeine = 400;
  const maxSleep = 100;

  const getColorForType = (entries: CaffeineEntry[]) => {
    const typeTotals: { [key: string]: number } = {};

    entries.forEach(entry => {
      const type = entry.type.toLowerCase();
      if (type.includes('tea')) {
        typeTotals['tea'] = (typeTotals['tea'] || 0) + entry.amount;
      } else if (type.includes('coffee') || type.includes('espresso')) {
        typeTotals['coffee'] = (typeTotals['coffee'] || 0) + entry.amount;
      } else {
        typeTotals['other'] = (typeTotals['other'] || 0) + entry.amount;
      }
    });

    const dominantType = Object.entries(typeTotals).sort((a, b) => b[1] - a[1])[0]?.[0];

    if (dominantType === 'tea') return 'bg-green-500';
    if (dominantType === 'coffee') return 'bg-amber-600';
    return 'bg-orange-500';
  };

  const calculateTrendLine = () => {
    // Only use data points with valid sleep scores for the trend line
    const validData = data.filter(d => d.sleepScore > 0);
    if (validData.length < 2) return null;

    const n = validData.length;
    const sumX = validData.reduce((sum, d) => sum + d.caffeine, 0);
    const sumY = validData.reduce((sum, d) => sum + d.sleepScore, 0);
    const sumXY = validData.reduce((sum, d) => sum + d.caffeine * d.sleepScore, 0);
    const sumX2 = validData.reduce((sum, d) => sum + d.caffeine * d.caffeine, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return { slope, intercept };
  };

  const trendLine = calculateTrendLine();

  return (
    <div className="space-y-6 sm:space-y-12">
      <div className="flex items-center gap-2 sm:gap-3">
        <TrendingUp className="text-sand-700" size={24} strokeWidth={1.5} />
        <h2 className="text-xl sm:text-2xl font-light text-sand-900">Insights</h2>
      </div>

      {data.length > 0 && (
        <>
          <div className="glass rounded-3xl p-4 sm:p-10 shadow-sm border border-sand-100/50">
            <div className="flex items-start justify-between mb-4 sm:mb-8">
              <div>
                <h3 className="text-lg font-light text-sand-900 flex items-center gap-2">
                  Caffeine & Sleep Quality
                  <Tooltip
                    title="Sleep Score"
                    content="A score from 0-100 measuring overall sleep quality based on duration, efficiency, deep sleep, REM, and restfulness."
                  />
                  {useDemoData && (
                    <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full border border-amber-200">
                      SIMULATED DATA
                    </span>
                  )}
                </h3>
                <p className="text-xs text-sand-500 mt-1">Tap any point to see details</p>
              </div>
            </div>
            <div className="space-y-4 sm:space-y-6">
              <div ref={chartRef} className="relative rounded-2xl bg-gradient-to-br from-sand-50/50 to-white p-3 sm:p-6" style={{ height: '320px' }}>
                <div className="absolute left-2 sm:left-6 top-3 sm:top-6 bottom-3 sm:bottom-6 flex flex-col justify-between text-xs text-sand-400 pr-1 sm:pr-3">
                  <span className="font-light text-[10px] sm:text-xs">100</span>
                  <span className="font-light text-[10px] sm:text-xs">80</span>
                  <span className="font-light text-[10px] sm:text-xs">60</span>
                  <span className="font-light text-[10px] sm:text-xs">40</span>
                  <span className="font-light text-[10px] sm:text-xs">20</span>
                </div>

                <div className="hidden sm:block absolute left-0 top-1/2 -translate-y-1/2 -rotate-90 text-xs text-sand-500 whitespace-nowrap font-light">
                  Sleep Score
                </div>

                <div className="ml-6 sm:ml-12 h-full border-l border-b border-sand-200/50 relative">
                  <div className="absolute inset-0 flex flex-col justify-between">
                    {[20, 40, 60, 80].map(val => (
                      <div
                        key={val}
                        className="border-b border-sand-100/30"
                      />
                    ))}
                  </div>

                  <div className="absolute inset-0">
                    {trendLine && (
                      <svg className="w-full h-full absolute inset-0" style={{ overflow: 'visible' }}>
                        <line
                          x1="0%"
                          y1={`${100 - ((trendLine.slope * 0 + trendLine.intercept) / maxSleep * 100)}%`}
                          x2="100%"
                          y2={`${100 - ((trendLine.slope * maxCaffeine + trendLine.intercept) / maxSleep * 100)}%`}
                          stroke="#D97706"
                          strokeWidth="1.5"
                          strokeDasharray="4,4"
                          opacity="0.25"
                        />
                      </svg>
                    )}

                    {data.filter(day => day.sleepScore > 0).map((day, index) => {
                      const jitterX = (Math.random() - 0.5) * 3;
                      const jitterY = (Math.random() - 0.5) * 3;
                      const x = (day.caffeine / maxCaffeine) * 100 + jitterX;
                      const y = 100 - (day.sleepScore / maxSleep) * 100 + jitterY;

                      const isSelected = selectedPoint?.date === day.date;

                      return (
                        <button
                          key={index}
                          onClick={() => setSelectedPoint(isSelected ? null : day)}
                          className={`absolute w-5 h-5 sm:w-4 sm:h-4 ${getColorForType(day.entries)} rounded-full border-2 border-white shadow-md transition-all cursor-pointer ${isSelected ? 'scale-150 ring-2 ring-sand-400 ring-offset-2' : 'hover:scale-125'
                            }`}
                          style={{
                            left: `${Math.max(2, Math.min(98, x))}%`,
                            top: `${Math.max(2, Math.min(98, y))}%`,
                            transform: 'translate(-50%, -50%)'
                          }}
                          aria-label={`${day.caffeine}mg caffeine, ${day.sleepScore} sleep score`}
                        />
                      );
                    })}
                  </div>
                </div>

                <div className="absolute bottom-0 left-6 sm:left-12 right-2 sm:right-6 flex justify-between text-[10px] sm:text-xs text-sand-400 font-light mt-3">
                  <span>0</span>
                  <span>100</span>
                  <span>200</span>
                  <span>300</span>
                  <span>400+</span>
                </div>

                {selectedPoint && (
                  <div className="absolute top-2 left-2 right-2 sm:left-auto sm:top-4 sm:right-4 glass rounded-xl p-3 sm:p-4 shadow-lg border border-sand-200 sm:max-w-[200px] z-10">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="text-xs font-medium text-sand-900">
                        {new Date(selectedPoint.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      </div>
                      <button onClick={() => setSelectedPoint(null)} className="p-0.5 hover:bg-sand-200 rounded">
                        <X className="w-3 h-3 text-sand-500" />
                      </button>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <Coffee className="w-3.5 h-3.5 text-amber-600" />
                        <span className="text-sm text-sand-700">{selectedPoint.caffeine}mg caffeine</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Activity className="w-3.5 h-3.5 text-indigo-600" />
                        <span className="text-sm text-sand-700">{selectedPoint.sleepScore} sleep score</span>
                        <Tooltip
                          title="Sleep Score"
                          content="A score from 0-100 measuring overall sleep quality based on duration, efficiency, deep sleep, REM, and restfulness."
                        />
                      </div>
                      {selectedPoint.entries.length > 0 && (
                        <div className="pt-1.5 border-t border-sand-100 mt-1.5">
                          <div className="text-[10px] text-sand-500 mb-1">Beverages:</div>
                          {selectedPoint.entries.slice(0, 3).map((entry, i) => (
                            <div key={i} className="text-[10px] text-sand-600">{entry.type} ({entry.amount}mg)</div>
                          ))}
                          {selectedPoint.entries.length > 3 && (
                            <div className="text-[10px] text-sand-400">+{selectedPoint.entries.length - 3} more</div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="text-center text-xs text-sand-500 font-light">
                Daily Caffeine (mg)
              </div>

              <div className="flex items-center justify-center gap-4 sm:gap-8 text-xs sm:text-sm pt-2 flex-wrap">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-amber-600 shadow-sm" />
                  <span className="text-sand-600 font-light">Coffee</span>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-green-500 shadow-sm" />
                  <span className="text-sand-600 font-light">Tea</span>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-orange-500 shadow-sm" />
                  <span className="text-sand-600 font-light">Other</span>
                </div>
              </div>

              <div className="bg-amber-50 rounded-xl p-3 sm:p-4 text-center">
                <p className="text-xs sm:text-sm text-amber-800">
                  <strong>Tip:</strong> Points in the upper-left (low caffeine, high sleep) represent your best nights.
                  Try to shift more days toward that zone.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-6">
            {getInsightBubbles().map((bubble, index) => {
              const IconComponent = bubble.Icon;
              return (
                <div key={index} className="glass rounded-2xl sm:rounded-3xl p-4 sm:p-8 shadow-sm border border-sand-100/50 hover:shadow-md transition-all">
                  <div className={`${bubble.color} mb-2 sm:mb-4`}>
                    <IconComponent size={24} strokeWidth={1.5} className="sm:w-8 sm:h-8" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-light text-sand-900 mb-1 sm:mb-2">{bubble.value}</div>
                  <div className="text-xs sm:text-sm font-medium text-sand-700 mb-2 sm:mb-3">{bubble.label}</div>
                  <div className="text-[11px] sm:text-xs text-sand-600 leading-relaxed font-light">{bubble.insight}</div>
                </div>
              );
            })}
          </div>

          {(insights.description || insights.recommendation) && (
            <div className="glass rounded-2xl sm:rounded-3xl p-4 sm:p-10 shadow-sm border border-sand-100/50">
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="mt-0.5 sm:mt-1 flex-shrink-0">
                  <TrendingUp className="text-amber-600 w-5 h-5 sm:w-6 sm:h-6" strokeWidth={1.5} />
                </div>
                <div className="flex-1 min-w-0 space-y-3 sm:space-y-4">
                  <h4 className="text-lg sm:text-xl font-light text-sand-900">Your Pattern</h4>
                  <p className="text-sm sm:text-base text-sand-700 leading-relaxed">
                    {insights.description}
                  </p>
                  {insights.recommendation && (
                    <div className="pt-2 sm:pt-3 border-t border-sand-100">
                      <p className="text-sm sm:text-base text-sand-900 font-medium">
                        {insights.recommendation}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {data.length === 0 && (
        <div className="glass rounded-2xl p-8 sm:p-12 shadow-soft text-center">
          <Activity className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4 text-sand-400" />
          <p className="text-sm sm:text-base text-sand-600">No data yet. Start logging your caffeine to see insights.</p>
        </div>
      )}
    </div>
  );
}
