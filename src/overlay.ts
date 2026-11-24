import './app.css';
import { mount } from 'svelte';

import OverlayApp from './lib/app/OverlayApp.svelte';
import { prepareWindow } from './lib/app/bootstrap';

await prepareWindow('overlay');

const target = document.getElementById('app');
if (!target) {
  throw new Error('Missing #app mount point');
}

mount(OverlayApp, { target });
