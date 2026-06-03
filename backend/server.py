import json
import urllib.parse
from http.server import BaseHTTPRequestHandler, HTTPServer
import database
import auth
import state_manager

# ==========================================
# CÁC HÀM XỬ LÝ ĐỘC LẬP (HANDLERS)
# ==========================================

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

def handle_register(req: BaseHTTPRequestHandler, query_params: dict):
    body = get_json_body(req)
    success, msg = auth.register_user(body.get('username', ''), body.get('password', ''))
    send_json_response(req, 200 if success else 400, {"success": success, "message": msg})

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

def handle_list_users(req: BaseHTTPRequestHandler, query_params: dict):
    users = auth.list_all_users()
    send_json_response(req, 200, {"success": True, "users": users})

def handle_admin_create_user(req: BaseHTTPRequestHandler, query_params: dict):
    body = get_json_body(req)
    success, msg = auth.admin_create_user(
        body.get('username', ''), body.get('password', ''), body.get('role', 'user')
    )
    send_json_response(req, 200 if success else 400, {"success": success, "message": msg})

def handle_admin_update_user(req: BaseHTTPRequestHandler, query_params: dict):
    body = get_json_body(req)
    user_id = body.get('user_id')
    if body.get('password'):
        success, msg = auth.update_user_password(user_id, body['password'])
    elif body.get('role'):
        success, msg = auth.update_user_role(user_id, body['role'])
    else:
        success, msg = False, "Không có dữ liệu cập nhật."
    send_json_response(req, 200 if success else 400, {"success": success, "message": msg})

def handle_admin_delete_user(req: BaseHTTPRequestHandler, query_params: dict):
    body = get_json_body(req)
    success, msg = auth.delete_user(body.get('user_id'))
    send_json_response(req, 200 if success else 400, {"success": success, "message": msg})

def handle_save_window(req: BaseHTTPRequestHandler, query_params: dict):
    body = get_json_body(req)
    user_id = body.get('user_id')
    state = body.get('state', [])
    success = state_manager.save_window_state(user_id, state)
    send_json_response(req, 200 if success else 500, {"success": success})

def handle_load_window(req: BaseHTTPRequestHandler, query_params: dict):
    try:
        user_id = int(query_params.get('user_id', [None])[0])
        state = state_manager.load_window_state(user_id)
        send_json_response(req, 200, {"success": True, "state": state})
    except (TypeError, ValueError):
        send_json_response(req, 400, {"success": False, "message": "Thiếu hoặc sai định dạng user_id"})

def handle_save_elevator(req: BaseHTTPRequestHandler, query_params: dict):
    body = get_json_body(req)
    user_id = body.get('user_id')
    config = body.get('config', {})
    success = state_manager.save_elevator_config(user_id, config)
    send_json_response(req, 200 if success else 500, {"success": success})

def handle_load_elevator(req: BaseHTTPRequestHandler, query_params: dict):
    try:
        user_id = int(query_params.get('user_id', [None])[0])
        config = state_manager.load_elevator_config(user_id)
        send_json_response(req, 200, {"success": True, "config": config})
    except (TypeError, ValueError):
        send_json_response(req, 400, {"success": False, "message": "Thiếu hoặc sai định dạng user_id"})


# ==========================================
# BƯỚC 1.13 & 1.14: BẢNG ĐỊNH TUYẾN (ROUTING TABLE)
# ==========================================
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

# ==========================================
# BƯỚC 1.11 & 1.12: KHỞI TẠO HTTP SERVER VÀ CORS
# ==========================================
class WebOSRequestHandler(BaseHTTPRequestHandler):
    
    def send_cors_headers(self):
        """Thiết lập các Headers bắt buộc để vượt qua chính sách Same-Origin (CORS)."""
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')

    def do_OPTIONS(self):
        """Xử lý Preflight Request từ trình duyệt."""
        self.send_response(200)
        self.send_cors_headers()
        self.end_headers()

    def handle_request(self):
        """Trích xuất đường dẫn, đối chiếu với Routing Table và thực thi."""
        parsed_url = urllib.parse.urlparse(self.path)
        path = parsed_url.path
        query_params = urllib.parse.parse_qs(parsed_url.query)
        
        handler = ROUTES.get((self.command, path))
        
        if handler:
            try:
                handler(self, query_params)
            except Exception as e:
                print(f"[ERROR] Quá trình xử lý thất bại: {e}")
                send_json_response(self, 500, {"success": False, "message": "Lỗi máy chủ nội bộ"})
        else:
            send_json_response(self, 404, {"success": False, "message": "Không tìm thấy API (Not Found)"})

    def do_GET(self):
        self.handle_request()

    def do_POST(self):
        self.handle_request()

    def do_PUT(self):
        self.handle_request()

    def do_DELETE(self):
        self.handle_request()

    def log_message(self, format, *args):
        print(f"[HTTP] {self.address_string()} - {format % args}")


def run_server(host='localhost', port=8000):
    database.init_db()
    auth.seed_sample_users()
    server = HTTPServer((host, port), WebOSRequestHandler)
    print(f"[⚡ SYSTEM] WebOS Backend đang chạy tại http://{host}:{port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n[SYSTEM] Đang tắt máy chủ...")
        server.server_close()


if __name__ == '__main__':
    run_server()