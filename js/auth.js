// Rate limiting for OTP
let lastOTPRequest = 0;
const OTP_COOLDOWN = 60000; // 1 minute
const OTP_EXPIRY_MINUTES = 10;
const OTP_COOLDOWN_SECONDS = 60;
const MIN_PASSWORD_LENGTH = 6;
const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[0-9]{10}$/;
// Global variables to store signup data temporarily
let signupData = {};

// Reset password email storage
let resetEmail = '';

// OTP timer
let otpTimer = null;

// Helper: Show/hide loading spinner
function setLoading(buttonId, isLoading) {
    const button = document.querySelector(`button[onclick="${buttonId}()"]`);
    if (!button) return;
    
    if (isLoading) {
        button.disabled = true;
        button.dataset.originalText = button.textContent;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
    } else {
        button.disabled = false;
        button.textContent = button.dataset.originalText || button.textContent;
    }
}

// Helper: Sanitize user input
function sanitizeInput(input) {
    const div = document.createElement('div');
    div.textContent = input;
    return div.innerHTML;
}
// Helper: Move to next OTP input
function moveToNext(current, nextFieldID) {
    // Only allow numbers
    current.value = current.value.replace(/[^0-9]/g, '');
    
    if (current.value.length >= current.maxLength) {
        if (nextFieldID) {
            document.getElementById(nextFieldID).focus();
        } else {
            // Last input, auto-verify
            verifyOTP();
        }
    }
}



/**
 * Log errors (development vs production)
 */
function logError(context, error) {
    const isDevelopment = window.location.hostname === 'localhost' || 
                         window.location.hostname === '127.0.0.1';
    
    if (isDevelopment) {
        console.error(`[${context}]`, error);
    } else {
        // Send to error tracking service (e.g., Sentry)
        // sentry.captureException(error, { context });
    }
}


/**
 * Check password strength
 */
function checkPasswordStrength(password) {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;
    
    const indicators = ['Weak', 'Fair', 'Good', 'Strong'];
    const colors = ['#ef4444', '#f59e0b', '#10b981', '#059669'];
    
    return { 
        text: indicators[strength] || 'Weak', 
        color: colors[strength] || '#ef4444',
        score: strength
    };
}

function showLogin() {
    document.getElementById('login-form').style.display = 'block';
    document.getElementById('signup-form').style.display = 'none';
    document.getElementById('forgot-password-form').style.display = 'none';
    document.getElementById('verify-otp-form').style.display = 'none';
    document.getElementById('reset-password-form').style.display = 'none';

    // Clear inputs
    document.getElementById('login-email').value = '';
    document.getElementById('login-password').value = '';
    
}


function showSignup() {
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('signup-form').style.display = 'block';
    document.getElementById('forgot-password-form').style.display = 'none'; 
    document.getElementById('verify-otp-form').style.display = 'none';
    document.getElementById('reset-password-form').style.display = 'none';

    // Clear inputs
    document.getElementById('signup-username').value = '';
    document.getElementById('signup-name').value = '';
    document.getElementById('signup-email').value = '';
    document.getElementById('signup-password').value = '';
    document.getElementById('signup-confirm-password').value = '';
    document.getElementById('signup-hostel').value = '';
    document.getElementById('signup-room').value = '';
    document.getElementById('signup-phone').value = '';
}

// Show Forgot Password Form
function showForgotPassword() {
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('signup-form').style.display = 'none';
    document.getElementById('forgot-password-form').style.display = 'block';
    document.getElementById('verify-otp-form').style.display = 'none';
    document.getElementById('reset-password-form').style.display = 'none';
}

/**
 * Show auth section (login/signup)
 */
function showAuth() {
    document.getElementById('auth-section').style.display = 'flex';
    document.getElementById('app-section').style.display = 'none';
}

/**
 * Show main app section (after login)
 */
function showApp() {
    document.getElementById('auth-section').style.display = 'none';
    document.getElementById('app-section').style.display = 'block';
}

/**
 * Handle user signup
 */
