import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { chatSocket, notificationSocket } from '../services/websocket';
import { BASE_URL } from '../config';

const ChatWindow = ({ conversation, messages, currentUser, onMessageSent, setMessages }) => {
    const [text, setText] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);
    const [audioBlob, setAudioBlob] = useState(null);
    const [isRecording, setIsRecording] = useState(false);
    const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, msgId: null });

    // Media Recorder Ref
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const [audioExt, setAudioExt] = useState('webm');

    const endRef = useRef(null);
    const fileInputRef = useRef(null);
    const longPressTimer = useRef(null);

    const getMediaUrl = (path) => {
        if (!path) return null;
        if (path.startsWith('http')) return path;
        const cleanBase = BASE_URL.replace(/\/$/, '');
        const cleanPath = path.startsWith('/') ? path : `/${path}`;
        const finalUrl = `${cleanBase}${cleanPath}`;
        console.log("Media URL debug:", { original: path, final: finalUrl });
        return finalUrl;
    };

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            // Comprehensive MIME type check for cross-browser recording (Safari likes mp4/aac, Chrome likes webm)
            const mimeTypes = [
                'audio/webm;codecs=opus',
                'audio/webm',
                'audio/mp4',
                'audio/mp4;codecs=mp4a.40.2',
                'audio/aac',
                'audio/ogg;codecs=opus',
                'audio/wav'
            ];
            const supportedType = mimeTypes.find(type => MediaRecorder.isTypeSupported(type));
            console.log("Using MIME type for recording:", supportedType);
            
            mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: supportedType });

            mediaRecorderRef.current.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorderRef.current.onstop = () => {
                const extension = supportedType.split('/')[1]?.split(';')[0] || 'webm';
                setAudioExt(extension);
                const blob = new Blob(audioChunksRef.current, { type: supportedType });
                setAudioBlob(blob);
                audioChunksRef.current = [];
            };

            mediaRecorderRef.current.start();
            setIsRecording(true);
        } catch (err) {
            console.error("Error accessing microphone:", err);
            alert("Could not access microphone. Please check permissions.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            // Stop tracks
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        }
    };

    const handleSend = async (e) => {
        if (e) e.preventDefault();
        if ((!text.trim() && !image && !audioBlob) || !conversation) return;

        const formData = new FormData();
        formData.append('conversation', conversation.id);
        if (text) formData.append('text', text);
        if (selectedFile) formData.append('image', selectedFile); // Backend field name is still 'image'
        if (audioBlob) formData.append('audio', audioBlob, `voice_note.${audioExt}`);

        try {
            const res = await api.post('chat/messages/', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            onMessageSent(res.data);
            setText('');
            setSelectedFile(null);
            setAudioBlob(null);
        } catch (err) {
            console.error("Send failed", err);
        }
    };

    const initiateCall = (type) => {
        if (!conversation || !other.id) {
            console.error("Cannot initiate call: missing conversation or target user ID", { conversation, other });
            return;
        }
        
        const signalData = {
            type: 'call_signal',
            signal: 'init',
            call_type: type,
            sender: currentUser.username,
            sender_id: Number(currentUser.id),
            target_user_id: Number(other.id),
            conversation_id: conversation.id
        };

        console.log("Sending call signal:", signalData);
        notificationSocket.send(signalData);
        
        alert(`Initiating ${type} call to ${name}... (Wait for receiver)`);
    };

    const handleContextMenu = (e, msgId) => {
        if (e && e.preventDefault) e.preventDefault();
        
        let x = 0, y = 0;
        if (e.changedTouches && e.changedTouches.length > 0) {
            x = e.changedTouches[0].pageX;
            y = e.changedTouches[0].pageY;
        } else {
            x = e.pageX;
            y = e.pageY;
        }

        // Adjust for screen edges on mobile
        if (window.innerWidth < 768) {
            if (x > window.innerWidth - 180) x = window.innerWidth - 180;
        }

        setContextMenu({ visible: true, x, y, msgId });
    };

    const handleTouchStart = (e, msgId) => {
        const touch = e.touches[0];
        const eventCopy = {
            changedTouches: [{ pageX: touch.pageX, pageY: touch.pageY }],
            preventDefault: () => e.preventDefault()
        };
        longPressTimer.current = setTimeout(() => {
            handleContextMenu(eventCopy, msgId);
        }, 600); // Long press duration
    };

    const handleTouchEnd = () => {
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
        }
    };

    const handleAction = async (action) => {
        const msgId = contextMenu.msgId;
        setContextMenu({ ...contextMenu, visible: false });
        
        // Optimistic Delete
        if (action === 'delete_me' || action === 'delete_everyone') {
            setMessages(prev => prev.filter(m => m.id !== msgId));
        }

        try {
            if (action === 'delete_me') {
                await api.delete(`chat/messages/${msgId}/action/?type=me`);
            } else if (action === 'delete_everyone') {
                await api.delete(`chat/messages/${msgId}/action/?type=everyone`);
            } else if (action === 'star') {
                await api.post(`chat/messages/${msgId}/star/`);
            }
        } catch (e) { 
            console.error(e);
            // Revert on error? (Optional for simplified UX)
            alert("Action failed. Please refresh.");
        }
    };

    // Close menu on click
    useEffect(() => {
        const close = () => setContextMenu({ ...contextMenu, visible: false });
        document.addEventListener('click', close);
        return () => document.removeEventListener('click', close);
    }, [contextMenu]);

    if (!conversation) {
        return (
            <div style={styles.placeholder}>
                <div style={{ fontSize: '4rem', marginBottom: '20px' }}>💬</div>
                <h2 style={{ color: 'var(--text-primary)' }}>Start a Conversation</h2>
                <p>Select a chat or start a new one.</p>
            </div>
        );
    }

    const otherParticipants = conversation.participants ? conversation.participants.filter(p => p.username !== currentUser?.username) : [];
    const other = otherParticipants[0] || {};
    const name = other.username || 'Self';

    // Wallpaper
    const backgroundImage = currentUser?.wallpaper ? `url(${currentUser.wallpaper})` : 'none';
    const backgroundColor = currentUser?.wallpaper ? 'transparent' : '#efeae2'; // Fallback

    return (
        <div style={{ ...styles.container, backgroundImage, backgroundColor }}>
            {/* Overlay for better text readability if wallpaper is busy - optional */}
            <div style={styles.overlay} />

            <div style={styles.header}>
                <div style={styles.userInfo}>
                    <div style={styles.avatar}>
                        {other.avatar ? <img src={getMediaUrl(other.avatar)} style={styles.avatarImg} /> : name[0]?.toUpperCase()}
                    </div>
                    <div>
                        <h3 style={styles.headerName}>{name}</h3>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Online</span>
                    </div>
                </div>
                <div style={styles.headerActions}>
                    <button style={styles.iconBtn} onClick={() => initiateCall('voice')}>📞</button>
                    <button style={styles.iconBtn} onClick={() => initiateCall('video')}>📹</button>
                    <button style={styles.iconBtn}>🔍</button>
                </div>
            </div>

            <div style={styles.messages}>
                {messages.map((msg, idx) => {
                    const isMe = msg.sender.username === currentUser?.username;
                    return (
                        <div
                            key={idx}
                            style={{ ...styles.messageRow, justifyContent: isMe ? 'flex-end' : 'flex-start' }}
                            onContextMenu={(e) => handleContextMenu(e, msg.id)}
                            onTouchStart={(e) => handleTouchStart(e, msg.id)}
                            onTouchEnd={handleTouchEnd}
                            onTouchMove={handleTouchEnd}
                        >
                            <div style={{
                                ...styles.bubble,
                                backgroundColor: isMe ? 'var(--primary-color)' : 'var(--bg-paper)',
                                color: isMe ? '#fff' : 'var(--text-primary)',
                                borderRadius: isMe ? '12px 12px 0 12px' : '12px 12px 12px 0'
                            }}>
                                {msg.image && (
                                    <div style={styles.msgImageContainer}>
                                        <img src={getMediaUrl(msg.image)} style={styles.msgImage} alt="sent" />
                                    </div>
                                )}
                                {msg.audio && (
                                    <div style={{ margin: '8px 0' }}>
                                        <audio 
                                            controls 
                                            src={getMediaUrl(msg.audio)} 
                                            style={{ maxWidth: '100%', height: '35px' }} 
                                            preload="metadata"
                                        />
                                    </div>
                                )}
                                {msg.text && <div style={styles.msgText}>{msg.text}</div>}

                                <span style={{ ...styles.time, color: isMe ? 'rgba(255,255,255,0.7)' : 'var(--text-secondary)' }}>
                                    {msg.is_edited && <span style={{ fontSize: '10px', marginRight: '4px' }}>Edited</span>}
                                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    {isMe && <span style={styles.doubleCheck}> ✓✓</span>}
                                </span>
                            </div>
                        </div>
                    );
                })}
                <div ref={endRef} />
            </div>

            {/* Context Menu */}
            {contextMenu.visible && (
                <div style={{ ...styles.contextMenu, top: contextMenu.y, left: contextMenu.x }}>
                    <div onClick={() => handleAction('star')} style={styles.menuItem}>Star</div>
                    <div onClick={() => handleAction('delete_me')} style={styles.menuItem}>Delete for me</div>
                    <div onClick={() => handleAction('delete_everyone')} style={styles.menuItem}>Delete for everyone</div>
                </div>
            )}

            <form style={styles.inputArea} onSubmit={handleSend}>
                <button type="button" style={styles.iconBtn} onClick={() => fileInputRef.current?.click()}>📎</button>
                <input
                    type="file"
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    onChange={e => setSelectedFile(e.target.files[0])}
                    accept="image/*,video/*"
                />

                {selectedFile && (
                    <div style={styles.preview}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, overflow: 'hidden' }}>
                            <span>{selectedFile.type.startsWith('image/') ? '📷' : '🎥'}</span>
                            <span style={styles.truncateText}>{selectedFile.name}</span>
                        </div>
                        <button type="button" onClick={() => setSelectedFile(null)} style={styles.clearBtn}>✕</button>
                    </div>
                )}

                {audioBlob ? (
                    <div style={styles.preview}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                            <span>🎤 Voice Note recorded</span>
                        </div>
                        <button type="button" onClick={() => setAudioBlob(null)} style={styles.clearBtn}>✕</button>
                    </div>
                ) : (
                    <>
                        {isRecording ? (
                            <div style={{ flex: 1, color: 'red', display: 'flex', alignItems: 'center' }}>Recording... <button type="button" onClick={stopRecording} style={{ marginLeft: '10px' }}>Stop</button></div>
                        ) : (
                            <input
                                style={styles.input}
                                value={text}
                                onChange={e => setText(e.target.value)}
                                placeholder="Type a message"
                            />
                        )}
                    </>
                )}

                {!isRecording && !audioBlob && !text && !selectedFile && (
                    <button type="button" style={styles.iconBtn} onClick={startRecording}>🎤</button>
                )}

                {(text.length > 0 || selectedFile || audioBlob) && !isRecording && (
                    <button type="submit" style={styles.sendBtn}>➤</button>
                )}
            </form>
        </div>
    );
};

