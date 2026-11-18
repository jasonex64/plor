# Statecharts

Three of the app's most important user flows, drawn from the code as of commit `d3c2c62` (the human, 2026-11-17,
`docs/milestones/PROCESS-formal-verification.md` answers 4, 12 and 13). Each folder holds the flow as a small TLA+ spec
(each step cites its code), the `/statechart` view that words it, the Mermaid chart and its SVG.

| Folder | Flow |
|---|---|
| `first-day/` | A new player's first day: guest play, the bot check, making an account, today's game for points |
| `a-days-game/` | A signed-in player's day of Offbeat and of Fragments, Today to Results |
| `friends-and-groups/` | You and one other player as friends, and you in a group, side by side |

These are pictures, not checks. The runs and groups underneath are checked by the `verify-offbeat-run`,
`verify-fragments-run` and `verify-group-membership` skills; friend requests have no check, and their region says
"not verified".

**When a flow changes,** edit its spec and view, then redraw with the `/statechart` skill (spec, `--view`, and a
scratch `--out`), copy `chart.mmd` here, and render `chart.svg` with Pele as that skill's `references/render.md` says.
