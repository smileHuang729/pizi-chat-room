import { useEffect, useRef } from 'react';
import { Message } from '../types';

function formatTime(timestamp: number) {
    const d = new Date(timestamp);
    return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
}

interface MessageListProps {
    messages: Message[];
    currentUserId: string;
}

export default function MessageList({ messages, currentUserId }: MessageListProps) {
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    return (
        <div className="message-list" id="message-list">
            {messages.length === 0 && (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                        暂无消息，发送第一条消息吧 👋
                    </span>
                </div>
            )}

            {messages.map((msg) => {
                if (msg.type === 'system') {
                    return (
                        <div key={msg.id} className="message-group message-system">
                            <span className="message-system-text">{msg.content}</span>
                        </div>
                    );
                }

                const isOwn = msg.sender?.id === currentUserId;
                return (
                    <div key={msg.id} className={`message-group message-row ${isOwn ? 'own' : ''}`}>
                        {/* Avatar */}
                        <div
                            className="msg-avatar"
                            style={{ background: msg.sender?.avatar ?? '#6366f1' }}
                            title={msg.sender?.username}
                        />

                        <div className="message-content">
                            <div className="message-meta">
                                <span className="message-sender">
                                    {isOwn ? '我' : msg.sender?.username}
                                </span>
                                <span className="message-time">{formatTime(msg.timestamp)}</span>
                            </div>
                            <div className="message-bubble">{msg.content}</div>
                        </div>
                    </div>
                );
            })}
            <div ref={bottomRef} />
        </div>
    );
}
