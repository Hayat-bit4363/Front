import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const SettingsPage = () => {
    const { primaryColor, setPrimaryColor, darkMode, setDarkMode } = useTheme();
    const { user, login } = useAuth(); // login to update context if needed, or we fetch me

    // Profile State
    const [firstName, setFirstName] = useState(user?.first_name || '');
    const [lastName, setLastName] = useState(user?.last_name || '');
    const [about, setAbout] = useState(user?.about || '');
    const [avatar, setAvatar] = useState(null);
    const [previewAvatar, setPreviewAvatar] = useState(user?.avatar || null);

    // Wallpaper & Theme State
    const [wallpaper, setWallpaper] = useState(user?.wallpaper || null);
    const [wallpaperPreview, setWallpaperPreview] = useState(user?.wallpaper || null);

    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    const colors = ['#1877f2', '#008069', '#e1306c', '#ff5722', '#7b1fa2', '#000000'];

    useEffect(() => {
        if (user) {
            setFirstName(user.first_name || '');
            setLastName(user.last_name || '');
            setAbout(user.about || '');
            setPreviewAvatar(user.avatar || null);
            setWallpaperPreview(user.wallpaper || null);
        }
    }, [user]);

    const handleFileChange = (e, setFile, setPreview) => {
        const file = e.target.files[0];
        if (file) {
            setFile(file);
            setPreview(URL.createObjectURL(file));
        }
    };

    const handleSaveProfile = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');

        const formData = new FormData();
        formData.append('first_name', firstName);
        formData.append('last_name', lastName);
        formData.append('about', about);
        if (avatar) formData.append('avatar', avatar);
        if (wallpaper instanceof File) formData.append('wallpaper', wallpaper);

        try {
            const res = await api.patch('auth/me/', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setMessage('Profile updated successfully!');
            // Reload page to reflect changes across app (e.g. sidebar avatar)
            window.location.reload();
        } catch (err) {
            console.error(err);
            setMessage('Failed to update profile.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.card}>
                <h2 style={{ color: 'var(--text-primary)', marginBottom: '30px', textAlign: 'center' }}>Settings</h2>

                {/* Edit Profile Section */}
                <div style={styles.section}>
                    <h3 style={styles.sectionTitle}>Edit Profile</h3>
                    <div style={styles.profileHeader}>
                        <div style={styles.avatarContainer}>
                            <img src={previewAvatar || 'https://via.placeholder.com/150'} style={styles.avatar} alt="Profile" />
                            <label style={styles.uploadBtn}>
                                📷
                                <input type="file" style={{ display: 'none' }} onChange={(e) => handleFileChange(e, setAvatar, setPreviewAvatar)} accept="image/*" />
                            </label>
                        </div>
                    </div>

                    <div style={styles.formGroup}>
                        <label style={styles.label}>First Name</label>
                        <input style={styles.input} value={firstName} onChange={e => setFirstName(e.target.value)} />
                    </div>
                    <div style={styles.formGroup}>
                        <label style={styles.label}>Last Name</label>
                        <input style={styles.input} value={lastName} onChange={e => setLastName(e.target.value)} />
                    </div>
                    <div style={styles.formGroup}>
                        <label style={styles.label}>About</label>
                        <textarea style={styles.textarea} value={about} onChange={e => setAbout(e.target.value)} rows="3" />
                    </div>
                </div>

                <div style={styles.divider} />

                {/* Appearance Section */}
                <div style={styles.section}>
                    <h3 style={styles.sectionTitle}>Appearance</h3>

                    <div style={styles.row}>
                        <span>Dark Mode</span>
                        <input
                            type="checkbox"
                            checked={darkMode}
                            onChange={(e) => setDarkMode(e.target.checked)}
                            style={{ transform: 'scale(1.5)', cursor: 'pointer' }}
                        />
                    </div>

                    <div style={{ marginTop: '20px' }}>
                        <label style={styles.label}>Primary Color</label>
                        <div style={styles.colors}>
                            {colors.map(c => (
                                <div
                                    key={c}
                                    onClick={() => setPrimaryColor(c)}
                                    style={{
                                        ...styles.colorCircle,
                                        backgroundColor: c,
                                        border: primaryColor === c ? '3px solid var(--text-primary)' : 'none',
                                        transform: primaryColor === c ? 'scale(1.1)' : 'scale(1)'
                                    }}
                                />
                            ))}
                        </div>
                    </div>

                    <div style={{ marginTop: '20px' }}>
                        <label style={styles.label}>Chat Wallpaper</label>
                        <div style={styles.wallpaperUpload}>
                            <input type="file" onChange={(e) => handleFileChange(e, setWallpaper, setWallpaperPreview)} accept="image/*" />
                        </div>
                        {wallpaperPreview && (
                            <div style={styles.preview}>
                                <img src={wallpaperPreview} style={styles.wallpaperImg} alt="Wallpaper" />
                            </div>
                        )}
                    </div>
                </div>

                <div style={styles.actions}>
                    <button onClick={handleSaveProfile} style={styles.saveBtn} disabled={loading}>
                        {loading ? 'Saving...' : 'Save Changes'}
                    </button>
                    {message && <p style={styles.message}>{message}</p>}
                </div>

            </div>
        </div>
    );
};

const styles = {
    container: { padding: '40px 20px', display: 'flex', justifyContent: 'center', backgroundColor: 'var(--bg-color)', minHeight: '100vh', overflowY: 'auto' },
    card: { backgroundColor: 'var(--bg-paper)', padding: '40px', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', width: '100%', maxWidth: '600px', color: 'var(--text-primary)' },
    section: { marginBottom: '30px' },
    sectionTitle: { fontSize: '1.2rem', fontWeight: '600', marginBottom: '20px', color: 'var(--primary-color)' },
    profileHeader: { display: 'flex', justifyContent: 'center', marginBottom: '20px' },
    avatarContainer: { position: 'relative', width: '100px', height: '100px' },
    avatar: { width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--bg-paper)', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' },
    uploadBtn: { position: 'absolute', bottom: '0', right: '0', backgroundColor: 'var(--primary-color)', color: '#fff', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', border: '2px solid var(--bg-paper)' },
    formGroup: { marginBottom: '15px' },
    label: { display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '0.9rem' },
    input: { width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--input-bg)', color: 'var(--text-primary)', fontSize: '1rem', outline: 'none', transition: 'border-color 0.2s' },
    textarea: { width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--input-bg)', color: 'var(--text-primary)', fontSize: '1rem', outline: 'none', resize: 'vertical' },
    divider: { height: '1px', backgroundColor: 'var(--border-color)', margin: '30px 0' },
    row: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    colors: { display: 'flex', gap: '12px', marginTop: '10px', flexWrap: 'wrap' },
    colorCircle: { width: '36px', height: '36px', borderRadius: '50%', cursor: 'pointer', transition: 'transform 0.2s' },
    wallpaperUpload: { marginTop: '10px' },
    preview: { marginTop: '15px', height: '120px', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-color)' },
    wallpaperImg: { width: '100%', height: '100%', objectFit: 'cover' },
    actions: { marginTop: '40px', textAlign: 'center' },
    saveBtn: { padding: '12px 40px', backgroundColor: 'var(--primary-color)', color: '#fff', border: 'none', borderRadius: '30px', fontSize: '1rem', fontWeight: '600', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', transition: 'transform 0.1s' },
    message: { marginTop: '15px', color: 'green', fontWeight: '500' }
};

export default SettingsPage;
