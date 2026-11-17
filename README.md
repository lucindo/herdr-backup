# Herdr status bar: agent quota + system load

Backup of the Herdr setup made on 2026-11-07: the `main-plus` layout, whose status bar shows
system load and agent quota (two Claude accounts plus Codex), and whose pane headers show each
Claude session's model, effort and context usage; plus the mods and the Claude Code hook it uses.
Added 2026-11-13: the `reviewer` pane (see [Reviewer pane](#reviewer-pane)).
Added 2026-11-15: four Better mods from munza/herdr-mods (see [Better mods](#better-mods)).

Source: [Lakris2407/herdr-mods `quota/`](https://github.com/Lakris2407/herdr-mods/tree/main/quota)
at commit `c0119d239968541bc77d8d4d7362d2de4d0df3e5`. `mods/system` is unchanged from upstream;
`mods/quota` is modified (see [Changes to the quota mod](#changes-to-the-quota-mod)).

| Path | What it is |
|---|---|
| `layouts/main-plus.json` | Clone of Herdr's `main`; the status block is a row: `workspace-status` 1.6, `system` 1.6, `quota` 3.1; pane header mod `pane-plus`; right panel `better-files` / `better-changes` |
| `mods/quota/` | The quota mod as installed (modified) |
| `mods/system/` | The system load mod as installed (upstream, unchanged) |
| `mods/pane-plus/` | Clone of Herdr's `pane` header, plus the Claude info text and mods' `pane-heads` titles and controls |
| `mods/reviewer/` | Symlink to the code-review pane in `src/herdr-app-reviewer`; toggled with `cmd-r` |
| `src/herdr-app-reviewer/` | Submodule: lucindo/herdr-app-reviewer, a fork of gfronza/herdr-app-reviewer, pinned to the installed commit |
| `mods/better-files/`, `mods/better-changes/` | File browser and Git panel from munza/herdr-mods (`8606260`), in `main-plus`'s right panel; Better Changes' `mod.json` sets `limits.files: 300` |
| `mods/better-config/` | Settings dialog for every mod with settings (same source), `cmd-alt-,` |
| `mods/better-icons/` | Material Icon Theme icons used by Better Files and Better Changes (same source) |
| `licenses/munza-herdr-mods/` | That repo's Apache-2.0 `LICENSE` and `NOTICE` |
| `themes/catppuccin-frappe.json` | The app theme (`settings.json` `"theme"`), with panel colors pinned to Frappé |
| `bin/claude-herdr-info` | Claude Code hook that feeds the header; installed at `~/.local/bin/` |
| `quota.patch` | Upstream `mods/quota` → installed, `patch -p1` |
| `pane-plus.patch` | Herdr's `mods/pane/main.js` 0.1.13 (the version cloned; Herdr's has changed since) → `pane-plus` |
| `upstream/` | Upstream `RECIPE.md`, `README.md` and previews, for rebuilding from scratch |

## Requirements

- `quota-axi` (`npm install -g quota-axi`; 0.1.69 used). Run `quota-axi --allow-keychain-prompt`
  once and approve the Keychain prompt, or Claude reports `keychain_prompt_required`.
- Two Claude Code installs: personal at `~/.claude-personal` (`CLAUDE_CONFIG_DIR`), work at the
  default `~/.claude`. The personal path is the `CLAUDE_PROFILES` constant in `mods/quota/main.js`.

## Restore

Clone with `git clone --recurse-submodules`, or run `git submodule update --init` in an
existing clone: the reviewer lives in a submodule.

```sh
H=~/.config/herdr-app
# Layout first: better-changes has "place": "right", and Herdr docks a copy of a mod it has
# never seen into the shown layout unless a layout already uses it.
cp layouts/main-plus.json "$H/layouts/"
cp -R mods/quota mods/system mods/pane-plus "$H/mods/"   # check they don't exist first
# The reviewer runs from a working clone of the fork (see Reviewer pane).
# For a plain copy instead: cp -RL mods/reviewer "$H/mods/"
git clone git@github.com:lucindo/herdr-app-reviewer.git ~/Code/herdr-app-reviewer   # if not there yet
ln -s ~/Code/herdr-app-reviewer/mods/reviewer "$H/mods/reviewer"
cp -R mods/better-icons mods/better-config mods/better-files mods/better-changes "$H/mods/"
cp themes/catppuccin-frappe.json "$H/themes/"     # settings.json: "theme": "catppuccin-frappe"
install -m 755 bin/claude-herdr-info ~/.local/bin/
# keys.json, under "global":  "cmd-r": "mod.open:reviewer",
#   "cmd-alt-,": "mod.open:better-config",  "cmd-alt-g": "mod.open:better-changes",
herdr-app check "$H/mods/quota" && herdr-app check "$H/mods/system" && herdr-app check "$H/mods/pane-plus"
herdr-app check "$H/mods/reviewer"
for m in better-icons better-config better-files better-changes; do herdr-app check "$H/mods/$m"; done
herdr-app do layout.switch '{"name":"main-plus"}'
herdr-app status                                 # "errors": []
```

Herdr remembers the shown layout (`shared.json` `"layout"`), so `main-plus` stays the default.
`cmd-shift-l` cycles layouts and `ctrl-alt-shift-escape` resets to `main`; switch back with the
`layout.switch` line above.

Or rebuild from upstream: copy `upstream`'s `mods/quota`, then `patch -p1 -d <that folder> < quota.patch`.

## Changes to the quota mod

Build the upstream recipe, then:

- **Both Claude accounts.** Run `quota-axi` as `env QUOTA_AXI_CLAUDE_PROFILES=$HOME/.claude-personal …`
  (Herdr's `exec` takes no environment), on this computer only; the login-shell fallback gets it too.
  List only the extra profile: quota-axi adds the default `~/.claude` itself, and listing it as well
  adds a broken lane (`keychain_unreachable`, it looks up a hashed Keychain service).
- **Telling accounts apart.** Two entries of one provider are keyed `provider:accountKey` (used for
  element ids and the hidden list) and named by plan: `max`, `enterprise`. The strip shows the plan
  next to the icon even with names off, and counts that text when deciding what fits.
- **Spend cap.** `kind: "credits"` windows (work's "extra usage": `spentUsd` of `limitUsd`) are a new
  limit kind, on by default ("Spend caps" in the popup). Strip label `spend`; the popup and tooltip
  show `$79.90 of $800`. The work account has no 5h or weekly limit, only this.
- **Pace.** quota-axi 0.1.x omits `windowSeconds`; session windows get 5 h, weekly 7 d, so the
  pace tick, ▲ and "N% under pace" work.
- **Only Claude and Codex.** `quota-axi --json --provider claude,codex`; the Copilot `gh api`
  fallback is removed.
- **Rate limits.** Reads every 5 minutes (quota-axi's own default, was 2). The read's largest
  `state.retryAfter` is stored, and no read (timer, Refresh, key) runs before it; the popup shows
  "Rate limited · next read in Nm". An account that comes back rate-limited, errored or stale keeps
  its last good reading, dimmed to 60%, with "read Nm ago, rate limited" in the tooltip and popup.
  A signed-out account (`auth_required`) is dropped instead.

**Watch out:** every save of a mod file reloads it, and a reload reads the quota at once. Edit a
copy and save once, or Claude's usage endpoint starts answering 429.

**Done when:** `herdr-app check` passes; the strip shows `enterprise spend 10%`, `max wk 24%` and
Codex `5h`/`wk` bars with pace ticks; the popup shows `$79.90 of $800` and "under pace".

## Claude info in the pane header

Each Claude pane's header shows `Opus 5.5 · xhigh · 362k/1m 36%` on the right, before the status.

- `bin/claude-herdr-info` reads the last main-thread response in the session transcript: model
  (`message.model`, `claude-opus-5-5` → `Opus 5.5`), effort (the entry's `effort`, else
  `$CLAUDE_CODE_EFFORT_LEVEL`, else settings `effortLevel`) and context (input + cache tokens of
  `message.usage`). It sets the terminal label `claude.info` with `hc label $HC_TERMINAL_ID`, only
  when the text changes, and prints nothing. A session with no reply yet clears the label.
- The transcript has no context window size: `windows` in the script knows `claude-opus-5-5` = 1M
  (what the old status line reported); other models show tokens only.
- `mods/pane-plus` shows the label only while an agent reports in that pane, so a shell left after
  Claude exits shows nothing.
- It runs from hooks, not a status line: Claude Code keeps an empty row for any status line, even
  one that prints nothing or fails. Add to `hooks` in **both** settings files, beside Herdr's own
  SessionStart entry (don't replace it):

  ```json
  "SessionStart": [ …herdr's entry…, { "matcher": "*", "hooks": [ H ] } ],
  "PostToolUse": [ { "matcher": "*", "hooks": [ H ] } ],
  "Stop": [ { "hooks": [ H ] } ]
  ```

  with `H` = `{ "type": "command", "command": "/Users/lucindo/.local/bin/claude-herdr-info", "timeout": 5, "async": true }`.
- Updates after each tool call and at turn end; `/model` and `/effort` show from the next request.

## Mod titles and controls in the pane header

Added 2026-11-16: `mods/pane-plus` also shows what a mod pane publishes under its pane id in the
shared key `pane-heads`.

- `title`, `icon` (`color: true` for a full-colour picture) and `detail` replace the pane's name
  and folder; `badge` is a highlighted label after them.
- `actions` are buttons after the title: `{ command, label or icon, tooltip, selected, gap }`. A
  click focuses the pane, then runs `command`. Herdr delivers a mod command such as
  `reviewer.scope-branch` only to the focused copy of that mod, so the focus has to come first.
  The badge and folder come after them; the folder shrinks to make room for the split, zoom and
  close buttons on hover, so the controls never move.
- On start it adds `pane-plus` to the shared list `pane-heads-actions`, which tells a mod that
  this header draws its controls.
- The reviewer publishes its scopes and toggles there (since `c219fda`). Better Files and Better
  Changes tabs publish their file.

## Reviewer pane

`mods/reviewer` is a symlink into the `src/herdr-app-reviewer` submodule:
[lucindo/herdr-app-reviewer](https://github.com/lucindo/herdr-app-reviewer), a fork of
[gfronza/herdr-app-reviewer](https://github.com/gfronza/herdr-app-reviewer) (MIT), pinned at
`34d06f58e100b5b8bc7e38705b93ce13ea4832a4` (2026-11-17). On this computer the installed
`~/.config/herdr-app/mods/reviewer` is a symlink to the same folder in the working clone at
`~/Code/herdr-app-reviewer`, so the app runs whatever is checked out there. Only the mod folder
is installed; the repo's tests, `scripts/check` and its Claude Code hooks are for developing it.
Herdr writes its own `gpui-kit.d.ts` into the mod folder; the fork's `.gitignore` leaves it out.

- `cmd-r` (in `keys.json` `"global"`, after `cmd-p`) opens a pane right of the focused pane,
  bound to that pane's folder, listing its uncommitted changes as a diff; `cmd-r` again closes it.
  In the pane: `j`/`k`, `c` comment, `v` select lines, `y` copy the review, `s` paste it into
  the tab's agent (no Enter), `l` stacked / side by side, `w` old beside new, `z` tree / flat
  file list, `a` every listed file's diff in one list, `m` rendered Markdown, `/` `n` `N` find in the diff, `p` go to a file, `P` search
  changed lines, `,` settings (also the header's gear). Full key list in its README.
- Scopes: `u` uncommitted (a new pane's default unless the settings pick another), `b` the branch against its base (a
  local branch: the one the branch was made from, as the reflog recorded it, `origin/dev`
  counting as `dev`; else `origin/HEAD`'s name, then `init.defaultBranch`, `main`, `master`),
  `t` the agent's last turn, `g` one commit or a run. `B` picks the base ("Forget the pick" at
  the top of its list drops it), `G` picks commits (Shift+Enter marks a run's first end). `o` (This session) narrows any scope to the files the
  agents' turns changed since the pane opened. Comments belong to the scope they were made in.
- The diff views run only read-only `git` (`status`, `diff`, `ls-files`, `rev-parse`,
  `symbolic-ref` for each repo's branch name, `reflog show` for the branch's source,
  `merge-base`, `log`, `for-each-ref`, `cat-file` for rendering Markdown at a commit, `config` to read `init.defaultBranch`, and
  `hash-object -t tree /dev/null` without `-w` for a root commit's empty tree), with
  `--no-optional-locks`, no index refresh; no network. Shared-state keys:
  `reviewer.watch` (watched folders), `reviewer.layout`, `reviewer.bases` (picked base per
  repo), `reviewer.files` (tree or flat), `reviewer.diff` (unified or split) and `reviewer.wrap`
  (wrap long lines, toggled by the header's wrap button or the `reviewer.wrap` command; no key),
  and `reviewer.settings` (the settings screen's other choices: all files or one, the diff text
  size, how a new pane starts, the refresh interval and the limits; it holds only values that
  differ from the default).
  It also writes its title and controls under its pane id in `pane-heads` and reads
  `pane-heads-actions` (see [Mod titles and controls](#mod-titles-and-controls-in-the-pane-header)).
- **Turn snapshots** (for Last turn and This session): while a reviewer pane is open, each
  idle → working edge of its tab's agents snapshots every watched repo, whatever the scope: it
  copies `.git/index` into `$TMPDIR/herdr-reviewer-<tab id>/turn-N/` and runs `git add -A` and
  `git write-tree` there with `GIT_INDEX_FILE` and `GIT_OBJECT_DIRECTORY` pointing at it, hooks,
  split index and clean filters (git-lfs) off. It also runs `sh`, `cp`, `find`, `mkdir` and `rm`
  on that folder only. A turn's end snapshots again, and so does every refresh (each file change,
  and the refresh interval, 10 s by default) while the Last turn scope or This session is on. It keeps the latest turn and
  turns with unsent comments; a closed pane's folder is left for the system's temp cleanup.
- **Watch out:** every snapshot rehashes all untracked files, and each turn's first one stores
  them. On the translations repo (`~/Code/books/dharma-pujadi-mimangsa`, 416 MB of untracked
  images under `diary/work/`) a turn's first snapshot took 11 s and wrote 395 MB to `$TMPDIR`,
  later ones 1 s each, and nothing under `.git` changed. Keep the reviewer closed in such a tab,
  or gitignore that data. A long snapshot also makes Last turn report "files changed just as the
  turn started" when the agent writes during it.
- Audited on install: `vendor/highlight.min.js` is byte-identical to highlight.js 11.12.0's
  published ES build (sha256 `1ed8fc52…9999d7`).
- Updated 2026-11-13 from `52b9dd6` (branch and commits scopes, collapsible repos). Re-audited:
  `vendor/` unchanged, the new `revs.js` only calls `git` with the read-only flags above, and the
  repo's 89 tests pass.
- Updated 2026-11-15 from `dd69158` (v1.2 last turn and this session; v1.3 file tree, split diff,
  Markdown, find, file and code search). Re-audited: `vendor/` unchanged, new programs only in
  `turns.js` as above, app commands unchanged (`pane.split`, `pane.focus`, `pane.close`,
  `terminal.paste`), and the repo's 151 tests pass.
- Updated 2026-11-16 from `71eb4b5` (branch name per watched repo) and moved to the submodule.
  Re-audited: one new command, `git symbolic-ref --quiet --short HEAD` with the read-only flags
  above; `vendor/` and app commands unchanged; the repo's 152 tests pass.
- Updated 2026-11-16 from `246496c` (branch base from where the branch was made, "Forget the
  pick"). Re-audited: one new command, `git reflog show --format=%gs <ref> --` with the
  read-only flags above; no new shared-state key; `vendor/` and app commands unchanged; the
  repo's 156 tests pass.
- Updated 2026-11-16 from `0bb84b3` (header controls and line wrap, our PRs #6 and #7 to
  gfronza). Re-audited: no new programs or app commands; new shared-state keys `pane-heads`,
  `pane-heads-actions` (read only) and `reviewer.wrap`; `vendor/` unchanged; the repo's 169 tests
  pass.
- Updated 2026-11-17 from `c219fda` (settings screen, our PR #8 to gfronza). Re-audited: no new
  programs; one new app call, `openOverlay` for its own settings dialog; new shared-state key
  `reviewer.settings`; `vendor/` unchanged; the repo's 178 tests pass.
- Updated 2026-11-17 from `24dbcb2` (all files in one diff, `a`, our PR #9 to gfronza).
  Re-audited: no new programs or app commands (all files reads each listed file with the same
  `git diff` as one file); no new shared-state key (its choice is in `reviewer.settings`);
  `vendor/` unchanged; the repo's 188 tests pass.
- Updated 2026-11-17 from `4be3f89` (diff text in the terminal's weight and row height, and a
  diff text size setting, our PR #10 to gfronza). Re-audited: no new programs, app commands or
  shared-state keys (it reads `settings()` as before; its choice is in `reviewer.settings`);
  `vendor/` unchanged; the repo's 189 tests pass.
- To update: change or sync `~/Code/herdr-app-reviewer` (the app picks it up through the
  symlink), check new `exec`/`run` calls from upstream, and push the fork. Then move the pin:
  `git -C src/herdr-app-reviewer fetch`, `git -C src/herdr-app-reviewer checkout <commit>`,
  `git add src/herdr-app-reviewer` and commit. Pin only pushed commits, or a restore can't fetch them.

## Better mods

`mods/better-icons`, `better-config`, `better-files` and `better-changes` are from
[munza/herdr-mods](https://github.com/munza/herdr-mods) at commit
`860626068cb7e32a1db96b2f66baadc271d5667a` (2026-11-14), copied as is (Apache-2.0, kept in
`licenses/munza-herdr-mods/`; the icons are MIT, licence in `mods/better-icons/`). The only
change is the `settings` block in `mods/better-changes/mod.json` (see Watch out). Only the
`mods/<name>/` folders are installed; the repo's tests, `sync.sh` and recipes are for developing them.

- **Better Files** (`files` block) and **Better Changes** (`changes` block) fill `main-plus`'s
  right panel, the `panel-body` stack. The block ids are Herdr's, so the tab bar's Files and
  Changes buttons switch between them. Those buttons show only for the ids in shared
  `"workspace.panels"`, which the welcome screen had left `[]`; it is now `["files","changes"]`
  (on a new install: `herdr-app do app.welcome` and turn both on). `cmd-alt-g` opens Changes.
- **Better Config** opens with `cmd-alt-,`: a dialog with every mod's settings, which writes
  only changed keys into the mod's `mod.json`. It also keeps a copy of changed values in
  `~/.config/herdr-mods/better-config/<mod>.json` (not backed up; `mod.json` here is the
  source) and offers to restore them after an update resets `mod.json`.
- **Better Icons** draws nothing: the other two read its icons by path (5.8 MB, 1,184 SVGs).
- Audited on install. None reaches the network (Markdown and commit links open in the browser
  when clicked). Better Icons runs nothing and reads only its folder. Better Config runs
  `sh -c ls` and `mkdir -p` and reads every mod's `mod.json` and `mod.schema.json`. Better Files
  runs `sh` (folder listing), read-only `git status`/`git diff -U0 HEAD` with
  `--no-optional-locks`, `mdfind` (finding editors), `open` (Open in, Finder), `cp`/`rm` of
  image copies in its own `cache/`, and `hc send` / `hc run --bg --parent` only on Send in its
  "Send to agent" box. Better Changes runs only `git`: reads with `--no-optional-locks`,
  `core.fsmonitor=false`, `--no-ext-diff --no-textconv`; on a click, stage/unstage
  (`git add`, `git reset -q HEAD`, `git rm --cached`: index only) and `git commit [--amend] -m`.
  It never fetches or pushes. App commands: `tab.new`, `tab.select`, `tab.rename`,
  `pane.focus`, `app.settings`.

**Watch out:**

- Better Changes draws its whole file list on every render (not a virtual list). Over Herdr's
  render time limit, the panel shows "This view could not be re-rendered; showing the last
  version that worked — interrupted" and stays on "Loading changes…". It counts every untracked
  file (`--untracked-files=all`): a repo with 2,197 untracked files failed at the default
  `limits.files` 1,000 and worked at 500, so it is set to 300 for headroom.
- Diff and file tabs have two header rows: `pane-plus`, which shows the file from `pane-heads`,
  then the mod's own file row. Dropping that row means patching the `=== "better-changes"`
  header check in `better-files/views/viewer.js` and `better-changes/views/diff.js`.
- To update: re-clone, `diff -r` each `mods/<name>` against this copy, check new `exec`, `hc`
  and `run` calls, then replace both. Copying a new `mod.json` drops `limits.files`; Better
  Config offers to restore it.

## Theme: Catppuccin Frappé

`settings.json` sets `"theme": "catppuccin-frappe"` and `main-plus` sets no theme, so every
mod (reviewer, quota, system, pane-plus) draws with it through `theme()`. Herdr derives the
panel colors from the 16 terminal colors and lands on neutral grays (panel text `#eeeeef`,
sidebars `#212330`), so the theme file's `colors` pins them to Frappé (added 2026-11-13):

| Herdr color | Frappé | Was (derived) |
|---|---|---|
| `foreground`, `solid` | text `#c6d0f5` | `#eeeeef` |
| `muted` | subtext0 `#a5adce` | `#a2a4ab` |
| `dim` | overlay1 `#838ba7` | `#787b86` |
| `idle`, `unknown` | overlay0 `#737994` | `#787b86` |
| `chrome`, `solid_foreground` | crust `#232634` | `#212330`, `#232532` |
| `canvas` | mantle `#292c3c` | `#282c3b` |
| `popover`, `raised` | surface0 `#414559` | `#3c4051`, `#434657` |
| `ring` | lavender `#babbf1` | `#b5b6bc` |

Already Frappé, left derived: `accent`/`done` blue, `working` yellow, `blocked` red. `border`,
`hover`, `selected` and `input` stay translucent white so they work on any background. Remove
the `colors` block to go back to Herdr's derivation.

To see what a theme resolves to, run a throwaway mod through `herdr-app check` that throws
`JSON.stringify(themes().find(t => t.name === "catppuccin-frappe").colors)`; `check` doesn't
show `console.log`.

## Claude Code status line (disabled)

Both installs had a status line (`statusline/statusline.sh`, from daniel3303/ClaudeCodeStatusLine)
that polled `api.anthropic.com/api/oauth/usage` every 60 s per account, the endpoint quota-axi
uses. It is disabled, not removed: in `~/.claude-personal/settings.json` and `~/.claude/settings.json`
the `statusLine` key is renamed `_disabled_statusLine`. Rename it back to re-enable.
`disableAllHooks` was not used: it would also stop the `herdr-agent-state.sh` SessionStart hook.
