import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useNavigate } from 'react-router-dom';

const Navbar = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const { primaryColor } = useTheme();
    const [profileMenuOpen, setProfileMenuOpen] = useState(false);

    return (
        <div style={styles.navbar}>
            <div style={styles.left}>
                <h2 style={{ ...styles.logo, color: primaryColor }} onClick={() => navigate('/')}>HayatSocial</h2>
                <div style={styles.searchWrapper}>
                    <input placeholder="Search..." style={styles.search} />
                </div>
            </div>

            <div style={styles.center}>
                <button onClick={() => navigate('/')} style={styles.navBtn} title="Home">
                    <span style={{ fontSize: '1.8rem', color: primaryColor }}>🏠</span>
                </button>
                <button onClick={() => navigate('/messenger')} style={styles.navBtn} title="Messenger">
                    <span style={{ fontSize: '1.8rem' }}>💬</span>
                </button>
                <button onClick={() => navigate('/people')} style={styles.navBtn} title="People">
                    <span style={{ fontSize: '1.8rem' }}>👥</span>
                </button>
            </div>

            <div style={styles.right}>
                <button style={styles.iconBtn} onClick={() => navigate('/notifications')}>🔔</button>

                <div style={{ position: 'relative' }}>
                    <button
                        style={styles.profileBtn}
                        onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                    >
                        {user?.avatar ?
                            <img src={user.avatar} style={styles.avatar} /> :
                            <span style={styles.avatarPlaceholder}>{user?.username[0].toUpperCase()}</span>
                        }
                    </button>

                    {profileMenuOpen && (
                        <div style={styles.dropdown}>
                            <div style={styles.dropdownHeader}>
                                <strong>{user?.username}</strong>
                                <span style={{ fontSize: '0.8rem', color: 'gray' }}>View your profile</span>
                            </div>
                            <div style={styles.dropdownItem} onClick={() => { navigate('/profile'); setProfileMenuOpen(false); }}>
                                👤 Profile
                            </div>
                            <div style={styles.dropdownItem} onClick={() => { navigate('/settings'); setProfileMenuOpen(false); }}>
                                ⚙️ Settings
                            </div>
                            <div style={styles.dropdownItem} onClick={logout}>
                                🚪 Logout
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const styles = {
    navbar: {
        height: '60px', backgroundColor: 'var(--bg-paper)', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '0 20px', boxShadow: '0 2px 4px rgba(0,0,0,0.08)', position: 'sticky', top: 0, zIndex: 100
    },
    left: { display: 'flex', alignItems: 'center', gap: '20px' },
    logo: { fontSize: '1.8rem', margin: 0, cursor: 'pointer', fontWeight: 'bold', letterSpacing: '-0.5px' },
    searchWrapper: { position: 'relative' },
    search: {
        padding: '10px 16px', borderRadius: '30px', backgroundColor: 'var(--input-bg)', border: 'none', outline: 'none',
        width: '260px', color: 'var(--text-primary)', fontSize: '0.95rem'
    },
    center: { display: 'flex', gap: '10px', height: '100%', alignItems: 'center' },
    navBtn: {
        width: '100px', background: 'none', border: 'none', cursor: 'pointer',
        height: '50px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'background-color 0.2s'
    },
    right: { display: 'flex', alignItems: 'center', gap: '15px' },
    iconBtn: {
        width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--input-bg)', border: 'none',
        display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', fontSize: '1.2rem',
        color: 'var(--text-primary)'
    },
    profileBtn: { background: 'none', border: 'none', cursor: 'pointer', padding: 0 },
    avatar: { width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border-color)' },
    avatarPlaceholder: {
        width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--primary-color)',
        display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#fff', fontWeight: 'bold'
    },
    dropdown: {
        position: 'absolute', top: '50px', right: 0, width: '250px', backgroundColor: 'var(--bg-paper)',
        borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', padding: '10px', zIndex: 200,
        border: '1px solid var(--border-color)'
    },
    dropdownHeader: { padding: '10px', borderBottom: '1px solid var(--border-color)', marginBottom: '5px', display: 'flex', flexDirection: 'column' },
    dropdownItem: {
        padding: '10px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px',
        color: 'var(--text-primary)', fontSize: '0.95rem'
    },
};

export default Navbar;
