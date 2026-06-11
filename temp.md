# 2. NỀN TẢNG LÝ THUYẾT

---

## 2.1 Mô hình Dispatcher-Scheduler

### Phân tách trách nhiệm

**Module 1 — Dispatcher** (`selectBestElevator`):
- Đầu vào: một yêu cầu tầng mới
- Đầu ra: thang máy được gán

**Module 2 — LOOK Scheduler** (`sortTargetsLOOK`):
- Đầu vào: danh sách mục tiêu hiện tại của một thang máy
- Đầu ra: thứ tự phục vụ được sắp xếp theo LOOK

Luồng xử lý:

```
Request
  └─► Dispatcher (Cost Function + ETA)
          └─► Elevator assigned
                  └─► LOOK Scheduler
                          └─► Ordered stop list
```

---

### Thuật toán LOOK Scheduler

LOOK là biến thể của SCAN: thang di chuyển theo một hướng, phục vụ tất cả yêu cầu đến điểm cuối cùng theo hướng đó, sau đó đảo chiều — không đi đến tầng biên nếu không có yêu cầu.

**Quy trình sắp xếp:**

```
Nếu hướng = LÊN:
    ahead  = sort_asc  { f ∈ targets | f ≥ current }
    behind = sort_asc  { f ∈ targets | f < current }
    result = ahead + behind

Nếu hướng = XUỐNG:
    ahead  = sort_desc { f ∈ targets | f ≤ current }
    behind = sort_desc { f ∈ targets | f > current }
    result = ahead + behind
```

**Độ phức tạp:**

| | Độ phức tạp |
|---|---|
| Phân phối (Dispatcher) | $O(E \times T)$ |
| Sắp xếp LOOK | $O(T \log T)$ mỗi thang |
| Không gian | $O(E \times T)$ |

với $E$ = số thang, $T$ = số mục tiêu hiện tại.

---

### Hàm Chi Phí Chuẩn Hóa với ETA

#### Thay Distance bằng ETA

Thay vì dùng khoảng cách tầng thuần túy, hàm chi phí sử dụng **ETA (Estimated Time of Arrival)** — thời gian ước tính thực tế để thang đến tầng yêu cầu, kể cả dừng tại các tầng trung gian:

$$\text{ETA}(e, r) = t_{\text{travel}}(e \to r) + n_{\text{stops}} \cdot t_{\text{door}}$$

Trong đó $n_{\text{stops}}$ là số tầng dừng trên đường đi. $t_{\text{travel}}$ được tính từ mô hình động học (xem §2.2):

$$t_{\text{travel}}(d) \approx \begin{cases} 2\sqrt{\dfrac{d}{a_{max}}} & \text{nếu } d \leq \dfrac{v_{max}^2}{a_{max}} \\[8pt] \dfrac{v_{max}}{a_{max}} + \dfrac{d}{v_{max}} & \text{ngược lại} \end{cases}$$

#### Chuẩn hóa thành phần chi phí

Tất cả thành phần được chuẩn hóa về $[0, 1]$ trước khi kết hợp, tránh vấn đề đơn vị không đồng nhất:

$$\hat{x} = \frac{x - x_{min}}{x_{max} - x_{min}}$$

Trong đó $x_{min}, x_{max}$ được xác định từ giới hạn cấu hình của hệ thống.

#### Hàm chi phí tổng quát

$$\text{Cost}(e, r) = \sum_{i=1}^{6} w_i \cdot c_i(e, r), \quad \sum_{i=1}^{6} w_i = 1,\ w_i \geq 0$$

| $i$ | Thành phần $c_i$ | Mô tả | $w_i$ mặc định |
|---|---|---|---|
| 1 | $\hat{\text{ETA}}$ | Thời gian ước tính đến tầng yêu cầu | 0.40 |
| 2 | $\hat{L}$ | Tỷ lệ tải hiện tại của thang | 0.20 |
| 3 | $\hat{Z}$ | Khoảng cách ngoài vùng (Soft Zone) | 0.15 |
| 4 | $\hat{S}$ | Hướng không phù hợp với yêu cầu | 0.15 |
| 5 | $-\hat{B}_{wait}$ | Thưởng yêu cầu đã chờ lâu (trừ vào cost) | 0.05 |
| 6 | $-\hat{B}_{traffic}$ | Thưởng phù hợp với chế độ lưu lượng | 0.05 |

