# Core Builds CLI

Command-line tool for generating, validating, and comparing AIOStreams template JSONs. Uses the same shared core as the [Configurator](https://brevitya.github.io/Core-Builds/configurator/), so output is identical.

## Installation

```bash
npm install core-builds
```

Or from a local checkout:

```bash
cd cli
npm ci
npm link
```

## Commands

### generate

Generate a complete AIOStreams template JSON.

```bash
core-builds generate \
  --service torbox-pro \
  --device shield \
  --resolution 4k \
  --architecture iqr \
  --output template.json
```

**Required:**

| Flag | Description |
|------|-------------|
| `--service <id>` | Service ID (`torbox-pro`, `alldebrid`, `easynews`, `p2p`, `http`) |

**Optional:**

| Flag | Default | Description |
|------|---------|-------------|
| `--device <id>` | `generic` | Device profile |
| `--resolution <res>` | `4k` | `4k`, `1080p`, `mixed`, `ultrawide` |
| `--architecture <a>` | `standard` | `standard`, `iqr`, `apex-mixed` |
| `--audio <mode>` | `standard` | `lossless`, `standard`, `limited`, `dolby` |
| `--formatter <id>` | `family-v4` | Formatter ID |
| `--content <type>` | `all` | `all`, `anime`, `live`, `mixed` |
| `--match-mode <m>` | `balanced` | `relaxed`, `balanced`, `strict` |
| `--cache-mode <m>` | `mixed` | `mixed`, `cached`, `uncached` |
| `--size-limit <GB>` | unlimited | Max file size in GB (e.g. `10` for 10 GB) |
| `--output <file>` | stdout | Output file path |
| `--name <name>` | auto | Template name override |
| `--id <id>` | auto | Template metadata ID |

Without `--output`, the JSON is written to stdout.

### validate

Validate an AIOStreams template JSON against the schema.

```bash
core-builds validate template.json
core-builds validate template.json --strict
```

With `--strict`, warnings are treated as errors (nonzero exit).

### diff

Compare two AIOStreams template JSONs. Credentials are automatically redacted in all output.

```bash
core-builds diff old.json new.json
core-builds diff old.json new.json --json
```

Exit codes: `0` = identical, `1` = differences found.

With `--json`, outputs a machine-readable JSON object:

```json
{
  "fileA": "old.json",
  "fileB": "new.json",
  "differences": [
    { "path": "config.size", "type": "changed", "a": "...", "b": "..." }
  ]
}
```

### info

Show a metadata summary of a template file.

```bash
core-builds info template.json
```

### List commands

```bash
core-builds devices         # List supported device profiles
core-builds services        # List supported service IDs
core-builds formatters      # List available formatter IDs
core-builds architectures   # List SEL PSE architectures
```

### Other flags

```bash
core-builds --help       # Show usage
core-builds --version    # Print version
```

## Size limit

The `--size-limit` flag sets a maximum file size in GB for generated templates. When set:

- `config.size.global.movies[1]` and `config.size.global.series[1]` are set to the byte equivalent
- A `size(streams,'1B','<N>GB')` ESE is added to enforce the limit in SEL

Without `--size-limit`, default generous bounds are used and no restrictive size ESE is added.

## Security

- Credentials in diff output are automatically redacted (fields matching `apiKey`, `password`, `secret`, `authKey`, `token`)
- `npm pack` excludes `node_modules` (except the bundled `@core-builds/core`), `.env` files, test results, and coverage
- No account login or deployment features in CLI v1 — generate, validate, and compare only

## Golden equivalence

The CLI uses the same `@core-builds/core` package as the Configurator. Output is verified identical (after normalizing volatile metadata fields `generatedAt`, `id`, and `name`) against Configurator golden fixtures for all supported service/device/resolution/architecture combinations.

## Development

```bash
cd cli
npm ci
npm test          # Run all tests
npm pack --dry-run  # Check package contents
```
