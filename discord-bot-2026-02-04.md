# Discord Bot - 功能重構計畫 (2026-02-04)

## 📋 調整後的優先順序

**Phase 1: 核心通知功能** → **Phase 2: 管理功能** → **Phase 3: 互動功能** → **Phase 4: 通知系統統一化重構**


***

## Phase 1: 核心通知功能

### P1-1: 直播通知（Twitch + YouTube）

**目標：** 監控 Twitch/YouTube 直播並在開台時發送通知。

**新增檔案：**

```
Features:
├── src/features/stream-notify/
│   ├── stream-notify.feature.ts
│   ├── stream-notify.module.ts
│   ├── stream-notify.service.ts
│   ├── stream-notify.types.ts
│   ├── stream-notify.select.ts
│   └── platforms/
│       ├── platform.interface.ts
│       ├── twitch.service.ts
│       └── youtube.service.ts

Commands:
├── src/commands/stream-notify/
│   ├── stream-notify.command.ts
│   ├── stream-notify.types.ts
│   ├── stream-notify.helpers.ts
│   ├── internal/
│   └── subcommands/
│       ├── enable.ts
│       ├── disable.ts
│       ├── watch.ts
│       ├── unwatch.ts
│       └── list.ts

Core:
├── src/core/scheduler/
│   ├── scheduler.service.ts
│   └── scheduler.types.ts

修改：
├── prisma/schema.prisma
├── src/core/bootstrap/app.bootstrap.ts
├── src/platforms/discordeno/commands.json
```

**資料庫 Schema：**

```prisma
model StreamNotifyConfig {
  guildId   String   @id
  channelId String
  enabled   Boolean  @default(true)
  message   String   @default("🔴 {user} 開始直播了！\n{title}\n{url}")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  guild     Guild    @relation(fields: [guildId], references: [id], onDelete: Cascade)

  @@index([guildId])
}

model StreamWatcher {
  id          String           @id @default(cuid())
  guildId     String
  platformId  String
  platform    StreamPlatform
  displayName String
  isLive      Boolean          @default(false)
  lastChecked DateTime         @default(now())
  createdAt   DateTime         @default(now())

  guild       Guild            @relation(fields: [guildId], references: [id], onDelete: Cascade)

  @@unique([guildId, platform, platformId])
  @@index([guildId])
  @@index([isLive])
}

enum StreamPlatform {
  TWITCH
  YOUTUBE
}
```

**指令：**

```
/stream-notify enable channel:<頻道> [message:<範本>]
/stream-notify disable
/stream-notify watch platform:<twitch|youtube> id:<頻道ID> [name:<顯示名稱>]
/stream-notify unwatch platform:<twitch|youtube> id:<頻道ID>
/stream-notify list
```

**範本變數：**

* `{user}` - 實況主顯示名稱
* `{title}` - 直播標題
* `{url}` - 直播網址
* `{game}` - 遊戲/類別名稱
* `{viewers}` - 當前觀眾數

**實作重點：**


1. **Twitch API：**
   * 使用 Helix API：`GET /streams?user_id=...`
   * 每 1 分鐘輪詢一次（800 req/min 限制）
   * 批次檢查最多 100 個頻道
   * 需要 app access token
2. **YouTube API：**
   * 使用 Data API v3：`search.list` 搭配 `eventType=live`
   * 每 3 分鐘輪詢一次（10k quota/day 限制）
   * 批次檢查最多 50 個頻道
   * 需要 API key
3. **排程器：**
   * 使用 `node-cron` 進行排程
   * Twitch：`*/1 * * * *`（每 1 分鐘）
   * YouTube：`*/3 * * * *`（每 3 分鐘）
   * 優雅關閉清理
4. **狀態追蹤：**
   * 偵測 `isLive: false → true` 時發送通知
   * 每次輪詢更新 `isLive` 和 `lastChecked`
   * `true → false` 轉換不發通知
5. **錯誤處理：**
   * API 錯誤：記錄並繼續（不中斷排程器）
   * 速率限制：指數退避
   * 無效頻道：標記並通知管理員

**驗證步驟：**

- [ ] Twitch 直播正確偵測
- [ ] YouTube 直播正確偵測
- [ ] 無重複通知
- [ ] 排程器穩定運行
- [ ] API 速率限制遵守
- [ ] 24 小時穩定性測試通過


***

### P1-2: 生日通知

**目標：** 追蹤成員生日並自動發送祝福。

**新增檔案：**

```
Features:
├── src/features/birthday-notify/
│   ├── birthday-notify.feature.ts
│   ├── birthday-notify.module.ts
│   ├── birthday-notify.service.ts
│   ├── birthday-notify.scheduler.ts
│   ├── birthday-notify.types.ts
│   └── birthday-notify.select.ts

Commands:
├── src/commands/birthday-notify/
│   ├── birthday-notify.command.ts
│   ├── birthday-notify.types.ts
│   ├── birthday-notify.helpers.ts
│   ├── internal/
│   └── subcommands/
│       ├── enable.ts
│       ├── disable.ts
│       ├── set.ts
│       ├── remove.ts
│       └── list.ts

修改：
├── prisma/schema.prisma
├── src/core/bootstrap/app.bootstrap.ts
├── src/platforms/discordeno/commands.json
```

**資料庫 Schema：**

```prisma
model BirthdayConfig {
  guildId   String   @id
  channelId String
  enabled   Boolean  @default(true)
  message   String   @default("🎂 {user} 生日快樂！🎉")
  time      String   @default("09:00")
  roleId    String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  guild     Guild    @relation(fields: [guildId], references: [id], onDelete: Cascade)

  @@index([guildId])
}

model Birthday {
  guildId   String
  userId    String
  month     Int
  day       Int
  year      Int?
  createdAt DateTime @default(now())

  guild     Guild    @relation(fields: [guildId], references: [id], onDelete: Cascade)

  @@id([guildId, userId])
  @@index([guildId])
  @@index([month, day])
}
```

**指令：**

```
/birthday-notify enable channel:<頻道> [time:<HH:MM>] [role:<身分組>] [message:<範本>]
/birthday-notify disable
/birthday-notify set user:<用戶> month:<1-12> day:<1-31> [year:<YYYY>]
/birthday-notify remove [user:<用戶>]
/birthday-notify list
```

**範本變數：**

* `{user}` - 用戶提及
* `{username}` - 用戶名稱（無提及）
* `{age}` - 年齡（若提供年份）

**實作重點：**


1. **排程器：**
   * 每日 UTC 00:05 檢查：`5 0 * * *`
   * 依伺服器時區轉換 `time` 設定（未來增強）
   * 查詢當日月份/日期的生日
2. **生日身分組：**
   * 若設定 `roleId`，在祝福時賦予身分組
   * 24 小時後移除（另一個 cron：`10 0 * * *`）
   * 在記憶體或臨時表追蹤身分組授予
3. **閏年處理：**
   * 2/29 生日在平年使用 2/28
   * 查詢：`(month = 2 AND day = 28) OR (month = 2 AND day = 29 AND isLeapYear)`
4. **隱私保護：**
   * 預設僅儲存月份/日期
   * 年份為選填（用於計算年齡）
   * 用戶可刪除自己的生日

**驗證步驟：**

- [ ] 生日設定正常
- [ ] 排程器定時執行
- [ ] 訊息準時發送
- [ ] 身分組授予與移除正常
- [ ] 閏年生日處理正確
- [ ] 隱私選項遵守


***

### P1-3: 訊息刪除通知

**目標：** 記錄已刪除的訊息到指定頻道。

**新增檔案：**

```
Features:
├── src/features/message-delete-notify/
│   ├── message-delete-notify.feature.ts
│   ├── message-delete-notify.module.ts
│   ├── message-delete-notify.service.ts
│   ├── message-delete-notify.types.ts
│   └── message-delete-notify.select.ts

Commands:
├── src/commands/message-delete-notify/
│   ├── message-delete-notify.command.ts
│   ├── message-delete-notify.types.ts
│   ├── message-delete-notify.helpers.ts
│   ├── internal/
│   └── subcommands/
│       ├── enable.ts
│       ├── disable.ts
│       └── list.ts

修改：
├── prisma/schema.prisma
├── src/core/bootstrap/app.bootstrap.ts
├── src/core/rx/bus.ts
├── src/platforms/discordeno/bot.events.ts
├── src/platforms/discordeno/commands.json
```

**資料庫 Schema：**

```prisma
model MessageDeleteConfig {
  guildId   String   @id
  channelId String
  enabled   Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  guild     Guild    @relation(fields: [guildId], references: [id], onDelete: Cascade)

  @@index([guildId])
}
```

**指令：**

```
/message-delete-notify enable channel:<頻道>
/message-delete-notify disable
/message-delete-notify list
```

**記錄格式（Embed）：**

```
🗑️ 訊息已刪除

作者：@username (ID: 123456789)
頻道：#general
時間：2026-02-04 14:30:25 UTC

內容：
[原始訊息內容 或 "內容未快取"]

附件：2 個檔案
```

**實作重點：**


1. **事件訂閱：**

```typescript
// In bus.ts, add:
export const messageDelete$ = new Subject<MessageDeletePayload>();

// In bot.events.ts, add:
events.messageDelete = (bot, payload) => {
  messageDelete$.next({
    id: payload.id,
    channelId: payload.channelId,
    guildId: payload.guildId,
  });
};
```


2. **訊息快取：**
   * Discordeno 預設不快取訊息
   * 若訊息不在快取中，顯示「內容未快取」
   * 考慮實作短期訊息快取（1-24小時）
3. **過濾：**
   * 排除機器人自己刪除的訊息
   * 排除系統訊息
   * 排除記錄頻道本身的訊息
4. **速率限制：**
   * 若大量刪除，實作冷卻時間（反垃圾）
   * 每個頻道每 10 秒最多 5 條記錄

**驗證步驟：**

- [ ] 訊息刪除時正確記錄
- [ ] 快取的內容正確顯示
- [ ] 未快取的訊息顯示備用文字
- [ ] 機器人訊息過濾正常
- [ ] 無遞迴記錄
- [ ] 速率限制運作


***

### P1-4: 增強 Status 指令

**目標：** 擴展 `/status` 指令以顯示所有功能統計。

**修改檔案：**

