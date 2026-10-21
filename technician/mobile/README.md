# Customer Service Partner — native app

Expo SDK 57 + Expo Router + Uniwind (Tailwind on React Native). A port of the
Next.js technician app one folder up, with the same seeded demo kept on the
device (expo-sqlite kv-store; localStorage on the web preview).

```bash
npm install
npm start            # Expo dev server — open in Expo Go / a dev build
npm run web          # web preview on :3325
npm run typecheck
```

Rules for porting a screen: see `PORTING.md`.

## Web preview on Vercel

Live at https://24x7-technician-app.vercel.app (Vercel project
`24x7-technician-app`, deployed by hand — pushes do not deploy).

```bash
node scripts/web-deploy.mjs <outDir>     # export + fixes for Vercel
cd <outDir> && npx vercel@latest link --project 24x7-technician-app --yes
npx vercel@latest deploy --prod
```
