import { Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { Coffee, Moon, LineChart, Watch, X } from 'lucide-react';
import { CaffeineLogger } from './components/CaffeineLogger';
import { SleepLogger } from './components/SleepLogger';
import { Insights } from './components/Insights';
import { Auth } from './components/Auth';
import { useAuth } from './contexts/AuthContext';
import { useDemoMode } from './contexts/DemoModeContext';
import { useState } from 'react';
import { ouraApi } from './lib/api';

function App() {
  const { user, loading } = useAuth();
  const { useDemoData, setUseDemoData } = useDemoMode();
  const [showOuraConnectPopup, setShowOuraConnectPopup] = useState(false);
  const [ouraToken, setOuraToken] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleToggleClick = () => {
    if (useDemoData) {
      // User is trying to turn ON live data - show popup
      setShowOuraConnectPopup(true);
    } else {
      // User is turning OFF live data - go back to demo
      setUseDemoData(true);
    }
  };

  const handleConnectOura = async () => {
    if (!ouraToken.trim()) {
      setError('Please enter your Oura access token');
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      // Step 1: Connect Oura account (store token)
      await ouraApi.connect(ouraToken.trim());

      // Step 2: Sync Oura data (fetch and overwrite existing Oura sleep logs)
      await ouraApi.sync(14);

      // Step 3: Enable live data mode
      setUseDemoData(false);
      setShowOuraConnectPopup(false);
      setOuraToken('');

      // Reload the page to refresh data
      window.location.reload();
    } catch (err: any) {
      console.error('Failed to connect Oura:', err);
      setError(err.message || 'Failed to connect Oura account. Please check your token and try again.');
    } finally {
      setIsConnecting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-sand-700">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  return (
    <div className="min-h-screen pb-24 overflow-x-hidden">
      {/* Floating Oura Toggle */}
      <div className="fixed top-4 right-4 z-40">
        <div className="glass rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 shadow-soft border border-sand-200">
          <label className="flex items-center gap-2 sm:gap-3 cursor-pointer">
            <span className="text-[10px] sm:text-xs text-sand-700 whitespace-nowrap">Connect live data to Oura</span>
            <button
              onClick={handleToggleClick}
              className={`relative inline-flex h-5 w-9 sm:h-6 sm:w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-sand-500 focus:ring-offset-2 ${
                !useDemoData ? 'bg-green-500' : 'bg-sand-300'
              }`}
              role="switch"
              aria-checked={!useDemoData}
            >
              <span
                className={`inline-block h-4 w-4 sm:h-5 sm:w-5 transform rounded-full bg-white transition-transform ${
                  !useDemoData ? 'translate-x-5 sm:translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </label>
        </div>
      </div>

      {/* Oura Connection Popup */}
      {showOuraConnectPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4" style={{ background: 'rgba(46, 38, 31, 0.5)' }}>
          <div className="glass rounded-3xl p-4 sm:p-8 shadow-soft max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-green-100">
                  <Watch className="w-5 h-5 sm:w-6 sm:h-6 text-green-800" />
                </div>
                <h3 className="text-lg sm:text-xl font-medium text-sand-900">Connect Oura Ring</h3>
              </div>
              <button
                onClick={() => setShowOuraConnectPopup(false)}
                className="p-2 hover:bg-sand-200 rounded-xl transition-colors"
              >
                <X className="w-5 h-5 text-sand-600" />
              </button>
            </div>

            <div className="space-y-3 sm:space-y-4">
              <p className="text-sm sm:text-base text-sand-700 leading-relaxed">
                To use live Oura Ring data, you'll need to connect your Oura account. This will allow us to sync your sleep data automatically.
              </p>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-sand-900 mb-2">
                  Oura Access Token
                </label>
                <input
                  type="text"
                  value={ouraToken}
                  onChange={(e) => {
                    setOuraToken(e.target.value);
                    setError(null);
                  }}
                  placeholder="Enter your Oura API access token"
                  className="w-full px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border border-sand-200 bg-white text-sm text-sand-900 placeholder-sand-400 focus:outline-none focus:ring-2 focus:ring-sand-500 focus:border-transparent"
                  disabled={isConnecting}
                />
                <p className="text-[10px] sm:text-xs text-sand-500 mt-1.5">
                  Get your token from{' '}
                  <a
                    href="https://cloud.ouraring.com/personal-access-tokens"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sand-700 underline hover:text-sand-900"
                  >
                    Oura Cloud
                  </a>
                </p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                  <p className="text-xs sm:text-sm text-red-800">{error}</p>
                </div>
              )}

              <div className="bg-sand-50 rounded-xl p-3 sm:p-4 space-y-2">
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 flex-shrink-0"></div>
                  <p className="text-xs sm:text-sm text-sand-700">
                    Sleep metrics sync automatically each morning
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 flex-shrink-0"></div>
                  <p className="text-xs sm:text-sm text-sand-700">
                    Track sleep score, duration, deep sleep, REM, and efficiency
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 flex-shrink-0"></div>
                  <p className="text-xs sm:text-sm text-sand-700">
                    Your data is encrypted and secure
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 flex-shrink-0"></div>
                  <p className="text-xs sm:text-sm text-sand-700">
                    <strong>Note:</strong> Existing Oura sleep data will be replaced with fresh data from your ring
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-sand-100 flex flex-col sm:flex-row gap-2 sm:gap-3">
              <button
                onClick={() => {
                  setShowOuraConnectPopup(false);
                  setOuraToken('');
                  setError(null);
                }}
                disabled={isConnecting}
                className="flex-1 py-2.5 sm:py-3 px-4 rounded-xl bg-white text-sand-700 text-sm sm:text-base font-medium hover:bg-sand-100 transition-colors border border-sand-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleConnectOura}
                disabled={isConnecting || !ouraToken.trim()}
                className="flex-1 py-2.5 sm:py-3 px-4 rounded-xl bg-sand-800 text-white text-sm sm:text-base font-medium hover:bg-sand-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isConnecting ? 'Connecting...' : 'Connect Oura Ring'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-2xl mx-auto px-3 sm:px-4 pt-6 sm:pt-8">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-light text-sand-900">Rest</h1>
          <p className="text-xs sm:text-sm text-sand-700 mt-1">Track caffeine, optimize sleep</p>
        </div>

        <div className="mb-8">
          <Routes>
            <Route path="/" element={<Navigate to="/sleep" replace />} />
            <Route path="/sleep" element={<SleepLogger />} />
            <Route path="/insights" element={<Insights />} />
            <Route path="/caffeine" element={<CaffeineLogger />} />
          </Routes>
        </div>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 glass border-t border-sand-200 shadow-soft">
        <div className="max-w-2xl mx-auto px-2 sm:px-4">
          <div className="flex items-center justify-around py-3 sm:py-4">
            <NavLink
              to="/sleep"
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 sm:gap-1 px-4 sm:px-6 py-2 rounded-xl transition-colors ${
                  isActive ? 'bg-sand-800 text-white' : 'text-sand-700 hover:text-sand-900'
                }`
              }
            >
              <Moon className="w-5 h-5 sm:w-6 sm:h-6" />
              <span className="text-[10px] sm:text-xs font-medium">Sleep</span>
            </NavLink>

            <NavLink
              to="/insights"
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 sm:gap-1 px-4 sm:px-6 py-2 rounded-xl transition-colors ${
                  isActive ? 'bg-sand-800 text-white' : 'text-sand-700 hover:text-sand-900'
                }`
              }
            >
              <LineChart className="w-5 h-5 sm:w-6 sm:h-6" />
              <span className="text-[10px] sm:text-xs font-medium">Insights</span>
            </NavLink>

            <NavLink
              to="/caffeine"
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 sm:gap-1 px-4 sm:px-6 py-2 rounded-xl transition-colors ${
                  isActive ? 'bg-sand-800 text-white' : 'text-sand-700 hover:text-sand-900'
                }`
              }
            >
              <Coffee className="w-5 h-5 sm:w-6 sm:h-6" />
              <span className="text-[10px] sm:text-xs font-medium">Caffeine</span>
            </NavLink>
          </div>
        </div>
      </nav>
    </div>
  );
}

export default App;
