import { useState } from 'react';

const AVATAR_COLORS = [
    '#6366f1', '#8b5cf6', '#ec4899', '#f97316',
    '#eab308', '#22c55e', '#06b6d4', '#3b82f6',
];

interface LoginPageProps {
    onLogin: (username: string, avatar: string) => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
    const [username, setUsername] = useState('');
    const [selectedAvatar, setSelectedAvatar] = useState(AVATAR_COLORS[0]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const name = username.trim();
        if (name) onLogin(name, selectedAvatar);
    };

    return (
        <div className="login-page">
            <div className="login-card">
                <div className="login-logo">💬</div>
                <h1 className="login-title">ChatRoom</h1>
                <p className="login-subtitle">实时多频道聊天室 · 即刻加入对话</p>

                <form onSubmit={handleSubmit}>
                    <div className="login-form-group">
                        <label className="login-label" htmlFor="username-input">
                            你的昵称
                        </label>
                        <input
                            id="username-input"
                            className="login-input"
                            type="text"
                            placeholder="输入你的昵称…"
                            maxLength={20}
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            autoFocus
                        />
                    </div>

                    <div className="login-form-group">
                        <label className="login-label">选择头像颜色</label>
                        <div className="avatar-grid">
                            {AVATAR_COLORS.map((color) => (
                                <div
                                    key={color}
                                    className={`avatar-option ${selectedAvatar === color ? 'selected' : ''}`}
                                    style={{ background: color }}
                                    onClick={() => setSelectedAvatar(color)}
                                    role="button"
                                    aria-label={`选择颜色 ${color}`}
                                />
                            ))}
                        </div>
                    </div>

                    <button
                        id="login-btn"
                        className="login-btn"
                        type="submit"
                        disabled={!username.trim()}
                    >
                        进入聊天室 →
                    </button>
                </form>
            </div>
        </div>
    );
}
