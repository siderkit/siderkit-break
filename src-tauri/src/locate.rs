use std::sync::atomic::{AtomicU64, Ordering};
use std::time::Duration;

use tauri::{AppHandle, Emitter, Manager, PhysicalPosition};

use crate::engine_host;
use crate::overlay::droplet_screen_center;
use crate::timer::Phase;
use crate::topmost;
use crate::window_size;

/// The hint is a separate transparent window so the droplet keeps its exact
/// screen position while the rounded frame plays around it.
const WIDTH: f64 = 240.0;
const HEIGHT: f64 = 160.0;
/// Must match `--sk-locate-center-x` / `--sk-locate-center-y` in tokens.css.
const CENTER_X: f64 = 120.0;
const CENTER_Y: f64 = 104.0;
const VISIBLE_FOR: Duration = Duration::from_millis(2400);
/// Head start for the queued map request before the first mapping check.
const REVEAL_DELAY: Duration = Duration::from_millis(50);

static GENERATION: AtomicU64 = AtomicU64::new(0);

/// Flashes a rounded frame and an "I'm here" label around the droplet. The
/// frame is centered on the droplet's current screen point for both shapes, so
/// the idle droplet and the countdown clock both get the same hint position.
pub fn show(app: &AppHandle) -> Result<(), String> {
    let settings = engine_host::get_settings(app)?;
    if !settings.overlay.enabled {
        return Ok(());
    }
    let overlay = app
        .get_webview_window("overlay")
        .ok_or_else(|| "the overlay window is missing".to_owned())?;
    overlay.show().map_err(|error| error.to_string())?;
    topmost::raise_overlay(&overlay);

    let hint = app
        .get_webview_window("locate")
        .ok_or_else(|| "the locate window is missing".to_owned())?;
    let (Ok(position), Ok(size)) = (overlay.outer_position(), overlay.outer_size()) else {
        return Ok(());
    };
    let snapshot = engine_host::get_state(app)?;
    let scale = overlay.scale_factor().map_err(|error| error.to_string())?;
    let center = droplet_screen_center(
        (position.x, position.y),
        (size.width, size.height),
        snapshot.phase == Phase::Idle,
        scale,
    );
    let target = PhysicalPosition::new(
        center.0 - (CENTER_X * scale).round() as i32,
        center.1 - (CENTER_Y * scale).round() as i32,
    );
    window_size::set_logical_size(&hint, WIDTH, HEIGHT)?;

    // The hint must sit on the droplet even when the droplet touches the screen
    // edge, but a managed window is constrained to the visible work area. That
    // would push the frame away from a droplet resting on the taskbar or a side
    // edge. Realizing the GTK window and making it override-redirect before the
    // first map takes the window manager out of the loop; the hint is
    // decoration only and needs no management.
    let hint_for_main = hint.clone();
    let (placed_tx, placed_rx) = std::sync::mpsc::channel();
    app.run_on_main_thread(move || {
        prepare_hint(&hint_for_main);
        let _ = placed_tx.send(());
    })
    .map_err(|error| error.to_string())?;
    // The main thread always answers; the bound only guards a wedged loop.
    let _ = placed_rx.recv_timeout(Duration::from_millis(500));

    hint.show().map_err(|error| error.to_string())?;
    // The hint is decoration only and must never swallow a click. The flag is
    // set after showing because the native window does not exist before that.
    let _ = hint.set_ignore_cursor_events(true);
    topmost::raise_overlay(&hint);

    let generation = GENERATION.fetch_add(1, Ordering::SeqCst) + 1;
    let handle = app.clone();
    let mover = app.clone();
    let _ = std::thread::Builder::new()
        .name("siderkit-break-locate".to_owned())
        .spawn(move || {
            // GTK computes the final position while mapping, so an earlier move
            // is overwritten. Wait for the map, then place the frame and only
            // then start the entrance animation.
            std::thread::sleep(REVEAL_DELAY);
            let _ = wait_mapped(&mover, Duration::from_millis(600));
            let app_for_move = mover.clone();
            let _ = mover.run_on_main_thread(move || {
                if GENERATION.load(Ordering::SeqCst) != generation {
                    return;
                }
                let Some(window) = app_for_move.get_webview_window("locate") else {
                    return;
                };
                place_hint(&window, target);
                let _ = app_for_move.emit_to("locate", "locate:show", ());
            });
            std::thread::sleep(VISIBLE_FOR);
            if GENERATION.load(Ordering::SeqCst) == generation {
                if let Some(window) = handle.get_webview_window("locate") {
                    let _ = window.hide();
                    // Clear the finished animation so the next show starts
                    // blank instead of flashing the old frame before the new
                    // placement lands.
                    let _ = handle.emit_to("locate", "locate:reset", ());
                }
            }
        });
    Ok(())
}