async function signup() {
    const username = sanitizeInput(document.getElementById('signup-username').value.trim());
    const name = sanitizeInput(document.getElementById('signup-name').value).trim();
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const confirmPassword = document.getElementById('signup-confirm-password').value;
    const hostel = sanitizeInput(document.getElementById('signup-hostel').value);
    const room = sanitizeInput(document.getElementById('signup-room').value.trim());
    const phone = sanitizeInput(document.getElementById('signup-phone').value).trim();

    // Clear previous errors
    clearAllErrors('signup-form');

    let hasError = false;

    // Username validation
    if (!username) {
        showError('signup-username', 'Username is required');
        hasError = true;
    } else if (!USERNAME_REGEX.test(username)) {
        showError('signup-username', 'Username: 3-20 characters, letters/numbers/underscore only');
        hasError = true;
    } else {
        showSuccess('signup-username');
    }

    // Name validation
    if (!name) {
        showError('signup-name', 'Full name is required');
        hasError = true;
    } else if (name.length < 3) {
        showError('signup-name', 'Name must be at least 3 characters');
        hasError = true;
    } else {
        showSuccess('signup-name');
    }

    // Email validation
    if (!email) {
        showError('signup-email', 'Email is required');
        hasError = true;
    } else if (!EMAIL_REGEX.test(email)) {
        showError('signup-email', 'Please enter a valid email address');
        hasError = true;
    } else {
        showSuccess('signup-email');
    }

    // Password validation
    if (!password) {
        showError('signup-password', 'Password is required');
        hasError = true;
    } else if (password.length < MIN_PASSWORD_LENGTH) {
        showError('signup-password', `Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
        hasError = true;
    } else {
        showSuccess('signup-password');
    }

    // Confirm password validation
    if (!confirmPassword) {
        showError('signup-confirm-password', 'Please confirm your password');
        hasError = true;
    } else if (password !== confirmPassword) {
        showError('signup-confirm-password', 'Passwords do not match');
        hasError = true;
    } else {
        showSuccess('signup-confirm-password');
    }

    // Hostel validation
    if (!hostel) {
        showError('signup-hostel', 'Please select your hostel');
        hasError = true;
    } else {
        showSuccess('signup-hostel');
    }

    // Room validation
    if (!room) {
        showError('signup-room', 'Room number is required');
        hasError = true;
    } else {
        showSuccess('signup-room');
    }

    // Phone validation
    if (!phone) {
        showError('signup-phone', 'Phone number is required');
        hasError = true;
    } else if (!PHONE_REGEX.test(phone)) {
        showError('signup-phone', 'Phone must be exactly 10 digits');
        hasError = true;
    } else {
        showSuccess('signup-phone');
    }


    if (hasError) return;


    try {
        setLoading('signup', true);

        // Check if username already exists
        const { data: existingUser , error:checkError} = await supabase
            .from('users')
            .select('id')
            .eq('username', username);
            //.single();
        
        if (checkError) {
            console.error('Username check error:', checkError);
        }

        if (existingUser && existingUser.length > 0)  {
            showError('signup-username', 'Username already taken. Try another.');
            setLoading('signup', false);
            return;
        }

        // Store signup data globally for later use
        signupData = {
            username,
            name,
            email,
            password,
            hostel,
            room,
            phone
        };

        //GPT-4.0 Code
        const emailVerificationCode = Math.floor(100000 + Math.random() * 900000).toString();

        // Save code in DB (you can create a table like 'email_verification_codes')
        await supabase
            .from('email_verification_codes')
            .insert([{
                email: email,
                code: emailVerificationCode,
                expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString()
            }]);

        // Send code via EmailJS
        await emailjs.send(
            "service_p15h08n",
            "template_6e4m53k", // Make a template for signup verification
            {
                to_email: email,
                otp_code: emailVerificationCode
            }
        );

        // Show verification code input form (create a new form like verify-email-form)
        document.getElementById('signup-form').style.display = 'none';
        document.getElementById('verify-email-form').style.display = 'block';
        document.getElementById('verify-email-address').textContent = email;

        // ✅ Show success message below the code input
        const msg = document.getElementById('verify-email-success');
        if (msg) {
            msg.textContent = "Verification code sent to your email!";
            msg.style.color = "#10b981";
        }

        setLoading('signup', false);

    } catch (error) {
        logError('signup', error);
    } finally {
        setLoading('signup', false); // ⬅️ ADD THIS
    }
}

async function resendEmailOTP() {
    const email = document.getElementById('verify-email-address').textContent;
    const emailVerificationCode = Math.floor(100000 + Math.random() * 900000).toString();

    await supabase
        .from('email_verification_codes')
        .insert([{
            email: email,
            code: emailVerificationCode,
            expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString()
        }]);

    await emailjs.send(
        "service_p15h08n",
        "template_6e4m53k",
        {
            to_email: email,
            otp_code: emailVerificationCode
        }
    );
    // Optionally show a message: "Code resent!"
}

async function login() {
    const loginInput = document.getElementById('login-email').value.trim();  // Email ya username
    const password = document.getElementById('login-password').value;


    // Clear previous errors
    clearAllErrors('login-form');

    // Validation
    if (!loginInput) {
        showError('login-email', 'Please enter your email or username');
        return;
    }

    if (!password) {
        showError('login-password', 'Please enter your password');
        return;
    }

    try {
        setLoading('login', true);

        let email = loginInput;

        // Check if input is username (not email format)
        if (!loginInput.includes('@')) {
            // Get email from username
            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('email')
                .eq('username', loginInput)
                .single();

            if (userError || !userData) {
                showError('login-email', 'Username not found. Please check and try again.');
                setLoading('login', false);
                return;
            } 
            email = userData.email;
            showSuccess('login-email');
        } else {
            // Validate email format
            if (!EMAIL_REGEX.test(loginInput)) {
                showError('login-email', 'Please enter a valid email address');
                setLoading('login', false);
                return;
            }
            showSuccess('login-email');
        }
            
        // Attempt sign in
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (error){
            if (error.message.includes('Invalid login credentials')) {
                showError('login-password', 'Incorrect password. Please try again.');
            } else if (error.message.includes('Email not confirmed')) {
                showError('login-email', 'Please verify your email first. Check your inbox.');
            } else {
                showError('login-password', error.message);
            }
            throw error;
        }
        showSuccess('login-password');

    } catch (error) {
        logError('login', error);
    }
    finally {
        setLoading('login', false); // ⬅️ ADD THIS
    }
}

/**
 * Handle user logout
 */
async function logout() {
    const { error } = await supabase.auth.signOut();
    if (error) alert('Error logging out');
}


/**
 * Start OTP expiry countdown timer
 */
function startOTPTimer() {
    clearInterval(otpTimer);
    let timeLeft = 600; // 10 minutes in seconds
    
    const timerDisplay = document.createElement('p');
    timerDisplay.id = 'otp-timer';
    timerDisplay.style.color = '#f59e0b';
    timerDisplay.style.textAlign = 'center';
    timerDisplay.style.fontSize = '14px';
    
    const otpForm = document.getElementById('verify-otp-form');
    otpForm.insertBefore(timerDisplay, otpForm.querySelector('button'));
    
    otpTimer = setInterval(() => {
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        timerDisplay.textContent = `⏰ Code expires in ${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        if (timeLeft <= 0) {
            clearInterval(otpTimer);
            timerDisplay.textContent = '⚠️ Code expired. Request a new one.';
            timerDisplay.style.color = '#ef4444';
        }
        timeLeft--;
    }, 1000);
}

// Helper: Move to next OTP input
function moveToNext(current, nextFieldID) {
    // Only allow numbers
    current.value = current.value.replace(/[^0-9]/g, '');
    
    if (current.value.length >= current.maxLength) {
        if (nextFieldID) {
            document.getElementById(nextFieldID).focus();
        } else {
            // Last input, auto-verify
            verifyOTP();
        }
    }
}

// Helper: Handle OTP paste
function handleOTPPaste(e) {
    e.preventDefault();
    const paste = (e.clipboardData || window.clipboardData).getData('text');
    const digits = paste.replace(/[^0-9]/g, '').slice(0, 6);
    
    for (let i = 0; i < digits.length; i++) {
        const input = document.getElementById(`otp${i + 1}`);
        if (input) input.value = digits[i];
    }
    
    if (digits.length === 6) {
        document.getElementById('otp6').focus();
        verifyOTP();
    }
}

// Call in sendOTP after showing OTP form
async function sendOTP() {
    const email = document.getElementById('forgot-email').value.trim();

    // Clear previous error
    clearFieldError('forgot-email');

    // Rate limiting check
    const now = Date.now();
    if (now - lastOTPRequest < OTP_COOLDOWN) {
        const waitTime = Math.ceil((OTP_COOLDOWN - (now - lastOTPRequest)) / 1000);
        showError('forgot-email', `Please wait ${waitTime} seconds before requesting another code.`);
        return;
    }

    if (!email) {
        showError('forgot-email', 'Please enter your email address');
        return;
    }

    if (!EMAIL_REGEX.test(email)) {
        showError('forgot-email', 'Please enter a valid email address');
        return;
    }
    try {
        // Check if user exists
        const { data: user } = await supabase
            .from('users')
            .select('email')
            .eq('email', email)
            .single();

        if (!user) {
            showError('forgot-email', 'No account found with this email address');
            return;
        }

        showSuccess('forgot-email');

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // Store OTP in database (expires in 10 minutes)
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
        
        const { error } = await supabase
            .from('password_reset_otps')
            .insert([{
                email: email,
                otp: otp,
                expires_at: expiresAt
            }]);

        if (error) throw error;
        // Update last request time
        lastOTPRequest = now;

        // ✅ SEND EMAIL USING EMAILJS
        
        try {
            const response = await emailjs.send(
                "service_p15h08n",     
                "template_nrssf4i",  
                {
                    to_email: email,
                    otp_code: otp
                }
            );
            console.log("✅ Email sent successfully!", response);

            // Development mode check
            const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

            if (isDevelopment) {
                // For testing: Show OTP in console (REMOVE in production!)
                //console.log('✅ OTP sent successfully to:', email);
                console.log('🔐 OTP (for testing):', otp);  // Remove in production
            }

            // Store email globally
            resetEmail = email;

            // Show OTP form
            document.getElementById('forgot-password-form').style.display = 'none';
            document.getElementById('verify-otp-form').style.display = 'block';
            document.getElementById('otp-email').textContent = email;

            startOTPTimer(); // Start OTP expiry timer
            //alert('Verification code sent to your email! Check your inbox.');

        } catch (emailError) {
            console.error('❌ Email sending failed:', emailError);
    
            // Still show OTP form (so user can enter OTP from console)
            resetEmail = email;
            document.getElementById('forgot-password-form').style.display = 'none';
            document.getElementById('verify-otp-form').style.display = 'block';
            document.getElementById('otp-email').textContent = email;
            
            startOTPTimer(); // Start OTP expiry timer

            alert('Email service temporarily unavailable. Your code is: ' + otp);
        }
    } catch (error) {
        logError('sendOTP', error);
        showError('forgot-email', 'An error occurred. Please try again.');
    }
}


async function verifyEmailOTP() {
    const email = document.getElementById('verify-email-address').textContent;
    const code = [
        'email-otp1', 'email-otp2', 'email-otp3',
        'email-otp4', 'email-otp5', 'email-otp6'
    ].map(id => document.getElementById(id).value).join('');

    if (code.length !== 6) {
        document.getElementById('verify-email-success').textContent = "Please enter complete 6-digit code";
        document.getElementById('verify-email-success').style.color = "#ef4444";
        return;
    }

    try {
    // Check code in DB
        const { data, error } = await supabase
            .from('email_verification_codes')
            .select('code')
            .eq('email', email)
            .eq('code', code)
            .single();

        if (error || !data) {
            // Show error below OTP inputs
            // You can add an error span below the OTP inputs
            // Show error below OTP inputs
            document.getElementById('verify-email-success').textContent = "Invalid code. Please try again.";
            document.getElementById('verify-email-success').style.color = "#ef4444";
            return;

        }

        // Code is valid - now create user in Supabase Auth
        const { data: authResponse, error: authError } = await supabase.auth.signUp({
            email: signupData.email,
            password: signupData.password,
            options: {
                emailRedirectTo: window.location.origin
            }
        });

        if (authError) {
            console.error('Auth error:', authError);
            document.getElementById('verify-email-success').textContent = authError.message;
            document.getElementById('verify-email-success').style.color = "#ef4444";
            return;
        }

        if (!authResponse || !authResponse.user) {
            document.getElementById('verify-email-success').textContent = "Failed to create account. Try again.";
            document.getElementById('verify-email-success').style.color = "#ef4444";
            return;
        }

        console.log('Auth user created with ID:', authResponse.user.id); 

        // Confirm email automatically using RPC
        const { error: confirmError } = await supabase.rpc('confirm_user_email', {
            user_id: authResponse.user.id
        });

        if (confirmError) {
            console.error('Confirm email error:', confirmError);
        }

        
    
        // Create user profile in users table
        const { error: profileError } = await supabase
            .from('users')
            .upsert([{
                id: authResponse.user.id,
                username: signupData.username,
                email: signupData.email,
                name: signupData.name,
                hostel: signupData.hostel,
                room_number: signupData.room,
                phone: signupData.phone,
                rating: 5.0,
                points: 0,
            }]);

        console.log('Profile insert result:', { error: profileError });  

        if (profileError) {
            document.getElementById('verify-email-success').textContent = profileError.message;
            document.getElementById('verify-email-success').style.color = "#ef4444";
            return;
        }

        // Hide verification form
        document.getElementById('verify-email-form').style.display = 'none';
        document.getElementById('email-verified-overlay').style.display = 'flex';

        // Clear signup data
        signupData = {};

    } catch (error) {
        logError('verifyEmailOTP', error);
        document.getElementById('verify-email-success').textContent = "Error: " + error.message;
        document.getElementById('verify-email-success').style.color = "#ef4444";
    }
}

function hideEmailVerifiedOverlay() {
    document.getElementById('email-verified-overlay').style.display = 'none';
    showAuth();
    showLogin();
}

// Step 2: Verify OTP
async function verifyOTP() {
    // Get OTP from inputs
    const otp = 
        document.getElementById('otp1').value +
        document.getElementById('otp2').value +
        document.getElementById('otp3').value +
        document.getElementById('otp4').value +
        document.getElementById('otp5').value +
        document.getElementById('otp6').value;

    if (otp.length !== 6) {
        alert('Please enter complete 6-digit code');
        return;
    }
    // Check resetEmail
    if (!resetEmail) {
        showToast('Error: Email not found. Start over.', 'error');
        return;
    }


    try {
        // Verify OTP from database
        const { data: otpRecord, error } = await supabase
            .from('password_reset_otps')
            .select('*')
            .eq('email', resetEmail)
            .eq('otp', otp)
            .eq('verified', false)
            .gt('expires_at', new Date().toISOString())
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (error || !otpRecord) {
            alert('Invalid or expired code');
            return;
        }
        // Mark OTP as verified
        await supabase
            .from('password_reset_otps')
            .update({ verified: true })
            .eq('id', otpRecord.id);

        // Show reset password form
        document.getElementById('verify-otp-form').style.display = 'none';
        document.getElementById('reset-password-form').style.display = 'block';

    } catch (error) {
        alert('Error: ' + error.message);
    }
}

async function resetPassword() {
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-new-password').value;

    if (!newPassword || !confirmPassword) {
        alert('Please fill all fields');
        return;
    }

    if (newPassword !== confirmPassword) {
        alert('Passwords do not match!');
        return;
    }
    if (newPassword.length < 6) {
        alert('Password must be at least 6 characters');
        return;
    }

    try {
        // Get user ID from users table using email
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('id')
            .eq('email', resetEmail)
            .single();

        if (userError || !userData) {
            alert('User not found');
            return;
        }
        console.log('User found:', userData.id);

        // Update password using RPC function
        const { error: pwdError } = await supabase.rpc('update_user_password', {
            user_id: userData.id,
            new_password: newPassword
        });

        if (pwdError) {
            console.error('Password update error:', pwdError);
            throw pwdError;
        }

        alert('Password reset successfully! Please login with your new password.');
        clearOTPForms();
        showLogin();

    } catch (error) {
        console.error('Reset password error:', error);
        alert('Error resetting password: ' + error.message);
    }
}



// Helper: Resend OTP
async function resendOTP() {
    // Clear old OTP inputs
    for (let i = 1; i <= 6; i++) {
        document.getElementById(`otp${i}`).value = '';
    }
    document.getElementById('otp1').focus();

    // Resend OTP
    document.getElementById('forgot-email').value = resetEmail;
    await sendOTP();
}

// Helper: Clear OTP forms
function clearOTPForms() {
    document.getElementById('forgot-email').value = '';
    for (let i = 1; i <= 6; i++) {
        document.getElementById(`otp${i}`).value = '';
    }
    document.getElementById('new-password').value = '';
    document.getElementById('confirm-new-password').value = '';
    resetEmail = '';
}

/**
 * Load current user's profile data
 */
async function loadUserData() {
    try{
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
                console.error('No user found');
                return;
            }

        const { data: profile, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', user.id)
            .maybeSingle();

            if (error) {
                console.error('Profile fetch error:', error);
                return;
            }
            if (!profile) {
                console.warn('Profile not found for user id:', user.id);
                return;
            }

            if (profile) {
                document.getElementById('user-name').textContent = `@${profile.username}`;
                document.getElementById('user-points').textContent = `${profile.points} pts`;
            }
    }  catch (error) {
        console.error('loadUserData error:', error);
    }
}

/**
 * Show inline error message
 */
function showError(inputId, message) {
    const input = document.getElementById(inputId);
    const errorElement = document.getElementById(`${inputId}-error`);
    
    if (input && errorElement) {
        input.classList.add('input-error');
        input.classList.remove('input-success');
        errorElement.textContent = message;
        
        // Auto-clear error on input
        input.addEventListener('input', function clearError() {
            clearFieldError(inputId);
            input.removeEventListener('input', clearError);
        });
    }
}


/**
 * Clear error for specific field
 */
function clearFieldError(inputId) {
    const input = document.getElementById(inputId);
    const errorElement = document.getElementById(`${inputId}-error`);
    
    if (input && errorElement) {
        input.classList.remove('input-error');
        errorElement.textContent = '';
    }
}

/**
 * Clear all errors in a form
 */
function clearAllErrors(formId) {
    const form = document.getElementById(formId);
    if (!form) return;
    
    const errorMessages = form.querySelectorAll('.error-message');
    const inputs = form.querySelectorAll('input, select');
    
    errorMessages.forEach(error => error.textContent = '');
    inputs.forEach(input => input.classList.remove('input-error', 'input-success'));
}

/**
 * Show success state for input
 */
function showSuccess(inputId) {
    const input = document.getElementById(inputId);
    if (input) {
        input.classList.remove('input-error');
        input.classList.add('input-success');
    }
}


// Show settings modal
function showSettings() {
    document.getElementById('settings-modal').style.display = 'flex';
}

// Close settings modal
function closeSettings() {
    document.getElementById('settings-modal').style.display = 'none';
}


// Show Edit Profile Modal and pre-fill user data
async function showEditProfile() {
    document.getElementById('settings-modal').style.display = 'none';
    document.getElementById('edit-profile-modal').style.display = 'flex';

    // Get current user from Supabase
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Fetch user profile from your users table
    const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

    // Pre-fill form fields
    document.getElementById('edit-name').value = profile?.name || '';
    document.getElementById('edit-username').value = profile?.username || '';
    document.getElementById('edit-email').value = profile?.email || '';
    document.getElementById('edit-hostel').value = profile?.hostel || '';
    document.getElementById('edit-room').value = profile?.room_number || '';
    document.getElementById('edit-phone').value = profile?.phone || '';
    document.getElementById('edit-profile-success').textContent = '';
}

function closeEditProfile() {
    document.getElementById('edit-profile-modal').style.display = 'none';
}

// Save updated profile to Supabase
async function saveProfile() {
    const name = document.getElementById('edit-name').value.trim();
    const username = document.getElementById('edit-username').value.trim();
    const email = document.getElementById('edit-email').value.trim();
    const hostel = document.getElementById('edit-hostel').value.trim();
    const room = document.getElementById('edit-room').value.trim();
    const phone = document.getElementById('edit-phone').value.trim();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Update users table
    const { error } = await supabase
        .from('users')
        .update({
            name: name,
            username: username,
            email: email,
            hostel: hostel,
            room_number: room,
            phone: phone
        })
        .eq('id', user.id);

    if (error) {
        document.getElementById('edit-profile-success').style.color = "#e63946";
        document.getElementById('edit-profile-success').textContent = "Failed to update profile. Try again.";
        return;
    }

    document.getElementById('edit-profile-success').style.color = "#10b981";
    document.getElementById('edit-profile-success').textContent = "Profile updated successfully!";

    // Optionally, update UI with new username/points etc.
    setTimeout(() => {
        closeEditProfile();
        // Optionally refresh user info in navbar
        // After successful update, call this:
        document.getElementById('user-name').textContent = username;
        // fetchAndShowUserInfo();
    }, 1200);
}

// Show Change Password Modal
function changePassword() {
    document.getElementById('settings-modal').style.display = 'none';
    document.getElementById('change-password-modal').style.display = 'flex';
    document.getElementById('change-password-form').reset();
    document.getElementById('change-password-msg').textContent = '';
}

// Close Change Password Modal
function closeChangePassword() {
    document.getElementById('change-password-modal').style.display = 'none';
}

// Handle Change Password Submit
async function changePasswordSubmit() {
    const currentPassword = document.getElementById('current-password').value;
    const newPassword = document.getElementById('change-new-password').value;
    const confirmNewPassword = document.getElementById('change-confirm-new-password').value;
    const msg = document.getElementById('change-password-msg');

    msg.style.color = "#e63946";

    if (!currentPassword || !newPassword || !confirmNewPassword) {
        msg.textContent = "All fields are required.";
        return;
    }
    if (newPassword.length < 6) {
        msg.textContent = "New password must be at least 6 characters.";
        return;
    }
    if (newPassword !== confirmNewPassword) {
        msg.textContent = "Passwords do not match.";
        return;
    }

    // Get current user email
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        msg.textContent = "User not found.";
        return;
    }

    // Re-authenticate user (Supabase needs current password for security)
    const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword
    });
    if (signInError) {
        msg.textContent = "Current password is incorrect.";
        return;
    }

    // Update password
    const { error } = await supabase.auth.updateUser({
        password: newPassword
    });
    if (error) {
        msg.textContent = "Failed to update password. Try again.";
        return;
    }

    msg.style.color = "#10b981";
    msg.textContent = "Password changed successfully!";
    setTimeout(() => {
        closeChangePassword();
    }, 1200);
}



