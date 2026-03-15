import React, { useState } from 'react';
import api from '../services/api';

const CommentSection = ({ postId, comments, onCommentAdded, isExpanded, onToggle }) => {
    const [text, setText] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!text.trim()) return;

        try {
            const res = await api.post(`posts/${postId}/comments/`, { text });
            onCommentAdded(res.data);
            setText('');
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.actions}>
                <button onClick={onToggle} style={styles.toggleBtn}>
                    💬 {comments ? comments.length : 0} Comments
                </button>
            </div>

            {isExpanded && (
                <div style={styles.list}>
                    {comments.map(comment => (
                        <div key={comment.id} style={styles.comment}>
                            <div style={styles.avatar}>
                                {comment.author.avatar ? <img src={comment.author.avatar} style={styles.avatarImg} /> : comment.author.username[0]}
                            </div>
                            <div style={styles.bubble}>
                                <div style={styles.author}>{comment.author.username}</div>
                                <div style={styles.text}>{comment.text}</div>
                            </div>
                        </div>
                    ))}

                    <form onSubmit={handleSubmit} style={styles.form}>
                        <div style={styles.inputContainer}>
                            <input
                                style={styles.input}
                                placeholder="Write a comment..."
                                value={text}
                                onChange={e => setText(e.target.value)}
                            />
                            <button type="submit" style={styles.sendBtn} disabled={!text.trim()}>
                                ➤
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};

const styles = {
    container: { marginTop: '10px', borderTop: '1px solid var(--border-color)', paddingTop: '5px' },
    actions: { padding: '5px 16px' },
    toggleBtn: { background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.9rem' },
    list: { padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: '8px' },
    comment: { display: 'flex', gap: '8px' },
    avatar: { width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#eee', display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
    avatarImg: { width: '100%', height: '100%', objectFit: 'cover' },
    bubble: { backgroundColor: 'var(--input-bg)', padding: '8px 12px', borderRadius: '15px' },
    author: { fontWeight: '600', fontSize: '0.85rem' },
    text: { fontSize: '0.95rem' },
    form: { marginTop: '10px' },
    input: { flex: 1, padding: '8px 12px', borderRadius: '20px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-paper)', outline: 'none' },
    inputContainer: { display: 'flex', gap: '8px', alignItems: 'center', width: '100%' },
    sendBtn: { background: 'var(--primary-color)', color: '#fff', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center' }
};

export default CommentSection;
