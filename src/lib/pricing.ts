// ----------------------------------------------------------------------------
// Canonical pricing logic. The /api/checkout endpoint uses this to recompute
// every total server-side — prices submitted by the browser are never trusted.
// ----------------------------------------------------------------------------

import { jetskis, getJetSki, type JetSki } from '../data/jetskis';
import { addons, getAddon } from '../data/addons';
import { durations, getDuration } from '../data/booking';

export interface BookingSelection {
  jetSkiId: string;
  duration: string;
  addonIds: string[];
}

export interface PriceLine {
  label: string;
  detail: string;
  amount: number;
}

export interface PricedBooking {
  jetSki: JetSki;
  durationKey: string;
  durationLabel: string;
  lines: PriceLine[];
  total: number;
}

export class PricingError extends Error {}

/** Recompute a booking total from trusted server-side data. Throws PricingError on bad input. */
export function priceBooking(sel: BookingSelection): PricedBooking {
  const jetSki = getJetSki(sel.jetSkiId);
  if (!jetSki) throw new PricingError(`Unknown jet ski: ${sel.jetSkiId}`);

  const duration = getDuration(sel.duration);
  if (!duration) throw new PricingError(`Unknown duration: ${sel.duration}`);

  const base = jetSki.rates[duration.rateKey];
  const lines: PriceLine[] = [
    { label: jetSki.name, detail: `${duration.label} rental`, amount: base },
  ];

  for (const id of sel.addonIds) {
    const addon = getAddon(id);
    if (!addon) throw new PricingError(`Unknown add-on: ${id}`);
    lines.push({ label: addon.name, detail: 'Add-on', amount: addon.price });
  }

  const total = lines.reduce((sum, line) => sum + line.amount, 0);
  return {
    jetSki,
    durationKey: sel.duration,
    durationLabel: duration.label,
    lines,
    total,
  };
}

/** Compact data bundle handed to the browser so the booking form can preview totals. */
export function pricingData() {
  return {
    jetskis: jetskis.map((j) => ({
      id: j.id,
      name: j.name,
      capacity: j.capacity,
      rates: j.rates,
      image: j.image,
      brand: j.brand,
      category: j.category,
    })),
    addons: addons.map((a) => ({ id: a.id, name: a.name, price: a.price })),
    durations: durations.map((d) => ({ key: d.key, label: d.label, rateKey: d.rateKey })),
  };
}
