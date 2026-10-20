import { ProfileShell } from '@/components/ProfileShell'
import { Plus } from '@/screens/profile/membership/MembershipBody'

/**
 * Plus: what it does, what it costs, and when it runs out.
 *
 * Every benefit listed here is one the backend actually applies at checkout —
 * the visit fee is waived on the booking and the repair discount comes off the
 * approved total, both recorded on the booking itself so a membership that
 * lapses next week cannot re-price a job booked today. A membership screen
 * whose benefits are honoured by a person reading a spreadsheet is a refund
 * request with a screenshot attached.
 *
 * It does not renew itself, and the screen says so rather than burying it. A
 * subscription that charges without asking needs a mandate, a reminder, a
 * cancellation flow and somewhere to argue about the charge; until all four
 * exist, this lapses and the customer buys it again.
 */
export default function MembershipScreen() {
  return (
    <ProfileShell
      title="Membership"
      // What Plus is and what it costs are public. Only "are you a member"
      // needs an account, so signed out the pitch stands and the button that
      // would buy it becomes the way in.
      signedOut={<Plus uid={null} />}
    >
      {(user) => <Plus uid={user.uid} />}
    </ProfileShell>
  )
}
