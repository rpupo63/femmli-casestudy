import { useState, useMemo } from 'react';
import { Coffee, Check, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface PasswordValidation {
  minLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
}

function validatePassword(password: string): PasswordValidation {
  return {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  };
}

function PasswordRequirement({ met, label }: { met: boolean; label: string }) {
  return (
    <div className={`flex items-center gap-2 text-xs ${met ? 'text-green-600' : 'text-sand-500'}`}>
      {met ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
      <span>{label}</span>
    </div>
  );
}

export function Auth() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, signUp: signUpFn } = useAuth();

  const emailValid = useMemo(() => EMAIL_REGEX.test(email), [email]);
  const passwordValidation = useMemo(() => validatePassword(password), [password]);
  const passwordValid = useMemo(
    () => Object.values(passwordValidation).every(Boolean),
    [passwordValidation]
  );

  const canSubmit = isSignUp
    ? emailValid && passwordValid
    : email.length > 0 && password.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (isSignUp && !emailValid) {
      setError('Please enter a valid email address');
      return;
    }

    if (isSignUp && !passwordValid) {
      setError('Password does not meet requirements');
      return;
    }

    setLoading(true);

    try {
      if (isSignUp) {
        await signUpFn(email, password);
      } else {
        await signIn(email, password);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-3 sm:p-4 overflow-x-hidden">
      <div className="w-full max-w-md">
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-sand-200 mb-3 sm:mb-4">
            <Coffee className="w-7 h-7 sm:w-8 sm:h-8 text-sand-700" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-light text-sand-900 mb-2">Rest</h1>
          <p className="text-sm sm:text-base text-sand-700">Track caffeine, optimize sleep</p>
        </div>

        <div className="glass rounded-2xl sm:rounded-3xl p-5 sm:p-8 shadow-soft">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-sand-700 mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl bg-white border text-sm sm:text-base text-sand-900 focus:outline-none focus:ring-2 transition-all ${
                  email.length > 0 && isSignUp
                    ? emailValid
                      ? 'border-green-300 focus:ring-green-200'
                      : 'border-red-300 focus:ring-red-200'
                    : 'border-sand-200 focus:ring-sand-300'
                }`}
                placeholder="your@email.com"
                required
              />
              {isSignUp && email.length > 0 && !emailValid && (
                <p className="text-xs text-red-500 mt-1">Please enter a valid email address</p>
              )}
            </div>

            <div>
              <label className="block text-sm text-sand-700 mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl bg-white border text-sm sm:text-base text-sand-900 focus:outline-none focus:ring-2 transition-all ${
                  password.length > 0 && isSignUp
                    ? passwordValid
                      ? 'border-green-300 focus:ring-green-200'
                      : 'border-red-300 focus:ring-red-200'
                    : 'border-sand-200 focus:ring-sand-300'
                }`}
                placeholder="••••••••"
                required
              />
              {isSignUp && password.length > 0 && (
                <div className="mt-2 space-y-1">
                  <PasswordRequirement met={passwordValidation.minLength} label="At least 8 characters" />
                  <PasswordRequirement met={passwordValidation.hasUppercase} label="One uppercase letter" />
                  <PasswordRequirement met={passwordValidation.hasLowercase} label="One lowercase letter" />
                  <PasswordRequirement met={passwordValidation.hasNumber} label="One number" />
                  <PasswordRequirement met={passwordValidation.hasSpecial} label="One special character" />
                </div>
              )}
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 px-4 py-2 rounded-lg">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !canSubmit}
              className="w-full py-3 rounded-xl bg-sand-800 text-white font-medium hover:bg-sand-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Please wait...' : isSignUp ? 'Create Account' : 'Sign In'}
            </button>
          </form>

          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="w-full mt-4 text-sm text-sand-700 hover:text-sand-900 transition-colors font-medium"
          >
            {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
          </button>
        </div>
      </div>
    </div>
  );
}
