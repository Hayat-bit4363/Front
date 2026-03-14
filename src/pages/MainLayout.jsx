import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { notificationSocket } from '../services/websocket';
import { WS_BASE_URL } from '../config';

// WebRTC STUN Turn server config
const ICE_SERVERS = {
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
};

const MainLayout = () => {
    const { user } = useAuth();
    const [incomingCall, setIncomingCall] = useState(null);
    const [activeCall, setActiveCall] = useState(null);
    
    // WebRTC Refs
    const pcRef = React.useRef(null);
    const localVideoRef = React.useRef(null);
    const remoteVideoRef = React.useRef(null);
    const localStreamRef = React.useRef(null);

    useEffect(() => {
        if (activeCall && localStreamRef.current && localVideoRef.current) {
            localVideoRef.current.srcObject = localStreamRef.current;
        }
    }, [activeCall]);

    useEffect(() => {
        if (!user) return;

        const token = localStorage.getItem('access_token');
        const authUrl = token ? `?token=${token}` : '';

        // Connect Global Notifications
        console.log(`MainLayout: Connecting to Notification WS for ${user.username}...`);
        notificationSocket.connect(`${WS_BASE_URL}/ws/notifications/${authUrl}`);

        const handleCall = async (data) => {
            console.log("MainLayout: WebRTC Signal:", data.signal, "from", data.sender);
            
            const currentUserId = String(user.id);
            const dataSenderId = String(data.sender_id);
            
            if (data.signal === 'init') {
                if (dataSenderId !== currentUserId) {
                    setIncomingCall(data);
                }
            } else if (data.signal === 'rejected') {
                setIncomingCall(null);
                setActiveCall(null);
                alert(`${data.sender} rejected the call`);
            } else if (data.signal === 'accepted') {
                setActiveCall(data);
                setIncomingCall(null);
                // Sender starts the RTC Offer
                if (dataSenderId === currentUserId) {
                    await startCallHandshake(data);
                }
            } else if (data.signal === 'hangup') {
                stopAllMedia();
            } else if (data.signal === 'offer') {
                handleOffer(data);
            } else if (data.signal === 'answer') {
                handleAnswer(data);
            } else if (data.signal === 'candidate') {
                handleCandidate(data);
            }
        };

        notificationSocket.on('call_signal', handleCall);

        return () => {
            console.log("MainLayout: Cleaning up listeners...");
            notificationSocket.off('call_signal', handleCall);
        };
    }, [user?.username]);

    // --- WebRTC Logic ---
    const startMedia = async (isCaller) => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: true, 
                video: true // Always request both for now
            });
            localStreamRef.current = stream;
            if (localVideoRef.current) localVideoRef.current.srcObject = stream;
            return stream;
        } catch (err) {
            console.error("Media Error:", err);
            return null;
        }
    };

    const createPeerConnection = (targetId, conversationId) => {
        const pc = new RTCPeerConnection(ICE_SERVERS);
        
        pc.onicecandidate = (event) => {
            if (event.candidate) {
                notificationSocket.send({
                    type: 'call_signal',
                    signal: 'candidate',
                    candidate: event.candidate,
                    target_user_id: targetId,
                    conversation_id: conversationId,
                    sender_id: user.id
                });
            }
        };

        pc.ontrack = (event) => {
            console.log("WebRTC: Remote stream received");
            if (remoteVideoRef.current) {
                remoteVideoRef.current.srcObject = event.streams[0];
            }
        };

        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => {
                pc.addTrack(track, localStreamRef.current);
            });
        }

        pcRef.current = pc;
        return pc;
    };

    const startCallHandshake = async (data) => {
        const stream = await startMedia(true);
        const targetId = String(data.sender_id) === String(user.id) ? String(data.target_user_id) : String(data.sender_id);
        const pc = createPeerConnection(targetId, data.conversation_id);
        
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        
        notificationSocket.send({
            type: 'call_signal',
            signal: 'offer',
            offer: offer,
            target_user_id: targetId,
            conversation_id: data.conversation_id,
            sender_id: user.id
        });
    };

    const handleOffer = async (data) => {
        const pc = pcRef.current;
        if (!pc) return;
        
        await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        notificationSocket.send({
            type: 'call_signal',
            signal: 'answer',
            answer: answer,
            target_user_id: data.sender_id,
            conversation_id: data.conversation_id,
            sender_id: user.id
        });
    };

    const handleAnswer = async (data) => {
        const pc = pcRef.current;
        if (pc) {
            await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
        }
    };

    const handleCandidate = async (data) => {
        const pc = pcRef.current;
        if (pc) {
            await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        }
    };

    const stopAllMedia = () => {
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => track.stop());
        }
        if (pcRef.current) {
            pcRef.current.close();
            pcRef.current = null;
        }
        setActiveCall(null);
        setIncomingCall(null);
    };

    const acceptCall = async () => {
        await startMedia(false);
        const targetId = String(incomingCall.sender_id);
        createPeerConnection(targetId, incomingCall.conversation_id);

        notificationSocket.send({
            type: 'call_signal',
            signal: 'accepted',
            sender: user.username,
            sender_id: String(user.id),
            target_user_id: targetId,
            conversation_id: incomingCall.conversation_id
        });
        setActiveCall(incomingCall);
        setIncomingCall(null);
    };

    const hangUp = () => {
        const targetId = String(activeCall.sender_id) === String(user.id) ? String(activeCall.target_user_id) : String(activeCall.sender_id);
        notificationSocket.send({
            type: 'call_signal',
            signal: 'hangup',
            sender: user.username,
            target_user_id: targetId,
            conversation_id: activeCall.conversation_id
        });
        stopAllMedia();
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
                    <div style={{ ...styles.callCard, width: '90%', maxWidth: '900px', height: '80vh', display: 'flex', flexDirection: 'column' }}>
                        <div style={styles.videoGrid}>
                            <div style={styles.videoWrapper}>
                                <video ref={remoteVideoRef} autoPlay playsInline style={styles.remoteVideo} />
                                <div style={styles.videoLabel}>Remote</div>
                            </div>
                            <div style={styles.localVideoContainer}>
                                <video ref={localVideoRef} autoPlay playsInline muted style={styles.localVideo} />
                                <div style={styles.videoLabel}>Self</div>
                            </div>
                        </div>
                        
                        <div style={styles.callFooter}>
                            <h3 style={{ color: 'white' }}>Talking with {activeCall.sender === user.username ? 'Receiver' : activeCall.sender}</h3>
                            <button onClick={hangUp} style={{ ...styles.callBtn, backgroundColor: '#e74c3c', maxWidth: '200px' }}>Hang Up</button>
                        </div>
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
    },
    videoGrid: { flex: 1, position: 'relative', overflow: 'hidden', borderRadius: '16px', backgroundColor: '#000', marginBottom: '20px', display: 'flex' },
    videoWrapper: { flex: 1, position: 'relative' },
    remoteVideo: { width: '100%', height: '100%', objectFit: 'cover' },
    localVideoContainer: { 
        position: 'absolute', bottom: '20px', right: '20px', width: '200px', height: '150px',
        borderRadius: '12px', overflow: 'hidden', border: '2px solid rgba(255,255,255,0.2)',
        boxShadow: '0 4px 12px rgba(0,0,0,0.5)', zIndex: 10
    },
    localVideo: { width: '100%', height: '100%', objectFit: 'cover' },
    videoLabel: { position: 'absolute', top: '10px', left: '10px', color: '#fff', fontSize: '12px', backgroundColor: 'rgba(0,0,0,0.5)', padding: '2px 8px', borderRadius: '4px' },
    callFooter: { height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', borderTop: '1px solid #333' }
};

export default MainLayout;
