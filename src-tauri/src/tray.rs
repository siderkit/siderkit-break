use std::sync::Mutex;

use log::{error, warn};
use tauri::menu::{ContextMenu, IsMenuItem, Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Emitter, Manager, Wry};

use crate::engine_host;
use crate::i18n::{active_locale, translate};
use crate::locate;
use crate::shell;
use crate::timer::TimerSnapshot;
use crate::tray_text::{idle_snapshot, overlay_toggle_text, status_text, toggle_text};

/// Item handles for the current locale and overlay visibility. The locate row
/// only exists while the floating ball is shown, so a visibility change rebuilds
/// the menu instead of leaving a dead row behind.
struct TrayMenu {
    status: MenuItem<Wry>,
    toggle: MenuItem<Wry>,
    skip: MenuItem<Wry>,
    overlay: MenuItem<Wry>,
    open: MenuItem<Wry>,
    quit: MenuItem<Wry>,
    locale: String,
    overlay_visible: bool,
}

pub struct TrayMenuState(Mutex<Option<TrayMenu>>);

pub fn create(app: &AppHandle) -> tauri::Result<()> {
    app.manage(TrayMenuState(Mutex::new(None)));
    let locale = current_locale(app);
    let snapshot = engine_host::get_state(app).unwrap_or_else(|_| idle_snapshot());
    let overlay_visible = overlay_visible(app);
    let (menu, handles) = build_menu(app, &locale, &snapshot, overlay_visible)?;
    let icon = tauri::image::Image::from_bytes(include_bytes!("../icons/32x32.png"))?;
    TrayIconBuilder::with_id("main")
        .icon(icon)
        .tooltip("Siderkit Break")
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| handle_menu(app, event.id().as_ref()))
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                shell::show_main_window(tray.app_handle());
            }
        })
        .build(app)?;
    store_handles(app, handles);
    Ok(())
}

fn build_menu(
    app: &AppHandle,
    locale: &str,
    snapshot: &TimerSnapshot,
    overlay_visible: bool,
) -> tauri::Result<(Menu<Wry>, TrayMenu)> {
    let title = MenuItem::with_id(
        app,
        "title",
        translate(locale, "app.name"),
        false,
        None::<&str>,
    )?;
    let status = MenuItem::with_id(
        app,
        "status",
        status_text(locale, snapshot),
        false,
        None::<&str>,
    )?;
    let toggle = MenuItem::with_id(
        app,
        "toggle",
        toggle_text(locale, snapshot),
        true,
        None::<&str>,
    )?;
    let skip = MenuItem::with_id(
        app,
        "skip",
        translate(locale, "tray.skipPhase"),
        true,
        None::<&str>,
    )?;
    let overlay = MenuItem::with_id(
        app,
        "overlay",
        overlay_toggle_text(locale, overlay_visible),
        true,
        None::<&str>,
    )?;
    let locate = if overlay_visible {
        Some(MenuItem::with_id(
            app,
            "locate",
            translate(locale, "tray.locateOverlay"),
            true,
            None::<&str>,
        )?)
    } else {
        None
    };
    let open = MenuItem::with_id(
        app,
        "settings",
        translate(locale, "tray.open"),
        true,
        None::<&str>,
    )?;
    let quit = MenuItem::with_id(
        app,
        "quit",
        translate(locale, "tray.quit"),
        true,
        None::<&str>,
    )?;
    let first_separator = PredefinedMenuItem::separator(app)?;
    let second_separator = PredefinedMenuItem::separator(app)?;
    let third_separator = PredefinedMenuItem::separator(app)?;
    let mut items: Vec<&dyn IsMenuItem<Wry>> = vec![
        &title,
        &status,
        &first_separator,
        &toggle,
        &skip,
        &second_separator,
        &overlay,
    ];
    if let Some(locate) = &locate {
        items.push(locate);
    }
    items.push(&open);
    items.push(&third_separator);
    items.push(&quit);
    let menu = Menu::with_items(app, &items)?;
    Ok((
        menu,
        TrayMenu {
            status,
            toggle,
            skip,
            overlay,
            open,
            quit,
            locale: locale.to_owned(),
            overlay_visible,
        },
    ))
}

/// Opens the localized context menu anchored at the cursor. The overlay uses
/// this for right-click so the menu matches the rest of the app language.
pub fn show_overlay_menu(app: &AppHandle) -> Result<(), String> {
    let locale = current_locale(app);
    let snapshot = engine_host::get_state(app)?;
    let title = MenuItem::with_id(
        app,
        "overlay-menu-title",
        translate(&locale, "app.name"),
        false,
        None::<&str>,
    )
    .map_err(|error| error.to_string())?;
    let status = MenuItem::with_id(
        app,
        "overlay-menu-status",
        status_text(&locale, &snapshot),
        false,
        None::<&str>,
    )
    .map_err(|error| error.to_string())?;
    let toggle = MenuItem::with_id(
        app,
        "overlay-menu-toggle",
        toggle_text(&locale, &snapshot),
        true,
        None::<&str>,
    )
    .map_err(|error| error.to_string())?;
    let locate = MenuItem::with_id(
        app,
        "overlay-menu-locate",
        translate(&locale, "tray.locateOverlay"),
        true,
        None::<&str>,
    )
    .map_err(|error| error.to_string())?;
    let open = MenuItem::with_id(
        app,
        "overlay-menu-open",
        translate(&locale, "tray.open"),
        true,
        None::<&str>,
    )
    .map_err(|error| error.to_string())?;
    let settings = MenuItem::with_id(
        app,
        "overlay-menu-settings",
        translate(&locale, "common.action.settings"),
        true,
        None::<&str>,
    )
    .map_err(|error| error.to_string())?;
    let quit = MenuItem::with_id(
        app,
        "overlay-menu-quit",
        translate(&locale, "tray.quit"),
        true,
        None::<&str>,
    )
    .map_err(|error| error.to_string())?;
    let first_separator = PredefinedMenuItem::separator(app).map_err(|error| error.to_string())?;
    let second_separator = PredefinedMenuItem::separator(app).map_err(|error| error.to_string())?;
    let menu = Menu::with_items(
        app,
        &[
            &title,
            &status,
            &first_separator,
            &toggle,
            &locate,
            &open,
            &settings,
            &second_separator,
            &quit,
        ],
    )
    .map_err(|error| error.to_string())?;
    let webview = app
        .get_webview_window("overlay")
        .ok_or_else(|| "the overlay window is missing".to_owned())?;
    let _ = webview.set_focus();
    let window = webview.as_ref().window();
    menu.popup(window).map_err(|error| error.to_string())
}

