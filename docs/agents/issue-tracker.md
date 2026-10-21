# Issue tracker: GitHub

Issues and specs live in GitHub Issues for `brianharv/poke-center`.
Use the `gh` CLI from this checkout.

## Conventions

- Publish specs and implementation tickets as GitHub issues.
- Read issue bodies, labels, and comments before starting work.
- Use one issue per implementation ticket.
- Link implementation tickets to their parent spec using sub-issues.
  If unavailable, add `Part of #<parent>` to each child and a task
  list to the parent.
- Use the labels defined in `triage-labels.md`.
- Use `--body-file` for multiline issue bodies and comments.
- Close completed tickets with a comment describing the result.

## Pull requests as a triage surface

PRs as a request surface: no.

## Wayfinding

- Keep the map in a GitHub issue labelled `wayfinder:map`.
- Link child tickets as sub-issues and label them
  `wayfinder:research`, `wayfinder:prototype`,
  `wayfinder:grilling`, or `wayfinder:task`.
- Record blockers using native GitHub issue dependencies.
  If unavailable, use `Blocked by: #<number>` in the issue body.
- Select the first open, unblocked, unassigned child in map order.
- Claim a ticket by assigning it to the driving developer.
- Resolve it by commenting with the answer, closing it, and
  adding a gist and link to the map's Decisions-so-far.
