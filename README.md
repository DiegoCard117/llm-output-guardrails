# llm-output-guardrails

[Português brasileiro](README.pt-BR.md)

A small TypeScript / ESM example inspired by a production app. It suggests day trips from a closed list of server-owned places. Cloudbank is a fictional city with invented coordinates. No LLM, external service, credentials, or database is used: `cleanPlan` receives an already parsed response as `unknown`.

Models make confident mistakes: invented IDs, dates, and times can look convincing. A JSON schema constrains structure, but does not prove that the contents match the server's data or the day's constraints. `RESPONSE_SCHEMA` describes the requested response; this example independently checks the response at runtime without a schema library.

The model chooses; the server is the source of truth. Each accepted stop references the original `Place` object from the server list. Extra fields supplied by the model, including names, addresses, and coordinates, are ignored. `toRecords` takes those fields from the server object.

## Data sent to the model

`buildModelInput` serializes an explicit selection of fields:

- Requested dates, pace (`relaxed`, `balanced`, or `busy`), and interests from `nature`, `history`, `art`, `food`. Other interests are discarded.
- Places as `{ id, name, kind, lat, lng }`, with coordinates rounded to three decimal places.
- Bookings for the requested dates as `{ time, lat, lng }`, also rounded, preserving `null` coordinates.

Do not send addresses, personal names, contact details, notes, or free user text. Free text can also carry prompt injection instructions. Extra input properties are never spread into the serialized data. Place names are trusted server catalog data; keep that catalog curated. Rounding reduces location precision, but does not anonymize locations.

`SYSTEM_RULES` asks the model to follow the constraints. These instructions are guidance; server checks enforce the rules. Valid HH:MM times may be proposed because this example has no closed list of time slots.

## Validation rules

All tests are in [test/guardrails.test.ts](test/guardrails.test.ts); test names start with the corresponding rule number.

| Rule | Why | Covering test |
| --- | --- | --- |
| 1. Malformed root becomes an empty plan; skip malformed days and stops | Preserve valid entries without crashing the flow | `1: handles malformed input…` |
| 2. Only requested dates | The model cannot expand the date range | `2: removes dates…` |
| 3. Only known place IDs | Invented places have no authoritative data | `3: removes invented place IDs…` |
| 4. Each place once across the plan | Prevent repeated suggestions | `4: keeps the first eligible occurrence…` |
| 5. Valid HH:MM, 00:00–23:59 | Strings can describe impossible times | `5: accepts only zero-padded HH:MM…` |
| 6. Remove occupied times on that date | Existing bookings take precedence | `6: removes occupied times…` |
| 7. Remove stops too far from the day's medoid | Limit geographic outliers | `7: uses the daily medoid…` |
| 8. Reason limited to 200 characters, plain text | Bound display text and avoid interpreting HTML | `8: limits reasons…` |
| 9. Sort dates and times; omit empty days | Produce a predictable suggestion | `9: sorts dates and times…` |
| Records use server fields | Model names and addresses must not reach storage | `toRecords takes names…` |
| Prompt contains only selected fields | Minimize disclosure and exclude free text | `buildModelInput sends only allowlisted fields…` |

A response that is not an object with a `days` array becomes an empty plan. Malformed days and stops are skipped; valid entries then pass through content checks. Duplicate place IDs keep their first eligible occurrence in response order; distance filtering runs afterward and does not retry later duplicates. Entries for the same date are combined before distance filtering.

The day's medoid is the existing point with the smallest sum of haversine distances to every other point. Points include accepted suggestions and bookings with both coordinates. Ties keep the first point, with suggestions preceding bookings. With fewer than three points, distance filtering is skipped. Otherwise, suggestions more than `maxKm` away (default 3 km) are removed; bookings are never changed. Full server coordinates are used for validation.

Reasons remain literal strings: this library does not render or sanitize HTML. A UI must use `textContent` or normal framework text interpolation, never `innerHTML` or an equivalent raw HTML feature. The literal-markup test verifies the text contract; a consuming UI needs its own rendering checks.

## Human confirmation before saving

The intended flow is: server catalog → minimal model input → untrusted response → `cleanPlan` → suggestion displayed as text → human confirmation → `toRecords` → database write. Nothing in this repository saves anything. `toRecords` only creates records; call it for persistence after confirmation. In a real system, recheck current server data and bookings at save time because they may have changed since the preview.

## Run locally

After installing the declared development dependencies in your own environment:

```sh
npm test
npm run typecheck
npm run demo
# Or:
npx tsx examples/demo.ts
```

The demo prints a malicious/incorrect response and the cleaned suggestion. It includes an invented place, wrong date, `25:00`, occupied time, duplicate, a place about 40 km away, and fake name/address fields. Only the nearby garden and museum remain, ordered by time, with server-owned details.

## Limits

This is a teaching example. Haversine measures straight-line distance, not travel time or route availability. It does not check opening hours, visit duration, overlapping intervals, time zones, accessibility, or duplicate times among new suggestions. Booked times conflict by exact string equality only. The medoid is a simple quadratic-time heuristic, and sparse days may keep distant stops. The server is assumed to supply valid dates, coordinates, a nonnegative finite `maxKm`, and unique place IDs. The code accepts objects, not raw JSON strings; JSON parsing belongs at the input boundary. It is not a complete booking system.

MIT © 2026 DiegoCard117.
