// Supabase Configuration and API Client

const SUPABASE_URL = 'https://izhoebtdmbfsvlmwjfah.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_duMbtpyCZ3YDV2ZhHmHrEQ_xPq3qOAZ';

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
