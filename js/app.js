// GreenServe - Main JavaScript File

// DOM Ready
document.addEventListener('DOMContentLoaded', function() {
    initMobileMenu();
    initGetStarted();
    initForms();
    initTabs();
    initRating();
    initWorkerStatus();
    initBookingFlow();
    initEmailValidation();
    checkAuthStatus();
    handleGoogleCallback(); // ✅ Run on every page load to catch OAuth redirects
});

// Check authentication status on page load
function checkAuthStatus() {
    const token = localStorage.getItem('token');
    let user = {};
    try {
        user = JSON.parse(localStorage.getItem('user') || '{}');
    } catch(e) {
        user = {};
    }
    
    // ✅ FIX: Support both _id (MongoDB) and id (normalized) formats
    const userId = user._id || user.id || user.userId;

    const userMenu = document.getElementById('userMenu');
    const authButtons = document.getElementById('authButtons');
    const userName = document.getElementById('userName');
    
    if (token && userId) {
        if (userMenu) userMenu.style.display = 'flex';
        if (authButtons) authButtons.style.display = 'none';
        // ✅ FIX: Support both first_name/last_name and firstName/lastName formats
        const firstName = user.first_name || user.firstName || user.name || 'User';
        const lastName = user.last_name || user.lastName || '';
        if (userName) userName.textContent = lastName ? `${firstName} ${lastName}` : firstName;
    } else {
        if (userMenu) userMenu.style.display = 'none';
        if (authButtons) authButtons.style.display = 'flex';
    }
}

// ✅ FIX: Defined BEFORE the window.* exports at the bottom
// Google OAuth Callback Handler - reads ?token= from URL after OAuth redirect
function handleGoogleCallback() {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    
    if (token) {
        localStorage.setItem('token', token);
        showToast('Google sign-in successful!', 'success');
        // Remove token from URL to keep it clean
        window.history.replaceState({}, document.title, window.location.pathname);
        setTimeout(() => {
            window.location.href = 'services.html';
        }, 1000);
    }
}

// Google Sign-In Handler - redirects to backend OAuth flow
function handleGoogleSignIn() {
    window.location.href = 'https://greenserve-platform.onrender.com/api/auth/google';
}

// Mobile Menu Toggle
function initMobileMenu() {
    const mobileMenuToggle = document.getElementById('mobileMenuToggle');
    const navMenu = document.querySelector('.nav-menu');
    
    if (mobileMenuToggle && navMenu) {
        mobileMenuToggle.addEventListener('click', () => {
            navMenu.classList.toggle('active');
        });
    }
}

// Get Started Button Toggle
function initGetStarted() {
    const getStartedBtn = document.getElementById('getStartedBtn');
    const authOptions = document.getElementById('authOptions');
    
    if (getStartedBtn && authOptions) {
        getStartedBtn.addEventListener('click', () => {
            if (authOptions.style.display === 'none') {
                authOptions.style.display = 'flex';
                getStartedBtn.style.display = 'none';
            } else {
                authOptions.style.display = 'none';
                getStartedBtn.style.display = 'block';
            }
        });
    }
}

// Form Validation & Handling
function initForms() {
    console.log('🔧 Initializing forms...');
    
    // OTP Auto-focus
    const otpInputs = document.querySelectorAll('.otp-input');
    otpInputs.forEach((input, index) => {
        input.addEventListener('input', (e) => {
            if (e.target.value.length === 1 && index < otpInputs.length - 1) {
                otpInputs[index + 1].focus();
            }
        });
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && index > 0 && !e.target.value) {
                otpInputs[index - 1].focus();
            }
        });
    });
    
    const forms = document.querySelectorAll('form[data-submit]');
    console.log(`📝 Found ${forms.length} forms with data-submit attribute`);
    forms.forEach((form, index) => {
        console.log(`📋 Setting up form ${index + 1}: ${form.id}`);
        form.addEventListener('submit', handleFormSubmit);
    });
}

function handleFormSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const submitBtn = form.querySelector('[type="submit"]');
    const originalText = submitBtn ? submitBtn.getAttribute('data-original-text') : 'Submit';
    
    console.log('🔍 Form submission started:', form.id);
    
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner"></span>';
    }
    
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    console.log('📋 Form data:', data);
    
    const formId = form.id;
    let apiUrl = '';
    
    if (formId === 'userRegisterForm') {
        apiUrl = 'https://greenserve-platform.onrender.com/api/auth/register';
    } else if (formId === 'workerRegisterForm') {
        apiUrl = 'https://greenserve-platform.onrender.com/api/auth/register-worker';
    } else if (formId === 'worker-register-form-123') {
        apiUrl = 'https://greenserve-platform.onrender.com/api/auth/register-worker';
    } else if (formId === 'loginForm') {
        apiUrl = 'https://greenserve-platform.onrender.com/api/auth/login';
    } else if (formId === 'otpForm') {
        apiUrl = 'https://greenserve-platform.onrender.com/api/auth/verify-otp';
    } else if (formId === 'bookingForm') {
        apiUrl = 'https://greenserve-platform.onrender.com/api/bookings';
    }
    
    console.log('🌐 API URL:', apiUrl);

    // ✅ RESTORED: Authentication required for booking
    if (formId === 'bookingForm') {
        let user = {};
        try { user = JSON.parse(localStorage.getItem('user') || '{}'); } catch(e) {}
        const userId = user._id || user.id || user.userId;
        if (userId) data.userId = userId;
        console.log('🆔 Service ID in booking:', data.serviceId);
        console.log('👤 User ID in booking:', data.userId);
    }
    
    if (apiUrl) {
        const headers = { 'Content-Type': 'application/json' };

        // ✅ RESTORED: Attach auth token for protected endpoints
        if (formId === 'bookingForm') {
            const token = localStorage.getItem('token');
            if (token) headers['Authorization'] = `Bearer ${token}`;
        }

        fetch(apiUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify(data)
        })
        .then(response => {
            console.log('📡 Response status:', response.status);
            console.log('📡 Response headers:', response.headers);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return response.json();
        })
        .then(result => {
            console.log('✅ API result:', result);
            
            if (result.success) {
                showToast(result.message, 'success');
                
                if (formId === 'userRegisterForm') {
                    const mobile = data.mobile;
                    showToast('Registration successful! Redirecting...', 'success');
                    setTimeout(() => {
                        window.location.href = `otp-verify.html?mobile=${encodeURIComponent(mobile)}&type=user`;
                    }, 1000);
                } else if (formId === 'workerRegisterForm' || formId === 'worker-register-form-123') {
                    const mobile = data.mobile;
                    showToast('Worker registration successful! Redirecting...', 'success');
                    setTimeout(() => {
                        window.location.href = `otp-verify.html?mobile=${encodeURIComponent(mobile)}&type=worker`;
                    }, 1000);
                } else if (formId === 'loginForm') {
                    if (result.data && result.data.token) {
                        localStorage.setItem('token', result.data.token);
                        localStorage.setItem('user', JSON.stringify(result.data.user));
                        showToast('Login successful! Redirecting...', 'success');
                        setTimeout(() => {
                            window.location.href = 'services.html';
                        }, 1000);
                    } else if (result.data && result.data.requiresVerification) {
                        const mobile = result.data.mobile || data.mobile;
                        showToast('Please verify your mobile number', 'warning');
                        setTimeout(() => {
                            window.location.href = `otp-verify.html?mobile=${encodeURIComponent(mobile)}`;
                        }, 1000);
                    } else {
                        showToast('Login failed. Please check your credentials.', 'error');
                    }
                } else if (formId === 'bookingForm') {
                    if (result.data && result.data._id) {
                        localStorage.setItem('lastBooking', JSON.stringify(result.data));
                        showToast('Booking successful! Redirecting...', 'success');
                        setTimeout(() => {
                            window.location.href = 'bookings.html';
                        }, 1000);
                    } else {
                        showToast('Booking failed. Please try again.', 'error');
                    }
                } else if (formId === 'otpForm') {
                    if (result.data.token) {
                        localStorage.setItem('token', result.data.token);
                        localStorage.setItem('user', JSON.stringify(result.data.user));
                    }
                    const redirect = form.dataset.redirect;
                    if (redirect) window.location.href = redirect;
                } else {
                    const redirect = form.dataset.redirect;
                    if (redirect) window.location.href = redirect;
                }
            } else {
                console.error('❌ API error:', result.message);
                showToast(result.message, 'error');
            }
        })
        .catch(error => {
            console.error('💥 Network error:', error);
            showToast('Submission failed. Please try again.', 'error');
        })
        .finally(() => {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = submitBtn.dataset.originalText || 'Submit';
            }
        });
    } else {
        console.log('⚠️ No API URL found, using fallback');
        setTimeout(() => {
            showToast('Success!', 'success');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = submitBtn.dataset.originalText || 'Submit';
            }
            const redirect = form.dataset.redirect;
            if (redirect) window.location.href = redirect;
        }, 1500);
    }
}

