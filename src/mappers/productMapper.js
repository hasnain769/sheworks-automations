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
    if (!field || field.value === undefined) return null;
    if (field.type === 'drop_down') {
      const optionIndex = field.value;
      const option = field.type_config?.options?.find(o => o.orderindex === optionIndex);
      return option ? option.name : null;
    }
    if (field.type === 'labels') {
      const optionIds = field.value; // array of ids
      const labels = optionIds.map(id => field.type_config?.options?.find(o => o.id === id)?.label).filter(Boolean);
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

  // 1. Title & Description
  const title = task.name || "Untitled Product";
  
  const productDescription = getFieldValue("Product Description") || getFieldValue("Product Story");
  const body_html = productDescription ? `<p>${productDescription}</p>` : (task.description || "");

  // 2. Tags / Vendor
  const craftTags = getFieldValue("Craft") || [];
  const fabricType = getFieldValue("Fabric Type");
  const tags = [...craftTags];
  if (fabricType) tags.push(fabricType);

  // 3. Images
  // Assuming ClickUp uses these field names for images based on common practice
  const images = extractImages(["Front", "Back", "Close-ups", "Detail Shots", "Product Images"]);

  // 4. Price & Variants
  const price = getFieldValue("Price") || "0.00";
  const sizeOption = getField("Size") || getField("SIZE");
  
  let variants = [];
  let options = [];

  // Very basic variant mapping (assuming Size is a dropdown or labels field)
  // If Size is multi-select labels or multiple dropdowns, we map them to variants.
  // We'll create a default variant if no sizes are found.
  const sizeValues = getFieldValue("Size") || getFieldValue("SIZE");
  if (sizeValues && Array.isArray(sizeValues) && sizeValues.length > 0) {
    options.push({ name: "Size", values: sizeValues });
    variants = sizeValues.map((size, index) => ({
      option1: size,
      price: price,
      inventory_policy: "deny",
      inventory_management: "shopify"
    }));
  } else if (sizeValues && typeof sizeValues === 'string') {
    options.push({ name: "Size", values: [sizeValues] });
    variants = [{
      option1: sizeValues,
      price: price,
      inventory_policy: "deny",
      inventory_management: "shopify"
    }];
  } else {
    variants = [{
      price: price,
      inventory_policy: "deny",
      inventory_management: "shopify"
    }];
  }

  // Build the final Shopify payload
  const productPayload = {
    title,
    body_html,
    vendor: "SheWorks Store", // Static for now, could be dynamic
    tags: tags.join(", "),
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
