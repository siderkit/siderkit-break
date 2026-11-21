use std::sync::{Mutex, OnceLock};
use std::time::{Duration, Instant};

use log::warn;
use tauri::{AppHandle, LogicalSize, Manager, PhysicalPosition, WebviewWindow};

use crate::engine_host;
use crate::overlay::{
    clamp_overlay_visible, clamped_overlay_position, droplet_anchored_position, position_overlay,
    save_overlay_position, OVERLAY_ACTIVE_HEIGHT, OVERLAY_ACTIVE_MAX_WIDTH,
    OVERLAY_ACTIVE_MIN_WIDTH, OVERLAY_ACTIVE_WIDTH, OVERLAY_IDLE_SIZE,
};
use crate::settings::Settings;
use crate::timer::{Phase, TimerSnapshot};
use crate::topmost;
use crate::window_size::{set_logical_size, size_matches};

const OVERLAY_HOVER_POLL: Duration = Duration::from_millis(80);
/// The taskbar can be raised without a foreground change, so the watcher also
/// compares z-order on a slower timer and re-raises when it covers the overlay.
const OVERLAY_ZORDER_CHECK: Duration = Duration::from_millis(400);
/// Re-checks the saved position against the current monitor layout so a
/// resolution or monitor change cannot strand the overlay off-screen.
const OVERLAY_CLAMP_INTERVAL: Duration = Duration::from_secs(2);
/// Keeps the hover watcher from turning the overlay click-through in the middle
/// of a native drag. The frontend clears it on pointer-up; the deadline is only
/// a safety net for the pointer-up the window manager may swallow.
const OVERLAY_DRAG_GUARD: Duration = Duration::from_secs(3);
pub const PROJECT_URL: &str = "https://github.com/siderkit/siderkit-break";

static OVERLAY_DRAG_UNTIL: OnceLock<Mutex<Option<Instant>>> = OnceLock::new();

fn overlay_drag_until() -> &'static Mutex<Option<Instant>> {
    OVERLAY_DRAG_UNTIL.get_or_init(|| Mutex::new(None))
}

pub fn show_main_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
    }
}

pub fn hide_break_card(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("break") {
        let _ = window.hide();
    }
}

/// Fits the break card window to the height the card actually needs, so long
/// translations and wrapped action rows are never clipped.
pub fn resize_break_card(app: &AppHandle, height: f64) -> Result<(), String> {
    let window = app
        .get_webview_window("break")
        .ok_or_else(|| "the break window is missing".to_owned())?;
    let scale = window.scale_factor().map_err(|error| error.to_string())?;
    let size = window.outer_size().map_err(|error| error.to_string())?;
    let width = size.width as f64 / scale;
    let height = clamp_break_height(height);
    if size_matches(&window, width, height) {
        return Ok(());
    }
    set_logical_size(&window, width, height)
}

/// Sizes the countdown window to the measured label so the droplet keeps a
/// small fixed gap instead of floating in a fixed-width box.
pub fn resize_overlay(app: &AppHandle, width: f64) -> Result<(), String> {
    if !width.is_finite() {
        return Err("invalid overlay width".to_owned());
    }
    let snapshot = engine_host::get_state(app)?;
    if snapshot.phase == Phase::Idle {
        return Ok(());
    }
    let window = app
        .get_webview_window("overlay")
        .ok_or_else(|| "the overlay window is missing".to_owned())?;
    let width = width.clamp(OVERLAY_ACTIVE_MIN_WIDTH, OVERLAY_ACTIVE_MAX_WIDTH);
    if size_matches(&window, width, OVERLAY_ACTIVE_HEIGHT) {
        return Ok(());
    }
    set_logical_size(&window, width, OVERLAY_ACTIVE_HEIGHT)
}

fn clamp_break_height(height: f64) -> f64 {
    const MIN: f64 = 96.0;
    const MAX: f64 = 480.0;
    height.clamp(MIN, MAX).ceil()
}

