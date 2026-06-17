# adult-fs-competition-guide
a reference tool for adult competitive figure skaters who want to understand competition categories, program requirements, age classes, music times based on Skate Canada &amp; ISU

The first release focuses on Skate Canada and ISU adult competition requirements, with a free skate program planner that helps skaters preview a planned layout and catch common rule issues before talking with a coach or registering for an event.
# Why This Project Exists
Adult skaters often enter competition from very different paths. Some tested through STARSkate or another national test system, some learned as adults, and some competed years ago and need a refresher. The confusing part is that testing structure and competition structure are related, but not the same.
For a first-time adult competitor, the practical questions are usually simple:
Which level should I enter?
What age class am I in?
How long should my music be?
Is this event solo, partnered, or team-based?
What elements are required or allowed?
How is this different from the test system I already know?
If I plan my free skate elements, will anything obvious be invalid?
The official rules answer these questions, but they are written as long technical documents. This tool keeps the official category structure intact while making the information easier to scan, compare, and use.

# Product Goals
Preserve the official structure instead of merging adult levels into a simplified path.
Make each competition category feel like its own event, not a step in a test ladder.
Separate Canada and ISU rules so skaters do not accidentally mix systems.
Show the current season at the top, because adult competition requirements change.
Support both quick refreshers and first-time competitors.
Keep rule language traceable to official sources while presenting it in smaller, readable sections.
Add a free skate planning tool that turns rules into something skaters can test against their own planned program.

# Current Features
Canada and ISU rule-set switcher.
Discipline tabs for Free Skating, Ice Dance, Pairs, Artistic, Showcase, and ISU Synchro where applicable.
Season label for the rule set currently displayed.
Overview cards for high-level competition rules.
Age requirement section with event-entry guidance and boxed age-class reference.
Category cards with music time, program summary, and required or allowed element groups.
Free skate "Plan your program" modal for Canada and ISU.
Planned program component sheet styled after a protocol sheet.
Element builder for jumps, spins, and sequences.
Estimated base value calculation.
Rule warnings for common planning problems, such as invalid jumps, missing required elements, too many elements, repeat issues, and category-specific limits.
Source links and disclaimer in the footer.

# Design Decisions
The interface is intentionally reference-first. There is no level quiz or heavy filtering because adult competition categories should not be collapsed into one generalized track. A skater needs to see the real structure and learn how the categories are named.
The planner is also designed as a learning tool, not a judging simulator. It estimates base value and highlights rule issues, but it does not predict edge calls, under-rotations, GOE, program components, or panel decisions.
The visual system uses compact cards, tabs, protocol-style tables, and concise rule groups so the page feels closer to a practical skating notebook than a marketing site.
# Technical Notes
Built as a static HTML, CSS, and JavaScript app.
No backend is required for the current version.
Planner rule data is stored in versioned JSON files by region and season.
The planner uses a rule engine pattern: selected region and category determine allowed elements, counts, base values, and validation messages.
The UI is responsive and designed for skaters checking rules on desktop, tablet, or mobile.

# Rule Data and Tests
Planner data lives in data/rules:
manifest.json chooses the active rule files.
canada-2026-2027.json stores Skate Canada adult free skate planner rules.
isu-2025-2026.json stores ISU adult free skate planner rules.
base-values-2025-2026.json stores estimated base values used by the planner.
The app loads these files on GitHub Pages. If someone opens index.html directly from their computer and the browser blocks local JSON loading, the page keeps an inline fallback so the demo still works.
Automated planner tests live in tests/planner-engine.test.js. They check:
base value totals
invalid jumps
repeated jumps
combo limits
spin level caps
flying spin restrictions
sequence requirements
Run the tests with:
node tests/planner-engine.test.js

# Limitations
This is an independent study aid, not an official Skate Canada, ISU, or federation product.
Skaters should always confirm against the current official rule document and competition announcement.
Base value is an estimate only.
Local competition announcements may add event-specific details.
ISU adult events can vary by competition location or announcement, so regional context matters.
The US adult competition system is intentionally hidden for now because local competitions and qualifying structures are less standardized and need a separate content model.
