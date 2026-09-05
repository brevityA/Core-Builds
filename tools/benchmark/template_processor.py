#!/usr/bin/env python3
"""Resolve AIOStreams wizard-template directives, client-side.

WHY THIS EXISTS
---------------
Several published community templates (notably Tamtaro's "Complete SEL Setup")
are **wizard templates**: their config is not a plain config but a tree of
directives — `__if`, `__switch`/`cases`, `__value`, `__remove`, and
`{{inputs.*}}` / `{{services*}}` placeholders — that the AIOStreams *frontend*
resolves while the user clicks through the import wizard.

Directive resolution lives ENTIRELY in `packages/frontend`
(`src/lib/templates/processors/conditionals.ts` @ v2.34.0). The server does
none of it: `POST /api/v1/user` stores whatever config JSON it is handed, and
`routes/api/templates.ts` contains zero directive handling. Verified 2026-09-06.

So a benchmark harness that POSTs such a template raw would install a config
full of literal `"{{inputs.includeAddon.timeout}}"` strings and `__if` objects
— either erroring out or, worse, silently installing a misconfigured addon set
and scoring the competitor unfairly. Measuring that would be a fabricated
result.

This module is a faithful Python port of the upstream TypeScript so the harness
resolves wizard templates the same way a real user's browser does.

PORT FIDELITY
-------------
Ported 1:1 from conditionals.ts @ v2.34.0, including the deliberately quirky
bits, because diverging would silently change what we measure:
  * `0` is TRUTHY in the bare-truthiness form (only undefined/null/''/False/[]
    are falsy).
  * Operator precedence is `and` > `xor` > `or`, and splitting only happens on
    a following `!?(inputs|services)\b` token.
  * `services.<id>` does NOT support operators — it falls through to False.
  * A bare `services.<id>` single-token `{{...}}` resolves to a BOOLEAN.
  * `{{services.<id>.<key>}}` (a credential ref) is intentionally PRESERVED as
    a literal for a later credential pass — we never fill these from the env,
    since the harness injects credentials via `apply_lane()` instead.
  * String items that resolve to arrays are SPREAD into the parent array.

Usage:
    from template_processor import apply_template_conditionals, default_inputs
    cfg = apply_template_conditionals(raw_cfg, inputs, ["torbox"])
"""

from __future__ import annotations

import re
from typing import Any

# Sentinel: this object property should be dropped from its parent.
REMOVE_KEY = object()


def get_nested_input_value(input_vals: dict, key: str) -> Any:
    cur: Any = input_vals
    for part in key.split("."):
        if cur is None or not isinstance(cur, dict):
            return None
        cur = cur.get(part)
    return cur


def _truthy(val: Any) -> bool:
    # Mirrors upstream: 0 IS truthy; ''/False/[]/None are falsy.
    if val is None or val is False or val == "":
        return False
    if isinstance(val, list) and len(val) == 0:
        return False
    return True