```
新增：
├── src/commands/status/subcommands/
│   └── features.ts

修改：
├── src/commands/status/status.command.ts
├── src/platforms/discordeno/commands.json
```

**新增子指令：**

```
/status bot       # 現有：機器人資訊
/status guild     # 現有：伺服器資訊
/status features  # 新增：所有功能統計
```

**Features 顯示：**

```
⚙️ 功能統計

🔔 通知功能
├── 成員入群：✅ 已啟用
├── 成員離群：✅ 已啟用
├── 直播通知：✅ 已啟用（5 個監控，2 個直播中）
├── 生日通知：✅ 已啟用（12 個生日）
└── 訊息刪除：❌ 已停用

💬 其他功能
├── 關鍵字規則：15 個（12 個啟用）
├── 反應身分組：3 個面板，18 個身分組
└── ...
```

**實作重點：**


1. 使用 `Promise.all()` 並行查詢
2. 若某功能查詢失敗，優雅降級
3. 快取結果 30 秒防止濫用

**驗證步驟：**

- [ ] 所有統計數據正確
- [ ] 效能可接受（< 1 秒）
- [ ] 優雅的錯誤處理
- [ ] 快取結果運作


***

## Phase 2: 管理功能

### P2-1: Clear Messages 指令

**目標：** 批次刪除訊息（按數量或時間範圍）。

**新增檔案：**

```
Commands:
├── src/commands/clear/
│   ├── clear.command.ts
│   ├── clear.types.ts
│   ├── clear.helpers.ts
│   ├── internal/
│   └── subcommands/
│       ├── count.ts
│       └── time.ts

修改：
├── src/platforms/discordeno/commands.json
├── src/core/bootstrap/app.bootstrap.ts
```

**指令：**

```
/clear count:<1-100>
/clear time days:<0-14> [hours:<0-23>] [minutes:<0-59>]
```

**實作重點：**


1. **Discord 限制：**
   * 單次最多刪除 100 則訊息
   * 無法刪除 14 天前的訊息
   * 需要 `MANAGE_MESSAGES` 權限
2. **確認機制：**
   * 使用 `ConfirmationManager` 處理所有操作
   * 顯示預覽：「從 <頻道> 刪除 X 則訊息？」
   * 30 秒逾時
3. **權限檢查：**
   * 機器人需要 `MANAGE_MESSAGES`
   * 用戶需要 `MANAGE_MESSAGES`
   * 在顯示確認前檢查
4. **釘選訊息：**
   * 新增選項 `skip-pinned:<true|false>`（預設：true）
   * 從刪除列表過濾釘選訊息

**驗證步驟：**

- [ ] Count 模式正常運作
- [ ] Time 模式正常運作
- [ ] 14 天限制強制執行
- [ ] 權限檢查正確
- [ ] 釘選訊息遵守
- [ ] 確認機制運作
- [ ] 錯誤訊息清楚


***

### P2-2: Giveaway 系統

**目標：** 簡化版抽獎，按鈕參加並自動開獎。

**新增檔案：**

```
Features:
├── src/features/giveaway/
│   ├── giveaway.feature.ts
│   ├── giveaway.module.ts
│   ├── giveaway.service.ts
│   ├── giveaway.scheduler.ts
│   ├── giveaway.types.ts
│   └── giveaway.select.ts

Commands:
├── src/commands/giveaway/
│   ├── giveaway.command.ts
│   ├── giveaway.types.ts
│   ├── giveaway.helpers.ts
│   ├── internal/
│   └── subcommands/
│       ├── create.ts
│       ├── end.ts
│       └── reroll.ts

Shared:
├── src/shared/giveaway/
│   └── giveaway-button.strategy.ts

修改：
├── prisma/schema.prisma
├── src/core/bootstrap/app.bootstrap.ts
├── src/platforms/discordeno/commands.json
```

**資料庫 Schema：**

```prisma
model Giveaway {
  id          String   @id @default(cuid())
  guildId     String
  channelId   String
  messageId   String
  prize       String
  winnerCount Int      @default(1)
  endTime     DateTime
  ended       Boolean  @default(false)
  winnerIds   String[] @default([])
  creatorId   String
  createdAt   DateTime @default(now())

  guild       Guild    @relation(fields: [guildId], references: [id], onDelete: Cascade)
  entries     GiveawayEntry[]

  @@index([guildId])
  @@index([endTime])
  @@index([ended])
}

model GiveawayEntry {
  giveawayId String
  userId     String
  enteredAt  DateTime @default(now())

  giveaway   Giveaway @relation(fields: [giveawayId], references: [id], onDelete: Cascade)

  @@id([giveawayId, userId])
  @@index([giveawayId])
}
```

**指令：**

```
/giveaway create prize:<獎品> duration:<時長> [winners:<1-20>]
/giveaway end id:<giveaway_id>
/giveaway reroll id:<giveaway_id> [winners:<數量>]
```

**時長格式：**

```
範例：「1h」、「30m」、「2h30m」、「1d」、「2d12h」
最大：30 天
```

**實作重點：**


1. **參加按鈕：**
   * Custom ID：`giveaway:enter:{giveawayId}`
   * 切換參加狀態（加入/離開）
   * 每 60 秒更新按鈕標籤的參加人數
2. **排程器：**
   * 每分鐘檢查：`* * * * *`
   * 查詢 `endTime <= now AND ended = false` 的抽獎
   * 選出得獎者並更新 embed
3. **得獎者選擇：**
   * 使用 `crypto.randomInt()` 確保安全隨機性
   * 確保無重複得獎者
   * 若參加人數不足，全部得獎

**驗證步驟：**

- [ ] 抽獎建立正常
- [ ] 參加按鈕切換正確
- [ ] 參加人數更新
- [ ] 自動開獎正確
- [ ] 得獎者顯示正確
- [ ] 手動結束運作
- [ ] Reroll 運作


***

## Phase 3: 互動功能

### P3-1: Say 指令

**目標：** 讓機器人在指定頻道發送自訂 embed。

**新增檔案：**

```
Commands:
├── src/commands/say/
│   ├── say.command.ts
│   ├── say.types.ts
│   ├── internal/
│   └── say.helpers.ts

修改：
├── src/platforms/discordeno/commands.json
├── src/core/bootstrap/app.bootstrap.ts
```

**指令：**

```
/say channel:<頻道> message:<內容> [title:<標題>] [color:<十六進位>]
```

**實作重點：**


1. **權限：**
   * 需要 `ADMINISTRATOR` 權限
   * 檢查機器人在目標頻道的權限
2. **預覽：**
   * 在臨時訊息顯示 embed 預覽
   * 新增確認按鈕（發送 / 取消）
   * 30 秒逾時
3. **Markdown 支援：**
   * Discord markdown（粗體、斜體、程式碼等）
   * 提及（@用戶、@身分組、#頻道）
   * 表情符號（自訂與 Unicode）
4. **顏色：**
   * 接受十六進位格式：`#FF5733` 或 `FF5733`
   * 預設：機器人主題色
   * 驗證十六進位格式

**驗證步驟：**

- [ ] 權限檢查運作
- [ ] 預覽正確顯示
- [ ] 確認機制運作
- [ ] Markdown 渲染
- [ ] 顏色解析運作
- [ ] 訊息發送至正確頻道


***

### P3-2: Choose 指令

**目標：** 從用戶提供的選項中隨機選擇。

**新增檔案：**

```
Commands:
├── src/commands/choose/
│   ├── choose.command.ts
│   ├── internal/
│   └── choose.helpers.ts

修改：
├── src/platforms/discordeno/commands.json
├── src/core/bootstrap/app.bootstrap.ts
```

**指令：**

```
/choose options:<選項1,選項2,選項3...>
```

**回應格式：**

```
🎲 隨機選擇

選項：選項A、選項B、選項C

選中：**選項B**
```

**實作重點：**


1. **輸入：**
   * 最少 2 個選項，最多 25 個選項
   * 以逗號分隔
   * 去除每個選項的空白
2. **隨機選擇：**
   * 使用 `crypto.randomInt(0, options.length)`
   * 確保加密安全的隨機性
3. **顯示：**
   * 顯示所有選項
   * 以粗體標示選中的選項

**驗證步驟：**

- [ ] 最小/最大選項強制執行
- [ ] 隨機選擇運作
- [ ] 所有選項顯示
- [ ] 選中選項標示


***

### P3-3: Fortune 指令

**目標：** 有趣的算命功能，加權隨機結果。

**新增檔案：**

```
Commands:
├── src/commands/fortune/
│   ├── fortune.command.ts
│   ├── fortune.types.ts
│   ├── internal/
│   └── fortune.responses.ts

修改：
├── src/platforms/discordeno/commands.json
├── src/core/bootstrap/app.bootstrap.ts
```

**指令：**

```
/fortune [question:<問題>]
```

**運勢類型：**

```typescript
enum FortuneType {
  GREAT_BLESSING = 'GREAT_BLESSING',  // 大吉 - 10%
  BLESSING = 'BLESSING',              // 吉 - 30%
  MODERATE = 'MODERATE',              // 中吉 - 30%
  SMALL_BLESSING = 'SMALL_BLESSING',  // 小吉 - 20%
  MISFORTUNE = 'MISFORTUNE',          // 凶 - 10%
}
```

**回應格式：**

```
🔮 運勢

問題：我今年會升職嗎？

結果：🌟 大吉

訊息：「今天是你的幸運日！偉大的機會等著你。」
```

**實作重點：**


1. **加權隨機：**
   * 生成隨機數 1-100
   * 依機率映射到運勢類型
   * 1-10：大吉
   * 11-40：吉
   * 41-70：中吉
   * 71-90：小吉
   * 91-100：凶
2. **回應：**
   * 每個運勢類型有 5-10 則預設訊息
   * 隨機選擇該類型的一則訊息
   * 訊息可通用或主題化
3. **Embed 顏色：**
   * 大吉：金色 `#FFD700`
   * 吉：綠色 `#00FF00`
   * 中吉：藍色 `#0099FF`
   * 小吉：黃色 `#FFFF00`
   * 凶：紅色 `#FF0000`
4. **問題：**
   * 選填欄位
   * 若提供，顯示在 embed 中
   * 若未提供，顯示通用運勢

**驗證步驟：**

