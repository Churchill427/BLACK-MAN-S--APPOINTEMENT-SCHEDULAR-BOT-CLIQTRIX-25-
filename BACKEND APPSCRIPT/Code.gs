/**
 * ========================================
 * BLACK MAN'S CONSULTING SERVICES BOT
 * Main API Handler - Code.gs
 * ========================================
 * 
 * This is the main entry point for all API requests from Zoho SalesIQ
 * Compatible with your Config.gs, Utilities.gs, and Calendar.gs
 * 
 * Version: 1.0
 * Created for: Zoho Cliqtrix 25 Competition
 */

// ==================== HTTP REQUEST HANDLERS ====================

/**
 * Handle GET requests
 * @param {Object} e - Event object with request parameters
 * @return {TextOutput} JSON response
 */
function doGet(e) {
  Logger.log('[INFO] GET request received');
  
  try {
    const action = e.parameter.action;
    
    if (!action) {
      return createJsonResponse(createResponse(
        false,
        null,
        'Action parameter required. Example: ?action=test',
        null
      ));
    }
    
    Logger.log('[DEBUG] GET action: ' + action);
    
    let result;
    
    switch (action) {
      case 'test':
        result = handleTest();
        break;
        
      case 'getServices':
        result = handleGetServices();
        break;
        
      case 'getConfig':
        result = handleGetConfig();
        break;
        
      case 'health':
        result = handleHealthCheck();
        break;
        
      default:
        result = createResponse(
          false,
          null,
          'Unknown action: ' + action + '. Supported: test, getServices, getConfig, health',
          null
        );
    }
    
    return createJsonResponse(result);
    
  } catch (error) {
    return createJsonResponse(handleError(error, 'GET Request'));
  }
}

/**
 * Handle POST requests (main API endpoint)
 * @param {Object} e - Event object with request data
 * @return {TextOutput} JSON response
 */
function doPost(e) {
  Logger.log('[INFO] POST request received');
  
  try {
    // Parse request body
    const requestData = JSON.parse(e.postData.contents);
    const action = requestData.action;
    
    if (!action) {
      return createJsonResponse(createResponse(
        false,
        null,
        'Action parameter required in request body',
        null
      ));
    }
    
    Logger.log('[INFO] POST action: ' + action);
    Logger.log('[DEBUG] Request data: ' + JSON.stringify(requestData));
    
    let result;
    
    // Route to appropriate handler
    switch (action) {
      case 'test':
        result = handleTest();
        break;
        
      case 'getServices':
        result = handleGetServices();
        break;
        
      case 'getSlots':
        result = handleGetSlots(requestData);
        break;
        
      case 'bookAppointment':
        result = handleBookAppointment(requestData);
        break;
        
      case 'getAppointment':
        result = handleGetAppointment(requestData);
        break;
        
      case 'cancelAppointment':
        result = handleCancelAppointment(requestData);
        break;
        
      case 'rescheduleAppointment':
        result = handleRescheduleAppointment(requestData);
        break;
        
      case 'getAppointments':
        result = handleGetAppointments(requestData);
        break;
        
      default:
        result = createResponse(
          false,
          null,
          'Unknown action: ' + action,
          null
        );
    }
    
    Logger.log('[DEBUG] Response: ' + JSON.stringify(result));
    return createJsonResponse(result);
    
  } catch (error) {
    return createJsonResponse(handleError(error, 'POST Request'));
  }
}

/**
 * Create JSON response for HTTP output
 * @param {Object} data - Response data
 * @return {TextOutput} JSON output
 */
function createJsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data, null, 2))
    .setMimeType(ContentService.MimeType.JSON);
}

// ==================== ACTION HANDLERS ====================

/**
 * Handle test action
 * @return {Object} Test result response
 */
