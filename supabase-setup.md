# Supabase Setup Instructions

Follow these steps to set up your Supabase project:

## Step 1: Create Supabase Account

1. Go to https://supabase.com
2. Click "Start your project"
3. Sign up with GitHub (recommended) or email
4. Verify your email if needed

## Step 2: Create New Project

1. Click "New Project"
2. Fill in the project details:
   - **Name**: `disc-error-dashboard` (or your preferred name)
   - **Database Password**: Create a strong password (save it!)
   - **Region**: Choose closest to your location (e.g., Southeast Asia)
3. Click "Create new project"
4. Wait 2-3 minutes for provisioning

## Step 3: Get API Credentials

Once your project is ready:

1. Go to **Project Settings** (gear icon) → **API**
2. Copy and save these values:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **anon public** key (starts with `eyJ...`)

## Step 4: Run Database Schema

1. In Supabase dashboard, click **SQL Editor** (
in left sidebar)
2. Click "New query"
3. Run the following SQL script:

```sql
-- Create reports table
CREATE TABLE reports (
    id SERIAL PRIMARY KEY,
    clinic VARCHAR(255) NOT NULL,
    sales_person VARCHAR(255) NOT NULL,
    disc_type VARCHAR(255) NOT NULL,
    lot_number VARCHAR(100) NOT NULL,
    expiry_date DATE NOT NULL,
    error_date DATE NOT NULL,
    report_date DATE NOT NULL,
    anomalies JSONB NOT NULL,
    status VARCHAR(50) DEFAULT 'Pending',
    do_number VARCHAR(100),
    release_date DATE,
    approved_by VARCHAR(100),
    approved_at TIMESTAMP,
    image_url TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (no auth required for now)
CREATE POLICY "Allow all operations" ON reports
    FOR ALL USING (true) WITH CHECK (true);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_reports_updated_at 
    BEFORE UPDATE ON reports 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

4. Click "Run" (or press Ctrl+Enter/Cmd+Enter)
5. Verify success message appears

## Step 5: Set Up Storage Bucket

1. Click **Storage** in left sidebar
2. Click "Create a new bucket"
3. Fill in:
   - **Name**: `disc-images`
   - **Public bucket**: Toggle ON (so images can be viewed without auth)
4. Click "Create bucket"

## Step 6: Configure Storage Policies

1. Click on the `disc-images` bucket
2. Click "Policies" tab
3. Click "New Policy"
4. Select "For full customization" → "Create policy"
5. Add these two policies:

**Policy 1: Allow Uploads**
```sql
CREATE POLICY "Allow uploads"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'disc-images');
```

**Policy 2: Allow Public Read**
```sql
CREATE POLICY "Allow public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'disc-images');
```

## Step 7: Provide Credentials

Once you have completed the above steps, provide me with:

1. **Supabase URL**: `https://xxxxx.supabase.co`
2. **Supabase Anon Key**: `eyJ...`

I'll add these to your project configuration and proceed with the frontend integration.

---

**Questions?**
- Can't find something? Check the Supabase dashboard navigation
- Need help? Let me know which step you're stuck on
