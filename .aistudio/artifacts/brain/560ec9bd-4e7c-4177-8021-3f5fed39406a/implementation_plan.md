# VECTOR: Minimalist UI Refinement, 3D Card Motion & Unified Views

A targeted visual and motion overhaul for VECTOR that elevates the app header, reimagines the Store and Ranks (Leaderboard) views to match the caliber of the Home, Stats, and Tune tabs, and introduces interactive 3D card tilt and smooth spring page morphs.

## User Review & Critical Decisions

> [!IMPORTANT]
> Based on your feedback, we are preserving the core vector arcade aesthetic you love while focusing upgrades directly where they are needed most:
> 
> - **Aesthetic Alignment**: Minimal, clean, and restrained. No garish clutter or unnecessary badges. The design will harmonize Store and Ranks tabs with the high visual standard of Tune, Stats, and Play.
> - **Unified Top Bar Contract**: Standardize the top header across all views (Play, Ranks, Store, Stats, Settings) with clean typography, compact account/currency balance indicators, and seamless navigation.
> - **Motion & Animations**: Introduce interactive 3D card tilt (with dynamic light sheen responding to pointer position) on store cards and game mode cards, paired with buttery spring-based page morphs (`stiffness: 350, damping: 28`).
> - **In-Game Hit Polish**: Keep in-game action minimal and clear—clean subtle kinetic shockwaves and crisp reaction typography that never obstructs the arrow ring.

---

## 1. Overview & Core Concept

- **What It Delivers**: 
  1. A **Universal Clean Header** that feels cohesive across every tab, seamlessly showing player code name, level, Google avatar status, and currency balances (Sparks & Diamonds) without visual clutter.
  2. A **Redesigned Store Experience** with curated category segments (Avatars, Themes & Audio, Spin & Hatch, Sparks Exchange), interactive 3D tilt cards, crisp purchase/equip states, and an elegant preview modal.
  3. A **Reimagined Ranks (Leaderboard) Hub** that transforms the current dense pill list into a clean, segmented tournament board with a distinguished Top 3 podium, tabular precision scores, and responsive player cards.
  4. **Tactile Spring & 3D Motion**: Physics-based 3D tilt for cards and slick spring page transitions with zero layout shift or lag.

- **Target Audience**: Competitive arcade players who value split-second reflexes, high visual clarity, satisfying tactile feedback, and a sleek, distraction-free interface.
- **Key Value**: Delivers a cohesive, AAA-grade minimalist polish across the entire application while honoring the game's high-speed responsiveness.

---

## 2. User Experience & Visual Design

### Key User Flows
1. **Navigating the App**: Tapping tabs on the bottom Dock triggers a fluid spring morph where outgoing cards glide away and new views settle instantly without layout jitter.
2. **Browsing the Store**:
   - Currency balances are cleanly integrated into the header.
   - Category switcher uses clean segmented controls: `Cosmetics`, `Themes & Audio`, `Lucky Spin`, `Incubator`, `Exchange`.
   - Hovering or dragging over an item card tilts it in 3D space with a subtle gloss reflection.
   - Tapping an item opens a clean preview sheet with detailed perks, equip status, and instant action button.
3. **Inspecting Global Ranks**:
   - Quick segmented selector: `Daily Challenge` · `Weekly Challenge` · `Core Arcade` · `Endless (Rush/Zen)` · `Multiplayer (Co-op/Versus)`.
   - Top 3 players stand on a sleek minimalist podium with metallic accent trims (Gold, Platinum, Bronze) and authentic avatars.
   - Clean tabular list for ranks 4–50 with instant highlight of your own operative ranking.

### Visual Identity & Theme
- **Color Discipline (60-30-10)**:
  - 60% Dark obsidian / Light slate canvas (`--bg`, `--surface`).
  - 30% Structural glass panels, subtle hairline borders (`1px solid var(--panel-border)`), and typography.
  - 10% High-intent accents (Cobalt, Cyan, Amber, Rose) reflecting the active theme.
- **Typography**:
  - Wordmark & Section Titles: Clean geometric display (`Plus Jakarta Sans` / system geometric sans) with tight tracking (`tracking-[-0.03em]`).
  - Metadata & Stats: Tabular numbers (`font-mono tabular-nums`) for rankings, reaction times, and balances.
  - No pill badge sandwiches; metadata is displayed with quiet typographic separators (`·`).

### Interactive Feedback & Motion
- **3D Interactive Card Tilt**: Smooth quaternion/Euler tilt on pointer move:
  $$\text{rotateX} = \frac{-(y - \text{center}_y)}{\text{height}} \times 12^\circ, \quad \text{rotateY} = \frac{(x - \text{center}_x)}{\text{width}} \times 12^\circ$$
  with a dynamic radial specular gradient overlay that tracks cursor coordinates.
