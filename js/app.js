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
});

// Check authentication status on page load
function checkAuthStatus() {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    // Update navigation based on auth status
    const userMenu = document.getElementById('userMenu');
    const authButtons = document.getElementById('authButtons');
    const userName = document.getElementById('userName');
    
    if (token && user._id) {
        // User is logged in
        if (userMenu) userMenu.style.display = 'flex';
        if (authButtons) authButtons.style.display = 'none';
        if (userName) userName.textContent = `${user.first_name} ${user.last_name || ''}`;
    } else {
        // User is not logged in
        if (userMenu) userMenu.style.display = 'none';
        if (authButtons) authButtons.style.display = 'flex';
    }
}

// Google Sign-In Handler
function handleGoogleSignIn() {
    console.log('🔍 Google Sign-In initiated');
    
    // Check if Google API is loaded
    if (typeof google !== 'undefined' && google.accounts) {
        google.accounts.id.initialize({
            client_id: '203912734078-ajteh37er9cbpd0uc9b2neck0osdi57m.apps.googleusercontent.com',
            callback: handleGoogleCallback
        });
        
        google.accounts.id.prompt();
    } else {
        showToast('Google Sign-In not available. Please try again.', 'error');
    }
}

// Google Callback Handler
function handleGoogleCallback(response) {
    console.log('🔍 Google callback received:', response);
    
    if (response.credential) {
        // Send to backend for verification
        fetch('https://greenserve-platform.onrender.com/api/auth/google', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                token: response.credential
            })
        })
        .then(res => res.json())
        .then(data => {
            console.log('✅ Google auth result:', data);
            
            if (data.success) {
                // Store user data
                localStorage.setItem('token', data.data.token);
                localStorage.setItem('user', JSON.stringify(data.data.user));
                
                showToast('Google Sign-In successful!', 'success');
                
                // Redirect to services page instead of index
                setTimeout(() => {
                    window.location.href = 'services.html';
                }, 1000);
            } else {
                showToast(data.message || 'Google Sign-In failed', 'error');
            }
        })
        .catch(error => {
            console.error('💥 Google auth error:', error);
            showToast('Google Sign-In failed. Please try again.', 'error');
        });
    }
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
            // Toggle auth options visibility
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
    
    // Form submissions
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
    
    console.log('🔍 Form submission started:', form.id);
    
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner"></span>';
    }
    
    // Get form data
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    
    console.log('📋 Form data:', data);
    
    // Submit to backend
    const formId = form.id;
    let apiUrl = '';
    
    if (formId === 'registerForm') {
        apiUrl = 'https://greenserve-platform.onrender.com/api/auth/register';
    } else if (formId === 'loginForm') {
        apiUrl = 'https://greenserve-platform.onrender.com/api/auth/login';
    } else if (formId === 'otpForm') {
        apiUrl = 'https://greenserve-platform.onrender.com/api/auth/verify-otp';
    }
    
    console.log('🌐 API URL:', apiUrl);
    
    if (apiUrl) {
        fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        })
        .then(response => {
            console.log('📡 Response status:', response.status);
            return response.json();
        })
        .then(result => {
            console.log('✅ API result:', result);
            
            if (result.success) {
                showToast(result.message, 'success');
                
                // Handle different form types
                if (formId === 'registerForm') {
                    // Redirect to OTP verification with mobile number
                    const mobile = data.mobile;
                    console.log('📱 Redirecting to OTP with mobile:', mobile);
                    window.location.href = `otp-verify.html?mobile=${encodeURIComponent(mobile)}`;
                } else if (formId === 'otpForm') {
                    // Store token and redirect
                    if (result.data.token) {
                        localStorage.setItem('token', result.data.token);
                        localStorage.setItem('user', JSON.stringify(result.data.user));
                    }
                    const redirect = form.dataset.redirect;
                    if (redirect) {
                        window.location.href = redirect;
                    }
                } else {
                    // Other forms
                    const redirect = form.dataset.redirect;
                    if (redirect) {
                        window.location.href = redirect;
                    }
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
        // Fallback for forms without API
        setTimeout(() => {
            showToast('Success!', 'success');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = submitBtn.dataset.originalText || 'Submit';
            }
            
            // Redirect if specified
            const redirect = form.dataset.redirect;
            if (redirect) {
                window.location.href = redirect;
            }
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
                stars.forEach((s, i) => {
                    s.classList.toggle('active', i <= index);
                });
                if (input) input.value = index + 1;
            });
            
            star.addEventListener('mouseenter', () => {
                stars.forEach((s, i) => {
                    s.style.color = i <= index ? 'var(--accent)' : '';
                });
            });
        });
        
        container.addEventListener('mouseleave', () => {
            stars.forEach((s, i) => {
                s.style.color = s.classList.contains('active') ? 'var(--accent)' : '';
            });
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
    // Service selection
    const serviceCards = document.querySelectorAll('.service-option');
    serviceCards.forEach(card => {
        card.addEventListener('click', () => {
            serviceCards.forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
        });
    });
    
    // Date selection
    const dateInputs = document.querySelectorAll('.date-option');
    dateInputs.forEach(date => {
        date.addEventListener('click', () => {
            dateInputs.forEach(d => d.classList.remove('selected'));
            date.classList.add('selected');
        });
    });
    
    // Time slot selection
    const timeSlots = document.querySelectorAll('.time-slot');
    timeSlots.forEach(slot => {
        slot.addEventListener('click', () => {
            timeSlots.forEach(s => s.classList.remove('selected'));
            slot.classList.add('selected');
        });
    });
    
    // Payment method selection
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

// Simulated Real-time Tracking
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
    }, 60000); // Update every minute
}