Trọng số $w_i$ được điều chỉnh thực nghiệm thông qua thử nghiệm nhiều cấu hình khác nhau nhằm đạt cân bằng giữa thời gian chờ và mức sử dụng thang máy.

#### Soft Zone

Thay vì phạt nhị phân (trong/ngoài vùng), penalty vùng tỷ lệ với mức độ vi phạm:

$$Z(e, r) = \frac{\max\!\bigl(0,\ |F_r - c_e| - R_e\bigr)}{F_{total}}$$

Trong đó $c_e$ là trung tâm vùng của thang (tính từ phân vùng tĩnh hoặc động), $R_e$ là nửa kích thước vùng. Kết quả đã nằm trong $[0, 1]$ nên không cần chuẩn hóa thêm.

#### Wait Bonus — Aging (Chống Starvation)

$$B_{wait}(r) = \min\!\left(k \cdot t_{wait}(r),\ B_{max}\right)$$

Trong đó $t_{wait}(r)$ là thời gian yêu cầu $r$ đã chờ. $B_{max} = 1$ (sau chuẩn hóa) giới hạn trên để tránh bonus vô hạn chi phối toàn bộ hàm chi phí.

---

## 2.2 Mô Phỏng Vật Lý

### Tích phân Semi-Implicit Euler

Thay vì Euler tường minh:

```
// Euler tường minh — kém ổn định
p += v * dt
v += a * dt
```

Dùng **Semi-Implicit Euler** (cập nhật vận tốc trước, dùng vận tốc mới để cập nhật vị trí):

$$v_{n+1} = v_n + a_n \cdot \Delta t$$
$$p_{n+1} = p_n + v_{n+1} \cdot \Delta t$$

Sai số tích lũy giảm và hệ thống có ổn định số tốt hơn, giảm sai số tích lũy trong mô phỏng thời gian thực.

---

### Mô hình Jerk (Giới hạn thay đổi gia tốc)

Mô hình trước thay đổi gia tốc tức thời ($a \leftarrow \pm a_{max}$), không phản ánh thực tế. Thêm **jerk** $j = da/dt$ như biến trạng thái thứ ba:

$$a_{n+1} = \text{clamp}\!\left(a_n + j_{\text{cmd}} \cdot \Delta t,\ -a_{max},\ a_{max}\right)$$
$$v_{n+1} = \text{clamp}\!\left(v_n + a_{n+1} \cdot \Delta t,\ -v_{max},\ v_{max}\right)$$
$$p_{n+1} = p_n + v_{n+1} \cdot \Delta t$$

**Biên dạng jerk theo giai đoạn chuyển động:**

| Giai đoạn | $j_{\text{cmd}}$ |
|---|---|
| Bắt đầu tăng tốc | $+j_{max}$ |
| Tăng tốc đều (a = $a_{max}$) | $0$ |
| Kết thúc tăng tốc | $-j_{max}$ |
| Bắt đầu giảm tốc | $-j_{max}$ |
| Giảm tốc đều (a = $-a_{max}$) | $0$ |
| Kết thúc giảm tốc | $+j_{max}$ |

**Khoảng cách phanh** với jerk:

$$d_{brake} \approx \frac{v^2}{2a_{max}} + \frac{v \cdot a_{max}}{2 j_{max}}$$

Đây là công thức gần đúng. Số hạng thứ hai là phần bổ sung do thời gian chuyển tiếp jerk. Điều kiện kích hoạt phanh cần dùng công thức này thay cho công thức đơn giản $v^2/(2a)$.

**Thời gian di chuyển** (công thức giải tích thay cho tích phân từng frame khi cần ước tính ETA):

$$t(d) \approx \begin{cases} 2\sqrt{\dfrac{d}{a_{max}}} & \text{nếu } d \leq \dfrac{v_{max}^2}{a_{max}} \\[8pt] \dfrac{v_{max}}{a_{max}} + \dfrac{d}{v_{max}} & \text{ngược lại} \end{cases}$$

Đây là công thức xấp xỉ dùng trong Dispatcher để tính ETA mà không cần chạy mô phỏng.

**Độ phức tạp:** $O(1)$ thời gian và không gian mỗi thang mỗi frame.

---

## 2.3 Phân Phối Trọng Lượng Gaussian Cắt Cụt

### Vấn đề với clamp

