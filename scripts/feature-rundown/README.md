# AIOStreams feature rundown

One report that answers, for every AIOStreams config option, preset and SEL function:

- does the release we are pinned to (`configurator/UPSTREAM.pin`) have it, and does the newest upstream release?
- which of our output profiles use it (Stable, Balanced, Advanced, Labs, read from the golden configs), how many static templates, and the smart template;
- why we use it, or why not (`decisions.json`);
- what upstream changed since the pin that can affect which streams a config finds or how it ranks them.

```bash
node scripts/feature-rundown/rundown.mjs                    # writes reports/FEATURE-RUNDOWN.md and reports/feature-rundown.json
node scripts/feature-rundown/rundown.mjs --latest v2.38.1   # skip the tag lookup
node --test scripts/feature-rundown/tests/*.test.mjs        # offline tests
```

Zero dependencies, Node 20+. It reads upstream source from `raw.githubusercontent.com` and finds the newest release tag with `git ls-remote`, so it needs no GitHub token and no API.

## When something needs attention

The report's **Needs attention** table lists:

| Flag | What to do |
|---|---|
| `no decision` | Add the option to `decisions.json` with a status and a reason. Every option upstream adds lands here first. |
| `decision says used, but no generated config or template sets it` | Either a generator stopped emitting it (check why) or the decision is out of date. |
| `decision says off-by-design / not-applicable, but configs set it` | A generator or template started using it: confirm and change the status. |
| `removed upstream by …` | The newest release dropped it. Plan the removal before bumping the pin. |

Statuses: `used`, `candidate` (worth evaluating — say what it would gain), `off-by-design` (deliberately off — say why), `not-applicable` (identity, credentials, UI or server settings a template must not carry). An exact entry under `options` wins over a `patterns` rule.

## Automation

`.github/workflows/feature-rundown.yml` runs every Monday, on demand, and when the pin, goldens, templates or this tool change. On `main` and on schedule it opens or updates one issue labelled `feature-rundown` when an option needs a decision or upstream is ahead of the pin, and closes it once neither is true. On pull requests it only tests and posts the report to the run summary.

## How usage is counted

A golden "uses" an option when the option switches something on: an object with `enabled: true`, a non-empty list, or a set value. `{ enabled: false }` and `[]` count as off. Templates under `Personal/`, `Deprecated/` and `Legacy/` are left out. The smart template counts an option when the key is present, since its values are answer-dependent directives.
