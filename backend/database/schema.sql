-- GreenServe Database Schema
-- Run this file to set up the complete database structure

CREATE DATABASE IF NOT EXISTS greenserve;
USE greenserve;

-- Users table (Customers)
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE,
    mobile VARCHAR(20) UNIQUE NOT NULL,
    password VARCHAR(255),
    address TEXT,
    city VARCHAR(100),
    pincode VARCHAR(10),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    is_verified BOOLEAN DEFAULT FALSE,
    otp_code VARCHAR(6),
    otp_expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Workers table (Service Partners)
CREATE TABLE IF NOT EXISTS workers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE,
    mobile VARCHAR(20) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    address TEXT,
    city VARCHAR(100) NOT NULL,
    pincode VARCHAR(10),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    years_of_experience INT,
    is_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    is_online BOOLEAN DEFAULT FALSE,
    rating DECIMAL(2, 1) DEFAULT 5.0,
    total_reviews INT DEFAULT 0,
    total_earnings DECIMAL(10, 2) DEFAULT 0.00,
    available_balance DECIMAL(10, 2) DEFAULT 0.00,
    otp_code VARCHAR(6),
    otp_expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Service Categories (8 Sectors)
CREATE TABLE IF NOT EXISTS service_categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    base_price DECIMAL(10, 2),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Worker Skills (Many-to-Many relationship)
CREATE TABLE IF NOT EXISTS worker_skills (
    id INT AUTO_INCREMENT PRIMARY KEY,
    worker_id INT NOT NULL,
    category_id INT NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES service_categories(id) ON DELETE CASCADE,
    UNIQUE KEY unique_worker_skill (worker_id, category_id)
);

-- Services (Specific services under each category)
CREATE TABLE IF NOT EXISTS services (
    id INT AUTO_INCREMENT PRIMARY KEY,
    category_id INT NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    base_price DECIMAL(10, 2) NOT NULL,
    duration_minutes INT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES service_categories(id) ON DELETE CASCADE
);

-- Bookings table
CREATE TABLE IF NOT EXISTS bookings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id VARCHAR(20) UNIQUE NOT NULL,
    user_id INT NOT NULL,
    worker_id INT,
    service_id INT NOT NULL,
    category_id INT NOT NULL,
    status ENUM('requested', 'accepted', 'on_the_way', 'in_progress', 'completed', 'cancelled', 'rejected') DEFAULT 'requested',
    booking_date DATE NOT NULL,
    booking_time TIME NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(100),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    price DECIMAL(10, 2) NOT NULL,
    service_charge DECIMAL(10, 2) DEFAULT 0.00,
    tax_amount DECIMAL(10, 2) DEFAULT 0.00,
    total_amount DECIMAL(10, 2) NOT NULL,
    notes TEXT,
    payment_status ENUM('pending', 'paid', 'failed', 'refunded') DEFAULT 'pending',
    payment_method VARCHAR(50),
    cancellation_reason TEXT,
    cancelled_by ENUM('user', 'worker', 'system'),
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE SET NULL,
    FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES service_categories(id) ON DELETE CASCADE
);

-- Booking Status History
CREATE TABLE IF NOT EXISTS booking_status_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id INT NOT NULL,
    status VARCHAR(50) NOT NULL,
    notes TEXT,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
);

-- Reviews and Ratings
CREATE TABLE IF NOT EXISTS reviews (
    id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id INT NOT NULL,
    user_id INT NOT NULL,
    worker_id INT NOT NULL,
    rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    review_text TEXT,
    tags JSON,
    is_recommended BOOLEAN DEFAULT TRUE,
    worker_response TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE CASCADE
);

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id INT NOT NULL,
    user_id INT NOT NULL,
    worker_id INT,
    amount DECIMAL(10, 2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    payment_gateway VARCHAR(50),
    transaction_id VARCHAR(255),
    gateway_response JSON,
    status ENUM('pending', 'success', 'failed', 'refunded') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE SET NULL
);

-- Worker Wallet Transactions
CREATE TABLE IF NOT EXISTS wallet_transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    worker_id INT NOT NULL,
    booking_id INT,
    type ENUM('credit', 'debit') NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    description VARCHAR(255),
    balance_after DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE CASCADE,
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL
);

-- Withdrawal Requests
CREATE TABLE IF NOT EXISTS withdrawal_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    worker_id INT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    bank_account_number VARCHAR(50),
    bank_ifsc VARCHAR(20),
    bank_name VARCHAR(100),
    account_holder_name VARCHAR(200),
    status ENUM('pending', 'approved', 'rejected', 'completed') DEFAULT 'pending',
    processed_at TIMESTAMP,
    rejection_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE CASCADE
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    worker_id INT,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50),
    is_read BOOLEAN DEFAULT FALSE,
    booking_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE CASCADE,
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL
);

