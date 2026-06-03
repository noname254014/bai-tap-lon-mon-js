import { initDesktop, teardownDesktop } from './desktop/desktop.js';
import { initBackgroundManager, setSleepMode } from './desktop/background-manager.js';
import { initDesktopIcons } from './desktop/desktop-icons.js';
import { initTaskbar } from './system-ui/taskbar.js';
import { initDesktopContextMenu } from './system-ui/context-menu.js';
import {
    create_single_app, getWindowState, restoreWindowState,
    openWindows, restoreWindow
} from './desktop/window_factory.js';
import * as auth from './auth.js';
import * as anim from './login-animation.js';
import { initFileExplorer } from '../../apps/file-explorer/file-explorer.js';
import { initTaskManager } from '../../apps/task-manager/task-manager.js';
import { initUserManager } from '../../apps/user-manager/user-manager.js';
import { initElevatorSimulation } from '../apps/elevator/elevator.js';

window.addEventListener('error', (e) => console.error('[ERROR]', e.error));
window.addEventListener('unhandledrejection', (e) => console.error('[UNHANDLED REJECTION]', e.reason));

let isSleeping = false;
let autoSaveTimer = null;
const appInstances = new Map();

const USER_DEFAULTS = {
    admin: { apps: ['File Explorer', 'Task Manager', 'Elevator Simulation', 'User Manager'], extraWindows: 0 },
    user1: { apps: ['File Explorer', 'Task Manager', 'Elevator Simulation'], extraWindows: 1 },
    user2: { apps: ['File Explorer', 'Elevator Simulation'], extraWindows: 0 },
    guest: { apps: ['File Explorer', 'Task Manager', 'Elevator Simulation'], extraWindows: 0 }
};

function getUserKey() {
    const u = auth.getCurrentUser();
    if (!u) return 'guest';
    if (u.isGuest) return 'guest';
    return u.username || String(u.id);
}

function getUserDefaults() {
    const key = getUserKey();
    if (auth.isAdmin()) return USER_DEFAULTS.admin;
    return USER_DEFAULTS[key] || USER_DEFAULTS.guest;
}

function initAppContent(win, appName) {
    if (!win?.contentDiv) return;
    switch (appName) {
        case 'File Explorer': initFileExplorer(win.contentDiv); break;
        case 'Task Manager': initTaskManager(win.contentDiv); break;
        case 'User Manager': initUserManager(win.contentDiv); break;
        case 'Elevator Simulation': initElevatorSimulation(win.contentDiv); break;
        default:
            win.contentDiv.innerHTML = `<div style="padding:20px;color:#333;">${appName}</div>`;
    }
}

function launchApp(desktop, appName) {
    const existing = appInstances.get(appName);
    if (existing) {
        const el = document.getElementById(existing);
        if (el) { restoreWindow(existing); return el; }
        appInstances.delete(appName);
    }

    const win = create_single_app(desktop, appName);
    if (win) {
        appInstances.set(appName, win.id);
        if (appName === 'Elevator Simulation') {
            win.style.width = '960px';
            win.style.height = '640px';
        }
        initAppContent(win, appName);
    }
    return win;
}

async function loadSavedState() {
    if (auth.isGuest()) {
        return auth.loadFromLocalStorage(auth.getUserStateKey('windowState'));
    }
    try {
        const user = auth.getCurrentUser();
        const res = await fetch(`http://localhost:8000/api/state/window/load?user_id=${user.id}`);
        const data = await res.json();
        if (data.success && data.state && Object.keys(data.state).length > 0) {
            return data.state;
        }
    } catch (e) {
        console.warn('[-] Không tải được state từ server, dùng localStorage.');
    }
    return auth.loadFromLocalStorage(auth.getUserStateKey('windowState'));
}

function saveState() {
    const state = getWindowState();
    auth.saveToLocalStorage(auth.getUserStateKey('windowState'), state);
}

