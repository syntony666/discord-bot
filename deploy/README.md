# Ubuntu VM 部署資料夾

此資料夾可直接複製到 VM，執行初次部署與 systemd 設定。

## 內容

- `ubuntu-first-deploy.sh`: 初次部署/更新腳本（含 Node.js 安裝與 systemd 設定）

## 使用方式

1. 將 `deploy/` 資料夾上傳到 VM
2. 在 `deploy/` 所在目錄執行：
   ```bash
   sudo bash deploy/ubuntu-first-deploy.sh
   ```
3. 第一次會產生 `/opt/discord-bot/.env`，請填值後再跑一次
4. 腳本會自動從 GitHub 拉取專案到 `/opt/discord-bot`

## 更新專案

```bash
sudo bash deploy/ubuntu-first-deploy.sh
```

## 常用指令

```bash
sudo systemctl status discord-bot --no-pager
sudo systemctl restart discord-bot
sudo journalctl -u discord-bot -f
```
