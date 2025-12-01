/**
 * ========================================
 * BLACK MAN'S CONSULTING SERVICES BOT
 * Utilities - Utilities.gs
 * ========================================
 * 
 * Helper functions for the booking system
 * Compatible with your Config.gs and Calendar.gs
 * 
 * Version: 1.0
 * Created for: Zoho Cliqtrix 25 Competition
 */

// ==================== RESPONSE FORMATTERS ====================

/**
 * Create standardized API response
 * @param {boolean} success - Success status
 * @param {Object} data - Response data
 * @param {string} message - Response message
 * @param {Object} error - Error details (optional)
 * @return {Object} Formatted response object
 */
function createResponse(success, data, message, error) {
  const response = {
    success: success,
    timestamp: new Date().toISOString(),
    message: message || (success ? 'Success' : 'Error')
  };
  
  if (data !== null && data !== undefined) {
    response.data = data;
  }
  
  if (error !== null && error !== undefined) {
    response.error = {
      message: error.message || error,
      type: error.type || 'UNKNOWN_ERROR'
    };
  }
  
  return response;
}

/**
 * Handle and format API errors
 * @param {Error} error - Error object
 * @param {string} context - Error context/location
 * @return {Object} Formatted error response
 */
function handleError(error, context) {
  const errorMessage = `Error in ${context}: ${error.message}`;
  Logger.log(`[ERROR] ${errorMessage}`);
  Logger.log(`[ERROR] Stack: ${error.stack}`);
  
  return createResponse(
    false,
    null,
    getConfig().MESSAGES.ERROR,
    {
      message: error.message,
      context: context,
      type: error.name || 'Error'
    }
  );
}

// ==================== VALIDATION FUNCTIONS ====================

/**
 * Validate email address format
 * @param {string} email - Email address to validate
 * @return {boolean} True if valid email format
 */
function isValidEmail(email) {
  if (!email || typeof email !== 'string') {
    return false;
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

/**
 * Validate phone number format
 * @param {string} phone - Phone number to validate
 * @return {boolean} True if valid phone format
 */
function isValidPhone(phone) {
  if (!phone || typeof phone !== 'string') {
    return false;
  }
  
  // Allow digits, spaces, dashes, plus, and parentheses
  const phoneRegex = /^[\d\s\-\+\(\)]{10,}$/;
  return phoneRegex.test(phone.trim());
}

/**
 * Validate date string format (YYYY-MM-DD)
 * @param {string} dateStr - Date string to validate
 * @return {boolean} True if valid date format
 */
function isValidDateString(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') {
    return false;
  }
  
  // Check format YYYY-MM-DD
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateStr)) {
    return false;
  }
  
  // Check if date is actually valid
  const date = new Date(dateStr);
  return date instanceof Date && !isNaN(date.getTime());
}

/**
 * Validate appointment ID format
 * @param {string} appointmentId - Appointment ID to validate
 * @return {boolean} True if valid format
 */
function isValidAppointmentId(appointmentId) {
  if (!appointmentId || typeof appointmentId !== 'string') {
    return false;
  }
  
  // Should start with APT followed by digits
  const idRegex = /^APT\d+$/;
  return idRegex.test(appointmentId.trim());
}

/**
 * Validate request parameters
 * @param {Object} params - Parameters object to validate
 * @param {Array<string>} requiredFields - Array of required field names
 * @return {Object} Validation result with valid flag and missing fields
 */
function validateParams(params, requiredFields) {
  const missing = [];
  
  if (!params || typeof params !== 'object') {
    return {
      valid: false,
      missing: requiredFields,
      message: 'Parameters object is missing or invalid'
    };
  }
  
  for (let i = 0; i < requiredFields.length; i++) {
    const field = requiredFields[i];
    if (!params[field] || params[field] === '' || params[field] === null) {
      missing.push(field);
    }
  }
  
  return {
    valid: missing.length === 0,
    missing: missing,
    message: missing.length === 0 ? 'All required fields present' : 'Missing fields: ' + missing.join(', ')
  };
}

