# Physics Engine Audit Report

## Task 3 — Kiểm tra Physics Engine

### Functions Found

**Main Physics Loop:**
- `gameLoop(timestamp)` - Line 2432-2440
  - Uses `requestAnimationFrame` for real-time simulation
  - Calculates delta time between frames
  - Calls `updatePhysics(delta)` and `renderSimulation()`

**Physics Update:**
- `updatePhysics(deltaTimeMs)` - Line 1222-1248
  - Converts deltaTimeMs to dtSec with simSpeed multiplier
  - Calls adaptive scheduling and dynamic zoning updates
  - Iterates through all elevators and calls `processElevatorPhysics`

**Per-Elevator Physics:**
- `processElevatorPhysics(elevator, dtSec)` - Line 1084-1220
  - Main physics integration for each elevator
  - Handles fault states, door sequences, and motion

**Note:** Functions `updateElevator()` and `tick()` are NOT present. The implementation uses `processElevatorPhysics` instead.

---

## Integration Method Analysis

### Specification from temp.md

**Semi-Implicit Euler:**
```
v_{n+1} = v_n + a_n * dt
p_{n+1} = p_n + v_{n+1} * dt
```

**With Jerk:**
```
a_{n+1} = clamp(a_n + j_cmd * dt, -a_max, a_max)
v_{n+1} = clamp(v_n + a_{n+1} * dt, -v_max, v_max)
p_{n+1} = p_n + v_{n+1} * dt
```

### Current Implementation (Lines 1187-1204)

```javascript
// Semi-Implicit Euler integration with jerk model
// Specification from temp.md:
// v_{n+1} = v_n + a_n * dt
// p_{n+1} = p_n + v_{n+1} * dt
// With jerk: a_{n+1} = clamp(a_n + j_cmd * dt, -a_max, a_max)

// Update acceleration first with jerk
elevator.acceleration += jerkCmd * dtSec;
elevator.acceleration = clamp(elevator.acceleration, -aMax, aMax);

// Update velocity with new acceleration (Semi-Implicit Euler)
elevator.velocity += elevator.acceleration * dtSec;
elevator.velocity = clamp(elevator.velocity, -vMax, vMax);

// Update position with new velocity (Semi-Implicit Euler)
const prevPos = elevator.position;
elevator.position += elevator.velocity * dtSec;
```

### Integration Method Verification

✅ **Semi-Implicit Euler COMPLIANT**

The implementation correctly uses Semi-Implicit Euler:

1. **Acceleration Update** (Line 1195-1196):
   - `elevator.acceleration += jerkCmd * dtSec`
   - `elevator.acceleration = clamp(elevator.acceleration, -aMax, aMax)`
   - Matches: `a_{n+1} = clamp(a_n + j_cmd * dt, -a_max, a_max)` ✓

2. **Velocity Update** (Line 1199-1200):
   - `elevator.velocity += elevator.acceleration * dtSec`
   - Uses the NEW acceleration (just updated)
   - Matches: `v_{n+1} = v_n + a_{n+1} * dt` ✓
   - **This is the key difference from Explicit Euler**

3. **Position Update** (Line 1204):
   - `elevator.position += elevator.velocity * dtSec`
   - Uses the NEW velocity (just updated)
   - Matches: `p_{n+1} = p_n + v_{n+1} * dt` ✓

### Comparison with Explicit Euler

| Method | Order | Formula | Stability |
|--------|-------|---------|-----------|
| **Explicit Euler** (incorrect) | p, then v | `p += v * dt; v += a * dt` | Poor - energy drift |
| **Semi-Implicit Euler** (current) | v, then p | `v += a * dt; p += v * dt` | Good - symplectic |

The current implementation uses Semi-Implicit Euler, which provides:
- Better numerical stability
- Reduced accumulated error in real-time simulation
- Symplectic (energy-preserving) properties

---

## Jerk Model Implementation

### Jerk State Machine (Lines 1156-1275)

✅ **FULLY IMPLEMENTED - 6-Phase Jerk State Machine**

The implementation now includes the complete 6-phase jerk model as specified in temp.md:

