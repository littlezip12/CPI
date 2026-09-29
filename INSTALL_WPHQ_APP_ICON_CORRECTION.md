# WPHQ iOS App Icon Correction

Replaces the default/incorrect iOS app icon with the approved Water Polo HQ logo.

Install from the CPI repo root:

```bash
unzip -o ~/Downloads/WPHQ_7.64.34_APP_ICON_CORRECTION_PATCH.zip -d .
```

Then run:

```bash
npm run mobile:preflight:ios
```

Open Xcode, Product > Clean Build Folder, then Run on the physical iPhone.
