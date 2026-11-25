import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [svelte()],
  test: {
    environment: 'happy-dom',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/lib/**/*.ts'],
      // The IPC bridge is a thin Tauri invoke wrapper and app/ wires bootstrap
      // side effects together; both are covered by integration runs, not unit
      // tests, so keeping them in the metric would only hide real gaps.
      exclude: [
        'src/**/*.test.ts',
        'src/lib/paraglide/**',
        'src/lib/ipc/**',
        'src/lib/app/**',
        // Pointer-ripple animation: pure visual DOM side effect, no logic.
        'src/lib/utils/ripple.util.ts',
      ],
      thresholds: {
        lines: 80,
        functions: 75,
        'src/lib/state/**': { lines: 90, functions: 90 },
      },
    },
  },
});
