# Sleightbook — Software Requirements Specification (SRS)

**Document Version:** 0.1  
**Status:** Draft / Product Requirement  
**Product:** Sleightbook  
**Type:** Personal Magic Knowledge Base & Interactive Routine Visualizer

---

## 1. Product Overview

Sleightbook is a personal knowledge-management application for magicians.

The primary purpose of Sleightbook is not simply to store the names of magic tricks. It helps users **remember, understand, practice, and reconstruct how a routine is performed**.

A magic trick may contain:

- A core effect
- One or more performance routines
- Multiple phases
- Sleights / techniques
- Secret actions
- Props
- Gimmicks
- Presentation notes
- Practice notes
- Variations
- Visual explanations

The central product value is the **Interactive Visualization**.

> **Sleightbook: Don't just remember the trick. See the trick.**

---

# 2. Goals

## 2.1 Primary Goals

Sleightbook should allow users to:

1. Store magic tricks and routines.
2. Organize reusable techniques and gimmicks.
3. Describe a routine as a sequence of meaningful phases/actions.
4. Visually replay how a routine works.
5. Distinguish between the spectator's perspective and the magician's secret method.
6. Practice routines using structured steps and checklists.
7. Search the library by trick, technique, effect, or description.
8. Keep personal notes and tips.
9. Use AI to transform unstructured notes into structured magic knowledge.
10. Generate or explore alternative routine variations.

## 2.2 Secondary Goals

The application should eventually support:

- Semantic search.
- AI-assisted knowledge extraction.
- AI-generated routine variations.
- AI-generated visualization definitions.
- Practice history.
- Favorites.
- Recently practiced tricks.
- A dedicated performance/practice mode.

---

# 3. Non-Goals

The initial version should NOT attempt to:

- Become a social network for magicians.
- Host copyrighted magic books or paid tutorials.
- Automatically generate arbitrary frontend code for visualizations.
- Require complex 3D rendering for every trick.
- Replace the magician's own knowledge or practice.
- Build a large marketplace for magic products.

The initial product should remain focused on **personal knowledge + visualization + practice**.

---

# 4. Target User

## 4.1 Primary User

A magician who:

- Learns many tricks and techniques.
- Sometimes forgets the exact sequence of a routine.
- Wants to remember both the effect and the method.
- Wants to visualize a trick instead of reading a long textual explanation.
- Has multiple versions of the same trick.
- Wants a personal searchable knowledge base.

---

# 5. Technology Stack

## 5.1 Frontend

| Technology | Purpose |
|---|---|
| React | UI framework |
| TypeScript | Type safety |
| Vite | Frontend build tool |
| Tailwind CSS | Styling |
| Motion | UI and visualization animation |
| SVG | 2D magic visualization |
| React Router | Client-side routing |

## 5.2 Backend

| Technology | Purpose |
|---|---|
| Bun | Runtime and package manager |
| Hono | Lightweight HTTP API framework |
| TypeScript | Backend type safety |
| Zod | Request / domain validation |

## 5.3 Database

| Technology | Purpose |
|---|---|
| PostgreSQL | Primary database |
| Drizzle ORM | Database access and schema management |

## 5.4 AI

| Technology | Purpose |
|---|---|
| OpenAI API | AI-assisted knowledge extraction and generation |

AI should produce **structured domain data**, not arbitrary UI code.

## 5.5 Testing

| Technology | Purpose |
|---|---|
| Bun Test | Unit / backend tests |
| Playwright | End-to-end tests |

## 5.6 Code Quality

| Technology | Purpose |
|---|---|
| Biome | Formatting and linting |
| TypeScript | Static type checking |

## 5.7 Suggested Deployment

| Component | Suggested Platform |
|---|---|
| Frontend | Vercel |
| Backend | Bun-compatible hosting |
| Database | Neon PostgreSQL |
| AI | OpenAI API |

---

# 6. Application Structure

Suggested architecture:

```text
sleightbook/
├── apps/
│   ├── web/
│   │   └── src/
│   │       ├── features/
│   │       │   ├── tricks/
│   │       │   ├── routines/
│   │       │   ├── techniques/
│   │       │   ├── gimmicks/
│   │       │   ├── notes/
│   │       │   └── ai/
│   │       │
│   │       ├── visualization/
│   │       ├── components/
│   │       └── routes/
│   │
│   └── api/
│       └── src/
│           ├── routes/
│           ├── services/
│           ├── db/
│           └── ai/
│
├── packages/
│   └── shared/
│       ├── schemas/
│       └── types/
│
├── package.json
├── bun.lock
└── biome.json
```

