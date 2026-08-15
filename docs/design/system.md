# Design system

Checkpoint 5A applies Bookkin's bounded Bright Snap language to already approved workflows. It does not authorize recommendations, camera scanning, library integration, or later destinations.

## Foundations

- **Flash:** a confident accessible yellow establishes identity and primary emphasis without covering every surface.
- **Ink:** near-black copy carries hierarchy and maintains contrast.
- **Paper:** white and quiet luminous neutrals keep repeat-use surfaces calm and legible.
- **Supporting accents:** a small controlled set adds warmth and differentiation without becoming a rainbow interface.
- **Focus:** a high-contrast focus treatment remains distinct from selection and action states.
- **Type:** polished, characterful display typography may support key moments; readable sans-serif typography supports controls, metadata, and explanations.
- **Motif:** focus, lens, crop, flash, and capture shapes provide restrained visual personality.

Exact token names and values are a Checkpoint 5A owner decision after interactive review. The previous warm porcelain and plum exploration remains a historical artifact, not the current implementation target.

## Energy model

Use higher energy for:

- Opening the quick-action control.
- ISBN capture.
- Successful save confirmation.
- Recommendation reveal.

Use lower energy for:

- Shelf and history browsing.
- Repeated bedtime logging.
- Profile and interest editing.
- Errors, uncertainty, and recovery.
- Long reading or comparison tasks.

## Reusable patterns

- Responsive application shell and clear destination hierarchy.
- Elegant circular quick action that expands to `Log a read` and `Add a book`.
- Focused desktop modal and mobile bottom sheet.
- Searchable recent-book and shelf picker.
- Prominent cover treatment with robust loading, missing-cover, and error states.
- Status chips that represent one truthful shelf fact.
- Compact deterministic explanation pattern for future recommendation work.

## Interaction and accessibility

- No event, reaction, book, or shelf status is preselected.
- Every primary workflow has one obvious action.
- Keyboard focus is high contrast, visible, and returned logically after overlays close.
- Controls preserve native semantics and labels.
- Primary and reaction controls prefer 48 x 48 CSS-pixel targets and never fall below 44 x 44.
- Motion is short and functional and is removed when reduced motion is requested.
- No pulsing, orbiting, confetti, audio, vibration, or flashing.
- Product copy uses sentence case.
