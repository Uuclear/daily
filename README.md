# 建设工程团队待办与周历管理系统

建设工程项目团队的待办任务与施工周历管理应用。左侧为项目任务池，右侧为可视化施工周历，支持任务状态流转、日程时间冲突检测、天气预警等功能。

![预览](docs/screenshot.png)

## 功能特性

### 任务管理
- **任务池**：创建、筛选、编辑、删除项目任务
- **状态流转**：委托 → 进行中 → 报告出具 → 任务结束
- **进度条**：拖拽调整任务进度，实时更新
- **分类筛选**：按状态快速过滤任务

### 日程管理
- **周历视图**：00:00-24:00 时间轴，可视化展示每日日程
- **双击添加**：在日历任意位置双击，自动填入点击时间
- **冲突检测**：添加/编辑日程时自动检测时间重叠并提示
- **右键编辑**：右键点击事件卡片快速编辑
- **拖拽导航**：悬浮导航栏可自由拖动

### 天气集成
- **7日预报**：基于 Open-Meteo API 的免费天气预报
- **雨天提醒**：雨天自动显示"雨天户外作业提醒"
- **城市支持**：支持国内 20+ 主要城市

### 每日总结
- 底部每日总结区域，支持快速添加/删除工作记录

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 18 + TypeScript + Ant Design 5 + Vite 6 |
| 后端 | Node.js + Express + better-sqlite3 |
| 数据库 | SQLite (文件型数据库) |
| 天气API | Open-Meteo (免费，无需 API Key) |

## 项目结构

```
daily/
├── client/                  # 前端项目
│   ├── src/
│   │   ├── api/             # API 请求封装
│   │   ├── hooks/           # React 自定义 hooks
│   │   ├── pages/Dashboard/ # 主页面（左右分栏布局）
│   │   ├── types/           # TypeScript 类型定义
│   │   ├── App.tsx          # 根组件
│   │   ├── WeekCalendar.tsx # 周历组件（核心）
│   │   ├── EventCard.tsx    # 日程事件卡片
│   │   ├── TaskPool.tsx     # 任务池组件
│   │   ├── TaskCard.tsx     # 任务卡片（含编辑功能）
│   │   ├── StatusFilter.tsx # 状态筛选器
│   │   └── WeatherCard.tsx  # 天气卡片
│   ├── index.html
│   ├── vite.config.ts       # Vite 配置（含 API 代理）
│   └── package.json
├── server/                  # 后端项目
│   ├── src/
│   │   ├── db/
│   │   │   ├── init.ts      # 数据库初始化
│   │   │   ├── schema.sql   # 数据库表结构
│   │   │   └── seed.ts      # 种子数据
│   │   ├── routes/
│   │   │   ├── tasks.ts     # 任务 CRUD
│   │   │   ├── schedule.ts  # 日程 CRUD + 冲突检测
│   │   │   ├── teams.ts     # 团队管理
│   │   │   ├── persons.ts   # 人员管理
│   │   │   └── weather.ts   # 天气代理（Open-Meteo）
│   │   ├── app.ts           # Express 应用
│   │   └── server.ts        # 启动入口
│   └── package.json
└── README.md
```

## 快速开始

### 环境要求
- Node.js >= 18
- npm >= 9

### 本地开发

```bash
# 1. 安装后端依赖
cd server && npm install

# 2. 安装前端依赖
cd ../client && npm install

# 3. 初始化数据库并填充种子数据
cd ../server && npm run seed

# 4. 启动后端服务（端口 3001）
npm run dev

# 5. 另开终端，启动前端（端口 5173）
cd ../client && npm run dev
```

前端访问 http://localhost:5173
后端 API http://localhost:3001

### 构建生产版本

```bash
# 构建前端
cd client && npm run build

# 构建后端
cd ../server && npm run build

# 启动生产模式后端
cd ../server && npm start
```

## 数据库表结构

### tasks（任务表）
| 字段 | 类型 | 说明 |
|------|------|------|
| id | TEXT PK | 任务 ID |
| project_name | TEXT | 项目名称 |
| location | TEXT | 施工地点 |
| assigned_team | TEXT | 负责人 |
| status | TEXT | entrusted/in_progress/reporting/completed |
| progress | INTEGER | 进度 0-100 |
| planned_start_date | TEXT | 计划开始日期 |
| deadline | TEXT | 截止日期 |

### schedule_events（日程表）
| 字段 | 类型 | 说明 |
|------|------|------|
| id | TEXT PK | 事件 ID |
| task_id | TEXT FK → tasks(id) | 关联任务 |
| date | TEXT | 日期 (YYYY-MM-DD) |
| start_time | TEXT | 开始时间 (HH:MM) |
| end_time | TEXT | 结束时间 (HH:MM) |
| title | TEXT | 事件标题 |
| work_content | TEXT | 工作内容 |
| is_milestone | INTEGER | 是否关键节点 |

### persons / daily_summaries / teams
详见 `server/src/db/schema.sql`

## API 接口

### 任务
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/tasks` | 获取所有任务（可选 `?status=`） |
| POST | `/api/tasks` | 创建任务 |
| PUT | `/api/tasks/:id` | 更新任务 |
| PUT | `/api/tasks/:id/status` | 更新任务状态 |
| DELETE | `/api/tasks/:id` | 删除任务（级联删除日程） |

### 日程
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/schedule?date=YYYY-MM-DD` | 获取一周日程 |
| POST | `/api/schedule` | 创建日程（自动检测时间冲突） |
| PUT | `/api/schedule/:id` | 更新日程 |
| DELETE | `/api/schedule/:id` | 删除日程 |
| POST | `/api/schedule/check-conflict` | 预检时间冲突 |
| POST | `/api/schedule/summary` | 保存每日总结 |

### 其他
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/weather?city=上海&days=7` | 获取天气预报 |
| GET | `/api/persons` | 获取人员列表 |
| POST | `/api/persons` | 添加人员 |

## 部署指南

详见 [DEPLOY.md](docs/DEPLOY.md)

## 开发规范

- 前端代码使用 TypeScript，严格类型检查
- API 请求统一通过 `client/src/api/client.ts` 封装
- 状态管理使用 React hooks（`useSchedule`, `useTasks`）
- 数据库操作统一使用 better-sqlite3 prepared statements
- 删除任务时先删 `schedule_events` 再删 `tasks`（避免 FK 约束错误）

## License

MIT
