import { defineConfig } from 'vitepress'

export default defineConfig({
  title: '黒井闇子',
  description: 'Discord Bot Document',
  appearance: 'dark',
  head: [
    ['meta', { name: 'theme-color', content: '#3eaf7c' }],
    ['meta', { name: 'apple-mobile-web-app-capable', content: 'yes' }],
    ['meta', { name: 'apple-mobile-web-app-status-bar-style', content: 'black' }]
  ],
  themeConfig: {
    nav: [
      { text: '指令說明', link: '/command/' },
      { text: '關於', link: '/about/' },
      { text: '隱私權政策', link: '/announce/' },
      {
        text: '工具人邀請連結',
        link: 'https://discord.com/api/oauth2/authorize?client_id=995551157151862854&permissions=1644971945463&scope=bot'
      }
    ],
    footer: {
      message: 'Made by syntony666 ☻ Powered by VitePress'
    }
  }
})