// ==================== DATE/TIME UTILITIES ====================

/**
 * Parse date string to Date object
 * @param {string} dateStr - Date string (YYYY-MM-DD)
 * @return {Date|null} Date object or null if invalid
 */
function parseDateString(dateStr) {
  if (!isValidDateString(dateStr)) {
    return null;
  }
  
  const date = new Date(dateStr + 'T00:00:00');
  return date;
}

/**
 * Format date to YYYY-MM-DD string
 * @param {Date} date - Date object
 * @return {string} Formatted date string
 */
function formatDate(date) {
  if (!(date instanceof Date)) {
    return '';
  }
  
  return Utilities.formatDate(date, getTimezone(), 'yyyy-MM-dd');
}

/**
 * Format time to HH:mm string
 * @param {Date} date - Date object
 * @return {string} Formatted time string
 */
function formatTime(date) {
  if (!(date instanceof Date)) {
    return '';
  }
  
  return Utilities.formatDate(date, getTimezone(), 'HH:mm');
}

/**
 * Format datetime to readable string
 * @param {Date} date - Date object
 * @return {string} Formatted datetime string
 */
function formatDateTime(date) {
  if (!(date instanceof Date)) {
    return '';
  }
  
  return Utilities.formatDate(date, getTimezone(), 'MMMM dd, yyyy \'at\' hh:mm a');
}

/**
 * Check if date is in the future
 * @param {Date} date - Date to check
 * @return {boolean} True if date is in future
 */
function isFutureDate(date) {
  const now = new Date();
  return date > now;
}

/**
 * Check if date is within booking window
 * @param {Date} date - Date to check
 * @return {boolean} True if within booking window
 */
function isWithinBookingWindow(date) {
  const now = new Date();
  const maxDays = 60; // Max advance booking days
  const maxDate = new Date(now.getTime() + (maxDays * 24 * 60 * 60 * 1000));
  
  return date >= now && date <= maxDate;
}

/**
 * Add minutes to a date
 * @param {Date} date - Base date
 * @param {number} minutes - Minutes to add
 * @return {Date} New date with added minutes
 */
function addMinutes(date, minutes) {
  return new Date(date.getTime() + (minutes * 60 * 1000));
}

/**
 * Add days to a date
 * @param {Date} date - Base date
 * @param {number} days - Days to add
 * @return {Date} New date with added days
 */
function addDays(date, days) {
  return new Date(date.getTime() + (days * 24 * 60 * 60 * 1000));
}

/**
 * Set time on a date
 * @param {Date} date - Base date
 * @param {number} hours - Hour (0-23)
 * @param {number} minutes - Minutes (0-59)
 * @return {Date} New date with set time
 */
function setTime(date, hours, minutes) {
  minutes = minutes || 0;
  const newDate = new Date(date);
  newDate.setHours(hours, minutes, 0, 0);
  return newDate;
}

/**
 * Get day name from date
 * @param {Date} date - Date object
 * @return {string} Day name (e.g., "Monday")
 */
function getDayName(date) {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[date.getDay()];
}

/**
 * Check if two date ranges overlap
 * @param {Date} start1 - First range start
 * @param {Date} end1 - First range end
 * @param {Date} start2 - Second range start
 * @param {Date} end2 - Second range end
 * @return {boolean} True if ranges overlap
 */
function timeRangesOverlap(start1, end1, start2, end2) {
  return start1 < end2 && end1 > start2;
}

/**
 * Get difference between two dates in minutes
 * @param {Date} date1 - First date
 * @param {Date} date2 - Second date
 * @return {number} Difference in minutes
 */
function getMinutesDifference(date1, date2) {
  return Math.floor((date2 - date1) / (60 * 1000));
}

// ==================== STRING UTILITIES ====================