/// Handles only the overlay menu IDs; tray events keep their own handler.
pub fn handle_overlay_menu(app: &AppHandle, id: &str) {
    let result = match id {
        "overlay-menu-open" => {
            shell::show_main_window(app);
            Ok(())
        }
        "overlay-menu-toggle" => engine_host::toggle_start_pause(app).map(|_| ()),
        "overlay-menu-locate" => locate::show(app),
        "overlay-menu-settings" => {
            shell::show_main_window(app);
            let _ = app.emit("navigate", "settings");
            Ok(())
        }
        "overlay-menu-quit" => {
            engine_host::quit(app);
            Ok(())
        }
        _ => Ok(()),
    };
    if let Err(message) = result {
        error!("overlay menu action failed: {message}");
    }
}

pub fn update(app: &AppHandle, snapshot: &TimerSnapshot) {
    let locale = current_locale(app);
    let overlay_visible = overlay_visible(app);
    let needs_rebuild = {
        let Some(menu_state) = app.try_state::<TrayMenuState>() else {
            return;
        };
        let guard = menu_state
            .0
            .lock()
            .unwrap_or_else(|poison| poison.into_inner());
        match guard.as_ref() {
            Some(menu) => menu.locale != locale || menu.overlay_visible != overlay_visible,
            None => true,
        }
    };
    // Menu creation and set_menu both hop to the main thread. Never hold the
    // menu mutex across those calls, or a menu event on the main thread could
    // deadlock waiting for this lock.
    if needs_rebuild {
        match build_menu(app, &locale, snapshot, overlay_visible) {
            Ok((menu, handles)) => {
                if let Some(tray) = app.tray_by_id("main") {
                    if let Err(error) = tray.set_menu(Some(menu)) {
                        warn!("failed to replace tray menu: {error}");
                    }
                }
                store_handles(app, handles);
            }
            Err(error) => warn!("failed to rebuild tray menu: {error}"),
        }
        return;
    }
    let Some(menu_state) = app.try_state::<TrayMenuState>() else {
        return;
    };
    let handles = {
        let guard = menu_state
            .0
            .lock()
            .unwrap_or_else(|poison| poison.into_inner());
        guard.as_ref().map(|menu| {
            (
                menu.status.clone(),
                menu.toggle.clone(),
                menu.overlay.clone(),
                menu.skip.clone(),
                menu.open.clone(),
                menu.quit.clone(),
            )
        })
    };
    let Some((status_item, toggle, overlay, skip, open, quit)) = handles else {
        return;
    };
    let status = status_text(&locale, snapshot);
    set_text(&status_item, status.clone());
    set_text(&toggle, toggle_text(&locale, snapshot));
    set_text(&overlay, overlay_toggle_text(&locale, overlay_visible));
    set_text(&skip, translate(&locale, "tray.skipPhase"));
    set_text(&open, translate(&locale, "tray.open"));
    set_text(&quit, translate(&locale, "tray.quit"));
    if let Some(tray) = app.tray_by_id("main") {
        if let Err(error) = tray.set_tooltip(Some(status)) {
            warn!("failed to update tray tooltip: {error}");
        }
    }
}

fn store_handles(app: &AppHandle, handles: TrayMenu) {
    let state = app.state::<TrayMenuState>();
    *state.0.lock().unwrap_or_else(|poison| poison.into_inner()) = Some(handles);
}

fn set_text(item: &MenuItem<Wry>, text: String) {
    if let Err(error) = item.set_text(text) {
        warn!("failed to update tray label: {error}");
    }
}

fn handle_menu(app: &AppHandle, id: &str) {
    let result = match id {
        "toggle" => engine_host::toggle_start_pause(app).map(|_| ()),
        "skip" => engine_host::skip(app).map(|_| ()),
        "overlay" => toggle_overlay(app),
        "locate" => locate::show(app),
        "settings" | "show" => {
            shell::show_main_window(app);
            Ok(())
        }
        "quit" => {
            engine_host::quit(app);
            Ok(())
        }
        _ => Ok(()),
    };
    if let Err(message) = result {
        error!("tray action failed: {message}");
    }
}

fn toggle_overlay(app: &AppHandle) -> Result<(), String> {
    let enabled = engine_host::get_settings(app)?.overlay.enabled;
    engine_host::set_overlay_visible(app, !enabled)
}

fn overlay_visible(app: &AppHandle) -> bool {
    engine_host::get_settings(app)
        .map(|settings| settings.overlay.enabled)
        .unwrap_or(true)
}

pub(crate) fn current_locale(app: &AppHandle) -> String {
    engine_host::get_settings(app)
        .map(|settings| active_locale(settings.general.locale.as_deref()))
        .unwrap_or_else(|_| active_locale(None))
}
