use super::*;

#[test]
fn the_default_overlay_position_sits_in_the_bottom_left_corner() {
    assert_eq!(
        bottom_left_position((0, 0, 1920, 1080), (128, 32), 24),
        (24, 1024)
    );
    assert_eq!(
        bottom_left_position((-1920, 0, 1920, 1040), (128, 32), 24),
        (-1896, 984)
    );
}

#[test]
fn showing_the_clock_keeps_the_droplet_center_in_place() {
    let idle_origin = (24, 1471);
    let grown = droplet_anchored_position(idle_origin, true, false, 1.0);
    assert_eq!(grown, (24, 1466));
    let idle_center = (
        f64::from(idle_origin.0) + droplet_center(true).0,
        f64::from(idle_origin.1) + droplet_center(true).1,
    );
    let grown_center = (
        f64::from(grown.0) + droplet_center(false).0,
        f64::from(grown.1) + droplet_center(false).1,
    );
    assert_eq!(grown_center, idle_center);
    assert_eq!(
        droplet_anchored_position(grown, false, true, 1.0),
        idle_origin
    );
}

#[test]
fn a_fractional_scale_keeps_the_droplet_within_a_pixel() {
    let idle_origin = (24, 1471);
    let grown = droplet_anchored_position(idle_origin, true, false, 1.5);
    let idle_center = (
        f64::from(idle_origin.0) + droplet_center(true).0 * 1.5,
        f64::from(idle_origin.1) + droplet_center(true).1 * 1.5,
    );
    let grown_center = (
        f64::from(grown.0) + droplet_center(false).0 * 1.5,
        f64::from(grown.1) + droplet_center(false).1 * 1.5,
    );
    assert!((grown_center.0 - idle_center.0).abs() < 1.0);
    assert!((grown_center.1 - idle_center.1).abs() < 1.0);
}

#[test]
fn a_saved_overlay_position_is_kept_inside_the_monitor_bounds() {
    let work = (0, 0, 1920, 1040);
    assert_eq!(
        clamp_position_to_bounds(work, (1800, 1200), (128, 32)),
        (1792, 1008)
    );
    assert_eq!(
        clamp_position_to_bounds(work, (-40, -20), (128, 32)),
        (0, 0)
    );
    assert_eq!(
        clamp_position_to_bounds((-1920, 0, 1920, 1040), (-100, 1200), (128, 32)),
        (-128, 1008)
    );
}

#[test]
fn a_window_larger_than_the_monitor_pins_to_its_origin() {
    assert_eq!(
        clamp_position_to_bounds((0, 0, 100, 80), (40, 30), (200, 120)),
        (0, 0)
    );
}

#[test]
fn the_overlay_may_rest_on_the_taskbar() {
    assert_eq!(
        clamp_position_to_bounds((0, 0, 2560, 1600), (900, 1545), (33, 33)),
        (900, 1545)
    );
    assert_eq!(
        clamp_position_to_bounds((0, 0, 2560, 1600), (900, 1600), (33, 33)),
        (900, 1567)
    );
}

#[test]
fn the_saved_ratio_survives_a_resolution_change() {
    let old = (0, 0, 2560, 1600);
    let position = (2527, 1567);
    let size = (33, 33);
    let (ratio_x, ratio_y) = overlay_permille(old, position, size);
    let restored = position_from_permille((0, 0, 1920, 1080), size, ratio_x, ratio_y);
    let clamped = clamp_position_to_bounds((0, 0, 1920, 1080), restored, size);
    assert_eq!(clamped, (1887, 1047));
}

#[test]
fn the_monitor_with_the_largest_overlap_wins() {
    let left = (-1920, 0, 1920, 1040);
    let right = (0, 0, 1920, 1040);
    assert_eq!(overlap_area((-100, 100, 128, 32), left), 100 * 32);
    assert_eq!(overlap_area((-100, 100, 128, 32), right), 28 * 32);
    assert_eq!(overlap_area((-2200, 100, 128, 32), right), 0);
}
