// =========================================================================
// PHASE 6: Elevator Simulation — Single-file comprehensive Web OS app
// =========================================================================
import * as auth from '../../shell/auth.js';

const BACKEND_URL = 'http://localhost:8000';
const CONFIG_STORAGE_KEY = 'elevatorConfig';
const FLOOR_HEIGHT_PX = 36;
const STATS_UPDATE_MS = 1000;
const STUCK_THRESHOLD_MS = 5000;
const OVERLOAD_FAULT_RATIO = 1.1;
const CHART_HISTORY_MAX = 60;
const WRONG_DIRECTION_PENALTY = 8;
const OVERLOAD_PENALTY = 15;
const SAME_DIRECTION_BONUS = 3;
const PASSENGER_DOT_SIZE = 6;

const DOOR_STATE = Object.freeze({
    CLOSED: 'closed',
    OPENING: 'opening',
    OPEN: 'open',
    CLOSING: 'closing'
});

const ELEVATOR_STATUS = Object.freeze({
    IDLE: 'idle',
    MOVING: 'moving',
    LOADING: 'loading',
    FAULT: 'fault'
});

const ELEVATOR_PHASE = Object.freeze({
    IDLE: 'idle',
    ACCELERATING: 'accelerating',
    CRUISING: 'cruising',
    DECELERATING: 'decelerating',
    DOOR_SEQUENCE: 'door_sequence'
});

const PASSENGER_STATE = Object.freeze({
    WAITING: 'waiting',
    BOARDING: 'boarding',
    RIDING: 'riding',
    EXITING: 'exiting',
    SERVED: 'served'
});

const FAULT_TYPE = Object.freeze({
    NONE: 'none',
    OVERLOAD: 'overload',
    STUCK: 'stuck'
});

function getDefaultSimConfig() {
    return {
        totalFloors: 20,
        elevatorCount: 3,
        maxLoad: 800,
        maxAcceleration: 1.0,
        maxVelocity: 2.5,
        doorOpenTime: 2000,
        doorCloseTime: 1500,
        spawnRate: 3000,
        simSpeed: 1
    };
}

const APP_STYLES = {
    root: {
        display: 'flex', width: '100%', height: '100%', minHeight: '480px',
        backgroundColor: '#0d0d12', color: '#e8eaed', fontFamily: 'Segoe UI, sans-serif',
        overflow: 'hidden', userSelect: 'none', boxSizing: 'border-box'
    },
    controlPanel: {
        width: '320px', minWidth: '320px', flexShrink: 0, display: 'flex', flexDirection: 'column',
        backgroundColor: '#14141c', borderRight: '1px solid #2a2a38', overflowY: 'auto', overflowX: 'hidden'
    },
    panelHeader: {
        padding: '14px 16px', fontSize: '15px', fontWeight: '700', letterSpacing: '0.5px',
        background: 'linear-gradient(135deg, #1a1a28 0%, #12121a 100%)', borderBottom: '1px solid #2a2a38',
        color: '#7eb8ff'
    },
    panelSection: {
        padding: '12px 16px', borderBottom: '1px solid #222230'
    },
    sectionTitle: {
        fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px',
        color: '#6b7280', marginBottom: '10px'
    },
    sliderRow: {
        marginBottom: '10px'
    },
    sliderLabel: {
        display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px', color: '#b0b8c4'
    },
    sliderValue: { color: '#58a6ff', fontWeight: '600', fontVariantNumeric: 'tabular-nums' },
    sliderInput: {
        width: '100%', height: '6px', accentColor: '#3b82f6', cursor: 'pointer'
    },
    btnRow: {
        display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px'
    },
    btnPrimary: {
        flex: '1', minWidth: '70px', padding: '8px 12px', backgroundColor: '#2563eb', color: '#fff',
        border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600'
    },
    btnSecondary: {
        flex: '1', minWidth: '70px', padding: '8px 12px', backgroundColor: '#374151', color: '#fff',
        border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600'
    },
    btnDanger: {
        padding: '8px 12px', backgroundColor: '#dc2626', color: '#fff', border: 'none',
        borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600', width: '100%'
    },
    btnSpeed: {
        padding: '6px 10px', backgroundColor: '#252532', color: '#aaa', border: '1px solid #3a3a4a',
        borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: '600', minWidth: '42px'
    },
    btnSpeedActive: {
        backgroundColor: '#1d4ed8', color: '#fff', borderColor: '#3b82f6'
    },
    simCenter: {
        flex: '1', display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden',
        backgroundColor: '#0a0a0f'
    },
    simToolbar: {
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px',
        backgroundColor: '#111118', borderBottom: '1px solid #222230', fontSize: '12px'
    },
    simViewport: {
        flex: '1', position: 'relative', overflow: 'auto', padding: '12px'
    },
    buildingWrap: {
        display: 'flex', gap: '16px', justifyContent: 'center', alignItems: 'flex-end', minHeight: '100%'
    },
    shaftColumn: {
        display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative'
    },
    shaftLabel: {
        fontSize: '11px', fontWeight: '700', color: '#6b7280', marginBottom: '6px'
    },
    shaftOuter: {
        position: 'relative', backgroundColor: '#1a1a24', border: '1px solid #2d2d3d',
        borderRadius: '4px', overflow: 'hidden'
    },
    floorRow: {
        display: 'flex', alignItems: 'center', height: `${FLOOR_HEIGHT_PX}px`, borderBottom: '1px solid #22222e',
        position: 'relative', boxSizing: 'border-box'
    },
    floorNum: {
        width: '28px', fontSize: '10px', color: '#555', textAlign: 'right', paddingRight: '6px', flexShrink: 0
    },
    floorTrack: {
        flex: '1', position: 'relative', height: '100%'
    },
    callButtons: {
        width: '36px', display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'center', justifyContent: 'center'
    },
    callBtn: {
        width: '22px', height: '14px', fontSize: '8px', border: '1px solid #3a3a4a', borderRadius: '2px',
        backgroundColor: '#252532', color: '#888', cursor: 'pointer', lineHeight: '12px', padding: 0
    },
    callBtnActive: {
        backgroundColor: '#f59e0b', color: '#000', borderColor: '#fbbf24', boxShadow: '0 0 6px rgba(245,158,11,0.5)'
    },
    waitBadge: {
        position: 'absolute', right: '4px', top: '50%', transform: 'translateY(-50%)',
        fontSize: '9px', backgroundColor: '#3b82f6', color: '#fff', padding: '1px 5px',
        borderRadius: '8px', minWidth: '14px', textAlign: 'center', opacity: 0
    },
    cabin: {
        position: 'absolute', left: '4px', right: '4px', height: `${FLOOR_HEIGHT_PX - 4}px`,
        background: 'linear-gradient(180deg, #3d4f6f 0%, #2a3548 100%)', borderRadius: '3px',
        border: '1px solid #5a7ab0', boxShadow: '0 2px 8px rgba(0,0,0,0.4)', zIndex: 10,
        display: 'flex', flexDirection: 'column', overflow: 'hidden', willChange: 'transform'
    },
    cabinFault: {
        borderColor: '#ef4444', boxShadow: '0 0 12px rgba(239,68,68,0.6)'
    },
    cabinHeader: {
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '2px 4px',
        fontSize: '8px', backgroundColor: 'rgba(0,0,0,0.35)', color: '#cde'
    },
    doorContainer: {
        flex: '1', display: 'flex', position: 'relative', overflow: 'hidden'
    },
    doorPanel: {
        flex: '1', backgroundColor: '#4a5568', border: '1px solid #718096', transformOrigin: 'center',
        willChange: 'transform'
    },
    doorPanelLeft: { transformOrigin: 'left center' },
    doorPanelRight: { transformOrigin: 'right center' },
    passengerDots: {
        position: 'absolute', bottom: '2px', left: '2px', right: '2px', height: '8px',
        display: 'flex', gap: '2px', flexWrap: 'wrap', alignItems: 'flex-end'
    },
    floorIndicator: {
        position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)',
        width: '100%', height: '100%', backgroundColor: 'rgba(59,130,246,0.25)',
        pointerEvents: 'none', opacity: 0, zIndex: 5
    },
    statsPanel: {
        width: '280px', minWidth: '260px', flexShrink: 0, display: 'flex', flexDirection: 'column',
        backgroundColor: '#14141c', borderLeft: '1px solid #2a2a38', overflowY: 'auto'
    },
    statCard: {
        padding: '10px 14px', margin: '8px 12px', backgroundColor: '#1a1a26', borderRadius: '8px',
        border: '1px solid #2a2a38'
    },
    statLabel: { fontSize: '10px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' },
    statValue: { fontSize: '20px', fontWeight: '700', color: '#f0f4f8', marginTop: '4px' },
    chartWrap: {
        margin: '8px 12px 12px', padding: '10px', backgroundColor: '#1a1a26', borderRadius: '8px',
        border: '1px solid #2a2a38'
    },
    chartTitle: { fontSize: '11px', color: '#6b7280', marginBottom: '8px', fontWeight: '600' },
    chartCanvas: { width: '100%', height: '140px', display: 'block', borderRadius: '4px' },
    statusMsg: {
        padding: '6px 16px', fontSize: '11px', color: '#6b7280', fontStyle: 'italic'
    }
};

// -------------------------------------------------------------------------
// Utility & configuration helpers
// -------------------------------------------------------------------------

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function deepCloneConfig(config) {
    return { ...config };
}

function mergeLoadedConfig(base, loaded) {
    if (!loaded || typeof loaded !== 'object') return base;
    const keyMap = {
        total_floors: 'totalFloors',
        elevator_count: 'elevatorCount',
        max_load: 'maxLoad',
        max_acceleration: 'maxAcceleration',
        max_velocity: 'maxVelocity',
        door_open_time: 'doorOpenTime',
        door_close_time: 'doorCloseTime',
        spawn_rate: 'spawnRate',
        sim_speed: 'simSpeed'
    };
    const merged = { ...base };
    for (const [k, v] of Object.entries(loaded)) {
        const camel = keyMap[k] || k;
        if (camel in merged && typeof v === 'number') merged[camel] = v;
    }
    merged.totalFloors = clamp(Math.round(merged.totalFloors), 5, 40);
    merged.elevatorCount = clamp(Math.round(merged.elevatorCount), 1, 6);
    merged.maxLoad = clamp(merged.maxLoad, 400, 1500);
    merged.maxAcceleration = clamp(merged.maxAcceleration, 0.3, 2.5);
    merged.maxVelocity = clamp(merged.maxVelocity, 0.5, 5);
    merged.doorOpenTime = clamp(Math.round(merged.doorOpenTime), 500, 5000);
    merged.doorCloseTime = clamp(Math.round(merged.doorCloseTime), 500, 5000);
    merged.spawnRate = clamp(Math.round(merged.spawnRate), 500, 15000);
    if (![1, 2, 5, 10].includes(merged.simSpeed)) merged.simSpeed = 1;
    return merged;
}

function gaussianRandom(mean, stdDev, min, max) {
    let u = 0; let v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    return clamp(mean + z * stdDev, min, max);
}

function pickRandomFloors(totalFloors) {
    let origin = Math.floor(Math.random() * totalFloors);
    let dest = Math.floor(Math.random() * totalFloors);
    let guard = 0;
    while (dest === origin && guard++ < 50) {
        dest = Math.floor(Math.random() * totalFloors);
    }
    return { origin, dest };
}

function floorToDirection(origin, dest) {
    if (dest > origin) return 'up';
    if (dest < origin) return 'down';
    return 'none';
}

function createFloorQueues(totalFloors) {
    const queues = [];
    for (let f = 0; f < totalFloors; f++) {
        queues[f] = { up: [], down: [] };
    }
    return queues;
}

function createStats(elevatorCount) {
    return {
        avgWaitTime: 0,
        totalServed: 0,
        passengersWaiting: 0,
        loadPerElevator: new Array(elevatorCount).fill(0),
        waitTimeHistory: []
    };
}

