# Báo Cáo Phân Tích Chi Tiết: Backend, Auth & Event Bus

## 1. Tổng Quan

**Backend**: Python Flask-less HTTP Server với SQLite database  
**Frontend Auth**: JavaScript client-side authentication  
**Event Bus**: JavaScript pub/sub pattern cho component communication  

### 1.1 Cấu Trúc Thư Mục Backend

```
backend/
├── auth.py              (286 lines) - Xác thực người dùng
├── database.py          (119 lines) - Quản lý SQLite database
├── server.py            (183 lines) - HTTP server & routing
├── state_manager.py     (196 lines) - Quản lý state ứng dụng
└── data.db              - SQLite database file
```

### 1.2 Frontend Components

```
src/
├── sdk/
│   └── event-bus.js     (35 lines) - Event pub/sub system
└── shell/
    └── auth.js          (204 lines) - Client authentication
```

---

## 2. Kiến Trúc Tổng Thể

### 2.1 Sơ Đồ Kiến Trúc Hệ Thống

```
┌─────────────────────────────────────────────────────────────────┐
│                      WEB OS CLIENT                              │
│                   (Frontend - JavaScript)                       │
└─────────────────────────────────────────────────────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
        ▼                       ▼                       ▼
┌───────────────┐     ┌───────────────┐     ┌───────────────┐
│  auth.js      │     │ event-bus.js  │     │  Apps (Elevator│
│  (204 lines)  │     │  (35 lines)   │     │   etc.)       │
└───────┬───────┘     └───────┬───────┘     └───────┬───────┘
        │                       │                       │
        │                       │                       │
        └───────────────────────┼───────────────────────┘
                                │
                                ▼
                    ┌───────────────────────┐
                    │   HTTP (fetch API)    │
                    └───────────┬───────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│              PYTHON HTTP SERVER (server.py)                     │
│                    (BaseHTTPRequestHandler)                      │
└─────────────────────────────────────────────────────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
        ▼                       ▼                       ▼
┌───────────────┐     ┌───────────────┐     ┌───────────────┐
│  auth.py      │     │ state_manager │     │  database.py  │
│  (286 lines)  │     │  (196 lines)  │     │  (119 lines)  │
└───────┬───────┘     └───────┬───────┘     └───────┬───────┘
        │                       │                       │
        └───────────────────────┼───────────────────────┘
                                ▼
                    ┌───────────────────────┐
                    │   SQLite Database     │
                    │      (data.db)        │
                    └───────────────────────┘
```

### 2.2 Data Flow Diagram

```
┌─────────────┐
│   Login     │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────┐
│  auth.js: attemptLogin()       │
│  1. Try backend API            │
│  2. Fallback to local storage  │
└──────┬──────────────────────────┘
       │
       ├─────────────┬──────────────┐
       │             │              │
       ▼             ▼              ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│ POST /api/  │ │ localLogin()│ │ loginAsGuest│
│ login       │ │             │ │             │
└──────┬──────┘ └──────┬──────┘ └──────┬──────┘
       │                │              │
       │                │              │
       ▼                ▼              ▼
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│ server.py   │  │ localStorage│  │ currentUser │
│ handle_login│  │             │  │  = {...}   │
└──────┬──────┘  └─────────────┘  └─────────────┘
       │
       ▼
┌─────────────┐
│ auth.py:    │
│ login_user()│
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ database.py │
│ SELECT user │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ SQLite DB   │
│ users table │
└─────────────┘
```

---

## 3. Phân Tích Chi Tiết Backend Python

### 3.1 database.py (119 lines)

**Mục đích**: Quản lý kết nối SQLite database và khởi tạo schema

#### 3.1.1 Constants (Dòng 1-6)
```python
DB_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(DB_DIR, 'data.db')
```
- **Lỗ hổng**: Hardcoded path, không configurable
- **Đề xuất**: Sửize environment variable

#### 3.1.2 get_db_connection() (Dòng 9-20)
```python
def get_db_connection():
    """Hàm bổ trợ để kết nối tới SQLite và bật cấu hình Foreign Key."""
    if not os.path.exists(DB_DIR):
        os.makedirs(DB_DIR)

    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA foreign_keys = ON;")
    conn.row_factory = sqlite3.Row
    return conn
```
- **Mục đích**: Tạo kết nối DB với foreign keys enabled
- **Ưu điểm**: Row factory trả về dict thay vì tuple
- **Lỗ hổng**: 
  - Không có connection pooling
  - Không có timeout configuration
  - Không có error handling cho directory creation
- **Đề xuất**: 
  - Thêm connection pooling
  - Thêm try-catch cho directory creation
  - Thêm connection timeout

#### 3.1.3 init_db() (Dòng 23-100)
```python
def init_db():
    """Khởi tạo cấu trúc cơ sở dữ liệu cho WebOS."""
    conn = get_db_connection()
    cursor = conn.cursor()

    sql_script = """
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT DEFAULT 'user',
        created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS window_states (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        state_json TEXT NOT NULL,
        updated_at TEXT DEFAULT (datetime('now', 'localtime')),
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS elevator_configs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        config_json TEXT NOT NULL,
        updated_at TEXT DEFAULT (datetime('now', 'localtime')),
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );
    """
```
- **Mục đích**: Khởi tạo 3 bảng: users, window_states, elevator_configs
- **Lỗi Logic CRITICAL** (Dòng 75-91):
```python
except sqlite3.Error as e:
    print(f"[ERROR] Lỗi trong quá trình khởi tạo Database: {e}")
    # Nếu lỗi, thử xóa database file và tạo lại
    if os.path.exists(DB_PATH):
        try:
            conn.close()  # Close existing connection first
            os.remove(DB_PATH)
            print("[SYSTEM] Da xoa file database cu, dang tao lai...")
```
  - **Vấn đề**: Tự động xóa database khi có lỗi là **DANGEROUS**
  - **Risk**: Mất toàn bộ user data khi có lỗi transient
  - **Đề xuất**: Không tự động xóa, chỉ log error và require manual intervention

- **Lỗi Logic** (Dòng 67-72):
```python
try:
    print("[SYSTEM] Co so du lieu SQLite da duoc kiem tra va khoi tao thanh cong!")
except Exception as print_error:
    print(f"[WARNING] Print error (ignorable): {print_error}")
```
  - **Vấn đề**: Try-catch quanh print statement là vô nghĩa
  - **Đề xuất**: Xóa try-catch này