/// Blocks until the hint is mapped so the move lands after GTK's map-time
/// placement. Returns early on platforms where the mapping state is unknown.
fn wait_mapped(app: &AppHandle, limit: Duration) -> bool {
    let deadline = std::time::Instant::now() + limit;
    while std::time::Instant::now() < deadline {
        if hint_is_mapped(app) {
            return true;
        }
        std::thread::sleep(Duration::from_millis(15));
    }
    false
}

#[cfg(target_os = "linux")]
fn hint_is_mapped(app: &AppHandle) -> bool {
    let (mapped_tx, mapped_rx) = std::sync::mpsc::channel();
    let app_for_main = app.clone();
    if app
        .run_on_main_thread(move || {
            let mapped = app_for_main
                .get_webview_window("locate")
                .and_then(|window| window.gtk_window().ok())
                .map(|gtk_window| {
                    use gtk::prelude::*;
                    gtk_window.is_mapped()
                })
                .unwrap_or(false);
            let _ = mapped_tx.send(mapped);
        })
        .is_err()
    {
        return false;
    }
    mapped_rx
        .recv_timeout(Duration::from_millis(120))
        .unwrap_or(false)
}

#[cfg(not(target_os = "linux"))]
fn hint_is_mapped(_app: &AppHandle) -> bool {
    true
}

/// X11 needs a realized native window before the first move, and the hint must
/// be unmanaged before that first map. Other platforms realize on show.
#[cfg(target_os = "linux")]
fn prepare_hint(window: &tauri::WebviewWindow) {
    use gtk::prelude::*;

    let Ok(gtk_window) = window.gtk_window() else {
        return;
    };
    if !gtk_window.is_realized() {
        gtk_window.realize();
    }
    if let Some(gdk_window) = gtk_window.window() {
        gdk_window.set_override_redirect(true);
        gdk_window.raise();
    }
}

#[cfg(not(target_os = "linux"))]
fn prepare_hint(_window: &tauri::WebviewWindow) {}

fn place_hint(window: &tauri::WebviewWindow, target: PhysicalPosition<i32>) {
    #[cfg(target_os = "linux")]
    if move_x11_window(window, target) {
        return;
    }
    let _ = window.set_position(target);
}

/// X11 accepts the negative top-left that a droplet at the screen edge needs;
/// GTK's managed-window move goes through a path that rejects it.
#[cfg(target_os = "linux")]
fn move_x11_window(window: &tauri::WebviewWindow, target: PhysicalPosition<i32>) -> bool {
    use gdkx11::glib::Cast;
    use gtk::prelude::*;

    let Ok(gtk_window) = window.gtk_window() else {
        return false;
    };
    let Some(gdk_window) = gtk_window.window() else {
        return false;
    };
    let Ok(x11_window) = gdk_window.downcast::<gdkx11::X11Window>() else {
        return false;
    };
    // Reuse GDK's display connection instead of opening a second one; the hint
    // lives in this process and its windows belong to the same display.
    let display = unsafe { gdkx11::ffi::gdk_x11_get_default_xdisplay() };
    if display.is_null() {
        return false;
    }
    let display = display.cast::<std::os::raw::c_void>();
    unsafe {
        x_move_window(display, x11_window.xid(), target.x, target.y);
        x_flush(display);
    }
    true
}

#[cfg(target_os = "linux")]
#[link(name = "X11")]
extern "C" {
    #[link_name = "XMoveWindow"]
    fn x_move_window(
        display: *mut std::os::raw::c_void,
        window: std::os::raw::c_ulong,
        x: std::os::raw::c_int,
        y: std::os::raw::c_int,
    ) -> std::os::raw::c_int;
    #[link_name = "XFlush"]
    fn x_flush(display: *mut std::os::raw::c_void) -> std::os::raw::c_int;
}
