use tauri::{LogicalSize, WebviewWindow};

/// Applies a logical window size. Windows and macOS resize programmatically
/// even when the window is non-resizable. GTK instead forces a non-resizable
/// window back to the webview's natural size, so Linux keeps the window
/// resizable and pins it with min/max size hints: the window manager still
/// blocks user drags, while programmatic resizes apply.
pub(crate) fn set_logical_size(
    window: &WebviewWindow,
    width: f64,
    height: f64,
) -> Result<(), String> {
    #[cfg(target_os = "linux")]
    {
        set_linux_logical_size(window, width.ceil(), height.ceil())
    }
    #[cfg(not(target_os = "linux"))]
    {
        window
            .set_size(LogicalSize::new(width, height))
            .map_err(|error| error.to_string())
    }
}

/// True when the window already has the requested logical size. Re-requesting
/// an unchanged size only re-runs the GTK resize cycle, which triggers another
/// measurement and can bounce the window back to its default size.
pub(crate) fn size_matches(window: &WebviewWindow, width: f64, height: f64) -> bool {
    let (Ok(scale), Ok(size)) = (window.scale_factor(), window.outer_size()) else {
        return false;
    };
    (size.width as f64 - width * scale).abs() <= 2.0
        && (size.height as f64 - height * scale).abs() <= 2.0
}

#[cfg(target_os = "linux")]
fn set_linux_logical_size(window: &WebviewWindow, width: f64, height: f64) -> Result<(), String> {
    let _ = window.set_resizable(true);
    // Relax the hints to cover both the current and the target size first, so
    // no intermediate request is rejected for being outside the bounds.
    let (allow_min, allow_max) = match (window.scale_factor(), window.outer_size()) {
        (Ok(scale), Ok(size)) => {
            let current = (size.width as f64 / scale, size.height as f64 / scale);
            (
                (current.0.min(width), current.1.min(height)),
                (current.0.max(width), current.1.max(height)),
            )
        }
        _ => ((width, height), (width, height)),
    };
    set_size_bounds(window, allow_max, allow_min)?;
    window
        .set_size(LogicalSize::new(width, height))
        .map_err(|error| error.to_string())?;
    // Pin the window to the target. min == max also removes user resize grips.
    set_size_bounds(window, (width, height), (width, height))
}

#[cfg(target_os = "linux")]
fn set_size_bounds(window: &WebviewWindow, max: (f64, f64), min: (f64, f64)) -> Result<(), String> {
    let max = Some(tauri::Size::Logical(LogicalSize::new(max.0, max.1)));
    let min = Some(tauri::Size::Logical(LogicalSize::new(min.0, min.1)));
    window
        .set_max_size(max)
        .map_err(|error| error.to_string())?;
    window.set_min_size(min).map_err(|error| error.to_string())
}
