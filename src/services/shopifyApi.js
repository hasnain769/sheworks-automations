const axios = require('axios');
require('dotenv').config();

const { SHOPIFY_DOMAIN, SHOPIFY_ACCESS_TOKEN } = process.env;

/**
 * Creates a new product in Shopify.
 * @param {Object} productData - The Shopify Product payload.
 * @returns {Object} The created product response.
 */
async function createProduct(productData) {
  if (!SHOPIFY_DOMAIN || !SHOPIFY_ACCESS_TOKEN) {
    throw new Error("Missing Shopify environment variables");
  }

  const url = `https://${SHOPIFY_DOMAIN}/admin/api/2024-01/products.json`;

  try {
    const response = await axios.post(
      url,
      { product: productData },
      {
        headers: {
          'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data.product;
  } catch (error) {
    console.error("Shopify API Error:", error.response ? error.response.data : error.message);
    throw error;
  }
}

/**
 * Checks if a product exists in Shopify by exact title match.
 * @param {string} title - The title of the product to search for.
 * @returns {Object|null} The product object if found, otherwise null.
 */
async function findProductByTitle(title) {
  if (!SHOPIFY_DOMAIN || !SHOPIFY_ACCESS_TOKEN) {
    throw new Error("Missing Shopify environment variables");
  }

  // Shopify REST API allows filtering by title (exact match)
  const url = `https://${SHOPIFY_DOMAIN}/admin/api/2024-01/products.json?title=${encodeURIComponent(title)}&fields=id,title,handle`;

  try {
    const response = await axios.get(url, {
      headers: {
        'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
        'Content-Type': 'application/json'
      }
    });
    
    // Safety check in case Shopify returns partial matches or empty arrays
    const products = response.data.products || [];
    const exactMatch = products.find(p => p.title.toLowerCase() === title.toLowerCase());
    
    return exactMatch || null;
  } catch (error) {
    console.error("Shopify API Error (findProductByTitle):", error.response ? error.response.data : error.message);
    throw error;
  }
}

module.exports = {
  createProduct,
  findProductByTitle
};
