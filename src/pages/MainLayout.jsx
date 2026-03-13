import React from 'react';
import Navbar from '../components/Navbar';
import { Outlet } from 'react-router-dom';

const MainLayout = () => {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
            <Navbar />
            <div style={{ flex: 1, overflowY: 'auto', backgroundColor: 'var(--bg-color)', position: 'relative' }}>
                <Outlet />
            </div>
        </div>
    );
};

export default MainLayout;
