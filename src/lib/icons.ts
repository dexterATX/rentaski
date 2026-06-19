// ----------------------------------------------------------------------------
// Inline SVG icon set. Each entry is the inner markup of a 24x24 stroke icon,
// rendered by <Icon /> with stroke="currentColor" so icons inherit text color.
// ----------------------------------------------------------------------------

export type IconName =
  | 'check'
  | 'arrow-right'
  | 'arrow-left'
  | 'bolt'
  | 'shield'
  | 'pin'
  | 'star'
  | 'clock'
  | 'phone'
  | 'mail'
  | 'riders'
  | 'gauge'
  | 'weight'
  | 'camera'
  | 'map'
  | 'fuel'
  | 'cooler'
  | 'tag'
  | 'calendar'
  | 'sparkle'
  | 'wave'
  | 'anchor'
  | 'sun'
  | 'lock';

export const iconPaths: Record<IconName, string> = {
  'check': '<polyline points="20 6 9 17 4 12"/>',
  'arrow-right': '<line x1="4" y1="12" x2="19" y2="12"/><polyline points="13 6 19 12 13 18"/>',
  'arrow-left': '<line x1="20" y1="12" x2="5" y2="12"/><polyline points="11 6 5 12 11 18"/>',
  'bolt': '<path d="M13 2 5 13h6l-1 9 8-11h-6l1-9Z"/>',
  'shield': '<path d="M12 3l7 2.5v5.5c0 4.7-3 7.9-7 9.5-4-1.6-7-4.8-7-9.5V5.5L12 3Z"/>',
  'pin': '<path d="M12 21c4.5-4.2 7-7.6 7-11a7 7 0 1 0-14 0c0 3.4 2.5 6.8 7 11Z"/><circle cx="12" cy="10" r="2.6"/>',
  'star': '<path d="M12 3.2l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9Z"/>',
  'clock': '<circle cx="12" cy="12" r="9"/><polyline points="12 6.5 12 12 16 14"/>',
  'phone': '<path d="M15.5 21A14.5 14.5 0 0 1 3 8.5 3 3 0 0 1 6 5.5h2.2a1 1 0 0 1 1 .8l.9 3.4a1 1 0 0 1-.5 1.1l-1.8 1a12 12 0 0 0 5 5l1-1.8a1 1 0 0 1 1.1-.5l3.4.9a1 1 0 0 1 .8 1V18a3 3 0 0 1-3 3Z"/>',
  'mail': '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M4 7l8 6 8-6"/>',
  'riders': '<circle cx="9" cy="7.5" r="3"/><path d="M3.5 20a5.5 5.5 0 0 1 11 0"/><path d="M16 5a3 3 0 0 1 0 6"/><path d="M17 14.6a5.5 5.5 0 0 1 4 5.4"/>',
  'gauge': '<path d="M4.5 18a9 9 0 1 1 15 0"/><path d="M12 12.5 16 8"/><circle cx="12" cy="13" r="1.4"/>',
  'weight': '<path d="M8 9h8l1.6 11H6.4L8 9Z"/><path d="M9 9a3 3 0 0 1 6 0"/>',
  'camera': '<path d="M3 8.5A2.5 2.5 0 0 1 5.5 6h1.7l1.3-2h7l1.3 2h1.7A2.5 2.5 0 0 1 21 8.5v9A2.5 2.5 0 0 1 18.5 20h-13A2.5 2.5 0 0 1 3 17.5Z"/><circle cx="12" cy="12.5" r="3.4"/>',
  'map': '<path d="M9 4 3.5 6v14L9 18l6 2 5.5-2V4L15 6 9 4Z"/><line x1="9" y1="4" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="20"/>',
  'fuel': '<path d="M5 21V5a2 2 0 0 1 2-2h5a2 2 0 0 1 2 2v16"/><line x1="3.5" y1="21" x2="15.5" y2="21"/><line x1="7" y1="9.5" x2="12" y2="9.5"/><path d="M14 8h2.5A1.5 1.5 0 0 1 18 9.5V16a1.5 1.5 0 0 0 3 0V9a1.5 1.5 0 0 0-.45-1.05L18 5.5"/>',
  'cooler': '<rect x="4" y="8" width="16" height="11" rx="1.6"/><path d="M8.5 8V6.2A2.2 2.2 0 0 1 10.7 4h2.6A2.2 2.2 0 0 1 15.5 6.2V8"/><line x1="4" y1="13" x2="20" y2="13"/>',
  'tag': '<path d="M3.5 11.6V4.5a1 1 0 0 1 1-1h7.1a2 2 0 0 1 1.4.6l7 7a2 2 0 0 1 0 2.8l-6.6 6.6a2 2 0 0 1-2.8 0l-7-7a2 2 0 0 1-.6-1.4Z"/><circle cx="8" cy="8" r="1.5"/>',
  'calendar': '<rect x="3.5" y="5" width="17" height="16" rx="2.5"/><line x1="3.5" y1="10" x2="20.5" y2="10"/><line x1="8" y1="3" x2="8" y2="7"/><line x1="16" y1="3" x2="16" y2="7"/>',
  'sparkle': '<path d="M12 3l1.9 5.6L19.5 10l-5.6 1.9L12 17.5l-1.9-5.6L4.5 10l5.6-1.4L12 3Z"/>',
  'wave': '<path d="M2 11c2.2 0 2.2-2 4.5-2s2.3 2 4.5 2 2.3-2 4.5-2 2.3 2 4.5 2"/><path d="M2 16c2.2 0 2.2-2 4.5-2s2.3 2 4.5 2 2.3-2 4.5-2 2.3 2 4.5 2"/>',
  'anchor': '<circle cx="12" cy="4.5" r="2"/><line x1="12" y1="6.5" x2="12" y2="20"/><line x1="8.5" y1="10" x2="15.5" y2="10"/><path d="M5 12a7 7 0 0 0 14 0"/><line x1="5" y1="12" x2="5" y2="15"/><line x1="19" y1="12" x2="19" y2="15"/>',
  'sun': '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.5M12 19v2.5M2.5 12h2.5M19 12h2.5M5.2 5.2l1.8 1.8M17 17l1.8 1.8M18.8 5.2 17 7M7 17l-1.8 1.8"/>',
  'lock': '<rect x="4.5" y="10.5" width="15" height="10" rx="2.5"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/>',
};
