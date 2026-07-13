-- -----------------------------------------------------------------------------
-- 0009_care_occurrence.sql
-- Recurring and open-ended-care promises stay active across many acts of
-- faithfulness. Until now, every one of those acts was logged as the same
-- 'completed' event used for a promise's true, final completion — collapsing
-- "I prayed for Sarah on Monday" and "this promise is finished" into one
-- label. This adds a distinct event type for the former.
-- -----------------------------------------------------------------------------

alter type promise_event_type add value if not exists 'care_occurrence';
