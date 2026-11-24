//! External links opened from the app's menus and settings.

pub const PROJECT_URL: &str = "https://github.com/siderkit/siderkit-break";
pub const PRIVACY_URL: &str = "https://github.com/siderkit/siderkit-break/blob/main/PRIVACY.md";

/// Opens the public project page in the user's default browser.
pub fn open_project_page() -> Result<(), String> {
    open_url(PROJECT_URL)
}

/// Opens the privacy policy in the user's default browser.
pub fn open_privacy_page() -> Result<(), String> {
    open_url(PRIVACY_URL)
}

fn open_url(url: &str) -> Result<(), String> {
    let mut command = if cfg!(target_os = "windows") {
        let mut command = std::process::Command::new("cmd");
        command.args(["/C", "start", "", url]);
        command
    } else if cfg!(target_os = "macos") {
        let mut command = std::process::Command::new("open");
        command.arg(url);
        command
    } else {
        let mut command = std::process::Command::new("xdg-open");
        command.arg(url);
        command
    };
    command
        .spawn()
        .map(|_| ())
        .map_err(|error| error.to_string())
}