// Tabs
function initTabs() {
    const tabContainers = document.querySelectorAll('.tabs');
    tabContainers.forEach(container => {
        const tabs = container.querySelectorAll('.tab');
        const tabContents = container.parentElement.querySelectorAll('.tab-content');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const target = tab.dataset.tab;
                tabs.forEach(t => t.classList.remove('active'));
                tabContents.forEach(c => c.classList.remove('active'));
                tab.classList.add('active');
                document.getElementById(target)?.classList.add('active');
            });
        });
    });
}

// Rating Stars
function initRating() {
    const ratingContainers = document.querySelectorAll('.rating-stars');
    ratingContainers.forEach(container => {
        const stars = container.querySelectorAll('i');
        const input = container.parentElement.querySelector('input[name="rating"]');
        stars.forEach((star, index) => {
            star.addEventListener('click', () => {
                stars.forEach((s, i) => s.classList.toggle('active', i <= index));
                if (input) input.value = index + 1;
            });
            star.addEventListener('mouseenter', () => {
                stars.forEach((s, i) => { s.style.color = i <= index ? 'var(--accent)' : ''; });
            });
        });
        container.addEventListener('mouseleave', () => {
            stars.forEach(s => { s.style.color = s.classList.contains('active') ? 'var(--accent)' : ''; });
        });
    });
}

// Worker Online/Offline Toggle
function initWorkerStatus() {
    const statusToggle = document.querySelector('.status-toggle');
    const statusLabel = document.querySelector('.status-label');
    if (statusToggle) {
        statusToggle.addEventListener('click', () => {
            statusToggle.classList.toggle('active');
            const isActive = statusToggle.classList.contains('active');
            if (statusLabel) {
                statusLabel.textContent = isActive ? 'Online' : 'Offline';
                statusLabel.style.color = isActive ? 'var(--primary)' : 'var(--gray-500)';
            }
            showToast(isActive ? 'You are now online!' : 'You are now offline', 'info');
        });
    }
}

// Booking Flow
function initBookingFlow() {
    const serviceCards = document.querySelectorAll('.service-option');
    serviceCards.forEach(card => {
        card.addEventListener('click', () => {
            serviceCards.forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
        });
    });
    
    const dateInputs = document.querySelectorAll('.date-option');
    dateInputs.forEach(date => {
        date.addEventListener('click', () => {
            dateInputs.forEach(d => d.classList.remove('selected'));
            date.classList.add('selected');
        });
    });
    
    const timeSlots = document.querySelectorAll('.time-slot');
    timeSlots.forEach(slot => {
        slot.addEventListener('click', () => {
            timeSlots.forEach(s => s.classList.remove('selected'));
            slot.classList.add('selected');
        });
    });
    
    const paymentMethods = document.querySelectorAll('.payment-method');
    paymentMethods.forEach(method => {
        method.addEventListener('click', () => {
            paymentMethods.forEach(m => m.classList.remove('active'));
            method.classList.add('active');
            const radio = method.querySelector('input[type="radio"]');
            if (radio) radio.checked = true;
        });
    });
}

// Toast Notifications
function showToast(message, type = 'info') {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function simulateTracking() {
    const etaElement = document.querySelector('.eta-value');
    if (!etaElement) return;
    let eta = 15;
    const interval = setInterval(() => {
        eta--;
        if (etaElement) etaElement.textContent = eta + ' min';
        if (eta <= 0) {
            clearInterval(interval);
            showToast('Worker has arrived!', 'success');
        }
    }, 60000);
}

function cancelBooking(bookingId) {
    if (confirm('Are you sure you want to cancel this booking?')) {
        showToast('Booking cancelled successfully', 'success');
    }
}

function acceptBooking(bookingId) { showToast('Booking accepted!', 'success'); }

function rejectBooking(bookingId) {
    if (confirm('Are you sure you want to reject this booking?')) {
        showToast('Booking rejected', 'info');
    }
}

function startService(bookingId) { showToast('Service started!', 'success'); }

function completeService(bookingId) {
    showToast('Service completed! Redirecting to payment...', 'success');
    setTimeout(() => { window.location.href = 'payment.html?booking=' + bookingId; }, 1500);
}

function getCurrentLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                showToast('Location detected successfully', 'success');
                console.log('Location:', latitude, longitude);
            },
            () => { showToast('Unable to get location. Please enter manually.', 'error'); }
        );
    } else {
        showToast('Geolocation is not supported by this browser', 'error');
    }
}

