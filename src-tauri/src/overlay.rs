use log::{info, warn};
use tauri::{AppHandle, Manager, PhysicalPosition, WebviewWindow};

use crate::engine_host;
use crate::settings::{OverlayPosition, Settings};

const OVERLAY_MARGIN: i32 = 24;
pub(crate) const OVERLAY_IDLE_SIZE: f64 = 22.0;
/// Fallback width until the webview reports the measured label width.
pub(crate) const OVERLAY_ACTIVE_WIDTH: f64 = 128.0;
pub(crate) const OVERLAY_ACTIVE_MIN_WIDTH: f64 = 48.0;
pub(crate) const OVERLAY_ACTIVE_MAX_WIDTH: f64 = 240.0;
pub(crate) const OVERLAY_ACTIVE_HEIGHT: f64 = 32.0;
/// `--sk-space-3xs` and `--sk-overlay-drop-size` from `tokens.css`. The
/// countdown pins the droplet to this inset so its center matches the idle
/// window and the clock can grow to the right without moving it.
const OVERLAY_DROP_INSET: f64 = 2.0;
const OVERLAY_DROP_SIZE: f64 = 18.0;

pub(crate) fn save_overlay_position(app: &AppHandle) {
    let Some(window) = app.get_webview_window("overlay") else {
        return;
    };
    let (Ok(position), Ok(size)) = (window.outer_position(), window.outer_size()) else {
        return;
    };
    let Some(bounds) =
        monitor_bounds_for(&window, (position.x, position.y), (size.width, size.height))
    else {
        return;
    };
    let (ratio_x, ratio_y) =
        overlay_permille(bounds, (position.x, position.y), (size.width, size.height));
    let saved = OverlayPosition {
        x: position.x,
        y: position.y,
        ratio_x: Some(ratio_x),
        ratio_y: Some(ratio_y),
        screen_width: Some(bounds.2),
        screen_height: Some(bounds.3),
    };
    if let Err(error) = engine_host::remember_overlay_position(app, saved) {
        warn!("failed to persist overlay position: {error}");
    }
}

pub(crate) fn position_overlay(app: &AppHandle, settings: &Settings) {
    let Some(window) = app.get_webview_window("overlay") else {
        return;
    };
    // Positions saved before ratios existed still work, but they cannot follow
    // a resolution change. Backfill the ratios once so every later launch can.
    let needs_ratios = settings.overlay.position.is_some_and(|saved| {
        saved.ratio_x.is_none()
            || saved.ratio_y.is_none()
            || saved.screen_width.is_none()
            || saved.screen_height.is_none()
    });
    position_overlay_from_settings(&window, settings);
    if needs_ratios {
        save_overlay_position(app);
    }
}

fn position_overlay_from_settings(window: &WebviewWindow, settings: &Settings) {
    let Ok(size) = window.outer_size() else {
        return;
    };
    let target = match settings.overlay.position {
        Some(saved) => {
            let absolute = (saved.x, saved.y);
            match monitor_bounds_for(window, absolute, (size.width, size.height)) {
                Some(bounds) => {
                    let changed = saved.screen_width != Some(bounds.2)
                        || saved.screen_height != Some(bounds.3);
                    match (changed, saved.ratio_x, saved.ratio_y) {
                        (true, Some(ratio_x), Some(ratio_y)) => position_from_permille(
                            bounds,
                            (size.width, size.height),
                            ratio_x,
                            ratio_y,
                        ),
                        _ => absolute,
                    }
                }
                None => absolute,
            }
        }
        None => {
            let monitor = match window.current_monitor() {
                Ok(Some(monitor)) => monitor,
                _ => match window.primary_monitor() {
                    Ok(Some(monitor)) => monitor,
                    _ => return,
                },
            };
            let work_area = monitor.work_area();
            bottom_left_position(
                (
                    work_area.position.x,
                    work_area.position.y,
                    work_area.size.width as i32,
                    work_area.size.height as i32,
                ),
                (size.width as i32, size.height as i32),
                OVERLAY_MARGIN,
            )
        }
    };
    let (x, y) =
        clamped_overlay_position(window, target, (size.width, size.height)).unwrap_or(target);
    if let Err(error) = window.set_position(PhysicalPosition::new(x, y)) {
        info!("overlay position is controlled by the platform: {error}");
    }
}

