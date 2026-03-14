import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../services/api';
import { jwtDecode } from "jwt-decode";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check if logged in
        const token = localStorage.getItem('access_token');
        if (token) {
            try {
                const decoded = jwtDecode(token);
                // SimpleJWT encodes user_id as 'user_id'
                setUser({
                    username: decoded.username,
                    email: decoded.email,
                    id: decoded.user_id, // Map user_id from token to id
                    avatar: decoded.avatar
                });
            } catch (e) {
                console.error("Invalid token");
                logout();
            }
        }
        setLoading(false);
    }, []);

    const login = async (username, password) => {
        const response = await api.post('auth/login/', { username, password });
        const { access, refresh } = response.data;
        localStorage.setItem('access_token', access);
        localStorage.setItem('refresh_token', refresh);

        const decoded = jwtDecode(access);
        setUser({
            username: decoded.username,
            email: decoded.email,
            id: decoded.user_id,
            avatar: decoded.avatar
        });
        return response.data;
    };

    const register = async (username, email, password) => {
        try {
            const response = await api.post('send-otp/', { username, email, password });
            return response.data;
        } catch (error) {
            if (error.response?.data) {
                throw error.response.data;
            }
            throw error;
        }
    };

    const verifyEmail = async (email, code) => {
        const response = await api.post('verify-otp/', { email, code });
        return response.data;
    };

    const logout = () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, register, verifyEmail, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