Khi lấy mẫu Gaussian rồi `clamp` vào $[w_{min}, w_{max}]$, xác suất tại hai đầu biên tăng đột biến thành khối điểm — không còn là phân phối Gaussian. Dùng **rejection sampling** để giữ đúng phân phối:

```
repeat:
    u1, u2 ~ Uniform(0, 1]
    z = sqrt(-2 · ln(u1)) · cos(2π · u2)    // Box-Muller
    w = μ + z · σ
until w ∈ [w_min, w_max]
return w
```

Phân phối kết quả là Gaussian điều kiện — **Truncated Gaussian**:

$$f(w) = \frac{\phi\!\left(\frac{w - \mu}{\sigma}\right)}{\sigma \left[\Phi\!\left(\frac{w_{max} - \mu}{\sigma}\right) - \Phi\!\left(\frac{w_{min} - \mu}{\sigma}\right)\right]}, \quad w \in [w_{min}, w_{max}]$$

Trong đó $\phi$ là PDF và $\Phi$ là CDF của phân phối chuẩn tắc $\mathcal{N}(0,1)$.

**Số lần lặp trung bình** của rejection sampling với các tham số dưới đây là $\approx 1.1$ (vì phần bị cắt rất nhỏ), không ảnh hưởng đáng kể đến hiệu năng.

### Tham số

| Tham số | Giá trị mặc định | Ghi chú |
|---|---|---|
| $\mu$ | $70\ \text{kg}$ | Có thể hiệu chỉnh theo nhân khẩu học |
| $\sigma$ | $12\ \text{kg}$ | Có thể hiệu chỉnh |
| $w_{min}$ | $50\ \text{kg}$ | |
| $w_{max}$ | $130\ \text{kg}$ | |

---

## 2.4 Adaptive Scheduling

Thay vì dùng trọng số cố định, hệ thống điều chỉnh $w_i$ và hành vi điều phối theo trạng thái vận hành hiện tại. Không thay đổi cấu trúc LOOK hay Cost Function — chỉ điều chỉnh tham số.

### Hệ số tải (Load Factor)

$$\Lambda = \frac{N_{pending}}{E}$$

Trong đó $N_{pending}$ là số yêu cầu đang chờ, $E$ là số thang.

Trọng số được điều chỉnh mượt theo $\Lambda$ qua hàm sigmoid, tránh ngưỡng cứng (if/else):

$$w_i(\Lambda) = w_i^{(0)} + \Delta w_i \cdot \sigma\!\bigl(\beta(\Lambda - \Lambda_0)\bigr)$$

$$\sigma(x) = \frac{1}{1 + e^{-x}}$$

Trong đó $\Lambda_0$ là ngưỡng tải trung tâm, $\beta$ kiểm soát độ dốc chuyển tiếp. Các tham số này được lựa chọn thực nghiệm.

Ví dụ điều chỉnh điển hình:

| Trọng số | $\Lambda$ thấp | $\Lambda$ cao |
|---|---|---|
| $w_1$ (ETA) | 0.50 | 0.30 |
| $w_3$ (Zone) | 0.10 | 0.25 |
| $w_4$ (Direction) | 0.10 | 0.20 |

### Phát hiện lưu lượng (Traffic Detection)

Hệ thống theo dõi tỷ lệ yêu cầu trong cửa sổ thời gian trượt $[t - T_w, t]$ (chỉ xét hall-call):

$$r_{up}(t) = \frac{N_{up}}{N_{up} + N_{down}}, \quad r_{down}(t) = 1 - r_{up}(t)$$

Ba chế độ vận hành:

| Chế độ | Điều kiện | Điều chỉnh |
|---|---|---|
| **UP PEAK** | $r_{up} > \theta_u$ | Giảm $w_4$ cho hướng lên; tăng $w_6$ |
| **DOWN PEAK** | $r_{down} > \theta_d$ | Tương tự cho hướng xuống |
| **NORMAL** | Còn lại | Trọng số cân bằng mặc định |

$\theta_u, \theta_d$ là ngưỡng cấu hình (giá trị khởi đầu: 0.70).

### Định vị thang rảnh (Idle Positioning)

Khi thang rảnh trong $T_{idle}$ giây, thang di chuyển về tầng có xác suất gọi cao nhất:

$$f^* = \arg\max_{f \in [1, F]} \hat{\lambda}_f$$

