# Quick Debugging Guide - Data Persistence Issue

## Step 1: Check Browser Console

1. Open http://localhost:3000
2. Press **F12** to open Developer Tools
3. Click the **Console** tab
4. Look for these messages:

### ✅ Expected (Good):
```
✅ Supabase connection successful
Real-time update received: INSERT
```

### ❌ Common Errors (Bad):

**Error 1: Table not found**
```
Could not find the table 'public.reports' in the schema cache
ERROR 404
```
**Solution**: You need to run the SQL schema in Supabase SQL Editor

**Error 2: CORS error**
```
Access to fetch at 'https://...supabase.co' has been blocked by CORS policy
```
**Solution**: Check Supabase project settings, ensure it's not paused

**Error 3: Connection failed**
```
Failed to load reports: [error message]
```
**Solution**: Check internet connection, verify Supabase URL and key

---

## Step 2: Manual Test

### Test Report Creation

1. Login with: **Admin_Primary** / **admin123**
2. Fill out the form:
   - Clinic: "Test Clinic"
   - Sales: "Test Person"  
   - Disc Type: Any
   - Lot: "LOT123"
   - Dates: Today
   - Select 2 anomalies
3. Click **Submit Report**
4. Check console for errors
5. **Does the report appear in worklist?** → If YES, go to step 3
6. **If NO**, check console for red errors

### Step 3: Test Persistence

1. **Refresh the page** (F5 or Ctrl+R)
2. Login again if needed
3. **Is the report still there?**
   - **YES** → ✅ Supabase is working correctly!
   - **NO** → See Step 4

---

## Step 4: Verify Supabase Setup

### Check Database Table Exists

1. Go to https://supabase.com/dashboard
2. Select your project
3. Click **Table Editor** (left sidebar)
4. Look for **reports** table
5. **Is it there?**
   - **NO** → You need to run the SQL schema (see supabase-setup.md Step 4)
   - **YES** → Continue to next check

### Check if Data Was Saved

1. In Supabase dashboard, click **Table Editor**
2. Click on **reports** table
3. Do you see any rows?
   - **YES** → Data is saving, might be a loading issue
   - **NO** → Data is not saving, check console errors

---

## Step 5: Verify Code is Running Latest Version

### Check if File is Updated

1. Open DevTools (F12)
2. Go to **Sources** tab
3. Find `supabase-client.js` in the file tree
4. **Is the file there?**
   - **YES** → Good, Supabase code is loaded
   - **NO** → You might need to hard refresh (Ctrl+Shift+R)

### Hard Refresh

Sometimes browsers cache old code:

1. Press **Ctrl + Shift + R** (Windows) or **Cmd + Shift + R** (Mac)
2. This clears cache and reloads fresh code
3. Try the test again

---

## Step 6: Check Vercel Deployment

Your localhost might work but Vercel might not have deployed yet:

1. Go to https://vercel.com/dashboard
2. Find your **discclaiming** project
3. Click on it
4. Check the latest deployment status:
   - **Building** → Wait for it to finish
   - **Ready** → Deployment is live
   - **Failed** → Check build logs for errors

---

## Common Solutions

### Solution 1: Database Schema Not Created

**Problem**: "Table 'reports' not found" error

**Fix**:
1. Go to Supabase dashboard → SQL Editor
2. Copy SQL from `supabase-setup.md` Step 4 (the CREATE TABLE script)
3. Paste and run it
4. Refresh your app

### Solution 2: Old Code Cached

**Problem**: Changes not appearing

**Fix**:
1. Press Ctrl+Shift+R to hard refresh
2. Or clear browser cache completely
3. Reload the app

### Solution 3: Storage Policies Missing

**Problem**: Images not saving

**Fix**:
1. Go to Supabase → Storage → disc-images bucket
2. Click Policies tab
3. Ensure both INSERT and SELECT policies exist
4. If not, add them (see supabase-setup.md Step 6)

---

## What to Report Back

If none of the above solutions work, please tell me:

1. **Exact error message from console** (copy and paste the red error)
2. **Do you see the reports table in Supabase dashboard?**
3. **Does data appear in Supabase Table Editor after submission?**
4. **Are you testing on localhost:3000 or the Vercel URL?**

This will help me pinpoint the exact issue!
