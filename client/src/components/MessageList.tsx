import { useEffect, useRef, useState } from 'react';
import { Message } from '../types';

function formatTime(timestamp: number) {
    const d = new Date(timestamp);
    return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
}

function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="28" height="28">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
    );
}

interface LightboxProps {
    src: string;
    alt: string;
    onClose: () => void;
}

function Lightbox({ src, alt, onClose }: LightboxProps) {
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    return (
        <div className="lightbox-backdrop" onClick={onClose}>
            <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
                <img src={src} alt={alt} className="lightbox-img" />
                <button className="lightbox-close" onClick={onClose} aria-label="关闭">×</button>
            </div>
        </div>
    );
}

interface MessageListProps {
    messages: Message[];
    currentUserId: string;
}

export default function MessageList({ messages, currentUserId }: MessageListProps) {
    const bottomRef = useRef<HTMLDivElement>(null);
    const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null);

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

                            {/* Image message */}
                            {msg.msgType === 'image' && msg.fileData ? (
                                <div
                                    className={`message-bubble msg-bubble-media ${isOwn ? 'own' : ''}`}
                                    onClick={() =>
                                        setLightbox({ src: msg.fileData!.dataUrl, alt: msg.fileData!.name })
                                    }
                                >
                                    <img
                                        src={msg.fileData.dataUrl}
                                        alt={msg.fileData.name}
                                        className="msg-image"
                                    />
                                </div>
                            ) : msg.msgType === 'file' && msg.fileData ? (
                                /* File message */
                                <div className={`file-card ${isOwn ? 'own' : ''}`}>
                                    <div className="file-card-icon">
                                        <FileIcon />
                                    </div>
                                    <div className="file-card-info">
                                        <span className="file-card-name">{msg.fileData.name}</span>
                                        <span className="file-card-size">
                                            {formatFileSize(msg.fileData.size)}
                                        </span>
                                    </div>
                                    <a
                                        href={msg.fileData.dataUrl}
                                        download={msg.fileData.name}
                                        className="file-card-download"
                                        title="下载文件"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                                        </svg>
                                    </a>
                                </div>
                            ) : (
                                /* Text message */
                                <div className="message-bubble">{msg.content}</div>
                            )}
                        </div>
                    </div>
                );
            })}
            <div ref={bottomRef} />

            {/* Lightbox */}
            {lightbox && (
                <Lightbox
                    src={lightbox.src}
                    alt={lightbox.alt}
                    onClose={() => setLightbox(null)}
                />
            )}
        </div>
    );
}
