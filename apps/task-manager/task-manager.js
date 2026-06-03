// // =========================================================================
// // BƯỚC 5.1 & 5.6: Khai báo Module, State và liên kết Hệ thống lưu trữ
// // =========================================================================
// import { saveToLocalStorage, loadFromLocalStorage } from '../../src/shell/auth.js';

// // Anime library is available globally through CDN (loaded in index.html)

// // Khởi tạo các hằng số cấu hình cột Kanban
// const COLUMNS = {
//     TODO: 'To-Do',
//     IN_PROGRESS: 'In Progress',
//     DONE: 'Done'
// };

// // Phong cách thiết kế giao diện cục bộ (Dark Professional UI)
// const APP_STYLES = {
//     wrapper: {
//         display: 'flex', flexDirection: 'column', width: '100%', height: '100%',
//         backgroundColor: '#1a1a22', color: '#e2e8f0', fontFamily: 'Segoe UI, sans-serif',
//         overflow: 'hidden', userSelect: 'none'
//     },
//     formHeader: {
//         display: 'flex', gap: '10px', padding: '14px', backgroundColor: '#22222e',
//         borderBottom: '1px solid #2d2d3d', alignItems: 'center', wrap: 'wrap'
//     },
//     inputTitle: {
//         flex: '1', minWidth: '150px', padding: '8px 12px', backgroundColor: '#111116',
//         border: '1px solid #3d3d52', borderRadius: '4px', color: '#fff', fontSize: '13px'
//     },
//     selectPriority: {
//         padding: '8px', backgroundColor: '#111116', border: '1px solid #3d3d52',
//         borderRadius: '4px', color: '#fff', fontSize: '13px', cursor: 'pointer'
//     },
//     inputTags: {
//         width: '120px', padding: '8px 12px', backgroundColor: '#111116',
//         border: '1px solid #3d3d52', borderRadius: '4px', color: '#fff', fontSize: '13px'
//     },
//     btnSubmit: {
//         padding: '8px 16px', backgroundColor: '#007aff', color: '#fff', border: 'none',
//         borderRadius: '4px', cursor: 'pointer', fontWeight: '600', fontSize: '13px'
//     },
//     boardContainer: {
//         display: 'flex', flex: '1', padding: '16px', gap: '16px', overflowX: 'auto',
//         backgroundColor: '#141419', alignItems: 'stretch'
//     },
//     kanbanColumn: {
//         flex: '1', minWidth: '250px', backgroundColor: '#1e1e26', borderRadius: '8px',
//         border: '1px solid #2d2d3f', display: 'flex', flexDirection: 'column', overflow: 'hidden'
//     },
//     columnHeader: {
//         padding: '12px 16px', fontWeight: '600', fontSize: '14px', backgroundColor: '#252533',
//         borderBottom: '1px solid #2d2d3f', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
//     },
//     taskCount: {
//         backgroundColor: '#3d3d52', padding: '2px 8px', borderRadius: '10px', fontSize: '11px'
//     },
//     columnBody: {
//         flex: '1', padding: '12px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px'
//     },
//     taskCard: {
//         backgroundColor: '#262636', borderLeft: '4px solid #fff', borderRadius: '6px',
//         padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px',
//         boxShadow: '0 4px 6px rgba(0,0,0,0.15)', position: 'relative'
//     },
//     taskTitle: { fontSize: '13px', fontWeight: '500', color: '#fff', wordBreak: 'break-word' },
//     metaRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' },
//     tagContainer: { display: 'flex', gap: '4px', flexWrap: 'wrap' },
//     tagBadge: { fontSize: '10px', padding: '2px 6px', backgroundColor: '#3d3d52', borderRadius: '4px', color: '#aaa' },
//     cardControls: { display: 'flex', gap: '6px', alignSelf: 'flex-end', marginTop: '6px' },
//     actionBtn: {
//         border: 'none', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer',
//         fontSize: '11px', fontWeight: '600', color: '#fff', backgroundColor: '#3a3a4a'
//     }
// };

// // Định cấu hình mã màu tương ứng cho Mức độ ưu tiên (Priority Style Mapping)
// const PRIORITY_MAP = {
//     'High': '#ff453a',
//     'Medium': '#ff9f0a',
//     'Low': '#30d158'
// };

// export function initTaskManager(contentElement) {
//     contentElement.innerHTML = '';

//     // Check if anime is available
//     if (!window.anime) {
//         console.error("[-] Anime.js not loaded! Check index.html");
//     }

//     // BƯỚC 5.6: Khởi tạo State ban đầu bằng việc nạp dữ liệu từ LocalStorage
//     let state = {
//         tasks: loadFromLocalStorage('tasks') || []
//     };

