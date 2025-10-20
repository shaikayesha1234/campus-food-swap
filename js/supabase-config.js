const SUPABASE_URL = 'https://ipsxjgxwvstibnvnktbg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlwc3hqZ3h3dnN0aWJudm5rdGJnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0MTUxNTAsImV4cCI6MjA3NTk5MTE1MH0.v8r2MkUXCJ3lZF7Hhe_1r6NlkidMDqh0IgQk-w3ORxA';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

supabase.auth.onAuthStateChange((event, session) => {
    console.log('🔐 Auth state changed:', event);
    
    if (session) {
        console.log('✅ User logged in');
        
        // Check if functions exist before calling
        if (typeof showApp === 'function') {
            showApp();
        } else {
            console.error('❌ showApp is not defined');
        }
        
        if (typeof loadUserData === 'function') {
            loadUserData();
        } else {
            console.error('❌ loadUserData is not defined');
        }
        
        if (typeof loadFoods === 'function') {
            loadFoods();
        } else {
            console.error('❌ loadFoods is not defined');
        }
    } else {
        console.log('❌ User logged out');
        
        if (typeof showAuth === 'function') {
            showAuth();
        } else {
            console.error('❌ showAuth is not defined - Make sure auth.js loads BEFORE supabase-config.js');
        }
    }
});

console.log('✅ Supabase initialized');