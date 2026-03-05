import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import { GoogleGenerativeAI, Content } from '@google/generative-ai';
import { ProxyAgent, setGlobalDispatcher } from 'undici';
import { execSync } from 'child_process';
import * as net from 'net';

// Apply HTTP proxy for fetch (e.g. to reach Google API from restricted networks)
const httpsProxy = process.env.HTTPS_PROXY || process.env.https_proxy;
if (httpsProxy) {
    setGlobalDispatcher(new ProxyAgent(httpsProxy));
    console.log(`🌐 Using proxy: ${httpsProxy}`);
}

const app = express();
app.use(cors({ origin: '*' }));

const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
        credentials: false,
    },
    allowEIO3: true,
    transports: ['polling', 'websocket'],
    upgradeTimeout: 10000,
    pingTimeout: 60000,
    pingInterval: 25000,
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
    isAiMessage?: boolean;
    isAiThinking?: boolean;
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

// ─── Gemini AI Setup ──────────────────────────────────────────────────────────

const AI_BOT = {
    id: 'gemini-bot',
    username: '🤖 Gemini',
    avatar: '#4285f4', // Google blue
};

const AI_TRIGGER = '@AI';

// Per-room Gemini chat history (last 20 rounds to save tokens)
const chatHistories = new Map<string, Content[]>();

// Rate-limit: track last AI response time per room (3s cooldown)
const lastAiReply = new Map<string, number>();

let gemini: GoogleGenerativeAI | null = null;
if (process.env.GEMINI_API_KEY) {
    gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    console.log('✅ Gemini AI initialized');
} else {
    console.warn('⚠️  GEMINI_API_KEY not set – AI features disabled');
}

/** 从 429 错误的 errorDetails 中提取 retryDelay 秒数 */
function parseRetryDelay(err: unknown): number {
    try {
        const details = (err as { errorDetails?: { '@type': string; retryDelay?: string }[] }).errorDetails ?? [];
        const retryInfo = details.find((d) => d['@type'] === 'type.googleapis.com/google.rpc.RetryInfo');
        if (retryInfo?.retryDelay) {
            // retryDelay 格式为 "23s" 或 "23.4s"
            return Math.ceil(parseFloat(retryInfo.retryDelay)) * 1000;
        }
    } catch (_) { /* ignore */ }
    return 30_000; // 默认等待 30s
}

async function askGemini(room: string, question: string, attempt = 0): Promise<string> {
    if (!gemini) return '⚠️ AI 服务未配置，请设置 GEMINI_API_KEY';

    const history = chatHistories.get(room) ?? [];
    const model = gemini.getGenerativeModel({
        model: 'gemini-2.5-flash',
        systemInstruction:
            '你是一个聊天室里的 AI 助手，名字叫 Gemini。请用简洁、友好的中文回答问题。回答尽量简短（100字以内），除非用户要求详细说明。',
    });

    try {
        const chat = model.startChat({ history });
        const result = await chat.sendMessage(question);
        const reply = result.response.text();

        // Update history (keep last 20 rounds = 40 entries)
        history.push({ role: 'user', parts: [{ text: question }] });
        history.push({ role: 'model', parts: [{ text: reply }] });
        if (history.length > 40) history.splice(0, history.length - 40);
        chatHistories.set(room, history);

        return reply;
    } catch (err: unknown) {
        const status = (err as { status?: number }).status;
        if (status === 429 && attempt < 2) {
            const delay = parseRetryDelay(err);
            console.warn(`[Gemini] 429 限流，${delay / 1000}s 后自动重试 (attempt ${attempt + 1})…`);
            await new Promise((r) => setTimeout(r, delay));
            return askGemini(room, question, attempt + 1);
        }
        // 429 重试耗尽或其他错误，向上抛出
        throw err;
    }
}

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
    socket.on('send-message', async (payload: SendMessagePayload | string) => {
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

        // ─── Gemini AI trigger ────────────────────────────────────────────
        const trimmed = content.trim();
        if (msgType === 'text' && trimmed.startsWith(AI_TRIGGER)) {
            // Rate limit: 3s cooldown per room
            const now = Date.now();
            const last = lastAiReply.get(user.room) ?? 0;
            if (now - last < 3000) return;
            lastAiReply.set(user.room, now);

            const question = trimmed.slice(AI_TRIGGER.length).trim();
            if (!question) return;

            // Send a "thinking" indicator
            const thinkingMsg: Message = {
                id: generateId(),
                type: 'message',
                msgType: 'text',
                content: '💭 正在思考…',
                sender: AI_BOT,
                room: user.room,
                timestamp: Date.now(),
                isAiThinking: true,
            } as Message & { isAiThinking?: boolean };
            io.to(user.room).emit('receive-message', thinkingMsg);

            try {
                const reply = await askGemini(user.room, question);
                // Replace thinking message with real answer
                io.to(user.room).emit('ai-reply-replace', {
                    replaceId: thinkingMsg.id,
                    msg: {
                        id: thinkingMsg.id,
                        type: 'message',
                        msgType: 'text',
                        content: reply,
                        sender: AI_BOT,
                        room: user.room,
                        timestamp: Date.now(),
                        isAiMessage: true,
                    } as Message & { isAiMessage?: boolean },
                });
            } catch (err) {
                const status = (err as { status?: number }).status;
                const errMsg = status === 429
                    ? '❌ AI 调用频率超限，请稍后再试（免费配额已用尽）'
                    : '❌ AI 回复失败，请稍后再试';
                io.to(user.room).emit('ai-reply-replace', {
                    replaceId: thinkingMsg.id,
                    msg: {
                        id: thinkingMsg.id,
                        type: 'message',
                        msgType: 'text',
                        content: errMsg,
                        sender: AI_BOT,
                        room: user.room,
                        timestamp: Date.now(),
                        isAiMessage: true,
                    } as Message & { isAiMessage?: boolean },
                });
                console.error('[Gemini] Error:', err);
            }
        }
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

// Force-free the port, then start listening
function freePort(port: number): Promise<void> {
    return new Promise((resolve) => {
        const tester = net.createServer();
        tester.once('error', (err: NodeJS.ErrnoException) => {
            if (err.code === 'EADDRINUSE') {
                console.warn(`⚠️  Port ${port} in use, killing occupying process…`);
                try {
                    execSync(`lsof -ti:${port} | xargs kill -9`, { stdio: 'ignore' });
                } catch (_) { /* nothing to kill */ }
                // Wait for OS to release the port
                setTimeout(resolve, 500);
            } else {
                resolve();
            }
        });
        tester.once('listening', () => tester.close(() => resolve()));
        tester.listen(port, '0.0.0.0');
    });
}

async function startServer() {
    await freePort(PORT);
    httpServer.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
    });
}


startServer();

// ─── Graceful shutdown (prevents EADDRINUSE on hot-reload) ───────────────────
function shutdown() {
    console.log('\n🛑 Shutting down server...');
    io.close(() => {
        httpServer.close(() => {
            console.log('✅ Server closed');
            process.exit(0);
        });
    });
    // Force exit after 3s if something hangs
    setTimeout(() => process.exit(1), 3000).unref();
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