function createElevator(id, config, startFloor = 0) {
    return {
        id,
        position: startFloor,
        velocity: 0,
        acceleration: 0,
        direction: 'none',
        doorState: DOOR_STATE.CLOSED,
        passengers: [],
        targetFloors: [],
        currentLoad: 0,
        status: ELEVATOR_STATUS.IDLE,
        faultStatus: FAULT_TYPE.NONE,
        stuckTimer: 0,
        doorTimer: 0,
        phase: ELEVATOR_PHASE.IDLE,
        _doorPhase: null,
        _lastPosition: startFloor,
        _floorStopHandled: startFloor
    };
}

function createSystemState(config) {
    const elevators = [];
    for (let i = 0; i < config.elevatorCount; i++) {
        elevators.push(createElevator(i, config, 0));
    }
    return {
        elevators,
        floorQueues: createFloorQueues(config.totalFloors),
        stats: createStats(config.elevatorCount),
        allPassengers: [],
        pendingAnimations: []
    };
}

function recalcElevatorLoad(elevator) {
    elevator.currentLoad = elevator.passengers.reduce((sum, p) => sum + p.weight, 0);
}

function getBuildingHeightPx(totalFloors) {
    return totalFloors * FLOOR_HEIGHT_PX;
}

function positionToTranslateY(position, totalFloors) {
    const maxY = (totalFloors - 1) * FLOOR_HEIGHT_PX;
    return maxY - position * FLOOR_HEIGHT_PX;
}

// -------------------------------------------------------------------------
// Exported entry — full simulation lifecycle
// -------------------------------------------------------------------------