async function launchDesktop() {
    const userKey = getUserKey();
    const desktop = initDesktop();
    initBackgroundManager(userKey);
    initDesktopContextMenu(desktop);

    const defaults = getUserDefaults();
    const desktopApps = [...defaults.apps];
    if (auth.isAdmin() && !desktopApps.includes('User Manager')) {
        desktopApps.push('User Manager');
    }

    initDesktopIcons(desktop, (appName) => launchApp(desktop, appName), desktopApps);

    initTaskbar(desktop, {
        onSleep: () => toggleSleep(true),
        onLogout: () => handleLogout(),
        onShutdown: () => handleShutdown()
    });

    openWindows.clear();
    appInstances.clear();

    const savedState = await loadSavedState();
    if (savedState && Object.keys(savedState).length > 0) {
        restoreWindowState(desktop, savedState);
        Object.values(savedState).forEach((cfg) => {
            if (cfg.appName) appInstances.set(cfg.appName, cfg.id);
            const el = document.getElementById(cfg.id);
            if (el?.contentDiv) initAppContent(el, cfg.appName);
        });
    } else {
        defaults.apps.forEach((app) => launchApp(desktop, app));
        for (let i = 0; i < defaults.extraWindows; i++) {
            create_single_app(desktop, `Ứng dụng số ${i + 1}`);
        }
    }

    if (autoSaveTimer) clearInterval(autoSaveTimer);
    autoSaveTimer = setInterval(async () => {
        const state = getWindowState();
        auth.saveToLocalStorage(auth.getUserStateKey('windowState'), state);
        if (!auth.isGuest()) {
            try {
                const user = auth.getCurrentUser();
                await fetch('http://localhost:8000/api/state/window/save', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ user_id: user.id, state })
                });
            } catch (_) { /* offline ok */ }
        }
    }, 30000);
}

function toggleSleep(active) {
    isSleeping = active ?? !isSleeping;
    const desktopScreen = document.getElementById('desktop-screen');
    if (desktopScreen) desktopScreen.classList.toggle('sleep-mode', isSleeping);
    setSleepMode(isSleeping);

    if (isSleeping) {
        const wake = () => {
            document.removeEventListener('click', wake);
            document.removeEventListener('keydown', wake);
            toggleSleep(false);
        };
        setTimeout(() => {
            document.addEventListener('click', wake);
            document.addEventListener('keydown', wake);
        }, 300);
    }
}

function handleShutdown() {
    saveState();
    if (confirm('Tắt Web OS và thoát trình duyệt?')) {
        window.close();
        setTimeout(() => { location.href = 'about:blank'; }, 300);
    }
}

function handleLogout() {
    saveState();
    if (autoSaveTimer) { clearInterval(autoSaveTimer); autoSaveTimer = null; }
    auth.logout();
    openWindows.clear();
    appInstances.clear();
    isSleeping = false;

    teardownDesktop();

    const loginScreen = document.getElementById('login-screen');
    const desktopScreen = document.getElementById('desktop-screen');

    loginScreen.style.display = 'flex';
    loginScreen.style.opacity = '1';
    desktopScreen.classList.remove('sleep-mode');
    desktopScreen.style.display = 'none';
    desktopScreen.style.opacity = '0';

    const loginFormBox = document.getElementById('login-form-box');
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
    document.getElementById('login-error').style.display = 'none';

    if (loginFormBox) anim.animateFormEntry(loginFormBox);
}

document.addEventListener('DOMContentLoaded', () => {
    const loginFormBox = document.getElementById('login-form-box');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const errorDisplay = document.getElementById('login-error');

    anim.animateFormEntry(loginFormBox);

    const handleLoginSuccess = () => {
        anim.animateLoginSuccess('#login-screen', '#desktop-screen', () => {
            launchDesktop();
        });
    };

    const validateInputs = () => {
        errorDisplay.style.display = 'none';
        let valid = true;
        if (!usernameInput.value.trim()) { anim.animateInputShake(usernameInput); valid = false; }
        if (!passwordInput.value.trim()) { anim.animateInputShake(passwordInput); valid = false; }
        return valid;
    };

    document.getElementById('btn-login').addEventListener('click', async () => {
        if (!validateInputs()) return;
        const result = await auth.attemptLogin(usernameInput.value, passwordInput.value, handleLoginSuccess);
        if (!result.success) {
            errorDisplay.textContent = result.message;
            errorDisplay.style.display = 'block';
            anim.animateInputShake(loginFormBox);
        }
    });

    document.getElementById('btn-register').addEventListener('click', async () => {
        if (!validateInputs()) return;
        const result = await auth.attemptRegister(usernameInput.value, passwordInput.value, handleLoginSuccess);
        if (!result.success) {
            errorDisplay.textContent = result.message;
            errorDisplay.style.display = 'block';
            anim.animateInputShake(loginFormBox);
        }
    });

    document.getElementById('btn-guest').addEventListener('click', () => {
        auth.loginAsGuest(handleLoginSuccess);
    });
});