pub fn apply_startup_view(app: &AppHandle) {
    fit_main_window(app);
    // The locate hint stays hidden at startup; its click-through flag is set
    // when it is shown, because the native window does not exist before that.
    let minimized = std::env::args().any(|argument| argument == "--minimized");
    if minimized {
        if let Some(window) = app.get_webview_window("main") {
            let _ = window.hide();
        }
    }
    if let Ok(settings) = engine_host::get_settings(app) {
        if let Err(error) = apply_settings(app, &settings) {
            warn!("failed to apply settings: {error}");
        }
    }
    if let Ok(snapshot) = engine_host::get_state(app) {
        sync_windows(app, &snapshot, false);
    }
    if let Ok(settings) = engine_host::get_settings(app) {
        position_overlay(app, &settings);
    }
}

/// Window-state restores the last physical size, which can be smaller than the
/// configured minimum on another display scale. Restore the readable minimum
/// and keep the frame inside the work area so controls are not clipped.
fn fit_main_window(app: &AppHandle) {
    let Some(window) = app.get_webview_window("main") else {
        return;
    };
    let Some(config) = app
        .config()
        .app
        .windows
        .iter()
        .find(|window| window.label == "main")
    else {
        return;
    };
    let (Ok(inner), Ok(outer), Ok(scale), Ok(position)) = (
        window.inner_size(),
        window.outer_size(),
        window.scale_factor(),
        window.outer_position(),
    ) else {
        return;
    };
    let Some(monitor) = window
        .current_monitor()
        .ok()
        .flatten()
        .or_else(|| window.primary_monitor().ok().flatten())
    else {
        return;
    };
    let frame_width = outer.width.saturating_sub(inner.width);
    let frame_height = outer.height.saturating_sub(inner.height);
    let work_area = monitor.work_area();
    let max_width = work_area.size.width.saturating_sub(frame_width) as f64 / scale;
    let max_height = work_area.size.height.saturating_sub(frame_height) as f64 / scale;
    let min_width = config.min_width.unwrap_or(0.0);
    let min_height = config.min_height.unwrap_or(0.0);

    let width = (inner.width as f64 / scale).max(min_width).min(max_width);
    let height = (inner.height as f64 / scale)
        .max(min_height)
        .min(max_height);
    let target_outer_width = (width * scale).round() as u32 + frame_width;
    let target_outer_height = (height * scale).round() as u32 + frame_height;

    if target_outer_width != outer.width || target_outer_height != outer.height {
        if let Err(error) = window.set_size(LogicalSize::new(width, height)) {
            warn!("failed to restore the main window size: {error}");
        }
    }

    let max_x = work_area.position.x + work_area.size.width as i32 - target_outer_width as i32;
    let max_y = work_area.position.y + work_area.size.height as i32 - target_outer_height as i32;
    let x = position.x.min(max_x).max(work_area.position.x);
    let y = position.y.min(max_y).max(work_area.position.y);
    if x != position.x || y != position.y {
        let _ = window.set_position(PhysicalPosition::new(x, y));
    }
}

pub fn apply_settings(app: &AppHandle, settings: &Settings) -> Result<(), String> {
    let window = app
        .get_webview_window("overlay")
        .ok_or_else(|| "the overlay window is missing".to_owned())?;
    window
        .set_always_on_top(true)
        .map_err(|error| error.to_string())?;
    window
        .set_skip_taskbar(true)
        .map_err(|error| error.to_string())?;
    if settings.overlay.enabled {
        window.show().map_err(|error| error.to_string())?;
    } else {
        window.hide().map_err(|error| error.to_string())?;
    }
    Ok(())
}

/// Keeps the overlay click-through except while the pointer is over it. The
/// droplet and the countdown can then be dragged at any time without a separate
/// move mode, and clicks pass through everywhere else.
pub fn spawn_overlay_hover_watch(app: AppHandle) {
    let _ = std::thread::Builder::new()
        .name("siderkit-break-overlay-hover".to_owned())
        .spawn(move || overlay_hover_loop(&app));
}

/// Starts a native window drag. The hover watcher must not flip the window back
/// to click-through while the window manager owns the gesture, so this keeps a
/// short-lived guard until the frontend reports pointer-up.
pub fn begin_overlay_drag(app: &AppHandle) -> Result<(), String> {
    let window = app
        .get_webview_window("overlay")
        .ok_or_else(|| "the overlay window is missing".to_owned())?;
    *overlay_drag_until()
        .lock()
        .unwrap_or_else(|poison| poison.into_inner()) = Some(Instant::now() + OVERLAY_DRAG_GUARD);
    window
        .set_ignore_cursor_events(false)
        .map_err(|error| error.to_string())?;
    window
        .set_focusable(true)
        .map_err(|error| error.to_string())?;
    topmost::raise_overlay(&window);
    if let Err(error) = window.start_dragging() {
        clear_overlay_drag();
        return Err(error.to_string());
    }
    Ok(())
}

