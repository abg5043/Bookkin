# Accessibility approach

Bookkin uses semantic HTML and should remain usable by keyboard, screen reader, and touch users.

Each user-facing checkpoint should review:

- Heading hierarchy and landmark structure.
- Visible keyboard focus and logical focus order.
- Focus trapping and logical focus return for modals, sheets, and the quick-action menu.
- Labels and instructions for forms and controls.
- Status announcements and error messages that explain what was and was not saved and how to recover.
- Color contrast independent of color alone.
- WCAG 2.2 AA contrast, 44 x 44 CSS-pixel minimum touch targets, 320-pixel reflow, and 400-percent zoom.
- Reduced-motion behavior when motion is introduced.
- No preselected reading event, reaction, book, or status.
- Offline warning before entering private-data mutation workflows.
- Left- and right-handed phone reach, safe-area insets, and virtual-keyboard overlap for persistent actions and sheets.
- At least one representative mobile screen-reader pass and one Windows desktop NVDA browser pass at user-facing checkpoint gates.

Automated checks support review but do not replace manual keyboard and screen-reader checks.