/**
 * Sanitize user input
 * @param {string} input - Input string
 * @return {string} Sanitized string
 */
function sanitizeInput(input) {
  if (!input || typeof input !== 'string') {
    return '';
  }
  
  return input
    .trim()
    .replace(/[<>]/g, '')
    .replace(/[\r\n]+/g, ' ')
    .substring(0, 500);
}

/**
 * Generate unique appointment ID
 * @return {string} Unique identifier
 */
function generateUniqueId() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return 'APT' + timestamp + random;
}

/**
 * Truncate string to specified length
 * @param {string} str - Input string
 * @param {number} maxLength - Maximum length
 * @return {string} Truncated string
 */
function truncateString(str, maxLength) {
  if (!str || typeof str !== 'string') {
    return '';
  }
  
  if (str.length <= maxLength) {
    return str;
  }
  
  return str.substring(0, maxLength - 3) + '...';
}

// ==================== HELPER FUNCTIONS FOR CONFIG ====================

/**
 * Get business hours from config
 * @return {Object} Business hours object
 */
function getBusinessHours() {
  return getConfig().BUSINESS_HOURS;
}

/**
 * Get working days from config
 * @return {Array} Array of working day numbers
 */
function getWorkingDays() {
  return getConfig().WORKING_DAYS;
}

/**
 * Check if a day is a working day
 * @param {number} dayNumber - Day number (0-6)
 * @return {boolean} True if working day
 */
function isWorkingDay(dayNumber) {
  return getConfig().WORKING_DAYS.indexOf(dayNumber) !== -1;
}

/**
 * Get all services
 * @return {Array} Array of service objects
 */
function getServices() {
  return getConfig().SERVICES;
}

/**
 * Get service by ID
 * @param {string} serviceId - Service identifier
 * @return {Object|null} Service object or null if not found
 */
function getServiceById(serviceId) {
  const services = getConfig().SERVICES;
  for (let i = 0; i < services.length; i++) {
    if (services[i].id === serviceId) {
      return services[i];
    }
  }
  return null;
}

/**
 * Get slot interval (30 minutes default)
 * @return {number} Slot interval in minutes
 */
function getSlotInterval() {
  return 30;
}

/**
 * Get buffer time (15 minutes default)
 * @return {number} Buffer time in minutes
 */
function getBufferTime() {
  return 15;
}

/**
 * Get minimum booking notice hours (1 hour default)
 * @return {number} Minimum hours notice required
 */
function getMinBookingNoticeHours() {
  return 1;
}

/**
 * Get contact information
 * @return {Object} Contact details
 */
function getContactInfo() {
  return {
    EMAIL: 'info@blackmans.com',
    PHONE: '+91-XXXXXXXXXX',
    WEBSITE: 'www.blackmans.com',
    ADDRESS: 'BLACK MAN\'S Consulting Services'
  };
}

// ==================== STATUS CONSTANTS ====================

/**
 * Get appointment status constants
 * @return {Object} Status constants
 */
function getStatusConstants() {
  return {
    CONFIRMED: 'confirmed',
    CANCELLED: 'cancelled',
    RESCHEDULED: 'rescheduled',
    COMPLETED: 'completed',
    NO_SHOW: 'no_show'
  };
}

// Add STATUS to config
if (!getConfig().STATUS) {
  getConfig().STATUS = getStatusConstants();
}

// ==================== EMAIL UTILITIES ====================

/**
 * Create HTML email body for appointment confirmation
 * @param {Object} appointment - Appointment details
 * @return {string} HTML email body
 */
