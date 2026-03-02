import { useState, useRef, useCallback } from 'react';

interface MessageInputProps {
    onSend: (content: string) => void;
    disabled?: boolean;
    roomName: string;
}

export default function MessageInput({ onSend, disabled, roomName }: MessageInputProps) {
    const [text, setText] = useState('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const handleSend = useCallback(() => {
        const content = text.trim();
        if (!content || disabled) return;
        onSend(content);
        setText('');
        textareaRef.current?.focus();
    }, [text, disabled, onSend]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="message-input-area">
            <div className="input-wrapper">
                <textarea
                    id="message-input"
                    ref={textareaRef}
                    className="message-textinput"
                    rows={1}
                    placeholder={disabled ? '连接中…' : `在 ${roomName} 发消息…`}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={disabled}
                />
                <button
                    id="send-btn"
                    className="send-btn"
                    onClick={handleSend}
                    disabled={!text.trim() || disabled}
                    aria-label="发送消息"
                >
                    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                    </svg>
                </button>
            </div>
            <div className="input-hint">Enter 发送 · Shift+Enter 换行</div>
        </div>
    );
}