---

# 7. Core Domain Model

A routine should NOT be represented as a single rigid `steps[]` array attached directly to a trick.

The same trick may have multiple performance versions.

Recommended conceptual model:

```text
Trick
 ├── Routine A
 │    ├── Phase
 │    │    ├── Action
 │    │    └── Visualization
 │    └── Phase
 │
 ├── Routine B
 │    ├── Phase
 │    └── Phase
 │
 └── Routine C
```

## 7.1 Trick

Represents the core magic effect or concept.

Example:

```text
Ambitious Card
```

Possible properties:

```text
id
name
description
category
difficulty
duration
props
favorite
createdAt
updatedAt
```

## 7.2 Routine

Represents one specific performance/version of a trick.

Example:

```text
Ambitious Card — Standard
Ambitious Card — Elmsley Version
Ambitious Card — Gimmick Version
```

A routine may have:

```text
id
trickId
name
description
phases
techniques
gimmicks
notes
```

## 7.3 Phase

A meaningful part of a performance.

Example:

```text
Preparation
Double Lift
Insert
Snap
Reveal
Fan
```

## 7.4 Action

A concrete operation inside a phase.

Examples:

```text
lift
turn
insert
deal
flip
square
fan
snap
move
reveal
```

## 7.5 Technique

A reusable magic technique.

Examples:

```text
Double Lift
Elmsley Count
Top Change
False Shuffle
Pass
Palm
```

Techniques should be reusable across multiple routines.

## 7.6 Gimmick

Represents a physical or prepared component required by a routine.

Examples:

```text
Gimmicked Card
Invisible Thread
Shell Coin
Prepared Deck
```

## 7.7 Props

Physical objects used by the routine.

Examples:

```text
Deck of cards
Coins
Rubber band
Pen
Rope
```

## 7.8 Notes

Personal user knowledge associated with a trick, routine, phase, or technique.

Examples:

```text
Need to slow down the snap moment.

Keep the break small.

Don't flash the double during turnover.
```

---

# 8. Main Application Areas

The application should contain the following primary areas.

## 8.1 Library

The Library is the main landing page.

Users can:

- View all tricks.
- Search tricks.
- Filter tricks.
- Open a trick.
- Favorite a trick.
- See difficulty.
- See category.
- See number of phases.
- See associated techniques.
- See recently practiced tricks.

Initial categories:

```text
All
Card
Coin
Mentalism
Gimmick
```

---

# 9. Trick Detail Page

The Trick Detail page is the primary knowledge page.

It should contain:

```text
Hero
Tabs
Interactive Visualization
Phase Navigation
Step-by-step Breakdown
AI Assistant
Variations
Techniques
Gimmicks & Props
Pro Tips
Personal Notes
```

## 9.1 Hero Section

The hero section displays:

- Trick name.
- Category.
- Description.
- Difficulty.
- Duration.
- Required props.
- Start Visualizer action.
- Edit action.
- Favorite action.

Example:

```text
Ambitious Card

A single card keeps rising to the top of the deck,
no matter how many times it is lost.

Intermediate
5–8 min
Deck of cards
```

---

# 10. Interactive Visualization

Interactive Visualization is the core feature of Sleightbook.

The visualization should show the physical state of the trick and animate transitions between actions.

Example routine:

```text
Preparation
    ↓
Double Lift
    ↓
Insert
    ↓
Snap
    ↓
Fan Reveal
```

## 10.1 Visualization Controls

The user should be able to:

- Play.
- Pause.
- Go to next step.
- Go to previous step.
- Replay.
- Change animation speed.
- Select a specific phase.
- Enable/disable explanations.

Suggested speed range:

```text
0.5×
0.75×
1.0×
1.25×
1.5×
2.0×
```

## 10.2 Visualization State

The visualization engine should maintain state such as:

```text
CardState
DeckState
Position
Rotation
Face
Visibility
SelectedObject
CurrentPhase
CurrentAction
```

Example:

```ts
type CardState = {
  id: string
  position: { x: number; y: number }
  rotation: number
  face: "front" | "back"
  visible: boolean
}
```

## 10.3 Visualization Engine

The frontend visualization renderer should own the rendering.

AI should NOT generate arbitrary HTML/SVG.

Instead AI should produce structured actions such as:

```json
{
  "action": "doubleLift",
  "duration": 800
}
```

