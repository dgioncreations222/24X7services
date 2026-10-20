# Customer Service app (placeholder name) — native (Expo)

The customer app as a real React Native app: Expo SDK 57, Expo Router, Uniwind
(Tailwind v4 on native). It shares `@app/shared` and the Firebase backend with
the web app in `../frontend`, and carries the same design tokens, copy and
light/dark themes.

```bash
npm install          # also copies ../frontend/public into assets/ and builds Uniwind types
npm start            # Expo dev server — open in Expo Go or a development build
npm run android      # straight onto an Android device/emulator
npm run web          # browser preview on :3315
npm run typecheck
```

By default the app runs in **demo mode**: no backend, the seed catalog bundled
inside the app, and sign-in, booking and payment switched off — the same as the
shared web demo. Set `EXPO_PUBLIC_DEMO_MODE=false` plus either
`EXPO_PUBLIC_USE_EMULATORS=true` or the `EXPO_PUBLIC_FIREBASE_*` keys to point
it at a backend.

See [PORTING.md](PORTING.md) for how web screens map onto this app.
