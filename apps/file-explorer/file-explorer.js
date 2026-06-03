// =========================================================================
// BƯỚC 4.1 & 4.2: Khởi tạo cấu trúc và định nghĩa Cây Hệ thống tệp ảo (VFS)
// =========================================================================

// Import anime library from CDN (already loaded in index.html)
// anime.js is available globally through CDN

const virtualFS = {
    "root": {
        "Documents": {
            "readme.txt": { 
                type: "file", 
                content: "Chào mừng bạn đến với WebOS v1.0!\nHệ thống tệp ảo đang hoạt động ổn định.", 
                size: "84 B", 
                modified: "2026-06-01 09:15" 
            },
            "todo_list.txt": { 
                type: "file", 
                content: "- Hoàn thành thiết kế Phase 4\n- Tối ưu hóa hiệu ứng AnimeJS\n- Viết tài liệu API", 
                size: "76 B", 
                modified: "2026-06-02 14:30" 
            }
        },
        "Pictures": {
            "wallpaper.txt": { 
                type: "file", 
                content: "[Đường dẫn cấu hình: /assets/wallpapers/dark_nebula.jpg]", 
                size: "52 B", 
                modified: "2026-05-20 21:00" 
            }
        },
        "System": {
            "os_config.txt": { 
                type: "file", 
                content: "KERNEL_VERSION=2.4.0\nTHEME=Dark_Professional\nENABLE_ANIMATION=true", 
                size: "64 B", 
                modified: "2026-06-02 01:00" 
            }
        }
    }
};

// Phong cách thiết kế cục bộ cho File Explorer (Local App Styles)
const APP_STYLES = {
    wrapper: {
        display: 'flex', flexDirection: 'column', width: '100%', height: '100%',
        backgroundColor: '#1e1e24', color: '#f5f5f7', fontFamily: 'Segoe UI, sans-serif',
        overflow: 'hidden', userSelect: 'none'
    },
    toolbar: {
        display: 'flex', alignItems: 'center', padding: '8px 12px',
        backgroundColor: '#2a2a35', borderBottom: '1px solid #3a3a4a', gap: '10px'
    },
    backBtn: {
        padding: '5px 12px', backgroundColor: '#3a3a4a', color: '#fff', border: 'none',
        borderRadius: '4px', cursor: 'pointer', fontSize: '12px', transition: 'background 0.2s'
    },
    breadcrumbs: {
        display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#aaa'
    },
    crumbActive: { color: '#007aff', fontWeight: '600' },
    mainContainer: {
        display: 'flex', flex: '1', width: '100%', height: 'calc(100% - 40px)', position: 'relative', overflow: 'hidden'
    },
    gridWrapper: {
        flex: '1', padding: '16px', overflowY: 'auto', position: 'relative'
    },
    fileGrid: {
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))',
        gap: '20px', width: '100%'
    },
    itemCard: {
        display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '10px',
        borderRadius: '6px', cursor: 'pointer', textAlign: 'center', transition: 'background 0.2s'
    },
    icon: { fontSize: '40px', marginBottom: '6px' },
    itemName: { fontSize: '12px', color: '#fff', wordBreak: 'break-word', maxWidth: '80px' },
    previewPanel: {
        width: '260px', backgroundColor: '#15151a', borderLeft: '1px solid #3a3a4a',
        display: 'none', flexDirection: 'column', padding: '16px', boxSizing: 'border-box',
        position: 'absolute', right: '0', top: '0', bottom: '0', zIndex: '5'
    },
    previewTitle: { fontSize: '14px', fontWeight: '600', marginBottom: '8px', borderBottom: '1px solid #3a3a4a', paddingBottom: '6px' },
    previewContent: { flex: '1', backgroundColor: '#222', padding: '10px', borderRadius: '4px', fontFamily: 'Consolas, monospace', fontSize: '12px', overflowY: 'auto', whiteSpace: 'pre-wrap', color: '#00ff66' },
    previewMeta: { fontSize: '11px', color: '#777', marginTop: '10px' },
    closePreview: { marginTop: '10px', padding: '6px', backgroundColor: '#cf6679', border: 'none', borderRadius: '4px', color: '#fff', cursor: 'pointer' }
};

/**
 * Hàm khởi tạo chính của ứng dụng File Explorer
 * @param {HTMLElement} contentElement - Element đích (Vùng Content của cửa sổ)
 */
