# Dispatcher Audit Report

## Task 1 — Kiểm tra Dispatcher hiện tại

### Functions Found

**Primary Dispatcher Function:**
- `dispatchElevator({ floor, direction })` - Line 861-894

**Cost Function:**
- `calculateDispatchCost(elevator, floor, direction)` - Line 849-859
- `calculateDispatchCostETA(elevator, floor, direction, config, adaptiveWeights, trafficMode)` - Line 538-577

**Note:** Functions `selectBestElevator` and `assignElevator` are NOT present. The dispatcher uses `dispatchElevator` instead.

---

## Current Cost Function Analysis

### Implementation Location
- Main function: `calculateDispatchCostETA` (lines 538-577)
- Wrapper: `calculateDispatchCost` (lines 849-859)

### Current Factors

The current cost function includes ALL required factors:

✅ **ETA (Estimated Time of Arrival)**
- Calculated via `calculateETA(elevator, floor, config)` (line 539)
- Includes travel time + intermediate stops * door time
- Normalized to [0, 1] range (line 568)

✅ **Load**
- Calculated as `elevator.currentLoad / config.maxLoad` (line 540)
- Normalized to [0, 1] range (line 569)

✅ **Zone**
- Calculated via `calculateSoftZonePenalty(elevator, floor, config)` (line 541)
- Already in [0, 1] range (line 570)

✅ **Direction**
- Direction penalty: 1 if wrong direction, 0 if correct (lines 544-550)
- Extra penalty if moving away from request (lines 548-549)

✅ **Wait Bonus**
- Calculated via `calculateWaitBonus(passenger, config)` (line 556)
- Based on passenger wait time with aging coefficient
- Subtracted from cost (line 577)

✅ **Traffic Bonus**
- Calculated via `calculateTrafficBonus(elevator, floor, direction, trafficMode)` (line 557)
- Bonus for UP_PEAK with up direction, DOWN_PEAK with down direction
- Subtracted from cost (line 577)

### Cost Function Formula

```
Cost = w1 * normalizedETA 
     + w2 * normalizedLoad 
     + w3 * normalizedZone 
     + w4 * directionPenalty 
     - w5 * waitBonus 
     - w6 * trafficBonus
```

### Adaptive Weights

The implementation supports adaptive scheduling:
- Uses `adaptiveWeights` if available (lines 560-563)
- Falls back to default config weights
- Weights are adjusted based on load factor via sigmoid function (see `updateAdaptiveWeights`)

### Missing Factors

**NONE** - All required factors are present and implemented.

---

## Additional Features Found

✅ **Adaptive Scheduling**
- `updateAdaptiveWeights(systemState, config)` - Adjusts weights based on load factor
- Uses sigmoid transition for smooth weight adjustment

✅ **Traffic Detection**
- `updateTrafficMode(systemState, config, currentTime)` - Detects UP_PEAK, DOWN_PEAK, NORMAL
- Based on recent request patterns in sliding window

✅ **Dynamic Zoning**
- `updateDynamicZoning(systemState, config, currentTime)` - Rebalances zone boundaries
- Based on traffic rate decay for load balancing

✅ **Fault Handling**
- Skips elevators with OVERLOAD fault (line 867)
- Fault penalty added in cost function

---

## Conclusion

**Status: COMPLIANT**

The current dispatcher implementation is **fully compliant** with the requirements from temp.md:

- ✅ Uses ETA-based cost function (not simple distance)
- ✅ All 6 cost components present and normalized
- ✅ Adaptive scheduling with sigmoid-based weight adjustment
- ✅ Traffic detection and mode switching
- ✅ Dynamic zoning for load balancing
- ✅ Wait bonus for starvation prevention
- ✅ Traffic bonus for peak direction optimization

**No missing factors.** The implementation exceeds the basic requirements with advanced features like adaptive scheduling and dynamic zoning.



---
