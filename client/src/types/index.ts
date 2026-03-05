export interface User {
    id: string;
    username: string;
    avatar: string; // CSS color
}

export interface FileData {
    name: string;
    size: number;
    mimeType: string;
    dataUrl: string;
}

export interface Message {
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

export interface ChatState {
    username: string;
    avatar: string;
    currentRoom: string;
    rooms: string[];
    messages: Message[];
    users: User[];
    connected: boolean;
}
