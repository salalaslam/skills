#!/usr/bin/env node
// Record a scripted agent session to MP4.
//
// Usage: node record.cjs DIR [--out NAME.mp4] [--dry] [--stills]
//   DIR       holds scenario.js and any images it shows; the video goes to DIR/out/
//   --out     file name for the video (default: DIR's name + .mp4)
//   --dry     play the scenario without recording and print its length
//   --stills  also save one JPEG every 15 s of video to DIR/out/stills for review
//
// Needs Node, ffmpeg and Playwright with Chromium. If Playwright isn't resolvable
// from here, set PLAYWRIGHT=/path/to/node_modules/playwright. CHROME=/path/to/chrome
// uses a specific browser build.
const {spawn} = require('node:child_process');
const fs = require('node:fs'), path = require('node:path');

const args = process.argv.slice(2);
const flag = name => args.includes(name);
const option = name => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const dir = path.resolve(args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--out') || '');
if (!fs.existsSync(path.join(dir, 'scenario.js'))) {
  console.error('usage: node record.cjs DIR [--out NAME.mp4] [--dry] [--stills]  (DIR must contain scenario.js)');
  process.exit(2);
}
const DRY = flag('--dry'), STILLS = flag('--stills');
const name = option('--out') || path.basename(dir) + '.mp4';
const FPS = 20, STEP = 1000 / FPS, W = 1920, H = 1080;
const {chromium} = require(process.env.PLAYWRIGHT || 'playwright');

(async () => {
  const out = path.join(dir, 'out');
  fs.mkdirSync(path.join(out, 'stills'), {recursive: true});
  // The page loads from DIR so the scenario's relative image paths resolve. A ui.html
  // already in DIR wins, which allows per-video tweaks to the window.
  const ui = path.join(dir, 'ui.html');
  if (!fs.existsSync(ui)) fs.copyFileSync(path.join(__dirname, '..', 'assets', 'ui.html'), ui);

  const browser = await chromium.launch({headless: true, ...(process.env.CHROME ? {executablePath: process.env.CHROME} : {})});
  const page = await browser.newPage({viewport: {width: W, height: H}});
  // A paused clock makes every frame land exactly STEP ms apart, however slow the screenshots are.
  const start = new Date();
  await page.clock.install({time: start});
  await page.clock.pauseAt(new Date(start.getTime() + 1000));
  await page.goto('file://' + ui);
  await page.addScriptTag({path: path.join(dir, 'scenario.js')});
  await page.evaluate(() => { window.play(window.SCENARIO); });

  let ff = null;
  if (!DRY) {
    ff = spawn('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
      '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', path.join(out, name)],
      {stdio: ['pipe', 'inherit', 'inherit']});
  }
  let frames = 0;
  const t0 = Date.now();
  while (!(await page.evaluate(() => window.__done))) {
    await page.clock.runFor(STEP);
    frames++;
    if (!DRY) {
      const buf = await page.screenshot({type: 'jpeg', quality: 95});
      if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
      if (STILLS && frames % (FPS * 15) === 0) {
        fs.writeFileSync(path.join(out, 'stills', `t${String(frames / FPS).padStart(4, '0')}.jpg`), buf);
      }
    }
    if (frames % (FPS * 60) === 0) console.log(`video ${frames / FPS}s, wall ${Math.round((Date.now() - t0) / 1000)}s`);
  }
  if (!DRY) {  // Hold the last frame for a second.
    const buf = await page.screenshot({type: 'jpeg', quality: 95});
    for (let i = 0; i < FPS; i++) ff.stdin.write(buf);
    ff.stdin.end();
    await new Promise(r => ff.on('close', r));
  }
  console.log(`${DRY ? 'dry run' : path.join(out, name)}: ${(frames / FPS / 60).toFixed(1)} min, ${frames} frames, wall ${Math.round((Date.now() - t0) / 1000)}s`);
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
