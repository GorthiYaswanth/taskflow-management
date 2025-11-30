import React from 'react';
import { useTimeTracking } from '../../contexts/TimeTrackingContext';
import { Play, Pause, Square, Timer, Clock } from 'lucide-react';
import Card from '../UI/Card';
import Button from '../UI/Button';

const CompactTimeTracker = () => {
  const {
    activeSession,
    isRunning,
    timeElapsed,
    totalTimeToday,
    startTimer,
    pauseTimer,
    stopTimer,
    formatTime
  } = useTimeTracking();

  const handleStart = async () => {
    try {
      await startTimer('dashboard-timer', 'General Work');
    } catch (error) {
      console.error('Failed to start timer:', error);
    }
  };

  const handlePause = async () => {
    try {
      await pauseTimer();
    } catch (error) {
      console.error('Failed to pause timer:', error);
    }
  };

  const handleStop = async () => {
    try {
      await stopTimer();
    } catch (error) {
      console.error('Failed to stop timer:', error);
    }
  };

  return (
    <Card className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Timer className="h-4 w-4 text-blue-600" />
          <h3 className="font-semibold text-gray-900 text-sm">Time Tracker</h3>
        </div>
        {activeSession && (
          <div className="text-xs text-gray-500">
            {activeSession.task_title}
          </div>
        )}
      </div>

      <div className="text-center mb-3">
        <div className="text-2xl font-bold text-blue-600 mb-1">
          {formatTime(timeElapsed)}
        </div>
        <div className="text-xs text-gray-500">
          Current Session
        </div>
      </div>

      <div className="flex justify-center gap-1 mb-3">
        {!isRunning ? (
          <Button
            onClick={handleStart}
            size="sm"
            className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-lg flex items-center gap-1 text-xs"
          >
            <Play className="h-3 w-3" />
            Start
          </Button>
        ) : (
          <Button
            onClick={handlePause}
            size="sm"
            className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded-lg flex items-center gap-1 text-xs"
          >
            <Pause className="h-3 w-3" />
            Pause
          </Button>
        )}
        
        <Button
          onClick={handleStop}
          size="sm"
          className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-lg flex items-center gap-1 text-xs"
        >
          <Square className="h-3 w-3" />
          Stop
        </Button>
      </div>

      <div className="border-t pt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3 text-gray-500" />
            <span className="text-xs font-medium text-gray-700">Today</span>
          </div>
          <span className="text-sm font-bold text-gray-900">{formatTime(totalTimeToday)}</span>
        </div>
      </div>
    </Card>
  );
};

export default CompactTimeTracker;
