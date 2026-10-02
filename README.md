# 📸 LoopCam

Ứng dụng web chia sẻ khoảnh khắc chụp ảnh nhanh cho bạn bè thân thiết, lấy cảm hứng từ phong cách Locket Widget & BeReal.

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Backend-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com/)

---

## ✨ Tính năng chính

- 📷 **Camera**: Đổi camera trước/sau, flash, âm thanh chụp, nén ảnh tự động trước khi tải lên.
- 🏷️ **Caption Widgets**: Đính kèm chữ, đánh giá sao ⭐, mốc thời gian thực chuẩn phong cách Locket.
- 📰 **Feed & Phản hồi**: Lướt xem ảnh bạn bè, lọc theo từng người, thả cảm xúc và **Photo Reply** (đáp lại bằng ảnh).
- 💬 **Tin nhắn Realtime**: Trò chuyện 1-1 tức thì qua Supabase Realtime, đồng bộ bình luận ảnh vào đoạn chat.
- 📅 **Kỷ niệm (Memories)**: Xem lại kho ảnh đã chụp theo ngày/tháng dạng lưới.
- 👥 **Bạn bè**: Tìm kiếm username, gửi/nhận lời mời kết bạn.

---

## 🛠 Công nghệ sử dụng

- **Frontend**: React 19, Vite, Tailwind CSS v4, Lucide React, React Router v7.
- **Backend & Lưu trữ**: Supabase (Auth, PostgreSQL, Storage, Realtime).
- **Tiện ích**: `browser-image-compression`, `@vitejs/plugin-basic-ssl` (hỗ trợ test camera trên điện thoại qua HTTPS).

---

## 🚀 Khởi chạy nhanh

### 1. Cài đặt

```bash
git clone https://github.com/your-username/LoopCam.git
cd LoopCam
npm install
```

### 2. Cấu hình Supabase

Tạo file `.env` từ `.env.example`:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

> **Yêu cầu Supabase**: Cần tạo bucket Storage `photos` (public/authenticated) và các bảng `profiles`, `posts`, `post_recipients`, `friendships`, `messages`.

### 3. Chạy dev server

```bash
npm run dev
```

> 📱 **Test trên điện thoại**: Truy cập link `https://<IP-máy-tính>:5173` trên cùng mạng Wi-Fi để dùng camera trực tiếp qua HTTPS.

---

## 📦 Scripts

- `npm run dev` — Khởi chạy dev server (HTTPS)
- `npm run build` — Đóng gói ứng dụng cho production
- `npm run preview` — Xem trước bản build
- `npm run lint` — Kiểm tra code bằng oxlint

---

## 📄 License

MIT
