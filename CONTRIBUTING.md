# Contributing to Core Builds by Brevity

Thanks for wanting to contribute. Here's how to get involved without breaking anything.

---

## 🤖 AI Tools

AI assistance is welcome when contributing. The templates in this project were created from scratch and debugged with AI help — the GitHub setup was also AI-assisted.

If you used AI to help debug or document a template, that's fine. What matters is that **you created it yourself and have tested it** on a real AIOStreams instance before submitting.

---

## 🐛 Reporting Bugs

Use the **Bug Report** issue template. The more detail the better — platform, host, template version, and what you expected vs what happened. Screenshots of the scrape summary are especially helpful.

---

## 📦 Submitting Community Templates

Community templates live in `Community-Templates/`. If you've built something you want to share:

1. Fork the repository
2. Add your template to `Community-Templates/YourName/your-template.json`
3. Include a `README.md` in your folder explaining the template (service, resolution, what it targets)
4. Open a pull request with a short description

**Requirements:**
- Valid JSON (the CI validator will check this automatically on your PR)
- No API keys, personal tokens, or credentials baked in
- A README in the same folder

---

## 🎨 Submitting Formatters

Same process as community templates — add your `.json` to `Community-Templates/YourName/` with a brief README. If it's high quality and distinct from existing formatters, it may be promoted to the main `Formatters/` folder.

---

## 📖 Improving Documentation

Small fixes (typos, broken links, outdated info) can be submitted as a PR directly. For larger changes to guides, open a Feature Request issue first so we can discuss scope.

---

## 🧪 Running Tests Locally

The repository includes a validator and a pytest suite that CI runs on every PR. You can run them locally before pushing.

**Set up a Python virtual environment:**

```bash
python3 -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

**Run the test suite:**

```bash
pytest                         # all 100+ unit + integration tests
```

**Run the validator directly against templates:**

```bash
python3 validate_templates.py --dir Templates
python3 validate_templates.py --file Templates/Torbox/Single/core-nexus-stream.json
```

The validator exits `0` (pass) or `1` (errors found), so it works in scripts too.

**Live testing with a local AIOStreams instance:**

To test how your template actually filters and sorts streams, run AIOStreams locally via Docker:

```bash
docker run -p 3000:3000 viren070/aiostreams
```

Then open `http://localhost:3000/stremio/configure` in your browser and import your template JSON. Full self-hosting docs: [docs.aiostreams.viren070.me](https://docs.aiostreams.viren070.me/getting-started/self-hosting/)

---

## ✅ Pull Request Checklist

- [ ] JSON files are valid (CI will auto-check)
- [ ] No credentials or API keys included
- [ ] README added for any new template or formatter
- [ ] Description in the PR explains what changed and why

---

## ❓ Questions

Not a bug or contribution — just a question? Open a [Discussion](https://github.com/brevityA/Core-Builds/discussions) rather than an issue.

---

## 🙏 Credits & Attribution

Every template in this repository stands on the work of the following projects. These attributions are not optional — they must be preserved in any fork, derivative template, or contribution.

**[Releases-Regex](https://github.com/Vidhin05/Releases-Regex)** — [@Vidhin05](https://github.com/Vidhin05)
Ranked regex patterns for quality detection are sourced from Vidhin's repository via synced URLs in all templates.

**[AIOStreams](https://github.com/Viren070/AIOStreams)** — [@Viren070](https://github.com/Viren070)
The open-source platform these templates are built for.

Any contribution that removes, obscures, or fails to preserve these credits will not be accepted.
