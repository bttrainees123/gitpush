import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import generateToken from '../helpers/helper.js'; 
import validateUser from '../validation/validation.js';


export const registerUser = async (req, res) => {
  const { error } = validateUser(req.body);
  if (error) {
    return res.status(400).json({ success: false, message: error.details[0].message });
  }
  const { username, email, password, role } = req.body;
  
  if (!['user', 'retailer'].includes(role)) {
    return res.status(400).json({ message: 'Invalid role' });
  }

  try {
    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ message: 'User already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    user = new User({ username, email, password: hashedPassword, role });
    await user.save();

    res.status(201).json({success:true, message: `${role} registered successfully`, user});
  } catch (error) {
    res.status(500).json({success:false, message: 'Server error' });
  }
};

export const loginUser = async (req, res) => {
  const { email, password, } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({success:false, message: 'Invalid credentials' });
    //for admin login 

    if(user.role ==='admin'){
      
      const adminEmail = process.env.ADMIN_EMAIL;
      const adminPassword = process.env.ADMIN_PASSWORD;
      const hasdedAdminPassword = await bcrypt.hash(adminPassword,10);

      if(email !== adminEmail){
     return res.status(400).json({success:false, message:"Invalid Credentials"});
      }
      const isMatch = await bcrypt.compare(password,hasdedAdminPassword);
      if(!isMatch){
      return res.status(400).json({success:false,message:"Invalid Password Credentails"})
      }
    }else{
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({success:false, message: 'Invalid credentials' });
    }

    const token = generateToken(user._id, user.role);

    return res.status(200).json({
      success: true,
      message: 'Login Successfully',
      token: token,
      role: user.role, 
    });

  } catch (error) {
    res.status(500).json({success:false, message: 'Server error' });
  }
};

export const logoutController = async (req, res) => {
  try {
      const { authorization } = req.headers;
      if (!authorization) {
          return res.status(401).json({success:false, message: 'Unauthorized' });
      }

      const token = authorization.replace('Bearer', '').trim();
      if (!token) {
          return res.status(401).json({ success:false, message: 'Token not provided' });
      }

      
    //  res.clearCookie('token');
      res.status(200).send({success:true, message: 'Logout successful' });
  } catch (error) {
      console.error(error);
      res.status(500).send({success:false, message: 'Failed to log out' });
  }
};
import Cart from '../models/Cart.js';
import Product from '../models/Product.js';

export const addToCart = async (req, res) => {
    const { productId, quantity } = req.body;

    try {
        if (quantity <= 0) {
            return res.status(400).json({ message: 'Quantity must be a positive number' });
        }

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        let cart = await Cart.findOne({ user: req.user.id });
        
        if (!cart) {
            cart = new Cart({ user: req.user.id, items: [], totalPrice: 0 });
        }

        const itemIndex = cart.items.findIndex(item => item.product.toString() === productId);

        if (itemIndex > -1) {
            cart.items[itemIndex].quantity += quantity;
        } else {
            cart.items.push({ product: productId, quantity });
        }

        // Update total price directly
        cart.totalPrice += product.price * quantity;

        await cart.save();
        res.json({ message: 'Item added to cart', cart });

    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

export const viewCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user.id })
                          .populate('items.product');

    if (!cart || cart.items.length === 0) {
      return res.status(404).json({ message: 'Your cart is empty' });
    }

    // If totalPrice is not calculated properly, recalculate it
    if (!cart.totalPrice || cart.totalPrice === 0) {
      cart.totalPrice = cart.items.reduce((total, item) => {
        return total + (item.product.price * item.quantity);
      }, 0);
      await cart.save();
    }

    res.status(200).json({
      message: 'Cart retrieved successfully',
      cart: {
        items: cart.items,
        totalPrice: cart.totalPrice
      }
    });

  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};