The renderer translates that action into an animation.

---

# 11. Spectator vs Secret View

A future visualization mode should distinguish:

### Spectator View

Shows only what the audience should perceive.

### Secret View

Shows the actual method.

Example:

```text
SPECTATOR

Card is inserted into the middle.
        ↓
Snap.
        ↓
Card appears on top.
```

versus:

```text
SECRET

Double lift
    ↓
Second card remains controlled
    ↓
Insert apparent card
    ↓
Secret card remains on top
    ↓
Reveal
```

This distinction is one of the important potential differentiators of Sleightbook.

---

# 12. Phase Navigation

The visualization should provide a visual phase timeline.

Example:

```text
01 Preparation
02 Double Lift
03 Insert
04 Snap
05 Fan Reveal
```

Selecting a phase should:

1. Move the visualization to that state.
2. Highlight the phase.
3. Show the phase explanation.
4. Show related techniques.
5. Show relevant notes.

---

# 13. Step-by-Step Breakdown

Each routine should provide a textual explanation alongside the visualization.

Example:

```text
Double Lift

Lift the top two cards as a single unit while
maintaining a small break.

Technique:
Double Lift

Important:
Keep the movement natural.
```

The breakdown should be synchronized with the visualizer.

---

# 14. Technique Library

The Technique Library stores reusable techniques.

Example:

```text
Double Lift
Elmsley Count
Top Change
Classic Palm
False Shuffle
Pass
```

Each technique may contain:

- Name.
- Description.
- Difficulty.
- Category.
- Tips.
- Common mistakes.
- Practice notes.
- Related routines.
- Visualization.

Users should be able to navigate from:

```text
Routine → Technique
```

and:

```text
Technique → Routines using this technique
```

---

# 15. Gimmicks & Props

Users should be able to store reusable gimmicks and props.

Each item may contain:

- Name.
- Type.
- Description.
- Setup instructions.
- Storage notes.
- Related routines.

Example:

```text
Prepared Deck

Used by:
- Ambitious Card — Gimmick Version
- Rising Card
```

---

# 16. Favorites

Users can mark tricks as favorites.

The Favorites section should show only favorited tricks.

Favorite state should persist to the backend.

---

# 17. Recently Practiced

The application should track when a routine was practiced.

The Recently Practiced section should show:

- Trick.
- Routine.
- Last practiced time.
- Practice count.

Future version:

```text
Practice streak
Practice duration
Difficulty progress
```

---

# 18. Practice Mode

A dedicated Practice Mode is planned.

The purpose is to reduce UI distractions while practicing.

Example:

```text
AMBITION CARD

Phase 03 / 05

INSERT

• Maintain break
• Insert naturally
• Square deck

[Previous] [Next]
```

The user should be able to progress through the routine without opening the full knowledge page.

---

# 19. Personal Notes

Users can attach personal notes to:

- Trick.
- Routine.
- Phase.
- Technique.
- Gimmick.

Notes should support quick editing.

Example:

```text
Need to practice the double lift more slowly.

The snap feels too forced.

Try performing this closer to the spectator.
```

---

# 20. Variations

A trick can have multiple routines or variations.

Example:

```text
Ambitious Card
│
├── Standard
├── Elmsley Version
├── Top Change Version
└── Gimmick Version
```

Users should be able to:

- Create a variation.
- Duplicate an existing routine.
- Modify phases.
- Replace techniques.
- Add/remove gimmicks.
- Compare variations.

---

# 21. AI Assistant

AI is a major planned feature.

The AI should help transform messy magician notes into structured knowledge.

## 21.1 Input

Example user input:

```text
DL kartu, tunjukin card, masukin tengah,
snap, terus ternyata balik atas.
Terakhir fan.
```

## 21.2 AI Interpretation

AI should identify:

```text
Effect:
Ambitious Card

Techniques:
Double Lift

Phases:
1. Preparation
2. Double Lift
3. Insert
4. Snap
5. Fan Reveal
```

## 21.3 Structured Output

The AI should produce structured data validated using Zod.

Conceptually:

```text
User Notes
    ↓
AI Analysis
    ↓
Structured Magic Model
    ↓
Zod Validation
    ↓
User Review
    ↓
Database
```

The user should be able to review AI-generated data before saving it.

---

# 22. AI Search

Future semantic search should allow users to search by description rather than exact name.

Example:

```text
"trick yang kartunya masuk tengah terus balik ke atas"
```

The application may return:

