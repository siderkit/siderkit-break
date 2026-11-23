mod commands;
mod context_menu;
mod db;
mod engine_host;
mod export;
mod i18n;
mod locate;
mod overlay;
mod reminder;
mod settings;
mod shell;
mod shortcuts;
mod sound;
mod timer;
mod topmost;
mod tray;
mod tray_text;
mod window_size;

use tauri::Manager;

/// GTK forces a non-resizable window back to the webview's natural size, which
/// breaks every programmatic fit. Linux keeps the fitted windows GTK-resizable
/// and pins their actual size with min/max hints, which also removes resize
/// grips, so the user still cannot resize them.
fn platform_window_config(
    config: tauri::utils::config::WindowConfig,
) -> tauri::utils::config::WindowConfig {
    #[cfg(target_os = "linux")]
    let mut config = config;
    #[cfg(target_os = "linux")]
    if config.label != "main" {
        config.resizable = true;
    }
    config
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            shell::show_main_window(app);
        }))
        .plugin(tauri_plugin_log::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec!["--minimized"]),
        ))
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, shortcut, event| {
                    shortcuts::handle(app, shortcut, event);
                })
                .build(),
        )
        .plugin(
            tauri_plugin_window_state::Builder::default()
                // The break card and overlay are sized and placed by Rust, so a
                // restored size would fight the layout and can clip the card.
                .with_denylist(&["break", "overlay", "locate"])
                .build(),
        )
        .on_menu_event(|app, event| {
            let id = event.id().as_ref();
            if context_menu::owns(id) {
                context_menu::handle(app, id);
            } else {
                tray::handle_overlay_menu(app, id);
            }
        })
        .setup(|app| {
            let handle = app.handle().clone();
            let state = engine_host::AppState::initialize(&handle)?;
            app.manage(state);
            // Keep the OS autostart entry in sync with the stored preference.
            if let Err(error) = engine_host::apply_startup_autostart(&handle) {
                eprintln!("failed to apply startup autostart: {error}");
            }
            // Config windows would be created before this hook runs, so their
            // first IPC call could beat app.manage() and panic on state().
            // They set "create": false and are built here, after the state
            // exists, keeping startup deterministic.
            for window_config in app.config().app.windows.clone() {
                tauri::WebviewWindowBuilder::from_config(
                    &handle,
                    &platform_window_config(window_config),
                )?
                .build()?;
            }
            tray::create(&handle)?;
            shortcuts::register(&handle);
            engine_host::spawn_ticker(handle.clone());
            shell::spawn_overlay_hover_watch(handle.clone());
            shell::apply_startup_view(&handle);
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                if window.label() == "main" {
                    api.prevent_close();
                    let _ = window.hide();
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_state,
            commands::get_settings,
            commands::update_settings,
            commands::start_focus,
            commands::start_countdown,
            commands::pause,
            commands::resume,
            commands::skip,
            commands::reset,
            commands::postpone_break,
            commands::set_overlay_visible,
            commands::locate_overlay,
            commands::save_overlay_position,
            commands::begin_overlay_drag,
            commands::end_overlay_drag,
            commands::show_overlay_menu,
            commands::show_context_menu,
            commands::open_project_page,
            commands::show_main_window,
            commands::get_today_summary,
            commands::get_history,
            commands::get_history_window,
            commands::get_history_range,
            commands::get_history_range_summary,
            commands::export_data,
            commands::choose_history_workbook_path,
            commands::write_history_workbook,
            commands::reveal_history_workbook,
            commands::hide_break_card,
            commands::get_notice,
            commands::dismiss_notice,
            commands::preview_notification_sound,
            commands::fit_break_card,
            commands::fit_overlay,
            commands::quit_app,
        ])
        .run(tauri::generate_context!())
        .expect("failed to run Siderkit Break");
}
