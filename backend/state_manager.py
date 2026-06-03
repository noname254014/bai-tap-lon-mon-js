import json
import sqlite3
from database import get_db_connection

# ==========================================
# 1C. Logic Lưu Trạng thái Cửa sổ (WebOS)
# ==========================================

def save_window_state(user_id: int, state_dict: list | dict) -> bool:
    """Bước 1.8 — Lưu hoặc ghi đè trạng thái các cửa sổ đang mở của người dùng.
    
    state_dict: Mảng chứa tọa độ, kích thước, ứng dụng đang active/minimize.
    """
    if user_id is None:
        return False

    try:
        # Chuyển đổi cấu trúc dữ liệu Python (dict/list) thành chuỗi JSON TEXT
        state_json = json.dumps(state_dict, ensure_ascii=False)
    except (TypeError, ValueError) as e:
        print(f"[-] Lỗi mã hóa JSON cho Window State: {e}")
        return False

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Sử dụng chiến lược INSERT OR REPLACE để cập nhật đè lên bản ghi cũ nếu đã tồn tại user_id
        # Trong SQLite, do cấu trúc bảng chưa đặt UNIQUE cho user_id, ta sẽ dùng logic kiểm tra trước
        # hoặc gán lệnh xử lý thực tế tối ưu để tránh trùng lặp dữ liệu.
        cursor.execute("SELECT id FROM window_states WHERE user_id = ?;", (user_id,))
        row = cursor.fetchone()

        if row:
            # Nếu đã tồn tại trạng thái cũ, tiến hành cập nhật (UPDATE)
            cursor.execute(
                """
                UPDATE window_states 
                SET state_json = ?, updated_at = datetime('now', 'localtime') 
                WHERE user_id = ?;
                """,
                (state_json, user_id)
            )
        else:
            # Nếu chưa có, tiến hành chèn mới (INSERT)
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


def load_window_state(user_id: int) -> list | dict:
    """Bước 1.9 — Truy vấn và giải mã trạng thái cửa sổ để khôi phục phiên làm việc."""
    if user_id is None:
        return []

    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute("SELECT state_json FROM window_states WHERE user_id = ?;", (user_id,))
        row = cursor.fetchone()
        
        if row is None:
            # Nếu người dùng mới đăng nhập lần đầu, chưa có dữ liệu cũ -> Trả về mảng rỗng để UI không lỗi
            return []
            
        state_json = row['state_json']
        # Chuyển đổi chuỗi văn bản ngược thành cấu trúc mảng Object cho JavaScript Frontend sử dụng
        return json.loads(state_json)
    except sqlite3.Error as e:
        print(f"[-] Lỗi khi đọc Window State từ cơ sở dữ liệu: {e}")
        return []
    finally:
        conn.close()


# ==========================================
# 1C. Logic Lưu Cấu hình Mô phỏng Thang máy
# ==========================================

def save_elevator_config(user_id: int, config_dict: dict) -> bool:
    """Bước 1.10 — Lưu trữ cấu hình thuật toán mô phỏng thang máy ưa thích (số tầng, số thang...)."""
    if user_id is None:
        return False

    try:
        config_json = json.dumps(config_dict, ensure_ascii=False)
    except (TypeError, ValueError) as e:
        print(f"[-] Lỗi mã hóa JSON cho Elevator Config: {e}")
        return False

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("SELECT id FROM elevator_configs WHERE user_id = ?;", (user_id,))
        row = cursor.fetchone()

        if row:
            cursor.execute(
                """
                UPDATE elevator_configs 
                SET config_json = ?, updated_at = datetime('now', 'localtime') 
                WHERE user_id = ?;
                """,
                (config_json, user_id)
            )
        else:
            cursor.execute(
                """
                INSERT INTO elevator_configs (user_id, config_json) 
                VALUES (?, ?);
                """,
                (user_id, config_json)
            )
            
        conn.commit()
        return True
    except sqlite3.Error as e:
        print(f"[-] Lỗi khi ghi Elevator Config vào cơ sở dữ liệu: {e}")
        return False
    finally:
        conn.close()


def load_elevator_config(user_id: int) -> dict:
    """Bước 1.10 — Tải lại cấu hình mô phỏng thang máy cũ của người dùng để khôi phục trạng thái."""
    if user_id is None:
        return {}

    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute("SELECT config_json FROM elevator_configs WHERE user_id = ?;", (user_id,))
        row = cursor.fetchone()
        
        if row is None:
            # Trả về đối tượng rỗng nếu chưa từng lưu cấu hình trước đó
            return {}
            
        config_json = row['config_json']
        return json.loads(config_json)
    except sqlite3.Error as e:
        print(f"[-] Lỗi khi đọc Elevator Config từ cơ sở dữ liệu: {e}")
        return {}
    finally:
        conn.close()


# ==========================================
# Đoạn mã Test chạy thử nghiệm cục bộ (Unit Test)
# ==========================================
if __name__ == "__main__":
    print("[⚡ TEST] Kiểm thử module state_manager.py...")
    
    # Giả lập ID người dùng (Ví dụ người dùng có ID là 1 đã qua xác thực)
    TEST_USER_ID = 1
    
    # 1. Thử nghiệm lưu trạng thái cửa sổ WebOS
    mock_windows = [
        {"appName": "NoteApp", "x": 100, "y": 150, "width": 400, "height": 300, "isMinimized": False},
        {"appName": "ElevatorApp", "x": 550, "y": 90, "width": 500, "height": 600, "isMinimized": True}
    ]
    save_win_ok = save_window_state(TEST_USER_ID, mock_windows)
    print(f"Lưu Window State: {save_win_ok}")
    
    # Đọc lại trạng thái cửa sổ
    loaded_windows = load_window_state(TEST_USER_ID)
    print(f"Đọc lại Window State: {loaded_windows}")

    # 2. Thử nghiệm lưu cấu hình thuật toán thang máy
    mock_elevator_config = {
        "total_floors": 12,
        "elevator_count": 3,
        "algorithm_strategy": "SCAN",
        "speed": 1.5
    }
    save_el_ok = save_elevator_config(TEST_USER_ID, mock_elevator_config)
    print(f"Lưu Elevator Config: {save_el_ok}")
    
    # Đọc lại cấu hình thang máy
    loaded_config = load_elevator_config(TEST_USER_ID)
    print(f"Đọc lại Elevator Config: {loaded_config}")