const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables manually from .env.local
const envPath = path.join(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w\.\-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
    env[match[1]] = value.trim();
  }
});

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseKey = env['NEXT_SUPABASE_SERVICE_ROLE_KEY'];

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const employeeId = '4404d98d-67cb-405b-bcc9-0e7a37f51f44'; // Rohan (E106)
  const testDate = '2026-07-18'; // Test date
  let attendanceId = null;
  let swipeId = null;

  try {
    console.log("=== Testing Swipe Insert Trigger ===");

    // 1. Create a dummy attendance row with status 'halfday'
    const { data: att, error: attError } = await supabase
      .from('hrm_attendance')
      .insert({
        employee_id: employeeId,
        date: testDate,
        status: 'halfday',
        late_in_minutes: 0,
        early_out_minutes: 0,
        work_hours_minutes: 0,
        source: 'manual',
        notes: 'Test attendance row'
      })
      .select('*')
      .single();

    if (attError) {
      throw new Error("Failed to insert dummy attendance: " + attError.message);
    }

    attendanceId = att.id;
    console.log(`Created attendance record (ID: ${attendanceId}) with status: ${att.status}`);

    // 2. Fetch it back to make sure it's 'halfday'
    const { data: attFetched1 } = await supabase
      .from('hrm_attendance')
      .select('status')
      .eq('id', attendanceId)
      .single();
    console.log("Verified initial status:", attFetched1.status);

    // 3. Insert a swipe into hrm_attendance_swipes
    console.log("Inserting swipe...");
    const { data: swipe, error: swipeError } = await supabase
      .from('hrm_attendance_swipes')
      .insert({
        employee_id: employeeId,
        attendance_id: attendanceId,
        swipe_date: testDate,
        swipe_time: `${testDate}T09:00:00Z`,
        swipe_type: 'in',
        source: 'manual'
      })
      .select('*')
      .single();

    if (swipeError) {
      throw new Error("Failed to insert swipe: " + swipeError.message);
    }

    swipeId = swipe.id;
    console.log("Inserted swipe ID:", swipeId);

    // 4. Fetch the attendance row again to see if status changed automatically
    const { data: attFetched2 } = await supabase
      .from('hrm_attendance')
      .select('status, check_in, check_out')
      .eq('id', attendanceId)
      .single();
    
    console.log(`Final attendance status: ${attFetched2.status}`);
    console.log(`Check-in: ${attFetched2.check_in}, Check-out: ${attFetched2.check_out}`);

  } catch (err) {
    console.error("Test failed:", err.message);
  } finally {
    // Clean up
    console.log("Cleaning up test data...");
    if (swipeId) {
      await supabase.from('hrm_attendance_swipes').delete().eq('id', swipeId);
    }
    if (attendanceId) {
      await supabase.from('hrm_attendance').delete().eq('id', attendanceId);
    }
    console.log("Cleaned up.");
  }
}

run();
