/**
 * ========================================
 * BLACK MAN'S CONSULTING SERVICES BOT
 * Calendar Operations - Calendar.gs
 * ========================================
 * 
 * Google Calendar integration for appointment management
 * 
 * Functions:
 * - Get available time slots
 * - Create appointments
 * - Find appointments
 * - Cancel appointments
 * - Reschedule appointments
 * - Manage calendar events
 * 
 * Version: 1.0
 * Created for: Zoho Cliqtrix 25 Competition
 */

// ==================== LOGGING FUNCTIONS ====================

/**
 * Log debug message
 * @param {string} message - Debug message
 */
function logDebug(message) {
  Logger.log(`[DEBUG] ${message}`);
}

/**
 * Log info message
 * @param {string} message - Info message
 */
function logInfo(message) {
  Logger.log(`[INFO] ${message}`);
}

/**
 * Log error message
 * @param {string} message - Error message
 */
function logError(message) {
  Logger.log(`[ERROR] ${message}`);
}

// ==================== CALENDAR ACCESS ====================

/**
 * Get calendar instance with error handling
 * @return {Calendar} Google Calendar object
 * @throws {Error} If calendar cannot be accessed
 */
function getCalendar() {
  try {
    const calendarId = getCalendarId();
    logDebug(`Accessing calendar: ${calendarId}`);
    
    const calendar = CalendarApp.getCalendarById(calendarId);
    
    if (!calendar) {
      throw new Error(`Calendar not found with ID: ${calendarId}`);
    }
    
    logDebug(`Calendar accessed successfully: ${calendar.getName()}`);
    return calendar;
    
  } catch (error) {
    logError(`Failed to access calendar: ${error.message}`);
    throw new Error(`Calendar access error: ${error.message}`);
  }
}

// ==================== SLOT MANAGEMENT ====================

/**
 * Get available time slots for a specific date and service
 * @param {string} dateStr - Date string (YYYY-MM-DD)
 * @param {string} serviceId - Service identifier
 * @return {Array<Object>} Array of available time slots
 */
function getAvailableSlots(dateStr, serviceId) {
  try {
    logInfo(`Getting slots for date: ${dateStr}, service: ${serviceId}`);
    
    // Validate and parse date
    const targetDate = parseDateString(dateStr);
    if (!targetDate) {
      throw new Error(getConfig().MESSAGES.INVALID_DATE_FORMAT);
    }
    
    // Check if date is in the future
    const now = new Date();
    const minBookingTime = addMinutes(now, getMinBookingNoticeHours() * 60);
    
    if (targetDate < minBookingTime) {
      throw new Error(getConfig().MESSAGES.DATE_IN_PAST);
    }
    
    // Check if date is within booking window
    if (!isWithinBookingWindow(targetDate)) {
      throw new Error(getConfig().MESSAGES.OUTSIDE_BOOKING_WINDOW);
    }
    
    // Check if it's a working day
    if (!isWorkingDay(targetDate.getDay())) {
      logInfo(`${dateStr} is not a working day`);
      return [];
    }
    
    // Get service details
    const service = getServiceById(serviceId);
    if (!service) {
      throw new Error(`Service not found: ${serviceId}`);
    }
    
    logDebug(`Service found: ${service.name}, duration: ${service.duration} min`);
    
    // Generate potential slots
    const potentialSlots = generatePotentialSlots(targetDate, service);
    logDebug(`Generated ${potentialSlots.length} potential slots`);
    
    // Get existing events for the day
    const existingEvents = getEventsForDate(targetDate);
    logDebug(`Found ${existingEvents.length} existing events`);
    
    // Filter out unavailable slots
    const availableSlots = filterAvailableSlots(potentialSlots, existingEvents);
    logInfo(`Found ${availableSlots.length} available slots for ${dateStr}`);
    
    return availableSlots;
    
  } catch (error) {
    logError(`Error getting slots: ${error.message}`);
    throw error;
  }
}

/**
 * Generate potential time slots for a date
 * @param {Date} date - Target date
 * @param {Object} service - Service object
 * @return {Array<Object>} Array of potential slots
 */