export function initElevatorSimulation(contentElement) {
    if (!contentElement) return;

    let simConfig = getDefaultSimConfig();
    let systemState = createSystemState(simConfig);
    let passengerIdCounter = 1;
    let simRunning = false;
    let rafId = null;
    let spawnIntervalId = null;
    let statsIntervalId = null;
    let lastFrameTime = 0;
    let configLoaded = false;
    const eventLog = new SimulationEventLog();
    let elevatorDetailContainer = null;
    let eventLogContainer = null;

    const dom = {
        root: null,
        controlPanel: null,
        simViewport: null,
        buildingWrap: null,
        statsValues: {},
        chartCanvas: null,
        chartCtx: null,
        statusMsg: null,
        sliderDisplays: {},
        shaftElements: [],
        cabinElements: [],
        doorLeft: [],
        doorRight: [],
        waitBadges: [],
        floorIndicators: [],
        callButtons: { up: [], down: [] },
        speedButtons: []
    };

    function getAnime() {
        return typeof window !== 'undefined' ? window.anime : null;
    }

    function setStatusMessage(text, isError = false) {
        if (!dom.statusMsg) return;
        dom.statusMsg.textContent = text;
        dom.statusMsg.style.color = isError ? '#f87171' : '#6b7280';
    }

    // =====================================================================
    // 6C — Dispatcher (LOOK / SCAN multi-criteria)
    // =====================================================================

    function countPassengersWaiting() {
        let n = 0;
        for (const q of systemState.floorQueues) {
            n += q.up.length + q.down.length;
        }
        return n;
    }

    function registerFloorCall(floor, direction, passengerId) {
        const queue = systemState.floorQueues[floor];
        if (!queue) return;
        const list = direction === 'up' ? queue.up : queue.down;
        if (!list.includes(passengerId)) list.push(passengerId);
        systemState.stats.passengersWaiting = countPassengersWaiting();
        dispatchElevator({ floor, direction });
    }

    function calculateDispatchCost(elevator, floor, direction) {
        const dist = Math.abs(elevator.position - floor);
        let cost = dist * 2;

        if (elevator.direction !== 'none' && elevator.direction !== direction) {
            cost += WRONG_DIRECTION_PENALTY;
            if (elevator.direction === 'up' && floor < elevator.position) cost += 4;
            if (elevator.direction === 'down' && floor > elevator.position) cost += 4;
        }

        const loadRatio = elevator.currentLoad / simConfig.maxLoad;
        if (loadRatio > 0.85) cost += OVERLOAD_PENALTY * loadRatio;
        if (loadRatio > 1.0) cost += 50;

        if (elevator.direction === direction) {
            if (direction === 'up' && floor >= elevator.position) cost -= SAME_DIRECTION_BONUS;
            if (direction === 'down' && floor <= elevator.position) cost -= SAME_DIRECTION_BONUS;
        }

        if (elevator.status === ELEVATOR_STATUS.FAULT) cost += 100;
        if (elevator.doorState !== DOOR_STATE.CLOSED) cost += 2;
        if (elevator.targetFloors.includes(floor)) cost -= 5;

        const idleBonus = elevator.status === ELEVATOR_STATUS.IDLE ? -2 : 0;
        cost += idleBonus;

        return cost;
    }

    function dispatchElevator({ floor, direction }) {
        if (floor < 0 || floor >= simConfig.totalFloors) return -1;
        let bestId = -1;
        let bestCost = Infinity;

        for (const elev of systemState.elevators) {
            if (elev.faultStatus === FAULT_TYPE.OVERLOAD) continue;
            const cost = calculateDispatchCost(elev, floor, direction);
            if (cost < bestCost) {
                bestCost = cost;
                bestId = elev.id;
            }
        }

        if (bestId < 0) return -1;
        const winner = systemState.elevators[bestId];
        const explain = winner ? explainDispatchScore(winner, floor, direction, simConfig.maxLoad) : '';
        eventLog.push('DISPATCH', `Tầng ${floor} ${direction} → Thang ${bestId + 1} (${bestCost.toFixed(1)} | ${explain})`);
        if (eventLogContainer) eventLog.render(eventLogContainer);
        const elevator = systemState.elevators[bestId];
        if (!elevator.targetFloors.includes(floor)) {
            elevator.targetFloors.push(floor);
            sortTargetFloors(bestId);
        }
        if (elevator.direction === 'none') {
            elevator.direction = direction === 'none'
                ? (floor > elevator.position ? 'up' : floor < elevator.position ? 'down' : 'up')
                : direction;
        }
        if (elevator.status === ELEVATOR_STATUS.IDLE && elevator.phase === ELEVATOR_PHASE.IDLE) {
            elevator.status = ELEVATOR_STATUS.MOVING;
        }
        return bestId;
    }

    function sortTargetFloors(elevatorId) {
        const elevator = systemState.elevators[elevatorId];
        if (!elevator || elevator.targetFloors.length === 0) return;

        const pos = elevator.position;
        const dir = elevator.direction === 'none' ? 'up' : elevator.direction;
        const targets = [...new Set(elevator.targetFloors)];

        targets.sort((a, b) => {
            if (dir === 'up') return a - b;
            if (dir === 'down') return b - a;
            const da = Math.abs(a - pos);
            const db = Math.abs(b - pos);
            if (da !== db) return da - db;
            return a - b;
        });

        if (dir === 'up') {
            const below = targets.filter(f => f < pos).sort((a, b) => b - a);
            const above = targets.filter(f => f >= pos).sort((a, b) => a - b);
            elevator.targetFloors = [...above, ...below];
        } else {
            const above = targets.filter(f => f > pos).sort((a, b) => a - b);
            const below = targets.filter(f => f <= pos).sort((a, b) => b - a);
            elevator.targetFloors = [...below, ...above];
        }
    }

    function detectEmergency(elevatorId, deltaMs = 16) {
        const elevator = systemState.elevators[elevatorId];
        if (!elevator) return false;

        const overloadThreshold = simConfig.maxLoad * OVERLOAD_FAULT_RATIO;
        if (elevator.currentLoad > overloadThreshold) {
            elevator.faultStatus = FAULT_TYPE.OVERLOAD;
            elevator.status = ELEVATOR_STATUS.FAULT;
            elevator.velocity = 0;
            elevator.acceleration = 0;
            eventLog.push('FAULT', `Thang ${elevatorId + 1} quá tải ${Math.round(elevator.currentLoad)}kg`);
            if (eventLogContainer) eventLog.render(eventLogContainer);
            return true;
        }

        const nearStop = Math.abs(elevator.velocity) < 0.02;
        const movingIntent = elevator.targetFloors.length > 0 || elevator.phase !== ELEVATOR_PHASE.IDLE;
        if (nearStop && movingIntent && elevator.doorState === DOOR_STATE.CLOSED) {
            elevator.stuckTimer += deltaMs;
            if (elevator.stuckTimer >= STUCK_THRESHOLD_MS) {
                elevator.faultStatus = FAULT_TYPE.STUCK;
                elevator.status = ELEVATOR_STATUS.FAULT;
                eventLog.push('FAULT', `Thang ${elevatorId + 1} kẹt > ${STUCK_THRESHOLD_MS / 1000}s`);
                if (eventLogContainer) eventLog.render(eventLogContainer);
                return true;
            }
        } else if (!nearStop || elevator.doorState !== DOOR_STATE.CLOSED) {
            elevator.stuckTimer = 0;
        }

        if (elevator.faultStatus !== FAULT_TYPE.NONE && elevator.currentLoad <= simConfig.maxLoad) {
            if (elevator.faultStatus === FAULT_TYPE.OVERLOAD) {
                elevator.faultStatus = FAULT_TYPE.NONE;
                elevator.status = ELEVATOR_STATUS.IDLE;
            }
        }

        return elevator.faultStatus !== FAULT_TYPE.NONE;
    }

    // =====================================================================
    // 6D — Physics & floor stop handling
    // =====================================================================

    function getNextTargetFloor(elevator) {
        if (elevator.targetFloors.length === 0) return null;
        return elevator.targetFloors[0];
    }

    function removeTargetFloor(elevator, floor) {
        const idx = elevator.targetFloors.indexOf(floor);
        if (idx >= 0) elevator.targetFloors.splice(idx, 1);
    }

    function shouldStopAtFloor(elevator, floorInt) {
        if (elevator.targetFloors.includes(floorInt)) return true;
        const q = systemState.floorQueues[floorInt];
        if (!q) return false;
        if (elevator.passengers.some(p => p.destinationFloor === floorInt)) return true;
        if (elevator.direction === 'up' && q.up.length > 0) return true;
        if (elevator.direction === 'down' && q.down.length > 0) return true;
        if (elevator.direction === 'none' && (q.up.length > 0 || q.down.length > 0)) return true;
        return false;
    }

    function unloadPassengersAtFloor(elevator, floorInt) {
        const exiting = elevator.passengers.filter(p => p.destinationFloor === floorInt);
        for (const p of exiting) {
            p.state = PASSENGER_STATE.EXITING;
            p.exitTime = performance.now();
            animatePassengerDotExit(elevator.id, p);
            p.state = PASSENGER_STATE.SERVED;
            systemState.stats.totalServed += 1;
        }
        elevator.passengers = elevator.passengers.filter(p => p.destinationFloor !== floorInt);
        recalcElevatorLoad(elevator);
    }

    function loadPassengersAtFloor(elevator, floorInt) {
        const q = systemState.floorQueues[floorInt];
        if (!q) return;

        const tryBoard = (list, reqDir) => {
            const toBoard = [];
            for (let i = 0; i < list.length; i++) {
                const pid = list[i];
                const passenger = systemState.allPassengers.find(p => p.id === pid);
                if (!passenger || passenger.state !== PASSENGER_STATE.WAITING) continue;
                if (elevator.currentLoad + passenger.weight > simConfig.maxLoad * 1.05) break;
                if (elevator.direction !== 'none' && elevator.direction !== reqDir && elevator.passengers.length > 0) {
                    continue;
                }
                toBoard.push(passenger);
            }
            for (const passenger of toBoard) {
                passenger.state = PASSENGER_STATE.BOARDING;
                passenger.boardTime = performance.now();
                const waitMs = passenger.boardTime - passenger.waitStartTime;
                systemState.stats.waitTimeHistory.push(waitMs);
                if (systemState.stats.waitTimeHistory.length > CHART_HISTORY_MAX) {
                    systemState.stats.waitTimeHistory.shift();
                }
                elevator.passengers.push(passenger);
                if (!elevator.targetFloors.includes(passenger.destinationFloor)) {
                    elevator.targetFloors.push(passenger.destinationFloor);
                }
                passenger.state = PASSENGER_STATE.RIDING;
                animatePassengerDotEnter(elevator.id, passenger);
                const idx = list.indexOf(passenger.id);
                if (idx >= 0) list.splice(idx, 1);
            }
        };

        if (elevator.direction === 'up' || elevator.direction === 'none') tryBoard(q.up, 'up');
        if (elevator.direction === 'down' || elevator.direction === 'none') tryBoard(q.down, 'down');

        recalcElevatorLoad(elevator);
        sortTargetFloors(elevator.id);
        systemState.stats.passengersWaiting = countPassengersWaiting();
    }

    function beginDoorSequence(elevator) {
        elevator.phase = ELEVATOR_PHASE.DOOR_SEQUENCE;
        elevator._doorPhase = 'opening';
        elevator.doorState = DOOR_STATE.OPENING;
        elevator.doorTimer = 0;
        elevator.velocity = 0;
        elevator.acceleration = 0;
        elevator.status = ELEVATOR_STATUS.LOADING;
        animateDoors(elevator.id, 'open');
    }

    function updateDoorSequence(elevator, dtMs) {
        elevator.doorTimer += dtMs;
        const floorInt = Math.round(elevator.position);

        if (elevator._doorPhase === 'opening') {
            if (elevator.doorTimer >= simConfig.doorOpenTime) {
                elevator.doorState = DOOR_STATE.OPEN;
                elevator._doorPhase = 'open_hold';
                elevator.doorTimer = 0;
                unloadPassengersAtFloor(elevator, floorInt);
                loadPassengersAtFloor(elevator, floorInt);
                flashFloorIndicator(elevator.id, floorInt);
            }
        } else if (elevator._doorPhase === 'open_hold') {
            if (elevator.doorTimer >= 200) {
                elevator._doorPhase = 'closing';
                elevator.doorState = DOOR_STATE.CLOSING;
                elevator.doorTimer = 0;
                animateDoors(elevator.id, 'close');
            }
        } else if (elevator._doorPhase === 'closing') {
            if (elevator.doorTimer >= simConfig.doorCloseTime) {
                elevator.doorState = DOOR_STATE.CLOSED;
                elevator._doorPhase = null;
                elevator.phase = ELEVATOR_PHASE.IDLE;
                elevator.doorTimer = 0;
                removeTargetFloor(elevator, floorInt);
                if (elevator.targetFloors.length > 0) {
                    const next = getNextTargetFloor(elevator);
                    elevator.direction = next > elevator.position ? 'up' : next < elevator.position ? 'down' : elevator.direction;
                    elevator.status = ELEVATOR_STATUS.MOVING;
                    elevator.phase = ELEVATOR_PHASE.ACCELERATING;
                } else {
                    elevator.direction = 'none';
                    elevator.status = ELEVATOR_STATUS.IDLE;
                }
            }
        }
    }

    function handleFloorStop(elevatorId) {
        const elevator = systemState.elevators[elevatorId];
        const floorInt = Math.round(elevator.position);
        if (elevator._floorStopHandled === floorInt && elevator.phase === ELEVATOR_PHASE.DOOR_SEQUENCE) return;
        elevator._floorStopHandled = floorInt;
        beginDoorSequence(elevator);
    }

    function processElevatorPhysics(elevator, dtSec) {
        if (elevator.status === ELEVATOR_STATUS.FAULT) {
            elevator.velocity = 0;
            elevator.acceleration = 0;
            return;
        }

        if (elevator.phase === ELEVATOR_PHASE.DOOR_SEQUENCE) {
            updateDoorSequence(elevator, dtSec * 1000);
            return;
        }

        const target = getNextTargetFloor(elevator);
        if (target === null) {
            elevator.velocity = 0;
            elevator.acceleration = 0;
            elevator.phase = ELEVATOR_PHASE.IDLE;
            elevator.status = ELEVATOR_STATUS.IDLE;
            elevator.direction = 'none';
            return;
        }

        const diff = target - elevator.position;
        const desiredDir = diff > 0.01 ? 'up' : diff < -0.01 ? 'down' : 'none';
        if (desiredDir !== 'none') elevator.direction = desiredDir;

        const aMax = simConfig.maxAcceleration;
        const vMax = simConfig.maxVelocity;
        const distToTarget = Math.abs(diff);
        const decelDist = (elevator.velocity * elevator.velocity) / (2 * aMax + 0.0001);

        let shouldStop = distToTarget < 0.02;
        const floorInt = Math.round(elevator.position);
        if (!shouldStop && decelDist >= distToTarget - 0.05) {
            elevator.phase = ELEVATOR_PHASE.DECELERATING;
        }

        if (shouldStop) {
            elevator.position = target;
            elevator.velocity = 0;
            elevator.acceleration = 0;
            if (shouldStopAtFloor(elevator, floorInt) || Math.abs(target - floorInt) < 0.01) {
                handleFloorStop(elevator.id);
            } else {
                removeTargetFloor(elevator, target);
            }
            return;
        }

        if (elevator.phase === ELEVATOR_PHASE.DECELERATING || decelDist >= distToTarget) {
            elevator.phase = ELEVATOR_PHASE.DECELERATING;
            elevator.acceleration = -Math.sign(elevator.velocity || (desiredDir === 'up' ? 1 : -1)) * aMax;
        } else if (Math.abs(elevator.velocity) < vMax - 0.01) {
            elevator.phase = ELEVATOR_PHASE.ACCELERATING;
            elevator.acceleration = (desiredDir === 'up' ? 1 : -1) * aMax;
        } else {
            elevator.phase = ELEVATOR_PHASE.CRUISING;
            elevator.acceleration = 0;
        }

        elevator.velocity += elevator.acceleration * dtSec;
        elevator.velocity = clamp(elevator.velocity, -vMax, vMax);

        if (elevator.phase === ELEVATOR_PHASE.DECELERATING) {
            const sign = Math.sign(elevator.velocity);
            if (sign !== 0 && Math.sign(diff) !== sign) elevator.velocity = 0;
        }

        const prevPos = elevator.position;
        elevator.position += elevator.velocity * dtSec;

        if (Math.round(prevPos) !== Math.round(elevator.position)) {
            const crossed = Math.round(elevator.position);
            if (shouldStopAtFloor(elevator, crossed)) {
                elevator.position = crossed;
                elevator.velocity = 0;
                handleFloorStop(elevator.id);
            }
        }

        elevator.status = Math.abs(elevator.velocity) > 0.01 ? ELEVATOR_STATUS.MOVING : elevator.status;
        elevator._lastPosition = elevator.position;
    }

    function updatePhysics(deltaTimeMs) {
        const dtSec = (deltaTimeMs / 1000) * simConfig.simSpeed;
        if (dtSec <= 0) return;

        for (const elevator of systemState.elevators) {
            detectEmergency(elevator.id, deltaTimeMs);
            if (elevator.phase !== ELEVATOR_PHASE.DOOR_SEQUENCE) {
                processElevatorPhysics(elevator, dtSec);
            } else {
                updateDoorSequence(elevator, deltaTimeMs * simConfig.simSpeed);
            }
            systemState.stats.loadPerElevator[elevator.id] = Math.round(elevator.currentLoad);
        }

        systemState.stats.avgWaitTime = calculateAverageWaitTime();
        systemState.stats.passengersWaiting = countPassengersWaiting();
    }

    // =====================================================================
    // 6E — Passengers spawn & statistics
    // =====================================================================

    let floorServiceProfile = buildFloorServiceProfile(simConfig.totalFloors);

    function spawnPassenger() {
        const useWeightedLobby = Math.random() < 0.35;
        let origin;
        let dest;
        if (useWeightedLobby && floorServiceProfile.length) {
            origin = weightedRandomFloor(floorServiceProfile);
            dest = pickRandomFloors(simConfig.totalFloors).dest;
            if (dest === origin) dest = Math.min(simConfig.totalFloors - 1, origin + 1);
        } else {
            const picked = pickRandomFloors(simConfig.totalFloors);
            origin = picked.origin;
            dest = picked.dest;
        }
        const direction = floorToDirection(origin, dest);
        const weight = gaussianRandom(72, 12, 45, 100);
        const passenger = {
            id: passengerIdCounter++,
            originFloor: origin,
            destinationFloor: dest,
            weight: Math.round(weight * 10) / 10,
            waitStartTime: performance.now(),
            boardTime: null,
            exitTime: null,
            state: PASSENGER_STATE.WAITING,
            direction
        };
        systemState.allPassengers.push(passenger);
        registerFloorCall(origin, direction === 'none' ? 'up' : direction, passenger.id);
        pulseWaitBadge(origin);
        return passenger;
    }

    function injectSurge(count = 20) {
        for (let i = 0; i < count; i++) spawnPassenger();
        eventLog.push('SURGE', `Inject ${count} hành khách đồng thời`);
        if (eventLogContainer) eventLog.render(eventLogContainer);
        setStatusMessage(`Đã inject ${count} hành khách.`);
    }

    function calculateAverageWaitTime() {
        const waiting = systemState.allPassengers.filter(p => p.state === PASSENGER_STATE.WAITING);
        if (waiting.length === 0) {
            const hist = systemState.stats.waitTimeHistory;
            if (hist.length === 0) return 0;
            return hist.reduce((a, b) => a + b, 0) / hist.length;
        }
        const now = performance.now();
        const sum = waiting.reduce((acc, p) => acc + (now - p.waitStartTime), 0);
        return sum / waiting.length;
    }

    // =====================================================================
    // 6F — Graphics & animation
    // =====================================================================

    function flashFloorIndicator(elevatorId, floorInt) {
        const el = dom.floorIndicators[elevatorId]?.[floorInt];
        const anime = getAnime();
        if (!el || !anime) return;
        anime.remove(el);
        anime({
            targets: el,
            opacity: [0, 0.9, 0],
            duration: 600,
            easing: 'easeOutQuad'
        });
    }

    function pulseWaitBadge(floorInt) {
        const el = dom.waitBadges[floorInt];
        const anime = getAnime();
        if (!el || !anime) return;
        const count = (systemState.floorQueues[floorInt]?.up.length || 0)
            + (systemState.floorQueues[floorInt]?.down.length || 0);
        el.textContent = count > 0 ? String(count) : '';
        el.style.opacity = count > 0 ? '1' : '0';
        anime.remove(el);
        anime({
            targets: el,
            scale: [1, 1.35, 1],
            duration: 400,
            easing: 'easeOutElastic(1, .6)'
        });
    }

    function animateDoors(elevatorId, mode) {
        const left = dom.doorLeft[elevatorId];
        const right = dom.doorRight[elevatorId];
        const anime = getAnime();
        if (!left || !right || !anime) return;
        const scale = mode === 'open' ? 0.08 : 1;
        anime.remove([left, right]);
        anime({
            targets: [left, right],
            scaleX: scale,
            duration: mode === 'open' ? simConfig.doorOpenTime * 0.4 : simConfig.doorCloseTime * 0.4,
            easing: 'easeInOutQuad'
        });
    }

    function animateCabinPosition(elevatorId) {
        const cabin = dom.cabinElements[elevatorId];
        const elevator = systemState.elevators[elevatorId];
        const anime = getAnime();
        if (!cabin || !elevator || !anime) return;
        const y = positionToTranslateY(elevator.position, simConfig.totalFloors);
        anime.set(cabin, { translateY: y });
    }

    function animatePassengerDotEnter(elevatorId, passenger) {
        const cabin = dom.cabinElements[elevatorId];
        if (!cabin) return;
        const dots = cabin.querySelector('[data-dots]');
        if (!dots) return;
        const dot = document.createElement('span');
        dot.style.cssText = `width:${PASSENGER_DOT_SIZE}px;height:${PASSENGER_DOT_SIZE}px;border-radius:50%;background:#4ade80;display:inline-block;opacity:0;`;
        dots.appendChild(dot);
        const anime = getAnime();
        if (anime) {
            anime({
                targets: dot,
                opacity: [0, 1],
                translateY: [8, 0],
                duration: 350,
                easing: 'easeOutQuad'
            });
        }
        updateCabinDots(elevatorId);
    }

    function animatePassengerDotExit(elevatorId, passenger) {
        updateCabinDots(elevatorId);
    }

    function updateCabinDots(elevatorId) {
        const cabin = dom.cabinElements[elevatorId];
        const elevator = systemState.elevators[elevatorId];
        if (!cabin || !elevator) return;
        const dots = cabin.querySelector('[data-dots]');
        if (!dots) return;
        dots.innerHTML = '';
        const maxDots = Math.min(elevator.passengers.length, 12);
        for (let i = 0; i < maxDots; i++) {
            const dot = document.createElement('span');
            dot.style.cssText = `width:${PASSENGER_DOT_SIZE}px;height:${PASSENGER_DOT_SIZE}px;border-radius:50%;background:#4ade80;display:inline-block;`;
            dots.appendChild(dot);
        }
    }

    function updateFaultBlink(elevatorId) {
        const cabin = dom.cabinElements[elevatorId];
        const elevator = systemState.elevators[elevatorId];
        if (!cabin || !elevator) return;
        const faulted = elevator.faultStatus !== FAULT_TYPE.NONE;
        if (faulted) {
            Object.assign(cabin.style, APP_STYLES.cabinFault);
            cabin.dataset.fault = '1';
        } else {
            cabin.style.borderColor = '#5a7ab0';
            cabin.style.boxShadow = '0 2px 8px rgba(0,0,0,0.4)';
            delete cabin.dataset.fault;
        }
    }

    function renderSimulation() {
        for (let i = 0; i < systemState.elevators.length; i++) {
            animateCabinPosition(i);
            updateCabinDots(i);
            updateFaultBlink(i);
            const header = dom.cabinElements[i]?.querySelector('[data-floor-ind]');
            if (header) {
                header.textContent = `F${Math.round(systemState.elevators[i].position)}`;
            }
            const loadEl = dom.cabinElements[i]?.querySelector('[data-load-ind]');
            if (loadEl) {
                const e = systemState.elevators[i];
                loadEl.textContent = `${Math.round(e.currentLoad)}/${simConfig.maxLoad}kg`;
            }
        }

        for (let f = 0; f < simConfig.totalFloors; f++) {
            pulseWaitBadge(f);
            const q = systemState.floorQueues[f];
            const upBtn = dom.callButtons.up[f];
            const downBtn = dom.callButtons.down[f];
            if (upBtn) {
                const active = q.up.length > 0;
                Object.assign(upBtn.style, active ? APP_STYLES.callBtnActive : APP_STYLES.callBtn);
            }
            if (downBtn) {
                const active = q.down.length > 0;
                Object.assign(downBtn.style, active ? APP_STYLES.callBtnActive : APP_STYLES.callBtn);
            }
        }

        const anime = getAnime();
        if (anime) {
            dom.cabinElements.forEach((cabin, i) => {
                if (cabin?.dataset.fault === '1') {
                    anime.remove(cabin);
                    anime({
                        targets: cabin,
                        opacity: [1, 0.4, 1],
                        duration: 800,
                        loop: true,
                        easing: 'easeInOutSine'
                    });
                }
            });
        }
    }

    function drawWaitTimeChart() {
        const canvas = dom.chartCanvas;
        const ctx = dom.chartCtx;
        if (!canvas || !ctx) return;

        const w = canvas.width;
        const h = canvas.height;
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = '#12121a';
        ctx.fillRect(0, 0, w, h);

        const hist = systemState.stats.waitTimeHistory;
        const padding = { top: 12, right: 12, bottom: 22, left: 36 };

        if (hist.length < 2) {
            drawChartGrid(ctx, w, h, padding, 4);
            ctx.fillStyle = '#555';
            ctx.font = '11px Segoe UI';
            ctx.textAlign = 'center';
            ctx.fillText('Chờ dữ liệu...', w / 2, h / 2);
            return;
        }

        drawChartGrid(ctx, w, h, padding, 4);
        const maxVal = Math.max(...hist, 1000);
        const plotH = h - padding.top - padding.bottom;
        for (let i = 0; i <= 4; i++) {
            const y = padding.top + (plotH * i) / 4;
            const label = Math.round(maxVal * (1 - i / 4) / 1000 * 10) / 10;
            ctx.fillStyle = '#555';
            ctx.font = '9px Segoe UI';
            ctx.textAlign = 'right';
            ctx.fillText(`${label}s`, padding.left - 4, y + 3);
        }

        ctx.beginPath();
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2;
        const plotW = w - padding.left - padding.right;
        hist.forEach((val, i) => {
            const x = padding.left + (plotW * i) / (hist.length - 1);
            const y = padding.top + plotH - (val / maxVal) * plotH;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();

        const grad = ctx.createLinearGradient(0, padding.top, 0, h - padding.bottom);
        grad.addColorStop(0, 'rgba(59,130,246,0.35)');
        grad.addColorStop(1, 'rgba(59,130,246,0)');
        ctx.lineTo(padding.left + plotW, padding.top + plotH);
        ctx.lineTo(padding.left, padding.top + plotH);
        ctx.closePath();
        ctx.fillStyle = grad;
        ctx.fill();

        const avgHist = [];
        for (let i = 0; i < hist.length; i++) {
            const slice = hist.slice(0, i + 1);
            avgHist.push(slice.reduce((a, b) => a + b, 0) / slice.length);
        }
        ctx.beginPath();
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 3]);
        avgHist.forEach((val, i) => {
            const x = padding.left + (plotW * i) / (avgHist.length - 1);
            const y = padding.top + plotH - (val / maxVal) * plotH;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = '#6b7280';
        ctx.font = '9px Segoe UI';
        ctx.textAlign = 'center';
        ctx.fillText('Xanh: TB luỹ kế | Xanh dương: mẫu', w / 2, h - 4);
    }

    function renderElevatorDetailCards() {
        if (!elevatorDetailContainer) return;
        elevatorDetailContainer.innerHTML = '';
        for (const e of systemState.elevators) {
            const card = document.createElement('div');
            card.style.cssText = 'padding:8px;margin:6px 12px;background:#1a1a26;border-radius:6px;border:1px solid #2a2a38;font-size:10px;line-height:1.6;';
            const targets = e.targetFloors.length ? e.targetFloors.join(',') : '—';
            const decel = computeDecelerationDistance(Math.abs(e.velocity), simConfig.maxAcceleration).toFixed(2);
            card.innerHTML = `
                <div style="font-weight:700;color:#7eb8ff;margin-bottom:4px">Thang ${e.id + 1}</div>
                <div>Tầng: <b>${e.position.toFixed(2)}</b> | v=${e.velocity.toFixed(2)} | a=${e.acceleration.toFixed(2)}</div>
                <div>Hướng: ${e.direction} | Phase: ${describeElevatorPhase(e.phase)}</div>
                <div>Cửa: ${describeDoorState(e.doorState)} | Lỗi: ${describeFault(e.faultStatus)}</div>
                <div>Tải: ${Math.round(e.currentLoad)}/${simConfig.maxLoad}kg | HK: ${e.passengers.length}</div>
                <div>Đích LOOK: [${targets}]</div>
                <div>Dừng khẩn ~${decel} tầng</div>`;
            elevatorDetailContainer.appendChild(card);
        }
    }

    function updateStatsDisplay() {
        const s = systemState.stats;
        if (dom.statsValues.avgWait) {
            dom.statsValues.avgWait.textContent = `${(s.avgWaitTime / 1000).toFixed(2)}s`;
        }
        if (dom.statsValues.served) dom.statsValues.served.textContent = String(s.totalServed);
        if (dom.statsValues.waiting) dom.statsValues.waiting.textContent = String(s.passengersWaiting);
        if (dom.statsValues.loads) {
            dom.statsValues.loads.textContent = s.loadPerElevator
                .map((l, i) => `T${i + 1}: ${l}kg`).join(' · ');
        }
        drawWaitTimeChart();
        renderElevatorDetailCards();
        sanitizeFloorQueues(systemState.floorQueues, systemState.allPassengers);
        pruneServedPassengers(systemState.allPassengers);
    }

    function buildPresetSection(panel) {
        const section = document.createElement('div');
        Object.assign(section.style, APP_STYLES.panelSection);
        const title = document.createElement('div');
        Object.assign(title.style, APP_STYLES.sectionTitle);
        title.textContent = 'Preset nhanh';
        section.appendChild(title);

        const select = document.createElement('select');
        select.style.cssText = 'width:100%;padding:8px;background:#111116;border:1px solid #3d3d52;border-radius:4px;color:#fff;font-size:12px;';
        CONFIG_PRESETS.forEach((p, i) => {
            const opt = document.createElement('option');
            opt.value = String(i);
            opt.textContent = p.name;
            select.appendChild(opt);
        });
        const btnApply = document.createElement('button');
        btnApply.textContent = 'Áp dụng preset';
        Object.assign(btnApply.style, { ...APP_STYLES.btnSecondary, width: '100%', marginTop: '8px' });
        btnApply.addEventListener('click', () => {
            const preset = CONFIG_PRESETS[parseInt(select.value, 10)];
            if (!preset) return;
            simConfig = mergeLoadedConfig(getDefaultSimConfig(), preset.config);
            const validation = validateSimConfig(simConfig);
            if (!validation.valid) {
                setStatusMessage(validation.errors.join(' '), true);
                return;
            }
            validation.warnings.forEach(w => eventLog.push('WARN', w));
            reinitSimulation();
            eventLog.push('CONFIG', `Preset: ${preset.name}`);
            if (eventLogContainer) eventLog.render(eventLogContainer);
        });
        section.appendChild(select);
        section.appendChild(btnApply);
        panel.appendChild(section);
    }

    function buildAlgorithmInfoPanel(panel) {
        const section = document.createElement('div');
        Object.assign(section.style, APP_STYLES.panelSection);
        const title = document.createElement('div');
        Object.assign(title.style, APP_STYLES.sectionTitle);
        title.textContent = 'Thuật toán LOOK/SCAN';
        section.appendChild(title);

        const info = document.createElement('div');
        info.style.cssText = 'font-size:11px;line-height:1.55;color:#9ca3af;';
        info.innerHTML = `
            <p><b style="color:#cbd5e1">Dispatcher</b> chấm điểm từng thang: khoảng cách, phạt ngược chiều (+${WRONG_DIRECTION_PENALTY}), phạt quá tải (+${OVERLOAD_PENALTY}), thưởng cùng chiều (-${SAME_DIRECTION_BONUS}).</p>
            <p><b style="color:#cbd5e1">sortTargetFloors</b> sắp xếp danh sách đích theo LOOK: ưu tiên cùng hướng, sau đó quay đầu.</p>
            <p><b style="color:#cbd5e1">Physics</b> dùng d=v²/(2a) để hãm; cửa mở/đóng theo SimConfig (ms).</p>
            <p><b style="color:#cbd5e1">Emergency</b>: overload &gt; ${OVERLOAD_FAULT_RATIO * 100}% maxLoad; stuck &gt; ${STUCK_THRESHOLD_MS / 1000}s v=0.</p>`;
        section.appendChild(info);
        panel.appendChild(section);
    }

    function buildEventLogPanel(panel) {
        const section = document.createElement('div');
        Object.assign(section.style, { ...APP_STYLES.panelSection, flex: '1', minHeight: '120px' });
        const title = document.createElement('div');
        Object.assign(title.style, APP_STYLES.sectionTitle);
        title.textContent = 'Nhật ký sự kiện';
        section.appendChild(title);
        eventLogContainer = document.createElement('div');
        eventLogContainer.style.cssText = 'max-height:140px;overflow-y:auto;';
        section.appendChild(eventLogContainer);
        const btnClear = document.createElement('button');
        btnClear.textContent = 'Xóa log';
        Object.assign(btnClear.style, { ...APP_STYLES.btnSecondary, width: '100%', marginTop: '6px' });
        btnClear.addEventListener('click', () => {
            eventLog.clear();
            eventLog.render(eventLogContainer);
        });
        section.appendChild(btnClear);

        const filterRow = document.createElement('div');
        filterRow.style.cssText = 'display:flex;gap:4px;margin-top:6px;flex-wrap:wrap;';
        ['', 'DISPATCH', 'FAULT', 'SURGE', 'INIT'].forEach(type => {
            const fb = document.createElement('button');
            fb.textContent = type || 'All';
            Object.assign(fb.style, { ...APP_STYLES.btnSpeed, fontSize: '9px', padding: '4px 6px' });
            fb.addEventListener('click', () => {
                eventLog.setFilter(type || null);
                eventLog.render(eventLogContainer);
            });
            filterRow.appendChild(fb);
        });
        section.appendChild(filterRow);

        const btnExport = document.createElement('button');
        btnExport.textContent = '📋 Xuất báo cáo';
        Object.assign(btnExport.style, { ...APP_STYLES.btnSecondary, width: '100%', marginTop: '6px' });
        btnExport.addEventListener('click', () => {
            const report = generateSimulationReport(systemState, simConfig);
            const blob = new Blob([report + '\n\n--- LOG ---\n' + eventLog.exportText()], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `elevator-report-${Date.now()}.txt`;
            a.click();
            URL.revokeObjectURL(url);
            setStatusMessage('Đã xuất báo cáo.');
        });
        section.appendChild(btnExport);
        panel.appendChild(section);
    }

    // =====================================================================
    // 6B — Control panel & config persistence
    // =====================================================================

    function updateConfig(key, value) {
        if (!(key in simConfig)) return;
        const numericKeys = ['totalFloors', 'elevatorCount', 'maxLoad', 'doorOpenTime', 'doorCloseTime', 'spawnRate', 'simSpeed'];
        if (numericKeys.includes(key) && key !== 'simSpeed') {
            simConfig[key] = typeof value === 'number' ? value : parseFloat(value);
        } else if (key === 'simSpeed') {
            simConfig[key] = parseInt(value, 10);
        } else {
            simConfig[key] = parseFloat(value);
        }
        reinitSimulation();
        refreshSliderDisplays();
        setupSpawnInterval();
        updateSpeedButtonStyles();
    }

    function refreshSliderDisplays() {
        for (const [key, el] of Object.entries(dom.sliderDisplays)) {
            if (el?.valueEl) {
                const v = simConfig[key];
                el.valueEl.textContent = key.includes('Time') || key === 'spawnRate'
                    ? `${Math.round(v)}ms` : key === 'maxLoad' ? `${v}kg` : String(v);
            }
            if (el?.input && document.activeElement !== el.input) {
                el.input.value = simConfig[key];
            }
        }
    }

    function createSliderRow(label, key, min, max, step, formatFn) {
        const row = document.createElement('div');
        Object.assign(row.style, APP_STYLES.sliderRow);
        const lbl = document.createElement('div');
        Object.assign(lbl.style, APP_STYLES.sliderLabel);
        const nameSpan = document.createElement('span');
        nameSpan.textContent = label;
        const valueSpan = document.createElement('span');
        Object.assign(valueSpan.style, APP_STYLES.sliderValue);
        valueSpan.textContent = formatFn(simConfig[key]);
        lbl.appendChild(nameSpan);
        lbl.appendChild(valueSpan);
        const input = document.createElement('input');
        input.type = 'range';
        input.min = String(min);
        input.max = String(max);
        input.step = String(step);
        input.value = String(simConfig[key]);
        Object.assign(input.style, APP_STYLES.sliderInput);
        input.addEventListener('input', () => {
            const val = step >= 1 ? parseInt(input.value, 10) : parseFloat(input.value);
            valueSpan.textContent = formatFn(val);
            updateConfig(key, val);
        });
        row.appendChild(lbl);
        row.appendChild(input);
        dom.sliderDisplays[key] = { input, valueEl: valueSpan };
        return row;
    }

    function buildControlPanel(container) {
        const panel = document.createElement('div');
        Object.assign(panel.style, APP_STYLES.controlPanel);
        dom.controlPanel = panel;

        const header = document.createElement('div');
        Object.assign(header.style, APP_STYLES.panelHeader);
        header.textContent = '⚙ Điều khiển mô phỏng';
        panel.appendChild(header);

        const configSection = document.createElement('div');
        Object.assign(configSection.style, APP_STYLES.panelSection);
        const configTitle = document.createElement('div');
        Object.assign(configTitle.style, APP_STYLES.sectionTitle);
        configTitle.textContent = 'Cấu hình (SimConfig)';
        configSection.appendChild(configTitle);

        configSection.appendChild(createSliderRow('Số tầng', 'totalFloors', 5, 40, 1, v => String(v)));
        configSection.appendChild(createSliderRow('Số thang', 'elevatorCount', 1, 6, 1, v => String(v)));
        configSection.appendChild(createSliderRow('Tải tối đa', 'maxLoad', 400, 1500, 50, v => `${v}kg`));
        configSection.appendChild(createSliderRow('Gia tốc max', 'maxAcceleration', 0.3, 2.5, 0.1, v => `${v} fl/s²`));
        configSection.appendChild(createSliderRow('Vận tốc max', 'maxVelocity', 0.5, 5, 0.1, v => `${v} fl/s`));
        configSection.appendChild(createSliderRow('Mở cửa', 'doorOpenTime', 500, 5000, 100, v => `${v}ms`));
        configSection.appendChild(createSliderRow('Đóng cửa', 'doorCloseTime', 500, 5000, 100, v => `${v}ms`));
        configSection.appendChild(createSliderRow('Tần suất spawn', 'spawnRate', 500, 15000, 100, v => `${v}ms`));
        panel.appendChild(configSection);

        const ctrlSection = document.createElement('div');
        Object.assign(ctrlSection.style, APP_STYLES.panelSection);
        const ctrlTitle = document.createElement('div');
        Object.assign(ctrlTitle.style, APP_STYLES.sectionTitle);
        ctrlTitle.textContent = 'Điều khiển';
        ctrlSection.appendChild(ctrlTitle);

        const btnRow = document.createElement('div');
        Object.assign(btnRow.style, APP_STYLES.btnRow);
        const btnStart = document.createElement('button');
        btnStart.textContent = '▶ Start';
        Object.assign(btnStart.style, APP_STYLES.btnPrimary);
        btnStart.addEventListener('click', () => startSimulation());

        const btnPause = document.createElement('button');
        btnPause.textContent = '⏸ Pause';
        Object.assign(btnPause.style, APP_STYLES.btnSecondary);
        btnPause.addEventListener('click', () => pauseSimulation());

        const btnReset = document.createElement('button');
        btnReset.textContent = '↺ Reset';
        Object.assign(btnReset.style, APP_STYLES.btnSecondary);
        btnReset.addEventListener('click', () => resetSimulation());

        btnRow.appendChild(btnStart);
        btnRow.appendChild(btnPause);
        btnRow.appendChild(btnReset);
        ctrlSection.appendChild(btnRow);

        const speedTitle = document.createElement('div');
        Object.assign(speedTitle.style, { ...APP_STYLES.sectionTitle, marginTop: '12px' });
        speedTitle.textContent = 'Tốc độ mô phỏng';
        ctrlSection.appendChild(speedTitle);

        const speedRow = document.createElement('div');
        Object.assign(speedRow.style, APP_STYLES.btnRow);
        [1, 2, 5, 10].forEach(speed => {
            const btn = document.createElement('button');
            btn.textContent = `${speed}x`;
            Object.assign(btn.style, APP_STYLES.btnSpeed);
            btn.dataset.speed = String(speed);
            btn.addEventListener('click', () => updateConfig('simSpeed', speed));
            dom.speedButtons.push(btn);
            speedRow.appendChild(btn);
        });
        ctrlSection.appendChild(speedRow);

        const btnSurge = document.createElement('button');
        btnSurge.textContent = '⚡ Inject Surge (20)';
        Object.assign(btnSurge.style, { ...APP_STYLES.btnDanger, marginTop: '12px' });
        btnSurge.addEventListener('click', () => injectSurge(20));
        ctrlSection.appendChild(btnSurge);

        const btnSave = document.createElement('button');
        btnSave.textContent = '💾 Lưu cấu hình';
        Object.assign(btnSave.style, { ...APP_STYLES.btnPrimary, marginTop: '8px', width: '100%' });
        btnSave.addEventListener('click', () => saveConfig());
        ctrlSection.appendChild(btnSave);

        panel.appendChild(ctrlSection);
        buildPresetSection(panel);
        buildAlgorithmInfoPanel(panel);
        buildEventLogPanel(panel);
        container.appendChild(panel);
        updateSpeedButtonStyles();
    }

    function updateSpeedButtonStyles() {
        dom.speedButtons.forEach(btn => {
            const active = parseInt(btn.dataset.speed, 10) === simConfig.simSpeed;
            Object.assign(btn.style, active ? { ...APP_STYLES.btnSpeed, ...APP_STYLES.btnSpeedActive } : APP_STYLES.btnSpeed);
        });
    }

    function buildSimulationView(container) {
        const center = document.createElement('div');
        Object.assign(center.style, APP_STYLES.simCenter);

        const toolbar = document.createElement('div');
        Object.assign(toolbar.style, APP_STYLES.simToolbar);
        toolbar.innerHTML = '<span>🏢 Mô phỏng tòa nhà</span><span data-sim-status>Paused</span>';
        center.appendChild(toolbar);

        const viewport = document.createElement('div');
        Object.assign(viewport.style, APP_STYLES.simViewport);
        dom.simViewport = viewport;

        const building = document.createElement('div');
        Object.assign(building.style, APP_STYLES.buildingWrap);
        dom.buildingWrap = building;

        const shaftHeight = getBuildingHeightPx(simConfig.totalFloors);

        for (let e = 0; e < simConfig.elevatorCount; e++) {
            const col = document.createElement('div');
            Object.assign(col.style, APP_STYLES.shaftColumn);

            const label = document.createElement('div');
            Object.assign(label.style, APP_STYLES.shaftLabel);
            label.textContent = `Thang ${e + 1}`;
            col.appendChild(label);

            const shaft = document.createElement('div');
            Object.assign(shaft.style, {
                ...APP_STYLES.shaftOuter,
                width: '88px',
                height: `${shaftHeight}px`
            });

            const trackWrap = document.createElement('div');
            trackWrap.style.position = 'relative';
            trackWrap.style.height = `${shaftHeight}px`;

            dom.floorIndicators[e] = [];

            for (let f = simConfig.totalFloors - 1; f >= 0; f--) {
                const row = document.createElement('div');
                Object.assign(row.style, APP_STYLES.floorRow);

                const floorInd = document.createElement('div');
                Object.assign(floorInd.style, APP_STYLES.floorIndicator);
                dom.floorIndicators[e][f] = floorInd;

                const track = document.createElement('div');
                Object.assign(track.style, APP_STYLES.floorTrack);
                track.appendChild(floorInd);
                row.appendChild(track);
                trackWrap.appendChild(row);
            }

            const cabin = document.createElement('div');
            Object.assign(cabin.style, APP_STYLES.cabin);
            cabin.style.top = '0';
            cabin.style.transform = `translateY(${positionToTranslateY(0, simConfig.totalFloors)}px)`;

            const cabinHeader = document.createElement('div');
            Object.assign(cabinHeader.style, APP_STYLES.cabinHeader);
            const floorInd = document.createElement('span');
            floorInd.dataset.floorInd = '1';
            floorInd.textContent = 'F0';
            const loadInd = document.createElement('span');
            loadInd.dataset.loadInd = '1';
            loadInd.textContent = `0/${simConfig.maxLoad}kg`;
            cabinHeader.appendChild(floorInd);
            cabinHeader.appendChild(loadInd);

            const doorContainer = document.createElement('div');
            Object.assign(doorContainer.style, APP_STYLES.doorContainer);
            const doorL = document.createElement('div');
            Object.assign(doorL.style, { ...APP_STYLES.doorPanel, ...APP_STYLES.doorPanelLeft });
            const doorR = document.createElement('div');
            Object.assign(doorR.style, { ...APP_STYLES.doorPanel, ...APP_STYLES.doorPanelRight });
            doorContainer.appendChild(doorL);
            doorContainer.appendChild(doorR);

            const dots = document.createElement('div');
            dots.dataset.dots = '1';
            Object.assign(dots.style, APP_STYLES.passengerDots);

            cabin.appendChild(cabinHeader);
            cabin.appendChild(doorContainer);
            cabin.appendChild(dots);
            trackWrap.appendChild(cabin);
            shaft.appendChild(trackWrap);
            col.appendChild(shaft);
            building.appendChild(col);

            dom.cabinElements[e] = cabin;
            dom.doorLeft[e] = doorL;
            dom.doorRight[e] = doorR;
            dom.shaftElements[e] = shaft;
        }

        const callCol = document.createElement('div');
        Object.assign(callCol.style, APP_STYLES.shaftColumn);
        const callLabel = document.createElement('div');
        Object.assign(callLabel.style, APP_STYLES.shaftLabel);
        callLabel.textContent = 'Hành lang';
        callCol.appendChild(callLabel);

        const callShaft = document.createElement('div');
        callShaft.style.height = `${shaftHeight}px`;

        for (let f = simConfig.totalFloors - 1; f >= 0; f--) {
            const row = document.createElement('div');
            Object.assign(row.style, APP_STYLES.floorRow);

            const num = document.createElement('div');
            Object.assign(num.style, APP_STYLES.floorNum);
            num.textContent = String(f);
            row.appendChild(num);

            const track = document.createElement('div');
            Object.assign(track.style, APP_STYLES.floorTrack);

            const badge = document.createElement('div');
            Object.assign(badge.style, APP_STYLES.waitBadge);
            dom.waitBadges[f] = badge;
            track.appendChild(badge);
            row.appendChild(track);

            const btns = document.createElement('div');
            Object.assign(btns.style, APP_STYLES.callButtons);
            const upBtn = document.createElement('button');
            upBtn.textContent = '▲';
            Object.assign(upBtn.style, APP_STYLES.callBtn);
            upBtn.title = `Gọi lên tầng ${f}`;
            upBtn.addEventListener('click', () => manualCall(f, 'up'));

            const downBtn = document.createElement('button');
            downBtn.textContent = '▼';
            Object.assign(downBtn.style, APP_STYLES.callBtn);
            downBtn.title = `Gọi xuống tầng ${f}`;
            downBtn.addEventListener('click', () => manualCall(f, 'down'));

            if (f < simConfig.totalFloors - 1) btns.appendChild(upBtn);
            if (f > 0) btns.appendChild(downBtn);

            dom.callButtons.up[f] = upBtn;
            dom.callButtons.down[f] = downBtn;

            row.appendChild(btns);
            callShaft.appendChild(row);
        }
        callCol.appendChild(callShaft);
        building.appendChild(callCol);

        viewport.appendChild(building);
        center.appendChild(viewport);
        container.appendChild(center);
    }

    function manualCall(floor, direction) {
        spawnPassengerAt(floor, direction);
    }

    function spawnPassengerAt(floor, direction) {
        let dest = direction === 'up'
            ? Math.min(simConfig.totalFloors - 1, floor + 1 + Math.floor(Math.random() * (simConfig.totalFloors - floor - 1)))
            : Math.max(0, Math.floor(Math.random() * floor));
        if (dest === floor) dest = direction === 'up' ? floor + 1 : floor - 1;
        const weight = gaussianRandom(72, 12, 45, 100);
        const passenger = {
            id: passengerIdCounter++,
            originFloor: floor,
            destinationFloor: dest,
            weight: Math.round(weight * 10) / 10,
            waitStartTime: performance.now(),
            boardTime: null,
            exitTime: null,
            state: PASSENGER_STATE.WAITING,
            direction
        };
        systemState.allPassengers.push(passenger);
        registerFloorCall(floor, direction, passenger.id);
    }

    function buildStatsPanel(container) {
        const panel = document.createElement('div');
        Object.assign(panel.style, APP_STYLES.statsPanel);

        const header = document.createElement('div');
        Object.assign(header.style, APP_STYLES.panelHeader);
        header.textContent = '📊 Thống kê';
        panel.appendChild(header);

        const makeStat = (key, label) => {
            const card = document.createElement('div');
            Object.assign(card.style, APP_STYLES.statCard);
            const lbl = document.createElement('div');
            Object.assign(lbl.style, APP_STYLES.statLabel);
            lbl.textContent = label;
            const val = document.createElement('div');
            Object.assign(val.style, APP_STYLES.statValue);
            val.textContent = '0';
            card.appendChild(lbl);
            card.appendChild(val);
            dom.statsValues[key] = val;
            return card;
        };

        panel.appendChild(makeStat('avgWait', 'Thời gian chờ TB'));
        panel.appendChild(makeStat('served', 'Đã phục vụ'));
        panel.appendChild(makeStat('waiting', 'Đang chờ'));

        const loadCard = document.createElement('div');
        Object.assign(loadCard.style, APP_STYLES.statCard);
        const loadLbl = document.createElement('div');
        Object.assign(loadLbl.style, APP_STYLES.statLabel);
        loadLbl.textContent = 'Tải từng thang';
        const loadVal = document.createElement('div');
        Object.assign(loadVal.style, { ...APP_STYLES.statValue, fontSize: '12px', lineHeight: '1.5' });
        dom.statsValues.loads = loadVal;
        loadCard.appendChild(loadLbl);
        loadCard.appendChild(loadVal);
        panel.appendChild(loadCard);

        const chartBox = document.createElement('div');
        Object.assign(chartBox.style, APP_STYLES.chartWrap);
        const chartTitle = document.createElement('div');
        Object.assign(chartTitle.style, APP_STYLES.chartTitle);
        chartTitle.textContent = 'Lịch sử thời gian chờ';
        const canvas = document.createElement('canvas');
        Object.assign(canvas.style, APP_STYLES.chartCanvas);
        canvas.width = 240;
        canvas.height = 140;
        dom.chartCanvas = canvas;
        dom.chartCtx = canvas.getContext('2d');
        chartBox.appendChild(chartTitle);
        chartBox.appendChild(canvas);
        panel.appendChild(chartBox);

        const detailTitle = document.createElement('div');
        Object.assign(detailTitle.style, { ...APP_STYLES.sectionTitle, margin: '8px 12px 0' });
        detailTitle.textContent = 'Trạng thái thang (realtime)';
        panel.appendChild(detailTitle);

        elevatorDetailContainer = document.createElement('div');
        elevatorDetailContainer.style.maxHeight = '220px';
        elevatorDetailContainer.style.overflowY = 'auto';
        panel.appendChild(elevatorDetailContainer);

        container.appendChild(panel);
    }

    function reinitSimulation() {
        pauseSimulation();
        passengerIdCounter = 1;
        floorServiceProfile = buildFloorServiceProfile(simConfig.totalFloors);
        systemState = createSystemState(simConfig);
        rebuildSimulationView();
        refreshSliderDisplays();
        updateStatsDisplay();
        setStatusMessage('Đã khởi tạo lại mô phỏng.');
    }

    function rebuildSimulationView() {
        if (!dom.root) return;
        const center = dom.root.querySelector('[data-sim-center]');
        if (center) center.remove();
        dom.cabinElements = [];
        dom.doorLeft = [];
        dom.doorRight = [];
        dom.shaftElements = [];
        dom.floorIndicators = [];
        dom.waitBadges = [];
        dom.callButtons = { up: [], down: [] };

        const centerWrap = document.createElement('div');
        centerWrap.dataset.simCenter = '1';
        buildSimulationView(centerWrap);
        const statsPanel = dom.root.querySelector('[data-stats-panel]');
        if (statsPanel) dom.root.insertBefore(centerWrap, statsPanel);
        else dom.root.appendChild(centerWrap);

        const statusEl = dom.root.querySelector('[data-sim-status]');
        if (statusEl) statusEl.textContent = simRunning ? 'Running' : 'Paused';
    }

    async function loadConfig() {
        if (auth.isGuest()) {
            const saved = auth.loadFromLocalStorage(CONFIG_STORAGE_KEY);
            if (saved) simConfig = mergeLoadedConfig(getDefaultSimConfig(), saved);
            return;
        }
        const user = auth.getCurrentUser();
        if (!user?.id) return;
        try {
            const res = await fetch(`${BACKEND_URL}/api/state/elevator/load?user_id=${user.id}`);
            const data = await res.json();
            if (data.success && data.config && Object.keys(data.config).length > 0) {
                simConfig = mergeLoadedConfig(getDefaultSimConfig(), data.config);
            }
        } catch (_) {
            const local = auth.loadFromLocalStorage(CONFIG_STORAGE_KEY);
            if (local) simConfig = mergeLoadedConfig(getDefaultSimConfig(), local);
        }
    }

    async function saveConfig() {
        if (auth.isGuest()) {
            auth.saveToLocalStorage(CONFIG_STORAGE_KEY, simConfig);
            setStatusMessage('Đã lưu cấu hình (khách) vào localStorage.');
            return;
        }
        const user = auth.getCurrentUser();
        if (!user?.id) return;
        try {
            const res = await fetch(`${BACKEND_URL}/api/state/elevator/save`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: user.id, config: simConfig })
            });
            const data = await res.json();
            if (data.success) {
                setStatusMessage('Đã lưu cấu hình lên server.');
            } else {
                setStatusMessage('Lưu server thất bại.', true);
            }
        } catch (_) {
            auth.saveToLocalStorage(CONFIG_STORAGE_KEY, simConfig);
            setStatusMessage('Offline — đã lưu localStorage.');
        }
    }

    function setupSpawnInterval() {
        if (spawnIntervalId) clearInterval(spawnIntervalId);
        const interval = Math.max(200, simConfig.spawnRate / simConfig.simSpeed);
        spawnIntervalId = setInterval(() => {
            if (simRunning) spawnPassenger();
        }, interval);
    }

    function setupStatsInterval() {
        if (statsIntervalId) clearInterval(statsIntervalId);
        statsIntervalId = setInterval(() => {
            updateStatsDisplay();
        }, STATS_UPDATE_MS);
    }

    function gameLoop(timestamp) {
        if (!simRunning) return;
        if (!lastFrameTime) lastFrameTime = timestamp;
        const delta = timestamp - lastFrameTime;
        lastFrameTime = timestamp;
        updatePhysics(delta);
        renderSimulation();
        rafId = requestAnimationFrame(gameLoop);
    }

    function startSimulation() {
        if (simRunning) return;
        simRunning = true;
        lastFrameTime = 0;
        const statusEl = dom.root?.querySelector('[data-sim-status]');
        if (statusEl) statusEl.textContent = 'Running';
        rafId = requestAnimationFrame(gameLoop);
        setStatusMessage('Mô phỏng đang chạy.');
    }

    function pauseSimulation() {
        simRunning = false;
        if (rafId) {
            cancelAnimationFrame(rafId);
            rafId = null;
        }
        const statusEl = dom.root?.querySelector('[data-sim-status]');
        if (statusEl) statusEl.textContent = 'Paused';
    }

    function resetSimulation() {
        pauseSimulation();
        reinitSimulation();
        setStatusMessage('Đã reset mô phỏng.');
    }

    function cleanup() {
        pauseSimulation();
        if (spawnIntervalId) clearInterval(spawnIntervalId);
        if (statsIntervalId) clearInterval(statsIntervalId);
        spawnIntervalId = null;
        statsIntervalId = null;
        const anime = getAnime();
        if (anime) {
            dom.cabinElements.forEach(el => el && anime.remove(el));
        }
    }

    // =====================================================================
    // 6G — Bootstrap UI & lifecycle
    // =====================================================================

    contentElement.innerHTML = '';
    Object.assign(contentElement.style, {
        padding: '0', margin: '0', height: '100%', overflow: 'hidden', background: '#0d0d12'
    });

    if (!getAnime()) {
        console.warn('[Elevator] anime.js chưa được nạp — kiểm tra index.html CDN.');
    }

    const root = document.createElement('div');
    Object.assign(root.style, APP_STYLES.root);
    dom.root = root;

    buildControlPanel(root);

    const centerWrap = document.createElement('div');
    centerWrap.dataset.simCenter = '1';
    buildSimulationView(centerWrap);
    root.appendChild(centerWrap);

    const statsWrap = document.createElement('div');
    statsWrap.dataset.statsPanel = '1';
    buildStatsPanel(statsWrap);
    root.appendChild(statsWrap);

    const statusMsg = document.createElement('div');
    Object.assign(statusMsg.style, APP_STYLES.statusMsg);
    statusMsg.textContent = 'Đang tải cấu hình...';
    dom.statusMsg = statusMsg;
    root.appendChild(statusMsg);

    contentElement.appendChild(root);

    const observer = new MutationObserver((mutations) => {
        for (const m of mutations) {
            for (const node of m.removedNodes) {
                if (node === contentElement || node.contains?.(contentElement)) {
                    cleanup();
                    observer.disconnect();
                }
            }
        }
    });
    if (contentElement.parentNode) {
        observer.observe(contentElement.parentNode, { childList: true });
    }

    loadConfig().then(() => {
        configLoaded = true;
        systemState = createSystemState(simConfig);
        rebuildSimulationView();
        refreshSliderDisplays();
        setupSpawnInterval();
        setupStatsInterval();
        updateStatsDisplay();
        const selfTests = runConfigSelfTest(simConfig);
        const failed = selfTests.filter(t => !t.pass);
        if (failed.length) {
            setStatusMessage(`Self-test cảnh báo: ${failed.map(f => f.name).join(', ')}`, true);
        } else {
            setStatusMessage('Sẵn sàng — nhấn Start để chạy mô phỏng.');
        }
        eventLog.push('INIT', `Cấu hình: ${simConfig.totalFloors}F / ${simConfig.elevatorCount} thang / ${simConfig.simSpeed}x`);
        if (eventLogContainer) eventLog.render(eventLogContainer);
    });
}

