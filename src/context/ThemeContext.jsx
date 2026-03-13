import React, { createContext, useState, useContext, useEffect } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
    // Default to 'blue' theme
    const [primaryColor, setPrimaryColor] = useState(localStorage.getItem('primaryColor') || '#1877f2');
    const [darkMode, setDarkMode] = useState(localStorage.getItem('darkMode') === 'true');

    useEffect(() => {
        const root = document.documentElement;
        root.style.setProperty('--primary-color', primaryColor);

        if (darkMode) {
            root.style.setProperty('--bg-color', '#18191a');
            root.style.setProperty('--bg-paper', '#242526');
            root.style.setProperty('--text-primary', '#e4e6eb');
            root.style.setProperty('--text-secondary', '#b0b3b8');
            root.style.setProperty('--border-color', '#3e4042');
            root.style.setProperty('--input-bg', '#3a3b3c');
        } else {
            root.style.setProperty('--bg-color', '#f0f2f5');
            root.style.setProperty('--bg-paper', '#ffffff');
            root.style.setProperty('--text-primary', '#050505');
            root.style.setProperty('--text-secondary', '#65676b');
            root.style.setProperty('--border-color', '#ced0d4');
            root.style.setProperty('--input-bg', '#f0f2f5');
        }

        localStorage.setItem('primaryColor', primaryColor);
        localStorage.setItem('darkMode', darkMode);
    }, [primaryColor, darkMode]);

    return (
        <ThemeContext.Provider value={{ primaryColor, setPrimaryColor, darkMode, setDarkMode }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => useContext(ThemeContext);