function generatePotentialSlots(date, service) {
  const slots = [];
  const businessHours = getBusinessHours();
  const slotInterval = getSlotInterval();
  
  // Generate slots from business start to end
  for (let hour = businessHours.START; hour < businessHours.END; hour++) {
    for (let minute = 0; minute < 60; minute += slotInterval) {
      const slotStart = setTime(date, hour, minute);
      const slotEnd = addMinutes(slotStart, service.duration);
      
      // Only include if slot ends within business hours
      if (slotEnd.getHours() < businessHours.END || 
          (slotEnd.getHours() === businessHours.END && slotEnd.getMinutes() === 0)) {
        
        slots.push({
          start: slotStart,
          end: slotEnd,
          startTime: slotStart.toISOString(),
          endTime: slotEnd.toISOString(),
          display: `${formatTime(slotStart)} - ${formatTime(slotEnd)}`,
          date: formatDate(slotStart)
        });
      }
    }
  }
  
  return slots;
}

/**
 * Get existing calendar events for a specific date
 * @param {Date} date - Target date
 * @return {Array<CalendarEvent>} Array of calendar events
 */
function getEventsForDate(date) {
  try {
    const calendar = getCalendar();
    const dayStart = setTime(date, 0, 0);
    const dayEnd = setTime(date, 23, 59);
    
    const events = calendar.getEvents(dayStart, dayEnd);
    return events;
    
  } catch (error) {
    logError(`Error getting events for date: ${error.message}`);
    return [];
  }
}

/**
 * Filter available slots by checking conflicts
 * @param {Array<Object>} potentialSlots - Potential time slots
 * @param {Array<CalendarEvent>} existingEvents - Existing events
 * @return {Array<Object>} Available slots
 */
function filterAvailableSlots(potentialSlots, existingEvents) {
  const now = new Date();
  const minBookingTime = addMinutes(now, getMinBookingNoticeHours() * 60);
  const bufferTime = getBufferTime();
  
  return potentialSlots.filter(slot => {
    // Check if slot is far enough in the future
    if (slot.start < minBookingTime) {
      return false;
    }
    
    // Check for conflicts with existing events
    const hasConflict = existingEvents.some(event => {
      const eventStart = new Date(event.getStartTime());
      const eventEnd = new Date(event.getEndTime());
      
      // Add buffer time to event boundaries
      const bufferedEventStart = addMinutes(eventStart, -bufferTime);
      const bufferedEventEnd = addMinutes(eventEnd, bufferTime);
      
      return timeRangesOverlap(
        slot.start,
        slot.end,
        bufferedEventStart,
        bufferedEventEnd
      );
    });
    
    return !hasConflict;
  });
}

// ==================== APPOINTMENT CREATION ====================

/**
 * Create a new appointment in calendar
 * @param {Object} appointmentData - Appointment details
 * @return {Object} Created appointment details
 */
function createAppointment(appointmentData) {
  try {
    logInfo(`Creating appointment for: ${appointmentData.customerEmail}`);
    
    // Validate required fields
    const validation = validateParams(appointmentData, [
      'customerName',
      'customerEmail',
      'startTime',
      'endTime',
      'serviceId'
    ]);
    
    if (!validation.valid) {
      throw new Error(`Missing required fields: ${validation.missing.join(', ')}`);
    }
    
    // Validate email format
    if (!isValidEmail(appointmentData.customerEmail)) {
      throw new Error('Invalid email address format');
    }
    
    // Get service details
    const service = getServiceById(appointmentData.serviceId);
    if (!service) {
      throw new Error(`Invalid service ID: ${appointmentData.serviceId}`);
    }
    
    // Parse times
    const startTime = new Date(appointmentData.startTime);
    const endTime = new Date(appointmentData.endTime);
    
    // Verify slot is still available
    if (!isSlotAvailable(startTime, endTime)) {
      throw new Error(getConfig().MESSAGES.SLOT_UNAVAILABLE);
    }
    
    // Generate unique appointment ID
    const appointmentId = generateUniqueId();
    logDebug(`Generated appointment ID: ${appointmentId}`);
    
    // Create event in calendar
    const event = createCalendarEvent(appointmentData, service, appointmentId, startTime, endTime);
    
    logInfo(`Appointment created successfully: ${appointmentId}`);
    
    // Return appointment details
    return {
      appointmentId: appointmentId,
      eventId: event.getId(),
      customerName: sanitizeInput(appointmentData.customerName),
      customerEmail: sanitizeInput(appointmentData.customerEmail),
      customerPhone: appointmentData.customerPhone ? sanitizeInput(appointmentData.customerPhone) : '',
      serviceName: service.name,
      serviceId: service.id,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      notes: appointmentData.notes ? sanitizeInput(appointmentData.notes) : '',
      status: getConfig().STATUS.CONFIRMED,
      createdAt: new Date().toISOString()
    };
    
  } catch (error) {
    logError(`Failed to create appointment: ${error.message}`);
    throw error;
  }
}

