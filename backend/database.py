import os
import sqlite3

# Định nghĩa đường dẫn lưu trữ database (Nằm trong thư mục 'backend')
DB_DIR = 'backend'
DB_PATH = os.path.join(DB_DIR, 'data.db')


def get_db_connection():
    """Hàm bổ trợ để kết nối tới SQLite và bật cấu hình Foreign Key."""
    # Tự động tạo thư mục 'backend' nếu lập trình viên hoặc hệ thống chưa tạo
    if not os.path.exists(DB_DIR):
        os.makedirs(DB_DIR)

    conn = sqlite3.connect(DB_PATH)
    # Bắt buộc phải bật PRAGMA này ở mỗi phiên kết nối để tính năng ON DELETE CASCADE hoạt động
    conn.execute("PRAGMA foreign_keys = ON;")
    # Cấu hình này giúp kết quả truy vấn trả về dạng Dictionary/Row thay vì Tuple thô
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Khởi tạo cấu trúc cơ sở dữ liệu cho WebOS.

    Hàm này được gọi một lần duy nhất khi server Node.js/Python bắt đầu khởi
    động.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    # Kịch bản SQL khởi tạo 3 bảng dữ liệu cốt lõi
    sql_script = """
    -- 1. Bảng lưu trữ tài khoản người dùng
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT DEFAULT 'user',
        created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    -- 2. Bảng lưu trạng thái màn hình/cửa sổ ứng dụng WebOS (Phục vụ đồng bộ thiết bị)
    CREATE TABLE IF NOT EXISTS window_states (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        state_json TEXT NOT NULL,
        updated_at TEXT DEFAULT (datetime('now', 'localtime')),
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );

    -- 3. Bảng lưu cấu hình thuật toán mô phỏng thang máy ưa thích của người dùng
    CREATE TABLE IF NOT EXISTS elevator_configs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        config_json TEXT NOT NULL,
        updated_at TEXT DEFAULT (datetime('now', 'localtime')),
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );
    """

    try:
        # Thực thi chuỗi lệnh SQL tạo bảng
        cursor.executescript(sql_script)
        # Xác nhận ghi các thay đổi cấu trúc xuống file data.db
        conn.commit()
        print("[⚡ SYSTEM] Cơ sở dữ liệu SQLite đã được kiểm tra và khởi tạo thành công!")
        _migrate_add_role_column(conn)
    except sqlite3.Error as e:
        print(f"[❌ ERROR] Lỗi trong quá trình khởi tạo Database: {e}")
    finally:
        # Giải phóng tài nguyên kết nối file để tránh lỗi trùng lặp tiến trình (Database locked)
        conn.close()


def _migrate_add_role_column(conn):
    """Thêm cột role cho DB cũ nếu chưa có."""
    cursor = conn.cursor()
    cursor.execute("PRAGMA table_info(users);")
    columns = [row[1] for row in cursor.fetchall()]
    if 'role' not in columns:
        cursor.execute("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user';")
        conn.commit()
        print("[⚡ SYSTEM] Đã nâng cấp bảng users với cột role.")


# Đoạn mã này giúp bạn có thể test chạy thử file database.py độc lập từ Terminal
if __name__ == "__main__":
    init_db()