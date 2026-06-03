import { STYLES } from '../assets/styles.js';
import { registerAppToTaskbar } from '../system-ui/taskbar.js';
// Bước 3.1 — Map lưu trữ danh sách các cửa sổ đang hoạt động thực tế
export const openWindows = new Map();

// Bước 3.2 — Bộ đếm chiều sâu giao diện (Z-Index Tracker)
let zIndexCounter = 100;

// Các biến phục vụ trạng thái tương tác chuột
let isDragging = false;
let startX = 0, startY = 0;
let initialLeft = 0, initialTop = 0;
let targetWindow = null;

let isResizing = false;
let initialWidth = 0;
let initialHeight = 0;

// Các hàm bổ trợ xây dựng thành phần DOM tĩnh (Bảo lưu từ thiết kế gốc của bạn)
export function create_window(parent) {
    let div5 = document.createElement('div');
    Object.assign(div5.style, STYLES.window);
    parent.appendChild(div5);
    return div5;
}
export function content(parent) {
    let div6 = document.createElement('div');
    Object.assign(div6.style, STYLES.content);
    div6.id = 'content_id';
    parent.appendChild(div6);
    return div6;
}
export function title_bar(parent) {
    let div4 = document.createElement('div');
    Object.assign(div4.style, STYLES.titleBar);
    div4.id = 'title_bar_id';
    parent.appendChild(div4);
    return div4;
}
export function control_button(parent) {
    let div3 = document.createElement('div');
    Object.assign(div3.style, STYLES.controlGroup);
    div3.id = 'control_button_id';
    parent.appendChild(div3);
    return div3;
}
export function back_control_button(parent) {
    let div7 = document.createElement('button');
    Object.assign(div7.style, STYLES.controlBtn, STYLES.btnMinimize);
    div7.id = 'back_control_button_id';
    parent.appendChild(div7);
    return div7;
}
export function cancel_control_button(parent) {
    let div8 = document.createElement('button');
    Object.assign(div8.style, STYLES.controlBtn, STYLES.btnClose);
    div8.id = 'cancel_control_button_id';
    parent.appendChild(div8);
    return div8;
}
export function all_screen_control_button(parent) {
    let div9 = document.createElement('button');
    Object.assign(div9.style, STYLES.controlBtn, STYLES.btnMaximize);
    div9.id = 'all_screen_control_id';
    parent.appendChild(div9);
    return div9;
}
export function title_text(parent, name_text='tên mặc định') {
    let div10 = document.createElement('div');
    Object.assign(div10.style, STYLES.titleText);
    div10.id = 'title_text_id';
    parent.appendChild(div10);
    div10.innerText = name_text;
    return div10;
}

/**
 * HÀM TẬP TRUNG: Tập hợp luồng xây dựng một cửa sổ ứng dụng đơn lẻ
 */
