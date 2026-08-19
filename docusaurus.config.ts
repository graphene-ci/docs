import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
  title: 'graphene-ci',
  tagline: 'CI and infrastructure control plane on Temporal',
  favicon: 'img/favicon.ico',

  // Dark is the brand-native mode; light stays available on the toggle.
  future: {
    v4: true,
  },

  url: 'https://graphene-ci.github.io',
  baseUrl: '/docs/',

  // GitHub pages deployment config.
  organizationName: 'graphene-ci',
  projectName: 'docs',
  trailingSlash: false,

  onBrokenLinks: 'throw',

  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'ru'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          routeBasePath: '/', // docs-only mode: the docs ARE the site
          sidebarPath: './sidebars.ts',
          editUrl: 'https://github.com/graphene-ci/docs/tree/main/',
        },
        blog: false,
        pages: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  markdown: {
    mermaid: true,
  },
  themes: ['@docusaurus/theme-mermaid'],

  themeConfig: {
    image: 'img/social-card.png',
    colorMode: {
      defaultMode: 'dark',
      respectPrefersColorScheme: false,
    },
    navbar: {
      title: 'graphene-ci',
      logo: {
        alt: 'graphene-ci',
        src: 'img/logo-light.svg',
        srcDark: 'img/logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docs',
          position: 'left',
          label: 'Docs',
        },
        {
          type: 'localeDropdown',
          position: 'right',
        },
        {
          href: 'https://github.com/graphene-ci',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [],
      copyright: `Copyright © ${new Date().getFullYear()} graphene-ci.`,
    },
    prism: {
      // Code is a dark surface in both modes — like the mark.
      theme: prismThemes.dracula,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['bash', 'yaml', 'protobuf', 'docker', 'go'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
