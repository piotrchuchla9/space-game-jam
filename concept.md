# 🚀 MACHINES JAM GAME — ROCKET BUILDER

## 🧠 CORE IDEA
Player builds a modular rocket under constraints, then launches it to reach the highest possible altitude.

Key twist:
> Rocket behavior and controls depend on the parts used.

---

## 🔁 CORE GAME LOOP
1. Build rocket (limited budget / constraints)
2. Launch
3. Control rocket during flight
4. Avoid obstacles + collect items
5. Crash / end run
6. Earn currency
7. Upgrade / rebuild
8. Repeat

---

## 🎮 PLAYER GOAL
- Reach highest altitude possible
- Optimize rocket builds
- Unlock better parts

---

## 🧩 BUILDING SYSTEM (MVP)

### Structure (fixed slots)
Rocket consists of:
- Nose
- Body
- Engine
- Left Module
- Right Module

No freeform building.

---

### Constraints
- Budget (currency-based)
- Optional: max 5 modules OR weight limit

---

## ⚙️ PART TYPES

### 🚀 Engines
- Basic Engine: balanced thrust
- Boost Engine: high power, low control
- Pulse Engine: periodic thrust

---

### 🪶 Stabilizers
- Fins: reduce rotation
- Gyro: auto-stabilization (expensive)

---

### 🧲 Utility
- Fuel Tank: increases flight duration
- Magnet: attracts collectibles
- Shield: absorbs 1 hit

---

### 🎲 Chaos (optional/fun)
- Glitch Engine: random thrust
- AI Assist: partial auto-control (unreliable)

---

## 🧠 PHYSICS (SIMPLIFIED)

- 2D physics (Arcade or Matter)
- Forces:
  - Thrust (based on engine)
  - Gravity (increases with height variation or zone)
  - Torque (off-center forces)
- Rotation affected by:
  - Module placement
  - Stabilizers

Keep it arcade, not realistic.

---

## 🎮 CONTROLS (MOBILE-FIRST)

- Tap: thrust
- Hold: stronger thrust
- Optional:
  - Left/right buttons for directional thrust

Controls must be simple and responsive.

---

## 🌍 WORLD DESIGN

### Vertical progression zones:
1. Atmosphere (easy)
2. Turbulence (random forces)
3. Space (low drag, high inertia)

---

### Obstacles
- Low altitude: birds / drones
- Mid: clouds (random push)
- High: asteroids, satellites

---

## 💎 COLLECTIBLES

Primary:
- Gears (currency)

Optional:
- Fuel pickups (extend run)

---

## 📈 SCORING

- Score = max altitude
- Bonus:
  - collectibles gathered
  - optional style bonus

Track:
- Current run
- Highscore (localStorage)

---

## 💰 PROGRESSION

- Gears collected during runs
- Used to unlock new parts

No complex tech tree (keep it simple)

---

## 💥 FEEDBACK (JUICE)

Must have:
- Engine particles
- Explosion on crash
- Screen shake (boost / crash)
- Sound effects (thrust, impact)

Optional:
- Trails
- Slow motion on crash

---

## ⚠️ SCOPE RULES (IMPORTANT)

DO:
- Keep systems minimal
- Focus on feel and polish
- Limit number of parts (5–10 max)

DO NOT:
- Add complex factory systems
- Overbuild UI
- Simulate realistic physics
- Add too many currencies

---

## ✅ MVP CHECKLIST

### CORE
- [ ] Rocket physics (thrust + rotation)
- [ ] Basic build system (slots)
- [ ] 3–5 parts
- [ ] Launch + flight
- [ ] Crash detection

### GAMEPLAY
- [ ] Obstacles
- [ ] Collectibles (gears)
- [ ] Score system
- [ ] Highscore save

### POLISH
- [ ] Particles
- [ ] Sound
- [ ] UI (build + HUD)

---

## 🔥 OPTIONAL FEATURES (IF TIME LEFT)

- More parts
- Unlock system
- Daily challenge modifier
- Funny AI / narration
- Visual rocket customization

---

## 🧪 DESIGN PILLARS

- Simple controls, deep outcomes
- Emergent chaos from builds
- Fast iteration loop
- Fun > realism

---

## 🎯 SUCCESS CRITERIA

- Player understands controls instantly
- Player wants “one more run”
- Builds feel meaningfully different
- Game is playable on mobile
