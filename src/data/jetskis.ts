// ----------------------------------------------------------------------------
// The fleet. Prices are placeholders (USD) — adjust to real rates before launch.
// To swap a photo, change the `image` path (file in /public/photos) on any ski.
// ----------------------------------------------------------------------------

export interface JetSkiRates {
  /** 1 hour */
  hourly: number;
  /** 2 hours */
  twoHour: number;
  /** Half day — 4 hours */
  halfDay: number;
  /** Full day — 8 hours */
  fullDay: number;
}

export interface JetSki {
  id: string;
  name: string;
  brand: 'Sea-Doo' | 'Yamaha';
  year: number;
  tagline: string;
  category: string;
  /** Maximum number of riders, including the driver. */
  capacity: number;
  /** Engine horsepower. */
  hp: number;
  /** Approximate top speed, mph. */
  topSpeed: number;
  /** Combined rider weight capacity, lbs. */
  weightCapacity: number;
  rates: JetSkiRates;
  highlights: string[];
  description: string;
  /** Gradient [from, to] for the placeholder photo treatment. */
  gradient: [string, string];
  /** Optional real photo in /public — overrides the gradient placeholder. */
  image?: string;
  /** CSS object-position for the photo crop, e.g. "center 70%". */
  imagePosition?: string;
  featured: boolean;
}

export const jetskis: JetSki[] = [
  {
    id: 'sea-doo-gts',
    name: 'Sea-Doo GTS',
    brand: 'Sea-Doo',
    year: 2024,
    tagline: 'Easy, stable, and all fun',
    category: 'Recreation',
    capacity: 3,
    hp: 130,
    topSpeed: 45,
    weightCapacity: 450,
    rates: { hourly: 89, twoHour: 159, halfDay: 279, fullDay: 399 },
    highlights: ['Great for first-timers', 'Stable & forgiving', 'Seats up to 3'],
    description:
      'Our go-to Sea-Doo: stable, forgiving, and a 45 mph blast across the bay. ' +
      'Easy enough for first-timers, fun enough for everyone.',
    gradient: ['#2dd4bf', '#0e7490'],
    image: '/photos/ski-seadoo.jpg',
    featured: true,
  },
  {
    id: 'sea-doo-spark-trixx',
    name: 'Sea-Doo Spark Trixx',
    brand: 'Sea-Doo',
    year: 2024,
    tagline: 'Light, nimble, pure adrenaline',
    category: 'Sport',
    capacity: 3,
    hp: 90,
    topSpeed: 48,
    weightCapacity: 450,
    rates: { hourly: 93, twoHour: 165, halfDay: 295, fullDay: 435 },
    highlights: ['Ultra-light hull', 'Easy to throw around', 'Perfect for photos & fun'],
    description:
      'The Spark Trixx is built for riders who want a playful, responsive ski. ' +
      'Lightweight and quick on the throttle — ideal for carving, jumping wakes, and ' +
      'making the most of a Gulf Coast afternoon.',
    gradient: ['#ffb054', '#f2683a'],
    image: '/photos/ski-seadoo-spark-trixx.jpg',
    imagePosition: 'center 38%',
    featured: true,
  },
];

export function getJetSki(id: string): JetSki | undefined {
  return jetskis.find((j) => j.id === id);
}
