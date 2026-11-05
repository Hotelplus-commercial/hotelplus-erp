# AE Workspace · Meeting channel + Survey v2 — plan (rule 8)

Decision A: browser storage plus a one-way Cloud mirror. No database migration, table, enum or RLS.

## Where data lives today
- Meetings and surveys: fixed sample lists in code (`ps-v4.tsx`: `v4CalendarCards`, `surveyUpcoming`, `surveyPending`, `surveySubmitted`; `orm-meeting.tsx`: `mmMeetings`, `mmSurveys`). They are not stored anywhere. Submit only shows a confirmation message.
- Survey question settings: `meridia.ps.templates.v1` through `useTemplateMgmt()` (`email-templates.tsx`).
- Database: only read-only PS Dashboard views (`v_meeting_*`). Untouched.

## Real names
- Meeting record: `Meeting` / `MeetingCardV4`. Status: `MeetingStatus` / `CardStatus`. Tier: `tier` (there is no `tier_at_generation`).
- Booking form: the draft dialog in `ps.ae-workspace.meetings.tsx`. Survey form: `SurveyForm` in `ps.ae-workspace.surveys.tsx`.
- Survey questions: `v4SurveyQuestions` Q1–Q9. Overall score = Q7. Referral = Q8 (hidden by §6). Free comment = Q9 (`SURVEY_OPEN_KEY`).
- `customer_response_status`: `subStatus` ("Waiting Customer" / "Confirmed" / "Flagged"). No-score surveys use `null`, meaning no email was sent.
- Survey email: a toast only; no real sender exists. "ส่งทางอีเมล" uses the same toast and records an audit entry.
- Public page pattern: `/l/$token` and `/l/renew/$requestId`.

## New storage (versioned keys, one-way Cloud mirror)
| Key | Cloud doc |
|---|---|
| `meridia.meetings.v1` | `ps:meetings` |
| `meridia.surveys.v1` | `ps:surveys` |
| `meridia.survey_label_answers.v1` | `ps:survey_label_answers` |
- The setting `survey_active_template_version` (default 1) is added to the existing `meridia.ps.templates.v1` state.
- These keys store only additions and overrides (channel, no-score, link, set-2 answers) on top of the sample lists, which stay unchanged.
- Push uses the existing Cloud Sync engine (debounced, with a revision guard).

## Files
- New `src/lib/meeting-survey-types.ts`: §1 types (`channel`, `no_score_reason`, `respondent`, `template_version`, `link_token`, `link_expires_at`, `SurveyLabelAnswer`). All fields are optional and NULL keeps the old meaning.
- New `src/lib/meeting-survey-store.ts`: `getMeetings()`, `getSurveys()`, `getSurveyLabelAnswers()` and the hooks `useMeetings()`, `useSurveys()`, `useSurveyLabelAnswers()`, plus write helpers (`setChannel`, `saveNoScore`, `createSurveyLink`, `answerByLink`, `expireLinks`, `saveV2Answers`). Normal mode returns stored records plus sample lists; DEMO mode returns DEMO entries from memory, reacts to the switch immediately and never writes.
- New `src/lib/survey-v2.ts`: pure topic table (§5.2), chip shuffle, channel options and defaults, and the link-expiry rule.
- New `src/lib/meeting-survey-demo.ts`: §7 DEMO entries dated 28 ต.ค. 2569.
- New `src/components/ps/survey-v2-form.tsx`: the set-2 label form, shared by the AE form and the public page.
- New `src/routes/l.survey.$token.tsx`: public customer page (token only, local browser data, no database write).
- Edit `ps.ae-workspace.meetings.tsx`: ช่องทาง field and hint, and read through the helpers.
- Edit `ps.ae-workspace.surveys.tsx`: the ลูกค้าไม่ให้คะแนน button, the link action, tags and pills, Q8 hidden, v2 form when `template_version = 2`, and read through the helpers.
- Edit `ps.ae-workspace.calendar.tsx`: read through the helpers only (it currently reads `v4CalendarCards` directly).
- Edit `ps.templates.index.tsx` (survey settings section): the ชุดคำถาม Survey ที่ใช้งาน setting.
- Edit `email-templates.tsx`: add the setting field (default 1).
- Edit `cloud-sync-keys.ts` and the Cloud push list: add the 3 doc keys.
- Edit `src/components/ps/AGENTS.md`: storage rule, portal note, DEMO-only real link delivery.
- Edit the forbidden-string test, and add `tests/survey-v2.test.tsx` (§8 items 1–9 plus the DEMO link path).

## Pages switched to the helpers
AE Workspace › Meetings, Surveys and Calendar. PS Dashboard Meeting analyzer reads Cloud views and is not touched (rule 6). Files 13–15 must use the helpers.

## Reported, not changed
- "AE ยังไม่ส่ง" appears only on PS Dashboard, so it is left as it is. "รอทำ Survey" is used in AE Workspace.
- Customer link: real delivery to another device needs the portal. It works in DEMO and in the same browser. Expiry runs when a page opens (no server job).
- `label_key` stores the label text until Contract Health adds catalog keys.
- Completion flow: if the existing flow forces a survey for non-Online meetings, this is reported and the lifecycle is not changed.

## After building
Test count against the 496/490 baseline, the preservation check, UAT steps from the main menu in a fresh preview with PASS/FAIL per step, and no publish request.
