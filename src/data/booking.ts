// ----------------------------------------------------------------------------
// Booking options — rental durations, launch time slots, and what's included.
// ----------------------------------------------------------------------------

import type { JetSkiRates } from './jetskis';

export interface Duration {
  key: string;
  label: string;
  sub: string;
  hours: number;
  rateKey: keyof JetSkiRates;
}

export const durations = [
  { key: '1h', label: '1 Hour', sub: 'A quick blast', hours: 1, rateKey: 'hourly' },
  { key: '2h', label: '2 Hours', sub: 'Our most popular', hours: 2, rateKey: 'twoHour' },
  { key: 'half', label: 'Half Day', sub: '4 hours on the water', hours: 4, rateKey: 'halfDay' },
  { key: 'full', label: 'Full Day', sub: '8 hours, sunup to sundown', hours: 8, rateKey: 'fullDay' },
] as const satisfies readonly Duration[];

export type DurationKey = (typeof durations)[number]['key'];

export function getDuration(key: string): Duration | undefined {
  return durations.find((d) => d.key === key);
}

export const timeSlots = [
  '7:00 AM',
  '8:30 AM',
  '10:00 AM',
  '11:30 AM',
  '1:00 PM',
  '2:30 PM',
  '4:00 PM',
] as const;

// What every rental includes, at no extra cost.
export const included = [
  'Coast Guard-approved life jackets for every rider',
  'Hands-on safety briefing & on-water orientation',
  'Dock launch & retrieval, no trailer, no boat ramp',
  'Lanyard engine kill-switch and safety whistle',
  'Florida temporary boater education card',
  'Route map of the best Gulf spots and sandbars',
];