/// Returns the saved position clamped into the full monitor bounds, so the
/// overlay may sit on the taskbar while never leaving the display. The ratios
/// make a resolution change keep the same relative placement.
pub(crate) fn clamped_overlay_position(
    window: &WebviewWindow,
    position: (i32, i32),
    size: (u32, u32),
) -> Option<(i32, i32)> {
    let bounds = monitor_bounds_for(window, position, size)?;
    Some(clamp_position_to_bounds(bounds, position, size))
}

fn monitor_bounds_for(
    window: &WebviewWindow,
    position: (i32, i32),
    size: (u32, u32),
) -> Option<(i32, i32, u32, u32)> {
    let monitors = window.available_monitors().ok()?;
    let window_bounds = (position.0, position.1, size.0, size.1);
    let mut best: Option<(u64, (i32, i32, u32, u32))> = None;
    for monitor in monitors {
        let bounds = (
            monitor.position().x,
            monitor.position().y,
            monitor.size().width,
            monitor.size().height,
        );
        let overlap = overlap_area(window_bounds, bounds);
        if overlap == 0 {
            continue;
        }
        let better = match best {
            Some((best_overlap, _)) => overlap > best_overlap,
            None => true,
        };
        if better {
            best = Some((overlap, bounds));
        }
    }
    match best {
        Some((_, bounds)) => Some(bounds),
        None => {
            let monitor = window.primary_monitor().ok().flatten()?;
            Some((
                monitor.position().x,
                monitor.position().y,
                monitor.size().width,
                monitor.size().height,
            ))
        }
    }
}

/// The overlay center as permille of the monitor, used to survive a resolution
/// change without remembering a stale pixel coordinate.
fn overlay_permille(
    bounds: (i32, i32, u32, u32),
    position: (i32, i32),
    size: (u32, u32),
) -> (u16, u16) {
    let center_x = i64::from(position.0) + i64::from(size.0) / 2;
    let center_y = i64::from(position.1) + i64::from(size.1) / 2;
    (
        permille_of(center_x - i64::from(bounds.0), i64::from(bounds.2)),
        permille_of(center_y - i64::from(bounds.1), i64::from(bounds.3)),
    )
}

fn permille_of(offset: i64, extent: i64) -> u16 {
    if extent <= 0 {
        return 0;
    }
    let scaled = (offset.clamp(0, extent) * 1000 + extent / 2) / extent;
    scaled.clamp(0, 1000) as u16
}

fn position_from_permille(
    bounds: (i32, i32, u32, u32),
    size: (u32, u32),
    ratio_x: u16,
    ratio_y: u16,
) -> (i32, i32) {
    let center_x =
        i64::from(bounds.0) + (i64::from(ratio_x.min(1000)) * i64::from(bounds.2) + 500) / 1000;
    let center_y =
        i64::from(bounds.1) + (i64::from(ratio_y.min(1000)) * i64::from(bounds.3) + 500) / 1000;
    (
        (center_x - i64::from(size.0) / 2) as i32,
        (center_y - i64::from(size.1) / 2) as i32,
    )
}