#### 3.1.4 _migrate_add_role_column() (Dòng 102-114)
```python
def _migrate_add_role_column(conn):
    """Thêm cột role cho DB cũ nếu chưa có."""
    try:
        cursor = conn.cursor()
        cursor.execute("PRAGMA table_info(users);")
        columns = [row[1] for row in cursor.fetchall()]
        if 'role' not in columns:
            cursor.execute("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user';")
            conn.commit()
            print("[SYSTEM] Da nang cap bang users voi cot role.")
    except Exception as e:
        print(f"[WARNING] Không thể thêm cột role: {e}")
```
- **Mục đích**: Migration để thêm cột role
- **Lỗi Logic**: Function này được comment out trong init_db() (dòng 72, 89)
- **Đề xuất**: Hoặc enable migration hoặc xóa function

### 3.2 auth.py (286 lines)

**Mục đích**: Xử lý authentication, password hashing, user management

#### 3.2.1 Constants (Dòng 6-8)
```python
HASH_ALGORITHM = 'sha256'
ITERATIONS = 100000
```
- **Mục đích**: Cấu hình PBKDF2-HMAC-SHA256
- **Ưu điểm**: 100,000 iterations là secure cho 2024
- **Đề xuất**: Làm configurable via environment variable

#### 3.2.2 hash_password() (Dòng 15-32)
```python
def hash_password(password: str, salt: str) -> str:
    """Băm mật khẩu kết hợp muối (salt) sử dụng PBKDF2-HMAC-SHA256."""
    password_bytes = password.encode('utf-8')
    salt_bytes = salt.encode('utf-8')

    derived_key = hashlib.pbkdf2_hmac(
        HASH_ALGORITHM,
        password_bytes,
        salt_bytes,
        ITERATIONS
    )
    
    return derived_key.hex()
```
- **Mục đích**: Hash password với salt using PBKDF2
- **Ưu điểm**: Industry-standard algorithm, constant-time comparison later
- **Lỗ hổng**: Không có password complexity validation trước hashing
- **Đề xuất**: Thêm validation cho password strength

#### 3.2.3 encode/decode_password_storage() (Dòng 35-46)
```python
def encode_password_storage(salt: str, password_hash: str) -> str:
    """Đóng gói salt và hash vào một chuỗi duy nhất định dạng 'salt:hash'."""
    return f"{salt}:{password_hash}"

def decode_password_storage(stored_string: str) -> tuple:
    """Tách chuỗi 'salt:hash' từ database ngược lại thành cặp (salt, hash)."""
    salt, password_hash = stored_string.split(':', 1)
    return salt, password_hash
```
- **Mục đích**: Serialize/deserialize salt:hash
- **Lỗ hổng**: Simple string format không có versioning
- **Đề xuất**: Sửize JSON format với version field

#### 3.2.4 register_user() (Dòng 53-96)
```python
def register_user(username: str, password: str) -> tuple:
    """Đăng ký tài khoản mới cho nhân viên vào hệ thống WebOS."""
    username = username.strip()
    if not username or not password:
        return False, "Tên tài khoản và mật khẩu không được để trống."
        
    if len(password) < 6:
        return False, "Mật khẩu phải chứa tối thiểu 6 ký tự để đảm bảo an toàn."

    salt = secrets.token_hex(16)
    pwd_hash = hash_password(password, salt)
    db_password_field = encode_password_storage(salt, pwd_hash)

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute(
            "INSERT INTO users (username, password_hash) VALUES (?, ?);",
            (username, db_password_field)
        )
        conn.commit()
        return True, "Đăng ký tài khoản thành công!"
        
    except sqlite3.IntegrityError:
        return False, f"Tài khoản '{username}' đã tồn tại trong hệ thống doanh nghiệp."
        
    except sqlite3.Error as e:
        return False, f"Lỗi hệ thống cơ sở dữ liệu: {str(e)}"
        
    finally:
        conn.close()
```
- **Mục đích**: Đăng ký user mới
- **Lỗ hổng**: 
  - Không có username format validation (special characters, length)
  - Không có rate limiting cho registration
  - Password complexity check quá đơn giản (chỉ length)
- **Đề xuất**:
  - Thêm username validation regex
  - Thêm rate limiting (ex: max 5 requests/minute/IP)
  - Thêm password complexity requirements (uppercase, lowercase, number, special)

#### 3.2.5 login_user() (Dòng 102-146)
```python
def login_user(username: str, password: str) -> dict | None:
    """Xác thực tài khoản. Trả về dict {id, username, role} nếu thành công."""
    username = username.strip()
    if not username or not password:
        return None

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute(
            "SELECT id, password_hash, role, username FROM users WHERE username = ?;",
            (username,)
        )
        user_row = cursor.fetchone()

        if user_row is None:
            print(f"[*] Đăng nhập thất bại: Tài khoản '{username}' không tồn tại.")
            return None

        user_id = user_row['id']
        stored_password_field = user_row['password_hash']
        role = user_row['role'] or 'user'

        try:
            salt, original_hash = decode_password_storage(stored_password_field)
        except ValueError:
            print("[-] Lỗi cấu trúc chuỗi mật khẩu lưu trữ trong database.")
            return None

        computed_hash = hash_password(password, salt)

        if secrets.compare_digest(original_hash, computed_hash):
            print(f"[+] Người dùng '{username}' (ID: {user_id}) xác thực thành công.")
            return {"id": user_id, "username": user_row['username'], "role": role}
        else:
            print(f"[*] Đăng nhập thất bại: Sai mật khẩu cho tài khoản '{username}'.")
            return None

    except sqlite3.Error as e:
        print(f"[-] Lỗi truy vấn xác thực hệ thống: {e}")
        return None
        
    finally:
        conn.close()
```
- **Mục đích**: Xác thực login
- **Ưu điểm**: 
  - Sửize `secrets.compare_digest()` để ngăn chặn timing attacks
  - Proper error handling
- **Lỗ hổng**:
  - Không có rate limiting cho login attempts (brute force vulnerability)
  - Không có account lockout sau failed attempts
  - Không có logging cho security audit
  - Print statements暴露 thông tin敏感 thông tin (username tồn tại/không)
- **Đề xuất**:
  - Thêm rate limiting (ex: max 5 attempts/minute)
  - Thêm account lockout (ex: lock 15 minutes sau 5 failed attempts)
  - Xóa print statements暴露 thông tin, chỉ log generic error
  - Thêm audit logging cho security events