pub fn end_overlay_drag(app: &AppHandle) {
    clear_overlay_drag();
    if let Some(window) = app.get_webview_window("overlay") {
        topmost::raise_overlay(&window);
    }
    save_overlay_position(app);
}

fn clear_overlay_drag() {
    *overlay_drag_until()
        .lock()
        .unwrap_or_else(|poison| poison.into_inner()) = None;
}

fn overlay_drag_active() -> bool {
    let mut until = overlay_drag_until()
        .lock()
        .unwrap_or_else(|poison| poison.into_inner());
    match *until {
        Some(deadline) if Instant::now() < deadline => true,
        Some(_) => {
            *until = None;
            false
        }
        None => false,
    }
}

fn overlay_hover_loop(app: &AppHandle) {
    let mut interactive = false;
    let mut was_dragging = false;
    let mut clamped_at = Instant::now();
    let mut zorder_at = Instant::now();
    let mut last_foreground = topmost::foreground_id();
    loop {
        std::thread::sleep(OVERLAY_HOVER_POLL);
        let Some(window) = app.get_webview_window("overlay") else {
            continue;
        };
        if !window.is_visible().unwrap_or(false) {
            continue;
        }
        // The taskbar can move above a topmost overlay when it is activated.
        // Re-raise on foreground changes so a droplet resting on the taskbar
        // stays visible without polling SetWindowPos every 80 ms.
        let foreground = topmost::foreground_id();
        if foreground != last_foreground {
            last_foreground = foreground;
            topmost::raise_overlay(&window);
        }
        if zorder_at.elapsed() >= OVERLAY_ZORDER_CHECK {
            zorder_at = Instant::now();
            if topmost::taskbar_above(&window) {
                topmost::raise_overlay(&window);
            }
        }
        if overlay_drag_active() {
            // `begin_overlay_drag` already made the window interactive.
            interactive = true;
            was_dragging = true;
            continue;
        }
        if was_dragging {
            was_dragging = false;
            // The window manager may swallow pointer-up, so persist here too.
            save_overlay_position(app);
        }
        if clamped_at.elapsed() >= OVERLAY_CLAMP_INTERVAL {
            clamped_at = Instant::now();
            let saved = engine_host::get_settings(app)
                .ok()
                .and_then(|settings| settings.overlay.position);
            clamp_overlay_visible(&window, saved);
        }
        let desired = overlay_under_cursor(app, &window);
        if desired == interactive {
            continue;
        }
        interactive = desired;
        if let Err(error) = window.set_ignore_cursor_events(!desired) {
            warn!("failed to update overlay click-through: {error}");
        }
        if let Err(error) = window.set_focusable(desired) {
            warn!("failed to update overlay focusability: {error}");
        }
    }
}

fn overlay_under_cursor(app: &AppHandle, window: &WebviewWindow) -> bool {
    // Without a cursor position the overlay stays draggable, which degrades
    // better on platforms that reject global pointer queries.
    let Ok(cursor) = app.cursor_position() else {
        return true;
    };
    let (Ok(position), Ok(size)) = (window.outer_position(), window.outer_size()) else {
        return true;
    };
    point_in_rect(
        cursor.x,
        cursor.y,
        (
            position.x,
            position.y,
            size.width as i32,
            size.height as i32,
        ),
    )
}

fn point_in_rect(x: f64, y: f64, bounds: (i32, i32, i32, i32)) -> bool {
    let (left, top, width, height) = bounds;
    let right = f64::from(left + width);
    let bottom = f64::from(top + height);
    x >= f64::from(left) && x < right && y >= f64::from(top) && y < bottom
}

