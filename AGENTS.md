## Agent skills

### Issue tracker

Issues and specs live in GitHub Issues for `brianharv/poke-center`.
Read `docs/agents/issue-tracker.md` before working with tickets.

### Triage labels

Use the five default triage labels. Read `docs/agents/triage-labels.md`
before assigning labels.

### Domain docs

Use a single-context layout: root `GLOSSARY.md` and `docs/adr/`.
Read `docs/agents/domain.md` before exploring domain concepts or decisions.

## Feature branches

- Create a parent feature branch from current `main` for each parent issue:
  `feature/<parent-number>-<short-slug>`.
- Create each child ticket branch from the latest parent feature branch:
  `feature/<child-number>-<short-slug>`.
- Start a child ticket only after its blocking tickets have been integrated
  into the parent feature branch.
- Target child pull requests at the parent feature branch. Integrate completed
  child tickets there so subsequent branches inherit their changes.
- Target the completed parent feature pull request at `main` after all child
  tickets are integrated and feature checks pass.
- Keep ticket implementation on its child branch; create neither ticket changes
  directly on `main` nor child pull requests targeting `main`.
