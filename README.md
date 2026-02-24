# 💪 GymBuddy — 個人健身訓練追蹤器

> 動作庫 × 訓練計劃 × 主動訓練 × 漸進超負荷建議，一站式健身管理工具。

![Dashboard](photo/image.png)

---

## 目錄

- [功能概覽](#功能概覽)
- [畫面截圖](#畫面截圖)
- [使用流程](#使用流程)
- [漸進超負荷演算法](#漸進超負荷演算法)
- [技術架構](#技術架構)
- [資料庫結構](#資料庫結構)
- [本地開發](#本地開發)
- [Docker 部署](#docker-部署)
- [目錄結構](#目錄結構)

---

## 功能概覽

| 模組 | 功能 |
|------|------|
| 🏠 **首頁儀表板** | 本週訓練次數、個人最佳紀錄 (PR)、快速開始 |
| 📚 **動作庫** | 79+ 個動作，GIF 示範、步驟說明、按肌群/器材/難度篩選 |
| 📋 **訓練計劃** | 自訂多日分化計劃（PPL 等），每日動作/組數/次數/重量設定 |
| ▶️ **主動訓練** | 組間休息倒數計時、±2.5kg 快速調重、器材被佔用時切換替代動作 |
| 📊 **訓練記錄** | 歷史紀錄查閱、訓練量趨勢圖表、單組編輯/刪除 |
| 🎯 **漸進超負荷** | 根據歷史數據自動推薦下次目標重量 |

---

## 畫面截圖

### 首頁 — 儀表板
訓練概況、本週統計、個人計劃列表，以及各動作個人最佳紀錄 (1RM 估算)。

![首頁儀表板](photo/image.png)

---

### 動作庫
79+ 個動作，支援關鍵字搜尋、難度篩選、肌群篩選，有 GIF 的動作會顯示 `GIF` 標籤。

![動作庫](photo/image1.png)

---

### 訓練計劃列表
顯示所有訓練計劃，包含訓練日天數與各日動作摘要，可快速瀏覽全局安排。

![訓練計劃](photo/image2.png)

---

### 計劃詳情
點開計劃可看到各訓練日的完整動作清單，含預設組數、次數範圍、建議重量，並可直接「開始訓練」。

![計劃詳情](photo/image3.png)

---

### 主動訓練介面
訓練核心頁面：動作圖示（GIF/靜態圖）＋步驟說明、±2.5 / ±5 kg 快速調重、次數調整、完成組數按鈕。

![主動訓練](photo/image4.png)

---

### 組間休息計時器
完成一組後自動進入休息倒數，SVG 圓圈動畫顯示剩餘時間，支援「跳過休息」，行動裝置完成時震動提醒。

![休息計時](photo/image5.png)

---

### 訓練記錄
查看完整與未完成的歷史訓練，訓練量趨勢折線圖（7天/30天/90天），可展開查看每組詳情並進行編輯或刪除。

![訓練記錄](photo/image6.png)

---

## 使用流程

```mermaid
flowchart TD
    A([登入 / 註冊]) --> B[首頁儀表板]
    B --> C{選擇操作}

    C --> D[動作庫]
    D --> D1[搜尋/篩選動作]
    D1 --> D2[查看 GIF + 步驟說明]
    D2 --> D3[查看替代動作]

    C --> E[訓練計劃]
    E --> E1[新增計劃]
    E1 --> E2[建立訓練日]
    E2 --> E3[加入動作 & 設定組數/重量]

    C --> F[開始訓練]
    E --> F
    F --> G[選擇計劃與訓練日]
    G --> H[主動訓練介面]

    H --> I{完成一組}
    I --> J[記錄重量 & 次數]
    J --> K[休息計時器倒數]
    K --> L{計時結束}
    L -->|繼續下一組| H
    L -->|器材被佔用| M[切換替代動作]
    M --> H

    H --> N{所有動作完成}
    N --> O[訓練完成總結]
    O --> P[漸進超負荷建議]
    P --> B

    C --> Q[訓練記錄]
    Q --> R[查看歷史 & 圖表]
    R --> S[編輯/刪除單組紀錄]
```

---

## 漸進超負荷演算法

每次訓練完成後，系統會根據歷史數據自動計算下次建議：

```mermaid
flowchart TD
    A[訓練完成] --> B{全部組數完成？}

    B -->|否| C[建議減重 ~7.5%\n先鞏固動作技術]

    B -->|是| D{達到次數上限？}

    D -->|否| E[維持重量\n繼續努力突破]

    D -->|是| F[建議增加重量\n+2.5 kg 或 +1.25 kg]

    F --> G{檢測近3次歷史}
    G -->|發現遞減傾向| H[建議改用\nReverse Pyramid 訓練法]
    G -->|穩定進步| I[直線漸進]
```

**1RM 估算公式（Epley）：**

```
1RM = 重量 × (1 + 次數 / 30)
```

---

## 技術架構

```mermaid
graph TB
    subgraph Client["瀏覽器 / 行動裝置"]
        UI[Next.js App Router\nReact 18 + TypeScript]
        SW[Service Worker\n背景休息提醒通知]
    end

    subgraph Server["Docker 容器 — workout-app"]
        SA[Server Actions\n登入 / 登出 / 註冊]
        API[REST API Routes\n/api/exercises, /api/plans\n/api/sessions, /api/history]
        AUTH[HMAC Cookie Session\nsignSession / verifySession]
        PO[漸進超負荷引擎\nprogressive-overload.ts]
    end

    subgraph DB["Docker 容器 — workout-db"]
        PG[(PostgreSQL 16)]
        PRISMA[Prisma ORM]
    end

    subgraph Infra["基礎設施"]
        CF[Cloudflare Tunnel\ngym.example.com]
    end

    UI -->|HTTP| SA
    UI -->|fetch| API
    SA --> AUTH
    API --> AUTH
    API --> PRISMA
    SA --> PRISMA
    PRISMA --> PG
    API --> PO
    CF -->|反向代理| UI
    SW -.->|Notification API| UI
```

### 技術選型

| 層級 | 技術 |
|------|------|
| 前端框架 | Next.js 14 (App Router, Server Components) |
| 語言 | TypeScript |
| 樣式 | Tailwind CSS + shadcn/ui |
| 圖表 | Recharts |
| ORM | Prisma |
| 資料庫 | PostgreSQL 16 |
| 認證 | HMAC 簽名 Cookie Session + argon2id 密碼雜湊 |
| 部署 | Docker Compose |
| 外網穿透 | Cloudflare Tunnel |
| 背景通知 | Web Audio API + Service Worker |

---

## 資料庫結構

```mermaid
erDiagram
    users ||--o{ workout_plans : "擁有"
    users ||--o{ workout_sessions : "進行"
    users ||--o{ personal_records : "創下"

    workout_plans ||--o{ workout_plan_days : "包含"
    workout_plan_days ||--o{ workout_plan_exercises : "列出"

    exercises ||--o{ workout_plan_exercises : "被安排"
    exercises ||--o{ session_exercises : "被執行"
    exercises }o--o{ equipment : "需要器材"
    exercises }o--o{ muscle_groups : "訓練肌群"
    exercises }o--o{ exercises : "替代動作"

    workout_sessions ||--o{ session_exercises : "包含"
    session_exercises ||--o{ session_sets : "記錄組數"

    users {
        string id PK
        string name
        string email
        string passwordHash
        datetime createdAt
    }
    exercises {
        string id PK
        string name
        string exerciseType
        string difficulty
        string gifUrl
        string videoUrl
        json stepInstructions
    }
    workout_sessions {
        string id PK
        string userId FK
        string planId FK
        string dayId FK
        datetime startedAt
        datetime completedAt
    }
    session_sets {
        string id PK
        string sessionExerciseId FK
        int setNumber
        int repsPerformed
        decimal weightKg
        int restAfterSeconds
        datetime completedAt
    }
    personal_records {
        string id PK
        string userId FK
        string exerciseId FK
        decimal weightKg
        int reps
        decimal estimatedOneRepMax
        datetime achievedAt
    }
```

---

## 本地開發

### 前置需求
- Node.js 20+
- PostgreSQL（或使用 Docker）

### 安裝

```bash
git clone https://github.com/hyaochen/GymBuddy.git
cd GymBuddy
npm install
```

### 設定環境變數

```bash
cp .env.example .env
# 編輯 .env，填入資料庫連線與 SESSION_SECRET
```

`.env` 範例：
```env
DATABASE_URL="postgresql://workout:password@localhost:5435/workout"
SESSION_SECRET="your-64-char-random-string"
COOKIE_SECURE="false"
```

### 初始化資料庫

```bash
npx prisma migrate deploy
npx prisma db seed
```

### 啟動開發伺服器

```bash
npm run dev
# http://localhost:3000
```

### 建立測試帳號（選用）

```bash
npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/create-test-account.ts
# 帳號：test  密碼：test
```

---

## Docker 部署

### 快速啟動

```bash
# 啟動資料庫 + App
docker compose up -d

# 查看 log
docker compose logs -f workout-app

# 停止
docker compose down
```

App 預設監聽 `http://localhost:3005`

### 使用管理腳本（Windows）

```bat
gym.bat
```

| 選項 | 功能 |
|------|------|
| `[1]` | 啟動全部服務（DB + App） |
| `[2]` | 停止全部服務 |
| `[3]` | 重新 Build 並啟動 |
| `[4]` | 查看 App 即時 Log |
| `[5]` | 進入資料庫 Shell |
| `[6]` | 備份資料庫 |

### Cloudflare Tunnel（外網存取）

```bash
docker compose -f docker-compose.tunnel.yml up -d
```

設定 `~/.cloudflared/gym-docker-config.yml`：
```yaml
tunnel: <your-tunnel-id>
ingress:
  - hostname: gym.yourdomain.com
    service: http://workout-app:3000
  - service: http_status:404
```

---

## 目錄結構

```
GymBuddy/
├── docker-compose.yml
├── docker-compose.tunnel.yml
├── Dockerfile
├── gym.bat                        # Windows 管理腳本
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts                    # 器材 + 肌群 + 動作 seed
│   ├── add-stretch-and-beginner.ts
│   └── create-test-account.ts
└── src/
    ├── middleware.ts              # 路由保護
    ├── app/
    │   ├── (auth)/                # 登入 / 註冊
    │   ├── (app)/
    │   │   ├── page.tsx           # 首頁儀表板
    │   │   ├── exercises/         # 動作庫
    │   │   ├── plans/             # 訓練計劃
    │   │   ├── session/[id]/      # 主動訓練
    │   │   └── history/           # 訓練記錄
    │   └── api/                   # REST API
    ├── components/
    │   ├── workout/               # RestTimer、ActiveSet 等
    │   ├── charts/                # Recharts 圖表
    │   └── layout/                # BottomNav、PageHeader
    └── lib/
        ├── session.ts             # HMAC Cookie
        ├── auth.ts                # requireAuth()
        └── progressive-overload.ts
```

---

## 預設訓練計劃

| 計劃名稱 | 天數 | 說明 |
|----------|------|------|
| 5日PPL進階計劃 | 5天 | 推/拉/腿高頻分化，每週每肌群訓練2次 |
| 5天分化訓練 | 5天 | 腿、上肢複合、有氧恢復、背、肩分化 |
| 3日PPL新手計劃 | 3天 | 適合新手，中等重量複合動作為主 |
| 5日PPL放鬆計劃 | 3天 | 配合進階計劃使用的靜態伸展放鬆 |

---

## License

MIT
