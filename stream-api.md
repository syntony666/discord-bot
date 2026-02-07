<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

# 我想做一下圖奇的開台通知 大致上api的使用跟大綱是甚麼 我會把這個交給另一個ai agent讓他幫我開發圖奇的開台通知

我來為你整理 Twitch 開台通知的 API 使用方式和實作大綱,這樣你就可以交給 AI agent 來開發。

## 核心機制:EventSub Webhook

Twitch 使用 **EventSub** 系統來推送開台通知,主要透過 webhook 方式接收事件。[^1_1]

## API 使用流程

### 1. 準備工作

**取得 API 憑證**:[^1_2]

- 建立 Twitch 帳號並註冊 Twitch 開發者帳號
- 在開發者控制台註冊應用程式
- 取得 Client ID 和 Client Secret
- 設定 OAuth 重定向 URL

**建立 Webhook 伺服器**:[^1_1]

- 必須使用 SSL (HTTPS)
- 監聽 443 port
- 能快速回應請求(幾秒內),否則訂閱會被撤銷


### 2. 訂閱 stream.online 事件

使用 **Create EventSub Subscription** API:[^1_3]

- Endpoint: `POST https://api.twitch.tv/helix/eventsub/subscriptions`
- 訂閱類型: `stream.online`
- 需提供 webhook callback URL 和 secret


### 3. Webhook 處理邏輯

你的伺服器需處理三種通知類型:[^1_1]

**驗證請求 (webhook_callback_verification)**:

- 訂閱時 Twitch 會發送驗證請求
- 回傳 200 狀態碼和 challenge 值
- Content-Type 設為 `text/plain`

**開台通知 (notification)**:

- Header `Twitch-Eventsub-Message-Type` 為 `notification`
- `event` 欄位包含直播資訊(broadcaster_user_id, broadcaster_user_name 等)[^1_1]
- 回傳 204 狀態碼
- 延遲約 45 秒[^1_4]

**撤銷通知 (revocation)**:

- 訂閱被撤銷時收到
- 回傳 2XX 狀態碼


### 4. 訊息驗證

使用 HMAC-SHA256 驗證訊息來源:[^1_1]

- Secret 長度 10-100 字元
- 串接 `Message-Id` + `Message-Timestamp` + `Request Body`
- 比對 `Twitch-Eventsub-Message-Signature` header


## 開發大綱

```
1. 環境設定
   - 建立 Node.js/Python 專案
   - 安裝 Express/Flask 框架
   - 設定 SSL 憑證

2. OAuth 授權流程
   - 實作 OAuth 2.0 取得 access token
   - 儲存 Client ID 和 Secret

3. Webhook 伺服器
   - POST /eventsub 路由
   - 訊息驗證中介層
   - 處理三種通知類型

4. 訂閱管理
   - 呼叫 Create EventSub Subscription API
   - 訂閱 stream.online 事件
   - 指定要監聽的 broadcaster_user_id

5. 開台通知處理
   - 解析 event 資料
   - 發送通知(Discord webhook/簡訊/郵件等)
   - 可選:呼叫 Get Streams API 取得更多直播資訊[web:7]

6. 錯誤處理
   - 訂閱撤銷處理
   - 重複訊息去重
   - 回應逾時處理
```


## 參考 Node.js 程式碼範例

Twitch 官方文件提供完整的 Express 範例,包含:[^1_1]

- HMAC 簽章驗證
- 三種通知類型處理
- 適合作為開發基礎


## 替代方案

如果不想自建伺服器,可考慮:

- **Streamcord**: Discord 機器人,簡單設定即可開台通知[^1_5]
- **WebSocket**: EventSub 也支援 WebSocket 連線方式[^1_6]

這份大綱應該足夠讓 AI agent 理解完整流程並開發出 Twitch 開台通知系統了。
<span style="display:none">[^1_10][^1_7][^1_8][^1_9]</span>

<div align="center">⁂</div>

[^1_1]: https://dev.twitch.tv/docs/eventsub/handling-webhook-events

[^1_2]: https://www.freecodecamp.org/chinese/news/a-python-project-in-30-lines-of-code-how-to-set-up-an-sms-notification-when-your-favorite-twitcher-is-streaming/

[^1_3]: https://dev.twitch.tv/docs/api/reference

[^1_4]: https://www.courier.com/blog/how-to-send-notifications-about-twitch-stream

[^1_5]: https://www.oumi.blog/【discord】利用streamcord自動發twitch開台通知/

[^1_6]: https://discuss.dev.twitch.com/t/getting-notifications-when-streamers-goes-live/46958

[^1_7]: https://discuss.dev.twitch.com/t/receiving-webhook-with-data-when-streamer-goes-live/30807

[^1_8]: https://dev.twitch.tv/docs/cli/event-command

[^1_9]: https://www.reddit.com/r/Twitch/comments/lgfkwz/getting_the_is_live_status_for_a_specific/

[^1_10]: https://stackoverflow.com/questions/49653494/how-to-show-status-of-current-twitch-streams


---

# 那youtube 官方有類似的eventsub嗎 還是只能靠限額下去做 只希望使用官方作法 以提升穩定性

