import './app.css';
import { mount } from 'svelte';

import BreakApp from './lib/app/BreakApp.svelte';
import { prepareWindow } from './lib/app/bootstrap';

await prepareWindow('break');

const target = document.getElementById('app');
if (!target) {
  throw new Error('Missing #app mount point');
}

mount(BreakApp, { target });