/**
 * Check if a time slot is available
 * @param {Date} startTime - Slot start time
 * @param {Date} endTime - Slot end time
 * @return {boolean} True if available
 */
function isSlotAvailable(startTime, endTime) {
  try {
    const calendar = getCalendar();
    const existingEvents = calendar.getEvents(startTime, endTime);
    
    return existingEvents.length === 0;
    
  } catch (error) {
    logError(`Error checking slot availability: ${error.message}`);
    return false;
  }
}

/**
 * Create calendar event
 * @param {Object} appointmentData - Appointment data
 * @param {Object} service - Service object
 * @param {string} appointmentId - Appointment ID
 * @param {Date} startTime - Start time
 * @param {Date} endTime - End time
 * @return {CalendarEvent} Created event
 */
function createCalendarEvent(appointmentData, service, appointmentId, startTime, endTime) {
  const calendar = getCalendar();
  
  // Create event title
  const title = `${service.name} - ${appointmentData.customerName}`;
  
  // Create event description
  const description = createEventDescription(appointmentData, service, appointmentId);
  
  // Create event options
  const options = {
    description: description,
    guests: appointmentData.customerEmail,
    sendInvites: true,
    location: getContactInfo().ADDRESS || 'BLACK MAN\'S Consulting Services'
  };
  
  // Create the event
  const event = calendar.createEvent(title, startTime, endTime, options);
  
  // Set event color based on service
  if (service.color) {
    event.setColor(service.color);
  }
  
  // Add custom tags for tracking
  event.setTag('appointmentId', appointmentId);
  event.setTag('serviceId', service.id);
  event.setTag('bookedBy', 'bot');
  event.setTag('customerEmail', appointmentData.customerEmail);
  event.setTag('createdAt', new Date().toISOString());
  
  logDebug(`Calendar event created: ${event.getId()}`);
  
  return event;
}

/**
 * Create event description
 * @param {Object} appointmentData - Appointment data
 * @param {Object} service - Service object
 * @param {string} appointmentId - Appointment ID
 * @return {string} Event description
 */
function createEventDescription(appointmentData, service, appointmentId) {
  const contact = getContactInfo();
  
  let description = '═══════════════════════════════════\n';
  description += '    BLACK MAN\'S CONSULTING SERVICES\n';
  description += '═══════════════════════════════════\n\n';
  
  description += `📋 APPOINTMENT DETAILS\n`;
  description += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  description += `Appointment ID: ${appointmentId}\n`;
  description += `Service: ${service.name}\n`;
  description += `Duration: ${service.duration} minutes\n`;
  description += `\n`;
  
  description += `👤 CUSTOMER INFORMATION\n`;
  description += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  description += `Name: ${appointmentData.customerName}\n`;
  description += `Email: ${appointmentData.customerEmail}\n`;
  
  if (appointmentData.customerPhone) {
    description += `Phone: ${appointmentData.customerPhone}\n`;
  }
  
  if (appointmentData.notes) {
    description += `\n📝 NOTES\n`;
    description += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    description += `${appointmentData.notes}\n`;
  }
  
  description += `\n📞 CONTACT US\n`;
  description += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  description += `Email: ${contact.EMAIL}\n`;
  description += `Phone: ${contact.PHONE}\n`;
  description += `Website: ${contact.WEBSITE}\n`;
  description += `\n`;
  description += `Booked via BLACK MAN'S Automated Booking System\n`;
  
  return description;
}