function initAddressAutocomplete() {
    const addressInput = document.getElementById('address');
    const suggestions = document.getElementById('address-suggestions');
    if (!addressInput || !suggestions) return;
    addressInput.addEventListener('input', (e) => {
        const value = e.target.value;
        if (value.length > 2) {
            suggestions.innerHTML = `
                <div class="suggestion-item" onclick="selectAddress(this)">${value}, Bangalore</div>
                <div class="suggestion-item" onclick="selectAddress(this)">${value}, Koramangala</div>
                <div class="suggestion-item" onclick="selectAddress(this)">${value}, Indiranagar</div>
            `;
            suggestions.style.display = 'block';
        } else {
            suggestions.style.display = 'none';
        }
    });
}

function selectAddress(element) {
    const addressInput = document.getElementById('address');
    if (addressInput) addressInput.value = element.textContent;
    const suggestions = document.getElementById('address-suggestions');
    if (suggestions) suggestions.style.display = 'none';
}

window.addEventListener('load', initAddressAutocomplete);

function scrollToSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) section.scrollIntoView({ behavior: 'smooth' });
}

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) { modal.style.display = 'flex'; document.body.style.overflow = 'hidden'; }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) { modal.style.display = 'none'; document.body.style.overflow = ''; }
}

window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        e.target.style.display = 'none';
        document.body.style.overflow = '';
    }
});

function formatCurrency(amount) {
    return '₹' + amount.toLocaleString('en-IN');
}

function calculateTotal() {
    const basePrice = parseInt(document.getElementById('base-price')?.value || 0);
    const serviceCharge = Math.round(basePrice * 0.1);
    const tax = Math.round(basePrice * 0.18);
    const total = basePrice + serviceCharge + tax;
    const elements = { 'service-charge': serviceCharge, 'tax': tax, 'total-amount': total };
    for (const [id, value] of Object.entries(elements)) {
        const el = document.getElementById(id);
        if (el) el.textContent = formatCurrency(value);
    }
    return total;
}

function togglePassword(inputId) {
    const passwordInput = document.getElementById(inputId);
    const passwordIcon = document.getElementById(inputId + 'Icon');
    if (!passwordInput || !passwordIcon) return;
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        passwordIcon.classList.replace('fa-eye', 'fa-eye-slash');
    } else {
        passwordInput.type = 'password';
        passwordIcon.classList.replace('fa-eye-slash', 'fa-eye');
    }
}

function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function initEmailValidation() {
    const emailInputs = document.querySelectorAll('input[type="email"]');
    emailInputs.forEach(input => {
        input.addEventListener('blur', function() {
            if (this.value && !validateEmail(this.value)) {
                this.setCustomValidity('Please enter a valid email address (e.g., name@gmail.com)');
                this.reportValidity();
            } else {
                this.setCustomValidity('');
            }
        });
        input.addEventListener('input', function() { this.setCustomValidity(''); });
    });
}

function detectLocation(inputId) {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                try {
                    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
                    const data = await response.json();
                    if (data.display_name) {
                        document.getElementById(inputId).value = data.display_name;
                        showToast('Location detected successfully', 'success');
                    }
                } catch (error) {
                    showToast('Failed to get address from location', 'error');
                }
            },
            () => { showToast('Location access denied. Please enter address manually.', 'error'); }
        );
    } else {
        showToast('Geolocation is not supported by your browser', 'error');
    }
}

// ✅ All exports — every function above is defined before this block runs
window.showToast = showToast;
window.cancelBooking = cancelBooking;
window.acceptBooking = acceptBooking;
window.rejectBooking = rejectBooking;
window.startService = startService;
window.completeService = completeService;
window.getCurrentLocation = getCurrentLocation;
window.selectAddress = selectAddress;
window.scrollToSection = scrollToSection;
window.openModal = openModal;
window.closeModal = closeModal;
window.formatCurrency = formatCurrency;
window.calculateTotal = calculateTotal;
window.togglePassword = togglePassword;
window.validateEmail = validateEmail;
window.detectLocation = detectLocation;
window.handleGoogleSignIn = handleGoogleSignIn;
window.handleGoogleCallback = handleGoogleCallback;