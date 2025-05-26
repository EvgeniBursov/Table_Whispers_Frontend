// קובץ utils לניהול זמנים עם אזור זמן קבוע של ישראל
// timeUtils.js

// הגדרת אזור הזמן של ישראל
const ISRAEL_TIMEZONE = 'Asia/Jerusalem';

// פונקציה לפורמוט זמן ב-24 שעות באזור זמן ישראל
export const formatTime24h = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false,
    timeZone: ISRAEL_TIMEZONE  // הוספת אזור זמן קבוע
  });
};

// פונקציה לפורמוט תאריך באזור זמן ישראל
export const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    timeZone: ISRAEL_TIMEZONE  // הוספת אזור זמן קבוע
  });
};

// פונקציה לחישוב משך זמן (לא תלויה באזור זמן)
export const calculateDuration = (startTime, endTime) => {
  const start = new Date(startTime);
  const end = new Date(endTime);
  const duration = Math.round((end - start) / (1000 * 60));
  return `${duration} min`;
};

// פונקציה לפורמוט תאריך ושעה מלא באזור זמן ישראל
export const formatDateTime = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleString('he-IL', {
    year: 'numeric',
    month: '2-digit', 
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: ISRAEL_TIMEZONE
  });
};

// פונקציה לקבלת התאריך הנוכחי באזור זמן ישראל (לפילטרים)
export const getCurrentDateInIsrael = () => {
  const now = new Date();
  return now.toLocaleDateString('en-CA', { // פורמט ISO (YYYY-MM-DD)
    timeZone: ISRAEL_TIMEZONE
  });
};

// פונקציה לבדיקה אם תאריך הוא היום באזור זמן ישראל
export const isToday = (dateString) => {
  const date = new Date(dateString);
  const today = getCurrentDateInIsrael();
  const checkDate = date.toLocaleDateString('en-CA', {
    timeZone: ISRAEL_TIMEZONE
  });
  return checkDate === today;
};

// פונקציה לקבלת השעה הנוכחית באזור זמן ישראל
export const getCurrentTimeInIsrael = () => {
  const now = new Date();
  return now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit', 
    hour12: false,
    timeZone: ISRAEL_TIMEZONE
  });
};

// פונקציה להמרת זמן לאזור זמן ישראל (לעדכונים בפורם)
export const convertToIsraelTime = (dateString) => {
  const date = new Date(dateString);
  
  // קבלת התאריך והשעה באזור זמן ישראל
  const israelDate = new Date(date.toLocaleString('en-US', {
    timeZone: ISRAEL_TIMEZONE
  }));
  
  return {
    date: israelDate.toISOString().split('T')[0], // YYYY-MM-DD
    time: israelDate.toTimeString().slice(0, 5)   // HH:MM
  };
};

// פונקציה ליצירת Date object מתאריך ושעה באזור זמן ישראל
export const createDateInIsrael = (dateStr, timeStr) => {
  // יצירת התאריך והשעה כמחרוזת
  const dateTimeStr = `${dateStr}T${timeStr}:00`;
  
  // יצירת Date object
  const date = new Date(dateTimeStr);
  
  // קבלת ההפרש בין UTC לאזור זמן ישראל
  const israelOffset = getIsraelTimezoneOffset(date);
  
  // התאמת הזמן
  return new Date(date.getTime() - israelOffset);
};

// פונקציה לקבלת ההפרש באזור זמן ישראל (כולל שעון קיץ)
const getIsraelTimezoneOffset = (date) => {
  const utc = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
  const israel = new Date(date.toLocaleString('en-US', { timeZone: ISRAEL_TIMEZONE }));
  return israel.getTime() - utc.getTime();
};