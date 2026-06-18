const axios = require('axios');
require('dotenv').config();
const { getLocationId, getPublications, getProductByHandle, updateInventory } = require('./shopifyFunctions');

async function getCdoProducts() {
    const response = await axios.get(
        `http://api.mexico.cdopromocionales.com/v2/products`,
        {
            params: {
                auth_token: process.env.CDO_AUTH_TOKEN,
            },
        }
    );

    return response.data;
}

async function updateProducts() {
    const products = await getCdoProducts();

    const locationId = await getLocationId();
    const productPublications = await getPublications();
    for (const product of products) {
        try {
            // if (product.skuPadre !== 'PET 008') continue; // If para pruebas con un producto específico
            const activeVariants = product.variants;

            const handle = `cdo-${product.code}`.trim().toLowerCase().replace(/[+]/g, 'mas').replace(/[\s]+/g, '');
            let shopifyProduct = await getProductByHandle(handle);
            if (!shopifyProduct) {
                continue;
            }

            const shopifyVariants = shopifyProduct.variants.nodes;
            for (const activeVariant of activeVariants) {
                const variant = shopifyVariants.find(v => v.sku === activeVariant.sku);
                const variantInventory = activeVariant.stock_available;
                console.log(`Variante encontrada: ${shopifyProduct.title} ${variant.title}, Inventario: Prev ${variant.inventoryQuantity} Now ${variantInventory}`);

                if (variant.inventoryQuantity !== variantInventory) {
                    const variantToUpdate = {
                        quantities: {
                            changeFromQuantity: null,
                            inventoryItemId: variant.inventoryItem.id,
                            locationId,
                            quantity: variantInventory,
                        },
                        name: "available",
                        reason: "correction",
                    };
                    const response = await updateInventory(variantToUpdate);
                    console.log('Inventario actualizado:', response.changes);
                }
            }
            // break;
        } catch (error) {
            console.error(`Error actualizando el producto ${product.nombrePadre} ${product.skuPadre}:`, error);
        }
    }
}

updateProducts();