// -------------------------------------------------------------------------
// Configuration presets & validation (module scope)
// -------------------------------------------------------------------------

const CONFIG_PRESETS = [
    {
        name: 'Mặc định (20 tầng)',
        config: getDefaultSimConfig()
    },
    {
        name: 'Tòa thấp (10 tầng)',
        config: {
            totalFloors: 10, elevatorCount: 2, maxLoad: 630, maxAcceleration: 1.2,
            maxVelocity: 2.0, doorOpenTime: 1800, doorCloseTime: 1200, spawnRate: 4000, simSpeed: 1
        }
    },
    {
        name: 'Tòa cao (30 tầng)',
        config: {
            totalFloors: 30, elevatorCount: 4, maxLoad: 1000, maxAcceleration: 0.9,
            maxVelocity: 3.0, doorOpenTime: 2200, doorCloseTime: 1600, spawnRate: 2500, simSpeed: 1
        }
    },
    {
        name: 'Giờ cao điểm',
        config: {
            totalFloors: 20, elevatorCount: 3, maxLoad: 800, maxAcceleration: 1.0,
            maxVelocity: 2.5, doorOpenTime: 1500, doorCloseTime: 1200, spawnRate: 1200, simSpeed: 2
        }
    },
    {
        name: 'Kiểm tra quá tải',
        config: {
            totalFloors: 15, elevatorCount: 2, maxLoad: 500, maxAcceleration: 0.8,
            maxVelocity: 1.8, doorOpenTime: 2000, doorCloseTime: 1500, spawnRate: 800, simSpeed: 5
        }
    }
];

