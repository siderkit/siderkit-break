use std::collections::HashMap;
use std::sync::OnceLock;

use crate::settings::normalize_locale;

/// Catalogs are compiled in so the tray and notifications keep working even
/// when no webview is alive. Paraglide owns the same JSON files at build time.
const CATALOGS: [(&str, &str); 30] = [
    ("en", include_str!("../../messages/en.json")),
    ("zh-CN", include_str!("../../messages/zh-CN.json")),
    ("zh-TW", include_str!("../../messages/zh-TW.json")),
    ("hi", include_str!("../../messages/hi.json")),
    ("es", include_str!("../../messages/es.json")),
    ("fr", include_str!("../../messages/fr.json")),
    ("pt", include_str!("../../messages/pt.json")),
    ("ar", include_str!("../../messages/ar.json")),
    ("bn", include_str!("../../messages/bn.json")),
    ("id", include_str!("../../messages/id.json")),
    ("ru", include_str!("../../messages/ru.json")),
    ("ur", include_str!("../../messages/ur.json")),
    ("de", include_str!("../../messages/de.json")),
    ("ja", include_str!("../../messages/ja.json")),
    ("sw", include_str!("../../messages/sw.json")),
    ("mr", include_str!("../../messages/mr.json")),
    ("te", include_str!("../../messages/te.json")),
    ("tr", include_str!("../../messages/tr.json")),
    ("ta", include_str!("../../messages/ta.json")),
    ("vi", include_str!("../../messages/vi.json")),
    ("ko", include_str!("../../messages/ko.json")),
    ("fa", include_str!("../../messages/fa.json")),
    ("fil", include_str!("../../messages/fil.json")),
    ("th", include_str!("../../messages/th.json")),
    ("it", include_str!("../../messages/it.json")),
    ("ms", include_str!("../../messages/ms.json")),
    ("pl", include_str!("../../messages/pl.json")),
    ("uk", include_str!("../../messages/uk.json")),
    ("nl", include_str!("../../messages/nl.json")),
    ("ro", include_str!("../../messages/ro.json")),
];

type Catalog = HashMap<String, String>;

fn catalogs() -> &'static HashMap<&'static str, Catalog> {
    static CATALOGS_BY_LOCALE: OnceLock<HashMap<&'static str, Catalog>> = OnceLock::new();
    CATALOGS_BY_LOCALE.get_or_init(|| {
        CATALOGS
            .iter()
            .filter_map(|(locale, json)| {
                let catalog: Catalog = serde_json::from_str(json).ok()?;
                Some((*locale, catalog))
            })
            .collect()
    })
}

/// Resolves the explicit preference first, then the operating system, then English.
pub fn active_locale(explicit: Option<&str>) -> String {
    if let Some(locale) = explicit.and_then(normalize_locale) {
        return locale.to_owned();
    }
    detect_system_locale()
        .as_deref()
        .and_then(normalize_locale)
        .unwrap_or("en")
        .to_owned()
}

pub fn translate(locale: &str, key: &str) -> String {
    let resolved = normalize_locale(locale).unwrap_or("en");
    if let Some(value) = catalogs()
        .get(resolved)
        .and_then(|catalog| catalog.get(key))
    {
        return value.clone();
    }
    catalogs()
        .get("en")
        .and_then(|catalog| catalog.get(key))
        .cloned()
        .unwrap_or_else(|| key.to_owned())
}

fn detect_system_locale() -> Option<String> {
    #[cfg(windows)]
    {
        use windows_sys::Win32::Globalization::GetUserDefaultLocaleName;
        let mut buffer = [0_u16; 85];
        let length = unsafe { GetUserDefaultLocaleName(buffer.as_mut_ptr(), buffer.len() as i32) };
        if length > 0 {
            return String::from_utf16(&buffer[..(length as usize - 1)]).ok();
        }
        None
    }
    #[cfg(not(windows))]
    {
        ["LC_ALL", "LC_MESSAGES", "LANG"]
            .iter()
            .find_map(|name| std::env::var(name).ok())
            .map(|value| {
                value
                    .split(['.', '@'])
                    .next()
                    .unwrap_or(value.as_str())
                    .to_owned()
            })
            .filter(|value| !value.is_empty())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::settings::SUPPORTED_LOCALES;

    #[test]
    fn every_catalog_has_the_same_keys() {
        let catalogs = catalogs();
        let english = catalogs.get("en").expect("English catalog");
        for locale in SUPPORTED_LOCALES {
            let catalog = catalogs
                .get(locale)
                .unwrap_or_else(|| panic!("{locale} catalog"));
            let mut expected: Vec<_> = english.keys().collect();
            let mut actual: Vec<_> = catalog.keys().collect();
            expected.sort();
            actual.sort();
            assert_eq!(actual, expected, "{locale} keys differ from English");
        }
    }

    #[test]
    fn every_catalog_keeps_the_same_placeholders() {
        let catalogs = catalogs();
        let english = catalogs.get("en").expect("English catalog");
        for locale in SUPPORTED_LOCALES {
            let catalog = catalogs.get(locale).expect("catalog");
            for (key, source) in english {
                let translated = catalog.get(key).expect("key");
                assert_eq!(
                    placeholders(translated),
                    placeholders(source),
                    "{locale} placeholders differ for {key}"
                );
            }
        }
    }

    #[test]
    fn translate_falls_back_to_english_for_unknown_keys() {
        assert_eq!(translate("de", "missing.key"), "missing.key");
        assert!(!translate("de", "timer.phase.focus").is_empty());
    }

    fn placeholders(text: &str) -> Vec<String> {
        let mut values = Vec::new();
        let mut rest = text;
        while let Some(start) = rest.find('{') {
            let Some(end) = rest[start..].find('}') else {
                break;
            };
            values.push(rest[start + 1..start + end].to_owned());
            rest = &rest[start + end + 1..];
        }
        values.sort();
        values
    }
}