#### 3.2.6 register_user_with_role() (Dòng 149-175)
```python
def register_user_with_role(username: str, password: str, role: str = 'user') -> tuple:
    """Đăng ký tài khoản với vai trò cụ thể (dùng cho admin hoặc seed)."""
```
- **Mục đích**: Đăng ký user với role specified
- **Lỗ hổng**: 
  - Không có validation cho role parameter (any string accepted)
  - Không có authorization check (bất kỳ ai都可以 gọi)
- **Đề xuất**:
  - Validate role against allowed values ('user', 'admin')
  - Thêm authorization check (chỉ admin mới được tạo user với role)

#### 3.2.7 seed_sample_users() (Dòng 178-194)
```python
def seed_sample_users():
    """Tạo tài khoản mẫu nếu chưa tồn tại."""
    samples = [
        ("admin", "admin123456", "admin"),
        ("user1", "password1", "user"),
        ("user2", "password2", "user"),
    ]
```
- **Mục đích**: Tạo sample users
- **Lỗ hổng CRITICAL**:
  - Hardcoded passwords: admin/admin123456, user1/password1, user2/password2
  - **Risk**: Tài khoản này được dùng trong production, attacker biết credentials
- **Đề xuất**:
  - Xóa hardcoded credentials trong production
  - Sửize environment variables
  - Hoặc yêu cầu admin tạo first user via setup wizard

#### 3.2.8 list_all_users() (Dòng 197-204)
```python
def list_all_users() -> list:
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT id, username, role, created_at FROM users ORDER BY id;")
        return [dict(row) for row in cursor.fetchall()]
    finally:
        conn.close()
```
- **Mục đích**: Liệt kê tất cả users
- **Lỗ hổng**: 
  - Không có authorization check (bất kỳ ai都可以 gọi)
  - Không có pagination (dữ liệu lớn có thể cause performance issue)
- **Đề xuất**:
  - Thêm authorization check (chỉ admin)
  - Thêm pagination
  - Thêm filtering/sorting

#### 3.2.9 update_user_password() (Dòng 207-225)
```python
def update_user_password(user_id: int, new_password: str) -> tuple:
    if len(new_password) < 6:
        return False, "Mật khẩu phải có tối thiểu 6 ký tự."
    salt = secrets.token_hex(16)
    pwd_hash = hash_password(new_password, salt)
    db_password_field = encode_password_storage(salt, pwd_hash)

    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("UPDATE users SET password_hash = ? WHERE id = ?;", (db_password_field, user_id))
        if cursor.rowcount == 0:
            return False, "Không tìm thấy tài khoản."
        conn.commit()
        return True, "Cập nhật mật khẩu thành công."
    except sqlite3.Error as e:
        return False, str(e)
    finally:
        conn.close()
```
- **Mục đích**: Cập nhật password user
- **Lỗ hổng**: 
  - Không có authorization check (bất kỳ ai都可以 thay đổi password của bất kỳ ai)
  - Không có current password verification
- **Đề xuất**:
  - Thêm authorization check (chỉ admin hoặc user本人)
  - Thêm current password verification cho user本人
  - Thêm audit logging

#### 3.2.10 update_user_role() (Dòng 228-240)
```python
def update_user_role(user_id: int, role: str) -> tuple:
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("UPDATE users SET role = ? WHERE id = ?;", (role, user_id))
        if cursor.rowcount == 0:
            return False, "Không tìm thấy tài khoản."
        conn.commit()
        return True, "Cập nhật vai trò thành công."
    except sqlite3.Error as e:
        return False, str(e)
    finally:
        conn.close()
```
- **Lỗ hổng**: 
  - Không có authorization check (bất kỳ ai都可以 change role)
  - Không có role validation
  - Không có protection cho preventing self-demotion (admin đổi role chính mình)
- **Đề xuất**:
  - Thêm authorization check (chỉ admin)
  - Validate role against allowed values
  - Prevent self-demotion

#### 3.2.11 delete_user() (Dòng 243-255)
```python
def delete_user(user_id: int) -> tuple:
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM users WHERE id = ?;", (user_id,))
        if cursor.rowcount == 0:
            return False, "Không tìm thấy tài khoản."
        conn.commit()
        return True, "Đã xóa tài khoản."
    except sqlite3.Error as e:
        return False, str(e)
    finally:
        conn.close()
```
- **Lỗ hổng**: 
  - Không có authorization check
  - Không có protection cho preventing self-deletion
  - Không có soft delete (dữ liệu lost навсегда)
- **Đề xuất**:
  - Thêm authorization check
  - Prevent self-deletion
  - Sửize soft delete (thay vì hard delete)

#### 3.2.12 admin_create_user() (Dòng 258-270)
```python
def admin_create_user(username: str, password: str, role: str = 'user') -> tuple:
    """Hàm wrapper để gọi register_user_with_role với role."""
    return register_user_with_role(username, password, role)
```
- **Lỗ hổng**: Function này không có "admin" trong tên nhưng không có admin check
- **Đề xuất**: Thêm admin authorization check

### 3.3 server.py (183 lines)

**Mục đích**: HTTP server với routing table

#### 3.3.1 Helper Functions (Dòng 12-26)
```python
def get_json_body(req: BaseHTTPRequestHandler) -> dict:
    """Đọc và giải mã dữ liệu JSON từ phần thân (body) của yêu cầu HTTP."""
    content_length = int(req.headers.get('Content-Length', 0))
    if content_length == 0:
        return {}
    post_data = req.rfile.read(content_length)
    return json.loads(post_data.decode('utf-8'))

def send_json_response(req: BaseHTTPRequestHandler, status_code: int, payload: dict):
    """Gửi phản hồi định dạng JSON kèm theo Header chuẩn."""
    req.send_response(status_code)
    req.send_cors_headers()
    req.send_header('Content-Type', 'application/json')
    req.end_headers()
    req.wfile.write(json.dumps(payload).encode('utf-8'))
```
- **Lỗ hổng trong get_json_body()**:
  - Không có try-catch cho json.loads() → JSON parsing error sẽ crash server
  - Không có content length validation (memory DoS risk)
- **Đề xuất**:
  - Thêm try-catch
  - Thêm max content size limit

