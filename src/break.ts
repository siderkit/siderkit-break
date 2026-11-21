import './app.css';
import { mount } from 'svelte';

import BreakApp from './lib/BreakApp.svelte';
import { prepareWindow } from './lib/bootstrap';

await prepareWindow('break');

const target = document.getElementById('app');
if (!target) {
  throw new Error('Missing #app mount point');
}

mount(BreakApp, { target });
