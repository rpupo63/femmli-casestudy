import { useState, useEffect } from 'react';
import { Coffee, Plus, X } from 'lucide-react';
import { CaffeineEntry } from '../lib/supabase';
import { caffeineApi } from '../lib/api';

const CAFFEINE_AMOUNTS: Record<string, number> = {
  'Coffee (8oz)': 95,
  'Coffee (12oz)': 140,
  'Coffee (16oz)': 190,
  'Espresso Shot': 64,
  'Double Espresso': 128,
  'Latte': 75,
  'Black Tea': 47,
  'Green Tea': 28,
  'Energy Drink': 80,
  'Cola': 34,
  'Dark Chocolate': 12
};

const TIME_PERIODS = ['Morning', 'Afternoon', 'Evening'];

function getCurrentTimePeriod(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Morning';
  if (hour < 17) return 'Afternoon';
  return 'Evening';
}

export function CaffeineLogger() {
  const [entries, setEntries] = useState<CaffeineEntry[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedType, setSelectedType] = useState('Coffee (8oz)');
  const [selectedTime, setSelectedTime] = useState(getCurrentTimePeriod);
  const [loading, setLoading] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    loadTodayLog();
  }, []);

  const loadTodayLog = async () => {
    setLoading(true);
    try {
      const { log } = await caffeineApi.getLog(today);
      if (log && log.entries) {
        setEntries(log.entries);
      } else {
        setEntries([]);
      }
    } catch (error) {
      console.error('Failed to load caffeine log:', error);
      setEntries([]);
    } finally {
      setLoading(false);
    }
  };

  const addEntry = async () => {
    const newEntry: CaffeineEntry = {
      time: selectedTime,
      amount: CAFFEINE_AMOUNTS[selectedType],
      type: selectedType
    };

    const updatedEntries = [...entries, newEntry];
    setEntries(updatedEntries);

    try {
      await caffeineApi.saveLog(today, updatedEntries);
    } catch (error) {
      console.error('Failed to save caffeine log:', error);
      // Revert on error
      setEntries(entries);
      return;
    }

    setShowModal(false);
    setSelectedType('Coffee (8oz)');
    setSelectedTime('Morning');
  };

  const removeEntry = async (index: number) => {
    const updatedEntries = entries.filter((_, i) => i !== index);
    setEntries(updatedEntries);

    try {
      await caffeineApi.saveLog(today, updatedEntries);
    } catch (error) {
      console.error('Failed to save caffeine log:', error);
      // Revert on error
      setEntries(entries);
    }
  };

  const totalCaffeine = entries.reduce((sum, entry) => sum + entry.amount, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-sand-700">Loading...</div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h2 className="text-xl sm:text-2xl font-light text-sand-900">Today's Caffeine</h2>
            <p className="text-xs sm:text-sm text-sand-700 mt-1">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</p>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="text-2xl sm:text-3xl font-light text-sand-800">{totalCaffeine}</div>
            <div className="text-xs text-sand-700">mg total</div>
          </div>
        </div>

        <div className="glass rounded-2xl p-4 sm:p-6 shadow-soft space-y-4">
          {entries.length === 0 ? (
            <div className="text-center py-8 text-sand-700">
              <Coffee className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p className="text-sm">No caffeine logged today</p>
            </div>
          ) : (
            <div className="space-y-3">
              {entries.map((entry, index) => (
                <div key={index} className="flex items-center justify-between gap-2 bg-white rounded-xl p-3 sm:p-4">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sand-900 text-sm sm:text-base truncate">{entry.type}</div>
                    <div className="text-xs sm:text-sm text-sand-600">{entry.time}</div>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                    <div className="text-right">
                      <div className="font-medium text-sand-800 text-sm sm:text-base">{entry.amount} mg</div>
                    </div>
                    <button
                      onClick={() => removeEntry(index)}
                      className="p-1 hover:bg-sand-100 rounded-lg transition-colors"
                    >
                      <X className="w-4 h-4 text-sand-600" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={() => {
              setSelectedTime(getCurrentTimePeriod());
              setShowModal(true);
            }}
            className="w-full py-4 rounded-xl bg-sand-800 text-white font-semibold hover:bg-sand-900 transition-colors shadow-warm flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            <span>Log Caffeine</span>
          </button>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4" style={{ background: 'rgba(46, 38, 31, 0.5)' }}>
          <div className="glass rounded-3xl p-4 sm:p-8 shadow-soft max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h3 className="text-lg sm:text-xl font-medium text-sand-900">Log Caffeine</h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-sand-200 rounded-xl transition-colors"
              >
                <X className="w-5 h-5 text-sand-600" />
              </button>
            </div>

            <div className="space-y-4 sm:space-y-6">
              <div>
                <label className="block text-sm font-medium text-sand-900 mb-2 sm:mb-3">What did you have?</label>
                <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                  {Object.keys(CAFFEINE_AMOUNTS).map((type) => (
                    <button
                      key={type}
                      onClick={() => setSelectedType(type)}
                      className={`py-2 sm:py-3 px-2 sm:px-4 rounded-xl text-xs sm:text-sm font-medium transition-all ${selectedType === type
                          ? 'bg-sand-800 text-white shadow-warm'
                          : 'bg-white text-sand-700 hover:bg-sand-100'
                        }`}
                    >
                      <div className="font-semibold truncate">{type}</div>
                      <div className="text-xs opacity-70">{CAFFEINE_AMOUNTS[type]}mg</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-sand-900 mb-2 sm:mb-3">When?</label>
                <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                  {TIME_PERIODS.map((time) => (
                    <button
                      key={time}
                      onClick={() => setSelectedTime(time)}
                      className={`py-2 sm:py-3 px-2 sm:px-4 rounded-xl text-xs sm:text-sm font-medium transition-all ${selectedTime === time
                          ? 'bg-sand-800 text-white shadow-warm'
                          : 'bg-white text-sand-700 hover:bg-sand-100'
                        }`}
                    >
                      {time}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={addEntry}
                className="w-full py-3 sm:py-4 rounded-xl bg-sand-800 text-white font-semibold hover:bg-sand-900 transition-colors shadow-warm"
              >
                Add to Log
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