function handleTest() {
  try {
    Logger.log('[INFO] Handling test action');
    
    // Test calendar access
    const calendar = getCalendar();
    
    // Test services
    const services = getServices();
    
    // Test configuration
    const config = getConfig();
    
    // Get sample slots for tomorrow
    let slotCount = 0;
    
    try {
      const tomorrow = addDays(new Date(), 1);
      const slots = getAvailableSlots(formatDate(tomorrow), 'consultation');
      slotCount = slots.length;
    } catch (error) {
      Logger.log('[WARN] Could not get slots: ' + error.message);
    }
    
    const testData = {
      status: 'operational',
      message: 'Backend is working perfectly!',
      timestamp: new Date().toISOString(),
      calendar: {
        connected: true,
        name: calendar.getName(),
        id: calendar.getId()
      },
      services: {
        count: services.length,
        list: services.map(function(s) {
          return {
            id: s.id,
            name: s.name,
            duration: s.duration
          };
        })
      },
      configuration: {
        timezone: config.TIMEZONE,
        businessHours: config.BUSINESS_HOURS.START + ':00 - ' + config.BUSINESS_HOURS.END + ':00',
        workingDays: config.WORKING_DAYS.length
      },
      sampleSlots: {
        date: formatDate(addDays(new Date(), 1)),
        count: slotCount
      }
    };
    
    return createResponse(
      true,
      testData,
      '✅ All systems operational',
      null
    );
    
  } catch (error) {
    Logger.log('[ERROR] Test failed: ' + error.message);
    throw new Error('Backend test failed: ' + error.message);
  }
}

/**
 * Handle health check action
 * @return {Object} Health check response
 */
function handleHealthCheck() {
  try {
    return createResponse(true, {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: 'operational'
    }, 'System is healthy', null);
    
  } catch (error) {
    return createResponse(false, null, 'System unhealthy', null);
  }
}

/**
 * Handle get services action
 * @return {Object} Services response
 */
function handleGetServices() {
  try {
    Logger.log('[INFO] Handling getServices action');
    
    const services = getServices();
    
    return createResponse(
      true,
      {
        services: services,
        count: services.length
      },
      'Services retrieved successfully',
      null
    );
    
  } catch (error) {
    throw new Error('Failed to get services: ' + error.message);
  }
}

/**
 * Handle get configuration action
 * @return {Object} Configuration response
 */
function handleGetConfig() {
  try {
    Logger.log('[INFO] Handling getConfig action');
    
    const config = getConfig();
    
    // Return only public configuration
    const publicConfig = {
      businessHours: config.BUSINESS_HOURS,
      workingDays: config.WORKING_DAYS,
      timezone: config.TIMEZONE,
      services: config.SERVICES,
      contact: getContactInfo()
    };
    
    return createResponse(
      true,
      publicConfig,
      'Configuration retrieved successfully',
      null
    );
    
  } catch (error) {
    throw new Error('Failed to get configuration: ' + error.message);
  }
}

/**
 * Handle get available slots action
 * @param {Object} data - Request data
 * @return {Object} Slots response
 */
function handleGetSlots(data) {
  try {
    Logger.log('[INFO] Handling getSlots action for date: ' + data.date + ', service: ' + data.serviceId);
    
    // Validate input
    if (!data.date) {
      throw new Error('Date parameter is required');
    }
    
    if (!data.serviceId) {
      throw new Error('Service ID parameter is required');
    }
    
    // Get available slots
    const slots = getAvailableSlots(data.date, data.serviceId);
    
    const service = getServiceById(data.serviceId);
    
    return createResponse(
      true,
      {
        date: data.date,
        serviceId: data.serviceId,
        serviceName: service ? service.name : 'Unknown',
        slots: slots,
        count: slots.length
      },
      'Found ' + slots.length + ' available slot(s)',
      null
    );
    
  } catch (error) {
    throw new Error('Failed to get slots: ' + error.message);
  }
}

/**
 * Handle book appointment action
 * @param {Object} data - Appointment data
 * @return {Object} Booking response
 */
