# WPI 7.64.10 — BAWPL Event & TBD Game Readiness

Built from pushed WPI 7.64.9. Adds `league` games / `league_event` series and private planned game slots. A planned slot is deliberately not a `live_games` row, cannot be scored or published, and stores only team/event/date/slot number. When a real opponent is known, `live_save_game_day_v4` converts the slot into the canonical game and links it back to the planned slot; start time may still remain unset. BAWPL can therefore remain one durable season event across multiple weekends. No opponent/time/venue is fabricated.

Migration: `202609160002_bawpl_event_tbd_game_readiness.sql`.
