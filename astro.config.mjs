// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import cloudflare from '@astrojs/cloudflare';
import tailwindcss from '@tailwindcss/vite';

const site = 'https://learn.ratishfolio.com';

export default defineConfig({
  site,
  integrations: [
    starlight({
      title: 'AI Engineering Notes',
      description: 'Learning AI engineering in public, one topic at a time.',
      defaultLocale: 'en',
      logo: {
        light: './src/assets/logo-light.svg',
        dark: './src/assets/logo-dark.svg',
        alt: 'AI Engineering Notes',
      },
      head: [
        { tag: 'script', attrs: { src: '/pane-resize.js' } },
        { tag: 'link', attrs: { rel: 'icon', href: '/favicon-32.png', sizes: '32x32', type: 'image/png' } },
        { tag: 'link', attrs: { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' } },
        { tag: 'meta', attrs: { name: 'theme-color', content: '#f6f1e7', media: '(prefers-color-scheme: light)' } },
        { tag: 'meta', attrs: { name: 'theme-color', content: '#12100d', media: '(prefers-color-scheme: dark)' } },
        { tag: 'meta', attrs: { name: 'twitter:site', content: '@ratishtwts' } },
        { tag: 'meta', attrs: { name: 'twitter:creator', content: '@ratishtwts' } },
        { tag: 'meta', attrs: { property: 'og:image', content: `${site}/og-default.png` } },
        { tag: 'meta', attrs: { property: 'og:image:width', content: '1200' } },
        { tag: 'meta', attrs: { property: 'og:image:height', content: '630' } },
        { tag: 'meta', attrs: { property: 'og:image:alt', content: 'AI Engineering Notes: learn AI engineering, one topic at a time' } },
        { tag: 'meta', attrs: { name: 'twitter:image', content: `${site}/og-default.png` } },
        { tag: 'meta', attrs: { name: 'twitter:image:alt', content: 'AI Engineering Notes: learn AI engineering, one topic at a time' } },
        {
          tag: 'script',
          attrs: { type: 'application/ld+json' },
          content: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            name: 'AI Engineering Notes',
            url: site,
            description: 'Learning AI engineering in public, one topic at a time.',
            inLanguage: 'en',
            author: { '@type': 'Person', name: 'Ratish Jain', url: 'https://www.ratishfolio.com', sameAs: ['https://x.com/ratishtwts', 'https://github.com/ratishjain12'] },
          }),
        },
      ],
      routeMiddleware: './src/routeData.ts',
      social: [
        { icon: 'x.com', label: 'X', href: 'https://x.com/ratishtwts' },
        { icon: 'github', label: 'GitHub', href: 'https://github.com/ratishjain12/ai-engineering-notes' },
      ],
      customCss: ['./src/styles/global.css'],
      sidebar: [
        {
          label: 'Large Language Models',
          items: [{ label: 'Day 01 · Attention', slug: 'llms/attention' }],
        },
      ],
    }),
  ],

  adapter: cloudflare({
    prerenderEnvironment: 'node',
  }),

  vite: {
    plugins: [tailwindcss()],
  },
});
