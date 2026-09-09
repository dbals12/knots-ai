-- GA4 BigQuery export에서 첫 방문 사용자 대비 핵심 행동 도달률을 계산합니다.
-- 실제 프로젝트와 분석 기간에 맞게 PROJECT.DATASET과 날짜를 바꿔 실행합니다.

DECLARE start_suffix STRING DEFAULT 'YYYYMMDD';
DECLARE end_suffix STRING DEFAULT 'YYYYMMDD';

WITH event_first_seen AS (
  SELECT
    user_pseudo_id,
    event_name,
    MIN(event_timestamp) AS first_event_at
  FROM `PROJECT.DATASET.events_*`
  WHERE _TABLE_SUFFIX BETWEEN start_suffix AND end_suffix
    AND event_name IN (
      'first_visit',
      'submit_input',
      'view_result',
      'save_content',
      'click_copy'
    )
  GROUP BY user_pseudo_id, event_name
),
cohort AS (
  SELECT
    user_pseudo_id,
    first_event_at AS first_visit_at
  FROM event_first_seen
  WHERE event_name = 'first_visit'
),
goal_reach AS (
  SELECT
    event_name,
    COUNT(DISTINCT e.user_pseudo_id) AS reached_users
  FROM event_first_seen AS e
  JOIN cohort AS c USING (user_pseudo_id)
  WHERE e.first_event_at >= c.first_visit_at
  GROUP BY event_name
),
cohort_size AS (
  SELECT COUNT(*) AS first_visit_users
  FROM cohort
)
SELECT
  event_name,
  reached_users,
  first_visit_users,
  ROUND(
    SAFE_DIVIDE(reached_users, first_visit_users) * 100,
    2
  ) AS first_visit_conversion_pct
FROM goal_reach
CROSS JOIN cohort_size
ORDER BY CASE event_name
  WHEN 'first_visit' THEN 1
  WHEN 'submit_input' THEN 2
  WHEN 'view_result' THEN 3
  WHEN 'save_content' THEN 4
  WHEN 'click_copy' THEN 5
END;
