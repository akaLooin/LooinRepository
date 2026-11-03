# Design system

- `tokens.json` (dark) and `tokens.light.json` (light): colour roles, type scale, spacing, sizes, radius. Measured from `replica/screens/`.
- `components.md`: every component, its variants, states, tokens and accessibility.
- `gallery-dark.png`, `gallery-light.png`: the primitives built in `app/src/components`, rendered from the `/design` screen.

After changing a token:

```bash
python3 ../../.claude/skills/replica-design/contrast.py tokens.json
python3 ../../.claude/skills/replica-design/contrast.py tokens.light.json
cd ../../app && npm run tokens     # regenerates app/src/theme/tokens.ts
```
