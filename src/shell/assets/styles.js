export const STYLES = {
    desktop: {
        width: '100vw',
        height: '100vh',
        position: 'relative',
        background: 'linear-gradient(135deg, #0c1b44, #0e4cb1)',
        overflow: 'hidden'
    },
    taskbar: {
        width: '100vw',
        height: '48px',
        position: 'absolute',
        bottom: '0',
        left: '0',
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 10px',
        boxSizing: 'border-box', // Đảm bảo tổng chiều rộng luôn cố định bằng 100vw bao gồm cả padding
        zIndex: '99999'
    },
    window: {
        position: 'absolute',
        width: '400px',
        height: '300px',
        backgroundColor: '#ffffff',
        borderRadius: '8px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        zIndex: '100',
        minWidth: '200px',
        minHeight: '150px'
    },
    titleBar: {
        height: '36px',
        backgroundColor: '#e5e7eb',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0 12px',
        cursor: 'move',
        userSelect: 'none',
        borderBottom: '1px solid #d1d5db'
    },
    titleText: {
        fontSize: '14px',
        fontWeight: '500',
        color: '#1f2937',
        fontFamily: 'sans-serif'
    },
    // ĐỒNG BỘ: Đổi tên từ btnGroup thành controlGroup để tương thích với window_factory.js
    controlGroup: {
        display: 'flex',
        gap: '8px'
    },
    controlBtn: {
        width: '12px',
        height: '12px',
        borderRadius: '50%',
        border: 'none',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
    },
    content: {
        flex: '1',
        backgroundColor: '#ffffff',
        overflow: 'auto',
        padding: '12px',
        fontFamily: 'sans-serif'
    },
    controlGroup: {
        display: 'flex',
        gap: '8px'
    },
    controlBtn: {
        width: '12px',
        height: '12px',
        borderRadius: '50%',
        border: 'none',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
    },
    // BỔ SUNG: Màu sắc riêng biệt cho 3 nút chức năng
    btnMinimize: { backgroundColor: '#ffbd2e' }, // Vàng
    btnClose: { backgroundColor: '#ff5f56' },    // Đỏ
    btnMaximize: { backgroundColor: '#27c93f' }, // Xanh lá

    // BỔ SUNG: Kiểu dáng cho Icon đại diện trên Taskbar
    taskbarAppIcon: {
        height: '36px',
        padding: '0 12px',
        marginRight: '8px',
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        color: '#ffffff',
        borderRadius: '6px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'sans-serif',
        fontSize: '13px',
        cursor: 'pointer',
        userSelect: 'none',
        transition: 'background 0.2s'
    },

    // BỔ SUNG: Thiết lập vùng bắt sự kiện thay đổi kích thước (Resize Handle)
    // resizeHandle: {
    //     position: 'absolute',
    //     right: '0',
    //     bottom: '0',
    //     width: '15px',
    //     height: '15px',
    //     cursor: 'se-resize', // Con trỏ chuột dạng mũi tên chéo góc
    //     backgroundColor: 'transparent'
    // }
    resizeHandle: {
    position: 'absolute',
    right: '0',
    bottom: '0',
    width: '16px',
    height: '16px',
    cursor: 'se-resize',
    backgroundColor: 'transparent',
    zIndex: '9999'
}
};
