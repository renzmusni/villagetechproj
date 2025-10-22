# Supabase Database Setup Guide

## 🚀 Connecting HOA Platform to Supabase

This guide will help you connect the HOA Community Platform to a Supabase database.

### 📋 Prerequisites

1. **Supabase Account**: Create a free account at https://supabase.com
2. **Node.js**: Make sure you have Node.js installed
3. **Git**: The project should already be cloned

### 🛠️ Step 1: Create Supabase Project

1. Go to https://supabase.com and sign in
2. Click **"New Project"**
3. Choose your organization
4. Enter project details:
   - **Project Name**: `hoa-community-platform`
   - **Database Password**: Create a strong password (save it!)
   - **Region**: Choose your closest region
5. Click **"Create new project**
6. Wait for the project to be set up (2-3 minutes)

### 🔑 Step 2: Get Supabase Credentials

1. In your Supabase dashboard, go to **Settings** → **API**
2. Copy these values:
   - **Project URL** (looks like: `https://xxxxxxxxxxxxx.supabase.co`)
   - **service_role** key (starts with `eyJ...`)
   - **anon** key (starts with `eyJ...`)

### ⚙️ Step 3: Configure Environment Variables

1. Open the `.env` file in the `api-server` directory
2. Replace the placeholder values with your Supabase credentials:

```env
# Database Configuration
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_KEY=your-service-role-key-here

# JWT Configuration
JWT_SECRET=your-jwt-secret-key-here

# Server Configuration
PORT=4003
NODE_ENV=development
```

### 🗃️ Step 4: Create Database Tables

1. In your Supabase dashboard, go to **SQL Editor**
2. Click **"New query"**
3. Copy the entire contents of `supabase-schema.sql` from this project
4. Paste it into the SQL editor
5. Click **"Run"** to execute the script

This will create:
- `users` table - User accounts and authentication
- `communities` table - Residential communities
- `announcements` table - Community announcements
- `households` table - Household information
- `vehicles` table - Vehicle registrations
- `gate_passes` table - Visitor gate passes
- `guests` table - Guest check-ins
- `payments` table - HOA dues and payments

### 🚀 Step 5: Start the API Server

1. Stop any running API servers first
2. Run the new Supabase-enabled server:

```bash
cd api-server
node index-supabase.js
```

3. You should see output like:
```
🔌 Testing database connection...
✅ Database connection successful
🚀 HOA Community Platform API Server Started!
📍 Environment: development
🌐 Server URL: http://localhost:4003
💾 Database: Supabase (PostgreSQL)
✅ Server is ready to accept requests
```

### 🧪 Step 6: Test the Connection

1. Open your browser and go to: http://localhost:4003/api/health
2. You should see:
```json
{
  "status": "OK",
  "message": "HOA API Server is running",
  "database": "connected",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

3. Test login with any of these accounts:
   - **Superadmin**: `superadmin@demo.com` / `demo123`
   - **Admin**: `maria.garcia@sunnymeadows.com` / `demo123`
   - **Resident**: `emily.chen@residence.com` / `demo123`
   - **Security**: `security@sunnymeadows.com` / `demo123`

### 🔧 Step 7: Update Frontend Applications

All frontend applications should now work with the real database:

- **Admin Portal**: http://localhost:3003
- **Residence Portal**: http://localhost:3001
- **Sentinel Portal**: http://localhost:3002

### 📊 Features Now Available with Real Database

✅ **Persistent Data**: All data is saved even when server restarts
✅ **Multiple Users**: Real concurrent user support
✅ **Data Relationships**: Proper foreign key relationships
✅ **Real-time Updates**: Supabase supports real-time subscriptions
✅ **Production Ready**: PostgreSQL backend with proper indexing

### 🚨 Troubleshooting

#### **Database Connection Failed**
- Check your `.env` file for correct Supabase URL and keys
- Ensure you ran the SQL schema creation script
- Verify your Supabase project is active

#### **Authentication Issues**
- Make sure the users were created in the database
- Check that passwords are properly hashed
- Verify JWT secret is the same across all services

#### **Tables Not Found**
- Ensure you ran the complete `supabase-schema.sql` script
- Check the SQL Editor for any error messages
- Verify tables exist in the **Table Editor** in Supabase

### 🎯 Next Steps

1. **Customize**: Add your own communities and users
2. **Enhance**: Add more tables and relationships as needed
3. **Deploy**: Deploy to production using Supabase's hosting
4. **Monitor**: Use Supabase's dashboard to monitor database performance

### 📞 Need Help?

- **Supabase Docs**: https://supabase.com/docs
- **Project Issues**: Check the console for error messages
- **Database Help**: Use Supabase's AI assistant in the SQL editor