-- Tracking/Locations
CREATE TABLE IF NOT EXISTS tracking (
    id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id INT NOT NULL,
    worker_id INT NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    accuracy DECIMAL(8, 2),
    speed DECIMAL(5, 2),
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
    FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE CASCADE
);

-- Documents (KYC for workers)
CREATE TABLE IF NOT EXISTS documents (
    id INT AUTO_INCREMENT PRIMARY KEY,
    worker_id INT NOT NULL,
    document_type ENUM('aadhaar', 'pan', 'license', 'certificate', 'other') NOT NULL,
    document_number VARCHAR(100),
    document_url VARCHAR(500),
    verification_status ENUM('pending', 'verified', 'rejected') DEFAULT 'pending',
    verified_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE CASCADE
);

-- Insert default service categories (8 Sectors)
INSERT INTO service_categories (name, slug, description, icon, base_price) VALUES
('Solar Services', 'solar', 'Installation, maintenance, and repair of solar panels and systems', 'fa-solar-panel', 15000.00),
('Energy Audit', 'energy-audit', 'Professional energy efficiency assessments and recommendations', 'fa-bolt', 3500.00),
('Bio-Gas Services', 'biogas', 'Biogas plant installation, maintenance, and consultation', 'fa-fire', 25000.00),
('Gardening & Landscaping', 'gardening', 'Professional gardening, landscaping, and plant care services', 'fa-seedling', 1500.00),
('Waste Management', 'waste', 'Waste collection, recycling, and disposal solutions', 'fa-recycle', 1000.00),
('Water Conservation', 'water', 'Rainwater harvesting, water recycling, and conservation systems', 'fa-tint', 8000.00),
('EV Charging Support', 'ev-charging', 'EV charging station installation and maintenance', 'fa-charging-station', 12000.00),
('Green Maintenance Services', 'green-maintenance', 'Eco-friendly maintenance and repair services', 'fa-tools', 2000.00);

-- Insert sample services
INSERT INTO services (category_id, name, description, base_price, duration_minutes) VALUES
(1, 'Solar Panel Installation - 3kW', 'Complete 3kW solar panel installation for residential properties', 150000.00, 480),
(1, 'Solar Panel Installation - 5kW', 'Complete 5kW solar panel installation for residential/commercial', 225000.00, 600),
(1, 'Solar Panel Installation - 10kW', 'Complete 10kW solar panel installation for commercial properties', 400000.00, 720),
(1, 'Solar Panel Cleaning', 'Professional cleaning of solar panels for optimal efficiency', 2500.00, 120),
(1, 'Solar System Maintenance', 'Annual maintenance of solar power systems', 5000.00, 180),

(2, 'Home Energy Audit', 'Comprehensive energy efficiency assessment for homes', 3500.00, 120),
(2, 'Commercial Energy Audit', 'Detailed energy audit for commercial buildings', 8000.00, 240),

(3, 'Biogas Plant Installation - Small', 'Small scale biogas plant for household use', 25000.00, 360),
(3, 'Biogas Plant Installation - Medium', 'Medium scale biogas plant for farms', 75000.00, 480),

(4, 'Garden Maintenance', 'Regular garden maintenance and plant care', 1500.00, 120),
(4, 'Landscaping Design', 'Custom landscape design and implementation', 15000.00, 480),
(4, 'Lawn Mowing', 'Professional lawn mowing service', 800.00, 60),

(5, 'Waste Segregation Setup', 'Setup of waste segregation system at home/office', 1800.00, 90),
(5, 'Recycling Consultation', 'Consultation on recycling best practices', 500.00, 60),
(5, 'Composting Setup', 'Setup of home composting system', 2500.00, 120),

(6, 'Rainwater Harvesting Setup', 'Installation of rainwater harvesting system', 8000.00, 240),
(6, 'Water Recycling System', 'Greywater recycling system installation', 15000.00, 360),

(7, 'Home EV Charger Installation', 'Installation of EV charging point at home', 12000.00, 180),
(7, 'Commercial EV Charging Station', 'Multi-point EV charging station setup', 50000.00, 480),

(8, 'Eco-Friendly Cleaning', 'Cleaning services using eco-friendly products', 2000.00, 120),
(8, 'Green Pest Control', 'Pest control using organic methods', 3000.00, 150);

-- Create indexes for better performance
CREATE INDEX idx_users_mobile ON users(mobile);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_workers_mobile ON workers(mobile);
CREATE INDEX idx_workers_city ON workers(city);
CREATE INDEX idx_workers_is_online ON workers(is_online);
CREATE INDEX idx_bookings_user_id ON bookings(user_id);
CREATE INDEX idx_bookings_worker_id ON bookings(worker_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_date ON bookings(booking_date);
CREATE INDEX idx_payments_booking_id ON payments(booking_id);
CREATE INDEX idx_reviews_worker_id ON reviews(worker_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_worker_id ON notifications(worker_id);
