/**
 * Copies the MediaPipe vision WASM runtime out of node_modules and into
 * public/, so the pose rep counter serves it from our own origin.
 *
 * Pulling it from a CDN instead would mean the counter silently stops working
 * whenever the CDN is unreachable, and it would drift out of step with the
 * npm package on every dependency bump. Copying pins the two together.
 *
 * Runs before dev and build, like generate-messaging-sw.
 */

const fs = require('fs');
const path = require('path');

const SOURCE = path.join(__dirname, '..', 'node_modules', '@mediapipe', 'tasks-vision', 'wasm');
const DEST = path.join(__dirname, '..', 'public', 'mediapipe', 'wasm');

function main() {
  if (!fs.existsSync(SOURCE)) {
    // Not fatal: the app builds fine without it, the counter just reports that
    // it cannot start. Failing the build over an optional feature would be worse.
    console.warn('[pose-assets] @mediapipe/tasks-vision not installed - skipping WASM copy.');
    return;
  }

  fs.mkdirSync(DEST, { recursive: true });

  const files = fs.readdirSync(SOURCE);
  let copied = 0;
  for (const file of files) {
    const from = path.join(SOURCE, file);
    const to = path.join(DEST, file);
    if (!fs.statSync(from).isFile()) continue;

    // Skip files that are already identical, so repeated dev restarts do not
    // rewrite ~30MB of WASM every time.
    if (fs.existsSync(to) && fs.statSync(to).size === fs.statSync(from).size) continue;

    fs.copyFileSync(from, to);
    copied += 1;
  }

  console.log(
    copied > 0
      ? `[pose-assets] Copied ${copied} MediaPipe WASM file(s) to public/mediapipe/wasm.`
      : '[pose-assets] MediaPipe WASM already up to date.'
  );
}

main();