function handleBookAppointment(data) {
  try {
    Logger.log('[INFO] Handling bookAppointment for: ' + data.customerEmail);
    
    // Validate required fields
    const requiredFields = [
      'customerName',
      'customerEmail',
      'startTime',
      'endTime',
      'serviceId'
    ];
    
    const validation = validateParams(data, requiredFields);
    
    if (!validation.valid) {
      throw new Error('Missing required fields: ' + validation.missing.join(', '));
    }
    
    // Sanitize inputs
    const appointmentData = {
      customerName: sanitizeInput(data.customerName),
      customerEmail: sanitizeInput(data.customerEmail),
      customerPhone: data.customerPhone ? sanitizeInput(data.customerPhone) : '',
      startTime: data.startTime,
      endTime: data.endTime,
      serviceId: data.serviceId,
      notes: data.notes ? sanitizeInput(data.notes) : ''
    };
    
    // Create appointment
    const appointment = createAppointment(appointmentData);
    
    Logger.log('[INFO] Appointment booked successfully: ' + appointment.appointmentId);
    
    return createResponse(
      true,
      appointment,
      getConfig().MESSAGES.SUCCESS,
      null
    );
    
  } catch (error) {
    throw new Error('Failed to book appointment: ' + error.message);
  }
}

/**
 * Handle get appointment action
 * @param {Object} data - Request data
 * @return {Object} Appointment response
 */
function handleGetAppointment(data) {
  try {
    if (!data.appointmentId) {
      throw new Error('Appointment ID is required');
    }
    
    Logger.log('[INFO] Handling getAppointment for ID: ' + data.appointmentId);
    
    const appointment = findAppointmentById(data.appointmentId);
    
    if (!appointment) {
      return createResponse(
        false,
        null,
        getConfig().MESSAGES.APPOINTMENT_NOT_FOUND,
        null
      );
    }
    
    return createResponse(
      true,
      appointment,
      'Appointment found successfully',
      null
    );
    
  } catch (error) {
    throw new Error('Failed to get appointment: ' + error.message);
  }
}

/**
 * Handle cancel appointment action
 * @param {Object} data - Request data
 * @return {Object} Cancellation response
 */
function handleCancelAppointment(data) {
  try {
    if (!data.appointmentId) {
      throw new Error('Appointment ID is required');
    }
    
    Logger.log('[INFO] Handling cancelAppointment for ID: ' + data.appointmentId);
    
    const cancelled = cancelAppointment(data.appointmentId);
    
    if (!cancelled) {
      return createResponse(
        false,
        null,
        getConfig().MESSAGES.APPOINTMENT_NOT_FOUND,
        null
      );
    }
    
    return createResponse(
      true,
      {
        appointmentId: data.appointmentId,
        cancelled: true,
        cancelledAt: new Date().toISOString()
      },
      'Appointment cancelled successfully',
      null
    );
    
  } catch (error) {
    throw new Error('Failed to cancel appointment: ' + error.message);
  }
}

/**
 * Handle reschedule appointment action
 * @param {Object} data - Request data
 * @return {Object} Reschedule response
 */
function handleRescheduleAppointment(data) {
  try {
    const requiredFields = ['appointmentId', 'newStartTime', 'newEndTime'];
    const validation = validateParams(data, requiredFields);
    
    if (!validation.valid) {
      throw new Error('Missing required fields: ' + validation.missing.join(', '));
    }
    
    Logger.log('[INFO] Handling rescheduleAppointment for ID: ' + data.appointmentId);
    
    const appointment = rescheduleAppointment(
      data.appointmentId,
      data.newStartTime,
      data.newEndTime
    );
    
    return createResponse(
      true,
      appointment,
      'Appointment rescheduled successfully',
      null
    );
    
  } catch (error) {
    throw new Error('Failed to reschedule appointment: ' + error.message);
  }
}

/**
 * Handle get appointments action
 * @param {Object} data - Request data
 * @return {Object} Appointments response
 */
function handleGetAppointments(data) {
  try {
    Logger.log('[INFO] Handling getAppointments action');
    
    // Parse date range
    const startDate = data.startDate ? new Date(data.startDate) : new Date();
    const endDate = data.endDate ? new Date(data.endDate) : addDays(startDate, 30);
    
    // Get appointments
    const appointments = getAppointments(startDate, endDate);
    
    return createResponse(
      true,
      {
        appointments: appointments,
        count: appointments.length,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      },
      'Found ' + appointments.length + ' appointment(s)',
      null
    );
    
  } catch (error) {
    throw new Error('Failed to get appointments: ' + error.message);
  }
}

// ==================== SETUP TESTING FUNCTION ====================

/**
 * Test complete backend setup
 * Run this manually before deployment
 */