- [ ] 加權隨機分佈正確
- [ ] 所有運勢類型出現
- [ ] 訊息隨機化
- [ ] Embed 顏色正確
- [ ] 有問題時顯示
- [ ] 無問題時運作


***

## Phase 4: 通知系統統一化重構

### 目標

將所有通知功能統一在單一 `/notify` 指令架構下。

### P4-1: 建立 Notify 統一指令結構

**修改檔案：**

```
新增：
├── src/commands/notify/
│   ├── notify.command.ts           # 主指令入口
│   ├── notify.types.ts
│   ├── notify.helpers.ts
│   ├── internal/
│   └── subcommands/
│       ├── member/                 # 成員通知
│       │   ├── enable-join.ts
│       │   ├── enable-leave.ts
│       │   ├── disable-join.ts
│       │   ├── disable-leave.ts
│       │   ├── set-message.ts
│       │   └── list.ts
│       ├── stream/                 # 直播通知
│       │   ├── enable.ts
│       │   ├── disable.ts
│       │   ├── watch.ts
│       │   ├── unwatch.ts
│       │   └── list.ts
│       ├── birthday/               # 生日通知
│       │   ├── enable.ts
│       │   ├── disable.ts
│       │   ├── set.ts
│       │   ├── remove.ts
│       │   └── list.ts
│       ├── message-delete/         # 訊息刪除記錄
│       │   ├── enable.ts
│       │   ├── disable.ts
│       │   └── list.ts
│       └── status.ts               # 統一狀態查看

刪除（遷移後）：
├── src/commands/member-notify/
├── src/commands/stream-notify/
├── src/commands/birthday-notify/
└── src/commands/message-delete-notify/

修改：
├── src/core/bootstrap/app.bootstrap.ts
├── src/platforms/discordeno/commands.json
├── README.md
```

**新指令結構：**

```
/notify member enable-join [message:<範本>]
/notify member enable-leave [message:<範本>]
/notify member disable-join
/notify member disable-leave
/notify member set-message type:<join|leave> message:<範本>
/notify member list

/notify stream enable channel:<頻道> [message:<範本>]
/notify stream disable
/notify stream watch platform:<twitch|youtube> id:<頻道ID> [name:<名稱>]
/notify stream unwatch platform:<twitch|youtube> id:<頻道ID>
/notify stream list

/notify birthday enable channel:<頻道> [time:<HH:MM>] [role:<身分組>] [message:<範本>]
/notify birthday disable
/notify birthday set user:<用戶> month:<1-12> day:<1-31> [year:<YYYY>]
/notify birthday remove [user:<用戶>]
/notify birthday list

/notify message-delete enable channel:<頻道>
/notify message-delete disable
/notify message-delete list

/notify status
```

**實作重點：**


1. **遷移策略：**
   * 將各 `*-notify` 指令的 subcommands 搬移到 `notify/subcommands/{type}/`
   * 保持 Feature 層不變
   * 僅重構 Command 層
2. **主指令路由：**

```typescript
// notify.command.ts
export function setupNotifyCommand(/* ... */) {
  return async (interaction: BotInteraction, bot: Bot) => {
    const subGroup = interaction.data?.options?.[0];
    const subCommand = subGroup?.options?.[0];
    const guildId = interaction.guildId?.toString();
    
    if (!guildId) return;
    
    if (subGroup?.name === 'member') {
      // Route to member subcommands
    } else if (subGroup?.name === 'stream') {
      // Route to stream subcommands
    } else if (subGroup?.name === 'birthday') {
      // Route to birthday subcommands
    } else if (subGroup?.name === 'message-delete') {
      // Route to message-delete subcommands
    } else if (subGroup?.name === 'status') {
      await handleNotifyStatus(/* ... */);
    }
  };
}
```

**驗證步驟：**

- [ ] 所有 member 子指令正常運作
- [ ] 所有 stream 子指令正常運作
- [ ] 所有 birthday 子指令正常運作
- [ ] 所有 message-delete 子指令正常運作
- [ ] Status 指令顯示所有通知狀態
- [ ] 舊指令已移除
- [ ] README 更新


***

### P4-2: 更新 README 文件

**修改檔案：**

```
修改：
├── README.md
```

**更新內容：**


1. 更新指令範例為新的 `/notify` 結構
2. 新增指令結構總覽
3. 更新功能列表

**驗證步驟：**

- [ ] 所有指令範例正確
- [ ] 功能列表最新
- [ ] 架構圖反映當前結構
- [ ] 無失效連結


***

## 📋 通用驗證清單

每個 Phase 完成後執行：

### 程式碼品質

- [ ] 無 TypeScript `any` 類型
- [ ] 所有函數有英文 JSDoc 註解
- [ ] 遵循現有程式碼風格
- [ ] 無 `console.log`，使用 `createLogger()`
- [ ] 無 magic numbers，使用 `@core/config/constants` 的常數

### 錯誤處理

- [ ] Discord API 呼叫包裝在 try-catch
- [ ] Discord 錯誤使用 `DiscordErrorHandler`
- [ ] 資料庫操作包裝在 try-catch
- [ ] Observable streams 有外層 `catchError`
- [ ] 用戶收到友善的錯誤訊息

### 效能與資源

- [ ] 無記憶體洩漏
- [ ] 資料庫查詢使用 runtime selectors
- [ ] 無 N+1 查詢問題
- [ ] 考慮 API 速率限制
- [ ] cleanup 中正確 unsubscribe

### 測試

- [ ] 基本功能測試通過
- [ ] 錯誤情境測試通過
- [ ] 權限檢查測試通過
- [ ] 回歸測試通過
- [ ] 24 小時穩定性測試（針對排程器）


***

## 🎯 最終實作優先順序

**Phase 1: 核心通知功能**（直播、生日、訊息刪除、Status 增強）\n↓\n**Phase 2: 管理功能**（Clear、Giveaway）\n↓\n**Phase 3: 互動功能**（~~Poll~~、Say、Choose、Fortune）\n↓\n**Phase 4: 通知系統統一化重構**（將所有 `*-notify` 整合為 `/notify`）


***

**重構計畫結束**

## 📋 總覽

本重構計畫基於完成 Phase 1 關鍵重構後的當前架構。專案目前已具備：

* ✅ 統一的錯誤處理與 Discord API 錯誤碼
* ✅ Feature Registry 和 Command Registry 系統
* ✅ 基於 Guild 的資料模型與級聯刪除
* ✅ 危險操作的確認系統
* ✅ Observable stream 防護與完整錯誤處理
* ✅ Logger 的 BigInt 序列化支援
* ✅ 高頻查詢的 Runtime Selector 優化


***

## 🏗️ 當前架構

```
src/
├── core/                       # 框架無關的工具
│   ├── bootstrap/              # 應用初始化與註冊系統
│   ├── config/                 # 配置與常數
│   ├── errors/                 # 錯誤處理與 Discord 錯誤碼
│   ├── logger/                 # 結構化日誌與序列化器
│   ├── rx/                     # RxJS 事件匯流排
│   └── signals/                # 狀態管理
│
├── platforms/                  # 外部整合
│   ├── discordeno/             # Discord bot 客戶端與事件流
│   └── database/               # Prisma 客戶端單例
│
├── features/                   # 業務邏輯
│   ├── guild/                  # 伺服器管理（根實體）
│   ├── keyword/                # 關鍵字自動回覆
│   ├── member-notify/          # 成員加入/離開通知
│   └── reaction-role/          # 反應身分組系統
│
├── commands/                   # Discord 指令處理器
│   ├── keyword/
│   ├── member-notify/
│   ├── reaction-role/
│   └── status/
│
└── shared/                     # 可重用元件
    ├── confirmation/           # 確認對話框
    ├── error/                  # 錯誤回覆輔助工具
    ├── message/                # 訊息工廠
    ├── paginator/              # 通用分頁器
    └── utils/                  # 常用工具
```


***

## Phase 1: 通知系統統一化

### 目標

將所有通知功能統一在單一 `/notify` 指令架構下，為未來的通知類型做好準備。

### P1-1: Notify 指令結構建立

**問題：** 當前 `member-notify` 是獨立指令。未來的通知類型（stream、birthday、message-delete）需要統一介面。

**解決方案：** 建立統一的 `/notify` 指令入口，使用 subcommand groups 組織各通知類型。

**修改檔案：**

```
新增：
├── src/commands/notify/
│   ├── notify.command.ts           # 主指令入口
│   ├── notify.types.ts             # 共用類型
│   ├── notify.helpers.ts           # 通用工具
│   └── internal/                   # 內部工具
│
├── src/commands/notify/subcommands/
│   └── member/                     # Member 子指令群組
│       ├── enable-join.ts
│       ├── enable-leave.ts
│       ├── disable-join.ts
│       ├── disable-leave.ts
│       ├── set-message.ts
│       └── list.ts

修改：
├── src/core/bootstrap/app.bootstrap.ts
├── src/platforms/discordeno/commands.json
├── README.md
```

**指令結構：**

```
/notify member enable-join [message:<範本>]
/notify member enable-leave [message:<範本>]
/notify member disable-join
/notify member disable-leave
/notify member set-message type:<join|leave> message:<範本>
/notify member list

# 未來擴展（Phase 2）
/notify stream ...
/notify birthday ...
/notify message-delete ...
/notify status
```

**實作重點：**


1. 將現有 `member-notify` 指令遷移至 `/notify member` 結構
2. 保持現有 `MemberNotifyFeature` 不變（僅變更指令層）
3. 範本變數維持不變：`{user}`、`{username}`、`{server}`、`{memberCount}`
4. 所有子指令使用現有的 `MemberNotifyModule` 和 `MemberNotifyService`
5. 使用 `commandRegistry.register('notify', setupNotifyCommand(...))` 註冊

**主指令處理器範例：**

