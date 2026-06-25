// ----------------------------------------------------------------------------
// Optional booking add-ons. Prices in USD, charged per booking.
// ----------------------------------------------------------------------------

import type { IconName } from '../lib/icons';

export interface Addon {
  id: string;
  name: string;
  price: number;
  description: string;
  icon: IconName;
}

export const addons: Addon[] = [
  {
    id: 'gopro',
    name: 'GoPro HERO Camera',
    price: 39,
    description: 'Mount-and-go action camera so you keep both hands on the bars.',
    icon: 'camera',
  },
  {
    id: 'dolphin-tour',
    name: 'Guided Dolphin & Sandbar Tour',
    price: 89,
    description: 'A local captain leads you straight to the dolphins and the best sandbar.',
    icon: 'map',
  },
  {
    id: 'fuel',
    name: 'Prepaid Fuel Package',
    price: 49,
    description: 'Skip the gas stop. Return the ski at any fuel level, no questions.',
    icon: 'fuel',
  },
  {
    id: 'cooler',
    name: 'Cooler + Ice',
    price: 25,
    description: 'A secured cooler with ice, room for twelve, keeps the drinks cold.',
    icon: 'cooler',
  },
  {
    id: 'comfort-pack',
    name: 'Premium Comfort Pack',
    price: 19,
    description: 'Extra life vests, a dry bag, and a waterproof phone case.',
    icon: 'shield',
  },
];

export function getAddon(id: string): Addon | undefined {
  return addons.find((a) => a.id === id);
}
