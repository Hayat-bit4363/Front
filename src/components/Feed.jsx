import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useTheme } from '../context/ThemeContext';
import CommentSection from './CommentSection';

const Feed = () => {
    const [posts, setPosts] = useState([]);
    const [content, setContent] = useState('');
    const [image, setImage] = useState(null);
    const [expandedComments, setExpandedComments] = useState({});
    const { primaryColor } = useTheme();

    useEffect(() => {
        fetchPosts();
    }, []);

    const fetchPosts = async () => {
        try {
            const res = await api.get('posts/');
            setPosts(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const handlePost = async (e) => {
        e.preventDefault();
        if (!content && !image) return;

        const formData = new FormData();
        formData.append('content', content);
        if (image) formData.append('image', image);

        try {
            const res = await api.post('posts/', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setPosts([res.data, ...posts]);
            setContent('');
            setImage(null);
        } catch (err) {
            console.error(err);
        }
    };

    const handleLike = async (postId) => {
        try {
            const res = await api.post(`posts/${postId}/like/`);
            setPosts(posts.map(p =>
                p.id === postId ? { ...p, likes_count: res.data.likes_count, is_liked: res.data.status === 'liked' } : p
            ));
        } catch (err) { console.error(err); }
    };

    const handleCommentAdded = (postId, newComment) => {
        setPosts(posts.map(p =>
            p.id === postId ? { ...p, comments: [...p.comments, newComment] } : p
        ));
    };

    const handleShare = async (postId) => {
        try {
            const res = await api.post(`posts/${postId}/share/`);
            setPosts([res.data, ...posts]);
            alert("Post shared successfully!");
        } catch (err) {
            console.error(err);
            alert("Failed to share post.");
        }
    };

    const toggleComments = (postId) => {
        setExpandedComments(prev => ({
            ...prev,
            [postId]: !prev[postId]
        }));
    };

    return (
        <div style={styles.feedContainer}>
            {/* Create Post */}
            <div style={styles.createPost}>
                <textarea
                    style={styles.input}
                    placeholder="What's on your mind?"
                    value={content}
                    onChange={e => setContent(e.target.value)}
                />
                <div style={styles.actions}>
                    <input type="file" onChange={e => setImage(e.target.files[0])} accept="image/*" style={{ color: 'var(--text-secondary)' }} />
                    <button onClick={handlePost} style={{ ...styles.postBtn, backgroundColor: primaryColor }}>Post</button>
                </div>
            </div>

            {/* Posts */}
            {posts.map(post => (
                <div key={post.id} style={styles.post}>
                    {post.original_post && (
                        <div style={styles.sharedIndicator}>
                            🔄 Shared from {post.original_post.author.username}
                        </div>
                    )}
                    <div style={styles.postHeader}>
                        {post.author.avatar ? <img src={post.author.avatar} style={styles.avatar} /> : <div style={{ ...styles.avatarPlaceholder, backgroundColor: primaryColor }}>{post.author.username[0]}</div>}
                        <div>
                            <div style={styles.author}>{post.author.username}</div>
                            <div style={styles.time}>{new Date(post.created_at).toLocaleString()}</div>
                        </div>
                    </div>

                    <div style={styles.postContent}>{post.content}</div>
                    {post.image && <img src={post.image} style={styles.postImage} />}
                    {!post.image && post.original_post && post.original_post.image && (
                         <img src={post.original_post.image} style={styles.postImage} alt="original" />
                    )}

                    <div style={styles.postStats}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <span style={{ fontSize: '1.2rem', color: primaryColor }}>👍</span> {post.likes_count}
                        </span>
                        <span>{post.comments.length} Comments</span>
                    </div>

                    <div style={styles.postActions}>
                        <button
                            onClick={() => handleLike(post.id)}
                            style={{ ...styles.actionBtn, color: post.is_liked ? primaryColor : 'var(--text-secondary)' }}
                        >
                            ThumbUp
                        </button>
                        <button style={styles.actionBtn} onClick={() => toggleComments(post.id)}>Comment</button>
                        <button style={styles.actionBtn} onClick={() => handleShare(post.id)}>Share</button>
                    </div>

                    <CommentSection
                        postId={post.id}
                        comments={post.comments}
                        onCommentAdded={(c) => handleCommentAdded(post.id, c)}
                        isExpanded={!!expandedComments[post.id]}
                        onToggle={() => toggleComments(post.id)}
                    />
                </div>
            ))}
        </div>
    );
};

const styles = {
    feedContainer: {
        maxWidth: '680px', margin: '0 auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px'
    },
    createPost: {
        backgroundColor: 'var(--bg-paper)', borderRadius: '12px', padding: '15px', boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
    },
    input: {
        width: '100%', border: 'none', outline: 'none', fontSize: '1.1rem', resize: 'none', minHeight: '80px',
        backgroundColor: 'transparent', color: 'var(--text-primary)'
    },
    actions: { display: 'flex', justifyContent: 'space-between', marginTop: '10px', borderTop: '1px solid var(--border-color)', paddingTop: '10px' },
    postBtn: {
        padding: '8px 24px', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold'
    },
    post: {
        backgroundColor: 'var(--bg-paper)', borderRadius: '12px', boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
    },
    postHeader: { padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px' },
    avatar: { width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' },
    avatarPlaceholder: { width: '40px', height: '40px', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#fff' },
    author: { fontWeight: '600', color: 'var(--text-primary)' },
    time: { fontSize: '0.8rem', color: 'var(--text-secondary)' },
    postContent: { padding: '4px 16px 16px', fontSize: '1rem', color: 'var(--text-primary)' },
    postImage: { width: '100%', objectFit: 'cover', maxHeight: '500px' },
    postStats: { padding: '10px 16px', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.9rem', display: 'flex', justifyContent: 'space-between' },
    postActions: { display: 'flex', padding: '4px' },
    actionBtn: { flex: 1, background: 'none', border: 'none', padding: '10px', cursor: 'pointer', fontWeight: '600', color: 'var(--text-secondary)', borderRadius: '8px', transition: 'background-color 0.2s' },
    sharedIndicator: { padding: '8px 16px', backgroundColor: 'var(--bg-color)', borderBottom: '1px solid var(--border-color)', fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 'bold' }
};

export default Feed;
