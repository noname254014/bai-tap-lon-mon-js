import { STYLES } from '../assets/styles.js';

export function initDesktop() {
    const desktopScreen = document.getElementById('desktop-screen');
    if (!desktopScreen) {
        console.error('[-] Không tìm thấy #desktop-screen');
        return null;
    }

    let desktop = document.getElementById('desktop_id');
    if (desktop) return desktop;

    desktop = document.createElement('div');
    Object.assign(desktop.style, {
        ...STYLES.desktop,
        background: 'transparent',
        zIndex: '10'
    });
    desktop.id = 'desktop_id';
    desktopScreen.appendChild(desktop);
    return desktop;
}

export function setDesktopUIVisible(visible) {
    const desktop = document.getElementById('desktop_id');
    const taskbar = document.getElementById('taskbar_id');
    const icons = document.getElementById('desktop-icons');

    if (desktop) {
        Array.from(desktop.children).forEach((child) => {
            if (child.id !== 'desktop-icons') {
                child.style.visibility = visible ? 'visible' : 'hidden';
            }
        });
    }
    if (taskbar) taskbar.style.display = visible ? 'flex' : 'none';
    if (icons) icons.style.display = visible ? 'flex' : 'none';

    document.querySelectorAll('[id^="create_window"], [id^="win_"]').forEach((win) => {
        if (!visible) win.dataset._sleepHidden = win.style.display;
        win.style.display = visible ? (win.dataset._sleepHidden || 'flex') : 'none';
        if (visible) delete win.dataset._sleepHidden;
    });
}

export function teardownDesktop() {
    const desktopScreen = document.getElementById('desktop-screen');
    if (desktopScreen) desktopScreen.innerHTML = '';
}
