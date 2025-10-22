const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('Supabase credentials not found in environment variables');
  console.warn('Please set SUPABASE_URL and SUPABASE_SERVICE_KEY in .env file');
}

// Create Supabase client with service role key for admin access
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Test database connection
const testConnection = async () => {
  try {
    const { data, error } = await supabase.from('users').select('count').single();
    if (error) {
      console.log('⚠️  Database connection test failed - tables may not exist yet');
      console.log('   This is normal for first-time setup');
      return false;
    }
    console.log('✅ Database connection successful');
    return true;
  } catch (err) {
    console.log('⚠️  Database connection test failed - tables may not exist yet');
    console.log('   This is normal for first-time setup');
    return false;
  }
};

// Initialize database tables
const initializeDatabase = async () => {
  try {
    console.log('🔧 Initializing database tables...');

    // We'll create tables manually in Supabase dashboard or use SQL migration
    console.log('📝 Please create tables manually in Supabase dashboard:');
    console.log('   1. users (id, email, password, role, first_name, last_name, tenant_id, is_active, created_at, updated_at)');
    console.log('   2. communities (id, name, address, description, admin_contact, occupancy_rate, created_at, updated_at)');
    console.log('   3. announcements (id, title, content, priority, published, author_id, tenant_id, created_at, updated_at)');
    console.log('   4. households (id, name, tenant_id, address, created_at, updated_at)');
    console.log('   5. vehicles (id, make, model, plate_number, household_id, registration_expiry, insurance_expiry, created_at, updated_at)');
    console.log('   6. gate_passes (id, guest_name, purpose, status, type, household_id, valid_from, valid_until, created_at, updated_at)');
    console.log('   7. guests (id, name, contact, purpose, status, household_id, check_in_time, check_out_time, created_at, updated_at)');
    console.log('   8. payments (id, amount, type, status, household_id, due_date, paid_date, created_at, updated_at)');

    console.log('✅ Database initialization setup complete');
    return true;
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    return false;
  }
};

module.exports = {
  supabase,
  testConnection,
  initializeDatabase
};