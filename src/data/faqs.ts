// ----------------------------------------------------------------------------
// Frequently asked questions. Used on the Contact page and for SEO FAQ schema.
// ----------------------------------------------------------------------------

export interface Faq {
  q: string;
  a: string;
}

export const faqs: Faq[] = [
  {
    q: 'Do I need a license to ride a jet ski?',
    a:
      'No boating license is required. However, Florida law requires anyone born on ' +
      'or after January 1, 1988 to carry a Boating Safety Education ID. We issue a ' +
      'free temporary Florida boater education card when we deliver, before you ' +
      'ride. It only takes a few minutes.',
  },
  {
    q: 'How old do I have to be?',
    a:
      'You must be at least 18 years old to rent and operate a jet ski. Riders under ' +
      '18 are welcome as passengers when accompanied by a parent or guardian. A valid ' +
      'government-issued photo ID is required when we deliver.',
  },
  {
    q: 'What should I bring?',
    a:
      'A photo ID, the credit card used to book, a swimsuit, a towel, and plenty of ' +
      'sunscreen. We provide life jackets and all safety gear. Lock up valuables, ' +
      "there's no dry storage on board unless you add the Premium Comfort Pack.",
  },
  {
    q: 'Is a deposit required?',
    a:
      'Your booking is paid in full online to lock in your time slot. We also place a ' +
      'refundable security hold on a credit card at delivery, released as soon as the ' +
      'ski is collected undamaged and on time.',
  },
  {
    q: "What's your cancellation policy?",
    a:
      'Free cancellation up to 48 hours before your ride for a full refund. Inside 48 ' +
      'hours we are glad to reschedule. If we cancel for weather, you choose a full ' +
      'refund or a rain check.',
  },
  {
    q: 'What happens if the weather is bad?',
    a:
      "Safety comes first. If conditions aren't safe we'll contact you to reschedule " +
      'or refund. Light Florida rain rarely stops the fun, but lightning and ' +
      'small-craft advisories do.',
  },
  {
    q: 'Will we see dolphins?',
    a:
      "Very often, yes. The waters around John's Pass and Shell Key are home to " +
      'resident bottlenose dolphins. Add the Guided Dolphin & Sandbar Tour and a ' +
      'local captain takes you straight to the best spots.',
  },
  {
    q: 'Where do you deliver?',
    a:
      'Anywhere along the Pinellas Gulf Coast, your private dock, a beach access, ' +
      "or a public boat ramp from John's Pass and Madeira Beach down to St. Pete " +
      'Beach and Seminole. We trailer the ski to you, drop it in the water fully ' +
      'fuelled, and collect it when you are done. Local delivery is free.',
  },
  {
    q: 'How many people fit on one jet ski?',
    a:
      'It depends on the model. Most of our skis seat up to three riders within a ' +
      'combined weight limit. Check each ski on the Fleet page. Everyone aboard must ' +
      'wear a provided life jacket.',
  },
];
