# Install CPI 7.50.9

1. Leave the patch ZIP in Downloads.
2. Extract it into the CPI repository root with `ditto`.
3. Remove `.DS_Store` files.
4. Run `./release-check`.
5. Commit and push only after the final line says `CPI release check passed.`

This patch contains hand-authored JO viewer connection logic, source policy metadata, validations, release metadata, and documentation only. It does not contain generated tournament outputs, rankings, logos, or workflows.