function validateSimConfig(config) {
    const errors = [];
    const warnings = [];
    if (!config || typeof config !== 'object') {
        errors.push('Config phải là object.');
        return { valid: false, errors, warnings };
    }
    if (config.totalFloors < 5 || config.totalFloors > 40) {
        errors.push('totalFloors phải trong [5, 40].');
    }
    if (config.elevatorCount < 1 || config.elevatorCount > 6) {
        errors.push('elevatorCount phải trong [1, 6].');
    }
    if (config.maxLoad < 300) warnings.push('maxLoad thấp — dễ overload.');
    if (config.maxAcceleration <= 0) errors.push('maxAcceleration phải > 0.');
    if (config.maxVelocity <= 0) errors.push('maxVelocity phải > 0.');
    if (config.doorOpenTime < config.doorCloseTime * 0.5) {
        warnings.push('doorOpenTime ngắn so với doorCloseTime.');
    }
    if (config.spawnRate < 300) warnings.push('spawnRate rất cao — CPU có thể tăng.');
    if (![1, 2, 5, 10].includes(config.simSpeed)) {
        errors.push('simSpeed phải là 1, 2, 5 hoặc 10.');
    }
    const minStopsPerTrip = config.maxVelocity / config.maxAcceleration;
    if (minStopsPerTrip > config.totalFloors / 2) {
        warnings.push('Vận tốc/gia tốc có thể gây dừng khẩn nhiều tầng.');
    }
    return { valid: errors.length === 0, errors, warnings };
}

