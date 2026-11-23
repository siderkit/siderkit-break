//! Native context menu for the app windows.
//!
//! Every window used to show the WebView's own menu, which offers browser
//! commands (reload, print, save as, inspect) that do not belong in a desktop
//! app. This module replaces it with a menu that matches the tray and overlay
//! menus, and keeps the standard edit verbs while the pointer is on a text
//! field.

use log::error;
use tauri::menu::{ContextMenu, IsMenuItem, Menu, MenuItem, PredefinedMenuItem};
use tauri::{AppHandle, Emitter, Manager, WebviewWindow, Wry};

use crate::engine_host;
use crate::i18n::translate;
use crate::shell;
use crate::timer::{Phase, TimerSnapshot};
use crate::tray;
use crate::tray_text::{status_text, toggle_text};

/// Menu IDs owned by this module. The global menu handler forwards them here
/// so the tray rows keep their own handler.
const ID_PREFIX: &str = "ctx-";
const TOGGLE: &str = "ctx-toggle";
const SKIP: &str = "ctx-skip";
const COLLAPSE: &str = "ctx-collapse";
const OPEN: &str = "ctx-open";
const SETTINGS: &str = "ctx-settings";
const HELP: &str = "ctx-help";
const QUIT: &str = "ctx-quit";

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum EditCommand {
    Undo,
    Redo,
    Cut,
    Copy,
    Paste,
    SelectAll,
}

impl EditCommand {
    fn key(self) -> &'static str {
        match self {
            EditCommand::Undo => "common.action.undo",
            EditCommand::Redo => "common.action.redo",
            EditCommand::Cut => "common.action.cut",
            EditCommand::Copy => "common.action.copy",
            EditCommand::Paste => "common.action.paste",
            EditCommand::SelectAll => "common.action.selectAll",
        }
    }
}