```text
Ambitious Card
```

Another example:

```text
"yang ada elmsley terus terakhir fan"
```

The search should be able to identify routines using:

```text
Elmsley Count
Fan Reveal
```

---

# 23. AI Variation Generator

The user can ask:

```text
Generate a variation using an Elmsley Count.
```

or:

```text
Give me a version without a double lift.
```

or:

```text
Make this routine easier for beginners.
```

The AI should return a structured routine proposal.

The user must be able to review and edit the result before saving.

---

# 24. AI Visualization Generator

A future AI feature may generate visualization instructions.

Example:

```text
AI
↓
Visualization Specification
↓
Zod Validation
↓
Visualization Renderer
```

Example specification:

```json
{
  "phases": [
    {
      "name": "Double Lift",
      "actions": [
        {
          "type": "doubleLift",
          "target": "topCard"
        }
      ]
    }
  ]
}
```

The AI should never directly generate executable frontend components.

---

# 25. Search

The global search should support:

- Trick names.
- Technique names.
- Gimmicks.
- Props.
- Notes.
- Descriptions.
- Categories.

Future semantic search should support natural language.

Example:

```text
"card changes visually"
"uses coins"
"has an elmsley"
"easy trick without gimmick"
```

---

# 26. Functional Requirements

## FR-001 — Create Trick

The system shall allow the user to create a trick.

## FR-002 — Edit Trick

The system shall allow the user to edit trick metadata.

## FR-003 — Delete Trick

The system shall allow the user to delete a trick.

## FR-004 — Create Routine

The system shall allow multiple routines to belong to the same trick.

## FR-005 — Manage Phases

The system shall allow users to add, edit, remove, and reorder routine phases.

## FR-006 — Manage Actions

The system shall allow actions to be associated with phases.

## FR-007 — Manage Techniques

The system shall allow reusable techniques to be created and associated with routines.

## FR-008 — Manage Gimmicks

The system shall allow gimmicks and props to be stored and associated with routines.

## FR-009 — Visualize Routine

The system shall provide an interactive visualization of supported routine actions.

## FR-010 — Control Visualization

The user shall be able to play, pause, navigate, replay, and change visualization speed.

## FR-011 — Phase Selection

The user shall be able to jump directly to a routine phase.

## FR-012 — Favorites

The user shall be able to favorite/unfavorite tricks.

## FR-013 — Notes

The user shall be able to create and edit personal notes.

## FR-014 — Practice Tracking

The system shall record practice activity.

## FR-015 — Search

The system shall allow users to search the magic library.

## FR-016 — Filter

The system shall allow filtering by category and other supported metadata.

## FR-017 — AI Analysis

The system shall allow unstructured magic notes to be analyzed by AI.

## FR-018 — AI Validation

AI-generated domain data shall be validated before being persisted.

## FR-019 — AI Variations

The system shall allow users to request routine variations from AI.

## FR-020 — Review Before Save

AI-generated changes shall require user confirmation before persistence.

---

# 27. API Requirements

Initial API:

```text
POST   /tricks
GET    /tricks
GET    /tricks/:id
PATCH  /tricks/:id
DELETE /tricks/:id

POST   /routines
GET    /routines/:id
PATCH  /routines/:id
DELETE /routines/:id

POST   /techniques
GET    /techniques
GET    /techniques/:id

POST   /gimmicks
GET    /gimmicks

POST   /practice
GET    /practice/recent

POST   /ai/analyze-trick
POST   /ai/generate-variation
POST   /ai/generate-visualization
```

---

# 28. Data Validation

All externally supplied structured data should be validated.

Recommended flow:

```text
HTTP Request
     ↓
Zod Schema
     ↓
Application Service
     ↓
Drizzle
     ↓
PostgreSQL
```

AI output must follow the same validation boundary.

---

# 29. Non-Functional Requirements

## NFR-001 — Performance

The Library should load quickly even with hundreds of stored tricks.

## NFR-002 — Visualization Performance

Routine animations should remain smooth during normal use.

## NFR-003 — Responsive UI

The application should support:

- Desktop.
- Tablet.
- Mobile.

## NFR-004 — Accessibility

Interactive elements should have:

- Keyboard accessibility.
- Visible focus states.
- Appropriate labels.
- Sufficient contrast.

## NFR-005 — Data Integrity

Invalid routine structures should not be persisted.

## NFR-006 — Maintainability

Domain logic should remain separate from visualization rendering.

## NFR-007 — Type Safety

