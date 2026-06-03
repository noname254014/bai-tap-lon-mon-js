import { importSingleImage, importImageFolder, resetToTempBackground } from '../desktop/background-manager.js';

let menuEl = null;

export function initDesktopContextMenu(desktopElement) {
    desktopElement.addEventListener('contextmenu', (e) => {
        if (e.target.closest('.desktop-icon') || e.target.closest('[id^="create_window"]')) return;
        e.preventDefault();
        showMenu(e.clientX, e.clientY);
    });

    document.addEventListener('click', hideMenu);
    document.addEventListener('contextmenu', (e) => {
        if (!menuEl?.contains(e.target)) hideMenu();
    });
}

function showMenu(x, y) {
    hideMenu();
    menuEl = document.createElement('div');
    menuEl.id = 'desktop-context-menu';
    Object.assign(menuEl.style, {
        position: 'fixed',
        top: `${y}px`, left: `${x}px`,
        background: 'rgba(30,30,40,0.95)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: '8px',
        padding: '4px 0',
        minWidth: '200px',
        zIndex: '999999',
        boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        fontFamily: 'Segoe UI, sans-serif',
        fontSize: '13px',
        color: '#eee'
    });

    addItem('Thay nền (1 ảnh)', () => pickSingleImage());
    addItem('Thay nền (thư mục ảnh)', () => pickFolder());
    addItem('Khôi phục nền mặc định (temp)', () => resetToTempBackground());
    addSeparator();
    addItem('Làm mới màn hình', () => location.reload());

    document.body.appendChild(menuEl);

    const rect = menuEl.getBoundingClientRect();
    if (rect.right > window.innerWidth) menuEl.style.left = `${x - rect.width}px`;
    if (rect.bottom > window.innerHeight) menuEl.style.top = `${y - rect.height}px`;
}

function addItem(label, onClick) {
    const item = document.createElement('div');
    item.textContent = label;
    Object.assign(item.style, {
        padding: '8px 16px',
        cursor: 'pointer',
        transition: 'background 0.15s'
    });
    item.addEventListener('mouseenter', () => { item.style.background = 'rgba(255,255,255,0.1)'; });
    item.addEventListener('mouseleave', () => { item.style.background = 'transparent'; });
    item.addEventListener('click', (e) => {
        e.stopPropagation();
        hideMenu();
        onClick();
    });
    menuEl.appendChild(item);
}

function addSeparator() {
    const sep = document.createElement('div');
    Object.assign(sep.style, {
        height: '1px',
        background: 'rgba(255,255,255,0.1)',
        margin: '4px 8px'
    });
    menuEl.appendChild(sep);
}

function hideMenu() {
    if (menuEl) { menuEl.remove(); menuEl = null; }
}

function pickSingleImage() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () => {
        if (input.files[0]) importSingleImage(input.files[0]).catch(alert);
    };
    input.click();
}

function pickFolder() {
    const input = document.createElement('input');
    input.type = 'file';
    input.webkitdirectory = true;
    input.onchange = () => {
        if (input.files.length) importImageFolder(input.files).catch(alert);
    };
    input.click();
}
