// Supabase Configuration and API Client

const SUPABASE_URL = 'https://izhoebtdmbfsvlmwjfah.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml6aG9lYnRkbWJmc3ZsbXdqZmFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyNjgxMTYsImV4cCI6MjA4Mzg0NDExNn0.uFfE_0fQQrmx7JoF4fky6K50BJSrV7PocdOVo5k1rNk';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('❌ Missing Supabase Credentials');
    alert('Critical Error: Supabase credentials are missing. Please check configuration.');
}

// Initialize Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ========================================
// Reports API Functions
// ========================================

/**
 * Fetch all reports from the database
 * @returns {Promise<Array>} Array of report objects
 */
async function fetchReports() {
    try {
        const { data, error } = await supabase
            .from('reports')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error fetching reports:', error);
        return [];
    }
}

/**
 * Create a new report in the database
 * @param {Object} reportData - Report data to insert
 * @returns {Promise<Object>} Created report object
 */
async function createReport(reportData) {
    try {
        const { data, error } = await supabase
            .from('reports')
            .insert([reportData])
            .select()
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error creating report:', error);
        throw error;
    }
}

/**
 * Update a report (e.g., mark as completed)
 * @param {number} reportId - ID of the report to update
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated report object
 */
async function updateReport(reportId, updates) {
    try {
        const { data, error } = await supabase
            .from('reports')
            .update(updates)
            .eq('id', reportId)
            .select()
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error updating report:', error);
        throw error;
    }
}

// ========================================
// Image Upload Functions
// ========================================

/**
 * Upload image to Supabase Storage
 * @param {File} file - Image file to upload
 * @returns {Promise<string>} Public URL of uploaded image
 */
async function uploadImage(file) {
    try {
        // Generate unique filename
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `disc-photos/${fileName}`;

        // Upload to Supabase Storage
        const { data, error } = await supabase.storage
            .from('disc-images')
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false
            });

        if (error) throw error;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
            .from('disc-images')
            .getPublicUrl(filePath);

        return publicUrl;
    } catch (error) {
        console.error('Error uploading image:', error);
        throw error;
    }
}

// ========================================
// Real-time Subscriptions
// ========================================

/**
 * Subscribe to real-time database changes
 * @param {Function} callback - Function to call when data changes
 * @returns {Object} Subscription object
 */
function subscribeToReports(callback) {
    const subscription = supabase
        .channel('reports-channel')
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'reports'
            },
            (payload) => {
                console.log('Real-time update:', payload);
                callback(payload);
            }
        )
        .subscribe();

    return subscription;
}

/**
 * Unsubscribe from real-time updates
 * @param {Object} subscription - Subscription to cancel
 */
function unsubscribeFromReports(subscription) {
    if (subscription) {
        supabase.removeChannel(subscription);
    }
}

// ========================================
// Auth API Functions
// ========================================

/**
 * Verify user credentials against the database
 * @param {string} username 
 * @param {string} password 
 * @returns {Promise<Object>} User profile if valid, or throws error
 */
async function verifyUser(username, password) {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('username', username)
            .single();

        if (error) {
            if (error.code === 'PGRST116') throw new Error('User not found');
            throw error;
        }

        if (data.password !== password) {
            throw new Error('Incorrect password');
        }

        return data;
    } catch (error) {
        console.error('Auth error:', error.message);
        throw error;
    }
}

// ========================================
// Emergency & Debug Functions
// ========================================

/**
 * Force create an admin user if one doesn't exist (Emergency Seeding)
 */
async function seedAdmin() {
    console.log('Attempting to seed admin...');
    try {
        // Check if admin exists
        const { data: existingUser } = await supabase
            .from('profiles')
            .select('*')
            .eq('username', 'admin')
            .single();

        if (existingUser) {
            console.log('✅ Admin user already exists');
            return { success: true, message: 'Admin already exists' };
        }

        // Create admin
        const { data, error } = await supabase
            .from('profiles')
            .insert([{
                username: 'admin',
                password: 'admin',
                role: 'Admin',
                name: 'Emergency Admin'
            }])
            .select()
            .single();

        if (error) throw error;

        console.log('✅ Admin user created successfully');
        return { success: true, message: 'Admin created: admin / admin' };
    } catch (error) {
        console.error('❌ Seeding failed:', error);
        return { success: false, message: error.message };
    }
}

/**
 * Check database health and connectivity
 */
async function checkHealth() {
    try {
        const start = Date.now();
        const { data, error } = await supabase
            .from('profiles')
            .select('count')
            .limit(1);

        const latency = Date.now() - start;

        if (error) throw error;

        return {
            status: 'online',
            latency: `${latency}ms`,
            message: 'Database connected'
        };
    } catch (error) {
        return {
            status: 'offline',
            latency: 0,
            message: error.message
        };
    }
}

// Make emergency functions globally available
window.emergency = {
    seedAdmin,
    checkHealth
};

// ========================================
// Utility Functions
// ========================================

async function testConnection() {
    try {
        const { data, error } = await supabase
            .from('reports')
            .select('id')
            .limit(1);

        if (error) throw error;
        console.log('✅ Supabase connection successful');
        return true;
    } catch (error) {
        console.error('❌ Supabase connection failed:', error);
        return false;
    }
}
