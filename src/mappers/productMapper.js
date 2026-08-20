/**
 * Maps a ClickUp task to a Shopify product payload.
 * @param {Object} task - The ClickUp task object.
 * @returns {Object} The Shopify product payload.
 */
function mapClickupToShopify(task) {
  const getField = (name) => task.custom_fields?.find(f => f.name === name);
  
  // Extract primitive values
  const getFieldValue = (name) => {
    const field = getField(name);
    if (!field || field.value === undefined || field.value === null) return null;
    if (field.type === 'drop_down') {
      const optionIndex = field.value;
      const option = field.type_config?.options?.find(o => o.orderindex === optionIndex);
      return option ? option.name : null;
    }
    if (field.type === 'labels') {
      const optionIds = field.value; // array of ids
      const labels = optionIds.map(id => field.type_config?.options?.find(o => o.id === id)?.label || field.type_config?.options?.find(o => o.id === id)?.name).filter(Boolean);
      return labels;
    }
    return field.value;
  };

  // Helper to extract image URLs from attachment fields
  const extractImages = (fieldNames) => {
    const images = [];
    fieldNames.forEach(name => {
      const field = getField(name);
      if (field && Array.isArray(field.value)) {
        field.value.forEach(attachment => {
          if (attachment.url) images.push({ src: attachment.url });
        });
      }
    });
    return images;
  };

  // 1. Title
  const shirtName = getFieldValue("Shirt Name");
  const title = shirtName ? String(shirtName).trim() : (task.name || "Untitled Product");
  
  // 2. Body HTML (Description)
  const sections = [];
  
  const productDescription = getFieldValue("Product Description") || getFieldValue("Product Story");
  if (productDescription) sections.push(`<p>${productDescription}</p>`);
  
  const conceptNote = getFieldValue("Concept Note");
  if (conceptNote) sections.push(`<h4>Concept Note</h4><p>${conceptNote}</p>`);
  
  const storyToTell = getFieldValue("Story to Tell");
  if (storyToTell) sections.push(`<h4>Story to Tell</h4><p>${storyToTell}</p>`);
  
  const washingInstructions = getFieldValue("Washing Instructions");
  if (washingInstructions) sections.push(`<h4>Washing Instructions</h4><p>${washingInstructions}</p>`);
  
  const careInstructions = getFieldValue("Care Instructions");
  if (careInstructions) sections.push(`<h4>Care Instructions</h4><p>${careInstructions}</p>`);
  
  const body_html = sections.length > 0 ? sections.join("\n") : (task.description || "");

  // 3. Product Type
  const product_type = getFieldValue("Silhouette") || getFieldValue("Category") || "";

  // 4. Tags
  const tagFields = [
    "Craft", "Fabric Type", "Colour", "Collection / Capsule", 
    "Occasion collection", "Technique Used", "Hashtags", "Tags", "Keywords"
  ];
  
  const allTags = new Set();
  tagFields.forEach(fieldName => {
    let val = getFieldValue(fieldName);
    if (!val) return;
    
    // Some fields might return an array (like Labels) or a string
    if (typeof val === 'string') {
      // Split by comma if the user typed comma-separated tags
      val.split(',').forEach(t => allTags.add(t.trim()));
    } else if (Array.isArray(val)) {
      val.forEach(t => {
        if (typeof t === 'string') {
          t.split(',').forEach(subT => allTags.add(subT.trim()));
        }
      });
    }
  });
  
  // Remove empty strings
  allTags.delete("");
  const tags = Array.from(allTags).join(", ");

  // 5. Images
  const images = extractImages(["Front", "Back", "Close-ups", "Detail Shots", "Product Images"]);

  // 6. Price & Variants
  const priceVal = getFieldValue("Price");
  const price = priceVal !== null && priceVal !== undefined ? String(priceVal) : "0.00";
  
  const skuVal = getFieldValue("Product Code / SKU");
  const sku = skuVal ? String(skuVal).trim() : "";
  
  let variants = [];
  let options = [];

  const sizeValues = getFieldValue("Size") || getFieldValue("SIZE");
  
  if (sizeValues && Array.isArray(sizeValues) && sizeValues.length > 0) {
    options.push({ name: "Size", values: sizeValues.map(String) });
    variants = sizeValues.map((size) => ({
      sku: sku,
      option1: String(size),
      price: price,
      inventory_policy: "deny",
      inventory_management: "shopify"
    }));
  } else if (sizeValues && (typeof sizeValues === 'string' || typeof sizeValues === 'number')) {
    options.push({ name: "Size", values: [String(sizeValues)] });
    variants = [{
      sku: sku,
      option1: String(sizeValues),
      price: price,
      inventory_policy: "deny",
      inventory_management: "shopify"
    }];
  } else {
    // Default single variant
    variants = [{
      sku: sku,
      price: price,
      inventory_policy: "deny",
      inventory_management: "shopify"
    }];
  }

  // Build the final Shopify payload
  const productPayload = {
    title,
    body_html,
    vendor: "SheWorks Store",
    product_type,
    tags,
    status: "draft", // Always default to draft for safety
    images,
    variants,
    options: options.length > 0 ? options : undefined
  };

  return productPayload;
}

module.exports = {
  mapClickupToShopify
};
