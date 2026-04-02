# WebGPU Rotating Cube – Screensaver 🧊✨

Một dự án mô phỏng hiệu ứng màn hình chờ (screensaver) cổ điển, nơi một khối lập phương 3D xoay liên tục và nảy bật quanh các cạnh màn hình. Dự án được xây dựng hoàn toàn bằng **WebGPU** – API đồ họa thế hệ mới dành cho web.

🌍 **[Xem Live Demo tại đây](https://mahesvara7061.github.io/webgpu_screensaver_cube/)**

---

## 🛠 Công nghệ sử dụng

* **HTML5 & CSS3:** Cấu trúc layout cơ bản và hiển thị khung vẽ (`<canvas>`).
* **JavaScript (ES6 Modules):** Điều khiển logic vòng lặp render và tính toán vật lý.
* **WebGPU API:** Tương tác trực tiếp với card đồ họa (GPU) để render không gian 3D với hiệu suất cao.
* **WGSL (WebGPU Shading Language):** Viết Vertex Shader và Fragment Shader để tính toán vị trí đỉnh và nội suy màu sắc dựa trên tọa độ không gian.
* **[wgpu-matrix](https://wgpu-matrix.org/):** Thư viện hỗ trợ tính toán ma trận (Matrix4) tốc độ cao cho WebGPU.

---

## 🧮 Nguyên lý & Công thức Toán học

Dự án sử dụng một số kiến thức hình học không gian và đại số tuyến tính cơ bản để tạo ra hiệu ứng di chuyển mượt mà và xử lý va chạm chính xác với rìa màn hình.

### 1. Tính toán giới hạn khung nhìn (Frustum Bounds)
Để khối lập phương nảy lại đúng mép màn hình, chúng ta cần tính toán giới hạn không gian hiển thị (visible half-extents) tại độ sâu $Z$ của camera:

$$halfY = \tan\left(\frac{FOV_Y}{2}\right) \times CAMERA\_DIST$$
$$halfX = halfY \times aspect\_ratio$$

Sau đó, giới hạn di chuyển của tâm khối lập phương (bound) được tính bằng cách trừ đi một nửa kích thước của nó:
$$bound_X = halfX - CUBE\_HALF$$

### 2. Phương trình chuyển động và Phản xạ
Vị trí của khối lập phương được cập nhật dựa trên vận tốc và biến thiên thời gian $\Delta t$ (Delta time) nhằm đảm bảo chuyển động mượt mà không phụ thuộc vào FPS:

$$X_{new} = X_{old} + V_X \cdot \Delta t$$

Khi tâm khối lập phương chạm ngưỡng $bound_X$, nó sẽ bị dội ngược lại (đảo ngược vector vận tốc dọc theo trục đó):
$$V_X = -|V_X|$$

### 3. Ma trận biến đổi (Transformation Matrices)
Mọi đỉnh của khối lập phương đều được nhân với một **Model-View-Projection Matrix** trong Shader:
* **Model-View:** Dịch chuyển khối (Translation) và xoay quanh trục (Rotation) thay đổi liên tục theo thời gian $t$: trục xoay $[\sin(t), \cos(t), 0]$.
* **Projection:** Ma trận phối cảnh tạo cảm giác chiều sâu 3D (Perspective Matrix).

---

## 🚀 Hướng dẫn chạy Local (Môi trường phát triển)

WebGPU là một công nghệ mới, do đó yêu cầu trình duyệt phải hỗ trợ và có thể cần bật flag (cờ) trên một số hệ điều hành.

### Yêu cầu hệ thống:
* **Trình duyệt:** Google Chrome, Microsoft Edge, hoặc các trình duyệt nhân Chromium phiên bản **113 trở lên**.

### Bước 1: Kích hoạt WebGPU (Nếu cần)
Mặc dù WebGPU đã được bật mặc định trên Windows/macOS từ bản 113, nhưng trên một số hệ điều hành (như Linux) hoặc phiên bản cũ hơn, bạn cần bật nó thủ công:
1. Mở trình duyệt, nhập vào thanh địa chỉ: `chrome://flags` (hoặc `edge://flags`).
2. Tìm kiếm từ khóa: **WebGPU** và **Unsafe WebGPU**.
3. Đổi trạng thái từ `Default` sang `Enabled`.
4. Khởi động lại trình duyệt (Relaunch).

### Bước 2: Clone dự án và khởi chạy
Trình duyệt không cho phép tải module ES6 (`main.js`) trực tiếp qua giao thức `file://` vì lý do bảo mật (CORS). Bạn cần chạy một Local Web Server.

1. Clone repo về máy:
   ```bash
   git clone [https://github.com/mahesvara7061/webgpu_screensaver_cube.git](https://github.com/mahesvara7061/webgpu_screensaver_cube.git)
   cd webgpu_screensaver_cube
   ```

2. Chạy Local Server (Khuyên dùng `npx http-server` hoặc `npx serve`):
   ```bash
   # Chạy server và tắt cache (-c-1) để tránh bị lưu file cũ
   npx http-server -c-1
   ```

3. Mở trình duyệt và truy cập vào đường dẫn được cung cấp (thường là `http://localhost:8080` hoặc `http://127.0.0.1:8080`).

---
*Dự án được tạo ra nhằm mục đích học tập và khám phá sức mạnh của WebGPU.*