```typescript
// notify.command.ts
export function setupNotifyCommand(
  memberNotifyModule: MemberNotifyModule,
  guildModule: GuildModule,
  memberNotifyService: MemberNotifyService
) {
  return async (interaction: BotInteraction, bot: Bot) => {
    const subGroup = interaction.data?.options?.[0];
    const subCommand = subGroup?.options?.[0];
    const guildId = interaction.guildId?.toString();

    if (!guildId) return;

    // Route to member subcommands
    if (subGroup?.name === 'member') {
      if (subCommand?.name === 'enable-join') {
        await handleMemberEnableJoin(bot, interaction, memberNotifyModule, guildModule, guildId, subCommand);
      } else if (subCommand?.name === 'enable-leave') {
        await handleMemberEnableLeave(bot, interaction, memberNotifyModule, guildModule, guildId, subCommand);
      } else if (subCommand?.name === 'disable-join') {
        await handleMemberDisableJoin(bot, interaction, memberNotifyModule, guildId);
      } else if (subCommand?.name === 'disable-leave') {
        await handleMemberDisableLeave(bot, interaction, memberNotifyModule, guildId);
      } else if (subCommand?.name === 'set-message') {
        await handleMemberSetMessage(bot, interaction, memberNotifyService, guildId, subCommand);
      } else if (subCommand?.name === 'list') {
        await handleMemberList(bot, interaction, memberNotifyModule, guildId);
      }
    }
    // Future: stream, birthday, message-delete routing
  };
}
```

**commands.json 結構：**

```json
{
  "name": "notify",
  "description": "通知系統管理",
  "options": [
    {
      "type": 2,
      "name": "member",
      "description": "成員通知設定",
      "options": [
        {
          "type": 1,
          "name": "enable-join",
          "description": "啟用入群通知",
          "options": [
            {
              "type": 3,
              "name": "message",
              "description": "自訂訊息範本（選填）",
              "required": false
            }
          ]
        },
        {
          "type": 1,
          "name": "enable-leave",
          "description": "啟用離群通知",
          "options": [
            {
              "type": 3,
              "name": "message",
              "description": "自訂訊息範本（選填）",
              "required": false
            }
          ]
        },
        {
          "type": 1,
          "name": "disable-join",
          "description": "停用入群通知"
        },
        {
          "type": 1,
          "name": "disable-leave",
          "description": "停用離群通知"
        },
        {
          "type": 1,
          "name": "set-message",
          "description": "設定訊息範本",
          "options": [
            {
              "type": 3,
              "name": "type",
              "description": "通知類型",
              "required": true,
              "choices": [
                {"name": "入群通知", "value": "join"},
                {"name": "離群通知", "value": "leave"}
              ]
            },
            {
              "type": 3,
              "name": "message",
              "description": "訊息範本",
              "required": true
            }
          ]
        },
        {
          "type": 1,
          "name": "list",
          "description": "查看成員通知設定"
        }
      ]
    }
  ]
}
```

**驗證步驟：**

- [ ] 所有現有 member-notify 功能正常運作
- [ ] 範本變數正確渲染
- [ ] join/leave 的啟用/停用切換正常
- [ ] list 指令顯示當前設定
- [ ] 資料庫 schema 無破壞性變更
- [ ] 舊的 `/member-notify` 指令已移除


***

### P1-2: Notify Status 指令

**目標：** 新增狀態總覽，顯示伺服器所有通知設定。

**修改檔案：**

```
新增：
├── src/commands/notify/subcommands/
│   └── status.ts

修改：
├── src/commands/notify/notify.command.ts
├── src/platforms/discordeno/commands.json
```

**指令：**

```
/notify status
```

**顯示格式：**

```
🔔 通知設定總覽

📥 成員入群通知
├── 狀態：✅ 已啟用
├── 頻道：#welcome
└── 訊息：「📥 {user} 加入了 {server}！目前共 {memberCount} 位成員」

📤 成員離群通知
├── 狀態：❌ 已停用
├── 頻道：未設定
└── 訊息：預設訊息

🎮 直播通知：未設定
🎂 生日通知：未設定
🗑️ 訊息刪除記錄：未設定
```

**實作重點：**


1. 查詢該伺服器的所有 `NotificationChannel` 記錄
2. 查詢 `MemberNotifyMessage` 取得自訂範本
3. 使用 `Promise.all()` 並行查詢提升效能
4. Phase 2 功能顯示「未設定」（待實作）
5. 使用 embed 格式回覆

**實作範例：**

```typescript
// status.ts
export async function handleNotifyStatus(
  bot: Bot,
  interaction: BotInteraction,
  memberNotifyModule: MemberNotifyModule,
  guildId: string
) {
  try {
    const [joinConfig, leaveConfig, messageTemplates] = await Promise.all([
      lastValueFrom(memberNotifyModule.getNotificationChannel$(guildId, 'MEMBER_JOIN')),
      lastValueFrom(memberNotifyModule.getNotificationChannel$(guildId, 'MEMBER_LEAVE')),
      lastValueFrom(memberNotifyModule.getMessageTemplates$(guildId)),
    ]);

    const embed = {
      title: '🔔 通知設定總覽',
      color: EmbedColors.INFO,
      fields: [
        {
          name: '📥 成員入群通知',
          value: formatNotifyStatus(joinConfig, messageTemplates?.joinMessage),
          inline: false,
        },
        {
          name: '📤 成員離群通知',
          value: formatNotifyStatus(leaveConfig, messageTemplates?.leaveMessage),
          inline: false,
        },
        {
          name: '🎮 直播通知',
          value: '未設定',
          inline: false,
        },
        {
          name: '🎂 生日通知',
          value: '未設定',
          inline: false,
        },
        {
          name: '🗑️ 訊息刪除記錄',
          value: '未設定',
          inline: false,
        },
      ],
    };

    await replySuccess(bot, interaction, { embeds: [embed] });
  } catch (error) {
    await replyAutoError(bot, interaction, error);
  }
}

function formatNotifyStatus(config: NotificationChannel | null, message?: string): string {
  if (!config || !config.enabled) {
    return '├── 狀態：❌ 已停用\n├── 頻道：未設定\n└── 訊息：預設訊息';
  }
  
  const channelMention = `<#${config.channelId}>`;
  const msgPreview = message ? `「${message.substring(0, 50)}...」` : '預設訊息';
  
  return `├── 狀態：✅ 已啟用\n├── 頻道：${channelMention}\n└── 訊息：${msgPreview}`;
}
```

**驗證步驟：**

- [ ] 顯示正確的啟用/停用狀態
- [ ] 頻道名稱正確顯示
- [ ] 自訂範本有設定時顯示
- [ ] 效能可接受（< 500ms）
- [ ] 查詢失敗時有適當錯誤處理


***

### P1-3: 更新 README 文件

**目標：** 更新文件以反映新的指令結構。

**修改檔案：**

```
修改：
├── README.md
```

**更新內容：**


1. 將所有 `/member-notify` 範例改為 `/notify member`
2. 新增指令結構總覽
3. 更新功能列表
4. 新增遷移說明

**README 更新範例：**

```markdown
## ✨ 核心功能

- **🔔 通知系統** - 統一的通知管理介面
  - 成員加入/離開通知（可自訂範本）
  - 直播通知（Phase 2）
  - 生日通知（Phase 2）
  - 訊息刪除記錄（Phase 2）
- **🔑 關鍵字自動回覆** - 基於模式的訊息回應
- **🎭 反應身分組** - 透過表情符號反應分配身分組
- ...

## 📝 指令範例

### 通知系統

```bash
# 啟用成員入群通知
/notify member enable-join message:"歡迎 {user} 加入 {server}！"

# 停用離群通知
/notify member disable-leave

# 查看通知設定
/notify status
```

```

**驗證步驟：**

- [ ] 所有指令範例正確
- [ ] 功能列表最新
- [ ] 架構圖反映當前結構
- [ ] 無失效連結

***

## Phase 2: 核心通知功能

### P2-1: 直播通知（Twitch + YouTube）

**目標：** 監控 Twitch/YouTube 直播並在開台時發送通知。

**新增檔案：**
```

Features: ├── src/features/stream-notify/ │   ├── stream-notify.feature.ts │   ├── stream-notify.module.ts │   ├── stream-notify.service.ts │   ├── stream-notify.types.ts │   ├── stream-notify.select.ts │   └── platforms/ │       ├── platform.interface.ts │       ├── twitch.service.ts │       └── youtube.service.ts

Commands: ├── src/commands/notify/subcommands/ │   └── stream/ │       ├── enable.ts │       ├── disable.ts │       ├── watch.ts │       ├── unwatch.ts │       └── list.ts

Core: ├── src/core/scheduler/ │   ├── scheduler.service.ts │   └── scheduler.types.ts

修改： ├── prisma/schema.prisma ├── src/core/bootstrap/app.bootstrap.ts ├── src/platforms/discordeno/commands.json

```

**資料庫 Schema：**

```prisma
model StreamNotifyConfig {
  guildId   String   @id
  channelId String
  enabled   Boolean  @default(true)
  message   String   @default("🔴 {user} 開始直播了！\n{title}\n{url}")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  guild     Guild    @relation(fields: [guildId], references: [id], onDelete: Cascade)

  @@index([guildId])
}

model StreamWatcher {
  id          String           @id @default(cuid())
  guildId     String
  platformId  String
  platform    StreamPlatform
  displayName String
  isLive      Boolean          @default(false)
  lastChecked DateTime         @default(now())
  createdAt   DateTime         @default(now())

  guild       Guild            @relation(fields: [guildId], references: [id], onDelete: Cascade)

  @@unique([guildId, platform, platformId])
  @@index([guildId])
  @@index([isLive])
}

