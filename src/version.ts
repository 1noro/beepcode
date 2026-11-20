// The version of this build, as in dhtcrawler: the Makefile takes it from
// `git describe --tags --dirty --always` and passes it on as VERSION, which
// vite.config.ts writes in as __APP_VERSION__. Without it (Vitest, a bare
// `vite build`), "dev".
declare const __APP_VERSION__: string | undefined;

export const VERSION: string = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'dev';