#### 3.3.2 Route Handlers (Dòng 28-101)
```python
def handle_login(req: BaseHTTPRequestHandler, query_params: dict):
    body = get_json_body(req)
    user = auth.login_user(body.get('username', ''), body.get('password', ''))
    if user:
        send_json_response(req, 200, {
            "success": True,
            "user_id": user["id"],
            "username": user["username"],
            "role": user["role"]
        })
    else:
        send_json_response(req, 401, {"success": False, "message": "Thông tin đăng nhập không hợp lệ"})
```
- **Lỗ hổng**: 
  - Không có rate limiting
  - Generic error message cho authentication failure (good for security)
  - Không có session/token management → stateless authentication
- **Đề xuất**:
  - Thêm rate limiting
  - Implement JWT hoặc session-based authentication

#### 3.3.3 CORS Configuration (Dòng 125-135)
```python
def send_cors_headers(self):
    """Thiết lập các Headers bắt buộc để vượt qua chính sách Same-Origin (CORS)."""
    self.send_header('Access-Control-Allow-Origin', '*')
    self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
```
- **Lỗ hổng CRITICAL**: 
  - `Access-Control-Allow-Origin: '*'` cho phép bất kỳ origin nào
  - **Risk**: CSRF attacks, data theft from malicious sites
- **Đề xuất**:
  - Sửize specific origin(s) thay vì wildcard
  - Thêm CORS credentials configuration
  - Thêm CSRF token mechanism

#### 3.3.4 Routing Table (Dòng 107-118)
```python
ROUTES = {
    ('POST', '/api/register'): handle_register,
    ('POST', '/api/login'): handle_login,
    ('POST', '/api/state/window/save'): handle_save_window,
    ('GET', '/api/state/window/load'): handle_load_window,
    ('POST', '/api/state/elevator/save'): handle_save_elevator,
    ('GET', '/api/state/elevator/load'): handle_load_elevator,
    ('GET', '/api/admin/users'): handle_list_users,
    ('POST', '/api/admin/users'): handle_admin_create_user,
    ('PUT', '/api/admin/users'): handle_admin_update_user,
    ('DELETE', '/api/admin/users'): handle_admin_delete_user,
}
```
- **Lỗ hổng**: 
  - Admin routes không có authentication/authorization middleware
  - Bất kỳ ai都可以 gọi `/api/admin/users`
- **Đề xuất**: Thêm authentication/authorization middleware cho admin routes

#### 3.3.5 Error Handling (Dòng 146-150)
```python
try:
    handler(self, query_params)
except Exception as e:
    print(f"[ERROR] Quá trình xử lý thất bại: {e}")
    send_json_response(self, 500, {"success": False, "message": "Lỗi máy chủ nội bộ"})
```
- **Lỗ hổng**: Generic error message tốt cho security, nhưng không có error logging cho debugging
- **Đề xuất**: Log detailed error to file, return generic message to client

### 3.4 state_manager.py (196 lines)

**Mục đích**: Quản lý window states và elevator configs

#### 3.4.1 save_window_state() (Dòng 9-60)
```python
def save_window_state(user_id: int, state_dict: list | dict) -> bool:
    """Lưu hoặc ghi đè trạng thái các cửa sổ đang mở của người dùng."""
    if user_id is None:
        return False

    try:
        state_json = json.dumps(state_dict, ensure_ascii=False)
    except (TypeError, ValueError) as e:
        print(f"[-] Lỗi mã hóa JSON cho Window State: {e}")
        return False

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("SELECT id FROM window_states WHERE user_id = ?;", (user_id,))
        row = cursor.fetchone()

        if row:
            cursor.execute(
                """
                UPDATE window_states 
                SET state_json = ?, updated_at = datetime('now', 'localtime') 
                WHERE user_id = ?;
                """,
                (state_json, user_id)
            )
        else:
            cursor.execute(
                """
                INSERT INTO window_states (user_id, state_json) 
                VALUES (?, ?);
                """,
                (user_id, state_json)
            )
            
        conn.commit()
        return True
    except sqlite3.Error as e:
        print(f"[-] Lỗi khi ghi Window State vào cơ sở dữ liệu: {e}")
        return False
    finally:
        conn.close()
```
- **Ưu điểm**: 
  - Proper error handling
  - UPSERT logic
- **Lỗ hổng**: 
  - Không có authorization check (user có thể save state cho user khác)
  - Không có validation cho state_dict structure
  - Không có size limit (vốn lớn có thể cause performance issue)
- **Đề xuất**:
  - Thêm authorization check
  - Thêm validation cho state structure
  - Thêm size limit

#### 3.4.2 load_window_state() (Dòng 63-86)
```python
def load_window_state(user_id: int) -> list | dict:
    """Truy vấn và giải mã trạng thái cửa sổ để khôi phục phiên làm việc."""
    if user_id is None:
        return []

    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute("SELECT state_json FROM window_states WHERE user_id = ?;", (user_id,))
        row = cursor.fetchone()
        
        if row is None:
            return []
            
        state_json = row['state_json']
        return json.loads(state_json)
    except sqlite3.Error as e:
        print(f"[-] Lỗi khi đọc Window State từ cơ sở dữ liệu: {e}")
        return []
    finally:
        conn.close()
```
- **Lỗ hổng**: 
  - Không có authorization check
  - Không có validation cho loaded JSON structure
- **Đề xuất**: Thêm authorization check và validation

#### 3.4.3 save_elevator_config() / load_elevator_config() (Dòng 93-160)
- **Lỗ hổng tương tự**: Không có authorization check

---

## 4. Phân Tích Chi Tiết Frontend JavaScript

### 4.1 event-bus.js (35 lines)

**Mục đích**: Pub/sub pattern cho component communication

#### 4.1.1 EventBus Class (Dòng 3-32)
```javascript
class EventBus {
    constructor() {
        this.events = {};
    }

    on(eventName, callback) {
        if (!this.events[eventName]) {
            this.events[eventName] = [];
        }
        this.events[eventName].push(callback);
    }

    off(eventName, callback) {
        if (!this.events[eventName]) return;
        this.events[eventName] = this.events[eventName].filter(cb => cb !== callback);
    }

    emit(eventName, data) {
        if (!this.events[eventName]) return;
        this.events[eventName].forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`[EventBus] Lỗi khi thực thi sự kiện ${eventName}:`, error);
            }
        });
    }
}
```
- **Ưu điểm**: 
  - Simple implementation
  - Error isolation (callback errors không stop other callbacks)
