# Triển khai production

Không cần Docker: build ra JavaScript trong `dist/` rồi chạy bằng Node, quản lý process bằng PM2 hoặc systemd, đặt sau reverse proxy (Nginx/Caddy) để có HTTPS.

## Checklist

- [ ] `NODE_ENV=production`
- [ ] Thời hạn phiên phù hợp: `ACCESS_TOKEN_TTL_MINUTES` (15), `REFRESH_TOKEN_TTL_DAYS` (7), `SESSION_MAX_DAYS` (30). Đổi `JWT_SECRET` = đăng xuất mọi người.
- [ ] `JWT_SECRET` mới (`openssl rand -hex 32`). App **từ chối khởi động** nếu vẫn dùng giá trị mẫu. Frontend admin phải có `AUTH_SECRET` cùng giá trị.
- [ ] `DATABASE_URL` trỏ tới Postgres production (thêm `?sslmode=require` nếu là DB managed)
- [ ] `WEB_ORIGINS` = domain thật của frontend (`https://dashboard.example.com,https://admin.example.com`)
- [ ] HTTPS ở reverse proxy. Cookie tự có `Secure` khi production.
- [ ] `TRUST_PROXY` đúng hạ tầng (`loopback` nếu proxy cùng máy, `1` nếu có 1 proxy phía trước) để rate-limit đọc đúng IP client. Server **frontend admin** gọi API thay người dùng và gửi IP của họ trong `X-Forwarded-For`, nên địa chỉ của nó cũng phải nằm trong `TRUST_PROXY` (ví dụ `loopback, 10.0.0.12`). Nếu không, mọi người dùng admin bị tính chung 1 IP khi khoá login
- [ ] Mật khẩu thật cho `ADMIN_PASSWORD` / `VIEWER_PASSWORD`, rồi `pnpm db:seed -- --users-only`
- [ ] Swagger mặc định **tắt** ở production. Chỉ bật (`SWAGGER_ENABLED=true`) nếu đã chặn ở proxy.
- [ ] Log dạng JSON (mặc định ở production) được đưa vào hệ thống log
- [ ] Health check trỏ tới `/api/health/ready`

## Build & chạy

```bash
git pull
corepack enable
pnpm install --frozen-lockfile
pnpm build
node dist/database/scripts/migrate.js       # áp migration mới (an toàn khi chạy lại)
pnpm start                                  # node --enable-source-maps dist/main.js
```

Lần đầu triển khai, sau migrate thì tạo tài khoản:

```bash
ADMIN_PASSWORD='…' VIEWER_PASSWORD='…' node dist/database/scripts/seed.js --users-only
```

### PM2

```bash
pnpm add -g pm2
pm2 start dist/main.js --name revenue-api --node-args="--enable-source-maps" --time
pm2 save && pm2 startup            # tự khởi động cùng máy
pm2 reload revenue-api             # deploy bản mới, không downtime
```

### systemd

`/etc/systemd/system/revenue-api.service`:

```ini
[Unit]
Description=Revenue Dashboard API
After=network.target postgresql.service

[Service]
Type=simple
User=revenue
WorkingDirectory=/srv/revenue/backend
EnvironmentFile=/srv/revenue/backend/.env
ExecStart=/usr/bin/node --enable-source-maps dist/main.js
Restart=on-failure
RestartSec=3
# Nest bắt SIGTERM, đóng kết nối DB rồi mới thoát
KillSignal=SIGTERM
TimeoutStopSec=20

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now revenue-api
journalctl -u revenue-api -f
```

### Nginx (reverse proxy)

```nginx
server {
  server_name api.example.com;
  location / {
    proxy_pass http://127.0.0.1:4000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Request-Id $request_id;
  }
  # listen 443 ssl; … (certbot)
}
```

## Vận hành

| Mục               | Chi tiết                                                                                                                                                                                                                                                                                               |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Health            | `/api/health/live` (process sống) · `/api/health/ready` (kết nối được DB, `503` nếu không)                                                                                                                                                                                                             |
| Log               | JSON mỗi dòng: `level`, `timestamp`, `context`, `message`. Mỗi request 1 dòng `HTTP` gồm `requestId`, `method`, `path`, `status`, `durationMs`. Lỗi 5xx kèm stack                                                                                                                                      |
| Truy vết          | Client nhận `X-Request-Id`, body lỗi cũng có `requestId`. Tìm trong log theo id đó                                                                                                                                                                                                                     |
| Tắt máy           | SIGTERM → Nest đóng HTTP server và pool DB (`enableShutdownHooks`)                                                                                                                                                                                                                                     |
| Lỗi ngoài dự kiến | `unhandledRejection` / `uncaughtException` được log ở mức `fatal` rồi thoát, để PM2/systemd khởi động lại                                                                                                                                                                                              |
| Phiên đăng nhập   | Bảng `auth_sessions`. Thu hồi mọi phiên của một user: `UPDATE auth_sessions SET revoked_at = now(), revoked_reason = 'logout' WHERE user_id = '…' AND revoked_at IS NULL;` Log `WARN Refresh token reuse detected` = nghi bị lộ token, phiên đã tự thu hồi. Phiên chết được dọn khi user đăng nhập lại |
| Mức log           | `LOG_LEVEL` (`log` mặc định; `debug` khi điều tra)                                                                                                                                                                                                                                                     |

## Giới hạn hiện tại

- Bộ đếm khoá login và rate-limit nằm **trong RAM**, nên chỉ đúng khi chạy **1 instance**. Muốn chạy nhiều instance thì chuyển sang Redis (`LoginAttemptsService` và storage của `ThrottlerModule`). Phiên đăng nhập và refresh token nằm trong PostgreSQL nên **chạy nhiều instance được**.
