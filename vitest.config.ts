import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      reportsDirectory: 'coverage',
      // SPEC §11: ≥ 90 % in src/morse/, which arrives with F1 (TODO 2).
      include: ['src/morse/**/*.ts'],
      thresholds: { lines: 90, functions: 90, branches: 90, statements: 90 },
    },
  },
});
