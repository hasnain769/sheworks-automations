const { getTask, postComment } = require('../src/services/clickupApi');
const { createProduct } = require('../src/services/shopifyApi');
const { mapClickupToShopify } = require('../src/mappers/productMapper');

// The specific ID for the "PRODUCT STATUS" custom field and the "Ready to Publish" option
const PRODUCT_STATUS_FIELD_ID = "431a53e0-15b4-4516-b018-48584aa84aba";
const READY_TO_PUBLISH_OPTION_ID = "9e3874c2-1f7d-4a14-91d2-e876d5c1081a";
const READY_TO_PUBLISH_OPTION_INDEX = 5; // ClickUp sends the orderindex in history items sometimes

module.exports = async (req, res) => {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const payload = req.body;
    console.log("Received ClickUp Webhook:", JSON.stringify(payload, null, 2));

    // Verify it's a custom field update
    if (payload.event === 'taskCustomFieldUpdated' && payload.task_id) {
      const historyItem = payload.history_items && payload.history_items[0];
      
      // Ensure the field updated was the PRODUCT STATUS field
      if (historyItem && historyItem.custom_field && historyItem.custom_field.id === PRODUCT_STATUS_FIELD_ID) {
        
        // Check if the new value is "Ready to Publish"
        // historyItem.after is often the orderindex for dropdowns, or the actual option UUID.
        const afterValue = historyItem.after; 
        
        if (
          afterValue === READY_TO_PUBLISH_OPTION_ID || 
          afterValue === READY_TO_PUBLISH_OPTION_INDEX || 
          (afterValue && afterValue.id === READY_TO_PUBLISH_OPTION_ID)
        ) {
          console.log(`Task ${payload.task_id} is Ready to Publish! Initiating sync...`);
          
          // 1. Fetch full task details from ClickUp
          const taskData = await getTask(payload.task_id);
          
          // 2. Map to Shopify Payload
          const shopifyPayload = mapClickupToShopify(taskData);
          console.log("Mapped Shopify Payload:", JSON.stringify(shopifyPayload, null, 2));
          
          // 3. Send to Shopify
          const createdProduct = await createProduct(shopifyPayload);
          console.log(`Successfully created Shopify Product ID: ${createdProduct.id}`);
          
          // 4. Post feedback comment to ClickUp
          const productUrl = `https://${process.env.SHOPIFY_DOMAIN}/admin/products/${createdProduct.id}`;
          await postComment(payload.task_id, `✅ Successfully synced to Shopify!\nView product: ${productUrl}`);
          
          return res.status(200).json({ success: true, message: "Product synced to Shopify", shopifyProductId: createdProduct.id });
        }
      }
    }

    // Acknowledge other webhook events silently
    return res.status(200).json({ success: true, message: "Event ignored" });

  } catch (error) {
    console.error("Webhook Execution Error:", error);
    // Still return 200 to ClickUp so it doesn't disable the webhook due to retries, 
    // unless it's a critical timeout.
    return res.status(500).json({ success: false, error: error.message });
  }
};
