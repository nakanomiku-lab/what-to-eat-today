const { spawn } = require('node:child_process');
const electronPath = require('electron');

const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
delete env.ELECTRON_FORCE_IS_PACKAGED;

const child = spawn(electronPath, process.argv.slice(2), {
  stdio: 'inherit',
  env,
  windowsHide: false,
});

child.on('close', (code) => {
  process.exit(code ?? 0);
});