Frontend, backend, and shared domain structures should use TypeScript.

## NFR-008 — Security

API credentials and AI API keys must remain server-side.

---

# 30. UI / UX Requirements

The visual direction should retain the prototype's aesthetic:

### Theme

```text
Dark
Charcoal
Black
Warm Gold
Bronze
Off-white
```

Avoid making purple/blue neon the primary visual language.

### Design Direction

The interface should feel like:

> A premium personal magician's notebook.

Not:

> A generic SaaS dashboard.

Important visual characteristics:

- Dark surfaces.
- Thin borders.
- Restrained gold accents.
- Subtle warm glow.
- Large visual centerpiece.
- High information density without feeling cluttered.
- Cinematic visualization.
- Minimal but premium controls.

---

# 31. Navigation

Primary navigation:

```text
Library
Favorites
Recently Practiced

Techniques
Gimmicks & Props
Visualizations
AI Assistant

Notes
Settings
```

---

# 32. Initial MVP Scope

The first implementation should NOT attempt to build every feature.

## MVP Phase 1

Build one complete vertical slice:

```text
Ambitious Card
    ↓
Routine
    ↓
5 Phases
    ↓
Interactive Visualization
    ↓
Play / Pause / Next / Previous
    ↓
Personal Notes
```

Supported visualization:

```text
Preparation
→ Double Lift
→ Insert
→ Snap
→ Fan Reveal
```

## MVP Phase 2

Add:

```text
Library
Search
Filters
Favorites
Technique Library
Gimmicks
Multiple Routines
```

## MVP Phase 3

Add:

```text
Practice Mode
Practice History
Semantic Search
```

## MVP Phase 4

Add:

```text
AI Note Analysis
AI Routine Generation
AI Visualization Generation
```

---

# 33. Product Principles

## Principle 1 — Visualization First

The visualization is the primary differentiator.

Do not build a generic CRUD application and add visualization later.

## Principle 2 — Domain Before UI Complexity

The domain model should represent how magicians actually think about routines.

## Principle 3 — Routines Are Not Linear Trick Steps

One trick may have multiple routines.

```text
Trick
 ├── Routine A
 ├── Routine B
 └── Routine C
```

## Principle 4 — Techniques Are Reusable

A technique should exist independently from a specific trick.

```text
Double Lift
   ↑
   ├── Ambitious Card
   ├── Card Control
   └── Other routines
```

## Principle 5 — AI Produces Data, Not UI

AI should generate structured magic knowledge.

The frontend owns:

- Rendering.
- Animation.
- Interaction.
- Visual consistency.

## Principle 6 — User Remains the Source of Truth

AI suggestions should be reviewed before becoming part of the user's knowledge base.

---

# 34. Example End-to-End User Flow

```text
User opens Sleightbook
        ↓
Library
        ↓
Search "Ambitious Card"
        ↓
Open Trick
        ↓
Select Routine
        ↓
Start Visualizer
        ↓
Watch Preparation
        ↓
Next → Double Lift
        ↓
Next → Insert
        ↓
Next → Snap
        ↓
Next → Fan Reveal
        ↓
Read secret explanation
        ↓
Open Technique → Double Lift
        ↓
Read personal notes
        ↓
Start Practice Mode
        ↓
Mark routine as practiced
```

---

# 35. Future Features

Potential future features:

- Import magic notes from Markdown.
- Import from text/PDF owned by the user.
- Video reference attached to a routine.
- Frame-by-frame video notes.
- AI video-to-routine analysis.
- Advanced 3D visualization.
- Hand position visualization.
- Camera-based practice feedback.
- Spaced repetition.
- Practice reminders.
- Difficulty progression.
- Routine comparison.
- Version history.
- Offline-first support.
- Export knowledge base to Markdown/JSON.
- Backup and restore.
- Multi-device synchronization.

---

# 36. Success Criteria

Sleightbook should succeed if a user can:

1. Add a magic trick in less than a few minutes.
2. Understand the structure of a routine without reading a long paragraph.
3. Replay a routine visually.
4. Jump directly to a specific phase.
5. Remember which techniques are used.
6. Record personal tips and mistakes.
7. Find a trick even when they don't remember its name.
8. Create multiple versions of the same trick.
9. Use AI to turn rough notes into a structured routine.
10. Practice the routine directly from the application.

The strongest indicator of product value is:

> **A magician forgets how a routine works, opens Sleightbook, watches the visualization, and can reconstruct the routine again.**
