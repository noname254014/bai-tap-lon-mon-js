const BACKEND_URL = 'http://localhost:8000';
const LOCAL_USERS_KEY = 'webos_local_users';

let currentUser = null;
let backendAvailable = null;

const SAMPLE_USERS = [
    { id: 1, username: 'admin', password: 'admin123456', role: 'admin' },
    { id: 2, username: 'user1', password: 'password1', role: 'user' },
    { id: 3, username: 'user2', password: 'password2', role: 'user' }
];

function initLocalUsers() {
    if (!localStorage.getItem(LOCAL_USERS_KEY)) {
        saveToLocalStorage(LOCAL_USERS_KEY, SAMPLE_USERS);
    }
}

export function saveToLocalStorage(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
        console.error("[-] Lỗi ghi dữ liệu LocalStorage:", e);
    }
}

export function loadFromLocalStorage(key) {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : null;
    } catch (e) {
        console.error("[-] Lỗi đọc dữ liệu LocalStorage:", e);
        return null;
    }
}

export function getCurrentUser() {
    return currentUser;
}

export function isGuest() {
    return currentUser ? !!currentUser.isGuest : false;
}

export function isAdmin() {
    return currentUser?.role === 'admin';
}

export function getUserStateKey(suffix) {
    const id = currentUser?.isGuest ? 'guest' : (currentUser?.id ?? 'guest');
    return `webos_${suffix}_${id}`;
}

export function getWallpaperKey(userKey) {
    return `webos_wallpaper_${userKey}`;
}

export function getLocalUsers() {
    initLocalUsers();
    const users = loadFromLocalStorage(LOCAL_USERS_KEY) || [];
    return users.map(({ id, username, role }) => ({ id, username, role }));
}

function getLocalUsersFull() {
    initLocalUsers();
    return loadFromLocalStorage(LOCAL_USERS_KEY) || [];
}

function saveLocalUsers(users) {
    saveToLocalStorage(LOCAL_USERS_KEY, users);
}

async function checkBackend() {
    if (backendAvailable !== null) return backendAvailable;
    try {
        const res = await fetch(`${BACKEND_URL}/api/admin/users`, { signal: AbortSignal.timeout(2000) });
        backendAvailable = res.ok;
    } catch (_) {
        backendAvailable = false;
    }
    return backendAvailable;
}

function localLogin(username, password) {
    initLocalUsers();
    const users = getLocalUsersFull();
    const found = users.find(u => u.username === username.trim() && u.password === password);
    if (!found) return { success: false, message: 'Thông tin đăng nhập không hợp lệ.' };
    currentUser = { id: found.id, username: found.username, role: found.role, isGuest: false };
    return { success: true };
}

export async function attemptLogin(username, password, onLoginSuccess) {
    try {
        const response = await fetch(`${BACKEND_URL}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await response.json();
        backendAvailable = true;

        if (response.ok && data.success) {
            currentUser = {
                id: data.user_id,
                username: data.username || username,
                role: data.role || 'user',
                isGuest: false
            };
            if (typeof onLoginSuccess === 'function') onLoginSuccess(currentUser);
            return { success: true };
        }
        return { success: false, message: data.message || "Xác thực thất bại." };
    } catch (_) {
        backendAvailable = false;
        const result = localLogin(username, password);
        if (result.success && typeof onLoginSuccess === 'function') onLoginSuccess(currentUser);
        return result;
    }
}

export async function attemptRegister(username, password, onLoginSuccess) {
    try {
        const response = await fetch(`${BACKEND_URL}/api/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await response.json();
        backendAvailable = true;

        if (response.ok && data.success) {
            return await attemptLogin(username, password, onLoginSuccess);
        }
        return { success: false, message: data.message || "Đăng ký tài khoản thất bại." };
    } catch (_) {
        backendAvailable = false;
        return localCreateUser(username, password, 'user', onLoginSuccess);
    }
}

export function loginAsGuest(onLoginSuccess) {
    currentUser = { id: null, username: 'Guest', role: 'guest', isGuest: true };
    if (typeof onLoginSuccess === 'function') onLoginSuccess(currentUser);
    return { success: true };
}

export function logout() {
    currentUser = null;
}

export function localCreateUser(username, password, role = 'user', onLoginSuccess) {
    initLocalUsers();
    const users = getLocalUsersFull();
    if (users.some(u => u.username === username.trim())) {
        return { success: false, message: `Tài khoản '${username}' đã tồn tại.` };
    }
    if (password.length < 6) {
        return { success: false, message: 'Mật khẩu phải có tối thiểu 6 ký tự.' };
    }
    const newUser = {
        id: Math.max(0, ...users.map(u => u.id)) + 1,
        username: username.trim(),
        password,
        role
    };
    users.push(newUser);
    saveLocalUsers(users);
    if (typeof onLoginSuccess === 'function') {
        currentUser = { id: newUser.id, username: newUser.username, role: newUser.role, isGuest: false };
        onLoginSuccess(currentUser);
    }
    return { success: true, message: 'Tạo tài khoản thành công.' };
}

export function localUpdatePassword(userId, newPassword) {
    const users = getLocalUsersFull();
    const user = users.find(u => u.id === userId);
    if (!user) return { success: false, message: 'Không tìm thấy tài khoản.' };
    if (newPassword.length < 6) return { success: false, message: 'Mật khẩu phải có tối thiểu 6 ký tự.' };
    user.password = newPassword;
    saveLocalUsers(users);
    return { success: true, message: 'Cập nhật mật khẩu thành công.' };
}

export function localUpdateRole(userId, role) {
    const users = getLocalUsersFull();
    const user = users.find(u => u.id === userId);
    if (!user) return { success: false, message: 'Không tìm thấy tài khoản.' };
    user.role = role;
    saveLocalUsers(users);
    return { success: true, message: 'Cập nhật vai trò thành công.' };
}

export function localDeleteUser(userId) {
    const users = getLocalUsersFull();
    const user = users.find(u => u.id === userId);
    if (!user) return { success: false, message: 'Không tìm thấy tài khoản.' };
    if (user.username === 'admin') return { success: false, message: 'Không thể xóa admin gốc.' };
    saveLocalUsers(users.filter(u => u.id !== userId));
    return { success: true, message: 'Đã xóa tài khoản.' };
}

initLocalUsers();
