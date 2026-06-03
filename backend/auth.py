import hashlib
import secrets
import sqlite3
from database import get_db_connection

# Cấu hình tham số cho thuật toán PBKDF2 (Chuẩn bảo mật công nghiệp)
HASH_ALGORITHM = 'sha256'
ITERATIONS = 100000  # Số vòng lặp băm để làm chậm các cuộc tấn công brute-force


# ==========================================
# Bước 1.5 — Các hàm mã hóa lõi (Hash & Salt)
# ==========================================

def hash_password(password: str, salt: str) -> str:
    """Băm mật khẩu kết hợp muối (salt) sử dụng PBKDF2-HMAC-SHA256.

    Thuật toán này an toàn vượt trội so với MD5 hoặc SHA1 thô.
    """
    password_bytes = password.encode('utf-8')
    salt_bytes = salt.encode('utf-8')

    # Thực hiện thuật toán băm kéo dài khóa (Key Stretching)
    derived_key = hashlib.pbkdf2_hmac(
        HASH_ALGORITHM,
        password_bytes,
        salt_bytes,
        ITERATIONS
    )
    
    # Trả về chuỗi dạng Hexadecimal để dễ dàng lưu trữ vào cột TEXT của SQLite
    return derived_key.hex()


def encode_password_storage(salt: str, password_hash: str) -> str:
    """Đóng gói salt và hash vào một chuỗi duy nhất định dạng 'salt:hash' để

    lưu vào DB.
    """
    return f"{salt}:{password_hash}"


def decode_password_storage(stored_string: str) -> tuple:
    """Tách chuỗi 'salt:hash' từ database ngược lại thành cặp (salt, hash)."""
    salt, password_hash = stored_string.split(':', 1)
    return salt, password_hash


# ==========================================
# Bước 1.6 — Hàm Đăng ký người dùng
# ==========================================

def register_user(username: str, password: str) -> tuple:
    """Đăng ký tài khoản mới cho nhân viên vào hệ thống WebOS.

    Trả về: (Trạng_thái: bool, Thông_báo_lỗi_hoặc_thành_công: str)
    """
    # Làm sạch dữ liệu đầu vào cơ bản
    username = username.strip()
    if not username or not password:
        return False, "Tên tài khoản và mật khẩu không được để trống."
        
    if len(password) < 6:
        return False, "Mật khẩu phải chứa tối thiểu 6 ký tự để đảm bảo an toàn."

    # Sinh chuỗi Salt ngẫu nhiên bảo mật cao (16 bytes = 32 ký tự hex)
    salt = secrets.token_hex(16)
    
    # Tiến hành băm mật khẩu cùng với muối vừa sinh
    pwd_hash = hash_password(password, salt)
    
    # Gộp chuỗi theo định dạng salt:hash để nạp vào DB
    db_password_field = encode_password_storage(salt, pwd_hash)

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Thực thi lệnh nạp tài khoản mới
        cursor.execute(
            "INSERT INTO users (username, password_hash) VALUES (?, ?);",
            (username, db_password_field)
        )
        conn.commit()
        return True, "Đăng ký tài khoản thành công!"
        
    except sqlite3.IntegrityError:
        # Bắt lỗi ràng buộc UNIQUE khi username đã tồn tại trong hệ thống
        return False, f"Tài khoản '{username}' đã tồn tại trong hệ thống doanh nghiệp."
        
    except sqlite3.Error as e:
        return False, f"Lỗi hệ thống cơ sở dữ liệu: {str(e)}"
        
    finally:
        conn.close()


# ==========================================
# Bước 1.7 — Hàm Đăng nhập người dùng
# ==========================================

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


def register_user_with_role(username: str, password: str, role: str = 'user') -> tuple:
    """Đăng ký tài khoản với vai trò cụ thể (dùng cho admin hoặc seed)."""
    username = username.strip()
    if not username or not password:
        return False, "Tên tài khoản và mật khẩu không được để trống."
    if len(password) < 6:
        return False, "Mật khẩu phải chứa tối thiểu 6 ký tự."

    salt = secrets.token_hex(16)
    pwd_hash = hash_password(password, salt)
    db_password_field = encode_password_storage(salt, pwd_hash)

    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?);",
            (username, db_password_field, role)
        )
        conn.commit()
        return True, "Đăng ký tài khoản thành công!"
    except sqlite3.IntegrityError:
        return False, f"Tài khoản '{username}' đã tồn tại."
    except sqlite3.Error as e:
        return False, f"Lỗi hệ thống: {str(e)}"
    finally:
        conn.close()


def seed_sample_users():
    """Tạo tài khoản mẫu nếu chưa tồn tại."""
    samples = [
        ("admin", "admin123456", "admin"),
        ("user1", "password1", "user"),
        ("user2", "password2", "user"),
    ]
    for username, password, role in samples:
        conn = get_db_connection()
        cursor = conn.cursor()
        try:
            cursor.execute("SELECT id FROM users WHERE username = ?;", (username,))
            if cursor.fetchone() is None:
                register_user_with_role(username, password, role)
                print(f"[+] Đã tạo tài khoản mẫu: {username} ({role})")
        finally:
            conn.close()


def list_all_users() -> list:
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT id, username, role, created_at FROM users ORDER BY id;")
        return [dict(row) for row in cursor.fetchall()]
    finally:
        conn.close()


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


def delete_user(user_id: int) -> tuple:
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT username, role FROM users WHERE id = ?;", (user_id,))
        row = cursor.fetchone()
        if row is None:
            return False, "Không tìm thấy tài khoản."
        if row['role'] == 'admin' and row['username'] == 'admin':
            return False, "Không thể xóa tài khoản admin gốc."
        cursor.execute("DELETE FROM users WHERE id = ?;", (user_id,))
        conn.commit()
        return True, "Đã xóa tài khoản."
    except sqlite3.Error as e:
        return False, str(e)
    finally:
        conn.close()


def admin_create_user(username: str, password: str, role: str = 'user') -> tuple:
    return register_user_with_role(username, password, role)


# ==========================================
# Đoạn mã Test chạy thử nghiệm cục bộ (Unit Test)
# ==========================================
if __name__ == "__main__":
    print("[⚡ TEST] Tiến hành kiểm thử module auth.py...")
    
    # Giả định đăng ký tài khoản nhân viên
    success, msg = register_user("nhanvien_01", "MatKhauBaoMat123")
    print(f"Kết quả Đăng ký: {success} -> {msg}")
    
    # Thử đăng ký trùng tên để test điều kiện If/Else
    success_dup, msg_dup = register_user("nhanvien_01", "MatKhauKhac")
    print(f"Khả năng bắt trùng: {success_dup} -> {msg_dup}")

    # Thử nghiệm logic Đăng nhập đúng
    uid_success = login_user("nhanvien_01", "MatKhauBaoMat123")
    print(f"Đăng nhập Đúng nhận được: {uid_success}")

    # Thử nghiệm logic Đăng nhập sai mật khẩu
    uid_fail = login_user("nhanvien_01", "SaiMatKhau")
    print(f"Đăng nhập Sai nhận được: {uid_fail}")