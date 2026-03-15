import React, { useState, useEffect, useRef } from 'react';
import Navbar from '../components/Navbar';
import { Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { notificationSocket } from '../services/websocket';
import { WS_BASE_URL } from '../config';

// WebRTC STUN server config — add more for production reliability
const ICE_SERVERS = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
    ]
};

const MainLayout = () => {
    const { user } = useAuth();

    // UI State
    const [incomingCall, setIncomingCall]   = useState(null);
    const [activeCall, setActiveCall]       = useState(null);
    const [localStream, setLocalStream]     = useState(null);  // for UI display
    const [remoteStream, setRemoteStream]   = useState(null);  // for UI display

    // Refs — accessed inside async closures, always fresh
    const pcRef             = useRef(null);
    const localStreamRef    = useRef(null);
    const candidateQueue    = useRef([]);
    const incomingCallRef   = useRef(null);   // mirror of incomingCall for closures
    const activeCallRef     = useRef(null);   // mirror of activeCall  for closures

    // Video/Audio elements
    const localVideoRef  = useRef(null);
    const remoteVideoRef = useRef(null);

    // Keep refs in sync with state
    useEffect(() => { incomingCallRef.current = incomingCall; }, [incomingCall]);
    useEffect(() => { activeCallRef.current   = activeCall;   }, [activeCall]);

    // Attach streams to video/audio elements whenever they change
    useEffect(() => {
        if (localVideoRef.current && localStream) {
            localVideoRef.current.srcObject = localStream;
        }
    }, [localStream]);

    useEffect(() => {
        if (remoteVideoRef.current && remoteStream) {
            remoteVideoRef.current.srcObject = remoteStream;
            remoteVideoRef.current.play().catch(e => console.warn('[WebRTC] Remote play blocked:', e));
        }
    }, [remoteStream]);

    // ─── Media helpers ────────────────────────────────────────────────────────

    const startMedia = async (callType) => {
        try {
            console.log('[WebRTC] Requesting media, type:', callType);
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
                video: callType === 'video'
                    ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' }
                    : false
            });
            localStreamRef.current = stream;
            setLocalStream(stream);          // triggers the useEffect above → attaches to <video>
            return stream;
        } catch (err) {
            console.error('[WebRTC] Media error:', err);
            alert('Could not access camera/microphone. Please check permissions.');
            return null;
        }
    };

    const createPC = (targetId, conversationId, stream) => {
        // Close any existing PC first
        if (pcRef.current) {
            pcRef.current.close();
            pcRef.current = null;
        }

        const pc = new RTCPeerConnection(ICE_SERVERS);

        // Send ICE candidates to the other peer
        pc.onicecandidate = (event) => {
            if (event.candidate) {
                console.log('[WebRTC] Sending ICE candidate');
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

        pc.oniceconnectionstatechange = () => {
            console.log('[WebRTC] ICE state:', pc.iceConnectionState);
        };

        // When remote tracks arrive, display them
        pc.ontrack = (event) => {
            console.log('[WebRTC] Remote track received:', event.track.kind);
            const rStream = event.streams?.[0] ?? new MediaStream([event.track]);
            setRemoteStream(rStream);  // triggers the useEffect above → attaches to <video>/<audio>
        };

        // Add local tracks
        if (stream) {
            stream.getTracks().forEach(track => {
                console.log('[WebRTC] Adding local track:', track.kind);
                pc.addTrack(track, stream);
            });
        }

        pcRef.current = pc;
        return pc;
    };

    const drainCandidateQueue = async (pc) => {
        while (candidateQueue.current.length > 0) {
            const cand = candidateQueue.current.shift();
            try { await pc.addIceCandidate(new RTCIceCandidate(cand)); }
            catch (e) { console.warn('[WebRTC] Failed to add queued candidate:', e); }
        }
    };

    // ─── Call-flow handlers ───────────────────────────────────────────────────

    // Called by the original CALLER after receiver clicks Accept
    const startCallHandshake = async (data) => {
        const callType = data.call_type || 'video';
        console.log('[WebRTC] Starting handshake as caller. callType:', callType);

        const stream = await startMedia(callType);
        if (!stream) return;

        // The target is the person who accepted (sender of the 'accepted' signal)
        const targetId = String(data.sender_id);
        const pc = createPC(targetId, data.conversation_id, stream);

        try {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            console.log('[WebRTC] Sending offer to', targetId);

            notificationSocket.send({
                type: 'call_signal',
                signal: 'offer',
                offer: offer,
                target_user_id: targetId,
                conversation_id: data.conversation_id,
                sender_id: user.id,
                call_type: callType
            });
        } catch (err) {
            console.error('[WebRTC] Error creating offer:', err);
        }
    };

    // Called on the RECEIVER's side when they get an 'offer'
    const handleOffer = async (data) => {
        console.log('[WebRTC] Received offer from', data.sender_id);
        let pc = pcRef.current;

        // If PC not ready yet (offer beat the acceptCall flow), initialize now
        if (!pc) {
            console.warn('[WebRTC] PC not found on offer, initializing...');
            const callType = data.call_type || 'video';
            const stream = await startMedia(callType);
            pc = createPC(String(data.sender_id), data.conversation_id, stream);
        }

        try {
            await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
            await drainCandidateQueue(pc);

            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            console.log('[WebRTC] Sending answer to', data.sender_id);

            notificationSocket.send({
                type: 'call_signal',
                signal: 'answer',
                answer: answer,
                target_user_id: data.sender_id,
                conversation_id: data.conversation_id,
                sender_id: user.id
            });
        } catch (err) {
            console.error('[WebRTC] Error handling offer:', err);
        }
    };

    const handleAnswer = async (data) => {
        const pc = pcRef.current;
        if (!pc) return;
        try {
            console.log('[WebRTC] Received answer');
            await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
            await drainCandidateQueue(pc);
        } catch (err) {
            console.error('[WebRTC] Error handling answer:', err);
        }
    };

    const handleCandidate = async (data) => {
        const pc = pcRef.current;
        if (pc && pc.remoteDescription?.type) {
            try { await pc.addIceCandidate(new RTCIceCandidate(data.candidate)); }
            catch (e) { console.warn('[WebRTC] Error adding candidate:', e); }
        } else {
            console.log('[WebRTC] Queuing ICE candidate');
            candidateQueue.current.push(data.candidate);
        }
    };

    const stopAllMedia = () => {
        localStreamRef.current?.getTracks().forEach(t => t.stop());
        localStreamRef.current = null;
        setLocalStream(null);
        setRemoteStream(null);
        pcRef.current?.close();
        pcRef.current = null;
        candidateQueue.current = [];
        setActiveCall(null);
        setIncomingCall(null);
    };

    // ─── Notification WS effect ───────────────────────────────────────────────

    useEffect(() => {
        if (!user) return;

        const token = localStorage.getItem('access_token');
        const authUrl = token ? `?token=${token}` : '';

        console.log('[WS] Connecting notification socket for', user.username);
        notificationSocket.connect(`${WS_BASE_URL}/ws/notifications/${authUrl}`);

        const handleCallSignal = async (data) => {
            console.log('[WebRTC] Signal received:', data.signal, 'from', data.sender_id);
            const currentUserId = String(user.id);

            if (data.signal === 'init') {
                if (String(data.sender_id) !== currentUserId) {
                    setIncomingCall(data);
                }
            } else if (data.signal === 'rejected') {
                setIncomingCall(null);
                setActiveCall(null);
                alert(`Call rejected by ${data.sender}`);

            } else if (data.signal === 'accepted') {
                // The 'accepted' signal's target_user_id is the original caller
                setActiveCall(prev => ({ ...data, call_type: data.call_type || prev?.call_type || 'video' }));
                setIncomingCall(null);

                if (String(data.target_user_id) === currentUserId) {
                    console.log('[WebRTC] I am the caller — starting handshake');
                    await startCallHandshake(data);
                }

            } else if (data.signal === 'hangup') {
                stopAllMedia();
            } else if (data.signal === 'offer') {
                await handleOffer(data);
            } else if (data.signal === 'answer') {
                await handleAnswer(data);
            } else if (data.signal === 'candidate') {
                await handleCandidate(data);
            }
        };

        notificationSocket.on('call_signal', handleCallSignal);
        return () => {
            notificationSocket.off('call_signal', handleCallSignal);
        };
    }, [user?.id]);   // only re-register when the user changes

    // ─── UI actions ───────────────────────────────────────────────────────────

    const acceptCall = async () => {
        const call = incomingCallRef.current;
        if (!call) return;

        const callType = call.call_type || 'video';
        const stream = await startMedia(callType);
        if (!stream) { rejectCall(); return; }

        const targetId = String(call.sender_id);
        createPC(targetId, call.conversation_id, stream);

        notificationSocket.send({
            type: 'call_signal',
            signal: 'accepted',
            sender: user.username,
            sender_id: String(user.id),
            target_user_id: targetId,
            conversation_id: call.conversation_id,
            call_type: callType
        });

        setActiveCall({ ...call, call_type: callType });
        setIncomingCall(null);
    };

    const hangUp = () => {
        const call = activeCallRef.current;
        if (!call) return;
        const targetId = String(call.sender_id) === String(user.id)
            ? String(call.target_user_id)
            : String(call.sender_id);
        notificationSocket.send({
            type: 'call_signal',
            signal: 'hangup',
            sender: user.username,
            target_user_id: targetId,
            conversation_id: call.conversation_id
        });
        stopAllMedia();
    };

    const rejectCall = () => {
        const call = incomingCallRef.current;
        if (!call) return;
        notificationSocket.send({
            type: 'call_signal',
            signal: 'rejected',
            sender: user.username,
            target_user_id: call.sender_id,
            conversation_id: call.conversation_id
        });
        setIncomingCall(null);
    };

    // ─── Render ───────────────────────────────────────────────────────────────

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
                                {/* Remote video fills the grid */}
                                <div style={styles.videoWrapper}>
                                    <video ref={remoteVideoRef} autoPlay playsInline style={styles.remoteVideo} />
                                    <div style={styles.videoLabel}>Remote</div>
                                </div>
                                {/* Self preview, bottom-right corner */}
                                <div style={styles.localVideoContainer}>
                                    <video ref={localVideoRef} autoPlay playsInline muted style={styles.localVideo} />
                                    <div style={styles.videoLabel}>You</div>
                                </div>
                            </div>
                        ) : (
                            /* Voice-call avatar view */
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#000', borderRadius: '16px' }}>
                                <div style={{ ...styles.callAvatar, width: '150px', height: '150px', fontSize: '4rem' }}>
                                    {activeCall.sender === user.username ? '?' : activeCall.sender[0]?.toUpperCase()}
                                </div>
                                <h2 style={{ color: 'white', marginTop: '20px' }}>Voice Call in progress…</h2>
                                {/* 1×1 invisible audio element — must NOT be display:none or some browsers block it */}
                                <audio ref={remoteVideoRef} autoPlay playsInline style={{ width: 1, height: 1, opacity: 0, position: 'absolute' }} />
                                <div style={{ marginTop: '20px', color: '#2ecc71', fontWeight: 'bold' }}>🔊 Audio Stream Active</div>
                            </div>
                        )}

                        <div style={styles.callFooter}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ ...styles.callAvatar, width: 40, height: 40, fontSize: '1.2rem', margin: 0 }}>
                                    {activeCall.sender === user.username ? 'R' : activeCall.sender[0]?.toUpperCase()}
                                </div>
                                <h3 style={{ color: 'white', margin: 0 }}>
                                    Talking with {activeCall.sender === user.username ? 'Receiver' : activeCall.sender}
                                </h3>
                            </div>
                            <button onClick={hangUp} style={{ ...styles.callBtn, backgroundColor: '#e74c3c', maxWidth: 200 }}>
                                📵 Hang Up
                            </button>
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
                        <p style={{ color: '#ccc', marginBottom: '20px' }}>
                            Incoming {incomingCall.call_type} call…
                        </p>
                        <div style={styles.callActions}>
                            <button onClick={acceptCall} style={{ ...styles.callBtn, backgroundColor: '#2ecc71' }}>✅ Accept</button>
                            <button onClick={rejectCall} style={{ ...styles.callBtn, backgroundColor: '#e74c3c' }}>❌ Reject</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const styles = {
    callOverlay: {
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        zIndex: 9999, backdropFilter: 'blur(5px)'
    },
    callCard: {
        backgroundColor: '#1c1c1c', padding: '40px', borderRadius: '24px',
        textAlign: 'center', width: '320px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
        border: '1px solid #333'
    },
    callAvatar: {
        width: '80px', height: '80px', borderRadius: '50%',
        backgroundColor: 'var(--primary-color)', margin: '0 auto 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '2rem', color: 'white', fontWeight: 'bold'
    },
    callActions: { display: 'flex', gap: '15px', justifyContent: 'center' },
    callBtn: {
        padding: '12px 24px', borderRadius: '12px', border: 'none', color: 'white',
        fontWeight: 'bold', cursor: 'pointer', fontSize: '1rem',
        transition: 'transform 0.2s', flex: 1
    },
    videoGrid: {
        flex: 1, position: 'relative', overflow: 'hidden', borderRadius: '16px',
        backgroundColor: '#000', marginBottom: '20px', display: 'flex'
    },
    videoWrapper: { flex: 1, position: 'relative' },
    remoteVideo:  { width: '100%', height: '100%', objectFit: 'cover' },
    localVideoContainer: {
        position: 'absolute', bottom: '20px', right: '20px', width: '200px', height: '150px',
        borderRadius: '12px', overflow: 'hidden', border: '2px solid rgba(255,255,255,0.2)',
        boxShadow: '0 4px 12px rgba(0,0,0,0.5)', zIndex: 10
    },
    localVideo: { width: '100%', height: '100%', objectFit: 'cover' },
    videoLabel: {
        position: 'absolute', top: '10px', left: '10px', color: '#fff', fontSize: '12px',
        backgroundColor: 'rgba(0,0,0,0.5)', padding: '2px 8px', borderRadius: '4px'
    },
    callFooter: {
        height: '80px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', padding: '0 20px', borderTop: '1px solid #333'
    }
};

export default MainLayout;