✅ **ACC_START** (Bắt đầu tăng tốc):
- jerk = +j_max
- Increases acceleration from 0 to a_max
- Transitions to ACC_HOLD when acceleration reaches a_max

✅ **ACC_HOLD** (Tăng tốc đều):
- jerk = 0
- Maintains acceleration at a_max
- Transitions to ACC_END when approaching target velocity or deceleration point

✅ **ACC_END** (Kết thúc tăng tốc):
- jerk = -j_max
- Reduces acceleration from a_max to 0
- Transitions to CRUISING or DEC_START

✅ **CRUISING** (Du hành):
- jerk = 0, acceleration = 0
- Maintains constant velocity
- Transitions to DEC_START when approaching target

✅ **DEC_START** (Bắt đầu giảm tốc):
- jerk = -j_max
- Reduces acceleration from 0 to -a_max
- Transitions to DEC_HOLD when acceleration reaches -a_max

✅ **DEC_HOLD** (Giảm tốc đều):
- jerk = 0
- Maintains acceleration at -a_max
- Transitions to DEC_END when velocity near zero

✅ **DEC_END** (Kết thúc giảm tốc):
- jerk = +j_max
- Increases acceleration from -a_max to 0
- Transitions to IDLE or CRUISING

**Implementation Details:**
- State machine uses switch statement for clear phase transitions
- Threshold values: accelThreshold = 0.1, velocityThreshold = 0.1
- Backward compatibility maintained with legacy phase names
- Proper jerk command calculation for each phase
- Smooth transitions between all 6 phases

### Jerk Commands

| Phase | Jerk Command | Purpose |
|-------|--------------|---------|
| Start accelerating | `+j_max` | Increase acceleration |
| Accelerating (at max) | `0` | Maintain max acceleration |
| End accelerating | `-j_max` | Reduce acceleration |
| Start decelerating | `-j_max` | Reduce acceleration |
| Decelerating (at max) | `0` | Maintain max deceleration |
| End decelerating | `+j_max` | Reduce deceleration |

### Brake Distance Calculation (Lines 1097-1098)

```javascript
const decelDist = (elevator.velocity * elevator.velocity) / (2 * aMax) + 
                  (Math.abs(elevator.velocity) * aMax) / (2 * jMax);
```

✅ **Matches specification from temp.md:**
```
d_brake ≈ v²/(2a) + v·a/(2j)
```

This formula accounts for the additional stopping distance due to jerk transitions.

---

## Additional Physics Features

✅ **Floor Crossing Detection** (Lines 1206-1218):
- Detects when elevator crosses a floor boundary
- Triggers floor stop if needed
- Handles passenger exchange

✅ **Fault Handling** (Lines 1085-1090):
- Zeroes velocity and acceleration on fault
- Prevents motion during fault state

✅ **Door Sequence Integration** (Lines 1071-1074):
- Pauses physics during door operations
- Resumes after door sequence completes

✅ **SimSpeed Multiplier** (Line 1223):
- `dtSec = (deltaTimeMs / 1000) * simConfig.simSpeed`
- Allows time acceleration for testing

---

## Conclusion

**Status: SEMI-IMPLICIT EULER COMPLIANT** ✅

The physics engine correctly implements:
- ✅ Semi-Implicit Euler integration (v += a*dt, then p += v*dt)
- ✅ **6-phase jerk state machine** (fully compliant with temp.md specification)
- ✅ Brake distance calculation with jerk formula
- ✅ Proper clamping of acceleration and velocity
- ✅ Floor crossing detection
- ✅ Fault handling
- ✅ SimSpeed support

**Recent Updates:**
- ✅ Upgraded from 3-phase to full 6-phase jerk state machine
- ✅ Added ACC_START, ACC_HOLD, ACC_END phases for acceleration
- ✅ Added DEC_START, DEC_HOLD, DEC_END phases for deceleration
- ✅ Maintained backward compatibility with legacy phase names
- ✅ Updated Vietnamese display names for all phases

**Implementation is now fully compliant with temp.md specification.**

**Output: Semi-Implicit Euler compliant + 6-phase jerk state machine** ✅
