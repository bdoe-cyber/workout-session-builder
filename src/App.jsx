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

  // Total minutes just for display
  const totalMinutes = useMemo(
    () => session.reduce((sum, item) => sum + item.minutes, 0),
    [session]
  );

  const sessionTotalSeconds = useMemo(
    () => session.reduce((sum, item) => sum + item.minutes * 60, 0),
    [session]
  );

  const filteredWorkouts =
    selectedCategory === "all"
      ? WORKOUTS
      : WORKOUTS.filter((w) => w.category === selectedCategory);

  // ✅ Shared helper: add a workout to the session
  const addWorkoutToSession = (workoutId) => {
    const workout = WORKOUTS.find((w) => w.id === workoutId);
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
  };

  const handleDragStart = (workoutId) => {
    setDraggedWorkoutId(workoutId);
  };

  const handleDragEnd = () => {
    setDraggedWorkoutId(null);
  };

  const handleTimelineDrop = (event) => {
    event.preventDefault();
    if (!draggedWorkoutId) return;

    addWorkoutToSession(draggedWorkoutId);
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

  // Run the timer
  useEffect(() => {
    if (!isTimerRunning || session.length === 0) return;

    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isTimerRunning, session.length]);

  // Figure out current block, seconds into it, etc.
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

  // Visual progress percentages (0 → 100)
  const sessionProgressPercent =
    sessionTotalSeconds === 0
      ? 0
      : Math.min(
          100,
          (elapsedSeconds / sessionTotalSeconds) * 100
        );

  const currentBlockProgressPercent =
    currentBlockIndex === -1
      ? 0
      : Math.min(
          100,
          (secondsIntoCurrentBlock /
            (session[currentBlockIndex].minutes * 60)) *
            100
        );

  // Stop timer when session is done
  useEffect(() => {
    if (!isTimerRunning) return;
    if (sessionTotalSeconds > 0 && elapsedSeconds >= sessionTotalSeconds) {
      setIsTimerRunning(false);
    }
  }, [elapsedSeconds, isTimerRunning, sessionTotalSeconds]);

  // Show popup 1 minute before current block ends
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
        Drag exercises from the left, or tap “Add to Session”, then adjust time
        to build your workout.
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

                  {/* Mobile-friendly tap behavior */}
                  <button
                    type="button"
                    onClick={() => addWorkoutToSession(w.id)}
                    className="add-to-session-btn"
                  >
                    Add to Session
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: session with timer underneath */}
        <div className="column">
          {/* SESSION LIST */}
          <h2>Your Session</h2>

          <div
            className={`timeline ${
              draggedWorkoutId ? "timeline-droppable" : ""
            }`}
            onDragOver={handleTimelineDragOver}
            onDrop={handleTimelineDrop}
          >
            {session.length === 0 && (
              <p className="placeholder">
                Drag workouts from the left, or tap “Add to Session”, to start
                building your workout.
              </p>
            )}

            {session.map((item, index) => {
              const workout = getWorkout(item.workoutId);
              const cat = CATEGORIES[workout.category];

              const baseHeight = 50; // minimum height
              const pixelsPerMinute = 3; // extra height per minute
              const heightPx =
                baseHeight + item.minutes * pixelsPerMinute;

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

          {/* TIMER PANEL UNDER SESSION */}
          <div className="timer-panel">
            <div className="timer-main">
              <div className="timer-label">Session Time</div>
              <div className="timer-time">
                {formatTime(elapsedSeconds)}{" "}
                <span className="timer-time-sub">
                  of {formatTime(sessionTotalSeconds)}
                </span>
              </div>

              {/* Visual session progress bar */}
              <div className="timer-progress">
                <div
                  className="timer-progress-inner"
                  style={{ width: `${sessionProgressPercent}%` }}
                />
              </div>
            </div>

            <div className="timer-details">
              <div>
                <div className="timer-label">Current Workout</div>
                <div className="timer-current timer-current-workout">
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

                {/* Visual progress for current block */}
                <div className="timer-progress timer-progress-block">
                  <div
                    className="timer-progress-inner"
                    style={{
                      width: `${currentBlockProgressPercent}%`,
                    }}
                  />
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
  );
}

export default App;