export function create_single_app(desktopElement, title, config = null) {
    let currentWindow = create_window(desktopElement);
    let contentDiv = content(currentWindow);
    let currentTitleBar = title_bar(currentWindow);
    let currentControlGroup = control_button(currentTitleBar);
    let btnMinimize = back_control_button(currentControlGroup);
    let btnClose = cancel_control_button(currentControlGroup);
    let btnMaximize = all_screen_control_button(currentControlGroup);
    title_text(currentTitleBar, title);

    // Store content reference on window for easy access
    currentWindow.contentDiv = contentDiv;

    // Bước 3.3 — Định danh duy nhất cho thực thể
    const windowId = config && config.id ? config.id : `win_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    currentWindow.id = windowId;

    // Gắn phần tử co giãn (Resize Handle)
    let resizeHandle = document.createElement('div');
    Object.assign(resizeHandle.style, STYLES.resizeHandle);
    currentWindow.appendChild(resizeHandle);

    // Trích xuất tham số vị trí hình học
    let x = 50, y = 50, w = 400, h = 300;
    let isMinimized = false;
    let isMaximized = "false";
    let zIndex = ++zIndexCounter;

    if (config) {
        x = config.x; y = config.y; w = config.w; h = config.h;
        isMinimized = config.isMinimized || false;
        isMaximized = config.isMaximized ? "true" : "false";
        zIndex = config.zIndex || zIndex;
    } else {
        const index = openWindows.size;
        x = 50 + (index * 30);
        y = 50 + (index * 30);
    }

    // Đồng bộ cấu hình style CSS trực tiếp lên phần tử DOM
    currentWindow.style.left = `${x}px`;
    currentWindow.style.top = `${y}px`;
    currentWindow.style.width = `${w}px`;
    currentWindow.style.height = `${h}px`;
    currentWindow.style.zIndex = zIndex;
    currentWindow.dataset.isMaximized = isMaximized;

    // Liên kết thanh tác vụ hệ thống (Taskbar Icon)
    let myTaskbarIcon = registerAppToTaskbar(currentWindow, title);

    // Lưu giữ trạng thái vào Map bộ nhớ đệm
    openWindows.set(windowId, {
        id: windowId, appName: title, x, y, w, h,
        isMinimized, isMaximized: isMaximized === "true", zIndex
    });

    if (isMinimized) {
        currentWindow.style.display = 'none';
    }

    // Bước 3.6 — Hiệu ứng AnimeJS mở cửa sổ
    if (!isMinimized) {
        currentWindow.style.opacity = '0';
        anime({
            targets: currentWindow,
            scale: [0.85, 1],
            opacity: [0, 1],
            duration: 350,
            easing: 'easeOutCubic'
        });
    }

    // Đăng ký sự kiện Focus
    currentWindow.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        focusWindow(windowId);
    });

    // Sự kiện Click nút đóng
    btnClose.addEventListener('click', (e) => {
        e.stopPropagation();
        anime({
            targets: currentWindow,
            scale: 0.85,
            opacity: 0,
            duration: 250,
            easing: 'easeInCubic',
            complete: () => {
                openWindows.delete(windowId);
                if (myTaskbarIcon) myTaskbarIcon.remove();
                currentWindow.remove();
            }
        });
    });

    // Sự kiện phóng to/thu nhỏ toàn màn hình (Maximize)
    btnMaximize.addEventListener('click', (e) => {
        e.stopPropagation();
        const winData = openWindows.get(windowId);
        if (currentWindow.dataset.isMaximized === 'true') {
            currentWindow.style.width = currentWindow.dataset.oldWidth;
            currentWindow.style.height = currentWindow.dataset.oldHeight;
            currentWindow.style.top = currentWindow.dataset.oldTop;
            currentWindow.style.left = currentWindow.dataset.oldLeft;
            currentWindow.dataset.isMaximized = "false";
            if (winData) {
                winData.isMaximized = false;
                winData.x = parseInt(currentWindow.style.left);
                winData.y = parseInt(currentWindow.style.top);
                winData.w = parseInt(currentWindow.style.width);
                winData.h = parseInt(currentWindow.style.height);
            }
        } else {
            currentWindow.dataset.oldWidth = currentWindow.style.width || '400px';
            currentWindow.dataset.oldHeight = currentWindow.style.height || '300px';
            currentWindow.dataset.oldTop = currentWindow.style.top;
            currentWindow.dataset.oldLeft = currentWindow.style.left;
            
            currentWindow.style.top = '0px';
            currentWindow.style.left = '0px';
            currentWindow.style.width = window.innerWidth + 'px';
            currentWindow.style.height = (window.innerHeight - 48) + 'px';
            currentWindow.dataset.isMaximized = "true";
            if (winData) winData.isMaximized = true;
        }
    });

    // Sự kiện thu nhỏ xuống thanh tác vụ
    btnMinimize.addEventListener('click', (e) => {
        e.stopPropagation();
        minimizeWindow(windowId);
    });

    // Kéo di chuyển vị trí cửa sổ
    currentTitleBar.addEventListener('mousedown', (e) => {
        if (currentWindow.dataset.isMaximized === 'true') return;
        isDragging = true;
        targetWindow = currentWindow;
        startX = e.clientX; startY = e.clientY;
        initialLeft = parseInt(currentWindow.style.left) || 50;
        initialTop = parseInt(currentWindow.style.top) || 50;
        focusWindow(windowId);
    });

    // Kéo co giãn kích thước
    resizeHandle.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        e.preventDefault();
        isResizing = true;
        targetWindow = currentWindow;
        startX = e.clientX; startY = e.clientY;
        initialWidth = parseInt(currentWindow.style.width) || 400;
        initialHeight = parseInt(currentWindow.style.height) || 300;
        focusWindow(windowId);
    });
    return currentWindow;
}

// Khởi tạo hàng loạt ứng dụng
export function window_app(desktopElement, n = 1) {
    for (let i = 0; i < n; i++) {
        create_single_app(desktopElement, `Ứng dụng số ${i + 1}`);
    }
}

export function focusWindow(windowId) {
    const el = document.getElementById(windowId);
    const winData = openWindows.get(windowId);
    if (el && winData) {
        zIndexCounter += 1;
        el.style.zIndex = zIndexCounter;
        winData.zIndex = zIndexCounter;
    }
}

export function minimizeWindow(windowId) {
    const el = document.getElementById(windowId);
    const winData = openWindows.get(windowId);
    if (!el || !winData) return;

    anime({
        targets: el,
        scale: 0,
        opacity: 0,
        duration: 300,
        easing: 'easeInQuad',
        complete: () => {
            el.style.display = 'none';
            winData.isMinimized = true;
        }
    });
}

// =========================================================================
// CHỈNH SỬA CỐT LÕI TẠI ĐÂY: Trả lại thuộc tính hiển thị 'flex' thay vì 'block'
// =========================================================================
export function restoreWindow(windowId) {
    const el = document.getElementById(windowId);
    const winData = openWindows.get(windowId);
    if (!el || !winData) return;

    el.style.display = 'flex'; // SỬA ĐỔI: Đảm bảo đồng nhất cấu trúc Flexbox gốc
    focusWindow(windowId);
    
    anime({
        targets: el,
        scale: [0, 1],
        opacity: [0, 1],
        duration: 300,
        easing: 'easeOutQuad',
        complete: () => {
            winData.isMinimized = false;
        }
    });
}

export function getWindowState() {
    return Object.fromEntries(openWindows);
}

export function restoreWindowState(desktopElement, stateObject) {
    if (!stateObject) return;
    openWindows.clear();
    for (const [windowId, config] of Object.entries(stateObject)) {
        create_single_app(desktopElement, config.appName, config);
    }
}

// Đăng ký các trình lắng nghe chuột toàn cục
const handleMouseMove = (e) => {
    if (isDragging && targetWindow) {
        let deltaX = e.clientX - startX;
        let deltaY = e.clientY - startY;
        let newLeft = initialLeft + deltaX;
        let newTop = initialTop + deltaY;
        targetWindow.style.left = newLeft + 'px';
        targetWindow.style.top = newTop + 'px';

        const winData = openWindows.get(targetWindow.id);
        if (winData) { winData.x = newLeft; winData.y = newTop; }
    }
    if (isResizing && targetWindow) {
        let deltaX = e.clientX - startX;
        let deltaY = e.clientY - startY;
        let newWidth = Math.max(initialWidth + deltaX, 200);
        let newHeight = Math.max(initialHeight + deltaY, 150);
        targetWindow.style.width = newWidth + 'px';
        targetWindow.style.height = newHeight + 'px';

        const winData = openWindows.get(targetWindow.id);
        if (winData) { winData.w = newWidth; winData.h = newHeight; }
    }
};

const handleMouseUp = () => {
    isDragging = false;
    isResizing = false;
    targetWindow = null;
};

document.addEventListener('mousemove', handleMouseMove);
document.addEventListener('mouseup', handleMouseUp);

// Xử lý tính năng Responsive Windows kèm kỹ thuật Debounce
let resizeTimeout = null;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        openWindows.forEach((winData, windowId) => {
            const el = document.getElementById(windowId);
            if (!el) return;

            if (el.dataset.isMaximized === 'true') {
                el.style.width = window.innerWidth + 'px';
                el.style.height = (window.innerHeight - 48) + 'px';
                return;
            }

            if (winData.x + winData.w > window.innerWidth) {
                winData.x = Math.max(0, window.innerWidth - winData.w);
                el.style.left = winData.x + 'px';
            }
            if (winData.y + winData.h > window.innerHeight) {
                winData.y = Math.max(0, window.innerHeight - winData.h);
                el.style.top = winData.y + 'px';
            }
        });
    }, 200);
});