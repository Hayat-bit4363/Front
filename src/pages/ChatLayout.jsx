import React, { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import ChatWindow from '../components/ChatWindow';
import api from '../services/api';
import { chatSocket, notificationSocket } from '../services/websocket';
import { WS_BASE_URL } from '../config';
import { useAuth } from '../context/AuthContext';

const ChatLayout = () => {
    const { user, logout } = useAuth();
    const [conversations, setConversations] = useState([]);
    const [selectedConvId, setSelectedConvId] = useState(null);
    const [messages, setMessages] = useState([]);
    const [notifications, setNotifications] = useState([]);

    useEffect(() => {
        if (!user) return;

        const token = localStorage.getItem('access_token');
        const authUrl = token ? `?token=${token}` : '';

        // Connect Global Notifications
        notificationSocket.connect(`${WS_BASE_URL}/ws/notifications/${authUrl}`);

        notificationSocket.on('message', (data) => {
            console.log("ChatLayout Notification received:", data);

            // Handle Message Notification
            if (data.type === 'notification' && data.notification) {
                setNotifications(prev => [data.notification, ...prev]);

                // Update conversation list logic
                if (data.notification.conversation_id) {
                    setConversations(prev => {
                        const convIndex = prev.findIndex(c => c.id === data.notification.conversation_id);
                        if (convIndex !== -1) {
                            const updatedConv = {
                                ...prev[convIndex],
                                last_message: {
                                    text: data.notification.content,
                                    timestamp: data.notification.timestamp,
                                    sender: { username: data.notification.sender }
                                }
                            };
                            const newConvs = [...prev];
                            newConvs.splice(convIndex, 1);
                            return [updatedConv, ...newConvs];
                        }
                        return prev;
                    });
                }
            } else if (data.type === 'friend_request') {
                const notif = {
                    id: Date.now(),
                    content: `New friend request from ${data.sender}`,
                    timestamp: new Date().toISOString(),
                    type: 'friend_request'
                };
                setNotifications(prev => [notif, ...prev]);
            } else if (data.type === 'request_accepted') {
                const notif = {
                    id: Date.now(),
                    content: `${data.sender} accepted your friend request`,
                    timestamp: new Date().toISOString(),
                    type: 'system'
                };
                setNotifications(prev => [notif, ...prev]);
            }
        });

        return () => {
            notificationSocket.disconnect();
        };
    }, [user?.username]);

    useEffect(() => {
        fetchConversations();
        return () => {
            chatSocket.disconnect();
        };
    }, []);

    useEffect(() => {
        if (selectedConvId) {
            fetchMessages(selectedConvId);

            const token = localStorage.getItem('access_token');
            const authUrl = token ? `?token=${token}` : '';

            chatSocket.disconnect();
            chatSocket.connect(`${WS_BASE_URL}/ws/chat/${selectedConvId}/${authUrl}`);

            chatSocket.on('chat_message', (data) => {
                const msg = data.message;
                
                if (msg.type === 'message_deleted') {
                    setMessages(prev => prev.filter(m => m.id !== msg.id));
                    return;
                }

                setMessages(prev => {
                    if (prev.find(m => m.id === msg.id)) return prev;
                    return [...prev, msg];
                });

                // Update conversation preview
                setConversations(prev => prev.map(c =>
                    c.id === selectedConvId ? { ...c, last_message: msg } : c
                ));
            });
        }
    }, [selectedConvId]);

    const fetchConversations = async () => {
        try {
            const res = await api.get('chat/conversations/');
            setConversations(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const fetchMessages = async (id) => {
        try {
            const res = await api.get(`chat/conversations/${id}/messages/`);
            setMessages(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const handleNewConversation = (conv) => {
        // Check if already exists
        const exists = conversations.find(c => c.id === conv.id);
        if (!exists) {
            setConversations(prev => [conv, ...prev]);
        }
        setSelectedConvId(conv.id);
    };

    const selectedConversation = conversations.find(c => c.id === selectedConvId);

    return (
        <div style={styles.layout} className="chat-layout">
            {/* On mobile, only show Sidebar if no conversation is selected */}
            <div style={styles.sidebarWrapper} className={selectedConvId ? 'mobile-hide' : 'sidebar-mobile'}>
                <Sidebar
                    conversations={conversations}
                    selectConversation={setSelectedConvId}
                    selectedConversationId={selectedConvId}
                    currentUser={user}
                    onNewConversation={handleNewConversation}
                />
            </div>
            
            {/* On mobile, only show ChatWindow if a conversation is selected */}
            <div style={styles.chatWrapper} className={!selectedConvId ? 'mobile-hide' : 'mobile-full'}>
                {selectedConvId && (
                    <button 
                        style={styles.backBtn} 
                        onClick={() => setSelectedConvId(null)}
                        className="mobile-back"
                    >
                        ← Back
                    </button>
                )}
                <ChatWindow
                    conversation={selectedConversation}
                    messages={messages}
                    setMessages={setMessages}
                    currentUser={user}
                    onMessageSent={(newMsg) => {
                        setMessages(prev => {
                            if (prev.find(m => m.id === newMsg.id)) return prev;
                            return [...prev, newMsg];
                        });
                        // Also update sidebar preview
                        setConversations(prev => prev.map(c =>
                            c.id === selectedConvId ? { ...c, last_message: newMsg } : c
                        ));
                    }}
                />
            </div>
            <button onClick={logout} style={styles.logoutBtn} className="mobile-hide">Logout</button>
        </div>
    );
};

const styles = {
    layout: {
        display: 'flex', height: 'calc(100vh - 60px)', backgroundColor: 'var(--bg-color)', position: 'relative', overflow: 'hidden'
    },
    sidebarWrapper: {
        height: '100%'
    },
    chatWrapper: {
        flex: 1, height: '100%', position: 'relative', display: 'flex', flexDirection: 'column'
    },
    backBtn: {
        padding: '10px 15px', background: 'var(--bg-paper)', border: 'none', borderBottom: '1px solid var(--border-color)',
        cursor: 'pointer', textAlign: 'left', fontWeight: 'bold', color: 'var(--primary-color)',
        display: 'none' // Hidden on desktop, shown via mobile-back CSS
    },
    logoutBtn: {
        position: 'absolute', bottom: '1rem', left: '1rem',
        padding: '0.5rem 1rem', background: '#ef4444', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: 'pointer',
        zIndex: 10
    }
};

export default ChatLayout;