enum StreamPlatform {
  TWITCH
  YOUTUBE
}
```

**指令：**

```
/notify stream enable channel:<頻道> [message:<範本>]
/notify stream disable
/notify stream watch platform:<twitch|youtube> id:<頻道ID> [name:<顯示名稱>]
/notify stream unwatch platform:<twitch|youtube> id:<頻道ID>
/notify stream list
```

**範本變數：**

* `{user}` - 實況主顯示名稱
* `{title}` - 直播標題
* `{url}` - 直播網址
* `{game}` - 遊戲/類別名稱
* `{viewers}` - 當前觀眾數

**實作重點：**


1. **Twitch API：**
   * 使用 Helix API：`GET /streams?user_id=...`
   * 每 1 分鐘輪詢一次（800 req/min 限制）
   * 批次檢查最多 100 個頻道
   * 需要 app access token
2. **YouTube API：**
   * 使用 Data API v3：`search.list` 搭配 `eventType=live`
   * 每 3 分鐘輪詢一次（10k quota/day 限制）
   * 批次檢查最多 50 個頻道
   * 需要 API key
3. **排程器：**
   * 使用 `node-cron` 進行排程
   * Twitch：`*/1 * * * *`（每 1 分鐘）
   * YouTube：`*/3 * * * *`（每 3 分鐘）
   * 優雅關閉清理
4. **狀態追蹤：**
   * 偵測 `isLive: false → true` 時發送通知
   * 每次輪詢更新 `isLive` 和 `lastChecked`
   * `true → false` 轉換不發通知
5. **錯誤處理：**
   * API 錯誤：記錄並繼續（不中斷排程器）
   * 速率限制：指數退避
   * 無效頻道：標記並通知管理員

**Feature Setup 範例：**

```typescript
// stream-notify.feature.ts
export function setupStreamNotifyFeature(
  prisma: PrismaClient,
  bot: Bot,
  guildModule: GuildModule
): StreamNotifyFeature {
  const module = createStreamNotifyModule(prisma);
  const service = createStreamNotifyService(module);
  const twitchService = createTwitchService();
  const youtubeService = createYoutubeService();
  
  const scheduler = createStreamNotifyScheduler(
    module,
    service,
    twitchService,
    youtubeService,
    bot
  );
  
  // Start schedulers
  scheduler.start();
  
  return {
    name: 'stream-notify',
    module,
    service,
    cleanup: () => {
      scheduler.stop();
      log.info('Stream notify feature cleaned up');
    },
  };
}
```

**驗證步驟：**

- [ ] Twitch 直播正確偵測
- [ ] YouTube 直播正確偵測
- [ ] 無重複通知
- [ ] 排程器穩定運行
- [ ] API 速率限制遵守
- [ ] 24 小時穩定性測試通過


***

### P2-2: 生日通知

**目標：** 追蹤成員生日並自動發送祝福。

**新增檔案：**

```
Features:
├── src/features/birthday-notify/
│   ├── birthday-notify.feature.ts
│   ├── birthday-notify.module.ts
│   ├── birthday-notify.service.ts
│   ├── birthday-notify.scheduler.ts
│   ├── birthday-notify.types.ts
│   └── birthday-notify.select.ts

Commands:
├── src/commands/notify/subcommands/
│   └── birthday/
│       ├── enable.ts
│       ├── disable.ts
│       ├── set.ts
│       ├── remove.ts
│       └── list.ts

修改：
├── prisma/schema.prisma
├── src/core/bootstrap/app.bootstrap.ts
├── src/platforms/discordeno/commands.json
```

**資料庫 Schema：**

```prisma
model BirthdayConfig {
  guildId   String   @id
  channelId String
  enabled   Boolean  @default(true)
  message   String   @default("🎂 {user} 生日快樂！🎉")
  time      String   @default("09:00")
  roleId    String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  guild     Guild    @relation(fields: [guildId], references: [id], onDelete: Cascade)

  @@index([guildId])
}

model Birthday {
  guildId   String
  userId    String
  month     Int
  day       Int
  year      Int?
  createdAt DateTime @default(now())

  guild     Guild    @relation(fields: [guildId], references: [id], onDelete: Cascade)

  @@id([guildId, userId])
  @@index([guildId])
  @@index([month, day])
}
```

**指令：**

```
/notify birthday enable channel:<頻道> [time:<HH:MM>] [role:<身分組>] [message:<範本>]
/notify birthday disable
/notify birthday set user:<用戶> month:<1-12> day:<1-31> [year:<YYYY>]
/notify birthday remove [user:<用戶>]
/notify birthday list
```

**範本變數：**

* `{user}` - 用戶提及
* `{username}` - 用戶名稱（無提及）
* `{age}` - 年齡（若提供年份）

**實作重點：**


1. **排程器：**
   * 每日 UTC 00:05 檢查：`5 0 * * *`
   * 依伺服器時區轉換 `time` 設定（未來增強）
   * 查詢當日月份/日期的生日
2. **生日身分組：**
   * 若設定 `roleId`，在祝福時賦予身分組
   * 24 小時後移除（另一個 cron：`10 0 * * *`）
   * 在記憶體或臨時表追蹤身分組授予
3. **閏年處理：**
   * 2/29 生日在平年使用 2/28
   * 查詢：`(month = 2 AND day = 28) OR (month = 2 AND day = 29 AND isLeapYear)`
4. **隱私保護：**
   * 預設僅儲存月份/日期
   * 年份為選填（用於計算年齡）
   * 用戶可刪除自己的生日

**Scheduler 範例：**

```typescript
// birthday-notify.scheduler.ts
export function createBirthdayScheduler(
  module: BirthdayModule,
  service: BirthdayService,
  bot: Bot
) {
  const log = createLogger('BirthdayScheduler');
  
  // Check birthdays daily at 00:05 UTC
  const checkTask = cron.schedule('5 0 * * *', async () => {
    log.info('Running daily birthday check');
    
    try {
      const today = new Date();
      const month = today.getMonth() + 1;
      const day = today.getDate();
      const isLeapYear = (today.getFullYear() % 4 === 0);
      
      const birthdays = await lastValueFrom(
        service.getTodayBirthdays$(month, day, isLeapYear)
      );
      
      for (const birthday of birthdays) {
        await sendBirthdayGreeting(bot, birthday);
        if (birthday.roleId) {
          await grantBirthdayRole(bot, birthday);
        }
      }
      
      log.info({ count: birthdays.length }, 'Birthday greetings sent');
    } catch (error) {
      log.error({ error }, 'Failed to check birthdays');
    }
  });
  
  // Remove birthday roles daily at 00:10 UTC
  const removeRoleTask = cron.schedule('10 0 * * *', async () => {
    // Remove roles granted 24h ago
    await removeBirthdayRoles(bot);
  });
  
  return {
    start: () => {
      checkTask.start();
      removeRoleTask.start();
      log.info('Birthday scheduler started');
    },
    stop: () => {
      checkTask.stop();
      removeRoleTask.stop();
      log.info('Birthday scheduler stopped');
    },
  };
}
```

**驗證步驟：**

- [ ] 生日設定正常
- [ ] 排程器定時執行
- [ ] 訊息準時發送
- [ ] 身分組授予與移除正常
- [ ] 閏年生日處理正確
- [ ] 隱私選項遵守


***

### P2-3: 訊息刪除通知

**目標：** 記錄已刪除的訊息到指定頻道。

**新增檔案：**

```
Features:
├── src/features/message-delete-notify/
│   ├── message-delete-notify.feature.ts
│   ├── message-delete-notify.module.ts
│   ├── message-delete-notify.service.ts
│   ├── message-delete-notify.types.ts
│   └── message-delete-notify.select.ts

Commands:
├── src/commands/notify/subcommands/
│   └── message-delete/
│       ├── enable.ts
│       ├── disable.ts
│       └── list.ts

修改：
├── prisma/schema.prisma
├── src/core/bootstrap/app.bootstrap.ts
├── src/core/rx/bus.ts
├── src/platforms/discordeno/bot.events.ts
├── src/platforms/discordeno/commands.json
```

**資料庫 Schema：**

```prisma
model MessageDeleteConfig {
  guildId   String   @id
  channelId String
  enabled   Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  guild     Guild    @relation(fields: [guildId], references: [id], onDelete: Cascade)

  @@index([guildId])
}
```

**指令：**

```
/notify message-delete enable channel:<頻道>
/notify message-delete disable
/notify message-delete list
```

**事件訂閱：**

```typescript
// In bus.ts, add:
export const messageDelete$ = new Subject<MessageDeletePayload>();

// In bot.events.ts, add:
events.messageDelete = (bot, payload) => {
  messageDelete$.next({
    id: payload.id,
    channelId: payload.channelId,
    guildId: payload.guildId,
  });
};
```

**記錄格式（Embed）：**

```
🗑️ 訊息已刪除

作者：@username (ID: 123456789)
頻道：#general
時間：2026-02-04 14:30:25 UTC

內容：
[原始訊息內容 或 "內容未快取"]

附件：2 個檔案
```

**實作重點：**


1. **訊息快取：**
   * Discordeno 預設不快取訊息
   * 若訊息不在快取中，顯示「內容未快取」
   * 考慮實作短期訊息快取（1-24小時）
2. **過濾：**
   * 排除機器人自己刪除的訊息
   * 排除系統訊息
   * 排除記錄頻道本身的訊息
3. **隱私：**
   * 遵守 Discord 的審計日誌權限
   * 僅在啟用功能的伺服器記錄
4. **速率限制：**
   * 若大量刪除，實作冷卻時間（反垃圾）
   * 每個頻道每 10 秒最多 5 條記錄

**Feature Setup 範例：**

```typescript
// message-delete-notify.feature.ts
export function setupMessageDeleteNotifyFeature(
  prisma: PrismaClient,
  bot: Bot,
  guildModule: GuildModule
): MessageDeleteNotifyFeature {
  const module = createMessageDeleteNotifyModule(prisma);
  const service = createMessageDeleteNotifyService(module);
  
  const subscription = messageDelete$
    .pipe(
      filter(payload => payload.guildId !== null),
      mergeMap(async (payload) => {
        const guildId = payload.guildId!.toString();
        
        try {
          const config = await lastValueFrom(module.getConfig$(guildId));
          if (!config || !config.enabled) return;
          
          // Check if message is from bot
          // (would need message cache or check author)
          
          await service.logDeletedMessage(bot, payload, config);
        } catch (error: any) {
          handleDiscordError(error, { guildId, channelId: payload.channelId });
        }
      }),
      catchError((error) => {
        log.error({ error }, 'Error in message delete stream');
        return of(null);
      })
    )
    .subscribe();
  
  return {
    name: 'message-delete-notify',
    module,
    service,
    cleanup: () => {
      subscription.unsubscribe();
      log.info('Message delete notify feature cleaned up');
    },
  };
}
```

**驗證步驟：**

- [ ] 訊息刪除時正確記錄
- [ ] 快取的內容正確顯示
- [ ] 未快取的訊息顯示備用文字
- [ ] 機器人訊息過濾正常
- [ ] 無遞迴記錄
- [ ] 速率限制運作


***

### P2-4: 增強 Status 指令

**目標：** 擴展 `/status` 指令以顯示所有功能統計。

**修改檔案：**

```
新增：
├── src/commands/status/subcommands/
│   ├── features.ts
│   └── notifications.ts

