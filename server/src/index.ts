import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';

const app = express();
app.use(cors());

const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: 'http://localhost:5173',
        methods: ['GET', 'POST'],
    },
});

// ─── Types ───────────────────────────────────────────────────────────────────

interface User {
    id: string;
    username: string;
    avatar: string; // color string
    room: string;
}

interface FileData {
    name: string;
    size: number;
    mimeType: string;
    dataUrl: string;
}

interface Message {
    id: string;
    type: 'message' | 'system';
    msgType?: 'text' | 'image' | 'file';
    content: string;
    fileData?: FileData;
    sender?: {
        id: string;
        username: string;
        avatar: string;
    };
    room: string;
    timestamp: number;
}

interface SendMessagePayload {
    content: string;
    msgType?: 'text' | 'image' | 'file';
    fileData?: FileData;
}

// ─── State ───────────────────────────────────────────────────────────────────

const users = new Map<string, User>(); // socketId -> User

const rooms: string[] = [
    '🌍 公共大厅',
    '💻 技术交流',
    '🎮 游戏天地',
    '🎵 音乐频道',
    '📚 学习园地',
];

// Store last 50 messages per room
const messageHistory = new Map<string, Message[]>();
rooms.forEach((room) => messageHistory.set(room, []));

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getUsersInRoom(room: string): User[] {
    return Array.from(users.values()).filter((u) => u.room === room);
}

function generateId(): string {
    return Math.random().toString(36).slice(2, 10);
}

function addMessageToHistory(room: string, msg: Message) {
    const history = messageHistory.get(room) ?? [];
    history.push(msg);
    if (history.length > 50) history.shift();
    messageHistory.set(room, history);
}

// ─── Socket.io ───────────────────────────────────────────────────────────────

io.on('connection', (socket: Socket) => {
    console.log(`[+] Connected: ${socket.id}`);

    // Client requests room list
    socket.on('get-rooms', () => {
        socket.emit('rooms', rooms);
    });

    // User joins a room
    socket.on(
        'join-room',
        (payload: { username: string; room: string; avatar: string }) => {
            const { username, room, avatar } = payload;

            // Leave previous room if any
            const prevUser = users.get(socket.id);
            if (prevUser && prevUser.room !== room) {
                socket.leave(prevUser.room);
                const leaveMsg: Message = {
                    id: generateId(),
                    type: 'system',
                    content: `${prevUser.username} 离开了房间`,
                    room: prevUser.room,
                    timestamp: Date.now(),
                };
                addMessageToHistory(prevUser.room, leaveMsg);
                io.to(prevUser.room).emit('receive-message', leaveMsg);
                io.to(prevUser.room).emit('room-users', getUsersInRoom(prevUser.room));
            }

            // Register/update user
            const user: User = { id: socket.id, username, room, avatar };
            users.set(socket.id, user);
            socket.join(room);

            // Send room history
            socket.emit('room-history', messageHistory.get(room) ?? []);

            // Broadcast join message
            const joinMsg: Message = {
                id: generateId(),
                type: 'system',
                content: `${username} 加入了房间`,
                room,
                timestamp: Date.now(),
            };
            addMessageToHistory(room, joinMsg);
            io.to(room).emit('receive-message', joinMsg);

            // Update user list for everyone in room
            io.to(room).emit('room-users', getUsersInRoom(room));

            console.log(`  ${username} joined [${room}]`);
        }
    );

    // User sends a message (text or file/image)
    socket.on('send-message', (payload: SendMessagePayload | string) => {
        const user = users.get(socket.id);
        if (!user) return;

        // Support both legacy string payload and new object payload
        let content: string;
        let msgType: 'text' | 'image' | 'file' = 'text';
        let fileData: FileData | undefined;

        if (typeof payload === 'string') {
            content = payload.trim();
            if (!content) return;
        } else {
            content = payload.content ?? '';
            msgType = payload.msgType ?? 'text';
            fileData = payload.fileData;
            // For file/image, content can be empty
            if (msgType === 'text' && !content.trim()) return;
        }

        // Basic size guard: dataUrl max ~6.7MB base64 for 5MB file
        if (fileData && fileData.dataUrl.length > 7_000_000) {
            socket.emit('error-message', '文件过大，请上传小于 5MB 的文件');
            return;
        }

        const msg: Message = {
            id: generateId(),
            type: 'message',
            msgType,
            content: msgType === 'text' ? content.trim() : content,
            fileData,
            sender: { id: user.id, username: user.username, avatar: user.avatar },
            room: user.room,
            timestamp: Date.now(),
        };
        addMessageToHistory(user.room, msg);
        io.to(user.room).emit('receive-message', msg);
    });

    // Disconnect
    socket.on('disconnect', () => {
        const user = users.get(socket.id);
        if (user) {
            users.delete(socket.id);

            const leaveMsg: Message = {
                id: generateId(),
                type: 'system',
                content: `${user.username} 离开了房间`,
                room: user.room,
                timestamp: Date.now(),
            };
            addMessageToHistory(user.room, leaveMsg);
            io.to(user.room).emit('receive-message', leaveMsg);
            io.to(user.room).emit('room-users', getUsersInRoom(user.room));
            console.log(`[-] Disconnected: ${user.username}`);
        }
    });
});

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

const PORT = 3001;
httpServer.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
