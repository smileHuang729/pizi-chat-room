import { useState, useCallback, useEffect } from 'react';
import { useSocket } from './hooks/useSocket';
import { Theme, applyTheme, loadSavedTheme } from './themes';
import LoginPage from './components/LoginPage';
import Sidebar from './components/Sidebar';
import MessageList from './components/MessageList';
import MessageInput from './components/MessageInput';
import UserList from './components/UserList';

const DEFAULT_ROOM = '🌍 公共大厅';

export default function App() {
    const [username, setUsername] = useState('');
    const [avatar, setAvatar] = useState('');
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [socketId] = useState('');
    const [currentTheme, setCurrentTheme] = useState<Theme>(() => loadSavedTheme());

    const { connected, rooms, messages, roomUsers, joinRoom, sendMessage } =
        useSocket();

    const [currentRoom, setCurrentRoom] = useState(DEFAULT_ROOM);

    // Apply saved theme on mount, and whenever it changes
    useEffect(() => {
        applyTheme(currentTheme);
    }, [currentTheme]);

    const handleChangeTheme = useCallback((theme: Theme) => {
        setCurrentTheme(theme);
        applyTheme(theme);
    }, []);

    const handleLogin = useCallback(
        (name: string, color: string) => {
            setUsername(name);
            setAvatar(color);
            setIsLoggedIn(true);
            setTimeout(() => {
                joinRoom(name, DEFAULT_ROOM, color);
            }, 0);
        },
        [joinRoom]
    );

    const handleSelectRoom = useCallback(
        (room: string) => {
            if (room === currentRoom) return;
            setCurrentRoom(room);
            joinRoom(username, room, avatar);
        },
        [currentRoom, username, avatar, joinRoom]
    );

    const myUser = roomUsers.find((u) => u.username === username);
    const myId = myUser?.id ?? socketId;

    const roomUserCounts: Record<string, number> = {};
    if (currentRoom) {
        roomUserCounts[currentRoom] = roomUsers.length;
    }

    if (!isLoggedIn) {
        return <LoginPage onLogin={handleLogin} />;
    }

    return (
        <div className="app-layout">
            <Sidebar
                rooms={rooms.length ? rooms : [DEFAULT_ROOM]}
                currentRoom={currentRoom}
                username={username}
                avatar={avatar}
                connected={connected}
                onSelectRoom={handleSelectRoom}
                roomUserCounts={roomUserCounts}
                currentTheme={currentTheme}
                onChangeTheme={handleChangeTheme}
            />

            <div className="chat-area">
                <div className="chat-header">
                    <span className="chat-header-icon">
                        {currentRoom.split(' ')[0]}
                    </span>
                    <span className="chat-header-name">
                        {currentRoom.replace(/^\S+\s/, '')}
                    </span>
                    <span className="chat-header-divider" />
                    <span className="chat-header-users">
                        {roomUsers.length} 位成员在线
                    </span>
                </div>

                <MessageList messages={messages} currentUserId={myId} />

                <MessageInput
                    onSend={sendMessage}
                    disabled={!connected}
                    roomName={currentRoom}
                />
            </div>

            <UserList users={roomUsers} currentUserId={myId} />
        </div>
    );
}
