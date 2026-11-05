# PRD — Appartamento Matteo (clone of github.com/ori740tttttt/Okokg)

## Problem statement
Clone exactly the repo Okokg (tourist guide + admin for vacation rental "Appartamento Matteo", Trappeto, Sicily), make it run here; then: interactive Sicily map with all POIs (admin + public Itinerario); then "add all missing features" found in code analysis.

## Architecture
- Backend: FastAPI + MongoDB (motor), Emergent LLM key (Carmelo / marketing / GB), Emergent Object Storage (POI images, itinerary PDFs) via backend/object_storage.py.
- Frontend: Expo Router (React Native + web). Guest tabs: Home, Luoghi, Itinerario (map), Info. Admin dashboard modules.
- Auth: JWT admin (Matteo / D5230). Unlock code MATTEO26 (ai_access).

## Implemented
- 2026-11 Clone running (114 POIs seeded, galleries, prices, bookings). MATTEO26 created; FAQ drafts seeded (58 questions, no answers, unpublished).
- 2026-11 Interactive Leaflet/OSM Sicily map (web) + react-native-maps (native) in guest Itinerario and admin Mappa Interattiva (tap pin → edit).
- 2026-11 Missing features:
  - Carmelo endpoints admin-only; Carmelo screen at /admin/carmelo (chat w/ history + model choice, full itinerary text/schema + patch + PDF, adapt external file).
  - Visit tracking (/track/visit) → stats.
  - POI photo upload to object storage (/admin/uploads, /files/{path}); itinerary PDFs in object storage.
  - Guest ↔ host question threads (Info "Le mie domande", admin "Rispondi").
  - Add-to-itinerary on place detail; guest i18n for Itinerario/Info.
  - Admin "Itinerari pronti" library (CRUD + PDF) shown to guests as "Itinerari consigliati".
  - Photos: public/private galleries, reorder, promote/demote.
  - Costi & tariffe: base fees (/fees) + custom extra fees (in quote).
  - Booking live discount validation; purge expired codes.
  - Google Business: checklist guide, sitemap link, description/review-request/Q&A generators.
  - Marketing: video scripts, editorial calendar (+AI 30-day plan), strategy (background job), coach chat/audit/structured GBP post (multi-model), AI image + attach real photos to library items.
  - Fixes: quote 500 with ai_access codes, duplicate ItineraryIn model, upload/file error handling, 750-char GB description limit, delete confirmations, markdown in AI answers.

- 2026-11 (this fork) Clone re-created from github.com/accetta562-dev/Ol; MATTEO26 + 58 FAQ drafts recreated.
- 2026-11 Feste & Sagre rewrite (frontend/src/lib/festivals.ts): 157 recurring rules (patrons of all 82 PA + 25 TP comuni, sagre, riti, 16 national/regional holidays), Easter/Pentecost computed, calendar dots for prev/current/next 2 years, filters on /festivals, popup "Usa questa data" uses tapped day.
- 2026-11 Ticket prices verified (Nov 2026): backend/poi_tickets.py fills empty price/hours/discount/ticket_url/notes on 33 POIs at startup; Carmelo knowledge base prices updated.

## Backlog
- P1: move public/private gallery photos from base64-in-Mongo to object storage; delete endpoint for orphan uploads.
- P1: Matteo must write answers to the 58 seeded FAQ drafts and publish them.
- P2: rate limit public guest replies; split server.py into routers; native Android Google Maps key for store builds.
- P2: real Google Business publishing (needs Google OAuth) — today texts are copy/paste.