修改：
├── src/commands/status/status.command.ts
├── src/platforms/discordeno/commands.json
```

**新增子指令：**

```
/status bot            # 現有：機器人資訊
/status guild          # 現有：伺服器資訊
/status features       # 新增：所有功能統計
/status notifications  # 新增：所有通知設定
```

**Features 顯示：**

```
⚙️ 功能統計

🔔 通知功能
├── 成員入群：✅ 已啟用（今日 3 則）
├── 成員離群：✅ 已啟用（今日 1 則）
├── 直播通知：✅ 已啟用（5 個監控，2 個直播中）
├── 生日通知：✅ 已啟用（本月 12 個生日）
└── 訊息刪除：❌ 已停用

💬 其他功能
├── 關鍵字規則：15 個（12 個啟用）
├── 反應身分組：3 個面板，18 個身分組
└── ...
```

**實作重點：**


1. 使用 `Promise.all()` 並行查詢
2. 從記憶體或臨時儲存顯示每日/每月統計
3. 若某功能查詢失敗，優雅降級
4. 快取結果 30 秒防止濫用

**實作範例：**

```typescript
// features.ts
export async function handleStatusFeatures(
  bot: Bot,
  interaction: BotInteraction,
  keywordModule: KeywordModule,
  reactionRoleModule: ReactionRoleModule,
  memberNotifyModule: MemberNotifyModule,
  streamNotifyModule: StreamNotifyModule,
  birthdayModule: BirthdayModule,
  messageDeleteModule: MessageDeleteNotifyModule,
  guildId: string
) {
  try {
    const [
      keywordCount,
      reactionRolePanels,
      memberJoinConfig,
      memberLeaveConfig,
      streamConfig,
      streamWatchers,
      birthdayConfig,
      birthdayCount,
      messageDeleteConfig,
    ] = await Promise.all([
      lastValueFrom(keywordModule.countRules$(guildId)).catch(() => 0),
      lastValueFrom(reactionRoleModule.listPanels$(guildId)).catch(() => []),
      lastValueFrom(memberNotifyModule.getNotificationChannel$(guildId, 'MEMBER_JOIN')).catch(() => null),
      lastValueFrom(memberNotifyModule.getNotificationChannel$(guildId, 'MEMBER_LEAVE')).catch(() => null),
      lastValueFrom(streamNotifyModule.getConfig$(guildId)).catch(() => null),
      lastValueFrom(streamNotifyModule.listWatchers$(guildId)).catch(() => []),
      lastValueFrom(birthdayModule.getConfig$(guildId)).catch(() => null),
      lastValueFrom(birthdayModule.countBirthdays$(guildId)).catch(() => 0),
      lastValueFrom(messageDeleteModule.getConfig$(guildId)).catch(() => null),
    ]);
    
    const liveStreamCount = streamWatchers.filter(w => w.isLive).length;
    
    const embed = {
      title: '⚙️ 功能統計',
      color: EmbedColors.INFO,
      fields: [
        {
          name: '🔔 通知功能',
          value: [
            `├── 成員入群：${memberJoinConfig?.enabled ? '✅ 已啟用' : '❌ 已停用'}`,
            `├── 成員離群：${memberLeaveConfig?.enabled ? '✅ 已啟用' : '❌ 已停用'}`,
            `├── 直播通知：${streamConfig?.enabled ? `✅ 已啟用（${streamWatchers.length} 個監控，${liveStreamCount} 個直播中）` : '❌ 已停用'}`,
            `├── 生日通知：${birthdayConfig?.enabled ? `✅ 已啟用（${birthdayCount} 個生日）` : '❌ 已停用'}`,
            `└── 訊息刪除：${messageDeleteConfig?.enabled ? '✅ 已啟用' : '❌ 已停用'}`,
          ].join('\n'),
          inline: false,
        },
        {
          name: '💬 其他功能',
          value: [
            `├── 關鍵字規則：${keywordCount} 個`,
            `└── 反應身分組：${reactionRolePanels.length} 個面板`,
          ].join('\n'),
          inline: false,
        },
      ],
    };
    
    await replySuccess(bot, interaction, { embeds: [embed] });
  } catch (error) {
    await replyAutoError(bot, interaction, error);
  }
}
```

**驗證步驟：**

- [ ] 所有統計數據正確
- [ ] 效能可接受（< 1 秒）
- [ ] 優雅的錯誤處理
- [ ] 快取結果運作


***

## Phase 3: 管理功能

### P3-1: Clear Messages 指令

**目標：** 批次刪除訊息（按數量或時間範圍）。

**新增檔案：**

```
Commands:
├── src/commands/clear/
│   ├── clear.command.ts
│   ├── clear.types.ts
│   ├── clear.helpers.ts
│   ├── internal/
│   └── subcommands/
│       ├── count.ts
│       └── time.ts

修改：
├── src/platforms/discordeno/commands.json
├── src/core/bootstrap/app.bootstrap.ts
```

**指令：**

```
/clear count:<1-100>
/clear time days:<0-14> [hours:<0-23>] [minutes:<0-59>]
```

**實作重點：**


1. **Discord 限制：**
   * 單次最多刪除 100 則訊息
   * 無法刪除 14 天前的訊息
   * 需要 `MANAGE_MESSAGES` 權限
2. **確認機制：**
   * 使用 `ConfirmationManager` 處理所有操作
   * 顯示預覽：「從 <頻道> 刪除 X 則訊息？」
   * 30 秒逾時
3. **權限檢查：**
   * 機器人需要 `MANAGE_MESSAGES`
   * 用戶需要 `MANAGE_MESSAGES`
   * 在顯示確認前檢查
4. **釘選訊息：**
   * 新增選項 `skip-pinned:<true|false>`（預設：true）
   * 從刪除列表過濾釘選訊息
5. **錯誤處理：**
   * 若部分訊息刪除失敗，顯示摘要
   * 使用 `DiscordErrorHandler` 記錄錯誤

**實作範例：**

```typescript
// count.ts
export async function handleClearCount(
  bot: Bot,
  interaction: BotInteraction,
  guildId: string,
  sub: InteractionDataOption
) {
  const count = getOptionValue<number>(sub, 'count')!;
  const channelId = interaction.channelId!.toString();
  
  // Check permissions
  const hasPermission = await checkPermissions(bot, guildId, channelId, interaction.user.id);
  if (!hasPermission) {
    await replyError(bot, interaction, {
      description: '你或機器人缺少 `管理訊息` 權限',
    });
    return;
  }
  
  // Fetch messages
  const messages = await bot.helpers.getMessages(channelId, { limit: count });
  const messageIds = messages.map(m => m.id);
  
  // Show confirmation
  const confirmed = await showConfirmation(bot, interaction, {
    title: '⚠️ 確認刪除訊息',
    description: `即將從此頻道刪除 **${messageIds.length}** 則訊息`,
    confirmLabel: '刪除',
    confirmStyle: ButtonStyle.DANGER,
  });
  
  if (!confirmed) return;
  
  // Delete messages
  try {
    await bot.helpers.deleteMessages(channelId, messageIds);
    await replySuccess(bot, interaction, {
      description: `✅ 已成功刪除 ${messageIds.length} 則訊息`,
    });
  } catch (error: any) {
    await replyAutoError(bot, interaction, error);
  }
}
```

**驗證步驟：**

- [ ] Count 模式正常運作
- [ ] Time 模式正常運作
- [ ] 14 天限制強制執行
- [ ] 權限檢查正確
- [ ] 釘選訊息遵守
- [ ] 確認機制運作
- [ ] 錯誤訊息清楚


***

### P3-2: Giveaway 系統

**目標：** 簡化版抽獎，按鈕參加並自動開獎。

**新增檔案：**

```
Features:
├── src/features/giveaway/
│   ├── giveaway.feature.ts
│   ├── giveaway.module.ts
│   ├── giveaway.service.ts
│   ├── giveaway.scheduler.ts
│   ├── giveaway.types.ts
│   └── giveaway.select.ts

Commands:
├── src/commands/giveaway/
│   ├── giveaway.command.ts
│   ├── giveaway.types.ts
│   ├── internal/
│   └── subcommands/
│       ├── create.ts
│       ├── end.ts
│       └── reroll.ts

Shared:
├── src/shared/giveaway/
│   └── giveaway-button.strategy.ts

修改：
├── prisma/schema.prisma
├── src/core/bootstrap/app.bootstrap.ts
├── src/platforms/discordeno/commands.json
```

**資料庫 Schema：**

```prisma
model Giveaway {
  id          String   @id @default(cuid())
  guildId     String
  channelId   String
  messageId   String
  prize       String
  winnerCount Int      @default(1)
  endTime     DateTime
  ended       Boolean  @default(false)
  winnerIds   String[] @default([])
  creatorId   String
  createdAt   DateTime @default(now())

  guild       Guild    @relation(fields: [guildId], references: [id], onDelete: Cascade)
  entries     GiveawayEntry[]

  @@index([guildId])
  @@index([endTime])
  @@index([ended])
}

model GiveawayEntry {
  giveawayId String
  userId     String
  enteredAt  DateTime @default(now())

  giveaway   Giveaway @relation(fields: [giveawayId], references: [id], onDelete: Cascade)

  @@id([giveawayId, userId])
  @@index([giveawayId])
}
```

**指令：**

```
/giveaway create prize:<獎品> duration:<時長> [winners:<1-20>]
/giveaway end id:<giveaway_id>
/giveaway reroll id:<giveaway_id> [winners:<數量>]
```

**時長格式：**

```
範例：「1h」、「30m」、「2h30m」、「1d」、「2d12h」
最大：30 天
```

**Embed 格式（進行中）：**

```
🎉 抽獎活動 🎉

獎品：Discord Nitro
主辦人：@username

結束時間：<t:1234567890:R>
參加人數：42

[🎟️ 參加抽獎] (按鈕)
```

**Embed 格式（已結束）：**

```
🎉 抽獎已結束 🎉

獎品：Discord Nitro
主辦人：@username

得獎者：
🏆 @winner1
🏆 @winner2

