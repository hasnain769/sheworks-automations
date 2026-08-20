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

module.exports = {
  createProduct
};
