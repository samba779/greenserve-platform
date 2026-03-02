// GreenServe - Main JavaScript File

// DOM Ready
document.addEventListener('DOMContentLoaded', function() {
    initMobileMenu();
    initForms();
    initTabs();
    initRating();
    initWorkerStatus();
    initBookingFlow();
});

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

// Form Validation & Handling
function initForms() {
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
    forms.forEach(form => {
        form.addEventListener('submit', handleFormSubmit);
    });
}

function handleFormSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const submitBtn = form.querySelector('[type="submit"]');
    
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner"></span>';
    }
    
    // Simulate form submission
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
