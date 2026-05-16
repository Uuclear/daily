# 部署指南

## 方式一：VPS / 云服务器部署（推荐）

### 1. 环境准备

```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs build-essential

# 验证
node -v   # >= 18
npm -v    # >= 9
```

### 2. 安装依赖

```bash
cd /opt/daily

# 安装后端依赖
cd server && npm install

# 安装前端依赖
cd ../client && npm install

# 初始化数据库
cd ../server && npm run seed
```

### 3. 构建前端

```bash
cd client && npm run build
```

构建产物在 `client/dist/` 目录。

### 4. 使用 Nginx 反向代理

```bash
sudo apt-get install nginx
```

创建 Nginx 配置文件 `/etc/nginx/sites-available/daily`：

```nginx
server {
    listen 80;
    server_name your-domain.com;  # 替换为你的域名或 IP

    # 前端静态文件
    location / {
        root /opt/daily/client/dist;
        try_files $uri $uri/ /index.html;
    }

    # 后端 API 代理
    location /api/ {
        proxy_pass http://localhost:3001/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/daily /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 5. 使用 PM2 管理后端进程

```bash
sudo npm install -g pm2

cd /opt/daily/server

# 创建 PM2 配置
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'daily-api',
    script: 'dist/server.js',
    instances: 1,
    autorestart: true,
    max_memory_restart: '256M',
    env: {
      PORT: 3001,
      NODE_ENV: 'production'
    }
  }]
}
EOF

# 构建后端
npm run build

# 启动
pm2 start ecosystem.config.js

# 设置开机自启
pm2 startup
pm2 save
```

### 6. (可选) HTTPS

```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

---

## 方式二：Docker 部署

### Dockerfile

创建 `/opt/daily/Dockerfile`：

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app/client
COPY client/package.json client/package-lock.json ./
RUN npm install
COPY client/ ./
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY server/package.json server/package-lock.json ./
RUN npm install --production
COPY server/ ./
COPY --from=builder /app/client/dist /app/dist
RUN npm run build

EXPOSE 3001
CMD ["node", "dist/server.js"]
```

### docker-compose.yml

```yaml
version: '3.8'
services:
  daily:
    build: .
    ports:
      - "3001:3001"
    volumes:
      - ./server/data:/app/data
    environment:
      - NODE_ENV=production
    restart: unless-stopped
```

构建和启动：

```bash
docker compose up -d
```

---

## 方式三：开发环境（最简单）

适合本地开发或内网使用：

```bash
# 终端 1 - 后端
cd server && npm run dev

# 终端 2 - 前端
cd client && npm run dev
```

访问 http://localhost:5173

---

## 数据备份

SQLite 数据库文件位于 `server/data/construction.db`，备份只需复制该文件：

```bash
cp server/data/construction.db server/data/construction.db.bak
```

恢复时替换即可。

---

## 常见故障排查

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| 前端白屏 | 后端未启动 | 检查 `pm2 list` 或 `npm run dev` |
| 任务删除失败 | FK 约束错误 | 确认代码已修复删除顺序 |
| 天气不显示 | API 请求失败 | 检查网络连接，Open-Meteo 需外网 |
| 端口冲突 | 3001/5173 被占用 | 修改 `server/src/server.ts` 的 PORT 或 `client/vite.config.ts` |
