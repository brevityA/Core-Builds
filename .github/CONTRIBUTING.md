# Contributing to Core Builds by Brevity

Thanks for wanting to contribute. Here's how to get involved without breaking anything.

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

## ✅ Pull Request Checklist

- [ ] JSON files are valid (CI will auto-check)
- [ ] No credentials or API keys included
- [ ] README added for any new template or formatter
- [ ] Description in the PR explains what changed and why

---

## ❓ Questions

Not a bug or contribution — just a question? Open a [Discussion](https://github.com/Branding-Brevity/Core-Builds-By-Brevity/discussions) rather than an issue.