function formatDurationMs(ms) {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
}

function describeElevatorPhase(phase) {
    const map = {
        [ELEVATOR_PHASE.IDLE]: 'Nghỉ',
        [ELEVATOR_PHASE.ACCELERATING]: 'Tăng tốc',
        [ELEVATOR_PHASE.CRUISING]: 'Hành trình',
        [ELEVATOR_PHASE.DECELERATING]: 'Giảm tốc',
        [ELEVATOR_PHASE.DOOR_SEQUENCE]: 'Cửa'
    };
    return map[phase] || phase;
}

function describeDoorState(state) {
    const map = {
        [DOOR_STATE.CLOSED]: 'Đóng',
        [DOOR_STATE.OPENING]: 'Đang mở',
        [DOOR_STATE.OPEN]: 'Mở',
        [DOOR_STATE.CLOSING]: 'Đang đóng'
    };
    return map[state] || state;
}

function describeFault(fault) {
    const map = {
        [FAULT_TYPE.NONE]: 'OK',
        [FAULT_TYPE.OVERLOAD]: 'Quá tải',
        [FAULT_TYPE.STUCK]: 'Kẹt'
    };
    return map[fault] || fault;
}

function computeDecelerationDistance(velocity, acceleration) {
    if (acceleration <= 0) return 0;
    return (velocity * velocity) / (2 * acceleration);
}

