import React, { useState } from 'react';
import api from '../services/api';

import PeoplePage from '../pages/PeoplePage';
import { BASE_URL } from '../config';

const Sidebar = ({ conversations, selectConversation, selectedConversationId, currentUser, onNewConversation }) => {
    const [activeTab, setActiveTab] = useState('chats'); // chats, status, calls, settings
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [showSearch, setShowSearch] = useState(false);
    const [statuses, setStatuses] = useState([]);
    const [showStatusForm, setShowStatusForm] = useState(false);
    const [selectedStatus, setSelectedStatus] = useState(null);
    const [statusImage, setStatusImage] = useState(null);
    const [statusCaption, setStatusCaption] = useState('');

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

    const fetchStatuses = async () => {
        try {
            const res = await api.get('chat/status/');
            setStatuses(res.data);
        } catch (err) { console.error(err); }
    };

    const handleStatusUpload = async (e) => {
        e.preventDefault();
        if (!statusImage) return;
        const formData = new FormData();
        formData.append('image', statusImage);
        formData.append('caption', statusCaption);
        try {
            await api.post('chat/status/create/', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            setShowStatusForm(false);
            setStatusImage(null);
            setStatusCaption('');
            fetchStatuses();
        } catch (err) { console.error(err); }
    };

    React.useEffect(() => {
        if (activeTab === 'status') fetchStatuses();
    }, [activeTab]);

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
                    <div style={styles.statusSection}>
                        <div style={styles.item} onClick={() => setShowStatusForm(true)}>
                            <div style={{ ...styles.avatar, backgroundColor: 'var(--primary-color)' }}>＋</div>
                            <div style={styles.info}>
                                <div style={styles.name}>My Status</div>
                                <div style={styles.preview}>Add a new update</div>
                            </div>
                        </div>
                        
                        <div style={{ padding: '20px 16px', color: 'var(--primary-color)', fontSize: '0.9rem', fontWeight: 'bold' }}>RECENT UPDATES</div>
                        
                        {statuses.map(s => (
                            <div key={s.id} style={styles.item} onClick={() => setSelectedStatus(s)}>
                                <div style={{ ...styles.avatar, border: '2px solid var(--primary-color)' }}>
                                    <img src={getMediaUrl(s.image)} style={styles.avatarImg} />
                                </div>
                                <div style={styles.info}>
                                    <div style={styles.name}>{s.user.username}</div>
                                    <div style={styles.preview}>{new Date(s.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                </div>
                            </div>
                        ))}

                        {showStatusForm && (
                            <div style={styles.modalOverlay}>
                                <div style={styles.modal}>
                                    <h3>Share Status</h3>
                                    <input type="file" onChange={e => setStatusImage(e.target.files[0])} accept="image/*" style={{ marginBottom: '15px' }} />
                                    <input style={styles.statusInput} placeholder="Add a caption..." value={statusCaption} onChange={e => setStatusCaption(e.target.value)} />
                                    <div style={styles.modalActions}>
                                        <button onClick={() => setShowStatusForm(false)} style={styles.cancelBtn}>Cancel</button>
                                        <button onClick={handleStatusUpload} style={styles.saveBtn}>Post</button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {selectedStatus && (
                            <div style={{ ...styles.modalOverlay, backgroundColor: '#000' }} onClick={() => setSelectedStatus(null)}>
                                <div style={styles.statusViewer}>
                                    <img src={getMediaUrl(selectedStatus.image)} style={styles.viewerImg} />
                                    <div style={styles.viewerCaption}>{selectedStatus.caption}</div>
                                    <div style={styles.viewerHeader}>{selectedStatus.user.username}</div>
                                </div>
                            </div>
                        )}
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
    settingsList: { padding: '10px' },
    statusSection: { display: 'flex', flexDirection: 'column' },
    modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
    modal: { backgroundColor: '#fff', padding: '24px', borderRadius: '12px', width: '320px', display: 'flex', flexDirection: 'column' },
    statusInput: { padding: '10px', borderRadius: '8px', border: '1px solid #ddd', marginBottom: '15px', outline: 'none' },
    modalActions: { display: 'flex', gap: '10px', justifyContent: 'flex-end' },
    cancelBtn: { padding: '8px 16px', border: 'none', background: '#eee', borderRadius: '4px', cursor: 'pointer' },
    saveBtn: { padding: '8px 16px', border: 'none', background: 'var(--primary-color)', color: '#fff', borderRadius: '4px', cursor: 'pointer' },
    statusViewer: { position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    viewerImg: { maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' },
    viewerCaption: { position: 'absolute', bottom: '40px', left: 0, width: '100%', textAlign: 'center', color: '#fff', fontSize: '1.2rem', textShadow: '0 2px 4px rgba(0,0,0,0.8)', padding: '0 20px' },
    viewerHeader: { position: 'absolute', top: '20px', left: '20px', color: '#fff', fontSize: '1.1rem', fontWeight: 'bold', backgroundColor: 'rgba(0,0,0,0.3)', padding: '5px 15px', borderRadius: '20px' }
};

export default Sidebar;
