import { STYLES } from '../assets/styles.js';
import { restoreWindow, minimizeWindow, openWindows } from '../desktop/window_factory.js';

let taskbarContainer = null;
let startMenuEl = null;
let systemCallbacks = {};

const APP_ICONS = {
    'File Explorer': './src/shell/assets/icons/default_folder.svg',
    'Task Manager': './src/shell/assets/icons/file_type_taskfile.svg',
    'User Manager': './src/shell/assets/icons/default_file.svg',
    'Elevator Simulation': './src/shell/assets/icons/default_file.svg',
    'Ứng dụng số 1': './src/shell/assets/icons/default_file.svg',
    'Ứng dụng số 2': './src/shell/assets/icons/default_file.svg',
};

export function initTaskbar(parent, callbacks = {}) {
    systemCallbacks = callbacks;
    taskbarContainer = document.createElement('div');
    Object.assign(taskbarContainer.style, STYLES.taskbar);
    taskbarContainer.id = 'taskbar_id';

    const startBtn = createStartButton();
    taskbarContainer.appendChild(startBtn);

    const appArea = document.createElement('div');
    appArea.id = 'taskbar-apps';
    Object.assign(appArea.style, {
        display: 'flex', flex: '1', alignItems: 'center', overflow: 'hidden'
    });
    taskbarContainer.appendChild(appArea);

    const clock = document.createElement('div');
    clock.id = 'taskbar-clock';
    Object.assign(clock.style, {
        color: '#fff', fontSize: '12px', padding: '0 12px',
        fontFamily: 'Segoe UI, sans-serif', userSelect: 'none'
    });
    updateClock(clock);
    setInterval(() => updateClock(clock), 30000);
    taskbarContainer.appendChild(clock);

    parent.appendChild(taskbarContainer);
    return taskbarContainer;
}

function createStartButton() {
    const btn = document.createElement('button');
    btn.id = 'start-btn';
    btn.title = 'Start';
    Object.assign(btn.style, {
        width: '40px', height: '36px',
        background: 'rgba(255,255,255,0.1)',
        border: 'none', borderRadius: '6px',
        cursor: 'pointer', marginRight: '8px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '18px', color: '#fff', flexShrink: '0'
    });
    btn.innerHTML = '&#9776;';

    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleStartMenu(btn);
    });

    document.addEventListener('click', () => hideStartMenu());
    return btn;
}

function toggleStartMenu(anchor) {
    if (startMenuEl) { hideStartMenu(); return; }

    startMenuEl = document.createElement('div');
    startMenuEl.id = 'start-menu';
    Object.assign(startMenuEl.style, {
        position: 'fixed',
        bottom: '52px', left: '8px',
        background: 'rgba(30,30,40,0.97)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: '10px',
        padding: '8px 0',
        minWidth: '220px',
        zIndex: '999999',
        boxShadow: '0 -4px 24px rgba(0,0,0,0.4)',
        fontFamily: 'Segoe UI, sans-serif',
        fontSize: '13px', color: '#eee'
    });

    addMenuItem('Ngủ (Sleep)', 'Chỉ hiển thị nền', () => {
        hideStartMenu();
        systemCallbacks.onSleep?.();
    });
    addMenuItem('Đăng xuất (Log out)', 'Về màn hình đăng nhập', () => {
        hideStartMenu();
        systemCallbacks.onLogout?.();
    });
    addSeparator();
    addMenuItem('Tắt máy (Shutdown)', 'Thoát Web OS', () => {
        hideStartMenu();
        systemCallbacks.onShutdown?.();
    });

    document.body.appendChild(startMenuEl);
    startMenuEl.addEventListener('click', (e) => e.stopPropagation());
}

function addMenuItem(title, subtitle, onClick) {
    const item = document.createElement('div');
    Object.assign(item.style, {
        padding: '10px 16px', cursor: 'pointer', transition: 'background 0.15s'
    });
    item.innerHTML = `<div style="font-weight:600;">${title}</div><div style="font-size:11px;color:#aaa;margin-top:2px;">${subtitle}</div>`;
    item.addEventListener('mouseenter', () => { item.style.background = 'rgba(255,255,255,0.1)'; });
    item.addEventListener('mouseleave', () => { item.style.background = 'transparent'; });
    item.addEventListener('click', onClick);
    startMenuEl.appendChild(item);
}

function addSeparator() {
    const sep = document.createElement('div');
    Object.assign(sep.style, { height: '1px', background: 'rgba(255,255,255,0.1)', margin: '4px 12px' });
    startMenuEl.appendChild(sep);
}

function hideStartMenu() {
    if (startMenuEl) { startMenuEl.remove(); startMenuEl = null; }
}

function updateClock(el) {
    const now = new Date();
    el.textContent = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

export function registerAppToTaskbar(windowElement, appName) {
    const appArea = document.getElementById('taskbar-apps') || taskbarContainer;
    if (!appArea) return null;

    let iconBtn = document.createElement('button');
    Object.assign(iconBtn.style, STYLES.taskbarAppIcon);

    const iconPath = APP_ICONS[appName];
    if (iconPath) {
        const img = document.createElement('img');
        img.src = iconPath;
        img.alt = appName;
        Object.assign(img.style, { width: '24px', height: '24px' });
        img.onerror = () => { iconBtn.textContent = appName.substring(0, 2).toUpperCase(); };
        iconBtn.appendChild(img);
    } else {
        iconBtn.textContent = appName.substring(0, 2).toUpperCase();
    }

    iconBtn.title = appName;
    iconBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const windowId = windowElement.id;
        const winData = openWindows.get(windowId);
        if (windowElement.style.display === 'none' || (winData && winData.isMinimized)) {
            restoreWindow(windowId);
        } else {
            minimizeWindow(windowId);
        }
    });

    appArea.appendChild(iconBtn);
    return iconBtn;
}

export function setTaskbarVisible(visible) {
    if (taskbarContainer) taskbarContainer.style.display = visible ? 'flex' : 'none';
}