/// Opens the public project page in the user's default browser.
pub fn open_project_page() -> Result<(), String> {
    let mut command = if cfg!(target_os = "windows") {
        let mut command = std::process::Command::new("cmd");
        command.args(["/C", "start", "", PROJECT_URL]);
        command
    } else if cfg!(target_os = "macos") {
        let mut command = std::process::Command::new("open");
        command.arg(PROJECT_URL);
        command
    } else {
        let mut command = std::process::Command::new("xdg-open");
        command.arg(PROJECT_URL);
        command
    };
    command
        .spawn()
        .map(|_| ())
        .map_err(|error| error.to_string())
}

pub fn sync_windows(app: &AppHandle, snapshot: &TimerSnapshot, missed_deadline: bool) {
    let notice = engine_host::countdown_notice(app);
    if !missed_deadline && (snapshot.phase.is_break() || notice.is_some()) {
        show_break_card(app);
    } else {
        hide_break_card(app);
    }
    if missed_deadline {
        show_main_window(app);
    }
    if let Ok(settings) = engine_host::get_settings(app) {
        if let Some(window) = app.get_webview_window("overlay") {
            let result = if settings.overlay.enabled {
                window.show()
            } else {
                window.hide()
            };
            if let Err(error) = result {
                warn!("failed to update overlay visibility: {error}");
            }
            if settings.overlay.enabled {
                topmost::raise_overlay(&window);
            }
        }
        if settings.overlay.enabled {
            sync_overlay_size(app, snapshot);
        }
    }
}

/// The overlay has two shapes: a tiny droplet while idle and a compact
/// countdown label while a phase is running. Hover handling decides whether the
/// pointer can grab the current shape.
fn sync_overlay_size(app: &AppHandle, snapshot: &TimerSnapshot) {
    let Some(window) = app.get_webview_window("overlay") else {
        return;
    };
    let idle = snapshot.phase == Phase::Idle;
    let scale = window.scale_factor().unwrap_or(1.0);
    let before = window.outer_size().ok();
    let origin = window.outer_position().ok();
    let before_logical = before.map(|size| (size.width as f64 / scale, size.height as f64 / scale));
    // Once the webview has measured the label, keep that width; the fallback
    // only covers the first frame after leaving the idle shape.
    let width = if idle {
        OVERLAY_IDLE_SIZE
    } else {
        match before_logical {
            Some((width, _)) if width > OVERLAY_IDLE_SIZE + 0.5 => width,
            _ => OVERLAY_ACTIVE_WIDTH,
        }
    };
    let height = if idle {
        OVERLAY_IDLE_SIZE
    } else {
        OVERLAY_ACTIVE_HEIGHT
    };
    let needs_resize = before_logical.map_or(true, |(current, current_height)| {
        (current - width).abs() > 0.5 || (current_height - height).abs() > 0.5
    });
    if needs_resize {
        if let Err(error) = set_logical_size(&window, width, height) {
            warn!("failed to resize overlay: {error}");
        }
    }
    // Keep the droplet itself still while the window changes between the tiny
    // idle shape and the countdown; an active resize only moves the right edge.
    if let (Some(origin), Ok(after)) = (origin, window.outer_size()) {
        let before_idle = before_logical.is_some_and(|(width, height)| {
            (width - OVERLAY_IDLE_SIZE).abs() < 0.5 && (height - OVERLAY_IDLE_SIZE).abs() < 0.5
        });
        if before_idle != idle {
            let (x, y) = droplet_anchored_position((origin.x, origin.y), before_idle, idle, scale);
            let (x, y) = clamped_overlay_position(&window, (x, y), (after.width, after.height))
                .unwrap_or((x, y));
            if let Err(error) = window.set_position(PhysicalPosition::new(x, y)) {
                warn!("failed to anchor overlay after resize: {error}");
            }
        }
    }
}

fn show_break_card(app: &AppHandle) {
    let Some(window) = app.get_webview_window("break") else {
        return;
    };
    position_break_card(&window);
    let _ = window.show();
    let _ = window.set_focus();
}

fn position_break_card(window: &WebviewWindow) {
    let Ok(Some(monitor)) = window.current_monitor() else {
        return;
    };
    let work_area = monitor.work_area();
    let Ok(size) = window.outer_size() else {
        return;
    };
    let x = work_area.position.x + (work_area.size.width as i32 - size.width as i32) / 2;
    let y = work_area.position.y + 48;
    let _ = window.set_position(PhysicalPosition::new(x, y));
}

#[cfg(test)]
#[path = "shell_tests.rs"]
mod tests;
