import { defineConfig } from 'vitepress'

export default defineConfig({
  title: '星野咲子',
  description: 'Discord Bot Document',
  lang: 'zh-TW',
  appearance: 'dark',
  lastUpdated: true,
  head: [
    ['link', { rel: 'icon', href: 'https://cdn.jsdelivr.net/gh/syntony666/cdn/SakikoHoshino-512x512.png' }],
    ['meta', { name: 'theme-color', content: '#3eaf7c' }],
    ['meta', { name: 'apple-mobile-web-app-capable', content: 'yes' }],
    ['meta', { name: 'apple-mobile-web-app-status-bar-style', content: 'black' }]
  ],
  themeConfig: {
    logo: 'https://cdn.jsdelivr.net/gh/syntony666/cdn/SakikoHoshino-512x512.png',
    nav: [
      { text: '指令說明', link: '/command/' },
      { text: '關於', link: '/about/' },
      { text: '隱私權政策', link: '/announce/' },
      {
        text: '工具人邀請連結',
        link: 'https://discord.com/api/oauth2/authorize?client_id=995551157151862854&permissions=1644971945463&scope=bot'
      }
    ],
    socialLinks: [
      { icon: 'github', link: 'https://github.com/syntony666/discord-bot-doc' }
    ],
    search: {
      provider: 'local',
      options: {
        locales: {
          root: {
            translations: {
              button: { buttonText: '搜尋', buttonAriaLabel: '搜尋' },
              modal: {
                noResultsText: '找不到相關結果',
                resetButtonTitle: '清除搜尋',
                footer: { selectText: '選擇', navigateText: '切換', closeText: '關閉' }
              }
            }
          }
        }
      }
    },
    outline: { label: '本頁目錄' },
    lastUpdated: { text: '最後更新' },
    docFooter: { prev: '上一頁', next: '下一頁' },
    darkModeSwitchLabel: '外觀',
    sidebarMenuLabel: '目錄',
    returnToTopLabel: '回到頂部',
    footer: {
      message: 'Made by syntony666 ☻ Powered by VitePress'
    }
  }
})