- **Lỗ hổng**:
  - Memory leak: Không có mechanism để unsubscribe all listeners cho một event
  - Không có event namespace support
  - Không có once() method (fire once then auto-unsubscribe)
- **Đề xuất**:
  - Thêm `offAll(eventName)` method
  - Thêm `once(eventName, callback)` method
  - Thêm event namespace support (dotted notation: "user.login")

#### 4.1.2 Export (Dòng 35)
```javascript
export const systemBus = new EventBus();
```
- **Lỗ hổng**: Singleton pattern - không thể tạo multiple instances cho testing
- **Đề xuất**: Export class instead of singleton, let consumer create instance

### 4.2 auth.js (204 lines)

**Mục đích**: Client-side authentication với backend fallback to localStorage

#### 4.2.1 Constants (Dòng 1-11)
```javascript
const BACKEND_URL = 'http:
const LOCAL_USERS_KEY = 'webos_local_users';

let currentUser = null;
let backendAvailable = null;

const SAMPLE_USERS = [
    { id: 1, username: 'admin', password: 'admin123456', role: 'admin' },
    { id: 2, username: 'user1', password: 'password1', role: 'user' },
    { id: 3, username: 'user2', password: 'password2', role: 'user' }
];
```
- **Lỗ hổng CRITICAL**:
  - Hardcoded credentials trong frontend code
  - **Risk**: Attacker có thể inspect source và obtain credentials
- **Đề xuất**: 
  - Xóa hardcoded credentials
  - Sửize environment variables hoặc backend seeding only

#### 4.2.2 Local Storage Helpers (Dòng 19-35)
```javascript
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
```
- **Lỗ hổng**:
  - Không có encryption cho sensitive data
  - Không have validation cho loaded data
- **Đề xuất**:
  - Encrypt sensitive data before saving to localStorage
  - Validate loaded data structure

#### 4.2.3 User State Management (Dòng 37-56)
```javascript
export function getCurrentUser() {
    return currentUser;
}

export function isGuest() {
    return currentUser ? !!currentUser.isGuest : false;
}

export function isAdmin() {
    return currentUser?.role === 'admin';
}
```
- **Lỗ hổng**: 
  - `currentUser` là global variable, có thể be modified bởi bất kỳ code nào
  - Không have immutable pattern
- **Đề xuất**: 
  - Sửize closure hoặc module pattern để protect state
  - Make currentUser read-only

#### 4.2.4 Backend Availability Check (Dòng 73-82)
```javascript
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
```
- **Lỗ hổng**: 
  - Checking `/api/admin/users` endpoint không có authentication → wrong endpoint for health check
  - **Risk**: Nếu backend up nhưng admin endpoint protected, check sẽ fail
- **Đề xuất**: 
  - Create dedicated `/api/health` endpoint
  - Hoặc check `/api/login` with invalid credentials

#### 4.2.5 Local Login (Dòng 84-91)
```javascript
function localLogin(username, password) {
    initLocalUsers();
    const users = getLocalUsersFull();
    const found = users.find(u => u.username === username.trim() && u.password === password);
    if (!found) return { success: false, message: 'Thông tin đăng nhập không hợp lệ.' };
    currentUser = { id: found.id, username: found.username, role: found.role, isGuest: false };
    return { success: true };
}
```
- **Lỗ hổng CRITICAL**:
  - Password stored in **plaintext** trong localStorage
  - **Risk**: XSS attack có thể steal passwords
  - **Risk**: Inspect localStorage reveals passwords
- **Đề xuất**:
  - Không bao giờ lưu password trong localStorage
  - Sửize session tokens hoặc JWT instead
  - Hash passwords client-side (still not ideal, but better than plaintext)

#### 4.2.6 attemptLogin() (Dòng 93-120)
```javascript
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
```
- **Lỗ hổng**:
  - Fallback to localLogin với plaintext password storage
  - Không có rate limiting
  - Không có session/token persistence
- **Đề xuất**:
  - Xóa plaintext password fallback
  - Implement JWT token storage in localStorage (encrypted)
  - Thêm rate limiting

#### 4.2.7 attemptRegister() (Dòng 122-140)
```javascript
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
```
- **Lỗ hổng tương tự**: Fallback to local storage với plaintext password

#### 4.2.8 localCreateUser() (Dòng 152-174)
```javascript
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
```
- **Lỗ hổng**: 
  - Password plaintext trong localStorage
  - Role parameter không có validation
- **Đề xuất**: 
  - Xóa password plaintext storage
  - Validate role parameter

#### 4.2.9 User Management Functions (Dòng 176-202)
```javascript
export function localUpdatePassword(userId, newPassword) {  }
export function localUpdateRole(userId, role) {  }
export function localDeleteUser(userId) {  }
```
- **Lỗ hổng**: 
  - Không có authorization check
  - localDeleteUser() có check cho admin nhưng không đủ robust
- **Đề xuất**: 
  - Thêm authorization check cho tất cả functions
  - Implement proper RBAC (Role-Based Access Control)

---

## 5. Lỗ Hổng Bảo Mật (Security Vulnerabilities)

### 5.1 Critical Vulnerabilities

#### 5.1.1 Plaintext Password Storage (CRITICAL)
**Vị trí**: 
- auth.js (Dòng 7-11): Hardcoded credentials
- auth.js (Dòng 84-91): Plaintext trong localStorage
- auth.py (Dòng 178-194): Hardcoded sample passwords

**Risk**: 
- Attacker có thể steal passwords qua XSS
- Inspect localStorage/DB reveals passwords
- Credential reuse attacks

**Mitigation**:
- Xóa tất cả hardcoded credentials
- Không lưu password trong localStorage
- Sửize JWT/session tokens
- Hash passwords trong localStorage nếu bắt buộc (không recommended)

#### 5.1.2 CORS Wildcard (CRITICAL)
**Vị trí**: server.py (Dòng 127)
```python
self.send_header('Access-Control-Allow-Origin', '*')
```

**Risk**: 
- CSRF attacks
- Data theft từ malicious sites
- Bypass same-origin policy

**Mitigation**:
```python
allowed_origins = ['http:
origin = req.headers.get('Origin')
if origin in allowed_origins:
    self.send_header('Access-Control-Allow-Origin', origin)
```

#### 5.1.3 Auto-Delete Database on Error (CRITICAL)
**Vị trí**: database.py (Dòng 75-91)

