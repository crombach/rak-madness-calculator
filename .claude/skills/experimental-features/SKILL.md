---
name: experimental-features
description: Gate a work-in-progress feature behind the Experimental Features setting, or release or remove one already gated. Read before hiding a feature from readers who have not opted in, before shipping a gated feature to everyone, and before deleting a gated feature.
---

# Experimental features

`experimentalFeatures` from `useSettings()` in `src/context/SettingsContext.tsx` gates every work-in-progress feature. Any reader can turn it on in the settings dialog. Off by default.

- Never add a per-feature flag or a second setting. Every gated feature reads this one value.
- Never move `useSettingsSeen.ts`'s `SETTINGS_CHANGED_AT` for gating or releasing a feature. The dialog did not change.

## Gate a feature

A feature is experimental when it reads `experimentalFeatures`. No registry, no list, no comment marker. That read is how every later step finds it.

1. Hide every entry point when the value is false: a nav item, a link, a button.

   ```tsx
   const { experimentalFeatures } = useSettings();
   return experimentalFeatures && <Link to="compare">Compare Players</Link>;
   ```

2. Wrap the feature's route in `ExperimentalGate` (`src/components/results/`). A pasted URL then redirects to the scoreboard when false. Keep the route component to the gate and render the page inside it. The page's own hooks then never run while off.

   ```tsx
   export default function ComparePlayersRoute() {
     return (
       <ExperimentalGate>
         <ComparePlayers />
       </ExperimentalGate>
     );
   }
   ```

3. Skip work only the feature needs when false, such as a memoized derivation in a context. Return the value the feature's empty state already handles.
4. Test both states. Opt in by seeding `EXPERIMENTAL_FEATURES_KEY` from `SettingsContext` as `"on"` in `localStorage`, in `beforeEach` or before the mount. Leave it unset for off. Assert the entry point is absent and the route redirects when off.

## Release a feature to everyone

1. `grep -rn experimentalFeatures src` for the feature's call sites. Skip `SettingsContext.tsx`, `SettingsDialog.tsx`, `LogoButton.tsx`, and their tests. Those own the setting and its navbar β, not a feature.
2. At each one, delete the check and keep the code the true branch ran.
3. Delete the tests of the feature's off state. Keep the on-state tests, without the seeded key.
4. Keep the setting, its dialog row, and the β when no call site remains. The next gated feature reuses them.

## Remove an abandoned feature

Delete the feature's code, its `experimentalFeatures` checks, and its tests. Keep the setting, its dialog row, and the β.
