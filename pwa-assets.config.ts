import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config';

// `make icons`: the set in public/ from public/favicon.svg, which is a copy of
// the master in assets/icon/ (see assets/icon/README.md). TODO(7): the logo.
const background = '#14161a';

export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    maskable: { ...minimal2023Preset.maskable, resizeOptions: { background } },
    apple: { ...minimal2023Preset.apple, resizeOptions: { background } },
  },
  images: ['public/favicon.svg'],
});
