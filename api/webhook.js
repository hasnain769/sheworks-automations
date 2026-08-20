const { getTask, postComment, updateCustomField } = require('../src/services/clickupApi');
const { createProduct, findProductByTitle } = require('../src/services/shopifyApi');
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

    // Verify it's a task update or custom field update
    if ((payload.event === 'taskCustomFieldUpdated' || payload.event === 'taskUpdated') && payload.task_id) {
      const historyItem = payload.history_items && payload.history_items[0];
      
      // Ensure the field updated was the PRODUCT STATUS field
      if (
        historyItem && 
        (historyItem.custom_field || historyItem.field === 'custom_field') && 
        (historyItem.custom_field && historyItem.custom_field.id === PRODUCT_STATUS_FIELD_ID)
      ) {
        
        // Check if the new value is "Ready to Publish"
        const afterValue = historyItem.after; 
        
        if (
          afterValue === READY_TO_PUBLISH_OPTION_ID || 
          afterValue === READY_TO_PUBLISH_OPTION_INDEX || 
          (afterValue && afterValue.id === READY_TO_PUBLISH_OPTION_ID)
        ) {
          console.log(`Task ${payload.task_id} is Ready to Publish! Initiating sync...`);
          
          try {
            // 1. Fetch full task details from ClickUp
            const taskData = await getTask(payload.task_id);
            
            // 2. ACT AS A LOCK: Check if the live task status is STILL "Ready to Publish"
            const liveStatusField = taskData.custom_fields?.find(f => f.id === PRODUCT_STATUS_FIELD_ID);
            const liveStatusOption = liveStatusField?.type_config?.options?.find(o => o.orderindex === liveStatusField.value);
            
            if (!liveStatusOption || liveStatusOption.id !== READY_TO_PUBLISH_OPTION_ID) {
               console.log(`Task ${payload.task_id} is no longer 'Ready to Publish' (Current: ${liveStatusOption?.name}). Aborting to prevent duplicate retry.`);
               return res.status(200).json({ success: true, message: "Aborted: Task already processing or processed." });
            }
            
            // 3. IMMEDIATELY lock the task by setting it to "Published" to prevent ClickUp retries from running
            const publishedOption = liveStatusField?.type_config?.options?.find(o => o.name.toLowerCase() === 'published');
            if (publishedOption) {
               await updateCustomField(payload.task_id, PRODUCT_STATUS_FIELD_ID, publishedOption.id);
               console.log("Locked task by setting status to Published.");
            }
            
            // 4. Map to Shopify Payload
            const shopifyPayload = mapClickupToShopify(taskData);
            console.log("Mapped Shopify Payload:", JSON.stringify(shopifyPayload, null, 2));
            
            // 5. Check if product already exists in Shopify
            const existingProduct = await findProductByTitle(shopifyPayload.title);
            
            if (existingProduct) {
              console.log(`Product "${shopifyPayload.title}" already exists in Shopify (ID: ${existingProduct.id}). Skipping creation.`);
              const productUrl = `https://${process.env.SHOPIFY_DOMAIN}/admin/products/${existingProduct.id}`;
              await postComment(payload.task_id, `⚠️ Product already exists in Shopify!\nSkipped creation to avoid duplicates.\nView existing product: ${productUrl}`);
              
              return res.status(200).json({ success: true, message: "Product already exists, skipped.", shopifyProductId: existingProduct.id });
            }

            // 6. Send to Shopify (This can take 5-10s if downloading many images)
            const createdProduct = await createProduct(shopifyPayload);
            console.log(`Successfully created Shopify Product ID: ${createdProduct.id}`);
            
            // 7. Post feedback comment to ClickUp
            const productUrl = `https://${process.env.SHOPIFY_DOMAIN}/admin/products/${createdProduct.id}`;
            await postComment(payload.task_id, `✅ Successfully synced to Shopify!\nView product: ${productUrl}`);
            
            console.log(`Successfully finished processing.`);

            return res.status(200).json({ success: true, message: "Product synced to Shopify", shopifyProductId: createdProduct.id });
          } catch (syncError) {
            console.error(`Sync failed for task ${payload.task_id}:`, syncError.message);
            
            // Handle Graceful Error Logging back to ClickUp
            const errorMessage = syncError.response && syncError.response.data 
              ? JSON.stringify(syncError.response.data) 
              : syncError.message;
              
            await postComment(payload.task_id, `❌ **Shopify Upload Failed**\nAn error occurred while trying to push this product to Shopify:\n\`\`\`\n${errorMessage}\n\`\`\``);
            
            // Change Custom Field status to Publishing Failed
            try {
              const failedOption = taskData?.custom_fields
                ?.find(f => f.id === PRODUCT_STATUS_FIELD_ID)
                ?.type_config?.options?.find(o => o.name.toLowerCase() === 'publishing failed');
                
              if (failedOption) {
                await updateCustomField(payload.task_id, PRODUCT_STATUS_FIELD_ID, failedOption.id);
              }
            } catch (statusError) {
              console.error("Could not update task status to publishing failed:", statusError.message);
            }
            
            // Return 200 so ClickUp doesn't disable the webhook
            return res.status(200).json({ success: false, message: "Sync failed, but error handled gracefully." });
          }
        }
      }
    }

    // Acknowledge other webhook events silently
    return res.status(200).json({ success: true, message: "Event ignored" });

  } catch (error) {
    console.error("Webhook Execution Error:", error);
    // Still return 200 to ClickUp so it doesn't disable the webhook due to retries, 
    // unless it's a critical timeout.
    return res.status(200).json({ success: false, error: error.message });
  }
};
