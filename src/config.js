const getBaseUrl = () => {
    return import.meta.env.VITE_API_URL || 'http://localhost:8001/api/';
};

const getWsUrl = () => {
    const apiBaseUrl = getBaseUrl();
    // If it's localhost, use ws://
    if (apiBaseUrl.includes('localhost')) {
        return 'ws://localhost:8001';
    }
    // For Railway/Production, use wss:// and the hostname from VITE_API_URL
    const url = new URL(apiBaseUrl);
    return `wss://${url.hostname}`;
};

export const API_BASE_URL = getBaseUrl();
export const WS_BASE_URL = getWsUrl();
