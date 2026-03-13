import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useNavigate } from 'react-router-dom';

const ProfilePage = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { primaryColor } = useTheme();
    const [posts, setPosts] = useState([]);

    useEffect(() => {
        // Fetch USER'S posts - Need logic on backend or filter on frontend
        // Assuming backend supports filter: GET posts/?author=me or similar
        // For now, let's just fetch all and filter client side for MVP robustness
        fetchMyPosts();
    }, []);

    const fetchMyPosts = async () => {
        try {
            const res = await api.get('posts/');
            const myPosts = res.data.filter(p => p.author.username === user?.username);
            setPosts(myPosts);
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div style={styles.container}>
            {/* Header Section */}
            <div style={styles.header}>
                <div style={styles.cover}>
                    {user?.wallpaper && <img src={user.wallpaper} style={styles.coverImg} />}
                </div>
                <div style={styles.profileInfo}>
                    <div style={styles.avatarWrapper}>
                        {user?.avatar ?
                            <img src={user.avatar} style={styles.avatar} /> :
                            <div style={{ ...styles.avatarPlaceholder, backgroundColor: primaryColor }}>{user?.username[0]}</div>
                        }
                    </div>
                    <div style={styles.details}>
                        <h1 style={styles.name}>{user?.username}</h1>
                        <p style={styles.bio}>{user?.about || 'No bio yet.'}</p>
                    </div>
                    <button style={{ ...styles.editBtn, backgroundColor: primaryColor }} onClick={() => navigate('/settings')}>Edit Profile</button>
                </div>
            </div>

            {/* Posts Section */}
            <div style={styles.content}>
                <div style={styles.sidebar}>
                    <div style={styles.card}>
                        <h3>Intro</h3>
                        <p>Joined {new Date().getFullYear()}</p>
                        <button style={styles.fullWidthBtn}>Add Details</button>
                    </div>
                    <div style={styles.card}>
                        <h3>Photos</h3>
                        <div style={styles.photoGrid}>
                            {/* Photos placeholder */}
                        </div>
                    </div>
                </div>

                <div style={styles.feed}>
                    {/* Reuse Post Component Logic here if refactored, or simple mapping */}
                    {posts.map(post => (
                        <div key={post.id} style={styles.postCard}>
                            <div style={styles.postHeader}>
                                {post.author.avatar ? <img src={post.author.avatar} style={styles.miniAvatar} /> : <div style={styles.miniPlaceholder}>{post.author.username[0]}</div>}
                                <div>
                                    <div style={styles.postAuthor}>{post.author.username}</div>
                                    <div style={styles.postTime}>{new Date(post.created_at).toLocaleString()}</div>
                                </div>
                            </div>
                            <div style={styles.postContent}>{post.content}</div>
                            {post.image && <img src={post.image} style={styles.postImg} />}
                        </div>
                    ))}
                    {posts.length === 0 && <div style={styles.card}>No posts yet.</div>}
                </div>
            </div>
        </div>
    );
};

const styles = {
    container: { maxWidth: '940px', margin: '0 auto', paddingBottom: '50px' },
    header: { backgroundColor: 'var(--bg-paper)', borderRadius: '0 0 10px 10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '20px' },
    cover: { height: '350px', backgroundColor: '#888', borderRadius: '0 0 10px 10px', overflow: 'hidden', position: 'relative' },
    coverImg: { width: '100%', height: '100%', objectFit: 'cover' },
    profileInfo: { padding: '0 30px 30px', display: 'flex', alignItems: 'flex-end', marginTop: '-30px', position: 'relative' },
    avatarWrapper: { padding: '5px', backgroundColor: 'var(--bg-paper)', borderRadius: '50%', marginRight: '20px' },
    avatar: { width: '168px', height: '168px', borderRadius: '50%', objectFit: 'cover' },
    avatarPlaceholder: { width: '168px', height: '168px', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#fff', fontSize: '3rem', fontWeight: 'bold' },
    details: { flex: 1, marginBottom: '10px' },
    name: { fontSize: '2rem', fontWeight: 'bold', margin: 0, color: 'var(--text-primary)' },
    bio: { fontSize: '1.1rem', color: 'var(--text-secondary)', marginTop: '5px' },
    editBtn: { padding: '10px 20px', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', marginBottom: '15px' },
    content: { display: 'flex', gap: '20px' },
    sidebar: { width: '360px', display: 'flex', flexDirection: 'column', gap: '20px' },
    feed: { flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' },
    card: { backgroundColor: 'var(--bg-paper)', padding: '15px', borderRadius: '8px', boxShadow: '0 1px 2px rgba(0,0,0,0.1)' },
    fullWidthBtn: { width: '100%', padding: '8px', marginTop: '10px', backgroundColor: 'var(--input-bg)', border: 'none', borderRadius: '6px', cursor: 'pointer' },
    postCard: { backgroundColor: 'var(--bg-paper)', borderRadius: '8px', boxShadow: '0 1px 2px rgba(0,0,0,0.1)', overflow: 'hidden' },
    postHeader: { padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px' },
    miniAvatar: { width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' },
    miniPlaceholder: { width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#ccc', display: 'flex', justifyContent: 'center', alignItems: 'center' },
    postAuthor: { fontWeight: '600', color: 'var(--text-primary)' },
    postTime: { fontSize: '0.8rem', color: 'var(--text-secondary)' },
    postContent: { padding: '4px 16px 16px', fontSize: '1rem', color: 'var(--text-primary)' },
    postImg: { width: '100%', objectFit: 'cover', maxHeight: '500px' }
};

export default ProfilePage;
