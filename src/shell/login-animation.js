// Bước 2.9: Hiệu ứng mở màn khi trang tải (Fade-in & Slide-up)
export function animateFormEntry(targetElement) {
    anime({
        targets: targetElement,
        opacity: [0, 1],
        translateY: [30, 0],
        duration: 1200,
        easing: 'easeOutExpo'
    });
}

// Bước 2.11: Hiệu ứng lắc ngang (Shake) khi biểu mẫu bỏ trống dữ liệu hoặc sai thông tin
export function animateInputShake(targetElement) {
    anime({
        targets: targetElement,
        translateX: [
            { value: -10, duration: 60 },
            { value: 10, duration: 60 },
            { value: -10, duration: 60 },
            { value: 10, duration: 60 },
            { value: 0, duration: 60 }
        ],
        borderColor: [
            { value: '#ff4a4a', duration: 0 },
            { value: 'rgba(255, 255, 255, 0.2)', duration: 600 }
        ],
        easing: 'linear'
    });
}

// Bước 2.10: Hiệu ứng chuyển cảnh mượt mà khi xác thực thành công (Login Success Animation)
export function animateLoginSuccess(loginScreenSelector, desktopScreenSelector, onCompleteCallback) {
    const loginFormBox = document.getElementById('login-form-box');

    // Tạo dòng thời gian hiệu ứng (Timeline) bằng AnimeJS
    const tl = anime.timeline({
        easing: 'easeInOutQuint'
    });

    // Giai đoạn 1: Thu nhỏ và làm biến mất Form đăng nhập
    tl.add({
        targets: loginFormBox,
        opacity: 0,
        scale: 0.8,
        duration: 600
    })
    // Giai đoạn 2: Làm mờ toàn bộ phân vùng màn hình đăng nhập
    .add({
        targets: loginScreenSelector,
        opacity: 0,
        duration: 400,
        complete: () => {
            // Luồng rẽ nhánh thao tác trực tiếp trên DOM trong hàm hồi đáp (Callback complete)
            document.querySelector(loginScreenSelector).style.display = 'none';
            
            const desktop = document.querySelector(desktopScreenSelector);
            desktop.style.display = 'block';
            
            // Kích hoạt hàm gọi ngược để nạp dữ liệu môi trường làm việc từ DB lên
            if (typeof onCompleteCallback === 'function') {
                onCompleteCallback();
            }
        }
    })
    // Giai đoạn 3: Làm hiển thị mượt mà không gian Desktop WebOS
    .add({
        targets: desktopScreenSelector,
        opacity: [0, 1],
        duration: 800
    });
}