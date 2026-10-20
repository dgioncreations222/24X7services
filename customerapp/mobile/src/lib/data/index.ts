/**
 * The data layer the new screens read through (catalog-v2 types, mock data
 * until the backend swap). Import from here, not from lib/api: see
 * src/lib/README.md for which layer a screen should use and the plan to
 * merge the two.
 *
 * Names here are kept distinct from lib/api's and lib/catalog's on purpose
 * (fetchAddressBook, fetchBookingById, fetchMostBookedServices), so an
 * editor's auto-import cannot pick the wrong layer.
 */
export * from './account'
export * from './bookings'
export * from './catalog'
