import './app.css';
import { mount } from 'svelte';

import LocateApp from './lib/app/LocateApp.svelte';
import { prepareWindow } from './lib/app/bootstrap';

await prepareWindow('locate');

const target = document.getElementById('app');
if (!target) {
  throw new Error('Missing #app mount point');
}

mount(LocateApp, { target });
