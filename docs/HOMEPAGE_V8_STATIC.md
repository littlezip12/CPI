# CPI V8 Static Homepage Rewrite

This replaces the homepage with a static, deterministic DOM order. It removes the homepage race condition by removing dynamic homepage assembly from `index.html`.

## Files

- `index.html` → `CPI/index.html`
- `css/homepage-v8.css` → `CPI/css/`
- `js/homepage-v8.js` → `CPI/js/`
- `docs/HOMEPAGE_V8_STATIC.md` → `CPI/docs/`

## After copying

Run:

```bash
cd ~/Documents/GitHub/CPI
./build-cpi
```

Then hard refresh 10+ times. Expected order every time:

1. Header
2. Hero
3. Top Stories
4. At-a-Glance
5. Subscribe
6. Footer

If stable:

```bash
git add -A
git commit -m "Rewrite homepage as static v8 structure"
git push
```
