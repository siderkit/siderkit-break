import './app.css';
import { mount } from 'svelte';

import MainApp from './lib/MainApp.svelte';
import { prepareWindow } from './lib/bootstrap';
import { ensureWebviewSupported } from './lib/compat';

await prepareWindow('main');

if (ensureWebviewSupported()) {
  const target = document.getElementById('app');
  if (!target) {
    throw new Error('Missing #app mount point');
  }

  mount(MainApp, { target });
}