pub(crate) fn clamp_overlay_visible(window: &WebviewWindow, saved: Option<OverlayPosition>) {
    let (Ok(position), Ok(size)) = (window.outer_position(), window.outer_size()) else {
        return;
    };
    let current = (position.x, position.y);
    let Some(bounds) = monitor_bounds_for(window, current, (size.width, size.height)) else {
        return;
    };
    let mut target = current;
    if let Some(saved) = saved {
        let changed = saved.screen_width != Some(bounds.2) || saved.screen_height != Some(bounds.3);
        if changed {
            if let (Some(ratio_x), Some(ratio_y)) = (saved.ratio_x, saved.ratio_y) {
                target =
                    position_from_permille(bounds, (size.width, size.height), ratio_x, ratio_y);
            }
        }
    }
    let clamped = clamp_position_to_bounds(bounds, target, (size.width, size.height));
    if (clamped.0 - current.0).abs() > 2 || (clamped.1 - current.1).abs() > 2 {
        if let Err(error) = window.set_position(PhysicalPosition::new(clamped.0, clamped.1)) {
            warn!("failed to keep the overlay on screen: {error}");
        }
    }
}

fn clamp_position_to_bounds(
    bounds: (i32, i32, u32, u32),
    position: (i32, i32),
    window: (u32, u32),
) -> (i32, i32) {
    let (left, top, width, height) = bounds;
    let max_x = (left + width as i32 - window.0 as i32).max(left);
    let max_y = (top + height as i32 - window.1 as i32).max(top);
    (position.0.clamp(left, max_x), position.1.clamp(top, max_y))
}

fn overlap_area(a: (i32, i32, u32, u32), b: (i32, i32, u32, u32)) -> u64 {
    let left = a.0.max(b.0);
    let top = a.1.max(b.1);
    let right = (a.0 + a.2 as i32).min(b.0 + b.2 as i32);
    let bottom = (a.1 + a.3 as i32).min(b.1 + b.3 as i32);
    if right <= left || bottom <= top {
        0
    } else {
        (right - left) as u64 * (bottom - top) as u64
    }
}

/// Places the overlay in the bottom-left corner of the work area, above the
/// taskbar, so it stays out of the way without covering the middle of the screen.
fn bottom_left_position(
    work_area: (i32, i32, i32, i32),
    window: (i32, i32),
    margin: i32,
) -> (i32, i32) {
    let (work_x, work_y, _work_width, work_height) = work_area;
    let (_window_width, window_height) = window;
    (
        work_x + margin,
        work_y + work_height - window_height - margin,
    )
}

/// The droplet center inside each overlay shape, in logical pixels. The idle
/// window wraps it with equal space; the countdown centers it vertically but
/// places it after the inline padding.
fn droplet_center(idle: bool) -> (f64, f64) {
    if idle {
        (OVERLAY_IDLE_SIZE / 2.0, OVERLAY_IDLE_SIZE / 2.0)
    } else {
        (
            OVERLAY_DROP_INSET + OVERLAY_DROP_SIZE / 2.0,
            OVERLAY_ACTIVE_HEIGHT / 2.0,
        )
    }
}

/// The droplet center in physical screen coordinates for the current shape.
pub(crate) fn droplet_screen_center(
    origin: (i32, i32),
    size: (u32, u32),
    idle: bool,
    scale: f64,
) -> (i32, i32) {
    if idle {
        return (origin.0 + size.0 as i32 / 2, origin.1 + size.1 as i32 / 2);
    }
    let (x, y) = droplet_center(false);
    (
        origin.0 + (x * scale).round() as i32,
        origin.1 + (y * scale).round() as i32,
    )
}

/// Moves the top-left so the droplet center stays on the same screen point
/// while the overlay window changes shape.
pub(crate) fn droplet_anchored_position(
    origin: (i32, i32),
    before_idle: bool,
    after_idle: bool,
    scale: f64,
) -> (i32, i32) {
    let (before_x, before_y) = droplet_center(before_idle);
    let (after_x, after_y) = droplet_center(after_idle);
    (
        origin.0 + ((before_x - after_x) * scale).round() as i32,
        origin.1 + ((before_y - after_y) * scale).round() as i32,
    )
}

#[cfg(test)]
#[path = "overlay_tests.rs"]
mod tests;