function notificationPreferences() {
    document.getElementById('settings-modal').style.display = 'none';
    document.getElementById('notification-modal').style.display = 'flex';
    document.getElementById('notification-success').textContent = '';
    // Optionally, fetch and set current preferences from DB
}

function closeNotificationPreferences() {
    document.getElementById('notification-modal').style.display = 'none';
}

async function saveNotificationPreferences() {
    const emailNotif = document.getElementById('notif-email').checked;
    const appNotif = document.getElementById('notif-app').checked;
    const promoNotif = document.getElementById('notif-promo').checked;
    const msg = document.getElementById('notification-success');

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        msg.style.color = "#e63946";
        msg.textContent = "User not found.";
        return;
    }

    // Save preferences to users table
    const { error } = await supabase
        .from('users')
        .update({
            notif_email: emailNotif,
            notif_app: appNotif,
            notif_promo: promoNotif
        })
        .eq('id', user.id);

    if (error) {
        msg.style.color = "#e63946";
        msg.textContent = "Failed to save preferences.";
        return;
    }

    msg.style.color = "#10b981";
    msg.textContent = "Preferences saved!";
    setTimeout(() => {
        closeNotificationPreferences();
    }, 1200);
}



// ===== PAGE LOAD AUTHENTICATION CHECK =====
window.addEventListener('load', async () => {
    try {
        console.log('Step 1: Getting user...');
        const { data: { user } } = await supabase.auth.getUser();
        console.log('Step 2: User data:', user);
        
        // Pehle email verified overlay ko hide kar
        const overlay = document.getElementById('email-verified-overlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
        
        if (user) {
            console.log('Step 3a: User logged in, loading data...');
            await loadUserData();
            console.log('Step 3b: Data loaded, showing app...');
            showApp();
            console.log('Step 3c: App shown');
        } else {
            console.log('Step 3a: No user, showing auth...');
            showAuth();
            showLogin();
            console.log('Step 3b: Login shown');
        }
    } catch (error) {
        console.error('Step X: Error caught:', error);
        showAuth();
        showLogin();
    }
});