const styles = {
    container: { flex: 1, display: 'flex', flexDirection: 'column', height: '100%', backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative' },
    overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.3)', pointerEvents: 'none', zIndex: 0 },
    placeholder: { flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-color)' },
    header: {
        padding: '10px 20px', backgroundColor: 'var(--bg-paper)', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        boxShadow: '0 1px 2px rgba(0,0,0,0.05)', zIndex: 1, height: '60px'
    },
    userInfo: { display: 'flex', alignItems: 'center', gap: '15px' },
    avatar: {
        width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#dfe5e7',
        display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden'
    },
    avatarImg: { width: '100%', height: '100%', objectFit: 'cover' },
    headerName: { fontSize: '1rem', fontWeight: '600', margin: 0, color: 'var(--text-primary)' },
    headerActions: { display: 'flex', gap: '20px' },
    messages: {
        flex: 1, padding: '20px 5%', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px', zIndex: 1
    },
    messageRow: { display: 'flex', marginBottom: '8px' },
    bubble: {
        maxWidth: '70%', padding: '8px 12px', boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
        position: 'relative', fontSize: '14.5px', lineHeight: '1.4'
    },
    msgImageContainer: { marginBottom: '5px', borderRadius: '8px', overflow: 'hidden' },
    msgImage: { maxWidth: '100%', display: 'block' },
    msgText: { marginBottom: '0' },
    time: { fontSize: '11px', float: 'right', marginTop: '4px', marginLeft: '10px', display: 'flex', alignItems: 'center' },
    doubleCheck: { marginLeft: '3px', fontWeight: 'bold' },
    inputArea: {
        padding: '10px 20px', backgroundColor: 'var(--bg-paper)', display: 'flex', alignItems: 'center', gap: '15px',
        minHeight: '70px', boxShadow: '0 -1px 2px rgba(0,0,0,0.05)', zIndex: 1
    },
    input: {
        flex: 1, padding: '12px 16px', borderRadius: '24px', border: 'none',
        backgroundColor: 'var(--input-bg)', fontSize: '15px', outline: 'none', color: 'var(--text-primary)', minWidth: 0
    },
    iconBtn: { background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', color: 'var(--text-secondary)', transition: 'color 0.2s', flexShrink: 0 },
    sendBtn: { 
        backgroundColor: 'var(--primary-color)', color: '#fff', width: '40px', height: '40px', borderRadius: '50%',
        border: 'none', fontSize: '1.2rem', cursor: 'pointer', transition: 'transform 0.1s', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
    },
    preview: { fontSize: '0.8rem', padding: '8px 12px', backgroundColor: 'var(--input-bg)', borderRadius: '12px', display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '5px' },
    truncateText: { overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', flex: 1, maxWidth: '180px' },
    clearBtn: { background: 'none', border: 'none', color: '#667781', cursor: 'pointer', fontSize: '1.2rem', padding: '0 5px' },
    contextMenu: {
        position: 'fixed', backgroundColor: 'var(--bg-paper)', boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        borderRadius: '8px', padding: '5px 0', zIndex: 1000, color: 'var(--text-primary)'
    },
    menuItem: { padding: '10px 20px', cursor: 'pointer', fontSize: '14px', ':hover': { backgroundColor: 'var(--input-bg)' } }
};

export default ChatWindow;
