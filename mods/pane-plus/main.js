// A pane's header, for layouts that frame their panes:
//   { "tab": "active", "pane": { "header": { "content": { "mod": "pane-plus" } } } }
// Shows the program's icon (the app's program table), the agent's name or
// the terminal's title, the folder, Claude Code's model, effort and context (the label
// `claude.info`, set by ~/.local/bin/claude-herdr-info from Claude Code hooks) and the agent's status; buttons split,
// zoom and close this pane. Props from the app: { pane, terminal }. Click: focus the pane.
// A mod pane can publish its own title, icon, folder, badge and controls under its pane id in the
// shared key `pane-heads` (as the reviewer and Better Changes do); this header shows them.

import { View, div, svg, image } from "gpui-kit";
import { h_flex } from "gpui-base";
import { panes, props, run, theme, home, terminals, shared, setShared, checking } from "herdr";

const HEADS_KEY = "pane-heads";
// Header mods that draw `actions`: a mod that publishes them hides its own controls under these.
const ACTIONS_KEY = "pane-heads-actions";

function icon(p, size, color) {
  if (!p?.icon) return null;
  return p.tint ? svg(p.icon).size(size).flex_none().text_color(color) : image(p.icon).w(size).h(size).flex_none();
}

function folder(cwd) {
  if (!cwd) return "";
  const h = home();
  return cwd === h ? "~" : cwd.startsWith(h + "/") ? "~" + cwd.slice(h.length) : cwd;
}

export default class Pane extends View {
  init() {
    this.hovered = false;
    const mods = /** @type {string[]} */ (shared(ACTIONS_KEY) ?? []);
    if (!checking() && !mods.includes("pane-plus")) setShared(ACTIONS_KEY, [...mods, "pane-plus"]);
  }

  me() {
    return panes().find((p) => p.pane === props()?.pane);
  }

  button(t, id, icon, command, args) {
    return div()
      .id(id)
      .p(3)
      .rounded(4)
      .text_color(t.dim)
      .hover((s) => s.bg(t.hover).text_color(t.foreground))
      .on_click((_e, cx) => {
        cx.stop_propagation();
        run(command, args);
      })
      .child(svg(`mods/pane-plus/${icon}.svg`).size(14));
  }

  // Mod commands reach only the focused copy of the mod, so focus the pane first.
  action(t, pane, a, i) {
    const el = div()
      .id(`ph-a-${pane}-${i}`)
      .flex_none()
      .h(20)
      .flex()
      .items_center()
      .rounded(4)
      .cursor_pointer()
      .text_color(a.selected ? t.foreground : t.dim)
      .when(Boolean(a.selected), (e) => e.bg(t.selected))
      .when(Boolean(a.gap), (e) => e.ml(8))
      .hover((s) => s.bg(t.hover).text_color(t.foreground))
      .tooltip(a.tooltip ?? a.label ?? "")
      .on_click((_e, cx) => {
        cx.stop_propagation();
        run("pane.focus", { pane });
        run(a.command);
      });
    return a.icon ? el.px(3).child(svg(a.icon).size(14)) : el.px(6).text_size(11).child(a.label);
  }

  render(cx) {
    const t = theme();
    const p = this.me();
    if (!p) return div();
    const name = ((p.program?.agent || p.program?.shell) && p.program.name) || p.title || p.program?.name || "shell";
    const st = p.status;
    const pane = p.pane;
    const head = /** @type {Record<string, any> | undefined} */ (shared(HEADS_KEY)?.[pane]);
    const pic = head?.icon
      ? head.color ? image(head.icon).w(14).h(14).flex_none() : svg(head.icon).size(14).flex_none().text_color(t.dim)
      : icon(p.program, 14, t.dim);
    // The label outlives Claude in its terminal: show it only while an agent is reporting there.
    const info = st && p.terminal ? terminals().find((x) => x.address === p.terminal)?.labels?.["claude.info"] : null;
    return h_flex()
      .id(`pane-head-${pane}`)
      .size_full()
      .px(10)
      .gap(8)
      .items_center()
      .bg(t.background)
      .border_b(1)
      .border_color(t.border)
      .text_size(12)
      .on_hover((hovered, cx) => { this.hovered = hovered; cx.notify(); })
      .on_click(() => run("pane.focus", { pane }))
      .when(Boolean(pic), (el) => el.child(pic))
      .child(div().flex_none().truncate().max_w(260).font_medium().text_color(t.foreground).child(head?.title ?? name))
      // Controls sit before the folder, which takes the hover buttons' room, so they never move.
      .when(Boolean(head?.actions?.length), el => el.child(h_flex().flex_none().gap(2).items_center()
        .children(head.actions.map((a, i) => this.action(t, pane, a, i)))))
      .when(Boolean(head?.badge), el => el.child(div().flex_none().px(6).rounded(4).bg(t.accent).text_color(t.accent_foreground).text_size(11).child(head.badge)))
      .child(div().flex_1().min_w(0).truncate().text_color(t.dim).child(folder(head?.detail ?? p.cwd)))
      .when(Boolean(info), el => el.child(div().flex_none().text_color(t.muted).child(info)))
      .when(st === "working", el => el.child(svg("mods/workspace-chrome/spinner.svg").size(12).flex_none().text_color(t.working).spin(900)))
      .when(st === "blocked", el => el.child(div().flex_none().px(6).h(18).flex().items_center().rounded(5).bg(t.blocked + "26").text_size(10.5).font_semibold().text_color(t.blocked).child("Needs you")))
      .when(st === "done", el => el.child(div().size(7).flex_none().rounded(4).bg(t.done)))
      .when(this.hovered, el => el
        .child(this.button(t, `ph-r-${pane}`, "split-right", "pane.split", { direction: "right", pane }))
        .child(this.button(t, `ph-d-${pane}`, "split-down", "pane.split", { direction: "down", pane }))
        .child(this.button(t, `ph-z-${pane}`, p.zoomed ? "unzoom" : "zoom", "pane.zoom", { pane }))
        .child(this.button(t, `ph-x-${pane}`, "close", "pane.close", { pane })));
  }
}
