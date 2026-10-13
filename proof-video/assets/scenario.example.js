// Example scenario. Copy to DIR/scenario.js and replace every output with real
// results you produced this session. The placeholders below are illustrative only.

// Window chrome. Every field is optional.
window.META = {
  title: 'PR #123: is the pagination bug fixed?',
  project: 'shop-api',
  sessions: ['PR #123: pagination', 'Earlier session title'],  // first one is highlighted
  cwd: '~/code/shop-api',
  branch: 'fix/pagination @ 1a2b3c4',
  model: 'Opus',
  mode: 'Ask before edits',
  repos: 'api · web',
};

window.SCENARIO = [
// Opening card: say what this is and that it's a replay of real outputs.
{card: `<div class="tag">PR review</div><h1>PR #123: is the pagination bug fixed?</h1>
<p>Running the PR's own code on the reported case</p>
<p style="font-size:17px;margin-top:26px">Real outputs, replayed. Nothing was pushed.</p>`, ms: 6000},

{chapter: '1/3 · The report'},
// paste:true drops the text in at once; without it, the prompt is typed.
{user: `QA says page 2 repeats the last item of page 1. Check PR #123 against that. Don't just read the code. Run it.`, paste: true},
{think: 'Reproducing on main first, then on the PR branch.'},

{chapter: '2/3 · Reproduce'},
// A line starting with !! is highlighted. kind:'diff' colours +/- lines.
{tool: 'Bash', desc: 'Same request on main and on the PR', cmd: 'node repro.js main && node repro.js pr-123',
 out: `main:   page 1 ids 1-20, page 2 ids 20-39
!!main:   id 20 appears twice
pr-123: page 1 ids 1-20, page 2 ids 21-40`},
{say: `On main, item **20** shows on both pages. With the PR, page 2 starts at **21**. The reported case is fixed.`, pause: 2500},

// A permission prompt with a pointer clicking "Allow once".
{ask: 'Allow Claude to run this command?', askCmd: 'npm test -- pagination'},
{tool: 'Bash', desc: 'Pagination tests on the PR', out: `PASS  pagination.test.js (6 tests)`, status: 'passed'},

{chapter: '3/3 · Summary'},
{user: 'Summarise for the team.'},
{say: `**PR #123:**
- Reported case: fixed.
- Tests: 6 of 6 pass.
- Not covered: the last page when the total is a multiple of 20.`, pause: 4000},

{chapter: ''},
{card: `<div class="tag">How this was checked</div>
<p style="color:#ebe9e3;font-size:23px;line-height:1.85;text-align:left">
1. Start from the exact report<br>2. Run the old and new code on the same input<br>3. Say what is still untested</p>`, ms: 8000},
];

// Reading pace: slower typing for answers, longer holds on tool output.
window.SCENARIO.forEach(s => {
  if (s.say) { s.cps = s.cps || 60; s.pause = (s.pause || 2500) * 1.8; }
  if (s.tool) { s.after = (s.after || 1600) + 2200 + (s.img ? 3500 : 0); s.lineMs = (s.lineMs || 45) * 1.6; }
  if (s.user && !s.paste) s.cps = s.cps || 34;
});