//     console.log('[Task Manager] Initialized with', state.tasks.length, 'tasks');

//     // Tạo cấu trúc phân vùng chính của ứng dụng
//     const wrapper = document.createElement('div');
//     Object.assign(wrapper.style, APP_STYLES.wrapper);

//     // Xây dựng Form tạo Task mới (Input Header)
//     const formHeader = document.createElement('div');
//     Object.assign(formHeader.style, APP_STYLES.formHeader);

//     const inputTitle = document.createElement('input');
//     inputTitle.type = 'text';
//     inputTitle.placeholder = 'Nhập tiêu đề công việc...';
//     Object.assign(inputTitle.style, APP_STYLES.inputTitle);

//     const selectPriority = document.createElement('select');
//     Object.assign(selectPriority.style, APP_STYLES.selectPriority);
//     ['Low', 'Medium', 'High'].forEach(p => {
//         const opt = document.createElement('option');
//         opt.value = p; opt.innerText = p;
//         if (p === 'Medium') opt.selected = true;
//         selectPriority.appendChild(opt);
//     });

//     const inputTags = document.createElement('input');
//     inputTags.type = 'text';
//     inputTags.placeholder = 'Tags (phân cách bằng dấu phẩy)';
//     Object.assign(inputTags.style, APP_STYLES.inputTags);

//     const btnSubmit = document.createElement('button');
//     btnSubmit.innerText = '+ Thêm Task';
//     Object.assign(btnSubmit.style, APP_STYLES.btnSubmit);

//     formHeader.appendChild(inputTitle);
//     formHeader.appendChild(selectPriority);
//     formHeader.appendChild(inputTags);
//     formHeader.appendChild(btnSubmit);

//     // Xây dựng Bảng Kanban Container
//     const boardContainer = document.createElement('div');
//     Object.assign(boardContainer.style, APP_STYLES.boardContainer);

//     wrapper.appendChild(formHeader);
//     wrapper.appendChild(boardContainer);
//     contentElement.appendChild(wrapper);

//     // Biến tạm để lưu ID của phần tử vừa được thêm nhằm mục đích chạy hiệu ứng kích thước
//     let lastAddedTaskId = null;

//     // =========================================================================
//     // BƯỚC 5.2: Hàm Render cấu trúc Bảng điều khiển Kanban (Render Board)
//     // =========================================================================
//     function renderBoard() {
//         boardContainer.innerHTML = '';

//         // Khởi tạo 3 cột trạng thái cố định
//         const columnsData = [
//             { id: COLUMNS.TODO, title: 'Cần làm', color: '#007aff' },
//             { id: COLUMNS.IN_PROGRESS, title: 'Đang xử lý', color: '#ff9f0a' },
//             { id: COLUMNS.DONE, title: 'Hoàn thành', color: '#30d158' }
//         ];

//         columnsData.forEach(col => {
//             const colEl = document.createElement('div');
//             Object.assign(colEl.style, APP_STYLES.kanbanColumn);

//             // Lọc danh sách các Task thuộc nhóm trạng thái hiện tại
//             const filteredTasks = state.tasks.filter(t => t.status === col.id);

//             // Header của Cột
//             const headerEl = document.createElement('div');
//             Object.assign(headerEl.style, APP_STYLES.columnHeader);
//             headerEl.style.borderTop = `3px solid ${col.color}`;
            
//             const titleSpan = document.createElement('span');
//             titleSpan.innerText = col.title;
            
//             const countSpan = document.createElement('span');
//             Object.assign(countSpan.style, APP_STYLES.taskCount);
//             countSpan.innerText = filteredTasks.length;

//             headerEl.appendChild(titleSpan);
//             headerEl.appendChild(countSpan);

//             // Thân của Cột (Chứa các Task Card)
//             const bodyEl = document.createElement('div');
//             Object.assign(bodyEl.style, APP_STYLES.columnBody);
//             bodyEl.dataset.statusId = col.id;

//             filteredTasks.forEach(task => {
//                 const card = document.createElement('div');
//                 card.id = `task-${task.id}`;
//                 Object.assign(card.style, APP_STYLES.taskCard);
//                 card.style.borderLeftColor = PRIORITY_MAP[task.priority] || '#fff';

//                 const tTitle = document.createElement('div');
//                 Object.assign(tTitle.style, APP_STYLES.taskTitle);
//                 tTitle.innerText = task.title;

//                 // Tạo vùng chứa các thẻ tags phụ trợ
//                 const tagBox = document.createElement('div');
//                 Object.assign(tagBox.style, APP_STYLES.tagContainer);
//                 task.tags.forEach(tg => {
//                     if (tg.trim() === '') return;
//                     const b = document.createElement('span');
//                     Object.assign(b.style, APP_STYLES.tagBadge);
//                     b.innerText = tg.trim();
//                     tagBox.appendChild(b);
//                 });