function computeTimeToReach(distance, maxVel, maxAccel) {
    if (distance <= 0 || maxAccel <= 0 || maxVel <= 0) return 0;
    const tAccel = maxVel / maxAccel;
    const dAccel = 0.5 * maxAccel * tAccel * tAccel;
    if (distance <= 2 * dAccel) {
        return 2 * Math.sqrt(distance / maxAccel);
    }
    const dCruise = distance - 2 * dAccel;
    return 2 * tAccel + dCruise / maxVel;
}

function sanitizeFloorQueues(floorQueues, allPassengers) {
    const validIds = new Set(allPassengers.filter(p => p.state === PASSENGER_STATE.WAITING).map(p => p.id));
    for (const q of floorQueues) {
        q.up = q.up.filter(id => validIds.has(id));
        q.down = q.down.filter(id => validIds.has(id));
    }
}

function pruneServedPassengers(allPassengers, maxKeep = 500) {
    if (allPassengers.length <= maxKeep) return;
    const active = allPassengers.filter(p => p.state !== PASSENGER_STATE.SERVED);
    const served = allPassengers.filter(p => p.state === PASSENGER_STATE.SERVED);
    const trimmed = served.slice(-Math.floor(maxKeep / 2));
    allPassengers.length = 0;
    allPassengers.push(...active, ...trimmed);
}

function summarizeDispatchScores(elevators, floor, direction, maxLoad) {
    return elevators.map(e => ({
        id: e.id,
        position: e.position,
        cost: (() => {
            let cost = Math.abs(e.position - floor) * 2;
            if (e.direction !== 'none' && e.direction !== direction) cost += WRONG_DIRECTION_PENALTY;
            const loadRatio = e.currentLoad / maxLoad;
            if (loadRatio > 0.85) cost += OVERLOAD_PENALTY * loadRatio;
            return Math.round(cost * 100) / 100;
        })()
    })).sort((a, b) => a.cost - b.cost);
}

class SimulationEventLog {
    constructor(maxEntries = 80) {
        this.maxEntries = maxEntries;
        this.entries = [];
        this.filterType = null;
    }

    push(type, message) {
        const entry = {
            type,
            message,
            time: new Date().toLocaleTimeString('vi-VN', { hour12: false })
        };
        this.entries.unshift(entry);
        if (this.entries.length > this.maxEntries) this.entries.pop();
    }

    setFilter(type) {
        this.filterType = type || null;
    }

    getFiltered() {
        if (!this.filterType) return this.entries;
        return this.entries.filter(e => e.type === this.filterType);
    }

    render(container) {
        if (!container) return;
        container.innerHTML = '';
        const list = this.getFiltered();
        if (list.length === 0) {
            const empty = document.createElement('div');
            empty.style.cssText = 'font-size:10px;color:#555;padding:6px 0;';
            empty.textContent = '(Không có sự kiện)';
            container.appendChild(empty);
            return;
        }
        for (const e of list) {
            const line = document.createElement('div');
            line.style.cssText = 'font-size:10px;padding:3px 0;border-bottom:1px solid #222;color:#9ca3af;';
            const color = e.type === 'FAULT' ? '#f87171' : e.type === 'SURGE' ? '#fbbf24' : '#7eb8ff';
            line.innerHTML = `<span style="color:#555">${e.time}</span> <span style="color:${color}">[${e.type}]</span> ${e.message}`;
            container.appendChild(line);
        }
    }

    exportText() {
        return this.entries.map(e => `${e.time} [${e.type}] ${e.message}`).join('\n');
    }

    clear() {
        this.entries = [];
    }
}

const DISPATCH_SCORE_WEIGHTS = Object.freeze({
    distanceMultiplier: 2,
    wrongDirection: WRONG_DIRECTION_PENALTY,
    overload: OVERLOAD_PENALTY,
    sameDirectionBonus: SAME_DIRECTION_BONUS,
    existingTargetBonus: -5,
    idleBonus: -2,
    faultPenalty: 100,
    doorNotClosedPenalty: 2
});

function explainDispatchScore(elevator, floor, direction, maxLoad) {
    const parts = [];
    const dist = Math.abs(elevator.position - floor);
    parts.push(`distance=${dist}×${DISPATCH_SCORE_WEIGHTS.distanceMultiplier}→${dist * 2}`);
    if (elevator.direction !== 'none' && elevator.direction !== direction) {
        parts.push(`wrongDir=+${DISPATCH_SCORE_WEIGHTS.wrongDirection}`);
    }
    const loadRatio = elevator.currentLoad / maxLoad;
    if (loadRatio > 0.85) parts.push(`overload≈+${(DISPATCH_SCORE_WEIGHTS.overload * loadRatio).toFixed(1)}`);
    if (elevator.direction === direction) parts.push(`sameDir=${DISPATCH_SCORE_WEIGHTS.sameDirectionBonus}`);
    if (elevator.targetFloors.includes(floor)) parts.push(`hasTarget=${DISPATCH_SCORE_WEIGHTS.existingTargetBonus}`);
    if (elevator.status === ELEVATOR_STATUS.IDLE) parts.push(`idle=${DISPATCH_SCORE_WEIGHTS.idleBonus}`);
    if (elevator.status === ELEVATOR_STATUS.FAULT) parts.push(`fault=+${DISPATCH_SCORE_WEIGHTS.faultPenalty}`);
    return parts.join(', ');
}

function buildFloorServiceProfile(totalFloors) {
    const profile = [];
    for (let f = 0; f < totalFloors; f++) {
        let category = 'office';
        if (f === 0) category = 'lobby';
        else if (f === totalFloors - 1) category = 'roof';
        else if (f % 5 === 0) category = 'meeting';
        else if (f >= totalFloors - 3) category = 'executive';
        profile.push({ floor: f, category, expectedSpawnWeight: category === 'lobby' ? 2.5 : 1 });
    }
    return profile;
}

