use tauri::WebviewWindow;

/// Windows keeps the taskbar in the topmost band. When the taskbar is
/// activated it can move above other topmost windows, which hides an overlay
/// resting on it. Re-asserting `HWND_TOPMOST` raises the overlay above the
/// taskbar without activating it or stealing focus.
#[cfg(target_os = "windows")]
pub fn raise_overlay(window: &WebviewWindow) {
    use windows_sys::Win32::UI::WindowsAndMessaging::{
        SetWindowPos, HWND_TOPMOST, SWP_NOACTIVATE, SWP_NOMOVE, SWP_NOSIZE,
    };

    let Ok(hwnd) = window.hwnd() else {
        return;
    };
    unsafe {
        SetWindowPos(
            hwnd.0 as _,
            HWND_TOPMOST,
            0,
            0,
            0,
            0,
            SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE,
        );
    }
}

/// A cheap way to notice that another window, including the taskbar, was
/// activated. The overlay watcher polls this instead of re-raising every tick.
#[cfg(target_os = "windows")]
pub fn foreground_id() -> isize {
    use windows_sys::Win32::UI::WindowsAndMessaging::GetForegroundWindow;

    unsafe { GetForegroundWindow() as isize }
}

/// True while a taskbar window sits above the overlay in the top-level
/// z-order. Clicking the taskbar can raise it without changing the foreground
/// window, so watching activation alone misses repeated raises.
#[cfg(target_os = "windows")]
pub fn taskbar_above(window: &WebviewWindow) -> bool {
    use windows_sys::Win32::UI::WindowsAndMessaging::{GetWindow, GW_HWNDPREV};

    let Ok(hwnd) = window.hwnd() else {
        return false;
    };
    let mut current = unsafe { GetWindow(hwnd.0 as _, GW_HWNDPREV) };
    while !current.is_null() {
        if is_taskbar_class(current) {
            return true;
        }
        current = unsafe { GetWindow(current, GW_HWNDPREV) };
    }
    false
}

/// `Shell_TrayWnd` is the primary taskbar; secondary monitors use
/// `Shell_SecondaryTrayWnd`.
#[cfg(target_os = "windows")]
fn is_taskbar_class(hwnd: windows_sys::Win32::Foundation::HWND) -> bool {
    use windows_sys::Win32::UI::WindowsAndMessaging::GetClassNameW;

    let mut buffer = [0u16; 32];
    let length = unsafe { GetClassNameW(hwnd, buffer.as_mut_ptr(), buffer.len() as i32) };
    if length <= 0 {
        return false;
    }
    let name = String::from_utf16_lossy(&buffer[..length as usize]);
    name == "Shell_TrayWnd" || name == "Shell_SecondaryTrayWnd"
}

#[cfg(not(target_os = "windows"))]
pub fn raise_overlay(_window: &WebviewWindow) {}

#[cfg(not(target_os = "windows"))]
pub fn foreground_id() -> isize {
    0
}

#[cfg(not(target_os = "windows"))]
pub fn taskbar_above(_window: &WebviewWindow) -> bool {
    false
}
