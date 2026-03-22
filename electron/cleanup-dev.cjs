const { execFileSync } = require('node:child_process');

const cwd = process.cwd().toLowerCase();
const patterns = [
  'vite\\bin\\vite.js',
  'concurrently\\dist\\bin\\concurrently.js',
  'nodemon\\bin\\nodemon.js',
  'electron/launch.cjs',
  'electron\\launch.cjs',
  'node_modules\\electron\\dist\\electron.exe',
];
const windowsPatternRegex = patterns
  .map((pattern) => pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  .join('|');

function getWindowsProcessList() {
  const command = [
    '$cwd = $env:PROJECT_CWD.ToLower();',
    `$regex = '${windowsPatternRegex}';`,
    'Get-CimInstance Win32_Process |',
    'Where-Object {',
    '  $_.CommandLine -and',
    '  $_.ProcessId -ne $PID -and',
    '  $_.CommandLine.ToLower().Contains($cwd) -and',
    '  $_.CommandLine -match $regex',
    '} |',
    'Select-Object ProcessId, Name, CommandLine | ConvertTo-Json -Compress',
  ].join(' ');

  try {
    const output = execFileSync(
      'powershell.exe',
      ['-NoProfile', '-Command', command],
      {
        encoding: 'utf8',
        env: {
          ...process.env,
          PROJECT_CWD: cwd,
        },
      }
    ).trim();

    if (!output) {
      return [];
    }

    const parsed = JSON.parse(output);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    return [];
  }
}

function killWindowsProcesses(processes) {
  for (const processInfo of processes) {
    try {
      execFileSync('taskkill.exe', ['/PID', String(processInfo.ProcessId), '/T', '/F'], {
        stdio: 'ignore',
      });
      console.log(`Stopped stale process ${processInfo.ProcessId} (${processInfo.Name})`);
    } catch {
      // Ignore races where a process exits between list and kill.
    }
  }
}

function cleanupWindows() {
  const processes = getWindowsProcessList();
  if (processes.length === 0) {
    console.log('No stale desktop dev processes found.');
    return;
  }

  killWindowsProcesses(processes);
}

function cleanupPosix() {
  try {
    execFileSync(
      'pkill',
      ['-f', `${process.cwd()}.*(vite|concurrently|nodemon|electron/launch\\.cjs|electron)`],
      { stdio: 'ignore' }
    );
    console.log('Stopped stale desktop dev processes.');
  } catch {
    console.log('No stale desktop dev processes found.');
  }
}

if (process.platform === 'win32') {
  cleanupWindows();
} else {
  cleanupPosix();
}