**Risk**: 
- Data loss khi transient errors
- Attacker có thể trigger database deletion

**Mitigation**:
- Xóa auto-delete logic
- Log errors và require manual intervention
- Implement proper error recovery

#### 5.1.4 No Rate Limiting (HIGH)
**Vị trí**: server.py (tất cả auth endpoints)

**Risk**: 
- Brute force attacks
- DoS attacks
- Account enumeration

**Mitigation**:
- Implement rate limiting (ex: 5 requests/minute/IP)
- Implement account lockout (5 failed attempts = lock 15 minutes)
- Use CAPTCHA cho repeated failures

#### 5.1.5 Missing Authorization (HIGH)
**Vị trí**: 
- auth.py: list_all_users(), update_user_password(), update_user_role(), delete_user()
- state_manager.py: save_window_state(), load_window_state(), save_elevator_config(), load_elevator_config()

**Risk**: 
- Bất kỳ ai都可以 thực hiện admin operations
- Privilege escalation
- Data tampering

**Mitigation**:
- Thêm authentication middleware
- Thêm authorization check (chỉ admin cho admin operations)
- Validate user ownership cho user-specific operations

### 5.2 Medium Vulnerabilities

#### 5.2.1 SQL Injection Risk (MEDIUM)
**Vị trí**: server.py (Dòng 82, 97)
```python
user_id = int(query_params.get('user_id', [None])[0])
```

**Risk**: 
- Nếu user_id không được sanitize trước khi dùng trong SQL
- Current implementation uses parameterized queries (good), nhưng direct URL parameter parsing vẫn có risk

**Mitigation**:
- Validate user_id trước khi dùng
- Use regex validation cho numeric values

#### 5.2.2 Memory DoS (MEDIUM)
**Vị trí**: server.py (Dòng 14-18)
```python
content_length = int(req.headers.get('Content-Length', 0))
if content_length == 0:
    return {}
post_data = req.rfile.read(content_length)
```

**Risk**: 
- Không có max content size limit
- Attacker có thể send huge payload to exhaust memory

**Mitigation**:
```python
MAX_CONTENT_SIZE = 10 * 1024 * 1024  # 10MB
if content_length > MAX_CONTENT_SIZE:
    send_json_response(req, 413, {"success": False, "message": "Payload too large"})
    return
```

#### 5.2.3 Information Disclosure (MEDIUM)
**Vị trí**: auth.py (Dòng 119, 138)
```python
print(f"[*] Đăng nhập thất bại: Tài khoản '{username}' không tồn tại.")
print(f"[*] Đăng nhập thất bại: Sai mật khẩu cho tài khoản '{username}'.")
```

**Risk**: 
- Attacker có thể enumerate valid usernames
- Timing attacks

**Mitigation**:
- Xóa print statements
- Log generic messages only
- Use constant-time comparison (đã implement với secrets.compare_digest)

#### 5.2.4 No Session Management (MEDIUM)
**Vị trí**: server.py (login handler)

**Risk**: 
- Stateless authentication - client must send credentials every request
- No logout mechanism
- No session expiration

**Mitigation**:
- Implement JWT tokens
- Implement session-based authentication
- Add token refresh mechanism

### 5.3 Low Vulnerabilities

#### 5.3.1 Hardcoded Backend URL (LOW)
**Vị trí**: auth.js (Dòng 1)
```javascript
const BACKEND_URL = 'http:
```

**Risk**: 
- Not configurable
- Hard to change for different environments

**Mitigation**:
```javascript
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http:
```

#### 5.3.2 Error Information Leakage (LOW)
**Vị trí**: server.py (Dòng 149)
```python
print(f"[ERROR] Quá trình xử lý thất bại: {e}")
```

**Risk**: 
- Stack traces có thể reveal sensitive information

**Mitigation**:
- Log detailed errors to file
- Return generic messages to client

---

## 6. Lỗi Logic (Logic Errors)

### 6.1 Database Auto-Delete Logic (CRITICAL)
**Vị trí**: database.py (Dòng 75-91)
**Vấn đề**: Tự động xóa database khi có error
**Fix**: Xóa auto-delete logic, implement proper error handling

### 6.2 Migration Function Commented Out (MEDIUM)
**Vị trí**: database.py (Dòng 72, 89)
**Vấn đề**: _migrate_add_role_column() được comment out
**Fix**: Hoặc enable migration hoặc xóa function

### 6.3 Try-Catch Around Print Statement (LOW)
**Vị trí**: database.py (Dòng 67-72)
**Vấn đề**: Try-catch vô nghĩa quanh print
**Fix**: Xóa try-catch

### 6.4 Wrong Health Check Endpoint (MEDIUM)
**Vị trí**: auth.js (Dòng 76)
**Vấn đề**: Check `/api/admin/users` cho health check
**Fix**: Create dedicated `/api/health` endpoint

### 6.5 Global Mutable State (MEDIUM)
**Vị trí**: auth.js (Dòng 4-5)
**Vấn đề**: currentUser và backendAvailable là global mutable
**Fix**: Sửize closure hoặc class để protect state

### 6.6 EventBus Memory Leak (LOW)
**Vị trí**: event-bus.js (Dòng 9-14)
**Vấn đề**: Không có mechanism để unsubscribe all listeners
**Fix**: Thêm `offAll(eventName)` method

---

## 7. Phản Biện Về Thiết Kế (Design Critique)

### 7.1 Authentication Architecture

**Vấn đề hiện tại**:
- Fallback mechanism between backend và localStorage
- Plaintext password storage trong localStorage
- Hardcoded credentials

**Phản biện**:
- Fallback mechanism được implement để support offline mode, nhưng security trade-off quá lớn
- Plaintext password storage violates fundamental security principle
- Hardcoded credentials là security anti-pattern

**Đề xuất**:
- Xóa fallback mechanism hoặc implement offline mode với encrypted cache
- Sửize JWT tokens with refresh mechanism
- Store tokens trong HttpOnly cookies hoặc encrypted localStorage
- Implement proper seeding cho initial admin user (setup wizard)

### 7.2 Authorization Model

**Vấn đề hiện tại**:
- Không có authorization checks trong backend
- Role-based access control không được enforce
- Admin routes accessible cho tất cả users

**Phản biện**:
- RBAC được mention trong code nhưng không được enforce
- Không có middleware pattern cho authorization
- Role parameter không được validated