export function initFileExplorer(contentElement) {
    // Thiết lập cấu hình gốc cho vùng chứa
    contentElement.innerHTML = '';
    
    let currentPath = ["root"];
    let activePreviewFile = null;

    // Xây dựng Layout DOM
    const wrapper = document.createElement('div');
    Object.assign(wrapper.style, APP_STYLES.wrapper);

    // 1. Thanh công cụ Toolbar
    const toolbar = document.createElement('div');
    Object.assign(toolbar.style, APP_STYLES.toolbar);

    const backBtn = document.createElement('button');
    backBtn.innerText = "← Back";
    Object.assign(backBtn.style, APP_STYLES.backBtn);
    backBtn.addEventListener('mouseenter', () => backBtn.style.backgroundColor = '#4a4a5a');
    backBtn.addEventListener('mouseleave', () => backBtn.style.backgroundColor = '#3a3a4a');

    const breadcrumbsContainer = document.createElement('div');
    Object.assign(breadcrumbsContainer.style, APP_STYLES.breadcrumbs);

    toolbar.appendChild(backBtn);
    toolbar.appendChild(breadcrumbsContainer);

    // 2. Vùng hiển thị nội dung chính (Main Container)
    const mainContainer = document.createElement('div');
    Object.assign(mainContainer.style, APP_STYLES.mainContainer);

    const gridWrapper = document.createElement('div');
    Object.assign(gridWrapper.style, APP_STYLES.gridWrapper);

    const fileGrid = document.createElement('div');
    Object.assign(fileGrid.style, APP_STYLES.fileGrid);
    gridWrapper.appendChild(fileGrid);

    // 3. Khung xem trước dữ liệu (Preview Panel)
    const previewPanel = document.createElement('div');
    Object.assign(previewPanel.style, APP_STYLES.previewPanel);

    const previewTitle = document.createElement('div');
    Object.assign(previewTitle.style, APP_STYLES.previewTitle);

    const previewContent = document.createElement('div');
    Object.assign(previewContent.style, APP_STYLES.previewContent);

    const previewMeta = document.createElement('div');
    Object.assign(previewMeta.style, APP_STYLES.previewMeta);

    const closePreviewBtn = document.createElement('button');
    closePreviewBtn.innerText = "Close Preview";
    Object.assign(closePreviewBtn.style, APP_STYLES.closePreview);

    previewPanel.appendChild(previewTitle);
    previewPanel.appendChild(previewContent);
    previewPanel.appendChild(previewMeta);
    previewPanel.appendChild(closePreviewBtn);

    mainContainer.appendChild(gridWrapper);
    mainContainer.appendChild(previewPanel);

    wrapper.appendChild(toolbar);
    wrapper.appendChild(mainContainer);
    contentElement.appendChild(wrapper);

    // =========================================================================
    // BƯỚC 4.3: Hàm Render thư mục và đọc dữ liệu Node tương ứng
    // =========================================================================
    function renderDirectory(containerEl, pathArr) {
        containerEl.innerHTML = '';
        
        // Định vị Node hiện tại trên VFS
        let currentNode = virtualFS;
        for (const segment of pathArr) {
            if (currentNode[segment]) {
                currentNode = currentNode[segment];
            } else {
                return; // Ngắt nếu đường dẫn không hợp lệ
            }
        }

        // Duyệt qua các thành phần con của Node hiện tại
        Object.keys(currentNode).forEach(key => {
            const item = currentNode[key];
            const isFile = item.type === "file";

            const itemCard = document.createElement('div');
            Object.assign(itemCard.style, APP_STYLES.itemCard);
            
            itemCard.addEventListener('mouseenter', () => itemCard.style.backgroundColor = 'rgba(255,255,255,0.08)');
            itemCard.addEventListener('mouseleave', () => itemCard.style.backgroundColor = 'transparent');

            const iconEl = document.createElement('div');
            Object.assign(iconEl.style, APP_STYLES.icon);
            iconEl.innerText = isFile ? "📄" : "📁";

            const nameEl = document.createElement('div');
            Object.assign(nameEl.style, APP_STYLES.itemName);
            nameEl.innerText = key;

            itemCard.appendChild(iconEl);
            itemCard.appendChild(nameEl);

            // Xử lý Sự kiện Tương tác Click trên các phần tử
            itemCard.addEventListener('click', (e) => {
                e.stopPropagation();
                if (!isFile) {
                    // BƯỚC 4.5: Click thư mục -> Tiến sâu vào cấu trúc hình cây
                    navigateTo([...pathArr, key]);
                } else {
                    // BƯỚC 4.6: Click tệp tin -> Kích hoạt Panel Preview dữ liệu
                    showPreview(key, item);
                }
            });

            containerEl.appendChild(itemCard);
        });
    }

    // =========================================================================
    // BƯỚC 4.4 & 4.5: Cơ chế chuyển hướng (Navigate) & Hoạt họa Slide Transition
    // =========================================================================
    function navigateTo(newPath) {
        // Đóng nhanh panel xem trước khi chuyển đổi thư mục để tránh sai lệch dữ liệu trực quan
        if (previewPanel.style.display === 'flex') {
            closePreview();
        }

        // Thực thi Hoạt cảnh Đóng (Slide-out sang Trái)
        anime({
            targets: fileGrid,
            translateX: [0, -40],
            opacity: [1, 0],
            duration: 180,
            easing: 'easeInQuad',
            complete: () => {
                // Cập nhật mảng trạng thái đường dẫn cục bộ
                currentPath = newPath;
                
                // Đồng bộ hóa Breadcrumbs hệ thống
                updateBreadcrumbs();
                
                // Tái tạo cấu trúc cây thư mục mới vào DOM
                renderDirectory(fileGrid, currentPath);

                // Thực thi Hoạt cảnh Mở (Slide-in từ Phải qua)
                anime({
                    targets: fileGrid,
                    translateX: [40, 0],
                    opacity: [0, 1],
                    duration: 220,
                    easing: 'easeOutCubic'
                });
            }
        });
    }

    function updateBreadcrumbs() {
        breadcrumbsContainer.innerHTML = '';
        currentPath.forEach((segment, index) => {
            const separator = document.createElement('span');
            separator.innerText = index === 0 ? "" : " / ";
            if (index > 0) breadcrumbsContainer.appendChild(separator);

            const crumb = document.createElement('span');
            crumb.innerText = segment;
            crumb.style.cursor = 'pointer';
            
            if (index === currentPath.length - 1) {
                Object.assign(crumb.style, APP_STYLES.crumbActive);
            } else {
                crumb.addEventListener('mouseenter', () => crumb.style.color = '#fff');
                crumb.addEventListener('mouseleave', () => crumb.style.color = '#aaa');
                crumb.addEventListener('click', () => {
                    navigateTo(currentPath.slice(0, index + 1));
                });
            }
            breadcrumbsContainer.appendChild(crumb);
        });

        // Vô hiệu hóa nút Back nếu đang đứng tại tầng gốc cao nhất (root)
        backBtn.disabled = currentPath.length <= 1;
        backBtn.style.opacity = currentPath.length <= 1 ? "0.5" : "1";
        backBtn.style.cursor = currentPath.length <= 1 ? "not-allowed" : "pointer";
    }

    // Xử lý nút quay lại (Cắt segment cuối của mảng path)
    backBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (currentPath.length > 1) {
            navigateTo(currentPath.slice(0, -1));
        }
    });

    // =========================================================================
    // BƯỚC 4.6: Quản lý tính năng Preview và Hoạt họa Slide-In từ cạnh Phải
    // =========================================================================
    function showPreview(fileName, fileObj) {
        activePreviewFile = fileName;
        previewTitle.innerText = fileName;
        previewContent.innerText = fileObj.content;
        previewMeta.innerText = `Dung lượng: ${fileObj.size}\nCập nhật: ${fileObj.modified}`;

        if (previewPanel.style.display !== 'flex') {
            previewPanel.style.display = 'flex';
            // Đẩy panel ra ngoài màn hình bên phải trước khi chạy hiệu ứng mượt
            previewPanel.style.transform = 'translateX(100%)';
            
            anime({
                targets: previewPanel,
                translateX: ['100%', '0%'],
                duration: 300,
                easing: 'easeOutCubic'
            });
        }
    }

    function closePreview() {
        anime({
            targets: previewPanel,
            translateX: ['0%', '100%'],
            duration: 250,
            easing: 'easeInCubic',
            complete: () => {
                previewPanel.style.display = 'none';
                activePreviewFile = null;
            }
        });
    }

    closePreviewBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closePreview();
    });

    // Thực hiện vòng nạp dữ liệu đầu tiên khi bật ứng dụng
    updateBreadcrumbs();
    renderDirectory(fileGrid, currentPath);
}