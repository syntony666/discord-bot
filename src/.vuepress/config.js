const { description } = require('../../package');
const { defaultTheme } = require('@vuepress/theme-default');

module.exports = {
  /**
   * Ref：https://v1.vuepress.vuejs.org/config/#title
   */
  title: '黒井闇子',
  /**
   * Ref：https://v1.vuepress.vuejs.org/config/#description
   */
  description: description,
  theme: '@vuepress/theme-default',

  /**
   * Extra tags to be injected to the page HTML `<head>`
   *
   * ref：https://v1.vuepress.vuejs.org/config/#head
   */
  head: [
    ['meta', { name: 'theme-color', content: '#3eaf7c' }],
    ['meta', { name: 'apple-mobile-web-app-capable', content: 'yes' }],
    ['meta', { name: 'apple-mobile-web-app-status-bar-style', content: 'black' }]
  ],

  /**
   * Theme configuration, here is the default theme configuration for VuePress.
   *
   * ref：https://v1.vuepress.vuejs.org/theme/default-theme-config.html
   */
  theme: defaultTheme({
    colorMode: 'dark',
    repo: '',
    editLinks: false,
    docsDir: '',
    editLinkText: '',
    lastUpdated: false,
    navbar: [
      {
        text: '指令說明',
        link: '/command/'
      },
      {
        text: '關於',
        link: '/about/',
      },
      {
        text: '隱私權政策',
        link: '/announce/',
      },
      {
        text: '工具人邀請連結',
        link: 'https://discord.com/api/oauth2/authorize?client_id=995551157151862854&permissions=1644971945463&scope=bot'
      }
    ],
    sidebar: {
    },
    contributors: false
  }),

  /**
   * Apply plugins，ref：https://v1.vuepress.vuejs.org/zh/plugin/
   */
  plugins: [
    '@vuepress/plugin-back-to-top',
    '@vuepress/plugin-medium-zoom',
  ]
}
