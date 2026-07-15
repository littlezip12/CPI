# Install CPI 7.39.0

This is an incremental foundation patch for a repository that already contains CPI 7.38.2.

## Install

1. Unzip the patch.
2. Copy its contents into the root of the existing CPI repository.
3. Allow the included files to replace their current versions.
4. From the repository root, run:

```bash
./release-check
```

Expected result:

- `New blockers: 0`
- `Known legacy blockers: 545`
- `PASSED`
- `JO RELEASE VALIDATION PASSED`

The known blocker count is the checked-in migration baseline. It is visible technical debt, not newly introduced failure. Any new broken reference, invalid JSON/JavaScript, ranking-structure error, or JO regression will now fail the release check.

## Commit

```bash
git status
git add .
git commit -m "Add CPI release integrity foundation"
git push
```

## Important command distinction

Use this for the current site:

```bash
./release-check
```

The experimental ranking engine remains unavailable because its source registries and raw tournament inputs are absent. `./build.sh` now stops safely instead of generating empty outputs.
