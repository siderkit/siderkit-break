export default {
  '*.{ts,svelte,js,mjs,cjs}': ['eslint --fix --max-warnings=0', 'prettier --write'],
  '*.{json,md,css,html,yml,yaml}': ['prettier --write'],
  '*.rs': ['rustfmt --edition 2021'],
};
