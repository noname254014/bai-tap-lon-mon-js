# Web OS and Elevator Simulation

## Thông tin dự án

**Môn học:** JavaScript
**Tên dự án:** Web OS and Elevator Simulation
**Sinh viên thực hiện:** Phạm Ngọc Trung Hiếu
**MSSV:** B25DCCC068
**Lớp:** D25CQCC02-B
**Năm học:** 2025 - 2026

---

## Giới thiệu

Web OS and Elevator Simulation là hệ thống mô phỏng môi trường hệ điều hành trên trình duyệt (Web OS), tích hợp mô phỏng thang máy thời gian thực.

Dự án được xây dựng nhằm nghiên cứu:

* Mô phỏng chuyển động thang máy.
* Thuật toán điều phối thang máy.
* Quản lý trạng thái người dùng.
* Kiến trúc ứng dụng Web theo mô hình mô-đun.
* Xây dựng môi trường Desktop chạy trên trình duyệt.

---

## Công nghệ sử dụng

| Thành phần | Công nghệ                   |
| ---------- | --------------------------- |
| Frontend   | HTML5, CSS3, JavaScript  |
| Backend    | Python 3                    |
| Database   | SQLite                      |
| Animation  | anime.js                    |
| Runtime    | Web Browser                 |

---

## Cấu trúc thư mục

```text
project/
│
├── backend/
│   ├── server.py
│   ├── auth.py
│   ├── database.py
│   └── state_manager.py
│
├── src/
│   ├── apps/
│   ├── shell/
│   └── sdk/
│
├── index.html
└── README.md
```

---

## Yêu cầu hệ thống

* Python 3.x
* Visual Studio Code
* Extension Live Server
* Trình duyệt hiện đại:

  * Google Chrome
  * Microsoft Edge
  * Firefox

---

## Hướng dẫn chạy chương trình

### Bước 1: Khởi động Backend

Mở Terminal và di chuyển vào thư mục backend:

```bash
cd backend
```

Chạy server:

```bash
python server.py
```

Nếu thành công, backend sẽ khởi động và sẵn sàng xử lý các yêu cầu đăng nhập, lưu trạng thái và cấu hình hệ thống.

---

### Bước 2: Khởi động Frontend

Mở thư mục dự án bằng Visual Studio Code.

Mở file:

```text
index.html
```

Chọn:

```text
Right Click
→ Open with Live Server
```

Hoặc nhấn:

```text
Go Live
```

ở góc dưới bên phải của VS Code.

---

### Bước 3: Đăng nhập hệ thống

Tài khoản quản trị mặc định:

```text
Username: admin
Password: admin123456
```

Sau khi đăng nhập thành công, hệ thống sẽ tải giao diện Web OS.

---

## Các chức năng chính

### Web OS

* Desktop mô phỏng.
* Quản lý cửa sổ.
* Thanh tác vụ.
* Chế độ ngủ.
* Quản lý nền.
* Lưu trạng thái giao diện.

### Elevator Simulation

* Mô phỏng thang máy thời gian thực.
* Thuật toán điều phối LOOK.
* Quản lý hành khách.
* Thống kê vận hành.
* Phát hiện lỗi quá tải.
* Phát hiện lỗi kẹt thang.
* Theo dõi ETA.

### User Management

* Đăng ký tài khoản.
* Đăng nhập.
* Quản lý người dùng.
* Phân quyền Admin/User.

---

## Lưu ý

* Backend phải được khởi động trước khi mở giao diện web.
* Nếu backend không chạy, các chức năng đăng nhập và lưu dữ liệu sẽ không hoạt động.
* SQLite sẽ tự tạo cơ sở dữ liệu khi chạy lần đầu.
* Nên sử dụng Google Chrome hoặc Microsoft Edge để có hiệu năng mô phỏng tốt nhất.
* Có thể đổi nền bằng cách cho vào thư mục với tên temp, ví dụ nếu đổi thư mục temp thành tên khác, đổi thư mục a thành temp là đổi nền
---

## Tài khoản mẫu

```text
Username: admin
Password: admin123456
```

---

## Phiên bản

```text
Version: 1.0
```

---

## Giảng viên hướng dẫn

* Bùi Khắc Ngọc
* Trần Minh Hiếu
