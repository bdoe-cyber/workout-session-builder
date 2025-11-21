// src/App.jsx
import { useState, useMemo, useEffect } from "react";
import { WORKOUTS } from "./data/workouts";
import { CATEGORIES } from "./data/categories";
import "./index.css";

function App() {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [session, setSession] = useState([]); // {id, workoutId, minutes}[]
  const [draggedWorkoutId, setDraggedWorkoutId] = useState(null);

  // Timer state
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showNextPopup, setShowNextPopup] = useState(false);

  // Total minutes (for display)
  const totalMinutes = useMemo(
    () => session.reduce((sum, item) => sum + item.minutes, 0),
    [session]
  );

  const sessionTotalSeconds = useMemo(
    () => session.reduce((sum, item) => sum + item.minutes * 60, 0),
    [session]
  );

  // Overall progress through the session (0–100%), used for the yellow bar behind blocks
  const progressPercent = useMemo(() => {
    if (sessionTotalSeconds === 0) return 0;
    const clamped = Math.min(elapsedSeconds, sessionTotalSeconds);
    return (clamped / sessionTotalSeconds) * 100;
  }, [elapsedSeconds, sessionTotalSeconds]);

  const filteredWorkouts =
    selectedCategory === "all"
      ? WORKOUTS
      : WORKOUTS.filter((w) => w.category === selectedCategory);

  const handleDragStart = (workoutId) => {
    setDraggedWorkoutId(workoutId);
  };

  const handleDragEnd = () => {
    setDraggedWorkoutId(null);
  };

  const handleTimelineDrop = (event) => {
    event.preventDefault();
    if (!draggedWorkoutId) return;

    const workout = WORKOUTS.find((w) => w.id === draggedWorkoutId);
    if (!workout) return;

    const defaultMinutes = 5;

    const newItem = {
      id: crypto.randomUUID
        ? crypto.randomUUID()
        : String(Date.now() + Math.random()),
      workoutId: workout.id,
      minutes: defaultMinutes,
    };

    setSession((prev) => [...prev, newItem]);
    setDraggedWorkoutId(null);
  };

  const handleTimelineDragOver = (event) => {
    event.preventDefault(); // allow drop
  };

  const updateMinutes = (itemId, newMinutes) => {
    let minutes = Number(newMinutes);
    if (minutes < 1) minutes = 1;

    setSession((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, minutes } : item
      )
    );
  };

  const removeItem = (itemId) => {
    setSession((prev) => prev.filter((item) => item.id !== itemId));
  };

  const getWorkout = (workoutId) =>
    WORKOUTS.find((w) => w.id === workoutId);

  // Run the timer (we do NOT reset on session changes)
  useEffect(() => {
    if (!isTimerRunning || session.length === 0) return;

    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isTimerRunning, session.length]);

  // Determine the current block (for labels & popup)
  let currentBlockIndex = -1;
  let secondsIntoCurrentBlock = 0;

  if (session.length > 0 && elapsedSeconds < sessionTotalSeconds) {
    let accumulated = 0;
    for (let i = 0; i < session.length; i++) {
      const duration = session[i].minutes * 60;
      if (elapsedSeconds < accumulated + duration) {
        currentBlockIndex = i;
        secondsIntoCurrentBlock = elapsedSeconds - accumulated;
        break;
      }
      accumulated += duration;
    }
  }

  const secondsRemainingInBlock =
    currentBlockIndex === -1
      ? 0
      : session[currentBlockIndex].minutes * 60 - secondsIntoCurrentBlock;

  const totalRemainingSeconds = Math.max(
    sessionTotalSeconds - elapsedSeconds,
    0
  );

  // Stop timer at end
  useEffect(() => {
    if (!isTimerRunning) return;
    if (sessionTotalSeconds > 0 && elapsedSeconds >= sessionTotalSeconds) {
      setIsTimerRunning(false);
    }
  }, [elapsedSeconds, isTimerRunning, sessionTotalSeconds]);

  // Popup 1 minute before block ends
  useEffect(() => {
    if (!isTimerRunning) return;
    if (currentBlockIndex === -1) return;
    if (secondsRemainingInBlock !== 60) return;

    setShowNextPopup(true);
    const timeout = setTimeout(() => {
      setShowNextPopup(false);
    }, 3000);

    return () => clearTimeout(timeout);
  }, [secondsRemainingInBlock, isTimerRunning, currentBlockIndex]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const handleStart = () => {
    if (session.length === 0) return;
    // Always start from the beginning
    setElapsedSeconds(0);
    setShowNextPopup(false);
    setIsTimerRunning(true);
  };

  const handlePause = () => {
    setIsTimerRunning(false);
  };

  const handleReset = () => {
    setIsTimerRunning(false);
    setElapsedSeconds(0);
    setShowNextPopup(false);
  };

  return (
    <div className="app">
      <h1>Workout Session Builder</h1>
      <p className="subtitle">
        Drag exercises from the left into your session. Adjust their time to build a custom workout.
      </p>

      <p className="total-time">
        Total: <strong>{totalMinutes}</strong> min
      </p>

      <div className="layout">
        {/* LEFT COLUMN: workout library */}
        <div className="column">
          <h2>Available Workouts</h2>

          <div className="category-filter">
            <button
              className={selectedCategory === "all" ? "active" : ""}
              onClick={() => setSelectedCategory("all")}
            >
              All
            </button>
            {Object.values(CATEGORIES).map((cat) => (
              <button
                key={cat.id}
                className={selectedCategory === cat.id ? "active" : ""}
                onClick={() => setSelectedCategory(cat.id)}
              >
                <span
                  className="color-dot"
                  style={{ backgroundColor: cat.color }}
                />
                {cat.label}
              </button>
            ))}
          </div>

          <div className="exercise-list">
            {filteredWorkouts.map((w) => {
              const cat = CATEGORIES[w.category];
              return (
                <div
                  key={w.id}
                  className="exercise-block"
                  style={{ borderLeft: `4px solid ${cat.color}` }}
                  draggable
                  onDragStart={() => handleDragStart(w.id)}
                  onDragEnd={handleDragEnd}
                  title="Drag this into your session"
                >
                  <div className="exercise-name">{w.name}</div>
                  <div className="exercise-category">{cat.label}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: session + timer side by side */}
        <div className="column">
          <div className="session-row">
            {/* SESSION LIST ON THE LEFT */}
            <div className="session-column">
              <h2>Your Session</h2>

              {/* wrapper lets us put the yellow bar behind the blocks */}
              <div className="timeline-wrapper">
                {/* yellow bar that grows from top down based on total progress */}
                <div
                  className="timeline-progress"
                  style={{ height: `${progressPercent}%` }}
                />

                <div
                  className={`timeline ${
                    draggedWorkoutId ? "timeline-droppable" : ""
                  }`}
                  onDragOver={handleTimelineDragOver}
                  onDrop={handleTimelineDrop}
                >
                  {session.length === 0 && (
                    <p className="placeholder">
                      Drag workouts from the left and drop them here to start
                      building your session.
                    </p>
                  )}

                  {session.map((item, index) => {
                    const workout = getWorkout(item.workoutId);
                    const cat = CATEGORIES[workout.category];

                    // Height is proportional ONLY to minutes
                    const pixelsPerMinute = 10; // tweak if too big/small
                    const heightPx = item.minutes * pixelsPerMinute;

                    const isCurrent = index === currentBlockIndex;

                    return (
                      <div
                        key={item.id}
                        className={`timeline-item ${
                          isCurrent ? "timeline-item-current" : ""
                        }`}
                        style={{
                          height: `${heightPx}px`,
                          backgroundColor: cat.color,
                        }}
                      >
                        <div className="timeline-header">
                          <span>{workout.name}</span>
                          <button
                            className="remove-btn"
                            onClick={() => removeItem(item.id)}
                          >
                            ✕
                          </button>
                        </div>

                        <div className="timeline-controls">
                          <input
                            type="range"
                            min="1"
                            max="60"
                            value={item.minutes}
                            onChange={(e) =>
                              updateMinutes(item.id, e.target.value)
                            }
                          />
                          <span className="minutes-label">
                            {item.minutes} min
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {session.length > 0 && (
                <button
                  className="clear-session-btn"
                  onClick={() => {
                    handleReset();
                    setSession([]);
                  }}
                >
                  Clear Session
                </button>
              )}
            </div>

            {/* TIMER PANEL ON THE RIGHT */}
            <div className="timer-panel">
              <div className="timer-main">
                <div className="timer-label">Session Time</div>
                <div className="timer-time">
                  {formatTime(elapsedSeconds)}{" "}
                  <span className="timer-time-sub">
                    / {formatTime(sessionTotalSeconds)}
                  </span>
                </div>
              </div>

              <div className="timer-details">
                <div>
                  <div className="timer-label">Current Workout</div>
                  <div className="timer-current">
                    {currentBlockIndex === -1
                      ? "—"
                      : getWorkout(
                          session[currentBlockIndex].workoutId
                        )?.name}
                  </div>
                </div>
                <div>
                  <div className="timer-label">Time left in block</div>
                  <div className="timer-current">
                    {currentBlockIndex === -1
                      ? "—"
                      : formatTime(secondsRemainingInBlock)}
                  </div>
                </div>
                <div>
                  <div className="timer-label">Time left in session</div>
                  <div className="timer-current">
                    {formatTime(totalRemainingSeconds)}
                  </div>
                </div>
              </div>

              <div className="timer-buttons">
                <button
                  onClick={handleStart}
                  disabled={session.length === 0 || isTimerRunning}
                >
                  Start
                </button>
                <button onClick={handlePause} disabled={!isTimerRunning}>
                  Pause
                </button>
                <button
                  onClick={handleReset}
                  disabled={session.length === 0}
                >
                  Reset
                </button>
              </div>

              {showNextPopup && (
                <div className="timer-popup">Next workout in 1 min</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
