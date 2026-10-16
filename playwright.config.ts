import { defineConfig } from '@playwright/test';
import {existsSync} from 'node:fs';
export default defineConfig({ testDir:'tests/e2e', timeout:60000, fullyParallel:false, workers:1, use:{baseURL:'http://localhost:4173',headless:true,viewport:{width:1512,height:982},launchOptions:{executablePath:process.env.CHROMIUM_PATH||(existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),args:['--no-sandbox']}}, webServer:{command:'node server.mjs',url:'http://localhost:4173',reuseExistingServer:true} });
