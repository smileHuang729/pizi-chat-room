import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { Message, User, FileData } from '../types';

const SERVER_URL = `http://${window.location.hostname}:3001`;

export interface SendMessagePayload {
    content: string;
    msgType?: 'text' | 'image' | 'file';
    fileData?: FileData;
}

export function useSocket() {
    const socketRef = useRef<Socket | null>(null);
    const [connected, setConnected] = useState(false);
    const [rooms, setRooms] = useState<string[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);
    const [roomUsers, setRoomUsers] = useState<User[]>([]);

    useEffect(() => {
        const socket = io(SERVER_URL, {
            transports: ['polling', 'websocket'], // start with polling, upgrade to ws
            withCredentials: false,
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            timeout: 20000,
        });
        socketRef.current = socket;

        socket.on('connect', () => {
            setConnected(true);
            socket.emit('get-rooms');
        });

        socket.on('disconnect', () => setConnected(false));

        socket.on('rooms', (roomList: string[]) => setRooms(roomList));

        socket.on('room-history', (history: Message[]) => {
            setMessages(history);
        });

        socket.on('receive-message', (msg: Message) => {
            setMessages((prev) => [...prev, msg]);
        });

        socket.on('ai-reply-replace', ({ replaceId, msg }: { replaceId: string; msg: Message }) => {
            setMessages((prev) =>
                prev.map((m) => (m.id === replaceId ? msg : m))
            );
        });

        socket.on('room-users', (users: User[]) => setRoomUsers(users));

        return () => {
            socket.disconnect();
        };
    }, []);

    const joinRoom = useCallback(
        (username: string, room: string, avatar: string) => {
            setMessages([]); // clear before history arrives
            socketRef.current?.emit('join-room', { username, room, avatar });
        },
        []
    );

    const sendMessage = useCallback((payload: SendMessagePayload | string) => {
        socketRef.current?.emit('send-message', payload);
    }, []);

    return { connected, rooms, messages, roomUsers, joinRoom, sendMessage };
}
