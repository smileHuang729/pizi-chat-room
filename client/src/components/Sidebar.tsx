import ThemeSwitcher from './ThemeSwitcher';
import { Theme } from '../themes';

interface SidebarProps {
    rooms: string[];
    currentRoom: string;
    username: string;
    avatar: string;
    connected: boolean;
    onSelectRoom: (room: string) => void;
    roomUserCounts: Record<string, number>;
    currentTheme: Theme;
    onChangeTheme: (theme: Theme) => void;
}

export default function Sidebar({
    rooms,
    currentRoom,
    username,
    avatar,
    connected,
    onSelectRoom,
    roomUserCounts,
    currentTheme,
    onChangeTheme,
}: SidebarProps) {
    return (
        <div className="sidebar">
            <div className="sidebar-header">
                <div className="sidebar-logo">
                    <span className="sidebar-logo-icon">💬</span>
                    <span className="sidebar-logo-name">ChatRoom</span>
                </div>
                <div className="connection-badge">
                    <span className={`connection-dot ${connected ? 'online' : ''}`} />
                    {connected ? '已连接' : '连接中…'}
                </div>
            </div>

            <div className="sidebar-section-header">频道列表</div>

            <div className="sidebar-rooms">
                {rooms.map((room, idx) => (
                    <div
                        key={room}
                        id={`room-${idx}`}
                        className={`room-item ${currentRoom === room ? 'active' : ''}`}
                        onClick={() => onSelectRoom(room)}
                    >
                        <span className="room-item-name">{room}</span>
                        {roomUserCounts[room] > 0 && (
                            <span className="room-badge">{roomUserCounts[room]}</span>
                        )}
                    </div>
                ))}
            </div>

            <div className="sidebar-footer" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                <ThemeSwitcher currentTheme={currentTheme} onChangeTheme={onChangeTheme} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
                    <div
                        style={{
                            background: avatar,
                            borderRadius: '50%',
                            width: 32,
                            height: 32,
                            flexShrink: 0,
                        }}
                    />
                    <div className="me-info">
                        <div className="me-name">{username}</div>
                        <div className="me-status">● 在线</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