- **Spring Page Morphs**: Transition curves configured with Framer Motion:
  `transition={{ type: "spring", stiffness: 360, damping: 30, mass: 0.8 }}`.
- **Kinetic In-Game Ring**: Micro-ripple shockwave expanding on successful directional hits with zero latency.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Segmented Grouping for Leaderboard & Store**:
  - *Chosen Approach*: Group 12 leaderboard modes into 4 clean contextual categories (Challenges, Arcade, Endless, Co-op/Versus), and consolidate 11 store tabs into 5 curated tabs.
  - *Why*: Eliminates overwhelming horizontal scrollbars and visual fatigue while making discovery effortless.
  - *Alternatives Considered*: Retaining the single 12-pill row was rejected because it felt cluttered and unpolished compared to the Stats screen.

- **Decision 2: Lightweight Pure-CSS / Math 3D Tilt**:
  - *Chosen Approach*: Use a lightweight React hook with CSS `transform: perspective(800px) rotateX(...) rotateY(...)` and pointer event throttling.
  - *Why*: Delivers 60–120 FPS performance on both mobile touch and desktop cursor without adding heavy 3D library dependencies.
  - *Alternatives Considered*: Heavy Three.js canvas embeds for simple UI cards would introduce unnecessary overhead and slower cold starts.

- **Decision 3: Unified Top Header Component**:
  - *Chosen Approach*: Create a shared `AppHeader` component used by all sub-screens, rendering the brand wordmark, contextual subtitle, real-time currency balances, Google Auth status, and quick-action shortcuts.
  - *Why*: Fixes header inconsistency across screens and guarantees identical visual balance throughout the app.

---

## 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                               App Shell                                │
├────────────────────────────────────────────────────────────────────────┤
│                     Shared AppHeader (Unified)                         │
│  [ Brand "Vector." ]  [ Status / Currencies ]  [ Profile / Sign-in ]   │
├────────────────────────────────────────────────────────────────────────┤
│                  Spring-Animated Screen Viewport                       │
│                                                                        │
│   ┌───────────────────┐  ┌───────────────────┐  ┌───────────────────┐  │
│   │    HomeScreen     │  │   StoreScreen     │  │ LeaderboardScreen │  │
│   │ (DepthCarousel +  │  │ (3D Tilt Cards +  │  │ (Podium + 4-tab   │  │
│   │   ModeArtwork)    │  │  Curated Tabs)    │  │  Rank Board)      │  │
│   └───────────────────┘  └───────────────────┘  └───────────────────┘  │
│   ┌───────────────────┐  ┌───────────────────┐                         │
│   │    StatsScreen    │  │  SettingsScreen   │                         │
│   │ (CurvedGraph KPI) │  │ (Tune Controls)   │                         │
│   └───────────────────┘  └───────────────────┘                         │
├────────────────────────────────────────────────────────────────────────┤
│                          Bottom Dock (Nav)                             │
└────────────────────────────────────────────────────────────────────────┘
```

### Component & File Strategy
1. **`src/components/AppHeader.tsx`**:
   - Reusable unified header handling brand mark, operative code name, sparks/diamonds counters, Google authentication trigger, and back/home actions.
2. **`src/components/screens/StoreScreen.tsx`**:
   - Clean category segments (`Avatars`, `Themes & Sounds`, `Mini-Games` [Spin/Hatch], `Sparks Vault`).
   - Integration of 3D tilt interaction wrapper (`TiltCard`) on previewable assets.
   - Streamlined item modal with high-contrast preview and direct equip/buy button.
3. **`src/components/screens/LeaderboardScreen.tsx`**:
   - Clean categorized tab selector replacing the 12-pill wrap.
   - Refined Top 3 podium layout with visual tier pedestals and avatar frames.
   - High-density, clean tabular rankings list with user position sticky anchor.
4. **`src/hooks/useTilt.ts`**:
   - Reusable pointer tilt hook providing spring-settled 3D rotation and dynamic specular light coordinates.
5. **`src/components/game/fx.ts`**:
   - Subtle kinetic shockwave ring expansion on hit feedback for enhanced in-game feel.

---

## 5. Verification & Acceptance Criteria

- [ ] **Unified Header**: Header looks identical in height, typography, and visual balance across Play, Store, Ranks, Stats, and Tune tabs.
- [ ] **Store Polish**: Store tabs are clean, organized, and free of cluttered badge pills; cards feature interactive 3D tilt with smooth cursor tracking.
- [ ] **Leaderboard Clarity**: Leaderboard presents an intuitive category switcher, an elegant Top 3 podium, and accurate Firestore real-time rankings.
- [ ] **Smooth Transitions**: Screen changes transition with zero layout jumping, using fluid Framer Motion spring physics.
- [ ] **Compilation & Test Pass**: `npm test`, `npm run lint`, and `npm run build` all pass with zero errors.