def evaluate_template_condition(condition: str, input_vals: dict, selected_svcs: list[str]) -> bool:
    trimmed = (condition or "").strip()

    # Compound forms, lowest precedence first: or -> xor -> and
    for op, combine in (("or", any), ("xor", None), ("and", all)):
        parts = re.split(rf" {op} (?=!?(?:inputs|services)\b)", trimmed)
        if len(parts) > 1:
            vals = [evaluate_template_condition(p.strip(), input_vals, selected_svcs) for p in parts]
            if op == "xor":
                return sum(vals) % 2 == 1
            return combine(vals)

    negated = trimmed.startswith("!")
    expr = trimmed[1:].strip() if negated else trimmed

    # Numeric comparison: inputs.<key> >= <n>
    m = re.match(r"^(\w+)\.(.+?)\s+(>=|<=|>|<)\s+(-?\d+(?:\.\d+)?)$", expr)
    if m:
        ns, key, op, rhs_raw = m.groups()
        result = False
        if ns == "inputs":
            lhs = get_nested_input_value(input_vals, key)
            try:
                num = float(lhs)
                rhs = float(rhs_raw)
                result = {">=": num >= rhs, "<=": num <= rhs, ">": num > rhs, "<": num < rhs}[op]
            except (TypeError, ValueError):
                result = False
        return (not result) if negated else result

    # Operator form: ==, !=, includes
    m = re.match(r"^(\w+)\.(.+?)\s+(==|!=|includes)\s+(.+)$", expr)
    if m:
        ns, key, op, rhs = m.group(1), m.group(2), m.group(3), m.group(4).strip()
        result = False
        if ns == "inputs":  # services.* intentionally unsupported -> False
            lhs = get_nested_input_value(input_vals, key)
            lhs_s = "" if lhs is None else str(lhs)
            if op == "==":
                result = lhs_s == rhs
            elif op == "!=":
                result = lhs_s != rhs
            elif op == "includes":
                result = rhs in lhs if isinstance(lhs, (list, str)) else False
        return (not result) if negated else result

    # Bare truthiness
    if "." not in expr:
        if expr == "services":
            return len(selected_svcs) == 0 if negated else len(selected_svcs) > 0
        return negated
    ns, key = expr.split(".", 1)
    result = False
    if ns == "inputs":
        result = _truthy(get_nested_input_value(input_vals, key))
    elif ns == "services":
        result = key in selected_svcs
    return (not result) if negated else result


def resolve_ref(ref: str, input_vals: dict, selected_svcs: list[str]) -> Any:
    t = (ref or "").strip()
    if t == "services":
        return list(selected_svcs)
    if t.startswith("inputs."):
        return get_nested_input_value(input_vals, t[len("inputs."):])
    if t.startswith("services."):
        return t[len("services."):] in selected_svcs
    return None


_SINGLE_TOKEN = re.compile(r"^\{\{(inputs|services)\.([^}]+)\}\}$")
_ANY_TOKEN = re.compile(r"\{\{(inputs|services)\.([^}]+)\}\}")


def apply_template_conditionals(value: Any, input_vals: dict, selected_svcs: list[str]) -> Any:
    # Arrays: filter on __if, then flat-map (__value spreads arrays)
    if isinstance(value, list):
        out: list = []
        for item in value:
            if isinstance(item, dict) and "__if" in item:
                if not evaluate_template_condition(item["__if"], input_vals, selected_svcs):
                    continue
                rest = {k: v for k, v in item.items() if k != "__if"}
                if "__value" in rest:
                    val = apply_template_conditionals(rest["__value"], input_vals, selected_svcs)
                    out.extend(val if isinstance(val, list) else [val])
                else:
                    r = apply_template_conditionals(rest, input_vals, selected_svcs)
                    if r is not REMOVE_KEY:
                        out.append(r)
                continue
            if isinstance(item, dict) and "__value" in item:
                val = apply_template_conditionals(item["__value"], input_vals, selected_svcs)
                out.extend(val if isinstance(val, list) else [val])
                continue
            resolved = apply_template_conditionals(item, input_vals, selected_svcs)
            if resolved is REMOVE_KEY:
                continue
            # a string that resolved to an array is spread
            out.extend(resolved if isinstance(resolved, list) else [resolved])
        return out

    if isinstance(value, dict):
        if "__switch" in value:
            cases = value.get("cases") or {}
            default_val = value.get("default", None)
            resolved = resolve_ref(value["__switch"], input_vals, selected_svcs)
            # JS String(true) -> "true"; match that for boolean/array refs
            if isinstance(resolved, bool):
                key = "true" if resolved else "false"
            elif isinstance(resolved, list):
                key = ",".join(str(x) for x in resolved)
            elif resolved is not None:
                key = str(resolved)
            else:
                key = None
            chosen = cases[key] if (key is not None and key in cases) else default_val
            return apply_template_conditionals(chosen, input_vals, selected_svcs)

        if "__if" in value and "__value" in value:
            if evaluate_template_condition(value["__if"], input_vals, selected_svcs):
                return apply_template_conditionals(value["__value"], input_vals, selected_svcs)
            return REMOVE_KEY

        if value.get("__remove") is True:
            return REMOVE_KEY

        result = {}
        for k, v in value.items():
            r = apply_template_conditionals(v, input_vals, selected_svcs)
            if r is not REMOVE_KEY:
                result[k] = r
        return result

    if isinstance(value, str):
        if value == "{{services}}":
            return list(selected_svcs)
        m = _SINGLE_TOKEN.match(value)
        if m:
            ns, key = m.groups()
            if ns == "inputs":
                v = get_nested_input_value(input_vals, key)
                return v if v is not None else ""
            if ns == "services":
                if "." in key:  # credential ref: preserve for a later pass
                    return "{{services." + key + "}}"
                return key in selected_svcs

        def _sub(mo: re.Match) -> str:
            ns, key = mo.group(1), mo.group(2)
            if ns == "inputs":
                v = get_nested_input_value(input_vals, key)
                return "" if v is None else str(v)
            if ns == "services":
                if "." in key:
                    return "{{services." + key + "}}"
                return "true" if key in selected_svcs else "false"
            return ""

        return _ANY_TOKEN.sub(_sub, value.replace("{{services}}", ",".join(selected_svcs)))

    return value


