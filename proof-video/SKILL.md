---
name: proof-video
description: Make a short MP4 that replays an agent coding session with real command outputs, to show a team that a bug is or isn't fixed, how quickly something can be fixed, or how to work a problem through with an AI agent. Use when asked for a proof video, walkthrough video, demo of how the agent would fix it, or a video to post on a ticket or PR.
---

# Proof video

A proof video is a scripted replay, not a screen recording. You do the real work first: reproduce the bug, run the old and new code, query the data. Then you replay those results in a window that looks like Claude Code Desktop, with typed prompts, tool calls and answers, and record it to a 1080p MP4.

People believe a video they can watch more than a long comment, and it shows them how to do the same work themselves.

## Rules

- **Every output on screen is real.** It must come from a command you ran in this session. Keep the scripts and raw outputs next to the scenario so anyone can check them. Never invent or round numbers. If you couldn't reach something, the video says so.
- **Say what it is once.** The opening card says it replays real outputs. If nothing was pushed or changed, say that in the opening card only, not on every step.
- **No secrets or personal data.** Mask IP addresses, hostnames, tokens, emails, phone numbers and customer personal data in outputs, file names and screenshots. Check the stills for them before handing the video over.
- **Plain words.** Viewers often read English as a second language. Use short sentences, no jargon, and put the conclusion in bold.
- **Short.** Aim for 2–5 minutes in 3–6 chapters. Keep each tool output to about 14 lines, because longer output is cut off on screen. Highlight the line that matters.

## Steps

1. **Do the real work.** Reproduce the issue with the actual code and data, for example by running the PR's code and the production code on the same input. Save each command's output to `DIR/evidence/`. Use a fresh directory per video, such as `~/videos/<topic>-<date>/`.
2. **Agree the story.** List the chapters and every prompt the viewer will see, and show that list to the user before writing the scenario. Users usually want to reword the prompts.
3. **Write `DIR/scenario.js`.** Start from `assets/scenario.example.js`. Paste real outputs, set `window.META` for the window title, branch and session names, and put images such as screenshots or bug-report photos in `DIR`.
4. **Check the length.** Run `node scripts/record.cjs DIR --dry`, then adjust the pauses.
5. **Record.** Run `node scripts/record.cjs DIR --stills --out NAME.mp4`. It records at about real time, so a 4-minute video takes about 4 minutes.
6. **Look at it.** Open the stills in `DIR/out/stills/`, or make a contact sheet with `ffmpeg -i DIR/out/NAME.mp4 -vf "fps=1/15,scale=480:-1,tile=4x3" DIR/out/contact.jpg`. Check for cut-off output, overlapping text, unmasked data and typos.
7. **Hand it over.** Give the path and the length. Upload or post only when the user says so, with a short text: a TL;DR, what the video shows, and what still needs doing. For GitHub, keep the file under 10 MB: `ffmpeg -i NAME.mp4 -vf scale=1280:-1 -crf 28 -preset slow NAME-small.mp4`.

## Scenario steps

`window.SCENARIO` is a list of steps. Each step uses one of these keys:

| Step | Shows | Options |
| --- | --- | --- |
| `{card: html, ms}` | Full-screen title card | `ms` on screen, default 3500 |
| `{chapter: '2/4 · Name'}` | Chapter pill in the header (`''` hides it) | |
| `{user: text}` | Prompt typed into the box, then sent | `paste: true` to drop it in at once, `images: [...]`, `files: [...]` as attachments |
| `{think: text}` | Short italic thinking line | `ms` |
| `{tool, desc, out}` | Tool card with output printed line by line | `cmd` typed first, `kind: 'diff'` colours `+`/`-`, lines starting `!!` are highlighted, `img` adds a screenshot, `status` replaces "done" |
| `{ask, askCmd}` | Permission prompt; a pointer clicks "Allow once" | |
| `{say: text}` | Agent answer typed out; supports `**bold**`, `` `code` ``, `- ` and `1. ` lists | `pause` after it |
| `{sleep: ms}` | Pause | |

The block at the end of the example sets the reading pace. Keep it.

## Setup

You need Node 18+, `ffmpeg`, and Playwright with Chromium (`npm i playwright && npx playwright install chromium`). If Playwright is installed somewhere else, set `PLAYWRIGHT=/path/to/node_modules/playwright`. Set `CHROME=/path/to/chrome` to use a specific browser build. The window template is `assets/ui.html`. The recorder copies it into `DIR` when `DIR` doesn't have one, so you can tweak a single video's window without changing the template.
