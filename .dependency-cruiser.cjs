module.exports = {
  forbidden: [
    {
      name: 'ui-does-not-import-host-directly',
      severity: 'error',
      from: { path: '^src/lib/ui' },
      to: { path: '^@tauri-apps' },
    },
    {
      name: 'no-circular',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.json' },
  },
};