def as_config_array(value: Any) -> list:
    """A template field may be a resolved array or an unresolved directive."""
    if isinstance(value, list):
        return value
    if isinstance(value, dict) and isinstance(value.get("__value"), list):
        return value["__value"]
    return []


def has_unresolved_directives(node: Any, path: str = "") -> list[str]:
    """Return paths still containing directives/placeholders. Must be empty
    before a config is POSTed, or the benchmark measures a broken install."""
    hits: list[str] = []
    if isinstance(node, dict):
        for k, v in node.items():
            if isinstance(k, str) and k.startswith("__"):
                hits.append(path or "/")
            hits += has_unresolved_directives(v, f"{path}/{k}")
    elif isinstance(node, list):
        for i, v in enumerate(node):
            hits += has_unresolved_directives(v, f"{path}/{i}")
    elif isinstance(node, str) and "{{" in node and not node.startswith("{{services."):
        hits.append(path)
    return hits


def collect_inputs(node: Any, found: set | None = None) -> set:
    """Every `inputs.<key>` referenced anywhere in a template."""
    if found is None:
        found = set()
    if isinstance(node, dict):
        for k, v in node.items():
            if k == "__if" and isinstance(v, str):
                found.update(re.findall(r"inputs\.([\w.]+)", v))
            if k == "__switch" and isinstance(v, str) and v.startswith("inputs."):
                found.add(v[len("inputs."):])
            collect_inputs(v, found)
    elif isinstance(node, list):
        for v in node:
            collect_inputs(v, found)
    elif isinstance(node, str):
        found.update(re.findall(r"\{\{inputs\.([^}]+)\}\}", node))
    return found


def default_inputs(template: dict) -> dict:
    """Build the wizard's default answers from the template's declared options.

    Uses each option's `default`, so we benchmark the template AS ITS AUTHOR
    SHIPS IT rather than as we'd tune it. Options with no default are left
    unset (falsy), which mirrors an untouched wizard.
    """
    inputs: dict = {}

    def walk(opts: Any) -> None:
        if not isinstance(opts, list):
            return
        for o in opts:
            if not isinstance(o, dict):
                continue
            oid = o.get("id")
            if oid and "default" in o:
                inputs[oid] = o["default"]
            for sub_key in ("subOptions", "options"):
                sub = o.get(sub_key)
                if isinstance(sub, list) and sub and isinstance(sub[0], dict) and "id" in sub[0]:
                    nested: dict = {}
                    for so in sub:
                        if isinstance(so, dict) and so.get("id") and "default" in so:
                            nested[so["id"]] = so["default"]
                    if nested and oid:
                        inputs.setdefault(oid, {})
                        if isinstance(inputs[oid], dict):
                            inputs[oid].update(nested)
                    walk(sub)

    meta = template.get("metadata") or {}
    for key in ("options", "inputs", "wizard"):
        walk(meta.get(key))
        walk(template.get(key))
    return inputs
