import * as auth from '../../src/shell/auth.js';

const BACKEND_URL = 'http://localhost:8000';

export function initUserManager(container) {
    Object.assign(container.style, {
        padding: '0', margin: '0', overflow: 'auto',
        background: '#1a1a22', color: '#e2e8f0',
        fontFamily: 'Segoe UI, sans-serif', height: '100%'
    });

    container.innerHTML = `
        <div style="padding:16px;">
            <h3 style="margin:0 0 16px;color:#fff;">Quản lý tài khoản hệ thống</h3>
            <div id="um-msg" style="display:none;padding:8px 12px;border-radius:6px;margin-bottom:12px;font-size:13px;"></div>
            <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap;">
                <input id="um-new-user" placeholder="Tên tài khoản" style="flex:1;min-width:120px;padding:8px;background:#111;border:1px solid #333;border-radius:4px;color:#fff;">
                <input id="um-new-pass" type="password" placeholder="Mật khẩu" style="flex:1;min-width:120px;padding:8px;background:#111;border:1px solid #333;border-radius:4px;color:#fff;">
                <select id="um-new-role" style="padding:8px;background:#111;border:1px solid #333;border-radius:4px;color:#fff;">
                    <option value="user">user</option>
                    <option value="admin">admin</option>
                </select>
                <button id="um-add-btn" style="padding:8px 16px;background:#007aff;color:#fff;border:none;border-radius:4px;cursor:pointer;">Thêm</button>
            </div>
            <table style="width:100%;border-collapse:collapse;font-size:13px;">
                <thead>
                    <tr style="background:#222;text-align:left;">
                        <th style="padding:8px;">ID</th>
                        <th style="padding:8px;">Username</th>
                        <th style="padding:8px;">Role</th>
                        <th style="padding:8px;">Thao tác</th>
                    </tr>
                </thead>
                <tbody id="um-tbody"></tbody>
            </table>
        </div>`;

    container.querySelector('#um-add-btn').addEventListener('click', () => handleAdd(container));
    loadUsers(container);
}

async function loadUsers(container) {
    const tbody = container.querySelector('#um-tbody');
    tbody.innerHTML = '<tr><td colspan="4" style="padding:12px;">Đang tải...</td></tr>';

    const users = await fetchUsers();
    tbody.innerHTML = '';

    users.forEach((user) => {
        const tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid #2d2d3d';
        tr.innerHTML = `
            <td style="padding:8px;">${user.id}</td>
            <td style="padding:8px;">${user.username}</td>
            <td style="padding:8px;">
                <select data-id="${user.id}" class="um-role" style="padding:4px;background:#111;border:1px solid #333;border-radius:4px;color:#fff;">
                    <option value="user" ${user.role === 'user' ? 'selected' : ''}>user</option>
                    <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>admin</option>
                </select>
            </td>
            <td style="padding:8px;display:flex;gap:6px;flex-wrap:wrap;">
                <button data-id="${user.id}" class="um-reset-pass" style="padding:4px 8px;background:#444;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:12px;">Đổi MK</button>
                <button data-id="${user.id}" data-name="${user.username}" class="um-del" style="padding:4px 8px;background:#c0392b;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:12px;">Xóa</button>
            </td>`;
        tbody.appendChild(tr);
    });

    tbody.querySelectorAll('.um-reset-pass').forEach((btn) => {
        btn.addEventListener('click', () => handleResetPass(container, btn.dataset.id));
    });
    tbody.querySelectorAll('.um-del').forEach((btn) => {
        btn.addEventListener('click', () => handleDelete(container, btn.dataset.id, btn.dataset.name));
    });
    tbody.querySelectorAll('.um-role').forEach((sel) => {
        sel.addEventListener('change', () => handleRoleChange(container, sel.dataset.id, sel.value));
    });
}

async function fetchUsers() {
    try {
        const res = await fetch(`${BACKEND_URL}/api/admin/users`);
        const data = await res.json();
        if (data.success) return data.users;
    } catch (_) { /* fallback below */ }
    return auth.getLocalUsers();
}

async function handleAdd(container) {
    const user = container.querySelector('#um-new-user').value.trim();
    const pass = container.querySelector('#um-new-pass').value;
    const role = container.querySelector('#um-new-role').value;
    if (!user || !pass) return showMsg('Vui lòng nhập đủ thông tin.', true);

    try {
        const res = await fetch(`${BACKEND_URL}/api/admin/users`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: user, password: pass, role })
        });
        const data = await res.json();
        if (data.success) {
            showMsg('Thêm tài khoản thành công.');
            container.querySelector('#um-new-user').value = '';
            container.querySelector('#um-new-pass').value = '';
            loadUsers(container);
            return;
        }
        showMsg(data.message, true);
    } catch (_) {
        const result = auth.localCreateUser(user, pass, role);
        showMsg(result.message, !result.success);
        if (result.success) loadUsers(container);
    }
}

async function handleResetPass(container, userId) {
    const newPass = prompt('Nhập mật khẩu mới (tối thiểu 6 ký tự):');
    if (!newPass) return;
    try {
        const res = await fetch(`${BACKEND_URL}/api/admin/users`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: parseInt(userId), password: newPass })
        });
        const data = await res.json();
        showMsg(data.message, !data.success);
    } catch (_) {
        const result = auth.localUpdatePassword(parseInt(userId), newPass);
        showMsg(result.message, !result.success);
        if (result.success) loadUsers(container);
    }
}

async function handleDelete(container, userId, username) {
    if (!confirm(`Xóa tài khoản "${username}"?`)) return;
    try {
        const res = await fetch(`${BACKEND_URL}/api/admin/users`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: parseInt(userId) })
        });
        const data = await res.json();
        showMsg(data.message, !data.success);
        if (data.success) loadUsers(container);
    } catch (_) {
        const result = auth.localDeleteUser(parseInt(userId));
        showMsg(result.message, !result.success);
        if (result.success) loadUsers(container);
    }
}

async function handleRoleChange(container, userId, role) {
    try {
        const res = await fetch(`${BACKEND_URL}/api/admin/users`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: parseInt(userId), role })
        });
        const data = await res.json();
        showMsg(data.message, !data.success);
    } catch (_) {
        const result = auth.localUpdateRole(parseInt(userId), role);
        showMsg(result.message, !result.success);
    }
}

function showMsg(text, isError = false) {
    const el = document.getElementById('um-msg');
    if (!el) return;
    el.textContent = text;
    el.style.display = 'block';
    el.style.background = isError ? 'rgba(192,57,43,0.3)' : 'rgba(39,174,96,0.3)';
    el.style.color = isError ? '#ff6b6b' : '#2ecc71';
    setTimeout(() => { el.style.display = 'none'; }, 3000);
}
