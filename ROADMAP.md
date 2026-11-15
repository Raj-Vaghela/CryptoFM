# Crypto FM development roadmap

Crypto FM is a 2025 hackathon-originated cryptocurrency audio-news experiment. It combines public market feeds, generated commentary, text-to-speech output, and a browser-based radio player. The current repo is a prototype and has **not** been independently verified as production-ready.

The items below are **candidate future work**, not completed work or a commitment from the owner to spend any number of hours. The owner must decide whether the project is genuinely still active and worth at least 20 hours of independent development before submitting it to an external programme.

## Proposed next engineering work (30-45 hours, conditional)

| Workstream | Next implementation | Acceptance criteria | Rough effort |
| --- | --- | --- | --- |
| Reliable startup | Improve the multi-process orchestrator and shutdown behavior | Health checks, graceful stop and repeatable local start | 5-7 h |
| Feed resilience | Normalize timestamps, throttling and error handling for public market/news APIs | Fixtures for outages, stale inputs, rate limits and malformed responses | 5-8 h |
| Verifiable commentary | Attribute each market claim to its source and timestamp | Visible source metadata and tests preventing unsupported price claims | 5-8 h |
| Speech pipeline | Recover from TTS errors and stale playback queues | Simulated provider failure, timeouts and queue deduplication | 5-8 h |
| Browser UX | Improve accessible audio controls, live status and mobile layout | Manual keyboard/screen-reader checks and responsive tests | 4-7 h |
| Quality | Introduce real automated tests and CI | Unit coverage for feed normalization and no-key smoke tests | 6-7 h |

## Submission and publication constraints

- This codebase is **already public**. Readme/package claim MIT, but the root LICENSE file is missing at the time of this roadmap.
- Confirm you have rights to license the hackathon work and any contributions, brand assets, screenshots and generated radio scripts.
- Verify all historical commits for leaked provider tokens or private data. This has **not** been certified by this document.
- Use public market/news content only according to source redistribution and attribution rules. Avoid committing user-specific financial records and live account credentials.
- Building a market commentary application is different from training, benchmarking, or evaluating AI models; keep the development scope distinct.
- Recheck whether you genuinely intend this work. A newly written roadmap alone does not make an old project actively maintained.