// ==================== APPOINTMENT RETRIEVAL ====================

/**
 * Find appointment by ID
 * @param {string} appointmentId - Appointment identifier
 * @return {Object|null} Appointment details or null
 */
function findAppointmentById(appointmentId) {
  try {
    logInfo(`Finding appointment: ${appointmentId}`);
    
    if (!isValidAppointmentId(appointmentId)) {
      throw new Error('Invalid appointment ID format');
    }
    
    const calendar = getCalendar();
    const now = new Date();
    const futureDate = addDays(now, 365); // Search up to 1 year ahead
    
    const events = calendar.getEvents(now, futureDate);
    
    for (const event of events) {
      const eventAppointmentId = event.getTag('appointmentId');
      
      if (eventAppointmentId === appointmentId) {
        logDebug(`Appointment found: ${appointmentId}`);
        return parseEventToAppointment(event);
      }
    }
    
    logInfo(`Appointment not found: ${appointmentId}`);
    return null;
    
  } catch (error) {
    logError(`Error finding appointment: ${error.message}`);
    throw error;
  }
}

/**
 * Parse calendar event to appointment object
 * @param {CalendarEvent} event - Calendar event
 * @return {Object} Appointment object
 */
function parseEventToAppointment(event) {
  const appointmentId = event.getTag('appointmentId');
  const serviceId = event.getTag('serviceId');
  const customerEmail = event.getTag('customerEmail');
  const service = getServiceById(serviceId);
  
  // Parse description to get customer details
  const description = event.getDescription();
  const nameMatch = description.match(/Name: ([^\n]+)/);
  const phoneMatch = description.match(/Phone: ([^\n]+)/);
  const notesMatch = description.match(/📝 NOTES\n[─━]+\n([^📞]+)/);
  
  return {
    appointmentId: appointmentId,
    eventId: event.getId(),
    title: event.getTitle(),
    customerName: nameMatch ? nameMatch[1].trim() : 'Unknown',
    customerEmail: customerEmail || 'Unknown',
    customerPhone: phoneMatch ? phoneMatch[1].trim() : '',
    serviceName: service ? service.name : 'Unknown Service',
    serviceId: serviceId || 'unknown',
    startTime: event.getStartTime().toISOString(),
    endTime: event.getEndTime().toISOString(),
    notes: notesMatch ? notesMatch[1].trim() : '',
    status: getConfig().STATUS.CONFIRMED,
    location: event.getLocation()
  };
}

// ==================== APPOINTMENT CANCELLATION ====================

/**
 * Cancel an appointment
 * @param {string} appointmentId - Appointment identifier
 * @return {boolean} True if cancelled successfully
 */
function cancelAppointment(appointmentId) {
  try {
    logInfo(`Cancelling appointment: ${appointmentId}`);
    
    const appointment = findAppointmentById(appointmentId);
    
    if (!appointment) {
      throw new Error(getConfig().MESSAGES.APPOINTMENT_NOT_FOUND);
    }
    
    const calendar = getCalendar();
    const now = new Date();
    const futureDate = addDays(now, 365);
    
    const events = calendar.getEvents(now, futureDate);
    
    for (const event of events) {
      if (event.getTag('appointmentId') === appointmentId) {
        event.deleteEvent();
        logInfo(`Appointment cancelled successfully: ${appointmentId}`);
        return true;
      }
    }
    
    return false;
    
  } catch (error) {
    logError(`Error cancelling appointment: ${error.message}`);
    throw error;
  }
}

// ==================== APPOINTMENT RESCHEDULING ====================

/**
 * Reschedule an appointment
 * @param {string} appointmentId - Appointment identifier
 * @param {string} newStartTime - New start time (ISO string)
 * @param {string} newEndTime - New end time (ISO string)
 * @return {Object} Updated appointment details
 */