function createConfirmationEmail(appointment) {
  const contact = getContactInfo();
  
  const html = '<!DOCTYPE html>' +
'<html>' +
'<head>' +
'  <style>' +
'    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }' +
'    .container { max-width: 600px; margin: 0 auto; padding: 20px; }' +
'    .header { background: #2c3e50; color: white; padding: 20px; text-align: center; }' +
'    .content { background: #f8f9fa; padding: 30px; }' +
'    .details { background: white; padding: 20px; margin: 20px 0; border-left: 4px solid #3498db; }' +
'    .detail-row { padding: 10px 0; border-bottom: 1px solid #eee; }' +
'    .detail-label { font-weight: bold; color: #2c3e50; }' +
'  </style>' +
'</head>' +
'<body>' +
'  <div class="container">' +
'    <div class="header">' +
'      <h1>🎯 Appointment Confirmed</h1>' +
'      <p>BLACK MAN\'S Consulting Services</p>' +
'    </div>' +
'    <div class="content">' +
'      <p>Dear <strong>' + appointment.customerName + '</strong>,</p>' +
'      <p>Your appointment has been successfully booked!</p>' +
'      <div class="details">' +
'        <h3>📋 Appointment Details</h3>' +
'        <div class="detail-row">' +
'          <span class="detail-label">Appointment ID:</span><br>' +
'          <code>' + appointment.appointmentId + '</code>' +
'        </div>' +
'        <div class="detail-row">' +
'          <span class="detail-label">Service:</span><br>' +
'          ' + appointment.serviceName +
'        </div>' +
'        <div class="detail-row">' +
'          <span class="detail-label">Date & Time:</span><br>' +
'          ' + formatDateTime(new Date(appointment.startTime)) +
'        </div>' +
(appointment.notes ? 
'        <div class="detail-row">' +
'          <span class="detail-label">Notes:</span><br>' +
'          ' + appointment.notes +
'        </div>' : '') +
'      </div>' +
'      <p><strong>⚠️ Important:</strong> Save your Appointment ID for future reference.</p>' +
'      <h4>📞 Contact Information</h4>' +
'      <p>' +
'        <strong>Email:</strong> ' + contact.EMAIL + '<br>' +
'        <strong>Phone:</strong> ' + contact.PHONE + '<br>' +
'        <strong>Website:</strong> ' + contact.WEBSITE +
'      </p>' +
'    </div>' +
'  </div>' +
'</body>' +
'</html>';
  
  return html;
}

// ==================== TESTING FUNCTION ====================

/**
 * Test utilities functions
 */
function testUtilities() {
  Logger.log('========== TESTING UTILITIES ==========');
  
  try {
    // Test 1: Date formatting
    Logger.log('\n1. Testing Date Functions...');
    const now = new Date();
    Logger.log('✅ formatDate: ' + formatDate(now));
    Logger.log('✅ formatTime: ' + formatTime(now));
    Logger.log('✅ formatDateTime: ' + formatDateTime(now));
    
    // Test 2: Validation
    Logger.log('\n2. Testing Validation...');
    Logger.log('✅ Email valid: ' + isValidEmail('test@example.com'));
    Logger.log('✅ Email invalid: ' + !isValidEmail('invalid-email'));
    Logger.log('✅ Date valid: ' + isValidDateString('2025-11-20'));
    Logger.log('✅ Date invalid: ' + !isValidDateString('2025-13-45'));
    
    // Test 3: String utilities
    Logger.log('\n3. Testing String Utilities...');
    const testId = generateUniqueId();
    Logger.log('✅ Generated ID: ' + testId);
    Logger.log('✅ Sanitize: ' + sanitizeInput('  <script>Test</script>  '));
    
    // Test 4: Response creation
    Logger.log('\n4. Testing Response Creation...');
    const response = createResponse(true, {test: 'data'}, 'Success message', null);
    Logger.log('✅ Response: ' + JSON.stringify(response));
    
    Logger.log('\n✅✅✅ ALL UTILITY TESTS PASSED! ✅✅✅');
    
  } catch (error) {
    Logger.log('\n❌ UTILITY TEST FAILED: ' + error.message);
    Logger.log(error.stack);
  }
}

/**
 * Dummy function required by Apps Script
 */
function myFunction() {
  return "OK";
}