import React, { useState } from 'react';
import api from '../services/api';

import PeoplePage from '../pages/PeoplePage';
import { BASE_URL } from '../config';

const Sidebar = ({ conversations, selectConversation, selectedConversationId, currentUser, onNewConversation }) => {
    const [activeTab, setActiveTab] = useState('chats'); // chats, status, calls, settings
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [showSearch, setShowSearch] = useState(false);

    const getMediaUrl = (path) => {
        if (!path) return null;
        if (path.startsWith('http')) return path;
        return `${BASE_URL.replace(/\/$/, '')}${path}`;
    };

    const handleSearch = async (e) => {
        setSearchTerm(e.target.value);
        if (e.target.value.length > 2) {
            try {
                const res = await api.get(`auth/search/?q=${e.target.value}`);
                setSearchResults(res.data);
            } catch (err) {
                console.error(err);
            }
        } else {
            setSearchResults([]);
        }
    };

    const startChat = async (userId) => {
        try {
            const res = await api.post('chat/conversations/', { participant_id: userId });
            onNewConversation(res.data);
            setShowSearch(false);
            setSearchTerm('');
        } catch (e) {
            console.error("Failed to start chat", e);
        }
    };

    return (
        <div style={styles.sidebar}>
            {/* Header / Nav */}
            <div style={styles.header}>
                <div style={styles.avatar}>
                    {currentUser?.avatar ? <img src={getMediaUrl(currentUser.avatar)} style={styles.avatarImg} /> : currentUser?.username[0].toUpperCase()}
                </div>
                <div style={styles.navIcons}>
                    <button onClick={() => setActiveTab('chats')} style={{ ...styles.iconBtn, color: activeTab === 'chats' ? 'var(--primary-color)' : '#54656f' }} title="Chats">💬</button>
                    <button onClick={() => setActiveTab('status')} style={{ ...styles.iconBtn, color: activeTab === 'status' ? 'var(--primary-color)' : '#54656f' }} title="Status">⭕</button>
                    <button onClick={() => setShowSearch(!showSearch)} style={styles.iconBtn} title="New Chat">➕</button>
                    <button onClick={() => setActiveTab('settings')} style={{ ...styles.iconBtn, color: activeTab === 'settings' ? 'var(--primary-color)' : '#54656f' }} title="Settings">⚙️</button>
                </div>
            </div>

            {/* Search */}
            {activeTab === 'chats' && (
                <div style={styles.searchBar}>
                    <input
                        style={styles.searchInput}
                        placeholder="Search or start new chat"
                        value={searchTerm}
                        onChange={handleSearch}
                        onFocus={() => setShowSearch(true)}
                    />
                </div>
            )}

            {/* Content Area */}
            <div style={styles.list}>
                {activeTab === 'chats' && (
                    <>
                        {/* Chat List */}
                        {showSearch && searchResults.length > 0 ? (
                            searchResults.map(user => (
                                <div key={user.id} style={styles.item} onClick={() => startChat(user.id)}>
                                    <div style={styles.avatar}>
                                        {user.avatar ? <img src={getMediaUrl(user.avatar)} style={styles.avatarImg} /> : user.username[0].toUpperCase()}
                                    </div>
                                    <div style={styles.info}>
                                        <div style={styles.name}>{user.username}</div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            conversations.map(conv => {
                                const otherParticipants = conv.participants ? conv.participants.filter(p => p.username !== currentUser?.username) : [];
                                const other = otherParticipants[0] || {};
                                const name = other.username || 'Self';
                                const isSelected = selectedConversationId === conv.id;

                                return (
                                    <div
                                        key={conv.id}
                                        style={{ ...styles.item, backgroundColor: isSelected ? 'var(--bg-paper)' : 'transparent', borderLeft: isSelected ? '3px solid var(--primary-color)' : '3px solid transparent' }}
                                        onClick={() => selectConversation(conv.id)}
                                    >
                                        <div style={styles.avatar}>
                                            {other.avatar ? <img src={getMediaUrl(other.avatar)} style={styles.avatarImg} /> : name[0]?.toUpperCase()}
                                        </div>
                                        <div style={styles.info}>
                                            <div style={styles.topRow}>
                                                <div style={styles.name}>{name}</div>
                                                <div style={styles.date}>
                                                    {conv.last_message ? new Date(conv.last_message.timestamp).toLocaleDateString() : ''}
                                                </div>
                                            </div>
                                            <div style={styles.preview}>
                                                {conv.last_message ? (
                                                    conv.last_message.image ? '📷 Photo' : (conv.last_message.text || '').substring(0, 30)
                                                ) : 'Empty'}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </>
                )}

                {/* People tab removed - moved to Main Layout */}

                {activeTab === 'status' && (
                    <div style={styles.placeholderState}>
                        <h4>Status</h4>
                        <div style={styles.item}>
                            <div style={styles.avatar}>+</div>
                            <div style={styles.info}>
                                <div style={styles.name}>My Status</div>
                                <div style={styles.preview}>Click to add status update</div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'settings' && (
                    <div style={styles.settingsList}>
                        {/* We can navigate to settings page or render it here? 
                             The user has a full SettingsPage. Let's redirect or simple list.
                             Ideally clicking settings icon navigates to /settings route in MainLayout.
                             But here we are in Sidebar. Let's just link to /settings using window.location or navigate.
                             For now, placeholder.
                          */}
                        <div style={styles.item} onClick={() => window.location.href = '/settings'}>⚙️ Open Settings Page</div>
                        <div style={styles.item}>🔔 Notifications</div>
                        <div style={styles.item}>🔒 Privacy</div>
                        <div style={styles.item} onClick={() => alert('Logout logic here')}>Log out</div>
                    </div>
                )}
            </div>
        </div>
    );
};

const styles = {
    sidebar: {
        width: '400px', borderRight: '1px solid #d1d7db', display: 'flex', flexDirection: 'column',
        backgroundColor: '#fff', height: '100vh'
    },
    header: {
        height: '60px', padding: '10px 16px', backgroundColor: '#f0f2f5',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        borderBottom: '1px solid #d1d7db'
    },
    navIcons: { display: 'flex', gap: '15px' },
    iconBtn: { background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#54656f' },
    avatar: {
        width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#dfe5e7',
        display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#fff', overflow: 'hidden'
    },
    avatarImg: { width: '100%', height: '100%', objectFit: 'cover' },
    searchBar: { padding: '8px', backgroundColor: '#fff', borderBottom: '1px solid #f0f2f5' },
    searchInput: {
        width: '100%', padding: '8px 12px', borderRadius: '8px', border: 'none', backgroundColor: '#f0f2f5',
        fontSize: '0.9rem', outline: 'none'
    },
    list: { overflowY: 'auto', flex: 1 },
    item: {
        height: '72px', padding: '0 15px', display: 'flex', alignItems: 'center', gap: '15px', cursor: 'pointer',
        borderBottom: '1px solid #f0f2f5'
    },
    info: { flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' },
    topRow: { display: 'flex', justifyContent: 'space-between', marginBottom: '3px' },
    name: { fontWeight: '400', fontSize: '1.1rem', color: '#111b21' },
    date: { fontSize: '0.75rem', color: '#667781' },
    preview: { fontSize: '0.9rem', color: '#667781', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' },
    placeholderState: { padding: '20px' },
    settingsList: { padding: '10px' }
};

export default Sidebar;