總參加人數：42
```

**實作重點：**


1. **參加按鈕：**
   * Custom ID：`giveaway:enter:{giveawayId}`
   * 切換參加狀態（加入/離開）
   * 每 60 秒更新按鈕標籤的參加人數
2. **排程器：**
   * 每分鐘檢查：`* * * * *`
   * 查詢 `endTime <= now AND ended = false` 的抽獎
   * 選出得獎者並更新 embed
3. **得獎者選擇：**
   * 使用 `crypto.randomInt()` 確保安全隨機性
   * 確保無重複得獎者
   * 若參加人數不足，全部得獎
4. **通知：**
   * 回覆原訊息宣布得獎者
   * 提及所有得獎者
   * 更新原 embed 顯示「已結束」
5. **簡化範圍：**
   * 無身分組要求
   * 無帳號年齡要求
   * 無加成要求
   * （這些可在未來階段新增）

**Button Strategy 範例：**

```typescript
// giveaway-button.strategy.ts
export class GiveawayButtonStrategy {
  async handle(bot: Bot, interaction: BotInteraction) {
    const customId = interaction.data!.customId!;
    const [, action, giveawayId] = customId.split(':');
    const userId = interaction.user.id.toString();
    
    if (action !== 'enter') return;
    
    try {
      const isEntered = await this.toggleEntry(giveawayId, userId);
      
      await bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
        type: InteractionResponseTypes.ChannelMessageWithSource,
        data: {
          content: isEntered ? '✅ 你已參加抽獎！' : '❌ 你已取消參加',
          flags: MessageFlags.EPHEMERAL,
        },
      });
      
      // Update entry count on button (throttled)
      await this.updateEntryCount(bot, interaction.message!, giveawayId);
    } catch (error) {
      log.error({ error, giveawayId, userId }, 'Failed to toggle giveaway entry');
    }
  }
  
  private async toggleEntry(giveawayId: string, userId: string): Promise<boolean> {
    // Check if already entered
    const existing = await prisma.giveawayEntry.findUnique({
      where: { giveawayId_userId: { giveawayId, userId } },
    });
    
    if (existing) {
      await prisma.giveawayEntry.delete({
        where: { giveawayId_userId: { giveawayId, userId } },
      });
      return false;
    } else {
      await prisma.giveawayEntry.create({
        data: { giveawayId, userId },
      });
      return true;
    }
  }
}
```

**驗證步驟：**

- [ ] 抽獎建立正常
- [ ] 參加按鈕切換正確
- [ ] 參加人數更新
- [ ] 自動開獎正確
- [ ] 得獎者顯示正確
- [ ] 手動結束運作
- [ ] Reroll 運作


***

## Phase 4: 互動功能

### P4-1: Poll 投票系統

**目標：** 建立投票，使用按鈕觸發 select menu 進行投票。

**新增檔案：**

```
Features:
├── src/features/poll/
│   ├── poll.feature.ts
│   ├── poll.module.ts
│   ├── poll.service.ts
│   ├── poll.types.ts
│   └── poll.select.ts

Commands:
├── src/commands/poll/
│   ├── poll.command.ts
│   ├── poll.types.ts
│   ├── poll.helpers.ts
│   ├── internal/
│   └── subcommands/
│       ├── create.ts
│       └── end.ts

Shared:
├── src/shared/poll/
│   └── poll-vote.strategy.ts

修改：
├── prisma/schema.prisma
├── src/core/bootstrap/app.bootstrap.ts
├── src/platforms/discordeno/commands.json
```

**資料庫 Schema：**

```prisma
model Poll {
  id         String   @id @default(cuid())
  guildId    String
  channelId  String
  messageId  String
  question   String
  options    Json     // {id: string, label: string}[]
  multiple   Boolean  @default(false)
  maxChoices Int      @default(1)
  ended      Boolean  @default(false)
  creatorId  String
  createdAt  DateTime @default(now())

  guild      Guild    @relation(fields: [guildId], references: [id], onDelete: Cascade)
  votes      PollVote[]

  @@index([guildId])
  @@index([messageId])
}

model PollVote {
  pollId    String
  userId    String
  choices   String[]
  votedAt   DateTime @default(now())
  updatedAt DateTime @updatedAt

  poll      Poll     @relation(fields: [pollId], references: [id], onDelete: Cascade)

  @@id([pollId, userId])
  @@index([pollId])
}
```

**指令：**

```
/poll create question:<問題> options:<選項1,選項2,...> [multiple:<布林>] [max:<數量>]
/poll end id:<poll_id>
```

**選項輸入：**

```
最多 25 個選項（Discord select menu 限制）
格式：「選項A,選項B,選項C」
以逗號分隔，去除空白
```

**Embed 格式（進行中）：**

```
📊 投票

問題：你最喜歡的顏色是？

結果：
🔵 藍色：15 票（45%）
████████████░░░░░░░░

🔴 紅色：10 票（30%）
████████░░░░░░░░░░░░

🟢 綠色：8 票（25%）
██████░░░░░░░░░░░░░░

總投票數：33

[🗳️ 投票] (按鈕)
```

**實作重點：**


1. **投票按鈕：**
   * Custom ID：`poll:vote:{pollId}`
   * 觸發臨時 select menu
   * 單選：1 個選項，可改票
   * 多選：最多 `maxChoices` 個選項
2. **Select Menu：**
   * 顯示用戶當前選擇作為預設值
   * 最多 25 個選項（Discord 限制）
   * 臨時回應
3. **結果更新：**
   * 每次投票後立即更新
   * 百分比計算至整數
   * 進度條：20 字元最大（`█` 填充，`░` 空白）
4. **多選：**
   * 若 `multiple: true`，用戶可選擇最多 `maxChoices` 個
   * 若 `multiple: false`，用戶選擇剛好 1 個
5. **改票：**
   * 用戶可在投票結束前隨時改票
   * 更新投票記錄，不建立新記錄

**Vote Strategy 範例：**

```typescript
// poll-vote.strategy.ts
export class PollVoteStrategy {
  async handle(bot: Bot, interaction: BotInteraction) {
    const customId = interaction.data!.customId!;
    const [, action, pollId] = customId.split(':');
    
    if (action === 'vote') {
      await this.showVoteMenu(bot, interaction, pollId);
    } else if (action === 'submit') {
      await this.submitVote(bot, interaction, pollId);
    }
  }
  
  private async showVoteMenu(bot: Bot, interaction: BotInteraction, pollId: string) {
    const poll = await this.getPoll(pollId);
    const userVote = await this.getUserVote(pollId, interaction.user.id.toString());
    
    const options = (poll.options as PollOption[]).map(opt => ({
      label: opt.label,
      value: opt.id,
      default: userVote?.choices.includes(opt.id),
    }));
    
    await bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
      type: InteractionResponseTypes.ChannelMessageWithSource,
      data: {
        content: poll.multiple ? `請選擇最多 ${poll.maxChoices} 個選項` : '請選擇一個選項',
        components: [
          {
            type: MessageComponentTypes.ActionRow,
            components: [
              {
                type: MessageComponentTypes.SelectMenu,
                customId: `poll:submit:${pollId}`,
                options,
                minValues: poll.multiple ? 0 : 1,
                maxValues: poll.multiple ? poll.maxChoices : 1,
              },
            ],
          },
        ],
        flags: MessageFlags.EPHEMERAL,
      },
    });
  }
  
  private async submitVote(bot: Bot, interaction: BotInteraction, pollId: string) {
    const selectedValues = interaction.data!.values!;
    const userId = interaction.user.id.toString();
    
    // Upsert vote
    await prisma.pollVote.upsert({
      where: { pollId_userId: { pollId, userId } },
      update: { choices: selectedValues },
      create: { pollId, userId, choices: selectedValues },
    });
    
    // Update poll embed
    await this.updatePollResults(bot, interaction.message!, pollId);
    
    await bot.helpers.sendInteractionResponse(interaction.id, interaction.token, {
      type: InteractionResponseTypes.UpdateMessage,
      data: {
        content: '✅ 你的投票已記錄！',
        components: [],
      },
    });
  }
}
```

**驗證步驟：**

- [ ] 投票建立正常
- [ ] 投票按鈕觸發 select menu
- [ ] 單選投票運作
- [ ] 多選投票運作
- [ ] 最大選擇數強制執行
- [ ] 改票運作
- [ ] 結果更新正確
- [ ] 百分比計算正確
- [ ] 進度條渲染正確
- [ ] 結束投票運作


***

### P4-2: Say 指令

**目標：** 讓機器人在指定頻道發送自訂 embed。

**新增檔案：**

```
Commands:
├── src/commands/say/
│   ├── say.command.ts
│   ├── say.types.ts
│   ├── internal/
│   └── say.helpers.ts

修改：
├── src/platforms/discordeno/commands.json
├── src/core/bootstrap/app.bootstrap.ts
```

**指令：**

```
/say channel:<頻道> message:<內容> [title:<標題>] [color:<十六進位>]
```

**實作重點：**


1. **權限：**
   * 需要 `ADMINISTRATOR` 權限
   * 檢查機器人在目標頻道的權限
2. **預覽：**
   * 在臨時訊息顯示 embed 預覽
   * 新增確認按鈕（發送 / 取消）
   * 30 秒逾時
3. **Markdown 支援：**
   * Discord markdown（粗體、斜體、程式碼等）
   * 提及（@用戶、@身分組、#頻道）
   * 表情符號（自訂與 Unicode）
4. **顏色：**
   * 接受十六進位格式：`#FF5733` 或 `FF5733`
   * 預設：機器人主題色
   * 驗證十六進位格式

**實作範例：**

