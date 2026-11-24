import './app.css';
import { mount } from 'svelte';

import MainApp from './lib/app/MainApp.svelte';
import { prepareWindow } from './lib/app/bootstrap';
import { ensureWebviewSupported } from './lib/utils/compat.util';

await prepareWindow('main');

if (ensureWebviewSupported()) {
  const target = document.getElementById('app');
  if (!target) {
    throw new Error('Missing #app mount point');
  }

  mount(MainApp, { target });
}
