import { brand } from '@/config/brand'

/**
 * Everything the support inbox actually fills up with, sorted into the six
 * things people arrive asking about.
 *
 * Every answer here is a statement about how this app behaves, checked against
 * the code that does it — the visit fee and approval flow in `createBooking`
 * and `respondToRepairRequest`, the cancellation figures in the business
 * config, the balance's limits in `shared/wallet.ts`, the membership's in
 * `shared/plans.ts`. A help centre that drifts from the product is worse than
 * none, because it is believed.
 *
 * Kept as data rather than as pages so there is one place to correct when one
 * of these stops being true, and so the topic list and the answers cannot fall
 * out of step.
 */

export interface SupportQuestion {
  q: string
  a: string
}

export interface SupportTopic {
  /** Also the `?t=` value, so it is short and will not change. */
  id: string
  label: string
  /** One line under the label on the topic's own screen. */
  blurb: string
  questions: readonly SupportQuestion[]
}

export const SUPPORT_TOPICS = [
  {
    id: 'getting-started',
    label: 'Getting started',
    blurb: 'Booking a job, and what happens on the day',
    questions: [
      {
        q: 'How do I book a repair?',
        a: 'Pick the appliance, tell us what it is doing, choose a time window and an address. You pay the visit fee to confirm, or settle after the service where that is offered. The whole thing is nine steps and you can go back at any of them.',
      },
      {
        q: 'How much will the repair cost?',
        a: 'You pay the visit fee to book. Your technician inspects the appliance and quotes anything beyond that, itemised — part and labour separately — and nothing is charged or started until you approve it on the booking.',
      },
      {
        q: 'What is the time window?',
        a: 'A two-hour window, not a fixed minute. You get a notification when your technician is on the way, and you can watch them approach on the booking once they set off.',
      },
      {
        q: 'How do I know the person at my door is from you?',
        a: 'Their name, photo and rating are on the booking before they arrive, and they cannot start the job until you read out the start code shown on that screen.',
      },
      {
        q: 'Do you cover my area?',
        a: 'Enter your pincode on the home screen and it will tell you straight away. If we do not cover it yet you can join the waitlist for it, and we will tell you when we do.',
      },
    ],
  },
  {
    id: 'booking-changes',
    label: 'Changing or cancelling',
    blurb: 'Moving a slot, calling one off, and what it costs',
    questions: [
      {
        q: 'Can I change the time?',
        a: 'Yes, from the booking itself, up to a limited number of times. Pick another window and the old one is released for someone else.',
      },
      {
        q: 'What does cancelling cost?',
        a: 'Cancelling well before your slot is free. Closer to it a small fee applies, and the exact figure is shown on screen before you confirm — never after.',
      },
      {
        q: 'When do I get my money back?',
        a: 'Anything refundable goes back to the card or account it came from. The booking tells you the amount and how many working days it takes, and the same figures are on the invoice.',
      },
      {
        q: 'My technician has not arrived. What now?',
        a: 'Tell us straight away rather than waiting out the window — start a conversation from the support screen with the booking reference. We would rather hear it from you than from a review.',
      },
    ],
  },
  {
    id: 'payments',
    label: 'Payments & balance',
    blurb: `How you pay, your ${brand.name} balance, and invoices`,
    questions: [
      {
        q: 'How do I pay?',
        a: 'Card, UPI or netbanking through our payment provider, or after the service where the service allows it. Which one comes up first at checkout is yours to set, under Profile, Payment methods.',
      },
      {
        q: 'Do you store my card?',
        a: 'No. Your card, UPI id and netbanking details go straight from your phone to Razorpay and never reach us. There is no saved card list in this app because there are no saved cards.',
      },
      {
        q: `What is my ${brand.name} balance?`,
        a: 'Two things in one number: credits we gave you — for a visit we reached late, a job we had to cancel, a referral or a gift card — and money you added yourself. Both come off your next bill, and the activity list says which is which on every line.',
      },
      {
        q: 'Does my balance expire?',
        a: 'No. Neither the credits we issued nor the money you added. It stays until you use it.',
      },
      {
        q: 'Can I withdraw my balance or send it to someone?',
        a: `It can only be spent on ${brand.name} services, on your own account — it cannot be transferred or taken as cash. Money you added yourself is refundable on request: ask support and it goes back the way it came.`,
      },
      {
        q: 'Where are my invoices?',
        a: 'Under Profile, Invoices. Every completed job has one, with its GST breakdown and the seller details, and it can be downloaded as a PDF.',
      },
    ],
  },
  {
    id: 'plans-membership',
    label: `Plans & ${brand.name} Plus`,
    blurb: 'Annual cover, membership, and what each one changes',
    questions: [
      {
        q: 'What is the difference between a plan and a membership?',
        a: 'A plan is bought against appliances: a set number of services on a named fridge or washing machine, for a year. A membership is bought against your account and changes the price of everything — the visit fee goes and 10% comes off repairs you approve.',
      },
      {
        q: 'How is a plan visit used up?',
        a: 'When a job is finished, not when it is booked. A booking you cancel has cost you nothing. The plan screen shows visits left and days left, because those are the two ways a plan ends.',
      },
      {
        q: `Does ${brand.name} Plus renew on its own?`,
        a: 'No, and there is no switch for it. It runs out and you buy it again if you want it. Buying while it is still live adds to what is left rather than starting again.',
      },
      {
        q: 'What if my membership runs out between booking and the visit?',
        a: 'Nothing changes on that booking. What covered it is recorded when it is made, so a bill you were already quoted cannot be re-priced afterwards.',
      },
    ],
  },
  {
    id: 'warranty',
    label: 'Warranty & repeat faults',
    blurb: 'What is covered after a job, and how to claim',
    questions: [
      {
        q: 'What does the service warranty cover?',
        a: 'The work described on your invoice, the parts we supplied and fitted, and a return visit if the same fault comes back while it is valid. It does not cover a different fault, damage from misuse or power surges, work done by anyone else afterwards, or parts you supplied.',
      },
      {
        q: 'How long does it last?',
        a: 'It depends on the service, and the exact dates are on the warranty itself under Profile, Warranties. The list is ordered by what runs out first.',
      },
      {
        q: 'How do I claim it?',
        a: 'Start a conversation from the support screen with the booking reference. While the warranty is valid a return visit for the same fault costs nothing.',
      },
    ],
  },
  {
    id: 'account',
    label: 'Your account',
    blurb: 'Your number, your details, notifications and closing it',
    questions: [
      {
        q: 'Can I change my mobile number?',
        a: 'Not from inside the app. The number is the account — it is how your bookings are found and how a technician reaches you on the day — so changing it is a support conversation.',
      },
      {
        q: 'Who sees my address?',
        a: 'The technician assigned to your booking, and only for that booking. A booking keeps its own copy of the address, so editing or deleting a saved address later does not rewrite where a past job happened.',
      },
      {
        q: 'How do I stop the notifications?',
        a: 'Under Profile, Settings. Everything we have already sent you stays readable under Notifications whether or not they are switched on.',
      },
      {
        q: 'How do I close my account?',
        a: 'Under Profile, Settings, at the bottom. It asks you to type the word DELETE, because that is not a thing to do by accident. Invoices we are required to keep are kept; everything else goes.',
      },
    ],
  },
] as const satisfies readonly SupportTopic[]

export function supportTopic(id: string | null): SupportTopic | null {
  return SUPPORT_TOPICS.find((topic) => topic.id === id) ?? null
}
