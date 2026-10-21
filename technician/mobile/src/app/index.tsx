import { Redirect } from 'expo-router'
import { useSession } from '@/lib/data'
import { homeFor } from '@/lib/gate'

/**
 * The splash's way out: the session is restored from the device with no
 * network wait, so this routes at once — to sign-in, registration, KYC or
 * the KYC status, or straight to work. (The splash itself is the native one
 * held by the root layout until fonts and storage are ready.)
 */
export default function Index() {
  return <Redirect href={homeFor(useSession())} />
}
