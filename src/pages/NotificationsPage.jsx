import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useTheme } from '../context/ThemeContext';

const NotificationsPage = () => {
    const [notifications, setNotifications] = useState([]);
    const { primaryColor } = useTheme();

    useEffect(() => {
        fetchNotifications();
    }, []);

    const fetchNotifications = async () => {
        try {
            const res = await api.get('notifications/');
            setNotifications(res.data.results || res.data);
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.card}>
                <div style={styles.header}>
                    <h2>Notifications</h2>
                    <span style={{ color: primaryColor, cursor: 'pointer' }}>Mark all as read</span>
                </div>

                <div style={styles.list}>
                    {notifications.length > 0 ? (
                        notifications.map(notif => (
                            <div key={notif.id} style={styles.item}>
                                <div style={{ ...styles.avatar, backgroundColor: primaryColor }}>
                                    🔔
                                </div>
                                <div style={styles.content}>
                                    <div style={styles.text}>{notif.content}</div>
                                    <div style={styles.time}>{new Date(notif.timestamp).toLocaleString()}</div>
                                </div>
                                {!notif.is_read && <div style={{ ...styles.dot, backgroundColor: primaryColor }} />}
                            </div>
                        ))
                    ) : (
                        <div style={styles.empty}>No notifications yet</div>
                    )}
                </div>
            </div>
        </div>
    );
};

const styles = {
    container: { padding: '20px', display: 'flex', justifyContent: 'center' },
    card: {
        backgroundColor: 'var(--bg-paper)', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        width: '100%', maxWidth: '600px', padding: '20px', minHeight: '400px'
    },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
    list: { display: 'flex', flexDirection: 'column', gap: '10px' },
    item: {
        display: 'flex', alignItems: 'center', gap: '15px', padding: '15px', borderRadius: '10px',
        backgroundColor: 'var(--input-bg)', transition: 'background-color 0.2s'
    },
    avatar: {
        width: '50px', height: '50px', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center',
        color: '#fff', fontSize: '1.2rem'
    },
    content: { flex: 1 },
    text: { fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '4px' },
    time: { fontSize: '0.8rem', color: 'var(--text-secondary)' },
    dot: { width: '12px', height: '12px', borderRadius: '50%' },
    empty: { textAlign: 'center', color: 'var(--text-secondary)', marginTop: '50px' }
};

export default NotificationsPage;