function weightedRandomFloor(profile) {
    const total = profile.reduce((s, p) => s + p.expectedSpawnWeight, 0);
    let r = Math.random() * total;
    for (const p of profile) {
        r -= p.expectedSpawnWeight;
        if (r <= 0) return p.floor;
    }
    return profile[0].floor;
}

function drawChartGrid(ctx, w, h, padding, divisions = 4) {
    ctx.strokeStyle = '#2a2a38';
    ctx.lineWidth = 1;
    const plotW = w - padding.left - padding.right;
    const plotH = h - padding.top - padding.bottom;
    for (let i = 0; i <= divisions; i++) {
        const y = padding.top + (plotH * i) / divisions;
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(w - padding.right, y);
        ctx.stroke();
    }
    for (let i = 0; i <= divisions; i++) {
        const x = padding.left + (plotW * i) / divisions;
        ctx.beginPath();
        ctx.moveTo(x, padding.top);
        ctx.lineTo(x, padding.top + plotH);
        ctx.stroke();
    }
}

function drawChartSeries(ctx, points, w, h, padding, color, fillAlpha = 0.25) {
    if (points.length < 2) return;
    const plotW = w - padding.left - padding.right;
    const plotH = h - padding.top - padding.bottom;
    const maxVal = Math.max(...points, 1);
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    points.forEach((val, i) => {
        const x = padding.left + (plotW * i) / (points.length - 1);
        const y = padding.top + plotH - (val / maxVal) * plotH;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    });
    ctx.stroke();
    const lastX = padding.left + plotW;
    const baseY = padding.top + plotH;
    ctx.lineTo(lastX, baseY);
    ctx.lineTo(padding.left, baseY);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, padding.top, 0, baseY);
    grad.addColorStop(0, color.replace(')', `,${fillAlpha})`).replace('rgb', 'rgba'));
    if (color.startsWith('#')) {
        ctx.fillStyle = color + '40';
    } else {
        ctx.fillStyle = grad;
    }
    ctx.fill();
}

// -------------------------------------------------------------------------
// Diagnostics & reporting helpers (offline analysis / dev tools)
// -------------------------------------------------------------------------

function getElevatorSnapshot(elevator, config) {
    return {
        id: elevator.id,
        position: Number(elevator.position.toFixed(3)),
        velocity: Number(elevator.velocity.toFixed(3)),
        acceleration: Number(elevator.acceleration.toFixed(3)),
        direction: elevator.direction,
        doorState: elevator.doorState,
        phase: elevator.phase,
        status: elevator.status,
        faultStatus: elevator.faultStatus,
        currentLoad: elevator.currentLoad,
        passengerCount: elevator.passengers.length,
        targets: [...elevator.targetFloors],
        decelDistance: computeDecelerationDistance(Math.abs(elevator.velocity), config.maxAcceleration),
        etaNextStop: elevator.targetFloors.length
            ? computeTimeToReach(
                Math.abs((elevator.targetFloors[0] ?? elevator.position) - elevator.position),
                config.maxVelocity,
                config.maxAcceleration
            )
            : 0
    };
}

function getSystemSnapshot(systemState, config) {
    return {
        timestamp: Date.now(),
        config: deepCloneConfig(config),
        stats: { ...systemState.stats, waitTimeHistory: [...systemState.stats.waitTimeHistory] },
        elevators: systemState.elevators.map(e => getElevatorSnapshot(e, config)),
        queueDepth: systemState.floorQueues.map((q, f) => ({
            floor: f,
            up: q.up.length,
            down: q.down.length
        })),
        activePassengers: systemState.allPassengers.filter(p => p.state !== PASSENGER_STATE.SERVED).length
    };
}

function analyzeQueueFairness(floorQueues) {
    let maxDepth = 0;
    let totalWaiting = 0;
    let hottestFloor = 0;
    for (let f = 0; f < floorQueues.length; f++) {
        const depth = floorQueues[f].up.length + floorQueues[f].down.length;
        totalWaiting += depth;
        if (depth > maxDepth) {
            maxDepth = depth;
            hottestFloor = f;
        }
    }
    const avg = floorQueues.length ? totalWaiting / floorQueues.length : 0;
    return { maxDepth, totalWaiting, hottestFloor, averagePerFloor: avg };
}

function estimatePeakWaitTime(config, queueDepth) {
    const trips = Math.ceil(queueDepth / Math.max(1, config.elevatorCount));
    const avgTravel = config.totalFloors / 2;
    const tripTime = computeTimeToReach(avgTravel, config.maxVelocity, config.maxAcceleration);
    const doorTime = (config.doorOpenTime + config.doorCloseTime + 200) / 1000;
    return (trips * (tripTime + doorTime * 2)) * 1000;
}

function generateSimulationReport(systemState, config) {
    const fairness = analyzeQueueFairness(systemState.floorQueues);
    const peakMs = estimatePeakWaitTime(config, fairness.totalWaiting);
    const lines = [
        '=== BÁO CÁO MÔ PHỎNG THANG MÁY ===',
        `Thời điểm: ${new Date().toLocaleString('vi-VN')}`,
        `Cấu hình: ${config.totalFloors} tầng, ${config.elevatorCount} thang, tải ${config.maxLoad}kg`,
        `Đã phục vụ: ${systemState.stats.totalServed}`,
        `Đang chờ: ${systemState.stats.passengersWaiting}`,
        `Chờ TB: ${formatDurationMs(systemState.stats.avgWaitTime)}`,
        `Tầng đông nhất: ${fairness.hottestFloor} (depth ${fairness.maxDepth})`,
        `Ước tính chờ đỉnh: ~${formatDurationMs(peakMs)}`,
        '--- Trạng thái thang ---'
    ];
    for (const e of systemState.elevators) {
        const snap = getElevatorSnapshot(e, config);
        lines.push(
            `Thang ${snap.id + 1}: F${snap.position} ${snap.direction} ` +
            `${describeElevatorPhase(snap.phase)} load ${snap.currentLoad}kg targets [${snap.targets}]`
        );
    }
    return lines.join('\n');
}

function runConfigSelfTest(config) {
    const results = [];
    const validation = validateSimConfig(config);
    results.push({ name: 'validateSimConfig', pass: validation.valid, detail: validation.errors.join(';') || 'OK' });
    const state = createSystemState(config);
    results.push({ name: 'createSystemState', pass: state.elevators.length === config.elevatorCount, detail: `elevators=${state.elevators.length}` });
    results.push({ name: 'floorQueues', pass: state.floorQueues.length === config.totalFloors, detail: `queues=${state.floorQueues.length}` });
    const decel = computeDecelerationDistance(config.maxVelocity, config.maxAcceleration);
    results.push({ name: 'decelDistance', pass: decel > 0, detail: `d=${decel.toFixed(2)} floors` });
    const t = computeTimeToReach(config.totalFloors, config.maxVelocity, config.maxAcceleration);
    results.push({ name: 'timeToTop', pass: t > 0, detail: `t=${t.toFixed(2)}s` });
    return results;
}

/**
 * Reference: initElevatorSimulation(contentElement)
 * Entry point for Web OS window content. Builds three-column UI, loads persisted
 * SimConfig (guest localStorage / user API), wires rAF physics loop, spawn interval,
 * and statistics refresh. Returns void; registers MutationObserver cleanup.
 *
 * Reference: dispatchElevator({ floor, direction })
 * Multi-criteria LOOK dispatcher. Returns assigned elevator id or -1.
 *
 * Reference: sortTargetFloors(elevatorId)
 * Reorders targetFloors array in-place using LOOK scan direction rules.
 *
 * Reference: detectEmergency(elevatorId, deltaMs)
 * Sets fault on overload (>110% maxLoad) or stuck (v≈0 for 5s with pending work).
 *
 * Reference: updatePhysics(deltaTimeMs)
 * Integrates all elevator motion for one frame; applies simSpeed multiplier.
 *
 * Reference: handleFloorStop(elevatorId)
 * Triggers door sequence, passenger exchange, queue updates at current floor.
 *
 * Reference: spawnPassenger() / injectSurge(n)
 * Stochastic passenger generation with Gaussian weight 45–100kg.
 *
 * Reference: buildControlPanel / buildSimulationView / buildStatsPanel
 * Construct DOM with inline APP_STYLES; bind sliders to updateConfig → reinitSimulation.
 *
 * Reference: saveConfig / loadConfig
 * guest → localStorage key elevatorConfig; user → POST/GET localhost:8000 elevator APIs.
 */

const PHASE6_CHECKLIST = {
    '6A_DataStructures': [
        'SimConfig defaults (20 floors, 3 elevators, 800kg, a=1, v=2.5, doors, spawn)',
        'SystemState: elevators[], floorQueues[{up,down}], stats',
        'Elevator entity with phase, doorTimer, faultStatus, targetFloors LOOK list',
        'Passenger entity with weight, wait/board/exit timestamps, state machine',
        'stats: avgWaitTime, totalServed, passengersWaiting, loadPerElevator[], waitTimeHistory[]'
    ],
    '6B_ControlPanel': [
        'Sliders for all SimConfig keys → updateConfig re-inits',
        'Start / Pause / Reset',
        'Speed 1x 2x 5x 10x',
        'Inject Surge 20',
        'Statistics panel 1s refresh',
        'Save Config guest localStorage / user POST save API'
    ],
    '6C_Dispatcher': [
        'dispatchElevator LOOK/SCAN cost score',
        'sortTargetFloors LOOK ordering',
        'detectEmergency overload and stuck'
    ],
    '6D_Physics': [
        'rAF loop deltaTime * simSpeed',
        'Deceleration d = v²/(2a)',
        'Accelerate / cruise / decelerate phases',
        'handleFloorStop door open close load unload'
    ],
    '6E_Passengers': [
        'spawnPassenger random floors gaussian weight',
        'setInterval spawn spawnRate/simSpeed',
        'injectSurge(20)',
        'calculateAverageWaitTime'
    ],
    '6F_Graphics': [
        'buildSimulationView shafts floors cabins call buttons wait badges',
        'renderSimulation anime translateY cabins',
        'Door anime scaleX panels',
        'Floor indicator flash on stop',
        'Wait count pulse anime',
        'Fault blink red',
        'Passenger dots enter exit',
        'Canvas chart avg wait history 1s'
    ],
    '6G_LoadOnInit': [
        'User GET load merge SimConfig',
        'Guest localStorage elevatorConfig',
        'Else defaults',
        'cleanup on container remove'
    ]
};

function printPhase6Checklist(consoleRef = console) {
    for (const [section, items] of Object.entries(PHASE6_CHECKLIST)) {
        consoleRef.log(`[${section}]`);
        items.forEach((item, i) => consoleRef.log(`  ${i + 1}. ${item}`));
    }
}

// Expose diagnostics on window for manual QA in browser console (non-breaking)
if (typeof window !== 'undefined') {
    window.__elevatorDiagnostics = {
        validateSimConfig,
        runConfigSelfTest,
        getSystemSnapshot,
        generateSimulationReport,
        analyzeQueueFairness,
        printPhase6Checklist,
        CONFIG_PRESETS,
        getDefaultSimConfig
    };
}

// =========================================================================
// Extended documentation — Phase 6 architecture reference
// =========================================================================
/*
 * SimConfig drives all timing and capacity limits. SystemState holds runtime
 * elevators, per-floor up/down queues, and rolling statistics. Each Elevator
 * tracks continuous position (floor units), velocity, acceleration, LOOK target
 * list, door FSM, passengers aboard, fault flags, and stuck detection timer.
 *
 * dispatchElevator() scores every cab: base distance, wrong-direction penalty,
 * overload penalty, same-direction bonus; winner receives the floor in
 * targetFloors then sortTargetFloors() applies LOOK ordering.
 *
 * updatePhysics() integrates motion with v²/(2a) braking distance, handles
 * floor stops via door open/hold/close, unloads/loads passengers, re-dispatches.
 *
 * initElevatorSimulation() builds dark three-column UI, loads guest/user config,
 * runs rAF + spawn + stats intervals, and cleans up on window teardown.
 */







