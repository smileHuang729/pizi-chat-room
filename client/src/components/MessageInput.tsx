import { useState, useRef, useCallback } from 'react';
import { FileData } from '../types';
import { SendMessagePayload } from '../hooks/useSocket';

interface MessageInputProps {
    onSend: (payload: SendMessagePayload) => void;
    disabled?: boolean;
    roomName: string;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

interface PendingFile {
    file: File;
    preview?: string; // data URL for images
}

export default function MessageInput({ onSend, disabled, roomName }: MessageInputProps) {
    const [text, setText] = useState('');
    const [pendingFile, setPendingFile] = useState<PendingFile | null>(null);
    const [error, setError] = useState<string | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const isImage = (file: File) => file.type.startsWith('image/');

    const handleFile = useCallback(async (file: File) => {
        setError(null);
        if (file.size > MAX_FILE_SIZE) {
            setError(`文件过大（${formatFileSize(file.size)}），请上传小于 5MB 的文件`);
            return;
        }
        if (isImage(file)) {
            const preview = await readFileAsDataUrl(file);
            setPendingFile({ file, preview });
        } else {
            setPendingFile({ file });
        }
    }, []);

    const handleFileChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            // Reset so the same file can be re-selected
            e.target.value = '';
        },
        [handleFile]
    );

    const handlePaste = useCallback(
        (e: React.ClipboardEvent) => {
            const items = e.clipboardData?.items;
            if (!items) return;
            for (const item of Array.from(items)) {
                if (item.kind === 'file') {
                    e.preventDefault();
                    const file = item.getAsFile();
                    if (file) handleFile(file);
                    return;
                }
            }
        },
        [handleFile]
    );

    const handleSend = useCallback(async () => {
        if (disabled) return;

        if (pendingFile) {
            try {
                const dataUrl = pendingFile.preview ?? (await readFileAsDataUrl(pendingFile.file));
                const fileData: FileData = {
                    name: pendingFile.file.name,
                    size: pendingFile.file.size,
                    mimeType: pendingFile.file.type,
                    dataUrl,
                };
                onSend({
                    content: text.trim() || pendingFile.file.name,
                    msgType: isImage(pendingFile.file) ? 'image' : 'file',
                    fileData,
                });
                setPendingFile(null);
                setText('');
                textareaRef.current?.focus();
            } catch {
                setError('文件读取失败，请重试');
            }
            return;
        }

        const content = text.trim();
        if (!content) return;
        onSend({ content, msgType: 'text' });
        setText('');
        textareaRef.current?.focus();
    }, [text, disabled, onSend, pendingFile]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const canSend = !disabled && (!!text.trim() || !!pendingFile);

    return (
        <div className="message-input-area">
            {/* Error */}
            {error && (
                <div className="input-error">
                    <span>⚠️ {error}</span>
                    <button className="input-error-close" onClick={() => setError(null)}>×</button>
                </div>
            )}

            {/* File preview strip */}
            {pendingFile && (
                <div className="file-preview-strip">
                    <div className="file-preview-item">
                        {pendingFile.preview ? (
                            <img src={pendingFile.preview} alt="preview" className="file-preview-thumb" />
                        ) : (
                            <div className="file-preview-icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                                </svg>
                            </div>
                        )}
                        <div className="file-preview-info">
                            <span className="file-preview-name">{pendingFile.file.name}</span>
                            <span className="file-preview-size">{formatFileSize(pendingFile.file.size)}</span>
                        </div>
                        <button
                            className="file-preview-remove"
                            onClick={() => setPendingFile(null)}
                            aria-label="取消文件"
                        >×</button>
                    </div>
                </div>
            )}

            <div className="input-wrapper">
                {/* Hidden file input */}
                <input
                    ref={fileInputRef}
                    type="file"
                    id="file-input"
                    className="file-input-hidden"
                    accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar,.7z,.mp4,.mp3"
                    onChange={handleFileChange}
                    disabled={disabled}
                />

                {/* Attach button */}
                <button
                    className="attach-btn"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={disabled}
                    aria-label="发送文件"
                    title="发送图片或文件"
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
                    </svg>
                </button>

                <textarea
                    id="message-input"
                    ref={textareaRef}
                    className="message-textinput"
                    rows={1}
                    placeholder={disabled ? '连接中…' : `在 ${roomName} 发消息…`}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onPaste={handlePaste}
                    disabled={disabled}
                />

                <button
                    id="send-btn"
                    className="send-btn"
                    onClick={handleSend}
                    disabled={!canSend}
                    aria-label="发送消息"
                >
                    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                    </svg>
                </button>
            </div>

            <div className="input-hint">
                Enter 发送 · Shift+Enter 换行 · 粘贴图片/文件直接上传
            </div>
        </div>
    );
}
