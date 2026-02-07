// ========================================
// SUPABASE CONFIGURATION
// ========================================

// Supabase Configuration
// Project ID: kljcbqxqemwlmjzcdrol
const SUPABASE_URL = 'https://kljcbqxqemwlmjzcdrol.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtsamNicXhxZW13bG1qemNkcm9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0NDAwNjgsImV4cCI6MjA4NjAxNjA2OH0.ys7lbcmLHATIbkYJrIFbLYqTb78SLStwkADkZb1jUH8';

// Initialize Supabase client
// Wait for Supabase to load, then initialize
let supabase;

function initializeSupabase() {
    try {
        // Check for global Supabase (from CDN - UMD build)
        if (typeof window !== 'undefined' && window.supabase && window.supabase.createClient) {
            supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            console.log('✅ Supabase initialized from CDN');
            return true;
        } 
        // Check for ES6 import (if using modules)
        else if (typeof createClient !== 'undefined') {
            supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            console.log('✅ Supabase initialized from ES6 import');
            return true;
        } else {
            return false;
        }
    } catch (error) {
        console.error('❌ Failed to initialize Supabase:', error);
        return false;
    }
}

// Initialize immediately if Supabase is already loaded
if (typeof window !== 'undefined') {
    if (window.supabase) {
        initializeSupabase();
    } else {
        // Wait for Supabase to load
        window.addEventListener('load', () => {
            setTimeout(() => {
                if (!supabase) {
                    initializeSupabase();
                }
            }, 100);
        });
    }
}

// ========================================
// UPLOAD VIDEO TO SUPABASE
// ========================================

async function uploadVideoToSupabase(videoBlob, fileName) {
    try {
        console.log('Starting Supabase upload:', fileName);
        console.log('File size:', (videoBlob.size / 1024 / 1024).toFixed(2), 'MB');

        // Determine content type based on file extension
        const contentType = fileName.endsWith('.mp4') ? 'video/mp4' : 
                           fileName.endsWith('.webm') ? 'video/webm' : 
                           'video/webm';
        
        // Upload to Supabase Storage
        const { data, error } = await supabase.storage
            .from('photobooth-videos')
            .upload(`public/${fileName}`, videoBlob, {
                cacheControl: '3600',
                upsert: false,
                contentType: contentType
            });

        if (error) {
            console.error('Supabase upload error:', error);
            throw new Error(`Upload failed: ${error.message}`);
        }

        console.log('Upload successful:', data);

        // Get public URL
        const { data: publicData } = supabase.storage
            .from('photobooth-videos')
            .getPublicUrl(`public/${fileName}`);

        const publicUrl = publicData.publicUrl;
        console.log('Public URL:', publicUrl);

        return publicUrl;

    } catch (error) {
        console.error('Supabase upload error:', error);
        throw error;
    }
}

// ========================================
// SAVE SESSION METADATA
// ========================================

async function saveSessionMetadata(sessionData) {
    try {
        console.log('Saving session metadata...');

        const { data, error } = await supabase
            .from('photobooth_sessions')
            .insert([
                {
                    video_url: sessionData.videoUrl,
                    file_name: sessionData.fileName,
                    template_style: sessionData.templateStyle,
                    photo_count: sessionData.photoCount,
                    file_size: sessionData.fileSize,
                    created_at: new Date().toISOString(),
                    device_info: sessionData.deviceInfo
                }
            ]);

        if (error) {
            console.error('Metadata save error:', error);
            throw error;
        }

        console.log('Metadata saved successfully:', data);
        return data;

    } catch (error) {
        console.error('Error saving metadata:', error);
        // Don't throw - metadata is optional
        return null;
    }
}

// ========================================
// GET SESSION HISTORY
// ========================================

async function getSessionHistory(limit = 10) {
    try {
        const { data, error } = await supabase
            .from('photobooth_sessions')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) throw error;

        return data;

    } catch (error) {
        console.error('Error fetching session history:', error);
        return [];
    }
}

// ========================================
// DELETE OLD SESSIONS
// ========================================

async function deleteOldSessions(daysOld = 30) {
    try {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysOld);

        const { data, error } = await supabase
            .from('photobooth_sessions')
            .delete()
            .lt('created_at', cutoffDate.toISOString());

        if (error) throw error;

        console.log(`Deleted ${data.length} old sessions`);
        return data;

    } catch (error) {
        console.error('Error deleting old sessions:', error);
        return [];
    }
}

// ========================================
// TEST CONNECTION
// ========================================

async function testSupabaseConnection() {
    try {
        console.log('Testing Supabase connection...');

        // Try to fetch a small amount of data
        const { data, error } = await supabase
            .from('photobooth_sessions')
            .select('count')
            .limit(1);

        if (error) {
            console.error('Connection test failed:', error);
            return false;
        }

        console.log('✅ Supabase connection successful');
        return true;

    } catch (error) {
        console.error('Connection test error:', error);
        return false;
    }
}

// ========================================
// EXPORTS (for dynamic import in script.js)
// ========================================

// Export functions for use in script.js
if (typeof module !== 'undefined' && module.exports) {
    // Node.js/CommonJS
    module.exports = {
        supabase,
        uploadVideoToSupabase,
        saveSessionMetadata,
        getSessionHistory,
        deleteOldSessions,
        testSupabaseConnection
    };
} else {
    // Browser/ES6 modules - create a global object
    window.supabaseConfig = {
        supabase,
        uploadVideoToSupabase,
        saveSessionMetadata,
        getSessionHistory,
        deleteOldSessions,
        testSupabaseConnection
    };
    
    // Also support ES6 export syntax if using modules
    if (typeof window !== 'undefined') {
        window.supabaseModule = {
            supabase,
            uploadVideoToSupabase,
            saveSessionMetadata,
            getSessionHistory,
            deleteOldSessions,
            testSupabaseConnection
        };
    }
}