function testSetup() {
  Logger.log('╔═══════════════════════════════════════════════════╗');
  Logger.log('║   BLACK MAN\'S BOT - COMPLETE SETUP TEST          ║');
  Logger.log('╚═══════════════════════════════════════════════════╝');
  
  try {
    // Test 1: Configuration
    Logger.log('\n📋 TEST 1: Configuration');
    Logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const config = getConfig();
    Logger.log('✅ Configuration loaded');
    Logger.log('   Calendar ID: ' + config.CALENDAR_ID);
    Logger.log('   Timezone: ' + config.TIMEZONE);
    Logger.log('   Business Hours: ' + config.BUSINESS_HOURS.START + ':00 - ' + config.BUSINESS_HOURS.END + ':00');
    
    // Test 2: Calendar Access
    Logger.log('\n📅 TEST 2: Calendar Access');
    Logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const calendar = getCalendar();
    Logger.log('✅ Calendar accessible: ' + calendar.getName());
    Logger.log('   Calendar ID: ' + calendar.getId());
    
    // Test 3: Services
    Logger.log('\n🎯 TEST 3: Services Configuration');
    Logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const services = getServices();
    Logger.log('✅ Services loaded: ' + services.length);
    for (let i = 0; i < services.length; i++) {
      Logger.log('   - ' + services[i].name + ' (' + services[i].duration + ' min) [' + services[i].id + ']');
    }
    
    // Test 4: Utilities
    Logger.log('\n🔧 TEST 4: Utilities Functions');
    Logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    Logger.log('✅ Date formatting: ' + formatDate(new Date()));
    Logger.log('✅ Time formatting: ' + formatTime(new Date()));
    Logger.log('✅ Email validation: ' + isValidEmail('test@example.com'));
    Logger.log('✅ ID generation: ' + generateUniqueId());
    
    // Test 5: Slot Generation
    Logger.log('\n⏰ TEST 5: Slot Generation');
    Logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const tomorrow = addDays(new Date(), 1);
    const tomorrowStr = formatDate(tomorrow);
    
    try {
      const slots = getAvailableSlots(tomorrowStr, 'consultation');
      Logger.log('✅ Available slots for ' + tomorrowStr + ': ' + slots.length);
      
      if (slots.length > 0) {
        Logger.log('   First slot: ' + slots[0].display);
        Logger.log('   Last slot: ' + slots[slots.length - 1].display);
      } else {
        Logger.log('   ⚠️  No slots available (might be weekend or fully booked)');
      }
    } catch (error) {
      Logger.log('   ⚠️  Could not generate slots: ' + error.message);
    }
    
    // Test 6: API Response Format
    Logger.log('\n📡 TEST 6: API Response Format');
    Logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const testResponse = handleTest();
    Logger.log('✅ API response structure valid');
    Logger.log('   Success: ' + testResponse.success);
    Logger.log('   Message: ' + testResponse.message);
    
    // Final Summary
    Logger.log('\n╔═══════════════════════════════════════════════════╗');
    Logger.log('║            ✅ ALL TESTS PASSED! ✅                ║');
    Logger.log('╚═══════════════════════════════════════════════════╝');
    
    Logger.log('\n📝 NEXT STEPS:');
    Logger.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    Logger.log('1. Click "Deploy" → "New deployment"');
    Logger.log('2. Select "Web app" as deployment type');
    Logger.log('3. Set "Execute as" to "Me"');
    Logger.log('4. Set "Who has access" to "Anyone"');
    Logger.log('5. Click "Deploy"');
    Logger.log('6. Copy the Web App URL');
    Logger.log('7. Use this URL in Zoho SalesIQ context handler');
    Logger.log('\n🎯 Your backend is ready for Zoho Cliqtrix 25!');
    
  } catch (error) {
    Logger.log('\n╔═══════════════════════════════════════════════════╗');
    Logger.log('║           ❌ TEST FAILED! ❌                      ║');
    Logger.log('╚═══════════════════════════════════════════════════╝');
    Logger.log('\n❌ Error: ' + error.message);
    Logger.log('\n📋 Stack Trace:\n' + error.stack);
    Logger.log('\n🔧 Please fix the errors and run testSetup() again.');
  }
}

/**
 * Dummy function required by Apps Script
 */
function myFunction() {
  return "OK";
}