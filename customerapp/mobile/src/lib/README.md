# Data layers in `src/lib`

Screens never talk to Firebase or to mock data directly (ESLint enforces it).
They read through one of two layers. Two exist for now because the app is
moving from the appliance-only catalog to the generic one.

| Layer | What it is | Types | Who uses it |
|---|---|---|---|
| `lib/api/*` | Firestore reads and writes moved out of the original screens. Behaviour is unchanged. | `@app/shared` (the original appliance schemas) | The existing screens: profile, addresses, support tickets, invoices, warranties, the appliance `/book/*` flow |
| `lib/data/*` (import from `@/lib/data`) | The generic catalog and everything built on it. Mock data today (`lib/mock`); the lead wires Firebase into these same functions later. | `@app/shared/catalog-v2` | The new screens (PR-4 onwards): login, category, service, cart, checkout, bookings, account, support |

## Which one should a screen use?

- **A new screen, or one being rebuilt:** `@/lib/data`.
- **An existing screen that is not being rebuilt:** keep it on `@/lib/api`
  until its replacement lands.
- **Never mix the two in one screen.** Their types differ (e.g. `Address` and
  `Booking` exist in both shapes).

## Name clashes

Where both layers have the same operation, `lib/data` uses a different name so
auto-import cannot pick the wrong one. This covers `lib/catalog` too, which
the existing screens read the appliance catalog through:

| `lib/api` | `lib/data` |
|---|---|
| `fetchAddresses(uid)` → shared `Address` | `fetchAddressBook()` → catalog-v2 `Address` |
| `fetchBooking(id)` → shared `Booking` | `fetchBookingById(id)` → catalog-v2 `Booking` |
| `fetchPopularServices()` (in `lib/catalog`) → `PopularService` | `fetchMostBookedServices()` → catalog-v2 `Service` |

## Plan to merge them into one layer

1. **Screens first.** Each later PR (PR-4 to PR-11) moves one area of the app
   onto `lib/data`. The old screens stay in the repo, unrouted, because the
   rule is that no file is deleted.
2. **Backend behind `lib/data`.** Once the functions and Firestore move to
   catalog-v2, replace each `lib/data` function's mock body with its Firestore
   read. Where a `lib/api` function already does that read, move its body into
   `lib/data`; the signatures do not change for screens.
3. **Retire `lib/api` piece by piece.** When no routed screen imports a
   `lib/api` module any more, mark it deprecated in a comment. It is removed
   only when the team agrees to delete files.
4. **Index the types.** When the appliance enums are gone (the lead's
   backend step), export catalog-v2 from the `@app/shared` index and drop the
   `/catalog-v2` path alias.
