# Install CPI 7.40.0

1. Copy the patch contents into the root of the current CPI repository and allow matching files to replace the existing versions.
2. Open Terminal in the CPI repository.
3. Run:

```bash
chmod +x release-check scripts/build-identity-registry.py scripts/validate-identity-registry.py
./release-check
```

Expected identity result:

```text
IDENTITY REGISTRY VALIDATION PASSED
 - 138 canonical clubs from 143 legacy club records
 - 506 season/age/gender team identities
```

4. Review and push:

```bash
git status
git diff --stat
git add -A
git commit -m "Add CPI canonical club and team identity layer"
git push
```

The public ranking order and JO schedule interface are intentionally unchanged. Release 7.40 adds shared identity metadata underneath them.
