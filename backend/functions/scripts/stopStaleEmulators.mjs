/**
 * Stops a Firestore emulator left running by an earlier test run.
 *
 * On Windows, `firebase emulators:exec` sometimes exits without stopping the
 * Firestore emulator's Java process, and the next run then fails with
 * "port taken". This runs before `test:rules` and stops only an emulator
 * started for this project (demo-customer-service), so emulators for any other
 * Firebase project on the same machine are left alone.
 */

import { execFileSync } from 'node:child_process'

const PROJECT = 'demo-customer-service'

if (process.platform === 'win32') {
  const script = `
    Get-CimInstance Win32_Process -Filter "Name='java.exe'" |
      Where-Object { $_.CommandLine -match 'cloud-firestore-emulator' -and $_.CommandLine -match '${PROJECT}' } |
      ForEach-Object { Stop-Process -Id $_.ProcessId -Force; "stopped stale Firestore emulator (PID $($_.ProcessId))" }
  `
  const out = execFileSync('powershell.exe', ['-NoProfile', '-Command', script], { encoding: 'utf8' })
  if (out.trim()) console.log(out.trim())
}