Trong đó $\hat{\lambda}_f$ là tần suất yêu cầu ước tính tại tầng $f$, tính bằng cửa sổ trượt có trọng số hàm mũ:

$$\hat{\lambda}_f(t) = (1 - \alpha)\,\hat{\lambda}_f(t - \Delta t) + \alpha \cdot \mathbb{1}[\text{request at } f \text{ in } \Delta t]$$

$\alpha \in (0, 1)$ là hệ số làm mượt (decay rate).

### Hàm chi phí đầy đủ sau Adaptive Scheduling

$$\boxed{\text{Cost}(e, r) = w_1(\Lambda)\cdot\hat{\text{ETA}} + w_2(\Lambda)\cdot\hat{L} + w_3(\Lambda)\cdot\hat{Z} + w_4(\Lambda)\cdot\hat{S} - w_5\cdot\hat{B}_{wait} - w_6(\text{mode})\cdot\hat{B}_{traffic}}$$

---

## 2.5 Phân Vùng Động (Dynamic Zoning)

### Hạn chế của phân vùng tĩnh

Phân vùng đều theo tầng giả định lưu lượng đồng nhất. Khi lưu lượng lệch (ví dụ: tầng thấp đông hơn), một thang bị quá tải trong khi thang khác rảnh.

### Phân vùng theo lưu lượng

Mỗi $T_{rebalance}$ giây, hệ thống cập nhật biên giới vùng dựa trên $\hat{\lambda}_f$.

**Mục tiêu:** Chia $F$ tầng thành $E$ vùng sao cho tổng lưu lượng ước tính mỗi vùng xấp xỉ bằng nhau:

$$\sum_{f \in \text{zone}_i} \hat{\lambda}_f \approx \frac{1}{E} \sum_{f=1}^{F} \hat{\lambda}_f \quad \forall\, i = 1, \ldots, E$$

**Thuật toán:**

```
1. Tính tích lũy lưu lượng:
       C[f] = Σ λ̂_k,  k = 1..f

2. Ngưỡng lưu lượng mỗi vùng:
       τ_i = (i / E) · C[F],   i = 1..E

3. Tìm biên vùng:
       boundary_i = min { f : C[f] ≥ τ_i }

4. Cập nhật zone_min[i], zone_max[i] cho mỗi thang
```

**Độ phức tạp:** $O(F)$ mỗi lần cập nhật, chạy định kỳ không ảnh hưởng đến hiệu năng real-time.

### So sánh phân vùng tĩnh và động

| | Tĩnh | Động |
|---|---|---|
| Biên giới vùng | Cố định | Cập nhật mỗi $T_{rebalance}$ |
| Giả định | Lưu lượng đồng nhất | Không yêu cầu |
| Tham số thêm | Không | $T_{rebalance}$, $\alpha$ (decay) |
| Triển khai | Đơn giản | Trung bình |
| Hiệu quả khi lưu lượng lệch | Thấp | Cao hơn |

Cơ chế Soft Zone (§2.1) vẫn giữ nguyên — biên giới động chỉ dịch chuyển tâm và bán kính vùng, không thay đổi cách tính penalty.

### Hysteresis (Chống Zone Thrashing)

Để tránh biên giới vùng nhảy liên tục (zone thrashing), hệ thống chỉ cập nhật vùng khi sự thay đổi biên giới vượt ngưỡng:

$$|\Delta \text{boundary}| > 2 \quad \text{hoặc} \quad \Delta \text{Load} > 15\%$$

Điều này đảm bảo tính ổn định của phân vùng.

---

### Giới hạn mô hình

Mô phỏng hiện tại có các giới hạn sau:

- Không mô phỏng đối trọng (counterweight)
- Không mô phỏng động cơ điện và hệ thống điều khiển động cơ
- Không mô phỏng cáp kéo và ma sát
- ETA là giá trị xấp xỉ, không tính chính xác tất cả các yếu tố thực tế
- Adaptive Scheduling dựa trên heuristic, không sử dụng machine learning
- Mô hình Jerk chưa triển khai đầy đủ S-Curve Motion Profile 7 pha chuẩn công nghiệp
- Phát hiện lưu lượng chỉ xét hall-call, không bao gồm yêu cầu nội bộ cabin
- Dynamic Zoning chưa triển khai đầy đủ cơ chế hysteresis trong code

---
