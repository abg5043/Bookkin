# Design principles

Bookkin should feel fun enough to invite a child and refined enough to earn caregiver trust.

- Use the bounded Bright Snap language: confident yellow, near-black ink, white, and restrained supporting accents.
- Concentrate energy in capture, action, confirmation, and recommendation-reveal moments.
- Use calmer surfaces for shelf browsing, history, profile editing, quick logging, modals, and bedtime repetition.
- Use sentence-case consumer copy except for short intentional display labels.
- Give book covers and editorial hierarchy room to breathe while supporting search, filters, and density-aware responsive behavior for large collections. A separate compact or list mode remains a future hypothesis.
- Keep one obvious primary action per focused surface.
- Keep Log a read and Add a book reachable without scrolling on phone through one elegant thumb-reachable action that fans out to explicit labels.
- Open Add and Log in focused modals or mobile sheets; preserve safe-area clearance, conventional dismissal, focus trapping, and focus return.
- Let book cards open detail and history directly; avoid repetitive text actions when persistent quick capture is faster.
- Make Back origin-aware. A book opened from Shelf returns to the same Shelf search, filter, scroll position, and triggering card; a book opened from household History returns to the same History position and row. Label the single control `Back to Shelf` or `Back to History`. Browser Back follows the same stack. Use the persistent History navigation for household History rather than adding a redundant action.
- Keep child-facing play contained to appropriate moments and avoid babyish decoration.
- Avoid dashboards, gamified streaks, guilt, scarcity, fake availability, and generic purple-gradient AI styling.

Essential text uses high-contrast ink on solid surfaces. Decorative colors do not carry low-contrast text or color-only meaning. Review metadata, pills, placeholders, modal controls, errors, and action labels explicitly.

Growing shelves are searchable by title or author and filterable by current shelf status. Common logging starts from recent books or shelf search without forcing a detail-page visit.

Every user-facing checkpoint reviews loading, empty, success, error, permission, limited-evidence, limited-pool, no-result, external-handoff, and relevant offline-warning states.

## Interactive design-review standard

Every design gate provides an interactive, marked-up HTML prototype before application implementation begins. The review must:

- Switch among relevant states and representative phone, tablet, and desktop compositions.
- Include selectable annotations for hierarchy, copy, responsive behavior, tradeoffs, and open decisions.
- Keep comments and labels in a separate review panel; do not put unexplained numbers inside the product interface.
- Use polished end-user copy inside the product frame. Keep prototype labels, sample-data notices, implementation explanations, and reviewer narration in the separate review panel.
- Present Original Bright Snap and Refined Brighter against the same content and interactions until the owner chooses a final system; default to Refined Brighter and do not regress to beige or brown.
- Use realistic non-sensitive fixtures and never expose actual child, household, reading, or credential data.
- Make primary interactions usable with native keyboard-accessible controls.
- Distinguish proposed design from implemented behavior.
- Check WCAG 2.2 AA contrast, visible focus, logical focus return, 44-pixel minimum touch targets, reduced motion, 320-pixel reflow, and 400-percent zoom.

After implementation, update or recreate the interactive review from the working workflow and realistic states. Re-present it after requested refinements. Static screenshots may supplement but do not replace the interactive artifact unless the human owner approves another format.

Owner corrections are recorded in the canonical SDD or this design-principles file during the same review cycle. Chat history alone is never the decision record.