//                 const metaRow = document.createElement('div');
//                 Object.assign(metaRow.style, APP_STYLES.metaRow);
//                 metaRow.appendChild(tagBox);

//                 // Tạo nhóm các nút tương tác chuyển đổi trạng thái vòng đời
//                 const controls = document.createElement('div');
//                 Object.assign(controls.style, APP_STYLES.cardControls);

//                 // Nút dịch chuyển lùi (Move Left)
//                 if (task.status !== COLUMNS.TODO) {
//                     const btnLeft = document.createElement('button');
//                     Object.assign(btnLeft.style, APP_STYLES.actionBtn);
//                     btnLeft.innerText = '◀';
//                     btnLeft.addEventListener('click', () => {
//                         const targetStatus = task.status === COLUMNS.DONE ? COLUMNS.IN_PROGRESS : COLUMNS.TODO;
//                         moveTask(task.id, targetStatus);
//                     });
//                     controls.appendChild(btnLeft);
//                 }

//                 // Nút Xóa dữ liệu (Delete Task)
//                 const btnDel = document.createElement('button');
//                 Object.assign(btnDel.style, APP_STYLES.actionBtn);
//                 btnDel.style.backgroundColor = '#ff453a';
//                 btnDel.innerText = '🗑';
//                 btnDel.addEventListener('click', () => deleteTask(task.id));
//                 controls.appendChild(btnDel);

//                 // Nút dịch chuyển tiến (Move Right)
//                 if (task.status !== COLUMNS.DONE) {
//                     const btnRight = document.createElement('button');
//                     Object.assign(btnRight.style, APP_STYLES.actionBtn);
//                     btnRight.innerText = '▶';
//                     btnRight.addEventListener('click', () => {
//                         const targetStatus = task.status === COLUMNS.TODO ? COLUMNS.IN_PROGRESS : COLUMNS.DONE;
//                         moveTask(task.id, targetStatus);
//                     });
//                     controls.appendChild(btnRight);
//                 }

//                 card.appendChild(tTitle);
//                 card.appendChild(metaRow);
//                 card.appendChild(controls);
//                 bodyEl.appendChild(card);

//                 // BƯỚC 5.3: Thực hiện kích hoạt hoạt ảnh Scale từ 0 đến 1 nếu là Task vừa được khởi tạo
//                 // if (task.id === lastAddedTaskId) {
//                 //     card.style.transform = 'scale(0)';
//                 //     try {
//                 //         if (window.anime) {
//                 //             anime({
//                 //                 targets: card,
//                 //                 scale: [0, 1],
//                 //                 duration: 300,
//                 //                 easing: 'easeOutBack'
//                 //             });
//                 //         }
//                 //     } catch (e) {
//                 //         console.error('[Task Manager] Error animating task card:', e);
//                 //     }
//                 // }
//                 // BƯỚC 5.3: Thực hiện kích hoạt hoạt ảnh Scale từ 0 đến 1 nếu là Task vừa được khởi tạo
//                 // if (task.id === lastAddedTaskId) {
//                 //     try {
//                 //         if (window.anime) {
//                 //             // Chỉ ép scale về 0 khi chắc chắn AnimeJS có thể chạy để kéo nó lên 1
//                 //             card.style.transform = 'scale(0)';
//                 //             anime({
//                 //                 targets: card,
//                 //                 scale: [0, 1],
//                 //                 duration: 300,
//                 //                 easing: 'easeOutBack'
//                 //             });
//                 //         } else {
//                 //             // [ĐÃ SỬA LỖI] Đảm bảo thẻ hiển thị bình thường nếu không có thư viện hoạt họa
//                 //             card.style.transform = 'scale(1)';
//                 //         }
//                 //     } catch (e) {
//                 //         console.error('[Task Manager] Error animating task card:', e);
//                 //         card.style.transform = 'scale(1)'; // Phục hồi hiển thị nếu có lỗi kịch bản
//                 //     }
//                 // }
//             });

//             colEl.appendChild(headerEl);
//             colEl.appendChild(bodyEl);
//             boardContainer.appendChild(colEl);
//         });

//         // Đặt lại cờ nhận diện sau khi kết thúc chu trình cập nhật giao diện
//         lastAddedTaskId = null;
//     }

//     // =========================================================================
//     // BƯỚC 5.3: Hàm Thêm công việc mới (Add Task) & Đồng bộ hóa State
//     // =========================================================================
//     function addTask(title, priority, tagsString) {
//         try {
//             if (!title.trim()) {
//                 console.warn('[Task Manager] Title is empty');
//                 return;
//             }

//             console.log('[Task Manager] Adding new task:', title);

