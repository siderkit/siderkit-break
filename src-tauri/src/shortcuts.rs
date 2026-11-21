use log::{error, warn};
use tauri::AppHandle;
use tauri_plugin_global_shortcut::{
    Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutEvent, ShortcutState,
};

use crate::engine_host;

pub fn register(app: &AppHandle) {
    let shortcuts = [
        Shortcut::new(Some(modifiers()), Code::KeyP),
        Shortcut::new(Some(modifiers()), Code::KeyS),
        Shortcut::new(Some(modifiers()), Code::KeyO),
    ];
    for shortcut in shortcuts {
        if let Err(error) = app.global_shortcut().register(shortcut) {
            warn!("failed to register global shortcut {shortcut:?}: {error}");
        }
    }
}

pub fn handle(app: &AppHandle, shortcut: &Shortcut, event: ShortcutEvent) {
    if event.state != ShortcutState::Pressed {
        return;
    }
    let result = if shortcut.matches(modifiers(), Code::KeyP) {
        engine_host::toggle_start_pause(app).map(|_| ())
    } else if shortcut.matches(modifiers(), Code::KeyS) {
        engine_host::skip(app).map(|_| ())
    } else if shortcut.matches(modifiers(), Code::KeyO) {
        toggle_overlay(app)
    } else {
        Ok(())
    };
    if let Err(message) = result {
        error!("global shortcut failed: {message}");
    }
}

fn toggle_overlay(app: &AppHandle) -> Result<(), String> {
    let enabled = engine_host::get_settings(app)?.overlay.enabled;
    engine_host::set_overlay_visible(app, !enabled)
}

fn modifiers() -> Modifiers {
    #[cfg(target_os = "macos")]
    {
        Modifiers::SUPER | Modifiers::ALT
    }
    #[cfg(not(target_os = "macos"))]
    {
        Modifiers::CONTROL | Modifiers::ALT
    }
}
