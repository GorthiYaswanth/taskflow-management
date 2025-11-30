import React, { createContext, useContext, useState, useEffect } from 'react';
import { timeTrackingAPI } from '../services/api';

const TimeTrackingContext = createContext();

export const useTimeTracking = () => {
  const context = useContext(TimeTrackingContext);
  if (!context) {
    throw new Error('useTimeTracking must be used within a TimeTrackingProvider');
  }
  return context;
};

export const TimeTrackingProvider = ({ children }) => {
  const [activeSession, setActiveSession] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [startTime, setStartTime] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [totalTimeToday, setTotalTimeToday] = useState(0);

  // Load active session on mount
  useEffect(() => {
    loadActiveSession();
    loadTodaySessions();
  }, []);

  // Timer effect
  useEffect(() => {
    let interval = null;
    if (isRunning && startTime) {
      interval = setInterval(() => {
        setTimeElapsed(Date.now() - startTime);
      }, 1000);
    } else if (!isRunning && timeElapsed !== 0) {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isRunning, startTime, timeElapsed]);

  const loadActiveSession = async () => {
    try {
      const response = await timeTrackingAPI.getActiveSession();
      if (response.data && response.data.is_active) {
        setActiveSession(response.data);
        setIsRunning(true);
        setStartTime(new Date(response.data.start_time).getTime());
        setTimeElapsed(Date.now() - new Date(response.data.start_time).getTime());
      }
    } catch (error) {
      console.log('No active session found');
    }
  };

  const loadTodaySessions = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await timeTrackingAPI.getTimeSessions({ 
        date: today,
        ordering: '-start_time'
      });
      setSessions(response.data.results || response.data || []);
      
      // Calculate total time for today
      const total = (response.data.results || response.data || [])
        .reduce((acc, session) => acc + (session.duration || 0), 0);
      setTotalTimeToday(total);
    } catch (error) {
      console.error('Failed to load today sessions:', error);
    }
  };

  const startTimer = async (taskId, taskTitle) => {
    try {
      // Stop any existing session first
      if (activeSession) {
        await stopTimer();
      }

      const response = await timeTrackingAPI.startSession(taskId);
      const session = response.data;
      
      setActiveSession(session);
      setStartTime(Date.now());
      setIsRunning(true);
      setTimeElapsed(0);
      
      return session;
    } catch (error) {
      console.error('Failed to start timer:', error);
      throw error;
    }
  };

  const pauseTimer = async () => {
    if (!activeSession) return;

    try {
      const sessionData = {
        end_time: new Date().toISOString(),
        duration: timeElapsed,
        is_active: false
      };

      await timeTrackingAPI.updateTimeSession(activeSession.id, sessionData);
      
      // Add to local sessions
      const completedSession = {
        ...activeSession,
        ...sessionData,
        task_title: activeSession.task_title
      };
      
      setSessions(prev => [completedSession, ...prev]);
      setTotalTimeToday(prev => prev + timeElapsed);
      
      setActiveSession(null);
      setIsRunning(false);
      setTimeElapsed(0);
      setStartTime(null);
      
      return completedSession;
    } catch (error) {
      console.error('Failed to pause timer:', error);
      throw error;
    }
  };

  const stopTimer = async () => {
    if (!activeSession) return;

    try {
      const sessionData = {
        end_time: new Date().toISOString(),
        duration: timeElapsed,
        is_active: false
      };

      await timeTrackingAPI.updateTimeSession(activeSession.id, sessionData);
      
      // Add to local sessions
      const completedSession = {
        ...activeSession,
        ...sessionData,
        task_title: activeSession.task_title
      };
      
      setSessions(prev => [completedSession, ...prev]);
      setTotalTimeToday(prev => prev + timeElapsed);
      
      setActiveSession(null);
      setIsRunning(false);
      setTimeElapsed(0);
      setStartTime(null);
      
      return completedSession;
    } catch (error) {
      console.error('Failed to stop timer:', error);
      throw error;
    }
  };

  const formatTime = (ms) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const value = {
    activeSession,
    isRunning,
    timeElapsed,
    sessions,
    totalTimeToday,
    startTimer,
    pauseTimer,
    stopTimer,
    formatTime,
    loadTodaySessions
  };

  return (
    <TimeTrackingContext.Provider value={value}>
      {children}
    </TimeTrackingContext.Provider>
  );
};
