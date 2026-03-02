export interface User {
    id: string;
    username: string;
    avatar: string; // CSS color
}

export interface Message {
    id: string;
    type: 'message' | 'system';
    content: string;
    sender?: {
        id: string;
        username: string;
        avatar: string;
    };
    room: string;
    timestamp: number;
}

export interface ChatState {
    username: string;
    avatar: string;
    currentRoom: string;
    rooms: string[];
    messages: Message[];
    users: User[];
    connected: boolean;
}
