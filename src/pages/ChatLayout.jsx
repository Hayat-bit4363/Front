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
        fetchConversations();

        // Connect Global Notifications
        notificationSocket.connect(`${WS_BASE_URL}/ws/notifications/`);
        notificationSocket.on('notify', (data) => {
            console.log("Notification:", data);

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
                // Handle Friend Request
                const notif = {
                    id: Date.now(),
                    content: `New friend request from ${data.sender}`,
                    timestamp: new Date().toISOString(),
                    type: 'friend_request'
                };
                setNotifications(prev => [notif, ...prev]);
                // Ideally trigger Sidebar refresh? 
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
            chatSocket.disconnect();
        };
    }, []);

    useEffect(() => {
        if (selectedConvId) {
            fetchMessages(selectedConvId);

            chatSocket.disconnect();
            chatSocket.connect(`${WS_BASE_URL}/ws/chat/${selectedConvId}/`);

            chatSocket.on('chat_message', (data) => {
                // Signal sends 'message' which is the serialized message object
                // Support both formats if needed, but signal sends { type: 'chat_message', message: {...} }
                // Consumer sends { type: 'chat_message', message: { ... } }
                const msg = data.message;
                setMessages(prev => [...prev, msg]);

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
        <div style={styles.layout}>
            <Sidebar
                conversations={conversations}
                selectConversation={setSelectedConvId}
                selectedConversationId={selectedConvId}
                currentUser={user}
                onNewConversation={handleNewConversation}
            />
            <ChatWindow
                conversation={selectedConversation}
                messages={messages}
                currentUser={user}
                onMessageSent={() => { }}
            />
            <button onClick={logout} style={styles.logoutBtn}>Logout</button>
        </div>
    );
};

const styles = {
    layout: {
        display: 'flex', height: 'calc(100vh - 60px)', backgroundColor: 'var(--bg-color)', position: 'relative'
    },
    logoutBtn: {
        position: 'absolute', bottom: '1rem', left: '1rem',
        padding: '0.5rem 1rem', background: '#ef4444', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: 'pointer',
        zIndex: 10
    }
};

export default ChatLayout;
