# LOOK Scheduler Audit Report

## Task 2 — Kiểm tra LOOK Scheduler

### Function Location
- `sortTargetsLOOK(elevator)` - Lines 285-305

### Specification from temp.md

```
Nếu hướng = LÊN:
    ahead  = sort_asc  { f ∈ targets | f ≥ current }
    behind = sort_asc  { f ∈ targets | f < current }
    result = ahead + behind

Nếu hướng = XUỐNG:
    ahead  = sort_desc { f ∈ targets | f ≤ current }
    behind = sort_desc { f ∈ targets | f > current }
    result = ahead + behind
```

### Implementation Analysis

#### UP Direction (Lines 292-297)

```javascript
if (dir === 'up') {
    // Ahead: floors >= current, sorted ascending
    const ahead = targets.filter(f => f >= pos).sort((a, b) => a - b);
    // Behind: floors < current, sorted ascending
    const behind = targets.filter(f => f < pos).sort((a, b) => a - b);
    return [...ahead, ...behind];
}
```

✅ **ahead**: `filter(f => f >= pos).sort((a, b) => a - b)` - Floors ≥ current, sorted ascending
✅ **behind**: `filter(f => f < pos).sort((a, b) => a - b)` - Floors < current, sorted ascending
✅ **result**: `[...ahead, ...behind]` - Concatenation of ahead + behind

#### DOWN Direction (Lines 298-304)

```javascript
else {
    // Ahead: floors <= current, sorted descending
    const ahead = targets.filter(f => f <= pos).sort((a, b) => b - a);
    // Behind: floors > current, sorted descending
    const behind = targets.filter(f => f > pos).sort((a, b) => b - a);
    return [...ahead, ...behind];
}
```

✅ **ahead**: `filter(f => f <= pos).sort((a, b) => b - a)` - Floors ≤ current, sorted descending
✅ **behind**: `filter(f => f > pos).sort((a, b) => b - a)` - Floors > current, sorted descending
✅ **result**: `[...ahead, ...behind]` - Concatenation of ahead + behind

### Additional Implementation Details

✅ **Direction Handling**: Defaults to 'up' when direction is 'none' (line 289)
✅ **Duplicate Removal**: Uses `[...new Set(elevator.targetFloors)]` to remove duplicates (line 290)
✅ **Edge Case**: Returns empty array if no targets (line 286)

### Algorithm Classification

**LOOK compliant** ✅

The implementation is **true LOOK algorithm**, not:
- ❌ SCAN (would go to the end/boundary regardless of requests)
- ❌ FCFS (first-come-first-served, no direction-based sorting)
- ❌ Hybrid (combination of different algorithms)

### Key Differences from SCAN

| Algorithm | Behavior |
|-----------|----------|
| **LOOK** (current) | Serves all requests in current direction, then reverses. Does NOT go to boundary if no requests there. |
| SCAN | Always goes to the end/boundary in current direction, even if no requests there. |

The current implementation correctly implements LOOK by:
1. Filtering targets based on current position and direction
2. Sorting only the relevant targets (not going to boundary)
3. Reversing direction only after serving all targets in current direction

### Complexity

- **Time Complexity**: O(T log T) where T = number of targets
- **Space Complexity**: O(T) for the filtered and sorted arrays

### Conclusion

**Status: LOOK COMPLIANT** ✅

The `sortTargetsLOOK` function correctly implements the LOOK algorithm as specified in temp.md. It:
- Serves all targets in the current direction first
- Sorts targets appropriately (ascending for up, descending for down)
- Reverses direction only after serving all targets in current direction
- Does not go to boundary if no requests there (distinguishing it from SCAN)

**No changes required.**
