import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [accessToken, setAccessToken] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    // Initial check: attempt to refresh token on load to see if session exists
    useEffect(() => {
        refreshSession();
    }, []);

    const refreshSession = async () => {
        try {
            const res = await fetch('/api/auth/refresh', { method: 'POST' });
            const result = await res.json();
            if (result.success) {
                setUser(result.user);
                setAccessToken(result.accessToken);
            } else {
                setUser(null);
                setAccessToken(null);
            }
        } catch (error) {
            console.error('Refresh session failed:', error);
            setUser(null);
        } finally {
            setIsLoading(false);
        }
    };

    const login = async (email, password) => {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const result = await res.json();
        if (result.success) {
            setUser(result.user);
            setAccessToken(result.accessToken);
            return { success: true };
        }
        return { success: false, error: result.error };
    };

    const register = async (email, password) => {
        const res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const result = await res.json();
        if (result.success) {
            setUser(result.user);
            setAccessToken(result.accessToken);
            return { success: true };
        }
        return { success: false, error: result.error };
    };

    const logout = async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        setUser(null);
        setAccessToken(null);
    };

    const getToken = async () => {
        // Simple logic: if we have a token, return it. 
        // A more robust implementation would check expiry and call refreshSession if needed.
        return accessToken;
    };

    return (
        <AuthContext.Provider value={{
            user,
            accessToken,
            setAccessToken,
            isLoading,
            login,
            register,
            logout,
            getToken,
            refreshSession
        }}>
            {!isLoading && children}
        </AuthContext.Provider>
    );
};
