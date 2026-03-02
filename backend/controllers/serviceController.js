const { pool } = require('../config/database');

// Get all service categories
const getCategories = async (req, res) => {
  try {
    const [categories] = await pool.execute(
      'SELECT id, name, slug, description, icon, base_price FROM service_categories WHERE is_active = TRUE'
    );

    res.json({
      success: true,
      count: categories.length,
      data: categories
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch categories'
    });
  }
};

// Get category by slug with services
const getCategoryBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    
    const [categories] = await pool.execute(
      'SELECT * FROM service_categories WHERE slug = ? AND is_active = TRUE',
      [slug]
    );

    if (categories.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    const category = categories[0];

    // Get services in this category
    const [services] = await pool.execute(
      'SELECT id, name, description, base_price, duration_minutes FROM services WHERE category_id = ? AND is_active = TRUE',
      [category.id]
    );

    // Get worker count for this category
    const [workerCount] = await pool.execute(
      `SELECT COUNT(DISTINCT worker_id) as count 
       FROM worker_skills ws 
       JOIN workers w ON ws.worker_id = w.id 
       WHERE ws.category_id = ? AND w.is_active = TRUE AND w.is_verified = TRUE`,
      [category.id]
    );

    res.json({
      success: true,
      data: {
        ...category,
        services,
        availableWorkers: workerCount[0].count
      }
    });
  } catch (error) {
    console.error('Get category error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch category'
    });
  }
};

// Get all services
const getServices = async (req, res) => {
  try {
    const { categoryId } = req.query;
    
    let query = `
      SELECT s.id, s.name, s.description, s.base_price, s.duration_minutes,
             sc.id as category_id, sc.name as category_name, sc.slug as category_slug
      FROM services s
      JOIN service_categories sc ON s.category_id = sc.id
      WHERE s.is_active = TRUE AND sc.is_active = TRUE
    `;
    
    const params = [];
    
    if (categoryId) {
      query += ' AND s.category_id = ?';
      params.push(categoryId);
    }
    
    query += ' ORDER BY sc.name, s.base_price';

    const [services] = await pool.execute(query, params);

    res.json({
      success: true,
      count: services.length,
      data: services
    });
  } catch (error) {
    console.error('Get services error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch services'
    });
  }
};

// Get service by ID
const getServiceById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const [services] = await pool.execute(
      `SELECT s.*, sc.name as category_name, sc.slug as category_slug, sc.icon as category_icon
       FROM services s
       JOIN service_categories sc ON s.category_id = sc.id
       WHERE s.id = ? AND s.is_active = TRUE`,
      [id]
    );

    if (services.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }

    res.json({
      success: true,
      data: services[0]
    });
  } catch (error) {
    console.error('Get service error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch service'
    });
  }
};

// Search services
const searchServices = async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    const searchTerm = `%${q}%`;
    
    const [services] = await pool.execute(
      `SELECT s.id, s.name, s.description, s.base_price,
              sc.name as category_name, sc.slug as category_slug
       FROM services s
       JOIN service_categories sc ON s.category_id = sc.id
       WHERE (s.name LIKE ? OR s.description LIKE ? OR sc.name LIKE ?)
       AND s.is_active = TRUE AND sc.is_active = TRUE
       LIMIT 20`,
      [searchTerm, searchTerm, searchTerm]
    );

    res.json({
      success: true,
      count: services.length,
      data: services
    });
  } catch (error) {
    console.error('Search services error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search services'
    });
  }
};

module.exports = {
  getCategories,
  getCategoryBySlug,
  getServices,
  getServiceById,
  searchServices
};