```typescript
// say.command.ts
export async function handleSay(
  bot: Bot,
  interaction: BotInteraction,
  guildId: string,
  sub: InteractionDataOption
) {
  const channelId = getOptionValue<string>(sub, 'channel')!;
  const message = getOptionValue<string>(sub, 'message')!;
  const title = getOptionValue<string>(sub, 'title');
  const colorHex = getOptionValue<string>(sub, 'color');
  
  // Check user permission
  const hasPermission = await checkAdminPermission(bot, guildId, interaction.user.id);
  if (!hasPermission) {
    await replyError(bot, interaction, {
      description: '你需要 `管理員` 權限才能使用此指令',
    });
    return;
  }
  
  // Parse color
  const color = colorHex ? parseHexColor(colorHex) : EmbedColors.PRIMARY;
  
  // Show preview
  const embed = {
    title,
    description: message,
    color,
  };
  
  const confirmed = await showConfirmation(bot, interaction, {
    title: '📝 預覽訊息',
    embeds: [embed],
    description: `將在 <#${channelId}> 發送以上訊息`,
    confirmLabel: '發送',
    confirmStyle: ButtonStyle.SUCCESS,
  });
  
  if (!confirmed) return;
  
  // Send message
  try {
    await bot.helpers.sendMessage(channelId, { embeds: [embed] });
    await replySuccess(bot, interaction, {
      description: `✅ 訊息已發送至 <#${channelId}>`,
    });
  } catch (error: any) {
    await replyAutoError(bot, interaction, error);
  }
}
```

**驗證步驟：**

- [ ] 權限檢查運作
- [ ] 預覽正確顯示
- [ ] 確認機制運作
- [ ] Markdown 渲染
- [ ] 顏色解析運作
- [ ] 訊息發送至正確頻道


***

### P4-3: Choose 指令

**目標：** 從用戶提供的選項中隨機選擇。

**新增檔案：**

```
Commands:
├── src/commands/choose/
│   ├── choose.command.ts
│   ├── internal/
│   └── choose.helpers.ts

修改：
├── src/platforms/discordeno/commands.json
├── src/core/bootstrap/app.bootstrap.ts
```

**指令：**

```
/choose options:<選項1,選項2,選項3...>
```

**回應格式：**

```
🎲 隨機選擇

選項：選項A、選項B、選項C

選中：**選項B**
```

**實作重點：**


1. **輸入：**
   * 最少 2 個選項，最多 25 個選項
   * 以逗號分隔
   * 去除每個選項的空白
2. **隨機選擇：**
   * 使用 `crypto.randomInt(0, options.length)`
   * 確保加密安全的隨機性
3. **顯示：**
   * 顯示所有選項
   * 以粗體標示選中的選項

**實作範例：**

```typescript
// choose.command.ts
export async function handleChoose(
  bot: Bot,
  interaction: BotInteraction
) {
  const optionsStr = getOptionValue<string>(interaction.data!.options![0], 'options')!;
  const options = optionsStr.split(',').map(opt => opt.trim()).filter(opt => opt.length > 0);
  
  // Validate
  if (options.length < 2) {
    await replyError(bot, interaction, {
      description: '至少需要 2 個選項',
    });
    return;
  }
  
  if (options.length > 25) {
    await replyError(bot, interaction, {
      description: '最多只能有 25 個選項',
    });
    return;
  }
  
  // Random selection
  const selectedIndex = crypto.randomInt(0, options.length);
  const selected = options[selectedIndex];
  
  const embed = {
    title: '🎲 隨機選擇',
    color: EmbedColors.INFO,
    fields: [
      {
        name: '選項',
        value: options.join('、'),
        inline: false,
      },
      {
        name: '選中',
        value: `**${selected}**`,
        inline: false,
      },
    ],
  };
  
  await replySuccess(bot, interaction, { embeds: [embed] });
}
```

**驗證步驟：**

- [ ] 最小/最大選項強制執行
- [ ] 隨機選擇運作
- [ ] 所有選項顯示
- [ ] 選中選項標示


***

### P4-4: Fortune 指令

**目標：** 有趣的算命功能，加權隨機結果。

**新增檔案：**

```
Commands:
├── src/commands/fortune/
│   ├── fortune.command.ts
│   ├── fortune.types.ts
│   ├── internal/
│   └── fortune.responses.ts

修改：
├── src/platforms/discordeno/commands.json
├── src/core/bootstrap/app.bootstrap.ts
```

**指令：**

```
/fortune [question:<問題>]
```

**運勢類型：**

```typescript
enum FortuneType {
  GREAT_BLESSING = 'GREAT_BLESSING',  // 大吉 - 10%
  BLESSING = 'BLESSING',              // 吉 - 30%
  MODERATE = 'MODERATE',              // 中吉 - 30%
  SMALL_BLESSING = 'SMALL_BLESSING',  // 小吉 - 20%
  MISFORTUNE = 'MISFORTUNE',          // 凶 - 10%
}
```

**回應格式：**

```
🔮 運勢

問題：我今年會升職嗎？

結果：🌟 大吉

訊息：「今天是你的幸運日！偉大的機會等著你。」
```

**實作重點：**


1. **加權隨機：**
   * 生成隨機數 1-100
   * 依機率映射到運勢類型
   * 1-10：大吉
   * 11-40：吉
   * 41-70：中吉
   * 71-90：小吉
   * 91-100：凶
2. **回應：**
   * 每個運勢類型有 5-10 則預設訊息
   * 隨機選擇該類型的一則訊息
   * 訊息可通用或主題化
3. **Embed 顏色：**
   * 大吉：金色 `#FFD700`
   * 吉：綠色 `#00FF00`
   * 中吉：藍色 `#0099FF`
   * 小吉：黃色 `#FFFF00`
   * 凶：紅色 `#FF0000`
4. **問題：**
   * 選填欄位
   * 若提供，顯示在 embed 中
   * 若未提供，顯示通用運勢

**實作範例：**

```typescript
// fortune.command.ts
export async function handleFortune(
  bot: Bot,
  interaction: BotInteraction
) {
  const question = getOptionValue<string>(interaction.data!.options?.[0], 'question');
  
  // Weighted random selection
  const roll = crypto.randomInt(1, 101);
  const fortuneType = getFortuneType(roll);
  const message = getRandomMessage(fortuneType);
  const config = getFortuneConfig(fortuneType);
  
  const embed = {
    title: '🔮 運勢',
    color: config.color,
    fields: [
      question ? {
        name: '問題',
        value: question,
        inline: false,
      } : null,
      {
        name: '結果',
        value: `${config.emoji} ${config.label}`,
        inline: false,
      },
      {
        name: '訊息',
        value: `「${message}」`,
        inline: false,
      },
    ].filter(f => f !== null),
  };
  
  await replySuccess(bot, interaction, { embeds: [embed] });
}

function getFortuneType(roll: number): FortuneType {
  if (roll <= 10) return FortuneType.GREAT_BLESSING;
  if (roll <= 40) return FortuneType.BLESSING;
  if (roll <= 70) return FortuneType.MODERATE;
  if (roll <= 90) return FortuneType.SMALL_BLESSING;
  return FortuneType.MISFORTUNE;
}

function getFortuneConfig(type: FortuneType) {
  const configs = {
    [FortuneType.GREAT_BLESSING]: {
      emoji: '🌟',
      label: '大吉',
      color: 0xFFD700,
    },
    [FortuneType.BLESSING]: {
      emoji: '✨',
      label: '吉',
      color: 0x00FF00,
    },
    [FortuneType.MODERATE]: {
      emoji: '🔵',
      label: '中吉',
      color: 0x0099FF,
    },
    [FortuneType.SMALL_BLESSING]: {
      emoji: '⭐',
      label: '小吉',
      color: 0xFFFF00,
    },
    [FortuneType.MISFORTUNE]: {
      emoji: '💀',
      label: '凶',
      color: 0xFF0000,
    },
  };
  
  return configs[type];
}
```

**fortune.responses.ts：**

```typescript
export const fortuneMessages: Record<FortuneType, string[]> = {
  [FortuneType.GREAT_BLESSING]: [
    '今天是你的幸運日！偉大的機會等著你。',
    '諸事大吉，萬事如意！',
    '好運降臨，心想事成！',
    '貴人相助，事半功倍！',
    '幸運之星照耀著你！',
  ],
  [FortuneType.BLESSING]: [
    '運勢不錯，保持積極的心態！',
    '好事即將發生，請耐心等待。',
    '今日適合嘗試新事物。',
    '努力會有回報。',
    '保持樂觀，好運自然來。',
  ],
  // ... 其他類型
};
```

**驗證步驟：**

- [ ] 加權隨機分佈正確
- [ ] 所有運勢類型出現
- [ ] 訊息隨機化
- [ ] Embed 顏色正確
- [ ] 有問題時顯示
- [ ] 無問題時運作


***

## 📋 通用驗證清單

每個 Phase 完成後執行：

### 程式碼品質

- [ ] 無 TypeScript `any` 類型
- [ ] 所有函數有英文 JSDoc 註解
- [ ] 遵循現有程式碼風格
- [ ] 無 `console.log`，使用 `createLogger()`
- [ ] 無 magic numbers，使用 `@core/config/constants` 的常數

### 錯誤處理

- [ ] Discord API 呼叫包裝在 try-catch
- [ ] Discord 錯誤使用 `DiscordErrorHandler`
- [ ] 資料庫操作包裝在 try-catch
- [ ] Observable streams 有外層 `catchError`
- [ ] 用戶收到友善的錯誤訊息

### 效能與資源

- [ ] 無記憶體洩漏
- [ ] 資料庫查詢使用 runtime selectors
- [ ] 無 N+1 查詢問題
- [ ] 考慮 API 速率限制
- [ ] cleanup 中正確 unsubscribe

### 測試

- [ ] 基本功能測試通過
- [ ] 錯誤情境測試通過
- [ ] 權限檢查測試通過
- [ ] 回歸測試通過
- [ ] 24 小時穩定性測試（針對排程器）


***

## 🔧 開發最佳實踐

### Discord API


1. Discord API 優先，資料庫其次
2. 使用 `@core/errors/discord-error-codes` 的錯誤碼常數
3. 操作前檢查機器人權限
4. 優雅處理速率限制

### Database


1. 高頻查詢使用 runtime selectors
2. 新增適當的索引
3. 小心使用 cascade delete
4. 避免 N+1 查詢

### RxJS


1. Observable streams 需要外層 `catchError`
2. 記得在 `cleanup()` 中 unsubscribe
3. 使用 `lastValueFrom()` 轉換為 Promise
4. 選擇適當的 operator（concatMap vs mergeMap）

### Logging


1. 使用結構化日誌，物件在前
2. 不記錄敏感資訊
3. 包含足夠的上下文（guildId、userId 等）
4. 使用適當的日誌等級（info/warn/error）


***

## 🎯 實作優先順序總結

**Phase 1: 通知系統統一化** → **Phase 2: 核心通知功能** → **Phase 3: 管理功能** → **Phase 4: 互動功能**

Phase 1-2 為高優先級。Phase 3-4 可依需求調整。


***