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
    
    // WebRTC & Stream State
    const pcRef = React.useRef(null);
    const localVideoRef = React.useRef(null);
    const remoteVideoRef = React.useRef(null);
    const [localStream, setLocalStream] = useState(null);
    const [remoteStream, setRemoteStream] = useState(null);
    const candidateQueue = React.useRef([]);

    useEffect(() => {
        if (activeCall) {
            console.log("Syncing media streams to elements...");
            // Sync local stream
            if (localStream && localVideoRef.current) {
                if (localVideoRef.current.srcObject !== localStream) {
                    localVideoRef.current.srcObject = localStream;
                }
            }
            // Sync remote stream
            if (remoteStream && remoteVideoRef.current) {
                if (remoteVideoRef.current.srcObject !== remoteStream) {
                    remoteVideoRef.current.srcObject = remoteStream;
                    remoteVideoRef.current.play().catch(e => console.warn("Auto-play failed:", e));
                }
            }
        }
    }, [activeCall, localStream, remoteStream]);

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
                // Ensure we carry over the call_type from our local state if it's missing in the signal
                setActiveCall(prev => ({ ...data, call_type: data.call_type || prev?.call_type || 'video' }));
                setIncomingCall(null);
                
                // CRITICAL FIX: The person who sent the init (original caller) 
                // is now the target of the 'accepted' signal and should start the handshake.
                if (String(data.target_user_id) === currentUserId) {
                    console.log("Accepted! Initiating handshake as original caller...");
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
    const startMedia = async (callType) => {
        try {
            console.log("Requesting media for:", callType);
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }, 
                video: callType === 'video' ? {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    facingMode: 'user'
                } : false
            });
            setLocalStream(stream);
            return stream;
        } catch (err) {
            console.error("Media Error:", err);
            alert("Could not access camera/microphone. Please check permissions.");
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
            console.log("WebRTC: Remote track received");
            const rStream = event.streams[0] || new MediaStream([event.track]);
            setRemoteStream(rStream);
        };

        if (localStream) {
            localStream.getTracks().forEach(track => {
                pc.addTrack(track, localStream);
            });
        }

        pcRef.current = pc;
        return pc;
    };

    const startCallHandshake = async (data) => {
        const callType = data.call_type || (activeCall ? activeCall.call_type : 'video');
        const stream = await startMedia(callType);
        if (!stream) return;

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
        console.log("Received WebRTC Offer");
        let pc = pcRef.current;
        
        // If PC doesn't exist (e.g., offer arrived very fast), set it up
        if (!pc) {
            console.log("PC not ready for offer, initializing...");
            const callType = data.call_type || 'video';
            await startMedia(callType);
            pc = createPeerConnection(String(data.sender_id), data.conversation_id);
        }
        
        try {
            await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
            
            // Process queued candidates
            while (candidateQueue.current.length > 0) {
                const cand = candidateQueue.current.shift();
                await pc.addIceCandidate(new RTCIceCandidate(cand));
            }

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
        } catch (err) {
            console.error("Error handling offer:", err);
        }
    };

    const handleAnswer = async (data) => {
        const pc = pcRef.current;
        if (pc) {
            try {
                await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
                // Process queued candidates
                while (candidateQueue.current.length > 0) {
                    const cand = candidateQueue.current.shift();
                    await pc.addIceCandidate(new RTCIceCandidate(cand));
                }
            } catch (err) {
                console.error("Error handling answer:", err);
            }
        }
    };

    const handleCandidate = async (data) => {
        const pc = pcRef.current;
        if (pc && pc.remoteDescription && pc.remoteDescription.type) {
            try {
                await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
            } catch (e) {
                console.warn("Error adding received ice candidate", e);
            }
        } else {
            console.log("Queuing ICE candidate (remote description not set yet)");
            candidateQueue.current.push(data.candidate);
        }
    };

    const stopAllMedia = () => {
        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
            setLocalStream(null);
        }
        if (remoteStream) {
            remoteStream.getTracks().forEach(track => track.stop());
            setRemoteStream(null);
        }
        if (pcRef.current) {
            pcRef.current.close();
            pcRef.current = null;
        }
        candidateQueue.current = [];
        setActiveCall(null);
        setIncomingCall(null);
    };

    const acceptCall = async () => {
        const callType = incomingCall.call_type || 'video';
        const stream = await startMedia(callType);
        if (!stream) {
            rejectCall();
            return;
        }

        const targetId = String(incomingCall.sender_id);
        createPeerConnection(targetId, incomingCall.conversation_id);

        notificationSocket.send({
            type: 'call_signal',
            signal: 'accepted',
            sender: user.username,
            sender_id: String(user.id),
            target_user_id: targetId,
            conversation_id: incomingCall.conversation_id,
            call_type: callType
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
                    <div style={{ ...styles.callCard, width: '95%', maxWidth: '900px', height: '85vh', display: 'flex', flexDirection: 'column' }}>
                        
                        {activeCall.call_type === 'video' ? (
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
                        ) : (
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#000', borderRadius: '16px' }}>
                                <div style={{ ...styles.callAvatar, width: '150px', height: '150px', fontSize: '4rem' }}>
                                    {activeCall.sender === user.username ? '?' : activeCall.sender[0]?.toUpperCase()}
                                </div>
                                <h2 style={{ color: 'white', marginTop: '20px' }}>Voice Call in progress...</h2>
                                <audio ref={remoteVideoRef} autoPlay playsInline style={{ width: '1px', height: '1px', opacity: 0 }} />
                                <div style={{ marginTop: '20px', color: '#2ecc71', fontWeight: 'bold' }}>Active Audio Stream</div>
                            </div>
                        )}
                        
                        <div style={styles.callFooter}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                <div style={{ ...styles.callAvatar, width: '40px', height: '40px', fontSize: '1.2rem', margin: 0 }}>
                                    {activeCall.sender === user.username ? 'R' : activeCall.sender[0]?.toUpperCase()}
                                </div>
                                <h3 style={{ color: 'white' }}>Talking with {activeCall.sender === user.username ? 'Receiver' : activeCall.sender}</h3>
                            </div>
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
