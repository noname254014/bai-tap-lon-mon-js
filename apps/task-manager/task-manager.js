import { saveToLocalStorage, loadFromLocalStorage } from '../../src/shell/auth.js';
// Cấu hình các phân vùng giám sát hệ thống
const COLUMNS = {
    WINDOWS: 'Giao diện & Cửa sổ',
    DATABASE: 'Cơ sở dữ liệu (Storage)',
    PROCESSES: 'Tiến trình & Hàm hệ thống'
};

// Kế thừa phong cách thiết kế nguyên bản, tinh chỉnh cho Dashboard
const APP_STYLES = {
    wrapper: {
        display: 'flex', flexDirection: 'column', width: '100%', height: '100%',
        backgroundColor: '#1a1a22', color: '#e2e8f0', fontFamily: 'Segoe UI, sans-serif',
        overflow: 'hidden', userSelect: 'none'
    },
    formHeader: {
        display: 'flex', gap: '10px', padding: '14px', backgroundColor: '#22222e',
        borderBottom: '1px solid #2d2d3d', alignItems: 'center', justifyContent: 'space-between'
    },
    headerTitle: {
        fontSize: '15px', fontWeight: '600', color: '#fff', letterSpacing: '0.5px'
    },
    btnSubmit: {
        padding: '8px 16px', backgroundColor: '#007aff', color: '#fff', border: 'none',
        borderRadius: '4px', cursor: 'pointer', fontWeight: '600', fontSize: '13px',
        transition: 'all 0.2s ease'
    },
    boardContainer: {
        display: 'flex', flex: '1', padding: '16px', gap: '16px', overflowX: 'auto',
        backgroundColor: '#141419', alignItems: 'stretch'
    },
    kanbanColumn: {
        flex: '1', minWidth: '280px', backgroundColor: '#1e1e26', borderRadius: '8px',
        border: '1px solid #2d2d3f', display: 'flex', flexDirection: 'column', overflow: 'hidden'
    },
    columnHeader: {
        padding: '12px 16px', fontWeight: '600', fontSize: '14px', backgroundColor: '#252533',
        borderBottom: '1px solid #2d2d3f', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
    },
    taskCount: {
        backgroundColor: '#3d3d52', padding: '2px 8px', borderRadius: '10px', fontSize: '11px', color: '#fff'
    },
    columnBody: {
        flex: '1', padding: '12px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px'
    },
    taskCard: {
        backgroundColor: '#262636', borderLeft: '4px solid #fff', borderRadius: '6px',
        padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.15)', position: 'relative'
    },
    taskTitle: { fontSize: '13px', fontWeight: '600', color: '#fff', wordBreak: 'break-word' },
    taskDetail: { fontSize: '11px', color: '#a0a0b0', wordBreak: 'break-word', fontFamily: 'monospace', lineHeight: '1.4' },
    metaRow: { display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginTop: '4px' },
    actionBtn: {
        border: 'none', borderRadius: '4px', padding: '5px 10px', cursor: 'pointer',
        fontSize: '11px', fontWeight: '600', color: '#fff', backgroundColor: '#ff453a'
    }
};

