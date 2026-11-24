/** Settings is a root page plus detail pages; diagnostics sits under Data. */
export type SettingsPage =
  | 'root'
  | 'general'
  | 'rhythm'
  | 'appearance'
  | 'overlay'
  | 'reminders'
  | 'data'
  | 'diagnostics'
  | 'about';
