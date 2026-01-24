const API_URL = import.meta.env.VITE_API_URL || '/api';

// Get auth token from localStorage
const getToken = () => {
    return localStorage.getItem('auth_token');
};

// Set auth token in localStorage
const setToken = (token: string) => {
    localStorage.setItem('auth_token', token);
};

// Remove auth token from localStorage
const removeToken = () => {
    localStorage.removeItem('auth_token');
};

// Make authenticated API request
const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
    const token = getToken();
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string>),
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers,
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(error.error || `HTTP error! status: ${response.status}`);
    }

    return response.json();
};

// Auth API
export const authApi = {
    signUp: async (email: string, password: string) => {
        const data = await apiRequest('/auth/signup', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        });
        setToken(data.token);
        return data;
    },

    signIn: async (email: string, password: string) => {
        const data = await apiRequest('/auth/signin', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        });
        setToken(data.token);
        return data;
    },

    getMe: async () => {
        return apiRequest('/auth/me');
    },

    signOut: () => {
        removeToken();
    },
};

// Caffeine logs API
export const caffeineApi = {
    getLog: async (date?: string) => {
        const endpoint = date ? `/caffeine-logs/${date}` : '/caffeine-logs';
        return apiRequest(endpoint);
    },

    getLogs: async (limit?: number) => {
        const params = limit ? `?limit=${limit}` : '';
        return apiRequest(`/caffeine-logs${params}`);
    },

    saveLog: async (logDate: string, entries: any[], notes?: string | null) => {
        const normalizedEntries = Array.isArray(entries)
            ? entries.map((entry) => ({
                  time: entry?.time ?? '',
                  type: entry?.type ?? '',
                  amount: typeof entry?.amount === 'number' ? entry.amount : Number(entry?.amount),
              }))
            : [];
        return apiRequest('/caffeine-logs', {
            method: 'POST',
            body: JSON.stringify({
                log_date: logDate,
                entries: normalizedEntries,
                notes: notes ?? null,
            }),
        });
    },
};

// Sleep logs API
export const sleepApi = {
    getLog: async (date?: string) => {
        const endpoint = date ? `/sleep-logs/${date}` : '/sleep-logs';
        return apiRequest(endpoint);
    },

    getLogs: async (limit?: number) => {
        const params = limit ? `?limit=${limit}` : '';
        return apiRequest(`/sleep-logs${params}`);
    },

    saveLog: async (logData: {
        log_date: string;
        sleep_score?: number;
        total_sleep?: number;
        deep_sleep?: number;
        rem_sleep?: number;
        light_sleep?: number;
        sleep_efficiency?: number;
        restfulness?: number;
        source?: string;
    }) => {
        return apiRequest('/sleep-logs', {
            method: 'POST',
            body: JSON.stringify(logData),
        });
    },
};

// Oura Integration API
export const ouraApi = {
    connect: async (accessToken: string, refreshToken?: string, expiresIn?: number) => {
        return apiRequest('/integrations/oura/connect', {
            method: 'POST',
            body: JSON.stringify({
                access_token: accessToken,
                refresh_token: refreshToken,
                expires_in: expiresIn,
            }),
        });
    },

    sync: async (days: number = 14) => {
        return apiRequest('/integrations/oura/sync', {
            method: 'POST',
            body: JSON.stringify({ days }),
        });
    },

    getStatus: async () => {
        return apiRequest('/integrations/oura/status');
    },

    disconnect: async () => {
        return apiRequest('/integrations/oura/disconnect', {
            method: 'DELETE',
        });
    },
};
