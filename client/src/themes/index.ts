export interface Theme {
    id: string;
    name: string;
    emoji: string;
    vars: Record<string, string>;
}

export const themes: Theme[] = [
    {
        id: 'indigo',
        name: '深夜蓝',
        emoji: '🔵',
        vars: {
            '--accent': '#6366f1',
            '--accent-glow': 'rgba(99, 102, 241, 0.3)',
            '--accent-light': '#818cf8',
            '--accent-hover': '#4f46e5',
            '--bg-primary': '#0d1117',
            '--bg-secondary': '#161b22',
            '--bg-tertiary': '#1c2128',
        },
    },
    {
        id: 'emerald',
        name: '极光绿',
        emoji: '🟢',
        vars: {
            '--accent': '#10b981',
            '--accent-glow': 'rgba(16, 185, 129, 0.3)',
            '--accent-light': '#34d399',
            '--accent-hover': '#059669',
            '--bg-primary': '#0a1110',
            '--bg-secondary': '#111a18',
            '--bg-tertiary': '#172320',
        },
    },
    {
        id: 'rose',
        name: '玫瑰红',
        emoji: '🔴',
        vars: {
            '--accent': '#f43f5e',
            '--accent-glow': 'rgba(244, 63, 94, 0.3)',
            '--accent-light': '#fb7185',
            '--accent-hover': '#e11d48',
            '--bg-primary': '#110a0d',
            '--bg-secondary': '#1a1014',
            '--bg-tertiary': '#211519',
        },
    },
    {
        id: 'amber',
        name: '琥珀橙',
        emoji: '🟠',
        vars: {
            '--accent': '#f59e0b',
            '--accent-glow': 'rgba(245, 158, 11, 0.3)',
            '--accent-light': '#fbbf24',
            '--accent-hover': '#d97706',
            '--bg-primary': '#110e07',
            '--bg-secondary': '#1a150a',
            '--bg-tertiary': '#211b0e',
        },
    },
    {
        id: 'violet',
        name: '星空紫',
        emoji: '🟣',
        vars: {
            '--accent': '#a855f7',
            '--accent-glow': 'rgba(168, 85, 247, 0.3)',
            '--accent-light': '#c084fc',
            '--accent-hover': '#9333ea',
            '--bg-primary': '#0e0b12',
            '--bg-secondary': '#15111c',
            '--bg-tertiary': '#1c1726',
        },
    },
    {
        id: 'cyan',
        name: '极地冰',
        emoji: '🩵',
        vars: {
            '--accent': '#06b6d4',
            '--accent-glow': 'rgba(6, 182, 212, 0.3)',
            '--accent-light': '#22d3ee',
            '--accent-hover': '#0891b2',
            '--bg-primary': '#080f12',
            '--bg-secondary': '#0d181c',
            '--bg-tertiary': '#122028',
        },
    },
];

const STORAGE_KEY = 'chatroom-theme';

export function applyTheme(theme: Theme) {
    const root = document.documentElement;
    Object.entries(theme.vars).forEach(([key, value]) => {
        root.style.setProperty(key, value);
    });
    localStorage.setItem(STORAGE_KEY, theme.id);
}

export function loadSavedTheme(): Theme {
    const savedId = localStorage.getItem(STORAGE_KEY);
    return themes.find((t) => t.id === savedId) ?? themes[0];
}
