# Exercise Knowledge-Base Backfill (T-PB-002, 2026-05-11)

修補 257 動作的標籤 / 替代方案知識庫缺漏。

## 一鍵重跑

```bash
# 1. 重新從 DB 撈最新狀態
docker exec -i workout-db psql -U workout -d workout -t -A < scripts/dump-exercises.sql > prisma/audit/exercises-full.json

# 2. 重跑 rule-based inference
node prisma/audit/generate-backfill.mjs

# 3. （選用）DRY_RUN 預覽
DRY_RUN=1 docker exec -i workout-app npx tsx /app/prisma/apply-backfill.ts

# 4. 實際 apply（idempotent — 已存在跳過）
docker exec workout-app npx tsx /app/prisma/apply-backfill.ts
```

## 檔案說明

| 檔案 | 用途 |
|------|------|
| `generate-backfill.mjs` | Rule-based keyword matching：name + description + steps 推 muscle group，equipment 推 fallback equipment，cohort-based 推替代方案 |
| `codex-backfill.json` | 產生的 backfill payload（schema 見 apply-backfill.ts）|
| `exercises-full.json` | DB dump 快照（gitignored，可重生）|
| `exercises-current-state.json` | DB dump 快照（gitignored）|
| `muscle-groups.json` | 19 個合法 muscle group vocabulary |
| `equipment.json` | 27 個合法 equipment vocabulary |

## 為什麼這樣做

- `codex GPT-5.4 xhigh` 跑了 35 分鐘卡死沒交出 backfill JSON → 改 rule-based keyword matching
- name / description / steps 已含足夠語意資訊（如「45 度腿推舉」、「貓牛式」、「俄羅斯轉體」）
- Score-based：name match = 5 分，description = 2 分，steps = 1 分，equipment hint = 3 分；primary = top score ±1，secondary = 次 3 個
- 替代方案：共享 primary muscle 的同 exercise_type cohort → 取分數最高 2 個（typeMatch×4 + timeMatch×2 + eqMatch×1）

## 範圍限制

- 不動 `prisma/seed.ts`（已有 idempotent guard）/ book json source / DB schema
- 只**新增** muscle / equipment / alternative 連結，**不刪除**既有資料
- 若新動作匯入 DB（新跑 import-book-exercises.ts 等），需重跑這流程
