import type { Category, Question, Service } from '@app/shared/catalog-v2'

import { APPLIANCE_SERVICES } from './services/appliance'
import { CLEANING_SERVICES } from './services/cleaning'
import { SALON_SERVICES } from './services/salon'

/**
 * The demo catalog: three categories, so every screen built on it is built for
 * more than appliances. Nothing here is a real price list. It is shaped exactly
 * like what the backend will send (catalog-v2 types), so swapping it for
 * Firestore changes the fetchers in lib/data and nothing on any screen.
 */

export const CATEGORIES: readonly Category[] = [
  { id: 'appliance-repair', name: 'Appliance Repair', tagline: 'AC, fridge, washing machine and more', image: '/appliances/air-conditioner.jpg', order: 1 },
  { id: 'cleaning', name: 'Cleaning', tagline: 'Bathroom, kitchen, full home', order: 2 },
  { id: 'salon', name: 'Salon at Home', tagline: 'Waxing, facials, haircuts', order: 3 },

  { id: 'ac', parentId: 'appliance-repair', name: 'AC', image: '/appliances/air-conditioner.jpg', order: 1 },
  { id: 'washing-machine', parentId: 'appliance-repair', name: 'Washing Machine', image: '/appliances/washing-machine.jpg', order: 2 },
  { id: 'refrigerator', parentId: 'appliance-repair', name: 'Refrigerator', image: '/appliances/refrigerator.jpg', order: 3 },
  { id: 'geyser', parentId: 'appliance-repair', name: 'Geyser', image: '/appliances/geyser.jpg', order: 4 },

  { id: 'bathroom-cleaning', parentId: 'cleaning', name: 'Bathroom', order: 1 },
  { id: 'kitchen-cleaning', parentId: 'cleaning', name: 'Kitchen', order: 2 },
  { id: 'full-home-cleaning', parentId: 'cleaning', name: 'Full home', order: 3 },
  { id: 'sofa-cleaning', parentId: 'cleaning', name: 'Sofa & carpet', order: 4 },

  { id: 'waxing', parentId: 'salon', name: 'Waxing', order: 1 },
  { id: 'facial', parentId: 'salon', name: 'Facial & cleanup', order: 2 },
  { id: 'mani-pedi', parentId: 'salon', name: 'Manicure & pedicure', order: 3 },
  { id: 'haircut-men', parentId: 'salon', name: "Men's haircut", order: 4 },
]

export const SERVICES: readonly Service[] = [...APPLIANCE_SERVICES, ...CLEANING_SERVICES, ...SALON_SERVICES]

const BRANDS = ['LG', 'Samsung', 'Whirlpool', 'Voltas', 'Daikin', 'Other']

/**
 * Asked before the address step. Category questions are asked of every
 * service under that category; service questions only of that service.
 */
export const QUESTIONS: readonly Question[] = [
  // Appliance repair: every appliance service asks these.
  { id: 'q-brand', categoryId: 'appliance-repair', label: 'Which brand is it?', kind: 'single', options: BRANDS, required: true, order: 1 },
  { id: 'q-age', categoryId: 'appliance-repair', label: 'How old is it?', kind: 'single', options: ['Under 2 years', '2–5 years', 'Over 5 years', 'Not sure'], required: false, order: 2 },
  { id: 'q-photo', categoryId: 'appliance-repair', label: 'Add a photo', hint: 'Of the appliance or the problem, so the technician brings the right parts.', kind: 'photo', options: [], required: false, maxPhotos: 3, order: 9 },
  // Per appliance: what is wrong.
  { id: 'q-ac-problem', categoryId: 'ac', label: 'What is the problem?', kind: 'multi', options: ['Not cooling', 'Water leaking', 'Making noise', 'Not turning on', 'Bad smell'], required: true, order: 3 },
  { id: 'q-ac-type', categoryId: 'ac', label: 'Type of AC', kind: 'single', options: ['Split', 'Window'], required: true, order: 0 },
  { id: 'q-wm-problem', categoryId: 'washing-machine', label: 'What is the problem?', kind: 'multi', options: ['Not spinning', 'Not draining', 'Noisy', 'Leaking', 'Not starting'], required: true, order: 3 },
  { id: 'q-wm-type', categoryId: 'washing-machine', label: 'Loading type', kind: 'single', options: ['Front load', 'Top load', 'Semi-automatic'], required: true, order: 0 },
  { id: 'q-fridge-problem', categoryId: 'refrigerator', label: 'What is the problem?', kind: 'multi', options: ['Not cooling', 'Too cold', 'Noisy', 'Water leaking', 'Ice build-up'], required: true, order: 3 },
  { id: 'q-geyser-problem', categoryId: 'geyser', label: 'What is the problem?', kind: 'multi', options: ['Not heating', 'Leaking', 'Tripping power', 'Strange noise'], required: true, order: 3 },
  // Cleaning.
  { id: 'q-home-size', categoryId: 'cleaning', label: 'Size of your home', kind: 'single', options: ['1 BHK', '2 BHK', '3 BHK', '4 BHK or bigger'], required: true, order: 1 },
  { id: 'q-occupied', categoryId: 'cleaning', label: 'Is the home furnished?', kind: 'single', options: ['Furnished', 'Empty'], required: false, order: 2 },
  { id: 'q-clean-notes', categoryId: 'cleaning', label: 'Anything we should know?', kind: 'text', options: [], placeholder: 'Pets at home, stubborn stains, parking…', required: false, order: 3 },
  // Salon.
  { id: 'q-skin', categoryId: 'salon', label: 'Your skin type', kind: 'single', options: ['Normal', 'Dry', 'Oily', 'Sensitive', 'Not sure'], required: false, order: 1 },
  { id: 'q-allergies', categoryId: 'salon', label: 'Any allergies?', kind: 'text', options: [], placeholder: 'Products or ingredients to avoid', required: false, order: 2 },
]
