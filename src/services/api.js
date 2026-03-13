import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8001/api/',
    headers: {
        'Content-Type': 'application/json',
    },
});

api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('access_token');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        if (error.response && error.response.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            try {
                const refreshToken = localStorage.getItem('refresh_token');
                const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8001/api/';
                const response = await axios.post(`${baseURL}auth/token/refresh/`, {
                    refresh: refreshToken,
                });
                const { access } = response.data;
                localStorage.setItem('access_token', access);
                api.defaults.headers.common['Authorization'] = `Bearer ${access}`;
                return api(originalRequest);
            } catch (err) {
                console.error("RefreshToken failed");
                // Optional: logout
            }
        }
        return Promise.reject(error);
    }
);

export default api;
