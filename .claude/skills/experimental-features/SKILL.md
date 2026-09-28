---
name: experimental-features
description: Gate a work-in-progress feature behind the Experimental Features setting, or release or remove one already gated. Read before hiding a feature from readers who have not opted in, before shipping a gated feature to everyone, and before deleting a gated feature.
---

# Experimental features

One setting gates every work-in-progress feature: `experimentalFeatures` from `useSettings()` in `src/context/SettingsContext.tsx`. Any reader can turn it on in the settings dialog. Off by default.

- Never add a per-feature flag or a second setting. Every gated feature reads this one value.
- Never move `Footer.tsx`'s `SETTINGS_CHANGED_AT` for gating or releasing a feature. The dialog did not change.

## Gate a feature

1. Hide every entry point when `experimentalFeatures` is false: a nav item, a link, a button.
2. Redirect its route with `<Navigate replace>` when false. Otherwise a pasted URL still reaches it.
3. Skip any work only the feature needs, such as a memoized derivation in a context, when false.
4. Test both states. Opt in by seeding `EXPERIMENTAL_FEATURES_KEY` as `"on"` in `localStorage`. Leave it unset for off.

## Release a feature to everyone

1. `grep -rn experimentalFeatures src` for the feature's call sites.
2. At each one, delete the check and keep the code the true branch ran.
3. Delete the tests of the feature's off state. Keep the on-state tests, without the seeded key.
4. Keep the setting and its dialog row when no call site remains. The next gated feature reuses them.

## Remove an abandoned feature

Delete the feature's code, its `experimentalFeatures` checks, and its tests. Keep the setting and its dialog row.