function rescheduleAppointment(appointmentId, newStartTime, newEndTime) {
  try {
    logInfo(`Rescheduling appointment: ${appointmentId}`);
    
    const appointment = findAppointmentById(appointmentId);
    
    if (!appointment) {
      throw new Error(getConfig().MESSAGES.APPOINTMENT_NOT_FOUND);
    }
    
    const startTime = new Date(newStartTime);
    const endTime = new Date(newEndTime);
    
    if (!isFutureDate(startTime)) {
      throw new Error(getConfig().MESSAGES.DATE_IN_PAST);
    }
    
    // Check if new slot is available
    const calendar = getCalendar();
    const conflictingEvents = calendar.getEvents(startTime, endTime);
    
    // Filter out the current appointment from conflicts
    const hasConflict = conflictingEvents.some(event => {
      return event.getTag('appointmentId') !== appointmentId;
    });
    
    if (hasConflict) {
      throw new Error(getConfig().MESSAGES.SLOT_UNAVAILABLE);
    }
    
    // Update the event
    const now = new Date();
    const futureDate = addDays(now, 365);
    const events = calendar.getEvents(now, futureDate);
    
    for (const event of events) {
      if (event.getTag('appointmentId') === appointmentId) {
        event.setTime(startTime, endTime);
        event.setTag('rescheduledAt', new Date().toISOString());
        
        logInfo(`Appointment rescheduled successfully: ${appointmentId}`);
        
        return {
          ...appointment,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          status: getConfig().STATUS.RESCHEDULED
        };
      }
    }
    
    throw new Error('Failed to update appointment');
    
  } catch (error) {
    logError(`Error rescheduling appointment: ${error.message}`);
    throw error;
  }
}

// ==================== APPOINTMENT LISTING ====================

/**
 * Get appointments for a date range
 * @param {Date} startDate - Range start date
 * @param {Date} endDate - Range end date
 * @return {Array<Object>} Array of appointments
 */
function getAppointments(startDate, endDate) {
  try {
    logInfo(`Getting appointments from ${formatDate(startDate)} to ${formatDate(endDate)}`);
    
    const calendar = getCalendar();
    const events = calendar.getEvents(startDate, endDate);
    
    const appointments = events
      .filter(event => event.getTag('bookedBy') === 'bot')
      .map(event => parseEventToAppointment(event));
    
    logInfo(`Found ${appointments.length} appointments`);
    return appointments;
    
  } catch (error) {
    logError(`Error getting appointments: ${error.message}`);
    throw error;
  }
}

// ==================== TESTING FUNCTION ====================

/**
 * Test calendar functions
 */
function testCalendar() {
  Logger.log('========== TESTING CALENDAR FUNCTIONS ==========');
  
  try {
    // Test 1: Calendar access
    Logger.log('\n1. Testing Calendar Access...');
    const calendar = getCalendar();
    Logger.log(`✅ Calendar: ${calendar.getName()}`);
    Logger.log(`✅ Calendar ID: ${calendar.getId()}`);
    
    // Test 2: Get available slots
    Logger.log('\n2. Testing Slot Generation...');
    const tomorrow = addDays(new Date(), 1);
    const dateStr = formatDate(tomorrow);
    const slots = getAvailableSlots(dateStr, 'consultation');
    Logger.log(`✅ Found ${slots.length} available slots for ${dateStr}`);
    
    if (slots.length > 0) {
      Logger.log(`   First slot: ${slots[0].display}`);
      Logger.log(`   Last slot: ${slots[slots.length - 1].display}`);
    }
    
    // Test 3: Validate working day
    Logger.log('\n3. Testing Working Day Check...');
    Logger.log(`✅ Tomorrow (${getDayName(tomorrow)}) is ${isWorkingDay(tomorrow.getDay()) ? 'a' : 'not a'} working day`);
    
    Logger.log('\n✅✅✅ ALL CALENDAR TESTS PASSED! ✅✅✅');
    
  } catch (error) {
    Logger.log(`\n❌ CALENDAR TEST FAILED: ${error.message}`);
    Logger.log(error.stack);
  }
}

function myFunction() {
  return "OK";
}