也是寫出一套方案給ai agent去實作

YouTube 確實有官方的 push notification 機制,但有**重大限制**。讓我詳細說明:

## YouTube 官方 PubSubHubbub 機制的限制

YouTube Data API v3 支援 **PubSubHubbub (WebSub)** 推送通知,但只涵蓋以下事件:[^2_1][^2_2]

- 上傳新影片
- 更新影片標題
- 更新影片描述

**關鍵問題**:這個機制**不會在直播開始時發送通知**。根據開發者實測,只有在直播期間修改標題或描述時才會收到 ping,直播結束後處理完畢才會收到更新通知。[^2_3]

## 官方解決方案:輪詢 Live Streaming API

由於 PubSubHubbub 無法偵測開台,官方穩定做法是使用 **YouTube Live Streaming API** 進行輪詢:[^2_4][^2_5]

### API 端點

```
GET https://www.googleapis.com/youtube/v3/liveBroadcasts
```

參數設定:[^2_6]

- `part=id,snippet,status`
- `broadcastStatus=active` (過濾出正在直播的頻道)
- `channelId={CHANNEL_ID}` 或 `mine=true`
- `key={YOUR_API_KEY}`


## 開發大綱(給 AI agent)

```
1. Google Cloud 專案設定
   - 建立 Google Cloud 專案
   - 啟用 YouTube Data API v3
   - 建立 API 金鑰或 OAuth 2.0 憑證
   - 配額:每日 10,000 單位(每次查詢消耗 1-100 單位)

2. OAuth 2.0 授權(若需查詢特定頻道)
   - 實作 OAuth 2.0 流程
   - 取得 access token 和 refresh token
   - 權限範圍:youtube.readonly

3. 輪詢排程器
   - 使用 cron job 或 setInterval
   - 建議輪詢間隔:1-5 分鐘(視配額和需求調整)
   - 儲存上次查詢狀態以偵測變化

4. Live Broadcasts API 查詢
   - 呼叫 liveBroadcasts 端點
   - 檢查回傳的 lifeCycleStatus 是否為 "live"
   - 解析 snippet 取得直播標題、描述等資訊

5. 狀態變化偵測
   - 比對當前狀態與上次快取狀態
   - 偵測從 offline -> live 的轉換
   - 去重處理,避免重複通知

6. 通知發送
   - 偵測到開台時觸發通知
   - 發送至 Discord/Telegram/Email 等
   - 記錄通知歷史

7. 配額管理
   - 監控 API 配額使用量
   - 實作指數退避策略處理限流
   - 考慮多頻道時批次查詢優化
```


## 配額考量

YouTube Data API 每日配額為 **10,000 單位**。`liveBroadcasts.list` 查詢約消耗 1 單位,若輪詢間隔 5 分鐘,每日約消耗:[^2_7]

- 單一頻道:288 單位/天
- 可監控約 30+ 個頻道


## 替代方案比較

| 方案 | 穩定性 | 即時性 | 配額消耗 |
| :-- | :-- | :-- | :-- |
| **輪詢 liveBroadcasts API** | 高(官方支援) | 中(1-5分鐘延遲) | 可控制 |
| PubSubHubbub | 高 | 高 | 無 |
| 檢查 /channel/ID/live 重定向 | 中(非官方) | 高 | 低 |

**結論**:目前 YouTube **沒有類似 Twitch EventSub 的直播開台 webhook**。官方穩定做法是輪詢 `liveBroadcasts` API,雖然需要消耗配額,但在合理輪詢間隔下(3-5分鐘)可維持良好穩定性。[^2_5][^2_4]

這份方案應該足夠讓 AI agent 實作基於官方 API 的 YouTube 開台監控系統。
<span style="display:none">[^2_10][^2_11][^2_8][^2_9]</span>

<div align="center">⁂</div>

[^2_1]: https://developers.google.com/youtube/v3/guides/push_notifications

[^2_2]: https://discuss.dev.twitch.com/t/receiving-webhook-with-data-when-streamer-goes-live/30807

[^2_3]: https://stackoverflow.com/questions/44615704/push-notifications-for-new-live-broadcasts-via-pubsubhubbub

[^2_4]: https://stackoverflow.com/questions/52472700/need-an-api-or-webhook-for-youtube-streaming-notification

[^2_5]: https://stackoverflow.com/questions/46558476/is-there-a-way-to-get-notifications-from-youtube-api-when-broadcaster-is-live/46560842

[^2_6]: https://stackoverflow.com/questions/22310972/using-youtube-api-v3-to-tell-if-a-channel-has-a-live-stream

[^2_7]: https://developers.google.com/youtube/v3/live/getting-started

[^2_8]: https://www.youtube.com/watch?v=QQSJGS2JR4w

[^2_9]: https://developers.google.com/youtube/v3/guides/push_notifications?hl=en

[^2_10]: https://dev.to/algodame/how-to-subscribe-to-and-receive-push-notifications-from-youtubes-api-using-typescript-and-nodejs-2gik

[^2_11]: https://developers.google.com/youtube/v3/live/docs/liveBroadcasts