//             // Xử lý chuỗi thẻ phân tách bằng dấu phẩy sang dạng mảng tuần tự
//             const processedTags = tagsString.split(',').map(t => t.trim()).filter(t => t.length > 0);
            
//             // Sinh định danh duy nhất (Unique Target ID)
//             const newId = `tk_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
            
//             const newTask = {
//                 id: newId,
//                 title: title.trim(),
//                 status: COLUMNS.TODO, // Mặc định rơi vào cột To-Do ban đầu
//                 priority: priority,
//                 createdAt: new Date().toISOString(),
//                 tags: processedTags
//             };

//             state.tasks.push(newTask);
//             lastAddedTaskId = newId; // Gắn cờ kích hoạt hiệu ứng hình học

//             // BƯỚC 5.6: Thực thi ghi đè đồng bộ hóa dữ liệu xuống LocalStorage của hệ thống
//             saveToLocalStorage('tasks', state.tasks);
//             console.log('[Task Manager] Task saved to localStorage');

//             // Render lại giao diện Kanban
//             renderBoard();

//             // Xóa sạch dữ liệu trường nhập liệu sau khi hoàn tất quy trình thêm
//             inputTitle.value = '';
//             inputTags.value = '';
            
//             console.log('[✓] Task added successfully');
//         } catch (error) {
//             console.error('[Task Manager] Error adding task:', error);
//         }
//     }

//     // Lắng nghe sự kiện click từ Form submit
//     btnSubmit.addEventListener('click', (e) => {
//         try {
//             e.stopPropagation();
//             console.log('[Task Manager] Button clicked');
//             console.log('[Task Manager] Input values:', {
//                 title: inputTitle.value,
//                 priority: selectPriority.value,
//                 tags: inputTags.value
//             });
//             addTask(inputTitle.value, selectPriority.value, inputTags.value);
//         } catch (error) {
//             console.error('[Task Manager] Error in click handler:', error);
//         }
//     });

//     // Hỗ trợ phím tắt Enter để tạo nhanh Task tại ô tiêu đề
//     inputTitle.addEventListener('keydown', (e) => {
//         if (e.key === 'Enter') {
//             try {
//                 e.stopPropagation();
//                 console.log('[Task Manager] Enter key pressed in title input');
//                 addTask(inputTitle.value, selectPriority.value, inputTags.value);
//             } catch (error) {
//                 console.error('[Task Manager] Error in keydown handler:', error);
//             }
//         }
//     });

//     // =========================================================================
//     // BƯỚC 5.4: Hàm dịch chuyển Trạng thái Task (Move Task)
//     // =========================================================================
//     function moveTask(taskId, newStatus) {
//         const targetTask = state.tasks.find(t => t.id === taskId);
//         if (targetTask) {
//             targetTask.status = newStatus;
            
//             // BƯỚC 5.6: Lưu cấu hình mảng sau dịch chuyển
//             saveToLocalStorage('tasks', state.tasks);
//             renderBoard();
//         }
//     }

//     // =========================================================================
//     // BƯỚC 5.5: Hàm Xóa Task tích hợp Hoạt cảnh bất đồng bộ (Delete Task)
//     // =========================================================================
//     function deleteTask(taskId) {
//         const cardElement = contentElement.querySelector(`#task-${taskId}`);
//         if (!cardElement) return;

//         // Chạy hiệu ứng làm mờ (Fade Out) kết hợp trượt sang trái (Slide Left) trước khi giải phóng bộ nhớ
//         anime({
//             targets: cardElement,
//             opacity: [1, 0],
//             translateX: [0, -50],
//             duration: 250,
//             easing: 'easeInCubic',
//             complete: () => {
//                 // Nhánh Callback thực thi sau khi kết thúc chuyển động trên UI:
//                 // 1. Loại bỏ bản ghi ra khỏi mảng State bộ nhớ đệm
//                 state.tasks = state.tasks.filter(t => t.id !== taskId);
                
//                 // 2. Cập nhật cơ sở dữ liệu lưu trữ vật lý LocalStorage
//                 saveToLocalStorage('tasks', state.tasks);
                
//                 // 3. Giải phóng hoàn toàn Thẻ HTML Node ra khỏi cây cấu trúc DOM
//                 cardElement.remove();

//                 // 4. Gọi hàm render lại để cập nhật chính xác số lượng Badge Header đếm đầu việc
//                 renderBoard();
//             }
//         });
//     }

//     // Thực hiện vòng nạp và dựng giao diện lần đầu tiên cho ứng dụng
//     renderBoard();
// }
// =========================================================================
// HỆ THỐNG QUẢN LÝ TIẾN TRÌNH & THEO DÕI TÀI NGUYÊN (SYSTEM TASK MANAGER)
// =========================================================================
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