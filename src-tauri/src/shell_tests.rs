use super::*;

#[test]
fn the_break_card_height_stays_inside_the_usable_range() {
    assert_eq!(clamp_break_height(187.0), 187.0);
    assert_eq!(clamp_break_height(187.4), 188.0);
    assert_eq!(clamp_break_height(40.0), 96.0);
    assert_eq!(clamp_break_height(900.0), 480.0);
}

#[test]
fn the_hover_hit_test_matches_the_overlay_bounds() {
    let bounds = (24, 640, 128, 32);
    assert!(point_in_rect(24.0, 640.0, bounds));
    assert!(point_in_rect(151.9, 671.9, bounds));
    assert!(!point_in_rect(152.0, 650.0, bounds));
    assert!(!point_in_rect(80.0, 672.0, bounds));
    assert!(!point_in_rect(23.9, 650.0, bounds));
}
