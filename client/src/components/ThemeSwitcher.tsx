import { useState } from 'react';
import { themes, Theme } from '../themes';

interface ThemeSwitcherProps {
    currentTheme: Theme;
    onChangeTheme: (theme: Theme) => void;
}

export default function ThemeSwitcher({ currentTheme, onChangeTheme }: ThemeSwitcherProps) {
    const [open, setOpen] = useState(false);

    return (
        <div className="theme-switcher">
            <button
                id="theme-switcher-btn"
                className="theme-switcher-btn"
                onClick={() => setOpen((v) => !v)}
                title="切换主题"
                aria-label="切换主题"
            >
                <span className="theme-switcher-icon">🎨</span>
                <span className="theme-switcher-label">{currentTheme.name}</span>
                <span className={`theme-switcher-arrow ${open ? 'open' : ''}`}>▾</span>
            </button>

            {open && (
                <>
                    {/* backdrop */}
                    <div className="theme-backdrop" onClick={() => setOpen(false)} />
                    <div className="theme-dropdown">
                        <div className="theme-dropdown-title">选择主题</div>
                        {themes.map((theme) => (
                            <button
                                key={theme.id}
                                id={`theme-${theme.id}`}
                                className={`theme-option ${currentTheme.id === theme.id ? 'active' : ''}`}
                                onClick={() => {
                                    onChangeTheme(theme);
                                    setOpen(false);
                                }}
                            >
                                <span
                                    className="theme-option-swatch"
                                    style={{ background: theme.vars['--accent'] }}
                                />
                                <span className="theme-option-emoji">{theme.emoji}</span>
                                <span className="theme-option-name">{theme.name}</span>
                                {currentTheme.id === theme.id && (
                                    <span className="theme-option-check">✓</span>
                                )}
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
