// ----------------------------------------------------------------------------
// Business details — single source of truth for placeholder content.
// Swap these values for the real business information before launch.
//
// rentaSkii is a MOBILE service: there is no storefront. We trailer the ski to
// the customer, fuel it, and drop it in the water for them.
// ----------------------------------------------------------------------------

export const site = {
  name: 'rentaSkii',
  legalName: 'rentaSkii Watersports LLC',
  tagline: 'Jet Skis Delivered to Your Water',
  description:
    'Premium Sea-Doo jet ski rentals delivered across the Florida Gulf ' +
    'Coast — based in Largo, minutes from Clearwater, Indian Rocks, Madeira Beach, ' +
    "and John's Pass. We bring the ski to you, fuelled and dropped in the water. " +
    'Book online in 60 seconds and ride the same day.',
  url: 'https://rentaskifl.com',

  email: 'rentaskifl@gmail.com',
  phone: '(727) 377-6240',
  phoneHref: '+17273776240',

  // Mobile service — based in Largo, central to every main Gulf beach. We deliver.
  homeBase: { city: 'Largo', state: 'FL' },
  baseLine: 'Based in Largo, FL — minutes from every main beach',
  region: 'Florida Gulf Coast',
  nearby: 'across the Pinellas Gulf beaches',
  serviceArea: "Clearwater · Indian Rocks · Madeira Beach · John's Pass",
  serviceAreas: [
    'Clearwater Beach',
    'Indian Rocks Beach',
    "John's Pass Village",
    'Madeira Beach',
    'Treasure Island',
    'St. Pete Beach',
  ],

  // The delivery model — reused as copy across multiple pages.
  delivery:
    'We trailer your jet ski straight to your dock, beach access, or boat ramp, ' +
    'fully fuelled, safety-checked, and dropped right in the water. You just walk ' +
    'up and ride.',

  hours: [
    { days: 'Monday to Friday', time: '8:00 AM to 6:00 PM' },
    { days: 'Saturday to Sunday', time: '7:00 AM to 7:00 PM' },
  ],
  hoursNote:
    'Delivery windows run daily. We confirm your exact drop-off time after you book. ' +
    'Hours may shift with weather and tides.',

  rating: { value: 4.9, count: 632 },

  social: {
    instagram: 'https://instagram.com/rentaskii',
    facebook: 'https://facebook.com/rentaskii',
    tiktok: 'https://tiktok.com/@rentaskii',
  },

  cancellation: 'Free cancellation up to 48 hours before your ride.',
} as const;

export const stats = [
  { value: '6', label: 'Late-model skis' },
  { value: 'To you', label: 'Free local delivery' },
  { value: '4.9★', label: '600+ rider reviews' },
  { value: 'Same day', label: 'Online booking' },
] as const;

export const testimonials = [
  {
    name: 'Marcus T.',
    from: 'Tampa, FL',
    rating: 5,
    text:
      'Booked the GTR 230 for two hours and we saw dolphins within fifteen minutes. ' +
      'The crew dropped it in fuelled and ready. We were riding in minutes. ' +
      'Already planning the next trip.',
  },
  {
    name: 'Priya & Sam',
    from: 'St. Petersburg, FL',
    rating: 5,
    text:
      'First time on jet skis and the team made it painless. They met us right at ' +
      'the ramp. The Sea-Doo was perfect for us, zero stress, all fun. The sunset ' +
      'over the Gulf was unreal.',
  },
  {
    name: 'Dale R.',
    from: 'Largo, FL',
    rating: 5,
    text:
      'I rent every summer and rentaSkii has the newest fleet around. Clean skis, ' +
      'fair pricing, and having it delivered and floating before we arrive is a ' +
      'total game-changer.',
  },
  {
    name: 'Ashley M.',
    from: 'Seminole, FL',
    rating: 5,
    text:
      'They pulled up to our dock and had the ski in the water before we finished ' +
      'our coffee. The guided dolphin tour add-on was worth every penny. Genuine ' +
      'bucket-list stuff.',
  },
] as const;
