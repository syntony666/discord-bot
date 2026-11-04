import { fileURLToPath } from 'node:url';
import { defineConfig, type HeadConfig } from 'vitepress';
import { BOT_VERSION } from './version.mts';

const HOSTNAME = 'https://discord-bot.syntony666.com';
const OG_IMAGE = 'https://cdn.jsdelivr.net/gh/syntony666/cdn/SakikoHoshino-512x512.png';
const DESCRIPTION =
  '星野咲子 Discord 機器人使用文件：關鍵字自動回覆、反應身分組、實況開台通知、成員進出通知的設定與指令說明。';

export default defineConfig({
  srcDir: 'pages',
  outDir: 'site',
  vite: {
    publicDir: fileURLToPath(new URL('../public', import.meta.url)),
  },
  title: '星野咲子',
  description: DESCRIPTION,
  lang: 'zh-TW',
  appearance: 'force-dark',
  lastUpdated: true,
  sitemap: { hostname: HOSTNAME },
  head: [
    ['script', {}, "document.documentElement.dataset.theme='umbra'"],
    ['link', { rel: 'icon', href: OG_IMAGE }],
    ['meta', { name: 'theme-color', content: '#1c1917' }],
    ['meta', { name: 'apple-mobile-web-app-capable', content: 'yes' }],
    ['meta', { name: 'apple-mobile-web-app-status-bar-style', content: 'black' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:site_name', content: '星野咲子' }],
    ['meta', { property: 'og:image', content: OG_IMAGE }],
    ['meta', { property: 'og:locale', content: 'zh_TW' }],
    ['meta', { name: 'twitter:card', content: 'summary' }],
    ['meta', { name: 'twitter:image', content: OG_IMAGE }],
  ],
  transformHead({ pageData }) {
    const head: HeadConfig[] = [];
    const path = pageData.relativePath.replace(/index\.md$/, '').replace(/\.md$/, '/');
    const url = `${HOSTNAME}/${path}`;
    const title = pageData.frontmatter.title || pageData.title || '星野咲子';
    const description = pageData.frontmatter.description || pageData.description || DESCRIPTION;

    head.push(['link', { rel: 'canonical', href: url }]);
    head.push(['meta', { property: 'og:url', content: url }]);
    head.push(['meta', { property: 'og:title', content: title }]);
    head.push(['meta', { property: 'og:description', content: description }]);
    head.push(['meta', { name: 'twitter:title', content: title }]);
    head.push(['meta', { name: 'twitter:description', content: description }]);

    if (pageData.relativePath === 'index.md') {
      head.push([
        'script',
        { type: 'application/ld+json' },
        JSON.stringify({
          '@context': 'https://schema.org',
          '@graph': [
            {
              '@type': 'WebSite',
              name: '星野咲子',
              url: `${HOSTNAME}/`,
              inLanguage: 'zh-TW',
            },
            {
              '@type': 'SoftwareApplication',
              name: '星野咲子',
              applicationCategory: 'CommunicationApplication',
              operatingSystem: 'Discord',
              url: `${HOSTNAME}/`,
              description:
                'Discord 機器人，提供關鍵字自動回覆、反應身分組、實況開台通知與成員進出通知。',
              inLanguage: 'zh-TW',
              author: {
                '@type': 'Person',
                name: 'syntony666',
                url: 'https://blog.syntony666.com',
              },
              offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
            },
          ],
        }),
      ]);
    }
    return head;
  },
  themeConfig: {
    logo: OG_IMAGE,
    nav: [
      { text: '指令說明', link: '/command/' },
      { text: '關於', link: '/about/' },
      { text: '隱私權政策', link: '/privacy/' },
      {
        text: '邀請連結',
        link: 'https://discord.com/api/oauth2/authorize?client_id=995551157151862854&permissions=1644971945463&scope=bot',
      },
    ],
    socialLinks: [{ icon: 'github', link: 'https://github.com/syntony666/discord-bot' }],
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
                footer: { selectText: '選擇', navigateText: '切換', closeText: '關閉' },
              },
            },
          },
        },
      },
    },
    outline: { label: '本頁目錄' },
    lastUpdated: { text: '最後更新' },
    docFooter: { prev: '上一頁', next: '下一頁' },
    darkModeSwitchLabel: '外觀',
    sidebarMenuLabel: '目錄',
    returnToTopLabel: '回到頂部',
    footer: {
      message: `Made by syntony666 ☻ Powered by VitePress · ver. ${BOT_VERSION}`,
    },
  },
});
