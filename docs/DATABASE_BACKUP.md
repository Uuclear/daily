# 数据库转移和备份教程

本项目使用 SQLite (better-sqlite3) 作为数据库，数据库文件位于 `server/data/construction.db`。

## 1. 手动备份

### 方法一：直接复制文件

SQLite 数据库本质就是一个文件，最简单的备份方式就是直接复制：

```bash
# 创建按日期命名的备份
BACKUP_DATE=$(date +%Y%m%d_%H%M%S)
cp server/data/construction.db "server/data/backups/construction_${BACKUP_DATE}.db"
```

### 方法二：使用 SQLite .backup 命令（推荐）

SQLite 官方推荐的备份方式，在备份过程中可以处理并发写入：

```bash
sqlite3 server/data/construction.db ".backup 'backups/construction_$(date +%Y%m%d_%H%M%S).db'"
```

### 方法三：使用 .dump 生成 SQL 脚本

导出一份完整的 SQL 脚本，可用于恢复或迁移到其他数据库：

```bash
sqlite3 server/data/construction.db ".dump" > backups/construction_$(date +%Y%m%d_%H%M%S).sql
```

恢复：

```bash
sqlite3 new_database.db < backups/construction_YYYYMMDD_HHMMSS.sql
```

## 2. 自动备份

### 使用 cron 定时备份

```bash
# 编辑 crontab
crontab -e

# 添加以下行（每天凌晨 2 点备份）
0 2 * * * cp /opt/daily/server/data/construction.db /opt/daily/server/data/backups/construction_$(date +\%Y\%m\%d).db

# 保留最近 30 天的备份，删除旧的
0 3 * * * find /opt/daily/server/data/backups/ -name "construction_*.db" -mtime +30 -delete
```

### 使用 Node.js 脚本自动备份

创建 `server/scripts/backup.js`：

```javascript
const fs = require('fs');
const path = require('path');

const dbDir = path.join(__dirname, '..', 'data');
const backupDir = path.join(dbDir, 'backups');
const dbFile = path.join(dbDir, 'construction.db');

// 确保备份目录存在
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

const date = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
const backupFile = path.join(backupDir, `construction_${date}.db`);

fs.copyFileSync(dbFile, backupFile);
console.log(`备份完成: ${backupFile}`);

// 清理 30 天前的旧备份
const files = fs.readdirSync(backupDir);
const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
files.forEach(file => {
  const filePath = path.join(backupDir, file);
  const stat = fs.statSync(filePath);
  if (stat.mtimeMs < thirtyDaysAgo) {
    fs.unlinkSync(filePath);
    console.log(`已删除旧备份: ${file}`);
  }
});
```

添加到 crontab：

```bash
0 2 * * * cd /opt/daily/server && node scripts/backup.js >> logs/backup.log 2>&1
```

## 3. 数据库迁移

### 迁移到新服务器

```bash
# 1. 在原服务器上备份
sqlite3 server/data/construction.db ".backup /tmp/construction_backup.db"

# 2. 将备份文件传输到新服务器
scp /tmp/construction_backup.db user@new-server:/opt/daily/server/data/construction.db

# 3. 在新服务器上确保数据目录存在
mkdir -p /opt/daily/server/data

# 4. 重启服务
cd /opt/daily/server && pm2 restart all
```

### 迁移到其他数据库（如 PostgreSQL/MySQL）

如果需要迁移到更大的数据库，步骤如下：

```bash
# 1. 导出 SQL
sqlite3 server/data/construction.db ".dump" > migration.sql

# 2. 修改 SQL 语法（SQLite 与 MySQL/PostgreSQL 语法有差异）
# - 去掉 SQLite 特有的 pragma 语句
# - 修改数据类型（SQLite 的 TEXT -> VARCHAR, INTEGER -> INT 等）
# - 修改日期函数语法

# 3. 导入目标数据库
# MySQL:
mysql -u root -p target_db < migration.sql

# PostgreSQL:
psql -U postgres -d target_db -f migration.sql
```

## 4. 数据库完整性检查

```bash
# 检查数据库完整性
sqlite3 server/data/construction.db "PRAGMA integrity_check;"

# 检查数据库版本
sqlite3 server/data/construction.db "PRAGMA schema_version;"

# 查看所有表
sqlite3 server/data/construction.db ".tables"

# 查看表结构
sqlite3 server/data/construction.db ".schema tasks"
```

## 5. 恢复数据库

```bash
# 从备份文件恢复
cp backups/construction_20260517.db server/data/construction.db

# 或者使用 .restore
sqlite3 server/data/construction.db ".restore 'backups/construction_20260517.db'"

# 恢复后重启服务
cd /opt/daily/server && pm2 restart all
```

## 6. 文件目录结构

```
/opt/daily/server/data/
├── construction.db          # 当前数据库（WAL 模式下还有 construction.db-wal 和 construction.db-shm）
└── backups/                 # 备份目录
    ├── construction_20260517.db
    ├── construction_20260516.db
    └── ...
```

> **注意**: WAL 模式下数据库包含三个文件（`.db`、`.db-wal`、`.db-shm`），备份时应使用 `.backup` 命令而非直接复制，以确保数据一致性。

## 7. 注意事项

1. **WAL 模式**: 本项目使用 WAL (Write-Ahead Logging) 模式，直接复制文件可能导致数据不一致。推荐使用 `sqlite3 .backup` 命令。

2. **服务停止时备份**: 最安全的备份方式是在停止服务后执行：
   ```bash
   pm2 stop server
   cp server/data/construction.db server/data/backups/construction_$(date +%Y%m%d_%H%M%S).db
   pm2 start server
   ```

3. **备份验证**: 定期验证备份文件：
   ```bash
   sqlite3 backups/construction_YYYYMMDD.db "PRAGMA integrity_check;"
   ```

4. **异地备份**: 建议将备份文件同步到云存储（如阿里云 OSS、AWS S3）以防止服务器故障导致数据丢失。