// Booking Actions
function cancelBooking(bookingId) {
    if (confirm('Are you sure you want to cancel this booking?')) {
        showToast('Booking cancelled successfully', 'success');
        // In real app, send request to backend
    }
}

function acceptBooking(bookingId) {
    showToast('Booking accepted!', 'success');
    // In real app, send request to backend
}

function rejectBooking(bookingId) {
    if (confirm('Are you sure you want to reject this booking?')) {
        showToast('Booking rejected', 'info');
        // In real app, send request to backend
    }
}

function startService(bookingId) {
    showToast('Service started!', 'success');
    // In real app, send request to backend
}

function completeService(bookingId) {
    showToast('Service completed! Redirecting to payment...', 'success');
    setTimeout(() => {
        window.location.href = 'payment.html?booking=' + bookingId;
    }, 1500);
}

// Current location
function getCurrentLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                showToast('Location detected successfully', 'success');
                // In real app, update map and address field
                console.log('Location:', latitude, longitude);
            },
            (error) => {
                showToast('Unable to get location. Please enter manually.', 'error');
            }
        );
    } else {
        showToast('Geolocation is not supported by this browser', 'error');
    }
}

// Address autocomplete simulation
function initAddressAutocomplete() {
    const addressInput = document.getElementById('address');
    const suggestions = document.getElementById('address-suggestions');
    
    if (!addressInput || !suggestions) return;
    
    addressInput.addEventListener('input', (e) => {
        const value = e.target.value;
        if (value.length > 2) {
            // Simulate API call
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
    if (addressInput) {
        addressInput.value = element.textContent;
    }
    const suggestions = document.getElementById('address-suggestions');
    if (suggestions) suggestions.style.display = 'none';
}

// Initialize address autocomplete on load
window.addEventListener('load', initAddressAutocomplete);

// Smooth scroll
function scrollToSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        section.scrollIntoView({ behavior: 'smooth' });
    }
}

// Modal functions
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = '';
    }
}

// Close modal on backdrop click
window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        e.target.style.display = 'none';
        document.body.style.overflow = '';
    }
});

// Format currency
function formatCurrency(amount) {
    return '₹' + amount.toLocaleString('en-IN');
}

// Calculate booking total
function calculateTotal() {
    const basePrice = parseInt(document.getElementById('base-price')?.value || 0);
    const serviceCharge = Math.round(basePrice * 0.1);
    const tax = Math.round(basePrice * 0.18);
    const total = basePrice + serviceCharge + tax;
    
    const elements = {
        'service-charge': serviceCharge,
        'tax': tax,
        'total-amount': total
    };
    
    for (const [id, value] of Object.entries(elements)) {
        const el = document.getElementById(id);
        if (el) el.textContent = formatCurrency(value);
    }
    
    return total;
}

// Password Toggle Function
function togglePassword(inputId) {
    const passwordInput = document.getElementById(inputId);
    const passwordIcon = document.getElementById(inputId + 'Icon');
    
    console.log('🔍 Toggling password for:', inputId);
    console.log('🔍 Password input:', passwordInput);
    console.log('🔍 Password icon:', passwordIcon);
    
    if (!passwordInput) {
        console.error('❌ Password input not found:', inputId);
        return;
    }
    
    if (!passwordIcon) {
        console.error('❌ Password icon not found:', inputId + 'Icon');
        return;
    }
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        passwordIcon.classList.remove('fa-eye');
        passwordIcon.classList.add('fa-eye-slash');
        console.log('✅ Password shown');
    } else {
        passwordInput.type = 'password';
        passwordIcon.classList.remove('fa-eye-slash');
        passwordIcon.classList.add('fa-eye');
        console.log('✅ Password hidden');
    }
}

// Email Validation Function
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Location Detection Function
function detectLocation(inputId) {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                
                // Use reverse geocoding API to get address
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
            (error) => {
                showToast('Location access denied. Please enter address manually.', 'error');
            }
        );
    } else {
        showToast('Geolocation is not supported by your browser', 'error');
    }
}

// Export functions for global access
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
