import Product from '../models/Product.js';

// Retailer: Update a product
export const updateProduct = async (req, res) => {
  const { productId } = req.params;
  const { name, price, stock } = req.body;

  try {
    // Find product by ID and retailer ID
    const product = await Product.findOne({ _id: productId, retailer: req.user.id });
    
    if (!product) {
      return res.status(404).json({ status: false, message: 'Product not found or you do not have permission to update it.' });
    }

    // Update product fields only if provided
    if (name) product.name = name;
    if (price) product.price = price;
    if (stock !== undefined) product.stock = stock;
    
    // Automatically mark the product as 'sold' if stock is 0
    if (product.stock <= 0) {
      product.status = 'sold';
    } else {
      product.status = 'available';
    }

    await product.save();
    
    res.json({ status: true, message: 'Product updated successfully', product });
  } catch (error) {
    console.error("Error in updateProduct:", error.message);
    res.status(500).json({ status: false, message: 'Server error', error: error.message });
  }
};

//// njhufehrghiuejhiugiuegiu

import Product from '../models/Product.js';
import Cart from '../models/Cart.js';
import Order from '../models/Order.js';

// Retailer: Delete a product
export const deleteProduct = async (req, res) => {
  const { productId } = req.params;

  try {
    // Find and delete the product by ID and retailer ID
    const product = await Product.findOneAndDelete({ _id: productId, retailer: req.user.id });

    if (!product) {
      return res.status(404).json({ status: false, message: 'Product not found or you do not have permission to delete it.' });
    }

    // Remove the product from all carts
    await Cart.updateMany(
      { "items.product": productId },
      { $pull: { items: { product: productId } } }
    );

    // Remove the product from all orders (if applicable)
    await Order.updateMany(
      { "items.product": productId },
      { $pull: { items: { product: productId } } }
    );

    res.json({ status: true, message: 'Product deleted successfully' });
  } catch (error) {
    console.error("Error in deleteProduct:", error.message);
    res.status(500).json({ status: false, message: 'Server error', error: error.message });
  }
};