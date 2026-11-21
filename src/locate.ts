import './app.css';
import { mount } from 'svelte';

import LocateApp from './lib/LocateApp.svelte';
import { prepareWindow } from './lib/bootstrap';

await prepareWindow('locate');

const target = document.getElementById('app');
if (!target) {
  throw new Error('Missing #app mount point');
}

mount(LocateApp, { target });
