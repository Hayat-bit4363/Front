import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { notificationSocket } from '../services/websocket';
import { WS_BASE_URL } from '../config';

const MainLayout = () => {
    const { user } = useAuth();
    const [incomingCall, setIncomingCall] = useState(null);
    const [activeCall, setActiveCall] = useState(null);

    useEffect(() => {
        if (!user) return;

        const token = localStorage.getItem('access_token');
        const authUrl = token ? `?token=${token}` : '';

        // Connect Global Notifications
        console.log(`MainLayout: Connecting to Notification WS for ${user.username}...`);
        notificationSocket.connect(`${WS_BASE_URL}/ws/notifications/${authUrl}`);

        const handleCall = (data) => {
            console.log("MainLayout: Call Signal Received!", data);
            
            if (data.signal === 'init' && data.sender !== user.username) {
                setIncomingCall(data);
            } else if (data.signal === 'rejected') {
                alert(`${data.sender} rejected the call`);
                setIncomingCall(null);
            } else if (data.signal === 'accepted') {
                setActiveCall(data);
                setIncomingCall(null);
            } else if (data.signal === 'hangup') {
                setActiveCall(null);
                setIncomingCall(null);
            }
        };

        notificationSocket.on('call_signal', handleCall);

        return () => {
            console.log("MainLayout: Cleaning up listeners...");
            notificationSocket.off('call_signal', handleCall);
        };
    }, [user?.username]);

    const acceptCall = () => {
        const signalData = {
            type: 'call_signal',
            signal: 'accepted',
            sender: user.username,
            sender_id: user.id,
            target_user_id: incomingCall.sender_id,
            conversation_id: incomingCall.conversation_id
        };
        notificationSocket.send(signalData);
        setActiveCall(incomingCall);
        setIncomingCall(null);
    };

    const hangUp = () => {
        const targetId = activeCall.sender_id === user.id ? activeCall.target_user_id : activeCall.sender_id;
        notificationSocket.send({
            type: 'call_signal',
            signal: 'hangup',
            sender: user.username,
            target_user_id: targetId,
            conversation_id: activeCall.conversation_id
        });
        setActiveCall(null);
    };

    const rejectCall = () => {
        notificationSocket.send({
            type: 'call_signal',
            signal: 'rejected',
            sender: user.username,
            target_user_id: incomingCall.sender_id,
            conversation_id: incomingCall.conversation_id
        });
        setIncomingCall(null);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', position: 'relative' }}>
            <Navbar />
            <div style={{ flex: 1, overflowY: 'auto', backgroundColor: 'var(--bg-color)', position: 'relative' }}>
                <Outlet />
            </div>

            {/* Active Call Overlay */}
            {activeCall && (
                <div style={styles.callOverlay}>
                    <div style={styles.callCard} className="slide-up">
                        <div style={{ ...styles.callAvatar, border: '4px solid #2ecc71' }}>
                            {activeCall.sender === user.username ? activeCall.target_user_id.toString()[0] : activeCall.sender[0]?.toUpperCase()}
                        </div>
                        <h3 style={{ margin: '10px 0', color: 'white' }}>In Call with {activeCall.sender === user.username ? 'Receiver' : activeCall.sender}</h3>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '20px' }}>
                            <span className="pulse" style={{ color: '#2ecc71', fontSize: '1.5rem' }}>●</span>
                            <span style={{ color: '#2ecc71', fontWeight: 'bold' }}>Connected</span>
                        </div>
                        <button onClick={hangUp} style={{ ...styles.callBtn, backgroundColor: '#e74c3c', width: '100%' }}>Hang Up</button>
                    </div>
                </div>
            )}

            {/* Incoming Call Overlay */}
            {incomingCall && (
                <div style={styles.callOverlay}>
                    <div style={styles.callCard} className="slide-up">
                        <div style={styles.callAvatar}>
                            {incomingCall.sender[0]?.toUpperCase()}
                        </div>
                        <h3 style={{ margin: '10px 0', color: 'white' }}>{incomingCall.sender}</h3>
                        <p style={{ color: '#ccc', marginBottom: '20px' }}>Incoming {incomingCall.call_type} call...</p>
                        <div style={styles.callActions}>
                            <button onClick={acceptCall} style={{ ...styles.callBtn, backgroundColor: '#2ecc71' }}>Accept</button>
                            <button onClick={rejectCall} style={{ ...styles.callBtn, backgroundColor: '#e74c3c' }}>Reject</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const styles = {
    callOverlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        backdropFilter: 'blur(5px)'
    },
    callCard: {
        backgroundColor: '#1c1c1c',
        padding: '40px',
        borderRadius: '24px',
        textAlign: 'center',
        width: '320px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
        border: '1px solid #333'
    },
    callAvatar: {
        width: '80px',
        height: '80px',
        borderRadius: '50%',
        backgroundColor: 'var(--primary-color)',
        margin: '0 auto 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '2rem',
        color: 'white',
        fontWeight: 'bold'
    },
    callActions: {
        display: 'flex',
        gap: '15px',
        justifyContent: 'center'
    },
    callBtn: {
        padding: '12px 24px',
        borderRadius: '12px',
        border: 'none',
        color: 'white',
        fontWeight: 'bold',
        cursor: 'pointer',
        fontSize: '1rem',
        transition: 'transform 0.2s',
        flex: 1
    }
};

export default MainLayout;
