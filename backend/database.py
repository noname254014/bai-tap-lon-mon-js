import os
import sqlite3

# Định nghĩa đường dẫn lưu trữ database (Nằm trong thư mục hiện tại của script)
DB_DIR = os.path.dirname(os.path.abspath(__file__))
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
        # Thực thi chuỗi lệnh SQL tạo bảng (dùng executescript cho multiple statements)
        cursor.executescript(sql_script)
        # Xác nhận ghi các thay đổi cấu trúc xuống file data.db
        conn.commit()
        try:
            print("[SYSTEM] Co so du lieu SQLite da duoc kiem tra va khoi tao thanh cong!")
        except Exception as print_error:
            print(f"[WARNING] Print error (ignorable): {print_error}")
        # Bỏ tạm thời migration để tránh lỗi
        # _migrate_add_role_column(conn)
    except sqlite3.Error as e:
        print(f"[ERROR] Lỗi trong quá trình khởi tạo Database: {e}")
        # Nếu lỗi, thử xóa database file và tạo lại
        if os.path.exists(DB_PATH):
            try:
                conn.close()  # Close existing connection first
                os.remove(DB_PATH)
                print("[SYSTEM] Da xoa file database cu, dang tao lai...")
                conn = get_db_connection()  # Get new connection
                cursor = conn.cursor()
                cursor.executescript(sql_script)
                conn.commit()
                try:
                    print("[SYSTEM] Database tao lai thanh cong!")
                except Exception as print_error:
                    print(f"[WARNING] Print error (ignorable): {print_error}")
                # _migrate_add_role_column(conn)
            except Exception as e2:
                print(f"[ERROR] Không thể tạo lại database: {e2}")
    except Exception as e:
        print(f"[ERROR] Lỗi không xác định trong init_db: {e}")
    finally:
        # Giải phóng tài nguyên kết nối file để tránh lỗi trùng lặp tiến trình (Database locked)
        try:
            conn.close()
        except:
            pass  # Connection might already be closed


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
        # Continue anyway - column might already exist or table might be newly created


# Đoạn mã này giúp bạn có thể test chạy thử file database.py độc lập từ Terminal
if __name__ == "__main__":
    init_db()