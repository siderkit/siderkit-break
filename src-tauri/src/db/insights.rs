//! Tag storage and Insights aggregation for the local session store.

use super::*;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InsightsTotals {
    pub focus_ms: u64,
    pub rounds: u32,
    pub streak_days: u32,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InsightsDay {
    pub date: String,
    pub focus_ms: u64,
    pub rounds: u32,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InsightsTag {
    pub tag: String,
    pub focus_ms: u64,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InsightsPayload {
    pub range: String,
    pub totals: InsightsTotals,
    /// Days in the selected range, oldest first.
    pub days: Vec<InsightsDay>,
    /// The fixed 371-day grid behind the heatmap, oldest first.
    pub heatmap: Vec<InsightsDay>,
    /// Completed focus time per tag, largest first, at most eight entries.
    pub tags: Vec<InsightsTag>,
}

impl Store {
    pub fn set_session_tag(&self, id: &str, tag: Option<&str>) -> Result<bool, StoreError> {
        let normalized = tag.and_then(normalize_tag);
        let changed = self.connection.execute(
            "UPDATE sessions SET tag = ?1, updated_at = ?2, rev = rev + 1
             WHERE id = ?3 AND deleted_at IS NULL",
            params![normalized, now_ms(), id],
        )?;
        Ok(changed > 0)
    }

    /// Recent distinct tags, newest first, compared case-insensitively.
    pub fn recent_tags(&self, limit: usize) -> Result<Vec<String>, StoreError> {
        let mut statement = self.connection.prepare(
            "SELECT tag FROM sessions
             WHERE deleted_at IS NULL AND tag IS NOT NULL
             ORDER BY started_at DESC LIMIT 200",
        )?;
        let rows = statement.query_map([], |row| row.get::<_, String>(0))?;
        let mut seen = std::collections::HashSet::new();
        let mut tags = Vec::new();
        for row in rows {
            let tag = row?;
            if seen.insert(tag.to_lowercase()) {
                tags.push(tag);
                if tags.len() >= limit {
                    break;
                }
            }
        }
        Ok(tags)
    }

    /// Aggregates one Insights range plus the fixed 371-day heatmap.
    pub fn insights(&self, range: &str) -> Result<InsightsPayload, StoreError> {
        let range = InsightsRange::parse(range);
        let now = now_ms();
        let range_start = self.local_range_start_ms(range)?;
        let range_start_date: String = self.connection.query_row(
            "SELECT date(?1 / 1000, 'unixepoch', 'localtime')",
            params![range_start],
            |row| row.get(0),
        )?;
        let heat_start: i64 = self.connection.query_row(
            "SELECT strftime('%s', date('now', 'localtime', '-370 days'), 'utc') * 1000",
            [],
            |row| row.get(0),
        )?;
        let today_key: String =
            self.connection
                .query_row("SELECT date('now', 'localtime')", [], |row| row.get(0))?;
        let yesterday_key: String =
            self.connection
                .query_row("SELECT date('now', 'localtime', '-1 day')", [], |row| {
                    row.get(0)
                })?;
        let focus_by_day = self.daily_focus(heat_start, now + 1)?;
        let heatmap_dates = self.heatmap_dates()?;
        let heatmap: Vec<InsightsDay> = heatmap_dates
            .iter()
            .map(|date| day_payload(date, focus_by_day.get(date)))
            .collect();
        let days: Vec<InsightsDay> = heatmap
            .iter()
            .filter(|day| day.date >= range_start_date)
            .cloned()
            .collect();
        let focus_ms = days.iter().map(|day| day.focus_ms).sum();
        let rounds = days.iter().map(|day| day.rounds).sum();
        let tags = self.insight_tags(range_start, now)?;
        Ok(InsightsPayload {
            range: range.as_str().to_owned(),
            totals: InsightsTotals {
                focus_ms,
                rounds,
                streak_days: streak_days(&heatmap_dates, &focus_by_day, &today_key, &yesterday_key),
            },
            days,
            heatmap,
            tags,
        })
    }

    /// Permanently removes every session, including its tag.
    pub fn clear_history(&self) -> Result<u32, StoreError> {
        let removed = self.connection.execute("DELETE FROM sessions", [])?;
        Ok(removed as u32)
    }

    fn local_range_start_ms(&self, range: InsightsRange) -> Result<i64, StoreError> {
        let sql = match range {
            InsightsRange::Today => {
                "SELECT strftime('%s', 'now', 'localtime', 'start of day', 'utc') * 1000"
            }
            InsightsRange::Week => {
                "SELECT strftime('%s', date('now', 'localtime', '-6 days', 'weekday 1'), 'utc') * 1000"
            }
            InsightsRange::Month => {
                "SELECT strftime('%s', 'now', 'localtime', 'start of month', 'utc') * 1000"
            }
            InsightsRange::Year => {
                "SELECT strftime('%s', 'now', 'localtime', 'start of year', 'utc') * 1000"
            }
        };
        Ok(self.connection.query_row(sql, [], |row| row.get(0))?)
    }

    fn daily_focus(
        &self,
        from_ms: i64,
        to_ms: i64,
    ) -> Result<HashMap<String, (u64, u32)>, StoreError> {
        let mut statement = self.connection.prepare(
            "SELECT date(started_at / 1000, 'unixepoch', 'localtime') AS day,
                    COALESCE(SUM(actual_ms), 0), COUNT(*)
             FROM sessions
             WHERE deleted_at IS NULL AND kind = 'Focus' AND outcome = 'Completed'
               AND started_at >= ?1 AND started_at < ?2
             GROUP BY day",
        )?;
        let rows = statement.query_map(params![from_ms, to_ms], |row| {
            Ok((
                row.get::<_, String>(0)?,
                (row.get::<_, i64>(1)? as u64, row.get::<_, i64>(2)? as u32),
            ))
        })?;
        let mut map = HashMap::new();
        for row in rows {
            let (date, value) = row?;
            map.insert(date, value);
        }
        Ok(map)
    }

    fn heatmap_dates(&self) -> Result<Vec<String>, StoreError> {
        let mut statement = self.connection.prepare(
            "WITH RECURSIVE seq(n) AS (
                SELECT 0 UNION ALL SELECT n + 1 FROM seq WHERE n < 370
             )
             SELECT date('now', 'localtime', '-' || n || ' days') FROM seq ORDER BY 1",
        )?;
        let rows = statement.query_map([], |row| row.get::<_, String>(0))?;
        Ok(rows.collect::<Result<Vec<_>, _>>()?)
    }

    fn insight_tags(&self, from_ms: i64, to_ms: i64) -> Result<Vec<InsightsTag>, StoreError> {
        let mut statement = self.connection.prepare(
            "SELECT tag, SUM(actual_ms) AS total
             FROM sessions
             WHERE deleted_at IS NULL AND kind = 'Focus' AND outcome = 'Completed'
               AND tag IS NOT NULL AND tag <> ''
               AND started_at >= ?1 AND started_at < ?2
             GROUP BY tag ORDER BY total DESC LIMIT 8",
        )?;
        let rows = statement.query_map(params![from_ms, to_ms], |row| {
            Ok(InsightsTag {
                tag: row.get(0)?,
                focus_ms: row.get::<_, i64>(1)? as u64,
            })
        })?;
        Ok(rows.collect::<Result<Vec<_>, _>>()?)
    }
}

#[derive(Clone, Copy)]
enum InsightsRange {
    Today,
    Week,
    Month,
    Year,
}

impl InsightsRange {
    fn parse(value: &str) -> Self {
        match value {
            "today" => Self::Today,
            "month" => Self::Month,
            "year" => Self::Year,
            _ => Self::Week,
        }
    }

    fn as_str(self) -> &'static str {
        match self {
            Self::Today => "today",
            Self::Week => "week",
            Self::Month => "month",
            Self::Year => "year",
        }
    }
}

/// Trims and collapses whitespace. Storage keeps the full length; the
/// 40-scalar cap lives in the tag input on the frontend.
pub fn normalize_tag(value: &str) -> Option<String> {
    let collapsed = value.split_whitespace().collect::<Vec<_>>().join(" ");
    (!collapsed.is_empty()).then_some(collapsed)
}

fn day_payload(date: &str, value: Option<&(u64, u32)>) -> InsightsDay {
    let (focus_ms, rounds) = value.copied().unwrap_or((0, 0));
    InsightsDay {
        date: date.to_owned(),
        focus_ms,
        rounds,
    }
}

fn streak_days(
    dates: &[String],
    focus: &HashMap<String, (u64, u32)>,
    today: &str,
    yesterday: &str,
) -> u32 {
    let has_focus = |date: &str| focus.get(date).is_some_and(|(ms, _)| *ms >= 60_000);
    let start = if has_focus(today) {
        0
    } else if has_focus(yesterday) {
        1
    } else {
        return 0;
    };
    let mut streak = 0;
    for date in dates.iter().rev().skip(start) {
        if !has_focus(date) {
            break;
        }
        streak += 1;
    }
    streak
}
