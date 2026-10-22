## Description
<!-- What does this PR change and why? -->

## Type of Change
- [ ] Bug fix (template error, broken ESE/PSE, wrong setting)
- [ ] Template improvement (optimisation, new feature)
- [ ] New template
- [ ] Documentation update
- [ ] Workflow / infrastructure

## Template Checklist
<!-- If this PR modifies or adds a template JSON, complete this -->
- [ ] JSON is valid (passes `validate.yml`)
- [ ] `instanceId` present on all presets
- [ ] `timeout` set in all preset `options`
- [ ] `formatter.id` is `"tamtaro"` (or `"custom"` for community formatters)
- [ ] Stream expressions save on the pinned AIOStreams (`scripts/aio-save-test/run.sh open`) — `and` / `or` / `not` are operators (`not isAnime`, `not(x)` both work); `negate(a, b)` takes two stream lists
- [ ] `preferredResolutions` matches `includedResolutions` exactly
- [ ] Usenet settings (`cacheAndPlay`, `nzbFailover`) correct for plan tier
- [ ] `addonName` and `meta.id` are unique and correct
- [ ] Version bumped in `metadata.version`

## Testing
<!-- How did you test this? Which instance/plan was used? -->
- AIOStreams instance: 
- TorBox plan: 
- Content tested on: 

## Related Issues
<!-- Closes # -->
