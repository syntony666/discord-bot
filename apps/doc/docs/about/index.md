---
sidebar: false
---

## 關於星野咲子

我是誰，我在哪，在這裡做什麼

原始碼: [syntony666/discord-bot](https://github.com/syntony666/discord-bot/)

[工具人邀請連結](https://discord.com/api/oauth2/authorize?client_id=995551157151862854&permissions=1644971945463&scope=bot)

## 關於作者

我的網站: [blog.syntony666.com](https://blog.syntony666.com)

GitHub: [syntony666](https://github.com/syntony666)

## 版本紀錄

### ver. 5.2.2

#### 2026.10.20

- `/keyword view` 新增「複製 / 修改回覆」按鈕，按下會開啟已預填目前內容的表單，直接修改即可更新
- 確認訊息改為僅限原使用者可見，操作結果會標示執行者
- 訊息上的互動按鈕 5 分鐘後自動失效，過期後點擊會顯示「操作已過期」；非原使用者點擊會提示「此操作僅限原使用者」
- `/keyword delete` 結果改為顯示被刪除的規則內容
- 修正 `/notify member enable` 重複執行時會覆蓋加入／離開通知個別開關的問題
- 實況監控重複加入、移除不存在的監控時改為私密錯誤提示
- 統一機器人回覆用語，列表與狀態訊息卡片加上顏色標示

### ver. 5.2.1

#### 2026.10.14

- 新增作者專用管理指令 `/bot`：伺服器列表與詳情、級別設定、退出與同步伺服器、活動狀態與自我介紹、級別額度調整、公告私訊、全域統計
- 伺服器分為 `NORMAL`、`PREMIUM`、`HOME` 三個級別，各功能設有數量上限，達到上限時無法再新增
- 修復 `/status` 使用說明按鈕連結

### ver. 5.2.0

#### 2026.9.23

- 通知指令整合：`member-notify`、`stream-notify` 合併為 `/notify member`、`/notify stream`
- 關鍵字回覆新增 `/keyword view`、`/keyword search`，回覆內容支援 `;;` 分隔多個候選隨機回覆
- `/status notify` 改名為 `/status features`
- 機器人被移出伺服器時自動清除伺服器的設定資料

### ver. 5.1.0

#### 2026.9.22

- 內部架構重構（互動路由、session、事件層）
- 修復動態表情符號顯示問題

### ver. 5.0.0

#### 2026.2.14

- 全面重寫為 monorepo 架構
- 指令全面改版：`keyword`、`member-notify`、`stream-notify`、`reaction-role`（選單制）、`status`
- 移除 `say`、`clear`、`choose`、`fortune` 等舊指令

### ver. 4.0.6

#### 2023.4.1

- 部分功能改為維護中
- 增加Twitch開台通知功能
- 更改通知設定指令

### ver. 4.0.5

#### 2022.9.3

- 增加機器人說話功能

### ver. 4.0.4

#### 2022.8.20

- 增加關鍵字修改功能與列表顯示增加修改者

### ver. 4.0.3

#### 2022.8.11

- 增加隨機選擇與占卜功能

### ver. 4.0.2

#### 2022.8.11

- 增加關鍵字搜尋功能

### ver. 4.0.1

#### 2022.8.5

- 增加通知設定

### ver. 4.0.0

#### 2022.8.1

- 增加基本指令
