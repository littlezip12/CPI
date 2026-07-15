# CPI 7.38.2 — JO Division Seed Display

## Purpose

Display each team’s official Junior Olympics division seed without allowing the seed to become part of the canonical team identity.

## Example

A spreadsheet participant value such as `18 - Lamorinda` is represented as:

- Team name: `Lamorinda`
- JO division seed: `18`

The public interface renders a `#18` badge beside Lamorinda. The team selector value, shared URL, search value, pathway resolution, and future rankings input remain `Lamorinda`.

## Updated views

- Full division schedule
- Relevant bracket games
- Selected-team summary
- Next game
- Team journey
- Possible opponents
- Team dropdown labels

## Coverage

The same implementation is applied to:

- Junior Olympics Weekend 2 — Boys
- Junior Olympics Weekend 1 — Girls & Coed

## Live data

The release does not change the live-refresh behavior. Both applications continue loading from their public Google Sheets on page open, every two minutes, and when the browser tab becomes active again.

## Validation completed

- JavaScript syntax checks for both applications
- Static JO release validator
- Controlled bracket fixture in both applications
- Clean team-value check (`Lamorinda`, not `18 - Lamorinda`)
- Seed propagation through resolved winner/loser games
- Desktop rendering check
- Mobile rendering check
