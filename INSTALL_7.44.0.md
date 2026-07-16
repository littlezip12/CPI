# Install CPI 7.44.0

Merge this patch into the CPI repository, then run:

```bash
chmod +x release-check scripts/build-ranking-review.py scripts/test-ranking-review-engine.py scripts/validate-ranking-review-engine.py
./release-check
```

Commit only after the release check passes.