export function initTaskManager(contentElement) {
    contentElement.innerHTML = '';

    if (!window.anime) {
        console.warn("[System Monitor] Anime.js không khả dụng, sử dụng render tiêu chuẩn.");
    }

    // Xây dựng cấu trúc Wrapper tổng
    const wrapper = document.createElement('div');
    Object.assign(wrapper.style, APP_STYLES.wrapper);

    // Xây dựng Header Bảng điều khiển
    const formHeader = document.createElement('div');
    Object.assign(formHeader.style, APP_STYLES.formHeader);

    const headerTitle = document.createElement('div');
    headerTitle.innerText = 'BẢNG ĐIỀU KHIỂN TRUNG TÂM (SYSTEM MONITOR)';
    Object.assign(headerTitle.style, APP_STYLES.headerTitle);

    const btnRefresh = document.createElement('button');
    btnRefresh.innerText = '↻ Làm mới tiến trình';
    Object.assign(btnRefresh.style, APP_STYLES.btnSubmit);

    formHeader.appendChild(headerTitle);
    formHeader.appendChild(btnRefresh);

    // Bảng chứa 3 cột giám sát
    const boardContainer = document.createElement('div');
    Object.assign(boardContainer.style, APP_STYLES.boardContainer);

    wrapper.appendChild(formHeader);
    wrapper.appendChild(boardContainer);
    contentElement.appendChild(wrapper);

    let refreshInterval = null;

    // =========================================================================
    // HÀM QUÉT VÀ THU THẬP DỮ LIỆU HỆ THỐNG THEO THỜI GIAN THỰC
    // =========================================================================
    function fetchSystemState() {
        // 1. Quét Cửa sổ & Giao diện đang hoạt động (DOM Analysis)
        const activeWindows = [];
        const domElements = document.querySelectorAll('*');
        let windowCount = 0;
        
        domElements.forEach(el => {
            const cls = typeof el.className === 'string' ? el.className : '';
            // Nhận diện các thẻ có thể là cửa sổ/app (dựa vào class, z-index hoặc position)
            if (cls.includes('window') || cls.includes('modal') || cls.includes('app') || 
                (window.getComputedStyle(el).position === 'absolute' && window.getComputedStyle(el).zIndex > 0)) {
                
                if (windowCount < 15) { // Tránh lag bằng cách giới hạn số lượng render
                    activeWindows.push({
                        title: `[DOM] ${el.tagName} ${el.id ? '#' + el.id : ''}`,
                        detail: `Lớp (Class): ${cls || 'N/A'}\nTrạng thái hiển thị: Kích hoạt`,
                        color: '#007aff'
                    });
                }
                windowCount++;
            }
        });
        
        if (activeWindows.length === 0) {
            activeWindows.push({ title: 'Hệ thống chính (Main Layout)', detail: 'Đang hiển thị bình thường', color: '#007aff' });
        }

        // 2. Quét Cơ sở dữ liệu (LocalStorage & SessionStorage)
        const databases = [];
        try {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                const val = localStorage.getItem(key);
                databases.push({
                    title: `[Local] ${key}`,
                    detail: `Độ dài dữ liệu: ${val.length} bytes\nNội dung: ${val.substring(0, 40)}${val.length > 40 ? '...' : ''}`,
                    action: 'Hủy dữ liệu',
                    key: key,
                    type: 'local',
                    color: '#ff9f0a'
                });
            }
            for (let i = 0; i < sessionStorage.length; i++) {
                const key = sessionStorage.key(i);
                const val = sessionStorage.getItem(key);
                databases.push({
                    title: `[Session] ${key}`,
                    detail: `Độ dài dữ liệu: ${val.length} bytes\nNội dung: ${val.substring(0, 40)}${val.length > 40 ? '...' : ''}`,
                    action: 'Hủy dữ liệu',
                    key: key,
                    type: 'session',
                    color: '#ff9f0a'
                });
            }
        } catch (e) {
            databases.push({ title: 'Lỗi truy xuất', detail: e.message, color: '#ff453a' });
        }

        // 3. Quét Tiến trình & Sự kiện (Memory, Resource, Event Loops)
        const processes = [];
        
        // Đo đạc bộ nhớ nếu trình duyệt hỗ trợ
        if (performance && performance.memory) {
            const usedMem = (performance.memory.usedJSHeapSize / 1048576).toFixed(2);
            const totalMem = (performance.memory.totalJSHeapSize / 1048576).toFixed(2);
            processes.push({
                title: 'Trình quản lý V8 Memory',
                detail: `Đang sử dụng: ${usedMem} MB / ${totalMem} MB`,
                color: '#30d158'
            });
        }

        // Đo đạc tài nguyên mạng & tải trọng hệ thống
        if (performance && typeof performance.getEntriesByType === 'function') {
            const resources = performance.getEntriesByType('resource');
            processes.push({
                title: 'Network & Resource Loader',
                detail: `Tổng tài nguyên đang nạp/đã nạp: ${resources.length} mục`,
                color: '#30d158'
            });
        }

        // Giả lập theo dõi các hàm cốt lõi của dự án đang vận hành
        processes.push({
            title: 'Hàm: initTaskManager()',
            detail: 'Trạng thái: Đang vận hành (Vòng lặp giám sát UI)',
            color: '#30d158'
        });
        
        processes.push({
            title: 'Hàm: loadFromLocalStorage()',
            detail: 'Trạng thái: Sẵn sàng (Chờ tín hiệu I/O)',
            color: '#a0a0b0'
        });

        // Bắt các sự kiện global cơ bản
        processes.push({
            title: 'Global Event Listeners',
            detail: 'Đang theo dõi các luồng sự kiện DOM & I/O',
            color: '#30d158'
        });

        return {
            [COLUMNS.WINDOWS]: activeWindows,
            [COLUMNS.DATABASE]: databases,
            [COLUMNS.PROCESSES]: processes
        };
    }

    // =========================================================================
    // HÀM RENDER XUẤT DỮ LIỆU RA GIAO DIỆN CỘT
    // =========================================================================
    function renderMonitorBoard() {
        const systemState = fetchSystemState();
        boardContainer.innerHTML = '';

        const columnsData = [
            { id: COLUMNS.WINDOWS, color: '#007aff' },
            { id: COLUMNS.DATABASE, color: '#ff9f0a' },
            { id: COLUMNS.PROCESSES, color: '#30d158' }
        ];

        columnsData.forEach(col => {
            const colEl = document.createElement('div');
            Object.assign(colEl.style, APP_STYLES.kanbanColumn);

            const items = systemState[col.id] || [];

            // Thiết lập Header Cột
            const headerEl = document.createElement('div');
            Object.assign(headerEl.style, APP_STYLES.columnHeader);
            headerEl.style.borderTop = `3px solid ${col.color}`;
            
            const titleSpan = document.createElement('span');
            titleSpan.innerText = col.id;
            
            const countSpan = document.createElement('span');
            Object.assign(countSpan.style, APP_STYLES.taskCount);
            countSpan.innerText = items.length;

            headerEl.appendChild(titleSpan);
            headerEl.appendChild(countSpan);

            // Thiết lập Thân Cột (Các Card hiển thị)
            const bodyEl = document.createElement('div');
            Object.assign(bodyEl.style, APP_STYLES.columnBody);

            items.forEach(item => {
                const card = document.createElement('div');
                Object.assign(card.style, APP_STYLES.taskCard);
                card.style.borderLeftColor = item.color;

                const tTitle = document.createElement('div');
                Object.assign(tTitle.style, APP_STYLES.taskTitle);
                tTitle.innerText = item.title;

                const tDetail = document.createElement('div');
                Object.assign(tDetail.style, APP_STYLES.taskDetail);
                tDetail.innerText = item.detail;

                card.appendChild(tTitle);
                card.appendChild(tDetail);

                // Khởi tạo phím cứng can thiệp nếu loại dữ liệu cho phép (Ví dụ: Database)
                if (item.action) {
                    const metaRow = document.createElement('div');
                    Object.assign(metaRow.style, APP_STYLES.metaRow);

                    const btnAction = document.createElement('button');
                    Object.assign(btnAction.style, APP_STYLES.actionBtn);
                    btnAction.innerText = item.action;
                    
                    btnAction.addEventListener('click', (e) => {
                        e.stopPropagation();
                        if (item.type === 'local') localStorage.removeItem(item.key);
                        if (item.type === 'session') sessionStorage.removeItem(item.key);
                        
                        // Cập nhật lại board sau khi can thiệp DB
                        renderMonitorBoard();
                    });
                    
                    metaRow.appendChild(btnAction);
                    card.appendChild(metaRow);
                }

                bodyEl.appendChild(card);
            });

            colEl.appendChild(headerEl);
            colEl.appendChild(bodyEl);
            boardContainer.appendChild(colEl);
        });
    }

    // =========================================================================
    // KHỞI CHẠY VÀ XỬ LÝ SỰ KIỆN VÒNG ĐỜI
    // =========================================================================

    // Kích hoạt cập nhật thủ công
    btnRefresh.addEventListener('click', () => {
        btnRefresh.style.opacity = '0.7';
        setTimeout(() => btnRefresh.style.opacity = '1', 150);
        renderMonitorBoard();
    });

    // Kích hoạt chu kỳ tự động cập nhật (Polling) mỗi 3 giây
    refreshInterval = setInterval(() => {
        // Hủy vòng lặp ngầm nếu Component/Window này đã bị xóa khỏi DOM (Ngăn chặn Memory Leak)
        if (!document.body.contains(contentElement)) {
            clearInterval(refreshInterval);
            console.log('[System Monitor] Vòng lặp giám sát đã được giải phóng khỏi bộ nhớ.');
            return;
        }
        renderMonitorBoard();
    }, 3000);

    // Xuất bản giao diện lần đầu
    renderMonitorBoard();
}