# Herdr status bar: agent quota + system load

Backup of the Herdr setup made on 2026-11-07: the `main-plus` layout, whose status bar shows
system load and agent quota (two Claude accounts plus Codex), and whose pane headers show each
Claude session's model, effort and context usage; plus the mods and the Claude Code hook it uses.
Added 2026-11-13: the `reviewer` pane (see [Reviewer pane](#reviewer-pane)).
Added 2026-11-15, removed 2026-11-17: four Better mods from munza/herdr-mods. The right panel is
back to Herdr's own Files and Changes.
Changed 2026-11-17: the pane headers come from `pane-header` (see [Pane header](#pane-header)),
which replaces `pane-plus`.

Source: [Lakris2407/herdr-mods `quota/`](https://github.com/Lakris2407/herdr-mods/tree/main/quota)
at commit `c0119d239968541bc77d8d4d7362d2de4d0df3e5`. `mods/system` is unchanged from upstream;
`mods/quota` is modified (see [Changes to the quota mod](#changes-to-the-quota-mod)).

| Path | What it is |
|---|---|
| `layouts/main-plus.json` | Clone of Herdr's `main`; the status block is a row: `workspace-status` 1.6, `system` 1.6, `quota` 3.1; pane header mod `pane-header`; right panel Herdr's `files` / `changes` |
| `mods/quota/` | The quota mod as installed (modified) |
| `mods/system/` | The system load mod as installed (upstream, unchanged) |
| `mods/pane-header/` | Symlink to the pane header in `src/herdr-app-pane-header`: Herdr's `pane`, plus mods' titles and controls and terminals' `pane-head.*` labels |
| `mods/reviewer/` | Symlink to the code-review pane in `src/herdr-app-reviewer`; toggled with `cmd-r` |
| `src/herdr-app-reviewer/` | Submodule: lucindo/herdr-app-reviewer, a fork of gfronza/herdr-app-reviewer, pinned to the installed commit |
| `src/herdr-app-pane-header/` | Submodule: lucindo/herdr-app-pane-header, pinned to the installed commit |
| `themes/catppuccin-frappe.json` | The app theme (`settings.json` `"theme"`), with panel colors pinned to Frappé |
| `bin/claude-herdr-info` | Claude Code hook that feeds the header; installed at `~/.local/bin/` |
| `quota.patch` | Upstream `mods/quota` → installed, `patch -p1` |
| `upstream/` | Upstream `RECIPE.md`, `README.md` and previews, for rebuilding from scratch |

## Requirements

- `quota-axi` (`npm install -g quota-axi`; 0.1.69 used). Run `quota-axi --allow-keychain-prompt`
  once and approve the Keychain prompt, or Claude reports `keychain_prompt_required`.
- Two Claude Code installs: personal at `~/.claude-personal` (`CLAUDE_CONFIG_DIR`), work at the
  default `~/.claude`. The personal path is the `CLAUDE_PROFILES` constant in `mods/quota/main.js`.

## Restore

Clone with `git clone --recurse-submodules`, or run `git submodule update --init` in an
existing clone: the reviewer and the pane header live in submodules.

```sh
H=~/.config/herdr-app
cp layouts/main-plus.json "$H/layouts/"
cp -R mods/quota mods/system "$H/mods/"   # check they don't exist first
# The reviewer and the pane header run from working clones (see Reviewer pane, Pane header).
# For plain copies instead: cp -RL mods/reviewer mods/pane-header "$H/mods/"
git clone git@github.com:lucindo/herdr-app-reviewer.git ~/Code/herdr-app-reviewer   # if not there yet
git clone git@github.com:lucindo/herdr-app-pane-header.git ~/Code/herdr-app-pane-header
ln -s ~/Code/herdr-app-reviewer/mods/reviewer "$H/mods/reviewer"
ln -s ~/Code/herdr-app-pane-header/mods/pane-header "$H/mods/pane-header"
cp themes/catppuccin-frappe.json "$H/themes/"     # settings.json: "theme": "catppuccin-frappe"
install -m 755 bin/claude-herdr-info ~/.local/bin/
# keys.json, under "global":  "cmd-r": "mod.open:reviewer",
herdr-app check "$H/mods/quota" && herdr-app check "$H/mods/system"
herdr-app check "$H/mods/reviewer" && herdr-app check "$H/mods/pane-header"
herdr-app do layout.switch '{"name":"main-plus"}'
herdr-app status                                 # "errors": []
```

Herdr remembers the shown layout (`shared.json` `"layout"`), so `main-plus` stays the default.
`cmd-shift-l` cycles layouts and `ctrl-alt-shift-escape` resets to `main`; switch back with the
`layout.switch` line above.

The tab bar's Files and Changes buttons switch the right panel between its `files` and `changes`
blocks. They show only for the ids in shared `"workspace.panels"`, here `["files","changes"]`; on
a new install, run `herdr-app do app.welcome` and turn both on.

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
  `message.usage`). It sets the terminal label `pane-head.info` with `hc label $HC_TERMINAL_ID`, only
  when the text changes, and prints nothing. A session with no reply yet clears the label.
- The transcript has no context window size: `windows` in the script knows `claude-opus-5-5` = 1M
  (what the old status line reported); other models show tokens only.
- It also sets `pane-head.while=agent`, so the header shows the label only while an agent reports
  in that pane, and a shell left after Claude exits shows nothing.
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

## Pane header

`mods/pane-header` is a symlink into the `src/herdr-app-pane-header` submodule:
[lucindo/herdr-app-pane-header](https://github.com/lucindo/herdr-app-pane-header) (Apache-2.0), pinned at
`a4b146f1094f1e6a4d08c0d9f6d462086b918c0e` (2026-11-17). As with the reviewer, the installed
`~/.config/herdr-app/mods/pane-header` is a symlink to the working clone at
`~/Code/herdr-app-pane-header`, so the app runs whatever is checked out there.

- It is Herdr's stock `pane` header as shipped in Herdr 0.1.16, plus the repo's
  [contract](https://github.com/lucindo/herdr-app-pane-header/blob/main/CONTRACT.md): a mod pane
  publishes a title, icon, detail, badge, info and buttons under its pane id in the shared key
  `pane-heads`, and a program in a terminal sets `pane-head.*` labels, as the Claude info does.
- The reviewer publishes its scopes and toggles there (since `c219fda`) and leaves out its own
  row, because the header registers in `pane-heads-headers` as drawing `actions` (read by the
  reviewer since `7aa30dc`; `pane-heads-actions` is its fallback for older headers).
- Audited: no programs, network or file access. It reads `panes()`, `terminals()` labels,
  `layout()` and `pane-heads`, and writes only its own entries in `pane-heads-headers` and
  `pane-heads-actions`. Its buttons run `pane.split`, `pane.zoom` and `pane.close`; a button a
  mod publishes runs `pane.focus`, then the command that mod names. The repo's 18 tests pass.
- It replaced `pane-plus` on 2026-11-17: a clone of Herdr's `pane` 0.1.13 that drew `pane-heads`
  and the old `claude.info` label. It and `pane-plus.patch` are in this repo's history at `cfb9052`.
- To update: change and push `~/Code/herdr-app-pane-header` (the app picks it up through the
  symlink), then move the pin as for the reviewer.

## Reviewer pane

`mods/reviewer` is a symlink into the `src/herdr-app-reviewer` submodule:
[lucindo/herdr-app-reviewer](https://github.com/lucindo/herdr-app-reviewer), a fork of
[gfronza/herdr-app-reviewer](https://github.com/gfronza/herdr-app-reviewer) (MIT), pinned at
`fc1cdd1d256bd7604768346627ff46275849d64e` (2026-11-18). On this computer the installed
`~/.config/herdr-app/mods/reviewer` is a symlink to the same folder in the working clone at
`~/Code/herdr-app-reviewer`, so the app runs whatever is checked out there. Only the mod folder
is installed; the repo's tests, `scripts/check` and its Claude Code hooks are for developing it.
Herdr writes its own `gpui-kit.d.ts` into the mod folder; the fork's `.gitignore` leaves it out.

- `cmd-r` (in `keys.json` `"global"`, after `cmd-p`) opens a pane right of the focused pane,
  bound to that pane's folder, listing its uncommitted changes as a diff; `cmd-r` again closes it.
  In the pane: `j`/`k`, `c` comment, `v` select lines, `y` copy the review, `s` paste it into
  the tab's agent (no Enter), `l` stacked / side by side, `w` old beside new, `z` tree / flat
  file list, `a` every listed file's diff in one list, `m` rendered Markdown, `/` `n` `N` find in the diff, `p` go to a file, `P` search
  changed lines, `.` change the base folder (also Change on its row in the folders view; kept per
  tab across restarts), `,` settings (also the header's gear). Full key list in its README.
- Folder picker (Change and Add folder): the system's (Finder) by default. On this computer the
  settings screen has it on Typed (kept in `shared.json`, which this repo doesn't hold, so pick it
  again after a restore): a box with the open terminals' folders, recent picks and path
  completion, and no `.DS_Store` files left in the folders Finder would browse.
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
  `--no-optional-locks`, no index refresh; no network. The typed folder picker runs
  `find -L <folder>` (one or two levels deep, 10 s timeout) to list subfolders and repos.
  Shared-state keys:
  `reviewer.watch` (watched folders), `reviewer.layout`, `reviewer.bases` (picked base per
  repo), `reviewer.base-folder` (changed base folder per tab), `reviewer.recent-folders`
  (folders picked before), `reviewer.files` (tree or flat), `reviewer.diff` (unified or split) and `reviewer.wrap`
  (wrap long lines, toggled by the header's wrap button or the `reviewer.wrap` command; no key),
  and `reviewer.settings` (the settings screen's other choices: all files or one, the diff text
  size, the folder picker, how a new pane starts, the refresh interval and the limits; it holds
  only values that differ from the default).
  It also writes its title and controls under its pane id in `pane-heads` and reads
  `pane-heads-headers` and `pane-heads-actions` (see [Pane header](#pane-header)).
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
- Updated 2026-11-17 from `34d06f5` (one row of the header's controls when no header draws
  them, our PR #11 to gfronza). Re-audited: no new programs, app commands or shared-state keys
  (it reads `layout()` and `pane-heads-actions` as before); `vendor/` unchanged; the repo's 189
  tests pass.
- Updated 2026-11-17 from `55dbf24` (finds the header that draws its controls through the
  `pane-heads-headers` registry, our PR #12 to gfronza). Re-audited: no new programs, app
  commands or file access; one new shared-state key, `pane-heads-headers` (read only);
  `vendor/` unchanged; the repo's 192 tests pass.
- Updated 2026-11-18 from `7aa30dc` (change the base folder with `.`, and a typed folder picker
  behind a setting, our PR #13 to gfronza). Re-audited: one new command, read-only
  `find -L <folder> -mindepth 1|2 -maxdepth 1|2 (-type d | -name .git)` with a 10 s timeout; no
  new app commands, network or file writes (new read-only calls `home()` and `spaces()`); new
  shared-state keys `reviewer.base-folder` and `reviewer.recent-folders`; `vendor/` unchanged;
  the repo's 203 tests pass.
- To update: change or sync `~/Code/herdr-app-reviewer` (the app picks it up through the
  symlink), check new `exec`/`run` calls from upstream, and push the fork. Then move the pin:
  `git -C src/herdr-app-reviewer fetch`, `git -C src/herdr-app-reviewer checkout <commit>`,
  `git add src/herdr-app-reviewer` and commit. Pin only pushed commits, or a restore can't fetch them.

## Theme: Catppuccin Frappé

`settings.json` sets `"theme": "catppuccin-frappe"` and `main-plus` sets no theme, so every
mod (reviewer, quota, system, pane-header) draws with it through `theme()`. Herdr derives the
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
