import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const PeoplePage = () => {
    const [activeTab, setActiveTab] = useState('discover');
    const [people, setPeople] = useState([]);
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(false);
    const { user } = useAuth(); // for context if needed

    useEffect(() => {
        if (activeTab === 'discover') fetchPeople();
        if (activeTab === 'requests') fetchRequests();
        if (activeTab === 'friends') fetchFriends(); // We can reuse people endpoint or filter locally? 
        // Ideally backend has `friends/` endpoint, but for now I'll use people list filter or add a param to PeopleListView ?? 
        // Actually `PeopleListView` returns everyone. Filtering client side is inefficient but okay for MVP. 
        // Or update backend to filter `friends=True`?
        // Let's rely on `friend_status` field I added!
    }, [activeTab]);

    const fetchPeople = async () => {
        setLoading(true);
        try {
            const res = await api.get('auth/people/');
            setPeople(res.data);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const fetchRequests = async () => {
        setLoading(true);
        try {
            const res = await api.get('auth/requests/');
            setRequests(res.data);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const fetchFriends = async () => {
        setLoading(true);
        try {
            // Re-use people list but filter for 'friend' in backend or here. 
            // Better to have a dedicated endpoint but for MVP let's filter client-side results of all people?
            // No, getting ALL users is bad scaling. 
            // I'll stick to 'discover' (all) and local checks. 
            // For 'My Friends', I'll just filter `people` if I have it, or request `auth/people/?filter=friends` (not impl yet).
            // Let's implement client-side filter of the generic list for now, calling it again.
            const res = await api.get('auth/people/');
            setPeople(res.data.filter(u => u.friend_status === 'friend'));
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    }

    const sendRequest = async (id) => {
        try {
            await api.post('auth/requests/send/', { receiver_id: id });
            // Optimistic update
            setPeople(prev => prev.map(p => p.id === id ? { ...p, friend_status: 'request_sent' } : p));
        } catch (err) { console.error(err); alert('Failed to send request'); }
    };

    const handleAction = async (id, action) => {
        try {
            await api.post(`auth/requests/${id}/action/`, { action });
            if (action === 'accept' || action === 'reject') {
                setRequests(prev => prev.filter(r => r.id !== id));
            }
        } catch (err) { console.error(err); }
    };

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <h2>People & Friends</h2>
                <div style={styles.tabs}>
                    <button style={activeTab === 'discover' ? styles.activeTab : styles.tab} onClick={() => setActiveTab('discover')}>Discover</button>
                    <button style={activeTab === 'requests' ? styles.activeTab : styles.tab} onClick={() => setActiveTab('requests')}>Requests</button>
                    <button style={activeTab === 'friends' ? styles.activeTab : styles.tab} onClick={() => setActiveTab('friends')}>My Friends</button>
                </div>
            </div>

            <div style={styles.content}>
                {loading && <div style={{ textAlign: 'center', padding: '20px' }}>Loading...</div>}

                {activeTab === 'discover' && (
                    <div style={styles.grid}>
                        {people.map(person => (
                            <div key={person.id} style={styles.card}>
                                <img src={person.avatar || 'https://via.placeholder.com/100'} style={styles.avatar} />
                                <div style={styles.info}>
                                    <h4 style={styles.name}>{person.username}</h4>
                                    <p style={styles.bio}>{person.about || 'No bio'}</p>
                                </div>
                                {person.friend_status === 'none' && <button onClick={() => sendRequest(person.id)} style={styles.btnPrimary}>Add Friend</button>}
                                {person.friend_status === 'request_sent' && <button style={styles.btnSecondary} disabled>Sent</button>}
                                {person.friend_status === 'friend' && <button style={styles.btnOutline}>Friend</button>}
                                {person.friend_status === 'request_received' && <span style={{ fontSize: '0.8rem', color: 'orange' }}>Check Requests</span>}
                            </div>
                        ))}
                    </div>
                )}

                {activeTab === 'requests' && (
                    <div style={styles.list}>
                        {requests.length === 0 && !loading && <p style={{ textAlign: 'center' }}>No pending requests.</p>}
                        {requests.map(req => (
                            <div key={req.id} style={styles.requestRow}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <img src={req.sender.avatar || 'https://via.placeholder.com/50'} style={{ width: '40px', height: '40px', borderRadius: '50%' }} />
                                    <div>
                                        <b style={{ color: 'var(--text-primary)' }}>{req.sender.username}</b>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>sent you a request</div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <button onClick={() => handleAction(req.id, 'accept')} style={styles.btnPrimary}>Accept</button>
                                    <button onClick={() => handleAction(req.id, 'reject')} style={styles.btnSecondary}>Delete</button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {activeTab === 'friends' && (
                    <div style={styles.grid}>
                        {people.map(person => (
                            <div key={person.id} style={styles.card}>
                                <img src={person.avatar || 'https://via.placeholder.com/100'} style={styles.avatar} />
                                <div style={styles.info}>
                                    <h4 style={styles.name}>{person.username}</h4>
                                </div>
                                <button style={styles.btnOutline}>Message</button> {/* Future integration: Start Chat */}
                            </div>
                        ))}
                        {people.length === 0 && !loading && <p>No friends yet. Go to Discover!</p>}
                    </div>
                )}
            </div>
        </div>
    );
};

const styles = {
    container: { padding: '20px', height: '100%', overflowY: 'auto' },
    header: { marginBottom: '20px' },
    tabs: { display: 'flex', gap: '10px', marginTop: '10px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' },
    tab: { background: 'none', border: 'none', padding: '8px 16px', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '1rem', fontWeight: '500' },
    activeTab: { background: 'var(--input-bg)', border: 'none', padding: '8px 16px', cursor: 'pointer', color: 'var(--primary-color)', fontSize: '1rem', fontWeight: '600', borderRadius: '20px' },
    content: {},
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '20px' },
    card: { backgroundColor: 'var(--bg-paper)', padding: '20px', borderRadius: '12px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' },
    avatar: { width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', marginBottom: '10px', border: '3px solid var(--bg-color)' },
    info: { marginBottom: '15px' },
    name: { margin: '0 0 5px 0', color: 'var(--text-primary)' },
    bio: { margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', height: '40px', overflow: 'hidden' }, // fixed height for alignment
    btnPrimary: { backgroundColor: 'var(--primary-color)', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '20px', cursor: 'pointer', fontWeight: '500' },
    btnSecondary: { backgroundColor: 'var(--bg-color)', color: 'var(--text-primary)', border: 'none', padding: '8px 16px', borderRadius: '20px', cursor: 'pointer' },
    btnOutline: { backgroundColor: 'transparent', border: '1px solid var(--primary-color)', color: 'var(--primary-color)', padding: '8px 16px', borderRadius: '20px', cursor: 'pointer' },
    list: { display: 'flex', flexDirection: 'column', gap: '15px', maxWidth: '600px', margin: '0 auto' },
    requestRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-paper)', padding: '15px', borderRadius: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }
};

export default PeoplePage;
