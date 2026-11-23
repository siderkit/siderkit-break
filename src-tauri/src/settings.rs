use serde::{Deserialize, Serialize};

use crate::timer::TimerConfig;

pub const SUPPORTED_LOCALES: [&str; 30] = [
    "en", "zh-CN", "zh-TW", "hi", "es", "fr", "pt", "ar", "bn", "id", "ru", "ur", "de", "ja", "sw",
    "mr", "te", "tr", "ta", "vi", "ko", "fa", "fil", "th", "it", "ms", "pl", "uk", "nl", "ro",
];

#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Serialize, Deserialize)]
pub enum Theme {
    #[default]
    System,
    Light,
    Dark,
}

#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Serialize, Deserialize)]
pub enum Palette {
    #[default]
    Forest,
    Ocean,
    Ember,
    Plum,
    Slate,
    Rose,
    Aurora,
    Sand,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OverlayPosition {
    pub x: i32,
    pub y: i32,
    /// The overlay center as permille of the monitor, stored so a resolution
    /// change can keep the same relative placement instead of pinning it to a
    /// stale pixel coordinate.
    #[serde(default)]
    pub ratio_x: Option<u16>,
    #[serde(default)]
    pub ratio_y: Option<u16>,
    /// Monitor size when the position was saved. When the current monitor
    /// differs, the ratios are applied to the new size.
    #[serde(default)]
    pub screen_width: Option<u32>,
    #[serde(default)]
    pub screen_height: Option<u32>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct OverlaySettings {
    pub enabled: bool,
    /// Rust-owned window position. Deserialization skips it so a settings
    /// payload from the UI can never move or reset the overlay.
    #[serde(default, skip_deserializing)]
    pub position: Option<OverlayPosition>,
}

impl Default for OverlaySettings {
    fn default() -> Self {
        Self {
            enabled: true,
            position: None,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct NotificationSettings {
    pub enabled: bool,
    pub sound: bool,
}

impl Default for NotificationSettings {
    fn default() -> Self {
        Self {
            enabled: true,
            sound: true,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct GeneralSettings {
    pub launch_at_login: bool,
    pub start_minimized: bool,
    pub theme: Theme,
    pub palette: Palette,
    /// `None` follows the operating system.
    pub locale: Option<String>,
}

impl Default for GeneralSettings {
    fn default() -> Self {
        Self {
            launch_at_login: false,
            start_minimized: false,
            theme: Theme::System,
            palette: Palette::Forest,
            locale: None,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct UpdateSettings {
    pub auto_check: bool,
    /// Anonymous install and update counts. Off means no identifier is sent.
    pub metrics: bool,
    /// Set by the app when the user skips a version, never by the settings UI.
    #[serde(skip_deserializing)]
    pub skipped_version: Option<String>,
    /// Set by the app when the user postpones an update, never by the UI.
    #[serde(skip_deserializing)]
    pub snooze_until_ms: Option<i64>,
}

impl Default for UpdateSettings {
    fn default() -> Self {
        Self {
            auto_check: true,
            metrics: true,
            skipped_version: None,
            snooze_until_ms: None,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Default, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct Settings {
    pub timer: TimerConfig,
    pub overlay: OverlaySettings,
    pub notifications: NotificationSettings,
    pub general: GeneralSettings,
    pub update: UpdateSettings,
}

impl Settings {
    pub fn normalized(mut self) -> Self {
        self.timer = self.timer.normalized();
        self.general.locale = match self.general.locale.as_deref() {
            Some(value) => normalize_locale(value).map(str::to_owned),
            None => None,
        };
        self
    }
}

/// Resolves an explicit or system tag to one of the shipped catalogs.
/// Exact tags win, then the language subtag, then English.
pub fn normalize_locale(value: &str) -> Option<&'static str> {
    let value = value.replace('_', "-");
    let lower = value.to_ascii_lowercase();
    if let Some(exact) = SUPPORTED_LOCALES
        .iter()
        .find(|locale| locale.eq_ignore_ascii_case(&value))
    {
        return Some(*exact);
    }
    match lower.as_str() {
        "zh-hans" | "zh-hans-cn" | "zh-sg" => return Some("zh-CN"),
        "zh-hant" | "zh-hant-tw" | "zh-hant-hk" | "zh-hk" | "zh-mo" => return Some("zh-TW"),
        "pt-br" | "pt-pt" => return Some("pt"),
        "fil-ph" | "tl" | "tl-ph" => return Some("fil"),
        _ => {}
    }
    let language = lower.split('-').next().unwrap_or(lower.as_str());
    SUPPORTED_LOCALES
        .iter()
        .find(|locale| {
            locale
                .split('-')
                .next()
                .is_some_and(|shipped| shipped.eq_ignore_ascii_case(language))
        })
        .copied()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn locale_normalization_prefers_exact_then_language_tags() {
        assert_eq!(normalize_locale("en"), Some("en"));
        assert_eq!(normalize_locale("zh-CN"), Some("zh-CN"));
        assert_eq!(normalize_locale("zh-Hans-CN"), Some("zh-CN"));
        assert_eq!(normalize_locale("zh-Hant-HK"), Some("zh-TW"));
        assert_eq!(normalize_locale("pt-BR"), Some("pt"));
        assert_eq!(normalize_locale("fil-PH"), Some("fil"));
        assert_eq!(normalize_locale("de-DE"), Some("de"));
        assert_eq!(normalize_locale("xx-YY"), None);
        assert_eq!(normalize_locale(""), None);
    }

    #[test]
    fn every_supported_locale_normalizes_to_itself() {
        for locale in SUPPORTED_LOCALES {
            assert_eq!(normalize_locale(locale), Some(locale));
        }
    }

    #[test]
    fn settings_default_to_system_language_and_forest_palette() {
        let settings = Settings::default();
        assert_eq!(settings.general.locale, None);
        assert_eq!(settings.general.palette, Palette::Forest);
        assert!(settings.update.auto_check);
        assert!(settings.update.metrics);
        assert_eq!(settings.update.skipped_version, None);
    }

    #[test]
    fn an_older_settings_payload_keeps_known_values_and_fills_new_fields() {
        let json = r#"{
            "timer": { "focusMinutes": 50, "shortBreakMinutes": 10 },
            "general": { "theme": "Dark", "launchAtLogin": true }
        }"#;
        let settings: Settings = serde_json::from_str(json).expect("legacy settings parse");
        assert_eq!(settings.timer.focus_minutes, 50);
        assert_eq!(settings.timer.short_break_minutes, 10);
        assert_eq!(settings.timer.long_break_minutes, 15);
        assert_eq!(settings.general.theme, Theme::Dark);
        assert!(settings.general.launch_at_login);
        assert_eq!(settings.general.palette, Palette::Forest);
        assert_eq!(settings.general.locale, None);
        assert!(settings.notifications.enabled);
        assert!(settings.update.auto_check);
        assert!(settings.update.metrics);
    }

    #[test]
    fn ui_payloads_cannot_skip_a_version_or_postpone_an_update() {
        let json = r#"{
            "update": {
                "autoCheck": false,
                "metrics": false,
                "skippedVersion": "9.9.9",
                "snoozeUntilMs": 123
            }
        }"#;
        let settings: Settings = serde_json::from_str(json).expect("update settings parse");
        assert!(!settings.update.auto_check);
        assert!(!settings.update.metrics);
        assert_eq!(settings.update.skipped_version, None);
        assert_eq!(settings.update.snooze_until_ms, None);
    }

    #[test]
    fn a_legacy_runtime_snapshot_loads_with_defaults_for_new_fields() {
        let json = r#"{
            "phase": "Countdown",
            "isPaused": false,
            "remainingMs": 60000,
            "plannedMs": 300000,
            "cycleIndex": 0,
            "completedFocusCount": 0,
            "interruptions": 0
        }"#;
        let snapshot: crate::timer::TimerSnapshot =
            serde_json::from_str(json).expect("legacy runtime parse");
        assert_eq!(snapshot.phase, crate::timer::Phase::Countdown);
        assert_eq!(snapshot.remaining_ms, 60_000);
        assert_eq!(snapshot.pending_break, None);
        assert_eq!(snapshot.ends_at_ms, None);
    }

    #[test]
    fn an_unknown_locale_falls_back_to_the_system() {
        let settings = Settings {
            general: GeneralSettings {
                locale: Some("not-a-locale".to_owned()),
                ..GeneralSettings::default()
            },
            ..Settings::default()
        }
        .normalized();
        assert_eq!(settings.general.locale, None);
    }

    #[test]
    fn ui_payloads_cannot_overwrite_the_rust_owned_overlay_position() {
        let json = r#"{
            "timer": {
                "focusMinutes": 25,
                "shortBreakMinutes": 5,
                "longBreakMinutes": 15,
                "longBreakEvery": 4,
                "autoStartBreaks": true,
                "autoStartFocus": false
            },
            "overlay": { "enabled": true, "position": { "x": 10, "y": 20 } },
            "notifications": { "enabled": true, "sound": true },
            "general": {
                "launchAtLogin": false,
                "startMinimized": false,
                "theme": "System",
                "palette": "Ocean",
                "locale": null
            }
        }"#;
        let settings: Settings = serde_json::from_str(json).expect("settings parse");
        assert_eq!(settings.overlay.position, None);
        assert_eq!(settings.general.palette, Palette::Ocean);
    }
}
