import React, { useState, useEffect } from 'react';
import { Play, Pause, Square, Timer, Clock } from 'lucide-react';
import Card from '../UI/Card';
import Button from '../UI/Button';

const TimeTracker = ({ taskId, taskTitle, onTimeUpdate }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [startTime, setStartTime] = useState(null);
  const [sessions, setSessions] = useState([]);

  useEffect(() => {
    let interval = null;
    if (isRunning) {
      interval = setInterval(() => {
        setTimeElapsed(Date.now() - startTime);
      }, 1000);
    } else if (!isRunning && timeElapsed !== 0) {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isRunning, startTime, timeElapsed]);

  const formatTime = (ms) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const startTimer = () => {
    setStartTime(Date.now());
    setIsRunning(true);
  };

  const pauseTimer = () => {
    setIsRunning(false);
    const session = {
      id: Date.now(),
      startTime: startTime,
      endTime: Date.now(),
      duration: timeElapsed,
      taskId: taskId,
      taskTitle: taskTitle
    };
    setSessions([...sessions, session]);
    if (onTimeUpdate) {
      onTimeUpdate(session);
    }
  };

  const stopTimer = () => {
    setIsRunning(false);
    if (timeElapsed > 0) {
      const session = {
        id: Date.now(),
        startTime: startTime,
        endTime: Date.now(),
        duration: timeElapsed,
        taskId: taskId,
        taskTitle: taskTitle
      };
      setSessions([...sessions, session]);
      if (onTimeUpdate) {
        onTimeUpdate(session);
      }
    }
    setTimeElapsed(0);
    setStartTime(null);
  };

  const totalTime = sessions.reduce((acc, session) => acc + session.duration, 0) + timeElapsed;

  return (
    <Card className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Timer className="h-5 w-5 text-blue-600" />
          <h3 className="font-semibold text-gray-900">Time Tracker</h3>
        </div>
        <div className="text-sm text-gray-500">
          {taskTitle && `Task: ${taskTitle}`}
        </div>
      </div>

      <div className="text-center mb-4">
        <div className="text-3xl font-bold text-blue-600 mb-2">
          {formatTime(timeElapsed)}
        </div>
        <div className="text-sm text-gray-500">
          Current Session
        </div>
      </div>

      <div className="flex justify-center gap-2 mb-4">
        {!isRunning ? (
          <Button
            onClick={startTimer}
            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <Play className="h-4 w-4" />
            Start
          </Button>
        ) : (
          <Button
            onClick={pauseTimer}
            className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <Pause className="h-4 w-4" />
            Pause
          </Button>
        )}
        
        <Button
          onClick={stopTimer}
          className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <Square className="h-4 w-4" />
          Stop
        </Button>
      </div>

      {sessions.length > 0 && (
        <div className="border-t pt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Total Time Today</span>
            <span className="text-lg font-bold text-gray-900">{formatTime(totalTime)}</span>
          </div>
          
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {sessions.slice(-3).map((session) => (
              <div key={session.id} className="flex items-center justify-between text-sm bg-white p-2 rounded border">
                <span className="text-gray-600">{session.taskTitle}</span>
                <span className="font-medium">{formatTime(session.duration)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
};

export default TimeTracker;