**Đề xuất**:
- Implement authentication middleware
- Implement authorization middleware với RBAC
- Validate role parameter against whitelist
- Add audit logging cho privileged operations

### 7.3 Database Schema Design

**Vấn đề hiện tại**:
- Simple 3-table schema
- Không có indexes cho performance
- Không have audit logging tables
- Không have soft delete

**Phản biện**:
- Schema adequate cho MVP nhưng không scalable
- Không có tracking cho user actions
- Hard delete không cho recovery

**Đề xuất**:
- Thêm indexes cho user_id trong window_states và elevator_configs
- Thêm audit_logs table
- Implement soft delete với deleted_at column
- Thêm created_at và updated_at cho tất cả tables

### 7.4 HTTP Server Architecture

**Vấn đề hiện tại**:
- Sửize Python's built-in BaseHTTPRequestHandler
- Không có connection pooling
- Không have request validation middleware
- Không have logging middleware

**Phản biện**:
- Built-in HTTP server adequate cho development nhưng không production-ready
- Không có proper error handling middleware stack
- Routing table simple nhưng không flexible

**Đề xuất**:
- Migrate đến Flask hoặc FastAPI cho production
- Implement middleware pattern
- Thêm request validation layer
- Thêm structured logging

### 7.5 Event Bus Design

**Vấn đề hiện tại**:
- Simple pub/sub implementation
- Singleton pattern
- Không có event namespace
- Không have error recovery mechanism

**Phản biện**:
- Simple implementation adequate cho small app
- Singleton pattern hinders testing
- Không have cleanup mechanism cho memory leaks

**Đề xuất**:
- Export class instead of singleton
- Add event namespace support
- Add cleanup methods
- Consider using established library như mitt hoặc eventemitter3

### 7.6 State Management

**Vấn đề hiện tại**:
- Global currentUser variable
- No state persistence mechanism
- No state synchronization between tabs
- No undo/redo capability

**Phản biện**:
- Simple state management adequate cho MVP
- Global state hard to test and debug
- No way to recover from errors

**Đề xuất**:
- Implement proper state management (Redux, MobX, hoặc Zustand)
- Add state persistence with encryption
- Implement tab synchronization via BroadcastChannel API
- Add error recovery mechanism

---

## 8. Sơ Đồ Data Flow

### 8.1 Authentication Flow

```
┌─────────────┐
│   User      │
└──────┬──────┘
       │ Enter credentials
       ▼
┌─────────────────────────────────┐
│  auth.js: attemptLogin()       │
│  1. Check backend availability  │
└──────┬──────────────────────────┘
       │
       ├─────────────┬──────────────┐
       │ Backend OK  │ Backend Down │
       ▼             ▼              ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│ POST /api/  │ │ localLogin()│ │ Show error  │
│ login       │ │             │ │             │
└──────┬──────┘ └──────┬──────┘ └─────────────┘
       │                │
       ▼                ▼
┌─────────────┐  ┌─────────────┐
│ server.py   │  │ localStorage│
│ handle_login│  │   (PLAINTEXT)│
└──────┬──────┘  └──────┬──────┘
       │                │
       ▼                ▼
┌─────────────┐  ┌─────────────┐
│ auth.py:    │  │ currentUser │
│ login_user()│  │  = {...}   │
└──────┬──────┘  └─────────────┘
       │
       ▼
┌─────────────┐
│ database.py │
│ SELECT user │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ SQLite DB   │
│ Verify hash │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Return user │
│ data        │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Set         │
│ currentUser │
└─────────────┘
```

### 8.2 State Persistence Flow

```
┌─────────────┐
│   App       │
└──────┬──────┘
       │ Save state
       ▼
┌─────────────────────────────────┐
│  App calls state_manager API     │
└──────┬──────────────────────────┘
       │
       ├─────────────┬──────────────┐
       │ Backend OK  │ Backend Down │
       ▼             ▼              ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│ POST /api/  │ │ localStorage│ │ Show error  │
│ state/save  │ │             │ │             │
└──────┬──────┘ └──────┬──────┘ └─────────────┘
       │                │
       ▼                ▼
┌─────────────┐  ┌─────────────┐
│ server.py   │  │ localStorage│
│ handle_save │ │   (JSON)    │
└──────┬──────┘  └──────┬──────┘
       │                │
       ▼                ▼
┌─────────────┐  ┌─────────────┐
│ state_mgr   │  │ Key:        │
│ save_window │ │ webos_state │
│ _state()    │ │ _{userId}   │
└──────┬──────┘  └─────────────┘
       │
       ▼
┌─────────────┐
│ database.py │
│ UPSERT      │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ SQLite DB   │
│ window_states│
│ table       │
└─────────────┘
```

### 8.3 Event Bus Flow

```
┌─────────────┐
│  Component A│
└──────┬──────┘
       │ systemBus.emit('event', data)
       ▼
┌─────────────────────────────────┐
│         EventBus                │
│  events['event'] = [cb1, cb2, cb3]│
└──────┬──────────────────────────┘
       │
       ├─────────────┬──────────────┐
       ▼             ▼              ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│Component B  │ │Component C  │ │Component D  │
│callback1()  │ │callback2()  │ │callback3()  │
└─────────────┘ └─────────────┘ └─────────────┘
```

---

## 9. Đề Xuất Cải Thiện (Recommendations)

### 9.1 Short-term (Critical - High Priority)

1. **Xóa Plaintext Password Storage**:
   - Xóa hardcoded credentials từ code
   - Không lưu password trong localStorage
   - Implement JWT token authentication

2. **Fix CORS Configuration**:
   - Thay wildcard bằng specific origins
   - Thêm CORS credentials configuration
   - Implement CSRF tokens

3. **Remove Auto-Delete Database**:
   - Xóa auto-delete logic trong init_db()
   - Implement proper error handling
   - Add database backup mechanism

4. **Add Rate Limiting**:
   - Implement rate limiting cho auth endpoints
   - Add account lockout mechanism
   - Use CAPTCHA cho repeated failures

5. **Add Authorization Middleware**:
   - Implement authentication middleware
   - Add authorization checks cho admin routes
   - Validate role parameter

### 9.2 Medium-term

1. **Implement Proper Session Management**:
   - Add JWT token generation
   - Implement token refresh mechanism
   - Add session expiration

2. **Improve Database Schema**:
   - Add indexes cho performance
   - Add audit logging table
   - Implement soft delete