/// One row of the menu, before it becomes a platform item. Keeping the shape
/// as data makes the composition testable without a running window.
#[derive(Debug, PartialEq, Eq)]
enum Entry {
    /// A disabled row that reports the current timer state.
    Label(String),
    Action(&'static str, String),
    Edit(EditCommand),
    Separator,
}

pub fn owns(id: &str) -> bool {
    id.starts_with(ID_PREFIX)
}

/// Builds and shows the menu at the cursor for the calling window.
///
/// `editable` comes from the renderer, which knows whether the pointer is over
/// a text field. Only then does the menu carry edit verbs.
pub fn show(window: &WebviewWindow, editable: bool) -> Result<(), String> {
    let app = window.app_handle();
    let locale = tray::current_locale(app);
    let snapshot =
        engine_host::get_state(app).unwrap_or_else(|_| crate::tray_text::idle_snapshot());
    let entries = if editable {
        edit_plan()
    } else {
        app_plan(window.label(), &locale, &snapshot)
    };
    let menu = build_menu(app, &locale, &entries).map_err(|error| error.to_string())?;
    let target = window.as_ref().window();
    menu.popup(target).map_err(|error| error.to_string())
}

fn build_menu(app: &AppHandle, locale: &str, entries: &[Entry]) -> tauri::Result<Menu<Wry>> {
    let mut items: Vec<Box<dyn IsMenuItem<Wry>>> = Vec::with_capacity(entries.len());
    for entry in entries {
        let item: Box<dyn IsMenuItem<Wry>> = match entry {
            Entry::Label(text) => Box::new(MenuItem::with_id(
                app,
                "ctx-status",
                text,
                false,
                None::<&str>,
            )?),
            Entry::Action(id, text) => {
                Box::new(MenuItem::with_id(app, *id, text, true, None::<&str>)?)
            }
            Entry::Edit(command) => {
                let text = translate(locale, command.key());
                Box::new(predefined_edit(app, *command, &text)?)
            }
            Entry::Separator => Box::new(PredefinedMenuItem::separator(app)?),
        };
        items.push(item);
    }
    let refs: Vec<&dyn IsMenuItem<Wry>> = items.iter().map(|item| item.as_ref()).collect();
    Menu::with_items(app, &refs)
}

#[cfg(not(target_os = "linux"))]
fn predefined_edit(
    app: &AppHandle,
    command: EditCommand,
    text: &str,
) -> tauri::Result<PredefinedMenuItem<Wry>> {
    match command {
        EditCommand::Undo => PredefinedMenuItem::undo(app, Some(text)),
        EditCommand::Redo => PredefinedMenuItem::redo(app, Some(text)),
        EditCommand::Cut => PredefinedMenuItem::cut(app, Some(text)),
        EditCommand::Copy => PredefinedMenuItem::copy(app, Some(text)),
        EditCommand::Paste => PredefinedMenuItem::paste(app, Some(text)),
        EditCommand::SelectAll => PredefinedMenuItem::select_all(app, Some(text)),
    }
}

/// GTK needs the optional `libxdo` feature for predefined edit rows. The app
/// does not enable it because that would add a runtime dependency the
/// AppImage does not carry, so Linux leaves editable fields to the WebView.
#[cfg(target_os = "linux")]
fn predefined_edit(
    app: &AppHandle,
    _command: EditCommand,
    text: &str,
) -> tauri::Result<PredefinedMenuItem<Wry>> {
    let _ = text;
    PredefinedMenuItem::separator(app)
}

fn app_plan(window: &str, locale: &str, snapshot: &TimerSnapshot) -> Vec<Entry> {
    let mut entries = vec![
        Entry::Label(status_text(locale, snapshot)),
        Entry::Separator,
        Entry::Action(TOGGLE, toggle_text(locale, snapshot)),
    ];
    if snapshot.phase != Phase::Idle {
        entries.push(Entry::Action(SKIP, translate(locale, "tray.skipPhase")));
    }
    if window == "break" {
        entries.push(Entry::Action(
            COLLAPSE,
            translate(locale, "timer.action.collapseBreak"),
        ));
    }
    entries.push(Entry::Separator);
    if window != "main" {
        entries.push(Entry::Action(OPEN, translate(locale, "tray.open")));
    }
    entries.push(Entry::Action(
        SETTINGS,
        translate(locale, "common.action.settings"),
    ));
    entries.push(Entry::Action(HELP, translate(locale, "help.title")));
    entries.push(Entry::Separator);
    entries.push(Entry::Action(QUIT, translate(locale, "tray.quit")));
    entries
}

fn edit_plan() -> Vec<Entry> {
    let mut entries = vec![
        Entry::Edit(EditCommand::Undo),
        Entry::Edit(EditCommand::Redo),
        Entry::Separator,
        Entry::Edit(EditCommand::Cut),
        Entry::Edit(EditCommand::Copy),
    ];
    if cfg!(not(target_os = "linux")) {
        entries.push(Entry::Edit(EditCommand::Paste));
    }
    entries.push(Entry::Separator);
    entries.push(Entry::Edit(EditCommand::SelectAll));
    entries
}

/// Runs the row that was chosen. Edit rows never reach this handler; the
/// operating system runs them directly.
pub fn handle(app: &AppHandle, id: &str) {
    let result = match id {
        TOGGLE => engine_host::toggle_start_pause(app).map(|_| ()),
        SKIP => engine_host::skip(app).map(|_| ()),
        COLLAPSE => {
            shell::hide_break_card(app);
            Ok(())
        }
        OPEN => {
            shell::show_main_window(app);
            Ok(())
        }
        SETTINGS => {
            shell::show_main_window(app);
            let _ = app.emit("navigate", "settings");
            Ok(())
        }
        HELP => {
            shell::show_main_window(app);
            let _ = app.emit("navigate", "help");
            Ok(())
        }
        QUIT => {
            engine_host::quit(app);
            Ok(())
        }
        _ => return,
    };
    if let Err(message) = result {
        error!("context menu action failed: {message}");
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::timer::Phase;

    fn idle() -> TimerSnapshot {
        crate::tray_text::idle_snapshot()
    }

    #[test]
    fn only_prefixed_ids_are_claimed() {
        assert!(owns("ctx-quit"));
        assert!(!owns("quit"));
        assert!(!owns("overlay-menu-quit"));
    }

    #[test]
    fn the_main_window_menu_starts_and_ends_a_session() {
        let mut snapshot = idle();
        snapshot.phase = Phase::Focus;
        snapshot.remaining_ms = 60_000;
        snapshot.planned_ms = 1_500_000;
        let entries = app_plan("main", "en", &snapshot);
        assert!(matches!(entries[2], Entry::Action(TOGGLE, _)));
        assert!(entries
            .iter()
            .any(|entry| matches!(entry, Entry::Action(SKIP, _))));
        // The main window is already open, so it has no open row.
        assert!(!entries
            .iter()
            .any(|entry| matches!(entry, Entry::Action(OPEN, _))));
        assert!(entries
            .iter()
            .any(|entry| matches!(entry, Entry::Action(HELP, _))));
    }

    #[test]
    fn an_idle_menu_hides_the_end_current_phase_row() {
        let entries = app_plan("main", "en", &idle());
        assert!(!entries
            .iter()
            .any(|entry| matches!(entry, Entry::Action(SKIP, _))));
    }

    #[test]
    fn only_the_break_card_offers_hiding_the_reminder() {
        let break_entries = app_plan("break", "en", &idle());
        assert!(break_entries
            .iter()
            .any(|entry| matches!(entry, Entry::Action(COLLAPSE, _))));
        let locate_entries = app_plan("locate", "en", &idle());
        assert!(!locate_entries
            .iter()
            .any(|entry| matches!(entry, Entry::Action(COLLAPSE, _))));
        assert!(locate_entries
            .iter()
            .any(|entry| matches!(entry, Entry::Action(OPEN, _))));
    }

    #[test]
    fn the_menu_status_row_reports_the_remaining_time() {
        let mut snapshot = idle();
        snapshot.phase = Phase::Focus;
        snapshot.remaining_ms = 90_000;
        snapshot.planned_ms = 1_500_000;
        let entries = app_plan("main", "en", &snapshot);
        assert_eq!(entries[0], Entry::Label("Focus · 01:30".to_owned()));
    }

    #[test]
    fn the_edit_menu_keeps_the_standard_verbs_in_order() {
        let entries = edit_plan();
        let verbs: Vec<EditCommand> = entries
            .iter()
            .filter_map(|entry| match entry {
                Entry::Edit(command) => Some(*command),
                _ => None,
            })
            .collect();
        assert_eq!(verbs.first(), Some(&EditCommand::Undo));
        assert_eq!(verbs.last(), Some(&EditCommand::SelectAll));
        assert!(verbs.contains(&EditCommand::Cut));
        assert!(verbs.contains(&EditCommand::Copy));
    }

    #[test]
    fn every_edit_verb_has_a_message_key() {
        for command in [
            EditCommand::Undo,
            EditCommand::Redo,
            EditCommand::Cut,
            EditCommand::Copy,
            EditCommand::Paste,
            EditCommand::SelectAll,
        ] {
            let translated = translate("zh-CN", command.key());
            assert_ne!(translated, command.key(), "missing {}", command.key());
        }
    }
}