3. **Enhance Event Bus**:
   - Add event namespace support
   - Add cleanup methods
   - Export class instead of singleton

4. **Improve Error Handling**:
   - Add structured logging
   - Log detailed errors to file
   - Return generic messages to client

5. **Add Input Validation**:
   - Validate all input parameters
   - Sanitize user input
   - Add size limits cho payloads

### 9.3 Long-term

1. **Migrate to Modern Framework**:
   - Migrate backend to Flask/FastAPI
   - Implement proper middleware pattern
   - Add API documentation (OpenAPI/Swagger)

2. **Implement Proper State Management**:
   - Use Redux/MobX/Zustand
   - Add state persistence with encryption
   - Implement tab synchronization

3. **Add Comprehensive Testing**:
   - Unit tests cho all functions
   - Integration tests cho API endpoints
   - E2E tests cho authentication flows

4. **Enhance Security**:
   - Add 2FA/MFA support
   - Implement password policies
   - Add security audit logging

5. **Improve Architecture**:
   - Implement microservices architecture
   - Add API gateway
   - Implement proper CI/CD pipeline

---

## 10. Tổng Kết

### 10.1 Điểm Mạnh

1. **PBKDF2-HMAC-SHA256**: Industry-standard password hashing với 100,000 iterations
2. **Constant-Time Comparison**: Sửize `secrets.compare_digest()` để ngăn timing attacks
3. **Foreign Key Constraints**: Proper database relationships với CASCADE delete
4. **Error Isolation**: EventBus có error handling cho individual callbacks
5. **Backend Fallback**: Offline mode support (nhưng có security trade-off)

### 10.2 Điểm Yếu

1. **Plaintext Password Storage**: CRITICAL security vulnerability
2. **CORS Wildcard**: CRITICAL security vulnerability
3. **Auto-Delete Database**: DANGEROUS data loss risk
4. **No Rate Limiting**: Vulnerable to brute force attacks
5. **Missing Authorization**: Bất kỳ ai都可以 perform admin operations

### 10.3 Lỗi Logic Chính

1. Auto-delete database on error
2. Migration function commented out
3. Wrong health check endpoint
4. Global mutable state
5. EventBus memory leak potential

### 10.4 Lỗ Hổng Bảo Mật Chính

1. **CRITICAL**: Plaintext password storage (frontend + backend hardcoded)
2. **CRITICAL**: CORS wildcard configuration
3. **CRITICAL**: Auto-delete database on error
4. **HIGH**: No rate limiting
5. **HIGH**: Missing authorization checks

### 10.5 Tổng Số Files Phân Tích

- **Backend Python**: 4 files (auth.py, database.py, server.py, state_manager.py)
- **Frontend JavaScript**: 2 files (event-bus.js, auth.js)
- **Tổng**: 6 files, 883 lines code

### 10.6 Tổng Số Lỗ Hổng & Lỗi

- **Critical Security**: 3
- **High Security**: 2
- **Medium Security**: 4
- **Low Security**: 2
- **Critical Logic**: 1
- **Medium Logic**: 3
- **Low Logic**: 2
- **Tổng**: 17 issues

---

## 11. Phụ Lục: Danh Sách Hàm Chính

### Backend Python

| Hàm | File | Dòng | Mục đích | Lỗ hổng |
|-----|------|------|----------|----------|
| get_db_connection | database.py | 9-20 | Tạo DB connection | No pooling, no timeout |
| init_db | database.py | 23-100 | Khởi tạo DB schema | **Auto-delete on error** |
| _migrate_add_role_column | database.py | 102-114 | Migration role column | Commented out |
| hash_password | auth.py | 15-32 | Hash password | No strength validation |
| register_user | auth.py | 53-96 | Đăng ký user | No rate limiting |
| login_user | auth.py | 102-146 | Xác thực login | No rate limiting |
| seed_sample_users | auth.py | 178-194 | Tạo sample users | **Hardcoded passwords** |
| list_all_users | auth.py | 197-204 | Liệt kê users | **No authorization** |
| update_user_password | auth.py | 207-225 | Cập nhật password | **No authorization** |
| update_user_role | auth.py | 228-240 | Cập nhật role | **No authorization** |
| delete_user | auth.py | 243-255 | Xóa user | **No authorization** |
| get_json_body | server.py | 12-18 | Parse JSON body | No size limit |
| handle_login | server.py | 33-44 | Xử lý login | No rate limiting |
| send_cors_headers | server.py | 125-129 | CORS headers | **Wildcard origin** |
| save_window_state | state_manager.py | 9-60 | Lưu window state | **No authorization** |
| load_window_state | state_manager.py | 63-86 | Load window state | **No authorization** |

### Frontend JavaScript

| Hàm | File | Dòng | Mục đích | Lỗ hổng |
|-----|------|------|----------|----------|
| EventBus.on | event-bus.js | 9-14 | Subscribe event | No cleanup method |
| EventBus.off | event-bus.js | 17-20 | Unsubscribe event | Cannot unsubscribe all |
| EventBus.emit | event-bus.js | 23-32 | Emit event | - |
| saveToLocalStorage | auth.js | 19-25 | Save to local storage | No encryption |
| loadFromLocalStorage | auth.js | 27-35 | Load from local storage | No validation |
| checkBackend | auth.js | 73-82 | Check backend availability | **Wrong endpoint** |
| localLogin | auth.js | 84-91 | Local login | **Plaintext password** |
| attemptLogin | auth.js | 93-120 | Attempt login | Fallback to plaintext |
| attemptRegister | auth.js | 122-140 | Attempt register | Fallback to plaintext |
| localCreateUser | auth.js | 152-174 | Create local user | **Plaintext password** |
| localUpdatePassword | auth.js | 176-184 | Update local password | **No authorization** |
| localUpdateRole | auth.js | 186-193 | Update local role | **No authorization** |
| localDeleteUser | auth.js | 195-202 | Delete local user | **Weak authorization** |

---

**Người tạo báo cáo**: Devin AI  
**Ngày tạo**: 2026-06-11  
**Tổng số file phân tích**: 6 files (4 Python, 2 JavaScript)  
**Tổng số dòng code**: 883 lines  
**Tổng số vấn đề phát hiện**: 17 (11 security, 6 logic)  
**Độ ưu chí cao nhất**: Fix plaintext password storage, CORS wildcard, auto-delete database
