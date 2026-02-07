const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
require('dotenv').config();

const app = express();

/* ===================== MIDDLEWARE ===================== */

app.use((req, res, next) => {
  console.log(`🌐 ${req.method} ${req.originalUrl} from ${req.ip}`);
  next();
});

app.use(cors());
app.use(express.json());

/* ===================== MONGODB ===================== */
const MONGODB_URI =
  process.env.MONGODB_URI || 'mongodb://localhost:27017/supply_chain';
const JWT_SECRET =
  process.env.JWT_SECRET || 'your-secret-key-change-in-production';

mongoose
  .connect(MONGODB_URI)
  .then(() => console.log('✅ MongoDB connected successfully'))
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });

/* ===================== CLOUDINARY ===================== */
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'materials',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp']
  }
});

const upload = multer({ storage });

/* ===================== DATABASE MODELS ===================== */

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: { type: String, required: true, minlength: 6 },
  company: { type: String, required: true, trim: true },

  role: {
    type: String,
    enum: ['admin', 'suppliers', 'manufacturers', 'customers', 'delivery_partner'],
    default: 'suppliers'
  },

  walletAddress: { type: String, default: null },
  isActive: { type: Boolean, default: true },
  isVerified: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  lastLogin: { type: Date, default: null }
});

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    this.password = await bcrypt.hash(this.password, 10);
    next();
  } catch (err) {
    next(err);
  }
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, default: '' },
  quantity: { type: Number, required: true },
  unit: { type: String, default: 'pieces' },
  price: { type: Number, required: true },
  image: { type: String, required: true },
  
  location: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    address: { type: String, required: true }
  },

  supplierId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  supplierName: { type: String, required: true },
  company: { type: String },

  createdAt: { type: Date, default: Date.now }
});

const Product = mongoose.model('Product', productSchema);

const purchasedMaterialSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  originalProductId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  productName: { type: String, required: true },
  manufacturerId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: true 
  },
  manufacturerName: { type: String, required: true },
  supplierId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: true 
  },
  supplierName: { type: String, required: true },
  quantity: { type: Number, required: true },
  price: { type: Number, required: true },
  image: { type: String, required: true },
  
  location: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    address: { type: String, required: true }
  },
  
  txHash: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['available', 'used', 'sold'], 
    default: 'available' 
  },
  purchasedAt: { type: Date, default: Date.now }
});

const PurchasedMaterial = mongoose.model('PurchasedMaterial', purchasedMaterialSchema);

const transactionSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  productName: { type: String, required: true },
  buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  buyerName: { type: String, required: true },
  sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sellerName: { type: String, required: true },
  quantity: { type: Number, required: true },
  amount: { type: Number, required: true },
  txHash: { type: String, required: true, unique: true },
  status: { 
    type: String, 
    enum: ['pending', 'completed', 'failed'], 
    default: 'pending' 
  },
  timestamp: { type: Date, default: Date.now }
});

const Transaction = mongoose.model('Transaction', transactionSchema);

const manufacturedProductSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true },
  image: { type: String, required: true },
  
  galleryImages: {
    type: [String],
    default: []
  },
  
  productDetails: {
    brand: { type: String, default: '' },
    category: { type: String, default: '' },
    weight: { type: String, default: '' },
    dimensions: { type: String, default: '' },
    color: { type: String, default: '' },
    material: { type: String, default: '' },
    warranty: { type: String, default: '' },
    certifications: { type: [String], default: [] },
    isOrganic: { type: Boolean, default: false },
    expiryDate: { type: Date, default: null }
  },

  manufacturerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  manufacturerName: { type: String, required: true },
  company: { type: String, required: true },
  
  rawMaterials: [{
    materialId: { type: mongoose.Schema.Types.ObjectId, ref: 'PurchasedMaterial' },
    materialName: { type: String },
    quantity: { type: Number }
  }],
  
  blockchainData: {
    contractAddress: { type: String, default: '' },
    tokenId: { type: String, default: '' },
    txHash: { type: String, default: '' }
  },

  status: {
    type: String,
    enum: ['available', 'sold'],
    default: 'available'
  },
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const ManufacturedProduct = mongoose.model('ManufacturedProduct', manufacturedProductSchema);

// NEW: Refund Schema
const refundSchema = new mongoose.Schema({
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  orderNumber: { type: String, required: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  customerName: { type: String, required: true },
  customerEmail: { type: String, required: true },
  manufacturerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  manufacturerName: { type: String, required: true },
  manufacturerEmail: { type: String, required: true },
  deliveryPartnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  deliveryPartnerName: { type: String },
  items: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'ManufacturedProduct', required: true },
    productName: { type: String, required: true },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true },
    subtotal: { type: Number, required: true }
  }],
  totalAmount: { type: Number, required: true },
  reason: { type: String, required: true },
  refundMethod: { 
    type: String, 
    enum: ['wallet', 'bank_transfer', 'credit_card'], 
    default: 'wallet' 
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'approved', 'rejected', 'completed', 'failed'],
    default: 'pending'
  },
  walletAddress: { type: String },
  transactionHash: { type: String },
  trackingHistory: [{
    status: { type: String, required: true },
    message: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    updatedBy: {
      userId: mongoose.Schema.Types.ObjectId,
      name: String,
      role: String
    }
  }],
  notes: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const Refund = mongoose.model('Refund', refundSchema);

const orderSchema = new mongoose.Schema({
  orderNumber: { type: String, required: true, unique: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'ManufacturedProduct', required: true },
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true }
  }],
  totalAmount: { type: Number, required: true },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'processing', 'out_for_delivery', 'near_location', 'delivered', 'cancelled', 'returned', 'return_requested', 'out_for_pickup', 'pickup_near_location', 'pickup_otp_generated', 'pickup_completed', 'refund_requested'],
    default: 'pending'
  },
  deliveryAddress: {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true }
  },
  deliveryOTP: { type: String, default: null },
  pickupOTP: { type: String, default: null },
  deliveryPartner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  assignedAt: { type: Date, default: null },
  deliveredAt: { type: Date, default: null },
  pickupCompletedAt: { type: Date, default: null },
  trackingHistory: [{
    status: { type: String, required: true },
    message: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    deliveryPartner: {
      name: String,
      phone: String
    }
  }],
  feedback: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'ManufacturedProduct', required: true },
    rating: { type: Number, min: 1, max: 5, required: true },
    comment: { type: String, default: '' },
    customerName: { type: String, required: true },
    submittedAt: { type: Date, default: Date.now }
  }],
  returnRequest: {
    requested: { type: Boolean, default: false },
    reason: { type: String },
    requestedAt: { type: Date },
    status: { 
      type: String, 
      enum: ['pending', 'approved', 'rejected', 'out_for_pickup', 'pickup_near_location', 'pickup_otp_generated', 'pickup_completed', 'refund_requested', 'refund_approved', 'refund_processing', 'refund_completed'],
      default: 'pending' 
    },
    requestedBy: { type: String, enum: ['customer', 'delivery_partner'] },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    customerName: { type: String },
    deliveryPartnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    deliveryPartnerName: { type: String },
    approvedAt: { type: Date },
    rejectedAt: { type: Date },
    pickupSchedule: {
      date: { type: String },
      time: { type: String },
      notes: { type: String }
    },
    pickupOTP: { type: String },
    pickupOTPGeneratedAt: { type: Date },
    pickupVerifiedAt: { type: Date },
    refundId: { type: mongoose.Schema.Types.ObjectId, ref: 'Refund' },
    lastUpdated: { type: Date },
    notes: { type: String }
  },
  paymentDetails: {
    transactionHash: { type: String },
    walletAddress: { type: String },
    paymentMethod: { type: String, default: 'metamask' }
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

orderSchema.pre('save', function(next) {
  if (this.isNew && !this.orderNumber) {
    this.orderNumber = 'ORD' + Date.now() + Math.floor(Math.random() * 1000);
  }
  
  this.updatedAt = new Date();
  next();
});

const Order = mongoose.model('Order', orderSchema);

const productReviewSchema = new mongoose.Schema({
  productId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'ManufacturedProduct', 
    required: true 
  },
  orderId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Order', 
    required: true 
  },
  customerId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  customerName: { type: String, required: true },
  rating: { 
    type: Number, 
    required: true, 
    min: 1, 
    max: 5 
  },
  comment: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

const ProductReview = mongoose.model('ProductReview', productReviewSchema);

/* ===================== AUTHENTICATION MIDDLEWARE ===================== */

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
}

const apiRouter = express.Router();

/* ===================== AUTH ROUTES ===================== */

apiRouter.post('/auth/register', async (req, res) => {
  try {
    const { name, email, password, company, role } = req.body;

    if (!name || !email || !password || !company) {
      return res.status(400).json({ 
        message: 'All fields are required' 
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ 
        message: 'User already exists with this email' 
      });
    }

    const user = new User({
      name,
      email,
      password,
      company,
      role: role || 'suppliers'
    });

    await user.save();

    const token = jwt.sign(
      { 
        userId: user._id, 
        email: user.email, 
        role: user.role 
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log(`✅ New user registered: ${email} (${role})`);

    res.status(201).json({
      message: 'Registration successful',
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        company: user.company
      }
    });

  } catch (err) {
    console.error('❌ Registration error:', err);
    res.status(500).json({ 
      message: 'Server error during registration',
      error: err.message 
    });
  }
});

apiRouter.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        message: 'Email and password are required' 
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ 
        message: 'Invalid credentials' 
      });
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ 
        message: 'Invalid credentials' 
      });
    }

    user.lastLogin = new Date();
    await user.save();

    const token = jwt.sign(
      { 
        userId: user._id, 
        email: user.email, 
        role: user.role 
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log(`✅ User logged in: ${email} (${user.role})`);

    res.json({
      message: 'Login successful',
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        company: user.company
      }
    });

  } catch (err) {
    console.error('❌ Login error:', err);
    res.status(500).json({ 
      message: 'Server error during login',
      error: err.message 
    });
  }
});

/* ===================== SUPPLIER ROUTES ===================== */

apiRouter.post('/products', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    if (req.user.role !== 'suppliers') {
      return res.status(403).json({ message: 'Only suppliers can add products' });
    }

    const { name, description, quantity, unit, price, lat, lng, address } = req.body;

    if (!name || !quantity || !price || !lat || !lng || !address) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'Product image is required' });
    }

    const user = await User.findById(req.user.userId);
    
    const product = new Product({
      name,
      description: description || '',
      quantity: Number(quantity),
      unit: unit || 'pieces',
      price: Number(price),
      image: req.file.path,
      location: {
        lat: Number(lat),
        lng: Number(lng),
        address
      },
      supplierId: req.user.userId,
      supplierName: user.name,
      company: user.company
    });

    await product.save();
    
    console.log(`✅ Product added by supplier ${user.email}: ${name}`);

    res.status(201).json({ 
      message: 'Product created successfully', 
      product 
    });

  } catch (err) {
    console.error('❌ Error creating product:', err);
    res.status(500).json({ 
      message: 'Server error',
      error: err.message 
    });
  }
});

apiRouter.get('/supplier/products', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'suppliers') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const products = await Product.find({ supplierId: req.user.userId })
      .sort({ createdAt: -1 });

    res.json(products);

  } catch (err) {
    console.error('❌ Error fetching supplier products:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

apiRouter.get('/products/available', authenticateToken, async (req, res) => {
  try {
    if (req.user.role === 'manufacturers') {
      const products = await Product.find({ quantity: { $gt: 0 } })
        .sort({ createdAt: -1 });
      return res.json(products);
    }
    
    if (req.user.role === 'customers') {
      const products = await ManufacturedProduct.find({ 
        status: 'available',
        quantity: { $gt: 0 }
      })
        .populate('manufacturerId', 'name company')
        .sort({ createdAt: -1 });
      return res.json(products);
    }
    
    res.status(403).json({ message: 'Access denied' });

  } catch (err) {
    console.error('❌ Error fetching available products:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

apiRouter.get('/products/mine', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'suppliers') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const products = await Product.find({ supplierId: req.user.userId })
      .sort({ createdAt: -1 });

    console.log(`✅ Fetched ${products.length} products for supplier ${req.user.userId}`);
    res.json(products);

  } catch (err) {
    console.error('❌ Error fetching supplier products:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

apiRouter.get('/supplier/receipts', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'suppliers') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const receipts = await Transaction.find({ sellerId: req.user.userId })
      .populate('buyerId', 'name email company')
      .populate('productId', 'name image')
      .sort({ timestamp: -1 });

    console.log(`✅ Fetched ${receipts.length} payment receipts for supplier ${req.user.userId}`);
    res.json(receipts);

  } catch (err) {
    console.error('❌ Error fetching payment receipts:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

apiRouter.get('/supplier/receipts/:receiptId', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'suppliers') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { receiptId } = req.params;
    
    const receipt = await Transaction.findOne({ 
      _id: receiptId,
      sellerId: req.user.userId 
    })
      .populate('buyerId', 'name email company')
      .populate('productId', 'name image location');

    if (!receipt) {
      return res.status(404).json({ message: 'Receipt not found' });
    }

    console.log(`✅ Fetched receipt ${receiptId} for supplier ${req.user.userId}`);
    res.json(receipt);

  } catch (err) {
    console.error('❌ Error fetching receipt details:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

apiRouter.get('/supplier/purchased-materials', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'suppliers') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const soldMaterials = await PurchasedMaterial.find({ 
      supplierId: req.user.userId 
    })
      .populate('manufacturerId', 'name email company')
      .sort({ purchasedAt: -1 });

    console.log(`✅ Fetched ${soldMaterials.length} sold materials for supplier ${req.user.userId}`);
    res.json(soldMaterials);

  } catch (err) {
    console.error('❌ Error fetching sold materials:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/* ===================== MANUFACTURER ROUTES ===================== */

apiRouter.post('/manufacturer/purchase', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'manufacturers') {
      return res.status(403).json({ message: 'Only manufacturers can purchase materials' });
    }

    const { productId, quantity, txHash } = req.body;

    if (!productId || !quantity || !txHash) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    if (product.quantity < quantity) {
      return res.status(400).json({ message: 'Insufficient quantity available' });
    }

    const manufacturer = await User.findById(req.user.userId);

    const purchasedMaterial = new PurchasedMaterial({
      productId: product._id,
      originalProductId: product._id,
      productName: product.name,
      manufacturerId: req.user.userId,
      manufacturerName: manufacturer.name,
      supplierId: product.supplierId,
      supplierName: product.supplierName,
      quantity,
      price: product.price,
      image: product.image,
      location: product.location,
      txHash,
      status: 'available'
    });

    await purchasedMaterial.save();

    product.quantity -= quantity;
    await product.save();

    const transaction = new Transaction({
      productId: product._id,
      productName: product.name,
      buyerId: req.user.userId,
      buyerName: manufacturer.name,
      sellerId: product.supplierId,
      sellerName: product.supplierName,
      quantity,
      amount: product.price * quantity,
      txHash,
      status: 'completed'
    });

    await transaction.save();

    console.log(`✅ Material purchased: ${product.name} by ${manufacturer.email}`);

    res.status(201).json({
      message: 'Material purchased successfully',
      purchasedMaterial,
      transaction
    });

  } catch (err) {
    console.error('❌ Error purchasing material:', err);
    res.status(500).json({ 
      message: 'Server error',
      error: err.message 
    });
  }
});

apiRouter.get('/manufacturer/materials', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'manufacturers') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const materials = await PurchasedMaterial.find({ 
      manufacturerId: req.user.userId,
      status: 'available'
    }).sort({ purchasedAt: -1 });

    res.json(materials);

  } catch (err) {
    console.error('❌ Error fetching materials:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

apiRouter.post('/manufacturer/products', authenticateToken, upload.fields([
  { name: 'mainImage', maxCount: 1 },
  { name: 'galleryImages', maxCount: 5 }
]), async (req, res) => {
  try {
    if (req.user.role !== 'manufacturers') {
      return res.status(403).json({ message: 'Only manufacturers can create products' });
    }

    const { 
      name, description, price, quantity, 
      rawMaterials, contractAddress, tokenId, txHash,
      brand, category, weight, dimensions, color, material, 
      warranty, certifications, isOrganic, expiryDate
    } = req.body;

    if (!name || !description || !price || !quantity) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    if (!req.files || !req.files.mainImage) {
      return res.status(400).json({ message: 'Main product image is required' });
    }

    const manufacturer = await User.findById(req.user.userId);

    const mainImageUrl = req.files.mainImage[0].path;
    const galleryImageUrls = req.files.galleryImages 
      ? req.files.galleryImages.map(file => file.path)
      : [];

    const manufacturedProduct = new ManufacturedProduct({
      name,
      description,
      price: Number(price),
      quantity: Number(quantity),
      image: mainImageUrl,
      galleryImages: galleryImageUrls,
      productDetails: {
        brand: brand || '',
        category: category || '',
        weight: weight || '',
        dimensions: dimensions || '',
        color: color || '',
        material: material || '',
        warranty: warranty || '',
        certifications: certifications ? JSON.parse(certifications) : [],
        isOrganic: isOrganic === 'true',
        expiryDate: expiryDate || null
      },
      manufacturerId: req.user.userId,
      manufacturerName: manufacturer.name,
      company: manufacturer.company,
      rawMaterials: rawMaterials ? JSON.parse(rawMaterials) : [],
      blockchainData: {
        contractAddress: contractAddress || '',
        tokenId: tokenId || '',
        txHash: txHash || ''
      },
      status: 'available'
    });

    await manufacturedProduct.save();

    if (rawMaterials) {
      const materials = JSON.parse(rawMaterials);
      for (const mat of materials) {
        await PurchasedMaterial.findByIdAndUpdate(
          mat.materialId,
          { status: 'used' }
        );
      }
    }

    console.log(`✅ Product manufactured: ${name} by ${manufacturer.email}`);

    res.status(201).json({
      message: 'Product created successfully',
      product: manufacturedProduct
    });

  } catch (err) {
    console.error('❌ Error creating manufactured product:', err);
    res.status(500).json({ 
      message: 'Server error',
      error: err.message 
    });
  }
});

apiRouter.get('/manufacturer/products', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'manufacturers') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const products = await ManufacturedProduct.find({ 
      manufacturerId: req.user.userId 
    }).sort({ createdAt: -1 });

    res.json(products);

  } catch (err) {
    console.error('❌ Error fetching manufactured products:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

apiRouter.get('/products/:productId/detail', authenticateToken, async (req, res) => {
  try {
    const { productId } = req.params;
    
    const product = await ManufacturedProduct.findById(productId)
      .populate('manufacturerId', 'name email company');
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json(product);

  } catch (err) {
    console.error('❌ Error fetching product detail:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/* ===================== MANUFACTURER REVENUE & REFUNDS ROUTES ===================== */

apiRouter.get('/manufacturer/revenue', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'manufacturers') {
      return res.status(403).json({ message: 'Access denied. Manufacturers only.' });
    }

    console.log(`💰 [DEBUG] Fetching revenue for manufacturer: ${req.user.userId}`);

    // Get query parameters for filtering
    const { 
      timeRange = 'all', 
      productFilter = 'all', 
      statusFilter = 'all',
      sortBy = 'date_desc'
    } = req.query;

    // Get manufacturer's products
    const manufacturerProducts = await ManufacturedProduct.find({
      manufacturerId: req.user.userId
    }).select('_id name');

    console.log(`📊 [DEBUG] Manufacturer products:`, manufacturerProducts.map(p => ({id: p._id, name: p.name})));

    const productIds = manufacturerProducts.map(p => p._id);
    console.log(`🔍 [DEBUG] Looking for product IDs:`, productIds);

    // Build query for manufacturer's orders
    const query = {
      'items.product': { 
        $in: productIds 
      }
    };

    // Apply time range filter
    if (timeRange !== 'all') {
      const now = new Date();
      let startDate;

      switch (timeRange) {
        case 'today':
          startDate = new Date(now.setHours(0, 0, 0, 0));
          break;
        case 'week':
          startDate = new Date(now.setDate(now.getDate() - 7));
          break;
        case 'month':
          startDate = new Date(now.setMonth(now.getMonth() - 1));
          break;
        case 'quarter':
          startDate = new Date(now.setMonth(now.getMonth() - 3));
          break;
        case 'year':
          startDate = new Date(now.setFullYear(now.getFullYear() - 1));
          break;
      }

      if (startDate) {
        query.createdAt = { $gte: startDate };
      }
    }

    // Apply product filter
    if (productFilter !== 'all') {
      query['items.product'] = mongoose.Types.ObjectId(productFilter);
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      query.status = statusFilter;
    }

    // Determine sort order
    let sortOption = { createdAt: -1 };
    switch (sortBy) {
      case 'date_asc':
        sortOption = { createdAt: 1 };
        break;
      case 'amount_desc':
        sortOption = { totalAmount: -1 };
        break;
      case 'amount_asc':
        sortOption = { totalAmount: 1 };
        break;
    }

    console.log(`🔎 [DEBUG] MongoDB Query:`, JSON.stringify(query, null, 2));

    // Fetch orders with filters
    const orders = await Order.find(query)
      .populate('items.product')
      .populate('customer', 'name email')
      .sort(sortOption);

    console.log(`📦 [DEBUG] Found ${orders.length} orders for manufacturer ${req.user.userId}`);
    
    // Transform orders to revenue receipts
    const receipts = orders.map(order => {
      // Filter items to only include manufacturer's products
      const manufacturerItems = order.items.filter(item => {
        if (!item.product) return false;
        
        const itemProductId = item.product._id?.toString();
        const isManufacturerProduct = productIds.some(pid => 
          pid.toString() === itemProductId
        );
        
        console.log(`   Checking item: ${item.product?.name} (${itemProductId}) - Is manufacturer's: ${isManufacturerProduct}`);
        return isManufacturerProduct;
      });

      if (manufacturerItems.length === 0) {
        console.log(`   No manufacturer items found in order ${order.orderNumber}`);
        return null;
      }

      console.log(`   Found ${manufacturerItems.length} manufacturer items in order ${order.orderNumber}`);

      // Calculate manufacturer's share of the order
      const manufacturerTotal = manufacturerItems.reduce((sum, item) => {
        return sum + (item.price * item.quantity);
      }, 0);

      return {
        _id: order._id,
        orderNumber: order.orderNumber,
        customerName: order.customer?.name || order.deliveryAddress.name,
        customerEmail: order.customer?.email || 'N/A',
        items: manufacturerItems.map(item => ({
          productId: item.product?._id || item.product,
          productName: item.product?.name || 'Product',
          quantity: item.quantity,
          price: item.price,
          subtotal: item.price * item.quantity
        })),
        totalAmount: manufacturerTotal,
        status: order.status,
        returnRequest: order.returnRequest,
        paymentDetails: order.paymentDetails || {},
        createdAt: order.createdAt,
        deliveredAt: order.deliveredAt,
        deliveryAddress: order.deliveryAddress,
        trackingHistory: order.trackingHistory || []
      };
    }).filter(receipt => receipt !== null);

    // Calculate statistics
    const stats = {
      totalRevenue: receipts.reduce((sum, receipt) => sum + receipt.totalAmount, 0),
      totalOrders: receipts.length,
      productsSold: receipts.reduce((sum, receipt) => 
        sum + receipt.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0
      ),
      averageOrderValue: receipts.length > 0 ? 
        receipts.reduce((sum, receipt) => sum + receipt.totalAmount, 0) / receipts.length : 0,
      monthlyRevenue: 0,
      pendingAmount: receipts
        .filter(r => r.status === 'pending' || r.status === 'confirmed')
        .reduce((sum, receipt) => sum + receipt.totalAmount, 0),
      totalRefunds: 0,
      pendingRefunds: 0
    };

    // Calculate monthly revenue
    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);

    const monthlyReceipts = receipts.filter(r => 
      new Date(r.createdAt) >= currentMonth
    );

    stats.monthlyRevenue = monthlyReceipts.reduce((sum, receipt) => 
      sum + receipt.totalAmount, 0
    );

    // Calculate refund stats
    const refunds = await Refund.find({ manufacturerId: req.user.userId });
    stats.totalRefunds = refunds.length;
    stats.pendingRefunds = refunds.filter(r => r.status === 'pending' || r.status === 'processing').length;

    console.log(`💰 Final: Revenue data fetched for manufacturer ${req.user.userId}: ${receipts.length} receipts`);

    res.json({
      receipts,
      stats,
      filters: {
        timeRange,
        productFilter,
        statusFilter,
        sortBy
      }
    });

  } catch (err) {
    console.error('❌ Error fetching revenue data:', err);
    res.status(500).json({ 
      message: 'Server error',
      error: err.message 
    });
  }
});
apiRouter.get('/debug/refunds', authenticateToken, async (req, res) => {
  try {
    const allRefunds = await Refund.find({})
      .populate('customerId', 'name email')
      .populate('manufacturerId', 'name email role')
      .populate('deliveryPartnerId', 'name email');
    
    const manufacturers = await User.find({ role: 'manufacturers' });
    
    const debugInfo = {
      totalRefunds: allRefunds.length,
      currentUser: {
        id: req.user.userId,
        role: req.user.role
      },
      manufacturers: manufacturers.map(m => ({
        id: m._id.toString(),
        name: m.name,
        email: m.email
      })),
      refunds: allRefunds.map(r => ({
        id: r._id.toString(),
        orderNumber: r.orderNumber,
        manufacturerId: r.manufacturerId?._id?.toString() || r.manufacturerId?.toString() || 'MISSING',
        manufacturerName: r.manufacturerId?.name || r.manufacturerName || 'MISSING',
        customerName: r.customerName,
        amount: r.totalAmount,
        status: r.status,
        createdAt: r.createdAt
      }))
    };
    
    res.json(debugInfo);
  } catch (error) {
    console.error('Debug error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========== 2. FIX REFUNDS ENDPOINT (ADMIN ONLY) ==========
apiRouter.post('/debug/fix-refunds', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin only' });
    }

    const allRefunds = await Refund.find({});
    const fixed = [];
    const errors = [];

    for (const refund of allRefunds) {
      try {
        // Check if manufacturerId needs fixing
        const needsFix = !refund.manufacturerId || 
                        !mongoose.Types.ObjectId.isValid(refund.manufacturerId) ||
                        !(await User.findById(refund.manufacturerId));

        if (needsFix) {
          console.log(`🔧 Fixing refund ${refund.orderNumber}...`);
          
          // Try to find manufacturer from order -> product
          const order = await Order.findById(refund.orderId);
          if (order && order.items && order.items.length > 0) {
            // Get first product to find manufacturer
            const product = await ManufacturedProduct.findById(order.items[0].product)
              .populate('manufacturerId');
            
            if (product && product.manufacturerId) {
              const oldId = refund.manufacturerId?.toString() || 'none';
              
              refund.manufacturerId = product.manufacturerId._id;
              refund.manufacturerName = product.manufacturerId.name;
              refund.manufacturerEmail = product.manufacturerId.email;
              await refund.save();
              
              fixed.push({
                orderNumber: refund.orderNumber,
                oldManufacturerId: oldId,
                fixedManufacturerId: product.manufacturerId._id.toString(),
                manufacturerName: product.manufacturerId.name
              });
              
              console.log(`✅ Fixed: ${refund.orderNumber} -> ${product.manufacturerId.name}`);
            } else {
              errors.push({
                orderNumber: refund.orderNumber,
                error: 'Could not find manufacturer from product'
              });
            }
          } else {
            errors.push({
              orderNumber: refund.orderNumber,
              error: 'Order not found or has no items'
            });
          }
        }
      } catch (err) {
        errors.push({
          orderNumber: refund.orderNumber,
          error: err.message
        });
      }
    }

    res.json({
      success: true,
      message: 'Refund migration completed',
      totalRefunds: allRefunds.length,
      fixed: fixed.length,
      errors: errors.length,
      details: { fixed, errors }
    });
  } catch (error) {
    console.error('Migration error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========== 3. GET ALL REFUNDS FOR MANUFACTURER (MAIN ENDPOINT) ==========
apiRouter.get('/manufacturer/refunds', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'manufacturers') {
      return res.status(403).json({ message: 'Access denied. Manufacturers only.' });
    }

    const { status } = req.query;
    
    // Ensure we're using ObjectId for the query
    let manufacturerObjectId;
    try {
      manufacturerObjectId = mongoose.Types.ObjectId.isValid(req.user.userId) 
        ? new mongoose.Types.ObjectId(req.user.userId)
        : req.user.userId;
    } catch (e) {
      manufacturerObjectId = req.user.userId;
    }
    
    const query = { manufacturerId: manufacturerObjectId };
    if (status && status !== 'all') {
      query.status = status;
    }

    console.log('🔍 Fetching refunds for manufacturer:', req.user.userId);
    console.log('📝 Query:', JSON.stringify(query));

    const refunds = await Refund.find(query)
      .populate('customerId', 'name email walletAddress')
      .populate('deliveryPartnerId', 'name email')
      .populate('orderId', 'orderNumber')
      .sort({ createdAt: -1 });

    console.log('✅ Refunds found:', refunds.length);

    // Calculate summary
    const totalRefundAmount = refunds.reduce((sum, refund) => sum + refund.totalAmount, 0);
    const pendingRefunds = refunds.filter(r => r.status === 'pending' || r.status === 'processing').length;
    const completedRefunds = refunds.filter(r => r.status === 'completed').length;

    res.json({
      refunds,
      summary: {
        total: refunds.length,
        pending: pendingRefunds,
        completed: completedRefunds,
        totalAmount: totalRefundAmount
      }
    });

  } catch (err) {
    console.error('❌ Error fetching refunds:', err);
    res.status(500).json({ 
      message: 'Server error',
      error: err.message 
    });
  }
});

// ========== 4. GET SINGLE REFUND DETAILS ==========
apiRouter.get('/manufacturer/refunds/:refundId', authenticateToken, async (req, res) => {
  try {
    const { refundId } = req.params;
    
    // ADD THIS VALIDATION:
    if (refundId === 'stats' || refundId === 'summary' || refundId === 'stats-summary') {
      return res.status(400).json({ 
        message: 'Use /manufacturer/refunds-summary for statistics',
        correctEndpoint: '/api/manufacturer/refunds-summary'
      });
    }

    // Ensure we're using ObjectId for the query
    let manufacturerObjectId;
    try {
      manufacturerObjectId = mongoose.Types.ObjectId.isValid(req.user.userId) 
        ? new mongoose.Types.ObjectId(req.user.userId)
        : req.user.userId;
    } catch (e) {
      manufacturerObjectId = req.user.userId;
    }

    const refund = await Refund.findOne({
      _id: refundId,
      manufacturerId: manufacturerObjectId
    })
      .populate('customerId', 'name email walletAddress')
      .populate('deliveryPartnerId', 'name email')
      .populate('orderId')
      .populate('items.productId');

    if (!refund) {
      return res.status(404).json({ message: 'Refund not found' });
    }

    res.json(refund);

  } catch (err) {
    console.error('❌ Error fetching refund details:', err);
    res.status(500).json({ 
      message: 'Server error',
      error: err.message 
    });
  }
});

// ========== 5. PROCESS REFUND (APPROVE/REJECT/COMPLETE) ==========
apiRouter.put('/manufacturer/refunds/:refundId/process', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'manufacturers') {
      return res.status(403).json({ message: 'Access denied. Manufacturers only.' });
    }

    const { refundId } = req.params;
    const { action, transactionHash, notes } = req.body;

    // Validate action
    if (!action || !['approve', 'reject', 'complete'].includes(action)) {
      return res.status(400).json({ message: 'Invalid action. Must be approve, reject, or complete.' });
    }

    // Ensure we're using ObjectId for the query
    let manufacturerObjectId;
    try {
      manufacturerObjectId = mongoose.Types.ObjectId.isValid(req.user.userId) 
        ? new mongoose.Types.ObjectId(req.user.userId)
        : req.user.userId;
    } catch (e) {
      manufacturerObjectId = req.user.userId;
    }

    // Find the refund
    const refund = await Refund.findOne({
      _id: refundId,
      manufacturerId: manufacturerObjectId
    });

    if (!refund) {
      return res.status(404).json({ message: 'Refund not found or you do not have permission to process it.' });
    }

    // Check if refund can be processed
    if (refund.status === 'completed' || refund.status === 'failed') {
      return res.status(400).json({ message: `Refund is already ${refund.status} and cannot be modified.` });
    }

    // Get manufacturer and order details
    const manufacturer = await User.findById(req.user.userId);
    const order = await Order.findById(refund.orderId);

    if (!manufacturer) {
      return res.status(404).json({ message: 'Manufacturer not found.' });
    }

    // Process based on action
    if (action === 'approve') {
      // Approve the refund - change status to processing
      if (refund.status !== 'pending') {
        return res.status(400).json({ message: 'Only pending refunds can be approved.' });
      }

      refund.status = 'processing';
      refund.notes = notes || refund.notes;
      refund.updatedAt = new Date();
      
      // Add to tracking history
      refund.trackingHistory.push({
        status: 'processing',
        message: 'Refund approved by manufacturer and ready for payment processing',
        timestamp: new Date(),
        updatedBy: {
          userId: req.user.userId,
          name: manufacturer.name,
          role: 'manufacturer'
        }
      });

      // Update order return status
      if (order) {
        order.returnRequest.status = 'refund_approved';
        order.returnRequest.lastUpdated = new Date();
        
        order.trackingHistory.push({
          status: 'refund_approved',
          message: 'Refund approved by manufacturer. Awaiting payment processing.',
          timestamp: new Date(),
          deliveryPartner: {
            name: manufacturer.name,
            phone: manufacturer.email
          }
        });
        
        await order.save();
      }

      await refund.save();

      console.log(`✅ Refund ${refund.orderNumber} approved by ${manufacturer.name}`);

      return res.json({
        success: true,
        message: 'Refund approved successfully. You can now complete the refund using MetaMask.',
        refund: refund
      });

    } else if (action === 'complete') {
      // Complete the refund with blockchain transaction
      if (refund.status !== 'processing') {
        return res.status(400).json({ message: 'Only processing refunds can be completed. Please approve the refund first.' });
      }

      // Validate transaction hash
      if (!transactionHash || transactionHash.trim() === '') {
        return res.status(400).json({ message: 'Transaction hash is required to complete the refund.' });
      }

      // Validate transaction hash format (Ethereum transaction hash)
      if (!/^0x([A-Fa-f0-9]{64})$/.test(transactionHash)) {
        return res.status(400).json({ message: 'Invalid transaction hash format. Must be a valid Ethereum transaction hash.' });
      }

      refund.status = 'completed';
      refund.transactionHash = transactionHash;
      refund.notes = notes || refund.notes;
      refund.updatedAt = new Date();
      
      // Add to tracking history
      refund.trackingHistory.push({
        status: 'completed',
        message: `Refund completed successfully via blockchain. Transaction hash: ${transactionHash}`,
        timestamp: new Date(),
        updatedBy: {
          userId: req.user.userId,
          name: manufacturer.name,
          role: 'manufacturer'
        }
      });

      // Update order return status
      if (order) {
        order.returnRequest.status = 'refund_completed';
        order.returnRequest.lastUpdated = new Date();
        order.status = 'returned';
        
        order.trackingHistory.push({
          status: 'refund_completed',
          message: `Refund of ₹${refund.totalAmount.toFixed(2)} completed successfully. Transaction: ${transactionHash}`,
          timestamp: new Date()
        });
        
        // Return product quantities to manufacturer's inventory
        console.log('📦 Returning products to inventory...');
        for (const item of refund.items) {
          const product = await ManufacturedProduct.findById(item.productId);
          if (product) {
            const previousQuantity = product.quantity;
            product.quantity += item.quantity;
            product.status = 'available'; // Make sure it's available again
            await product.save();
            console.log(`✅ Returned ${item.quantity} units of ${item.productName} to inventory (${previousQuantity} → ${product.quantity})`);
          }
        }
        
        await order.save();
      }

      await refund.save();

      console.log(`💰 Refund ${refund.orderNumber} completed: ₹${refund.totalAmount} sent to customer`);

      return res.json({
        success: true,
        message: 'Refund completed successfully! Amount has been sent to customer via blockchain.',
        refund: refund,
        transactionHash: transactionHash
      });

    } else if (action === 'reject') {
      // Reject the refund
      if (refund.status !== 'pending') {
        return res.status(400).json({ message: 'Only pending refunds can be rejected.' });
      }

      // Validate rejection notes
      if (!notes || notes.trim() === '') {
        return res.status(400).json({ message: 'Notes are required when rejecting a refund. Please provide a reason.' });
      }

      refund.status = 'rejected';
      refund.notes = notes;
      refund.updatedAt = new Date();
      
      // Add to tracking history
      refund.trackingHistory.push({
        status: 'rejected',
        message: `Refund rejected by manufacturer. Reason: ${notes}`,
        timestamp: new Date(),
        updatedBy: {
          userId: req.user.userId,
          name: manufacturer.name,
          role: 'manufacturer'
        }
      });

      // Update order return status
      if (order) {
        order.returnRequest.status = 'rejected';
        order.returnRequest.lastUpdated = new Date();
        order.returnRequest.notes = notes;
        order.status = 'delivered'; // Revert to delivered status
        
        order.trackingHistory.push({
          status: 'refund_rejected',
          message: `Refund request rejected by manufacturer. Reason: ${notes}`,
          timestamp: new Date()
        });
        
        await order.save();
      }

      await refund.save();

      console.log(`❌ Refund ${refund.orderNumber} rejected by ${manufacturer.name}: ${notes}`);

      return res.json({
        success: true,
        message: 'Refund rejected successfully.',
        refund: refund
      });
    }

  } catch (err) {
    console.error('❌ Error processing refund:', err);
    res.status(500).json({ 
      success: false,
      message: 'Failed to process refund. Please try again.',
      error: err.message 
    });
  }
});
// ========== CREATE REFUND FOR EXISTING ORDER ==========
apiRouter.post('/manufacturer/create-refund-for-order/:orderNumber', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'manufacturers') {
      return res.status(403).json({ message: 'Access denied. Manufacturers only.' });
    }

    const { orderNumber } = req.params;
    const manufacturerId = req.user.userId;

    console.log(`🔧 Creating refund for order ${orderNumber} for manufacturer ${manufacturerId}`);

    // Find the order
    const order = await Order.findOne({ orderNumber })
      .populate('customer', 'name email walletAddress')
      .populate('items.product')
      .populate('deliveryPartner', 'name email');

    if (!order) {
      return res.status(404).json({ 
        success: false,
        message: `Order ${orderNumber} not found` 
      });
    }

    // Check if order has return request
    if (!order.returnRequest || !order.returnRequest.requested) {
      return res.status(400).json({
        success: false,
        message: `Order ${orderNumber} does not have a return request`
      });
    }

    // Get manufacturer details
    const manufacturer = await User.findById(manufacturerId);
    if (!manufacturer) {
      return res.status(404).json({
        success: false,
        message: 'Manufacturer not found'
      });
    }

    // Filter items that belong to this manufacturer
    const manufacturerItems = [];

    // Get all products from this manufacturer
    const manufacturerProducts = await ManufacturedProduct.find({
      manufacturerId: manufacturerId
    }).select('_id');

    const manufacturerProductIds = manufacturerProducts.map(p => p._id.toString());

    // Check which items belong to this manufacturer
    for (const item of order.items) {
      if (item.product && manufacturerProductIds.includes(item.product._id.toString())) {
        manufacturerItems.push({
          productId: item.product._id,
          productName: item.product.name,
          quantity: item.quantity,
          price: item.price,
          subtotal: item.price * item.quantity
        });
      }
    }

    if (manufacturerItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No items found in this order that belong to your manufacturing company'
      });
    }

    // Calculate total amount for this manufacturer's items
    const totalAmount = manufacturerItems.reduce((sum, item) => sum + item.subtotal, 0);

    // Check if refund already exists
    const existingRefund = await Refund.findOne({ 
      orderNumber: orderNumber,
      manufacturerId: manufacturerId 
    });

    if (existingRefund) {
      return res.json({
        success: true,
        message: 'Refund already exists for this order',
        refund: existingRefund,
        action: 'View it in refund management'
      });
    }

    // Create new refund
    const refund = new Refund({
      orderId: order._id,
      orderNumber: order.orderNumber,
      customerId: order.customer._id,
      customerName: order.customer.name,
      customerEmail: order.customer.email,
      manufacturerId: manufacturerId,
      manufacturerName: manufacturer.name,
      manufacturerEmail: manufacturer.email,
      deliveryPartnerId: order.deliveryPartner?._id,
      deliveryPartnerName: order.deliveryPartner?.name,
      items: manufacturerItems,
      totalAmount: totalAmount,
      reason: order.returnRequest.reason || 'Return requested',
      refundMethod: 'wallet',
      status: 'pending',
      walletAddress: order.customer.walletAddress || order.paymentDetails?.walletAddress,
      trackingHistory: [{
        status: 'pending',
        message: 'Refund created manually for order return',
        timestamp: new Date(),
        updatedBy: {
          userId: manufacturerId,
          name: manufacturer.name,
          role: 'manufacturer'
        }
      }],
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await refund.save();

    // Update order with refund ID
    if (!order.returnRequest.refundId) {
      order.returnRequest.refundId = refund._id;
      await order.save();
    }

    console.log(`✅ Refund created for ${orderNumber}: £${totalAmount}`);

    res.json({
      success: true,
      message: `Refund created successfully for £${totalAmount}`,
      refund: {
        _id: refund._id,
        orderNumber: refund.orderNumber,
        customerName: refund.customerName,
        totalAmount: refund.totalAmount,
        status: refund.status,
        itemsCount: refund.items.length,
        createdAt: refund.createdAt
      },
      nextStep: 'Refresh the refund management page to see and process this refund'
    });

  } catch (error) {
    console.error('❌ Error creating refund:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create refund',
      error: error.message
    });
  }
});

// ========== CHECK ORDERS WITH RETURNS ==========
apiRouter.get('/manufacturer/orders-with-returns', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'manufacturers') {
      return res.status(403).json({ message: 'Access denied. Manufacturers only.' });
    }

    const manufacturerId = req.user.userId;

    // Get all orders with return requests
    const ordersWithReturns = await Order.find({
      'returnRequest.requested': true,
      'returnRequest.status': { $in: ['refund_requested', 'pending', 'approved'] }
    })
      .populate('items.product')
      .populate('customer', 'name email')
      .sort({ 'returnRequest.requestedAt': -1 });

    // Filter orders that contain products from this manufacturer
    const manufacturerOrders = [];
    
    // Get manufacturer's products
    const manufacturerProducts = await ManufacturedProduct.find({
      manufacturerId: manufacturerId
    }).select('_id name');

    const manufacturerProductIds = manufacturerProducts.map(p => p._id.toString());

    for (const order of ordersWithReturns) {
      // Check if any item in this order belongs to this manufacturer
      const hasManufacturerItems = order.items.some(item => 
        item.product && manufacturerProductIds.includes(item.product._id.toString())
      );

      if (hasManufacturerItems) {
        // Calculate manufacturer's share
        const manufacturerItems = order.items.filter(item => 
          item.product && manufacturerProductIds.includes(item.product._id.toString())
        );

        const manufacturerTotal = manufacturerItems.reduce((sum, item) => 
          sum + (item.price * item.quantity), 0
        );

        // Check if refund already exists
        const existingRefund = await Refund.findOne({
          orderNumber: order.orderNumber,
          manufacturerId: manufacturerId
        });

        manufacturerOrders.push({
          orderNumber: order.orderNumber,
          orderId: order._id,
          customerName: order.customer?.name || order.deliveryAddress.name,
          returnReason: order.returnRequest.reason,
          returnStatus: order.returnRequest.status,
          requestedAt: order.returnRequest.requestedAt,
          items: manufacturerItems.map(item => ({
            productName: item.product?.name,
            quantity: item.quantity,
            price: item.price,
            subtotal: item.price * item.quantity
          })),
          totalAmount: manufacturerTotal,
          hasRefund: !!existingRefund,
          refundId: existingRefund?._id,
          refundStatus: existingRefund?.status,
          createdAt: order.createdAt
        });
      }
    }

    res.json({
      success: true,
      manufacturerId: manufacturerId,
      manufacturerProducts: manufacturerProducts.length,
      ordersWithReturns: manufacturerOrders.length,
      orders: manufacturerOrders
    });

  } catch (error) {
    console.error('❌ Error checking orders with returns:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check orders',
      error: error.message
    });
  }
});

// ========== 7. REVENUE SUMMARY (EXISTING - NO CHANGES) ==========
apiRouter.get('/manufacturer/revenue/summary', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'manufacturers') {
      return res.status(403).json({ message: 'Access denied. Manufacturers only.' });
    }

    // Get manufacturer's products
    const products = await ManufacturedProduct.find({
      manufacturerId: req.user.userId
    });

    // Get all orders containing manufacturer's products
    const productIds = products.map(p => p._id);
    
    const orders = await Order.find({
      'items.product': { $in: productIds }
    }).populate('items.product');

    // Calculate product-wise sales
    const productSales = {};
    let totalRevenue = 0;
    let totalUnitsSold = 0;

    orders.forEach(order => {
      order.items.forEach(item => {
        if (productIds.includes(item.product?._id?.toString() || item.product?.toString())) {
          const productId = item.product?._id?.toString() || item.product?.toString();
          
          if (!productSales[productId]) {
            productSales[productId] = {
              productId: productId,
              productName: item.product?.name || 'Unknown Product',
              unitsSold: 0,
              revenue: 0,
              orders: 0
            };
          }

          productSales[productId].unitsSold += item.quantity;
          productSales[productId].revenue += item.price * item.quantity;
          productSales[productId].orders += 1;
          
          totalUnitsSold += item.quantity;
          totalRevenue += item.price * item.quantity;
        }
      });
    });

    // Convert to array and sort by revenue
    const productSalesArray = Object.values(productSales)
      .sort((a, b) => b.revenue - a.revenue);

    // Calculate monthly trend
    const monthlyData = {};
    const currentYear = new Date().getFullYear();
    
    orders.forEach(order => {
      const orderDate = new Date(order.createdAt);
      if (orderDate.getFullYear() === currentYear) {
        const month = orderDate.toLocaleString('default', { month: 'short' });
        const yearMonth = `${month} ${orderDate.getFullYear()}`;
        
        if (!monthlyData[yearMonth]) {
          monthlyData[yearMonth] = {
            month: yearMonth,
            revenue: 0,
            orders: 0
          };
        }

        // Calculate manufacturer's share for this month
        const manufacturerShare = order.items
          .filter(item => productIds.includes(item.product?._id?.toString() || item.product?.toString()))
          .reduce((sum, item) => sum + (item.price * item.quantity), 0);

        monthlyData[yearMonth].revenue += manufacturerShare;
        monthlyData[yearMonth].orders += 1;
      }
    });

    const monthlyTrend = Object.values(monthlyData)
      .sort((a, b) => new Date(a.month) - new Date(b.month));

    res.json({
      summary: {
        totalProducts: products.length,
        totalRevenue,
        totalUnitsSold,
        averageOrderValue: orders.length > 0 ? totalRevenue / orders.length : 0
      },
      productSales: productSalesArray,
      monthlyTrend,
      topProducts: productSalesArray.slice(0, 5)
    });

  } catch (err) {
    console.error('❌ Error fetching revenue summary:', err);
    res.status(500).json({ 
      message: 'Server error',
      error: err.message 
    });
  }
});

// ========== 8. RECEIPT GENERATION (EXISTING - NO CHANGES) ==========
apiRouter.get('/manufacturer/receipt/:orderId', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'manufacturers') {
      return res.status(403).json({ message: 'Access denied. Manufacturers only.' });
    }

    const { orderId } = req.params;

    // Get manufacturer's products
    const manufacturerProducts = await ManufacturedProduct.find({
      manufacturerId: req.user.userId
    }).select('_id');

    const productIds = manufacturerProducts.map(p => p._id);

    // Find the order
    const order = await Order.findById(orderId)
      .populate('items.product')
      .populate('customer', 'name email phone')
      .populate('deliveryPartner', 'name email company');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Filter items to only include manufacturer's products
    const manufacturerItems = order.items.filter(item => 
      productIds.includes(item.product?._id?.toString() || item.product?.toString())
    );

    if (manufacturerItems.length === 0) {
      return res.status(403).json({ message: 'No manufacturer products in this order' });
    }

    // Calculate manufacturer's share
    const manufacturerTotal = manufacturerItems.reduce((sum, item) => {
      return sum + (item.price * item.quantity);
    }, 0);

    // Calculate tax and other charges (simplified)
    const taxRate = 0.18; // 18% GST
    const taxAmount = manufacturerTotal * taxRate;
    const netAmount = manufacturerTotal - taxAmount;

    const receipt = {
      orderNumber: order.orderNumber,
      receiptNumber: `RCP-${order.orderNumber}-${Date.now().toString().slice(-6)}`,
      invoiceDate: order.createdAt,
      dueDate: new Date(order.createdAt.getTime() + 7 * 24 * 60 * 60 * 1000), // 7 days from order
      
      manufacturer: {
        name: req.user.name,
        company: req.user.company,
        email: req.user.email
      },
      
      customer: {
        name: order.customer?.name || order.deliveryAddress.name,
        email: order.customer?.email || 'N/A',
        phone: order.customer?.phone || order.deliveryAddress.phone,
        address: order.deliveryAddress
      },
      
      items: manufacturerItems.map(item => ({
        productName: item.product?.name || 'Product',
        description: item.product?.description || '',
        quantity: item.quantity,
        unitPrice: item.price,
        total: item.price * item.quantity
      })),
      
      paymentDetails: order.paymentDetails || {},
      orderStatus: order.status,
      deliveryPartner: order.deliveryPartner,
      
      summary: {
        subtotal: manufacturerTotal,
        taxRate: `${(taxRate * 100)}%`,
        taxAmount: taxAmount,
        shipping: 0, // Free shipping for now
        discount: 0,
        totalAmount: manufacturerTotal,
        amountPaid: manufacturerTotal,
        balanceDue: 0
      },
      
      paymentTerms: 'Net 7 Days',
      notes: 'Thank you for your business!',
      
      tracking: order.trackingHistory || [],
      createdAt: order.createdAt
    };

    console.log(`💰 Receipt generated for order ${order.orderNumber}`);

    res.json({
      message: 'Receipt generated successfully',
      receipt,
      downloadUrl: `/api/manufacturer/receipt/${orderId}/download`
    });

  } catch (err) {
    console.error('❌ Error generating receipt:', err);
    res.status(500).json({ 
      message: 'Server error',
      error: err.message 
    });
  }
});

// ========== 9. DOWNLOAD RECEIPT (EXISTING - NO CHANGES) ==========
apiRouter.get('/manufacturer/receipt/:orderId/download', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'manufacturers') {
      return res.status(403).json({ message: 'Access denied. Manufacturers only.' });
    }

    const { orderId } = req.params;

    // Get receipt data (reusing the logic from above)
    const receiptData = await generateReceiptData(req.user.userId, orderId);

    // For now, return JSON. In production, you'd generate a PDF here
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="receipt-${receiptData.receiptNumber}.json"`);
    
    res.json(receiptData);

  } catch (err) {
    console.error('❌ Error downloading receipt:', err);
    res.status(500).json({ 
      message: 'Server error',
      error: err.message 
    });
  }
});

// ========== HELPER FUNCTION ==========
async function generateReceiptData(manufacturerId, orderId) {
  const manufacturer = await User.findById(manufacturerId);
  const manufacturerProducts = await ManufacturedProduct.find({
    manufacturerId: manufacturerId
  }).select('_id');

  const productIds = manufacturerProducts.map(p => p._id);

  const order = await Order.findById(orderId)
    .populate('items.product')
    .populate('customer', 'name email phone')
    .populate('deliveryPartner', 'name email company');

  const manufacturerItems = order.items.filter(item => 
    productIds.includes(item.product?._id?.toString() || item.product?.toString())
  );

  const manufacturerTotal = manufacturerItems.reduce((sum, item) => {
    return sum + (item.price * item.quantity);
  }, 0);

  return {
    receiptNumber: `RCP-${order.orderNumber}-${Date.now().toString().slice(-6)}`,
    invoiceDate: order.createdAt,
    manufacturer: {
      name: manufacturer.name,
      company: manufacturer.company,
      email: manufacturer.email
    },
    customer: {
      name: order.customer?.name || order.deliveryAddress.name,
      email: order.customer?.email || 'N/A',
      address: order.deliveryAddress
    },
    items: manufacturerItems.map(item => ({
      productName: item.product?.name || 'Product',
      quantity: item.quantity,
      unitPrice: item.price,
      total: item.price * item.quantity
    })),
    totalAmount: manufacturerTotal,
    orderStatus: order.status,
    paymentDetails: order.paymentDetails
  };
}

/* ===================== ORDER ROUTES ===================== */

apiRouter.post('/orders/create', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'customers') {
      return res.status(403).json({ message: 'Only customers can create orders' });
    }

    const { items, deliveryAddress, totalAmount, paymentDetails } = req.body;
    
    if (!items || items.length === 0) {
      return res.status(400).json({ message: 'Order must contain at least one item' });
    }

    if (!deliveryAddress || !deliveryAddress.name || !deliveryAddress.phone || 
        !deliveryAddress.street || !deliveryAddress.city || 
        !deliveryAddress.state || !deliveryAddress.pincode) {
      return res.status(400).json({ message: 'Complete delivery address is required' });
    }

    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    
    const order = new Order({
      orderNumber,
      customer: req.user.userId,
      items,
      totalAmount,
      deliveryAddress,
      paymentDetails,
      trackingHistory: [{
        status: 'pending',
        message: 'Order placed successfully',
        timestamp: new Date()
      }]
    });

    await order.save();

    for (const item of items) {
      await ManufacturedProduct.findByIdAndUpdate(
        item.product,
        { $inc: { quantity: -item.quantity } }
      );
    }

    console.log(`✅ Order created: ${order.orderNumber} by customer ${req.user.email}`);

    res.status(201).json({
      message: 'Order created successfully',
      order,
      orderNumber: order.orderNumber
    });
  } catch (error) {
    console.error('❌ Error creating order:', error);
    res.status(500).json({ message: 'Failed to create order', error: error.message });
  }
});

apiRouter.get('/customer/orders', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'customers') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const orders = await Order.find({ customer: req.user.userId })
      .populate('items.product')
      .populate('deliveryPartner', 'name email company')
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (error) {
    console.error('❌ Error fetching orders:', error);
    res.status(500).json({ message: 'Failed to fetch orders' });
  }
});

apiRouter.get('/customer/purchases', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'customers') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const orders = await Order.find({ customer: req.user.userId })
      .populate('items.product')
      .populate('deliveryPartner', 'name email company')
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (error) {
    console.error('❌ Error fetching customer purchases:', error);
    res.status(500).json({ message: 'Failed to fetch purchases' });
  }
});

apiRouter.post('/delivery/orders/:orderId/generate-otp', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'delivery_partner') {
      return res.status(403).json({ message: 'Access denied. Delivery partners only.' });
    }

    const { orderId } = req.params;

    const order = await Order.findOne({ 
      _id: orderId, 
      deliveryPartner: req.user.userId 
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found or not assigned to you' });
    }

    if (order.status !== 'near_location') {
      return res.status(400).json({ message: 'OTP can only be generated when order is near location' });
    }

    const deliveryOTP = Math.floor(100000 + Math.random() * 900000).toString();
    order.deliveryOTP = deliveryOTP;

    await order.save();

    console.log(`✅ OTP generated for order ${order.orderNumber}: ${deliveryOTP}`);

    res.json({ 
      message: 'OTP generated successfully',
      deliveryOTP,
      order 
    });
  } catch (error) {
    console.error('❌ Error generating OTP:', error);
    res.status(500).json({ message: 'Failed to generate OTP' });
  }
});

apiRouter.post('/delivery/orders/:orderId/verify-otp', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'delivery_partner') {
      return res.status(403).json({ message: 'Access denied. Delivery partners only.' });
    }

    const { orderId } = req.params;
    const { otp } = req.body;

    if (!otp || otp.length !== 6) {
      return res.status(400).json({ message: 'Valid 6-digit OTP is required' });
    }

    const order = await Order.findOne({ 
      _id: orderId, 
      deliveryPartner: req.user.userId 
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found or not assigned to you' });
    }

    if (!order.deliveryOTP) {
      return res.status(400).json({ message: 'OTP not generated yet. Please generate OTP first.' });
    }

    if (order.deliveryOTP !== otp) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    // Update order status to delivered
    order.status = 'delivered';
    order.deliveredAt = new Date();
    
    // Add delivery verification to tracking history
    order.trackingHistory.push({
      status: 'delivered',
      message: 'Order delivered successfully and verified with OTP',
      timestamp: new Date(),
      deliveryPartner: {
        name: req.user.name,
        phone: req.user.email
      }
    });

    await order.save();

    console.log(`✅ Order ${order.orderNumber} delivered with OTP verification`);

    res.json({ 
      message: 'Delivery verified successfully with OTP', 
      order 
    });
  } catch (error) {
    console.error('❌ Error verifying OTP:', error);
    res.status(500).json({ message: 'Failed to verify OTP', error: error.message });
  }
});

apiRouter.post('/orders/:orderId/feedback/:productId', authenticateToken, async (req, res) => {
  try {
    const { orderId, productId } = req.params;
    const { rating, comment } = req.body;

    const order = await Order.findOne({ 
      _id: orderId, 
      customer: req.user.userId 
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.status !== 'delivered') {
      return res.status(400).json({ message: 'Can only submit feedback for delivered orders' });
    }

    const orderItem = order.items.find(item => item.product.toString() === productId);
    if (!orderItem) {
      return res.status(400).json({ message: 'Product not found in this order' });
    }

    const existingFeedback = order.feedback.find(f => f.productId.toString() === productId);
    if (existingFeedback) {
      return res.status(400).json({ message: 'Feedback already submitted for this product' });
    }

    const customer = await User.findById(req.user.userId);

    order.feedback.push({
      productId,
      rating,
      comment,
      customerName: customer.name,
      submittedAt: new Date()
    });

    await order.save();

    const productReview = new ProductReview({
      productId,
      orderId,
      customerId: req.user.userId,
      customerName: customer.name,
      rating,
      comment
    });

    await productReview.save();

    console.log(`✅ Feedback submitted for product ${productId} in order ${order.orderNumber}`);

    res.json({ 
      message: 'Feedback submitted successfully', 
      feedback: {
        productId,
        rating,
        comment,
        customerName: customer.name
      }
    });
  } catch (error) {
    console.error('❌ Error submitting feedback:', error);
    res.status(500).json({ message: 'Failed to submit feedback' });
  }
});

apiRouter.get('/products/:productId/reviews', authenticateToken, async (req, res) => {
  try {
    const { productId } = req.params;

    const reviews = await ProductReview.find({ productId })
      .sort({ createdAt: -1 })
      .limit(50);

    const averageRating = reviews.length > 0 
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length 
      : 0;

    res.json({
      reviews,
      averageRating: averageRating.toFixed(1),
      totalReviews: reviews.length
    });
  } catch (error) {
    console.error('❌ Error fetching product reviews:', error);
    res.status(500).json({ message: 'Failed to fetch reviews' });
  }
});

apiRouter.get('/orders/:orderId/feedback', authenticateToken, async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findOne({ 
      _id: orderId, 
      customer: req.user.userId 
    }).select('feedback items');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const reviewedProductIds = order.feedback?.map(f => f.productId?.toString()) || [];
    const unreviewedProducts = order.items
      .filter(item => !reviewedProductIds.includes(item.product?.toString()))
      .map(item => ({
        productId: item.product,
        productName: item.product?.name || 'Product'
      }));

    res.json({
      submittedFeedback: order.feedback,
      unreviewedProducts,
      canSubmitFeedback: unreviewedProducts.length > 0 && order.status === 'delivered'
    });
  } catch (error) {
    console.error('❌ Error fetching feedback:', error);
    res.status(500).json({ message: 'Failed to fetch feedback' });
  }
});

/* ===================== ORDER RETURN ROUTES (Customer Initiated) ===================== */

apiRouter.post('/orders/:orderId/return', authenticateToken, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { reason } = req.body;

    console.log(`🔔 Return request for order ${orderId} from customer ${req.user.userId}`);

    const order = await Order.findOne({ 
      _id: orderId, 
      customer: req.user.userId 
    });

    if (!order) {
      console.log(`❌ Order ${orderId} not found for customer ${req.user.userId}`);
      return res.status(404).json({ message: 'Order not found' });
    }

    console.log(`📦 Order status: ${order.status}, Delivered at: ${order.deliveredAt}`);

    if (order.status !== 'delivered') {
      console.log(`❌ Order not delivered yet, status: ${order.status}`);
      return res.status(400).json({ message: 'Can only return delivered orders' });
    }

    if (!order.deliveredAt) {
      console.log(`❌ No delivery timestamp for order ${orderId}`);
      return res.status(400).json({ message: 'Delivery information missing' });
    }

    const deliveredDate = new Date(order.deliveredAt);
    const currentDate = new Date();
    const daysDiff = Math.floor((currentDate - deliveredDate) / (1000 * 60 * 60 * 24));
    
    console.log(`📅 Days since delivery: ${daysDiff}, Delivered: ${deliveredDate}`);
    
    if (daysDiff > 14) {
      console.log(`❌ Return period expired: ${daysDiff} days > 14 days`);
      return res.status(400).json({ 
        message: 'Return period has expired (14 days)',
        deliveredAt: order.deliveredAt,
        daysSinceDelivery: daysDiff
      });
    }

    // Check if return already requested
    if (order.returnRequest && order.returnRequest.requested) {
      console.log(`ℹ️ Return already requested for order ${orderId}`);
      return res.status(400).json({ 
        message: 'Return request already submitted',
        currentStatus: order.returnRequest.status 
      });
    }

    const customer = await User.findById(req.user.userId);

    // Update order return request
    order.returnRequest = {
      requested: true,
      reason,
      requestedAt: new Date(),
      status: 'pending',
      requestedBy: 'customer',
      customerId: req.user.userId,
      customerName: customer.name || customer.email
    };

    // Update order status
    order.status = 'return_requested';

    // Add to tracking history
    order.trackingHistory.push({
      status: 'return_requested',
      message: `Return requested by customer: ${reason}`,
      timestamp: new Date()
    });

    await order.save();

    console.log(`✅ Return requested for order ${order.orderNumber} by customer ${req.user.email}`);

    res.json({ 
      message: 'Return request submitted successfully', 
      order: {
        _id: order._id,
        orderNumber: order.orderNumber,
        returnRequest: order.returnRequest,
        status: order.status,
        deliveredAt: order.deliveredAt
      }
    });
  } catch (error) {
    console.error('❌ Error requesting return:', error);
    res.status(500).json({ 
      message: 'Failed to submit return request',
      error: error.message 
    });
  }
});

apiRouter.post('/orders/:orderId/cancel-return', authenticateToken, async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findOne({ 
      _id: orderId, 
      customer: req.user.userId 
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (!order.returnRequest || !order.returnRequest.requested) {
      return res.status(400).json({ message: 'No return request found' });
    }

    if (order.returnRequest.status !== 'pending') {
      return res.status(400).json({ 
        message: `Cannot cancel return in ${order.returnRequest.status} status` 
      });
    }

    // Clear return request
    order.returnRequest = {
      requested: false,
      reason: null,
      requestedAt: null,
      status: null
    };

    // Restore order status to delivered
    order.status = 'delivered';

    order.trackingHistory.push({
      status: 'return_cancelled',
      message: 'Return request cancelled by customer',
      timestamp: new Date()
    });

    await order.save();

    console.log(`✅ Return cancelled for order ${order.orderNumber}`);

    res.json({ 
      message: 'Return request cancelled successfully', 
      order 
    });
  } catch (error) {
    console.error('❌ Error cancelling return:', error);
    res.status(500).json({ message: 'Failed to cancel return request' });
  }
});

apiRouter.get('/orders/:orderId/return-status', authenticateToken, async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findOne({ 
      _id: orderId, 
      customer: req.user.userId 
    }).select('orderNumber returnRequest status deliveredAt trackingHistory deliveryAddress items totalAmount');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Calculate if return is eligible
    let isReturnEligible = false;
    if (order.status === 'delivered' && order.deliveredAt) {
      const deliveredDate = new Date(order.deliveredAt);
      const currentDate = new Date();
      const daysDiff = Math.floor((currentDate - deliveredDate) / (1000 * 60 * 60 * 24));
      isReturnEligible = daysDiff <= 14;
    }

    res.json({
      orderNumber: order.orderNumber,
      status: order.status,
      deliveredAt: order.deliveredAt,
      returnRequest: order.returnRequest || null,
      isReturnEligible,
      deliveryAddress: order.deliveryAddress,
      items: order.items,
      totalAmount: order.totalAmount,
      returnTracking: order.trackingHistory ? order.trackingHistory.filter(t => t.status.includes('return')) : []
    });
  } catch (error) {
    console.error('❌ Error fetching return status:', error);
    res.status(500).json({ message: 'Failed to fetch return status' });
  }
});

/* ===================== DELIVERY PARTNER ROUTES ===================== */

apiRouter.get('/delivery/assignments', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'delivery_partner') {
      return res.status(403).json({ message: 'Access denied. Delivery partners only.' });
    }

    const assignments = await Order.find({ 
      deliveryPartner: req.user.userId 
    })
      .populate('items.product')
      .populate('customer', 'name email')
      .sort({ assignedAt: -1 });

    res.json(assignments);
  } catch (error) {
    console.error('❌ Error fetching assignments:', error);
    res.status(500).json({ message: 'Failed to fetch assignments' });
  }
});

apiRouter.get('/delivery/pending-orders', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'delivery_partner') {
      return res.status(403).json({ message: 'Access denied. Delivery partners only.' });
    }

    const pendingOrders = await Order.find({ 
      status: 'pending',
      deliveryPartner: null
    })
      .populate('items.product')
      .populate('customer', 'name email')
      .sort({ createdAt: -1 });

    res.json(pendingOrders);
  } catch (error) {
    console.error('❌ Error fetching pending orders:', error);
    res.status(500).json({ message: 'Failed to fetch pending orders' });
  }
});

apiRouter.get('/delivery/stats', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'delivery_partner') {
      return res.status(403).json({ message: 'Access denied. Delivery partners only.' });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const totalDeliveries = await Order.countDocuments({
      deliveryPartner: req.user.userId,
      status: 'delivered'
    });

    const completedToday = await Order.countDocuments({
      deliveryPartner: req.user.userId,
      status: 'delivered',
      deliveredAt: { $gte: today }
    });

    const pending = await Order.countDocuments({
      deliveryPartner: req.user.userId,
      status: { $in: ['confirmed', 'out_for_delivery', 'near_location'] }
    });

    const returns = await Order.countDocuments({
      deliveryPartner: req.user.userId,
      status: 'return_requested'
    });

    const returnPickups = await Order.countDocuments({
      'returnRequest.deliveryPartnerId': req.user.userId,
      'returnRequest.status': { $in: ['out_for_pickup', 'pickup_near_location', 'pickup_otp_generated'] }
    });

    res.json({ totalDeliveries, completedToday, pending, returns, returnPickups });
  } catch (error) {
    console.error('❌ Error fetching stats:', error);
    res.status(500).json({ message: 'Failed to fetch stats' });
  }
});

apiRouter.post('/delivery/self-assign/:orderId', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'delivery_partner') {
      return res.status(403).json({ message: 'Access denied. Delivery partners only.' });
    }

    const { orderId } = req.params;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.deliveryPartner) {
      return res.status(400).json({ message: 'Order already assigned to another delivery partner' });
    }

    if (order.status !== 'pending') {
      return res.status(400).json({ message: 'Order is not available for assignment' });
    }

    const deliveryPartner = await User.findById(req.user.userId);
    if (!deliveryPartner) {
      return res.status(404).json({ message: 'Delivery partner not found' });
    }

    order.deliveryPartner = req.user.userId;
    order.assignedAt = new Date();
    order.status = 'confirmed';
    
    order.trackingHistory.push({
      status: 'confirmed',
      message: `Order confirmed and assigned to ${deliveryPartner.name}`,
      timestamp: new Date(),
      deliveryPartner: {
        name: deliveryPartner.name,
        phone: deliveryPartner.email
      }
    });

    await order.save();

    console.log(`✅ Order ${order.orderNumber} self-assigned to ${deliveryPartner.name}`);

    res.json({ 
      message: 'Successfully assigned to this order', 
      order 
    });
  } catch (error) {
    console.error('❌ Error self-assigning order:', error);
    res.status(500).json({ message: 'Failed to assign order' });
  }
});

apiRouter.put('/delivery/orders/:orderId/status', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'delivery_partner') {
      return res.status(403).json({ message: 'Access denied. Delivery partners only.' });
    }

    const { orderId } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ message: 'Status is required' });
    }

    const order = await Order.findOne({ 
      _id: orderId, 
      deliveryPartner: req.user.userId 
    }).populate('deliveryPartner', 'name email');

    if (!order) {
      return res.status(404).json({ message: 'Order not found or not assigned to you' });
    }

    // Updated valid transitions for delivery
    const validTransitions = {
      'confirmed': ['out_for_delivery'],
      'out_for_delivery': ['near_location'],
      'near_location': ['delivered'] // Can only go to delivered from near_location
    };

    const allowedTransitions = validTransitions[order.status];
    
    if (!allowedTransitions || !allowedTransitions.includes(status)) {
      return res.status(400).json({ 
        message: `Invalid status transition from ${order.status} to ${status}`,
        currentStatus: order.status,
        allowedTransitions: allowedTransitions || []
      });
    }

    // Update order status
    order.status = status;
    
    const statusMessages = {
      'out_for_delivery': 'Package is out for delivery',
      'near_location': 'Delivery partner is near your location - OTP will be generated for verification',
      'delivered': 'Package has been delivered'
    };

    order.trackingHistory.push({
      status,
      message: statusMessages[status] || `Status updated to ${status}`,
      timestamp: new Date(),
      deliveryPartner: {
        name: order.deliveryPartner?.name || req.user.name,
        phone: order.deliveryPartner?.email || req.user.email
      }
    });

    // Clear OTP when moving to near_location (will generate fresh OTP)
    if (status === 'near_location') {
      order.deliveryOTP = null;
    }

    await order.save();

    console.log(`✅ Order ${order.orderNumber} status updated to ${status}`);

    res.json({ 
      message: 'Order status updated successfully', 
      order,
      // Only return OTP if generated separately
      deliveryOTP: undefined
    });
  } catch (error) {
    console.error('❌ Error updating order status:', error);
    res.status(500).json({ 
      message: 'Failed to update order status',
      error: error.message 
    });
  }
});

/* ===================== DELIVERY PARTNER RETURN MANAGEMENT ===================== */

// Delivery partner views customer return requests
apiRouter.get('/delivery/return-requests', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'delivery_partner') {
      return res.status(403).json({ message: 'Access denied. Delivery partners only.' });
    }

    const returnRequests = await Order.find({
      'returnRequest.requested': true,
      'returnRequest.status': 'pending',
      deliveryPartner: req.user.userId
    })
      .populate('customer', 'name email phone')
      .select('orderNumber deliveryAddress items totalAmount deliveredAt returnRequest trackingHistory')
      .sort({ 'returnRequest.requestedAt': -1 });

    console.log(`✅ Found ${returnRequests.length} return requests for delivery partner ${req.user.userId}`);

    res.json(returnRequests);
  } catch (error) {
    console.error('❌ Error fetching return requests:', error);
    res.status(500).json({ 
      message: 'Failed to fetch return requests',
      error: error.message 
    });
  }
});

// Delivery partner processes return (approve/reject)
apiRouter.post('/delivery/orders/:orderId/process-return', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'delivery_partner') {
      return res.status(403).json({ message: 'Access denied. Delivery partners only.' });
    }

    const { orderId } = req.params;
    const { action, pickupDate, pickupTime, notes } = req.body; // action: 'approve' or 'reject'

    if (!action || !['approve', 'reject'].includes(action)) {
      return res.status(400).json({ message: 'Invalid action. Must be "approve" or "reject".' });
    }

    const order = await Order.findOne({ 
      _id: orderId,
      deliveryPartner: req.user.userId 
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found or not assigned to you' });
    }

    if (!order.returnRequest || !order.returnRequest.requested) {
      return res.status(400).json({ message: 'No return request found for this order' });
    }

    if (order.returnRequest.status !== 'pending') {
      return res.status(400).json({ 
        message: `Return request is already ${order.returnRequest.status}` 
      });
    }

    const deliveryPartner = await User.findById(req.user.userId);

    if (action === 'approve') {
      // Approve the return
      order.returnRequest.status = 'approved';
      order.returnRequest.approvedAt = new Date();
      order.returnRequest.approvedBy = {
        deliveryPartnerId: req.user.userId,
        deliveryPartnerName: deliveryPartner.name
      };
      
      if (pickupDate) {
        order.returnRequest.pickupSchedule = {
          date: pickupDate,
          time: pickupTime || '9:00 AM - 6:00 PM',
          notes: notes || ''
        };
      }

      // Update order status for pickup flow
      order.status = 'return_requested';

      order.trackingHistory.push({
        status: 'return_approved',
        message: `Return approved by delivery partner ${deliveryPartner.name}. Pickup scheduled${pickupDate ? ` for ${pickupDate}` : ''}.`,
        timestamp: new Date(),
        deliveryPartner: {
          name: deliveryPartner.name,
          phone: deliveryPartner.email
        }
      });

      console.log(`✅ Return approved for order ${order.orderNumber} by ${deliveryPartner.name}`);

    } else if (action === 'reject') {
      // Reject the return
      order.returnRequest.status = 'rejected';
      order.returnRequest.rejectedAt = new Date();
      order.returnRequest.rejectedBy = {
        deliveryPartnerId: req.user.userId,
        deliveryPartnerName: deliveryPartner.name
      };
      order.returnRequest.rejectionNotes = notes || '';

      // Restore order status to delivered
      order.status = 'delivered';

      order.trackingHistory.push({
        status: 'return_rejected',
        message: `Return rejected by delivery partner ${deliveryPartner.name}. Reason: ${notes || 'Not specified'}`,
        timestamp: new Date(),
        deliveryPartner: {
          name: deliveryPartner.name,
          phone: deliveryPartner.email
        }
      });

      console.log(`❌ Return rejected for order ${order.orderNumber} by ${deliveryPartner.name}`);
    }

    await order.save();

    res.json({ 
      message: `Return request ${action}ed successfully`,
      order,
      returnRequest: order.returnRequest
    });
  } catch (error) {
    console.error('❌ Error processing return:', error);
    res.status(500).json({ 
      message: 'Failed to process return',
      error: error.message 
    });
  }
});

// Delivery partner updates return pickup status (just like delivery flow)
apiRouter.put('/delivery/orders/:orderId/return-status', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'delivery_partner') {
      return res.status(403).json({ message: 'Access denied. Delivery partners only.' });
    }

    const { orderId } = req.params;
    const { status, notes } = req.body;

    const validStatuses = ['out_for_pickup', 'pickup_near_location', 'pickup_otp_generated', 'pickup_completed', 'refund_requested'];
    
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ 
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` 
      });
    }

    const order = await Order.findOne({ 
      _id: orderId,
      deliveryPartner: req.user.userId 
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found or not assigned to you' });
    }

    if (!order.returnRequest || !order.returnRequest.requested) {
      return res.status(400).json({ message: 'No return request found for this order' });
    }

    // FIXED: Implement proper state transition system
    const allowedTransitions = {
      'approved': ['out_for_pickup', 'pickup_near_location', 'pickup_otp_generated', 'pickup_completed'],
      'out_for_pickup': ['pickup_near_location', 'pickup_otp_generated', 'pickup_completed'],
      'pickup_near_location': ['pickup_otp_generated', 'pickup_completed'],
      'pickup_otp_generated': ['pickup_completed'],
      'pickup_completed': ['refund_requested']  // This is the key fix - allows transition to refund_requested
    };

    const currentStatus = order.returnRequest.status;
    
    if (!allowedTransitions[currentStatus] || !allowedTransitions[currentStatus].includes(status)) {
      return res.status(400).json({ 
        message: `Cannot transition from ${currentStatus} to ${status}. Current status: ${currentStatus}`,
        allowedTransitions: allowedTransitions[currentStatus] || []
      });
    }

    const deliveryPartner = await User.findById(req.user.userId);

    // Update return status
    order.returnRequest.status = status;
    order.returnRequest.lastUpdated = new Date();
    order.returnRequest.notes = notes || order.returnRequest.notes;

    // Update order status to match return flow
    order.status = status;

    // Add to tracking history
    const statusMessages = {
      'out_for_pickup': 'Out for return pickup',
      'pickup_near_location': 'Near customer location for pickup',
      'pickup_otp_generated': 'Pickup OTP generated for verification',
      'pickup_completed': 'Return item picked up successfully',
      'refund_requested': 'Refund requested from manufacturer'
    };

    order.trackingHistory.push({
      status: status,
      message: `${statusMessages[status] || status.replace(/_/g, ' ')}${notes ? ` - ${notes}` : ''}`,
      timestamp: new Date(),
      deliveryPartner: {
        name: deliveryPartner.name,
        phone: deliveryPartner.email
      }
    });

    // Handle special cases
    if (status === 'pickup_otp_generated') {
      // Generate pickup OTP
      order.returnRequest.pickupOTP = Math.floor(100000 + Math.random() * 900000).toString();
      order.returnRequest.pickupOTPGeneratedAt = new Date();
      order.pickupOTP = order.returnRequest.pickupOTP;
    }

    if (status === 'pickup_completed') {
      order.returnRequest.pickupCompletedAt = new Date();
      
      // Create refund record for manufacturer
      const customer = await User.findById(order.customer);
      const manufacturerProducts = [];
      
      // Get manufacturer for each product
      for (const item of order.items) {
        const product = await ManufacturedProduct.findById(item.product).populate('manufacturerId');
        if (product && product.manufacturerId) {
          manufacturerProducts.push({
            product,
            item
          });
        }
      }

      // Group by manufacturer and create refunds
      const manufacturerMap = new Map();
      
      for (const { product, item } of manufacturerProducts) {
        const manufacturerId = product.manufacturerId._id.toString();
        
        if (!manufacturerMap.has(manufacturerId)) {
          manufacturerMap.set(manufacturerId, {
            manufacturerId: product.manufacturerId._id,
            manufacturerName: product.manufacturerId.name,
            manufacturerEmail: product.manufacturerId.email,
            items: []
          });
        }
        
        manufacturerMap.get(manufacturerId).items.push({
          productId: product._id,
          productName: product.name,
          quantity: item.quantity,
          price: item.price,
          subtotal: item.price * item.quantity
        });
      }

      // Create refund for each manufacturer
      for (const [manufacturerId, data] of manufacturerMap) {
        const totalAmount = data.items.reduce((sum, item) => sum + item.subtotal, 0);
        
        const refund = new Refund({
          orderId: order._id,
          orderNumber: order.orderNumber,
          customerId: order.customer,
          customerName: customer.name,
          customerEmail: customer.email,
          manufacturerId: data.manufacturerId,
          manufacturerName: data.manufacturerName,
          manufacturerEmail: data.manufacturerEmail,
          deliveryPartnerId: req.user.userId,
          deliveryPartnerName: deliveryPartner.name,
          items: data.items,
          totalAmount,
          reason: order.returnRequest.reason,
          status: 'pending',
          walletAddress: customer.walletAddress || order.paymentDetails?.walletAddress,
          trackingHistory: [{
            status: 'pending',
            message: 'Refund created after successful pickup',
            timestamp: new Date(),
            updatedBy: {
              userId: req.user.userId,
              name: deliveryPartner.name,
              role: 'delivery_partner'
            }
          }]
        });

        await refund.save();

        // Link refund to order
        order.returnRequest.refundId = refund._id;
        
        console.log(`✅ Refund created for manufacturer ${data.manufacturerName}: ₹${totalAmount}`);
      }

    }

    if (status === 'refund_requested') {
      // Update refund status if exists
      if (order.returnRequest.refundId) {
        await Refund.findByIdAndUpdate(
          order.returnRequest.refundId,
          {
            status: 'processing',
            $push: {
              trackingHistory: {
                status: 'processing',
                message: 'Refund requested to manufacturer',
                timestamp: new Date(),
                updatedBy: {
                  userId: req.user.userId,
                  name: deliveryPartner.name,
                  role: 'delivery_partner'
                }
              }
            }
          }
        );
      }
    }

    await order.save();

    console.log(`✅ Return status updated to ${status} for order ${order.orderNumber}`);

    res.json({ 
      message: 'Return status updated successfully',
      order,
      returnRequest: order.returnRequest,
      pickupOTP: status === 'pickup_otp_generated' ? order.returnRequest.pickupOTP : undefined
    });
  } catch (error) {
    console.error('❌ Error updating return status:', error);
    res.status(500).json({ 
      message: 'Failed to update return status',
      error: error.message 
    });
  }
});

// Generate OTP for return pickup
apiRouter.post('/delivery/orders/:orderId/generate-pickup-otp', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'delivery_partner') {
      return res.status(403).json({ message: 'Access denied. Delivery partners only.' });
    }

    const { orderId } = req.params;

    const order = await Order.findOne({ 
      _id: orderId,
      deliveryPartner: req.user.userId 
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found or not assigned to you' });
    }

    if (order.returnRequest.status !== 'pickup_near_location') {
      return res.status(400).json({ 
        message: 'OTP can only be generated when near pickup location' 
      });
    }

    // Generate OTP
    const pickupOTP = Math.floor(100000 + Math.random() * 900000).toString();
    order.returnRequest.pickupOTP = pickupOTP;
    order.returnRequest.pickupOTPGeneratedAt = new Date();
    order.pickupOTP = pickupOTP;

    // Update status
    order.returnRequest.status = 'pickup_otp_generated';
    order.status = 'pickup_otp_generated';

    order.trackingHistory.push({
      status: 'pickup_otp_generated',
      message: `Pickup OTP generated: ${pickupOTP}`,
      timestamp: new Date(),
      deliveryPartner: {
        name: req.user.name,
        phone: req.user.email
      }
    });

    await order.save();

    console.log(`✅ Pickup OTP generated for order ${order.orderNumber}: ${pickupOTP}`);

res.json({ 
  message: 'Pickup OTP generated and sent to customer',
  order 
  // DON'T include pickupOTP here
});
  } catch (error) {
    console.error('❌ Error generating pickup OTP:', error);
    res.status(500).json({ message: 'Failed to generate pickup OTP' });
  }
});

// Verify pickup OTP
apiRouter.post('/delivery/orders/:orderId/verify-pickup-otp', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'delivery_partner') {
      return res.status(403).json({ message: 'Access denied. Delivery partners only.' });
    }

    const { orderId } = req.params;
    const { otp } = req.body;

    if (!otp || otp.length !== 6) {
      return res.status(400).json({ message: 'Valid 6-digit OTP is required' });
    }

    const order = await Order.findOne({ 
      _id: orderId, 
      deliveryPartner: req.user.userId 
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found or not assigned to you' });
    }

    if (!order.returnRequest.pickupOTP) {
      return res.status(400).json({ message: 'Pickup OTP not generated yet. Please generate OTP first.' });
    }

    if (order.returnRequest.pickupOTP !== otp) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    // Update order status to pickup completed
    order.returnRequest.status = 'pickup_completed';
    order.returnRequest.pickupVerifiedAt = new Date();
    order.status = 'pickup_completed';
    order.pickupCompletedAt = new Date();
    
    order.trackingHistory.push({
      status: 'pickup_completed',
      message: 'Pickup verified successfully with OTP',
      timestamp: new Date(),
      deliveryPartner: {
        name: req.user.name,
        phone: req.user.email
      }
    });

    await order.save();

    console.log(`✅ Pickup verified for order ${order.orderNumber} with OTP`);

    res.json({ 
      message: 'Pickup verified successfully with OTP', 
      order 
    });
  } catch (error) {
    console.error('❌ Error verifying pickup OTP:', error);
    res.status(500).json({ message: 'Failed to verify pickup OTP', error: error.message });
  }
});

// Get detailed return information
apiRouter.get('/delivery/orders/:orderId/return-details', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'delivery_partner') {
      return res.status(403).json({ message: 'Access denied. Delivery partners only.' });
    }

    const { orderId } = req.params;

    const order = await Order.findOne({ 
      _id: orderId,
      deliveryPartner: req.user.userId 
    })
      .populate('customer', 'name email phone')
      .select('orderNumber deliveryAddress items totalAmount deliveredAt returnRequest trackingHistory');

    if (!order) {
      return res.status(404).json({ message: 'Order not found or not assigned to you' });
    }

    if (!order.returnRequest || !order.returnRequest.requested) {
      return res.status(404).json({ message: 'No return request found for this order' });
    }

    // Calculate days since delivery
    let daysSinceDelivery = null;
    if (order.deliveredAt) {
      const deliveredDate = new Date(order.deliveredAt);
      const currentDate = new Date();
      daysSinceDelivery = Math.floor((currentDate - deliveredDate) / (1000 * 60 * 60 * 24));
    }

    res.json({
      orderDetails: {
        orderNumber: order.orderNumber,
        customer: {
          name: order.customer?.name || order.deliveryAddress.name,
          email: order.customer?.email || 'N/A',
          phone: order.customer?.phone || order.deliveryAddress.phone
        },
        address: order.deliveryAddress,
        items: order.items,
        totalAmount: order.totalAmount,
        deliveredAt: order.deliveredAt,
        daysSinceDelivery: daysSinceDelivery
      },
      returnRequest: order.returnRequest,
      trackingHistory: order.trackingHistory.filter(t => t.status.includes('return') || t.status.includes('pickup'))
    });
  } catch (error) {
    console.error('❌ Error fetching return details:', error);
    res.status(500).json({ 
      message: 'Failed to fetch return details',
      error: error.message 
    });
  }
});

// Delivery partner can also initiate return (for damaged items during delivery, etc.)
apiRouter.post('/delivery/orders/:orderId/initiate-return', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'delivery_partner') {
      return res.status(403).json({ message: 'Access denied. Delivery partners only.' });
    }

    const { orderId } = req.params;
    const { reason, notes } = req.body;

    if (!reason) {
      return res.status(400).json({ message: 'Reason is required' });
    }

    const order = await Order.findOne({ 
      _id: orderId,
      deliveryPartner: req.user.userId 
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found or not assigned to you' });
    }

    if (order.status !== 'delivered') {
      return res.status(400).json({ message: 'Only delivered orders can be returned' });
    }

    // Check return window (14 days)
    if (!order.deliveredAt) {
      return res.status(400).json({ message: 'Delivery information missing' });
    }

    const deliveredDate = new Date(order.deliveredAt);
    const currentDate = new Date();
    const daysDiff = Math.floor((currentDate - deliveredDate) / (1000 * 60 * 60 * 24));
    
    if (daysDiff > 14) {
      return res.status(400).json({ message: 'Return period has expired (14 days from delivery)' });
    }

    // Check if return already requested
    if (order.returnRequest && order.returnRequest.requested) {
      return res.status(400).json({ 
        message: 'Return request already exists for this order' 
      });
    }

    const deliveryPartner = await User.findById(req.user.userId);

    // Create return request initiated by delivery partner
    order.returnRequest = {
      requested: true,
      reason,
      requestedAt: new Date(),
      status: 'approved', // Auto-approve when initiated by delivery partner
      requestedBy: 'delivery_partner',
      deliveryPartnerId: req.user.userId,
      deliveryPartnerName: deliveryPartner.name,
      approvedAt: new Date(),
      approvedBy: {
        deliveryPartnerId: req.user.userId,
        deliveryPartnerName: deliveryPartner.name
      },
      notes: notes || ''
    };

    // Update order status
    order.status = 'return_requested';

    // Add to tracking history
    order.trackingHistory.push({
      status: 'return_requested',
      message: `Return initiated by delivery partner: ${reason}`,
      timestamp: new Date(),
      deliveryPartner: {
        name: deliveryPartner.name,
        phone: deliveryPartner.email
      }
    });

    await order.save();

    console.log(`✅ Return initiated for order ${order.orderNumber} by delivery partner ${deliveryPartner.name}`);

    res.json({ 
      message: 'Return initiated successfully',
      order,
      returnRequest: order.returnRequest
    });
  } catch (error) {
    console.error('❌ Error initiating return:', error);
    res.status(500).json({ 
      message: 'Failed to initiate return',
      error: error.message 
    });
  }
});

/* ===================== ADMIN ROUTES ===================== */

apiRouter.get('/admin/users', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admins only.' });
    }

    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json(users);

  } catch (err) {
    console.error('❌ Error fetching users:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

apiRouter.get('/admin/products', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admins only.' });
    }

    const products = await Product.find()
      .populate('supplierId', 'name email company')
      .sort({ createdAt: -1 });

    res.json(products);

  } catch (err) {
    console.error('❌ Error fetching products:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

apiRouter.get('/admin/manufactured-products', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admins only.' });
    }

    const products = await ManufacturedProduct.find()
      .populate('manufacturerId', 'name email company')
      .sort({ createdAt: -1 });

    res.json(products);

  } catch (err) {
    console.error('❌ Error fetching manufactured products:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

apiRouter.get('/admin/transactions', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admins only.' });
    }

    const transactions = await Transaction.find()
      .populate('buyerId', 'name email')
      .populate('sellerId', 'name email')
      .sort({ timestamp: -1 });

    res.json(transactions);

  } catch (err) {
    console.error('❌ Error fetching transactions:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

apiRouter.get('/admin/orders', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admins only.' });
    }

    const orders = await Order.find()
      .populate('customer', 'name email company')
      .populate('items.product')
      .populate('deliveryPartner', 'name email company')
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (error) {
    console.error('❌ Error fetching all orders:', error);
    res.status(500).json({ message: 'Failed to fetch orders' });
  }
});

apiRouter.put('/admin/orders/:orderId/assign', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admins only.' });
    }

    const { orderId } = req.params;
    const { deliveryPartnerId } = req.body;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const deliveryPartner = await User.findOne({ 
      _id: deliveryPartnerId, 
      role: 'delivery_partner' 
    });

    if (!deliveryPartner) {
      return res.status(404).json({ message: 'Delivery partner not found' });
    }

    order.deliveryPartner = deliveryPartnerId;
    order.assignedAt = new Date();
    order.status = 'confirmed';
    
    order.trackingHistory.push({
      status: 'confirmed',
      message: `Order confirmed and assigned to ${deliveryPartner.name}`,
      timestamp: new Date(),
      deliveryPartner: {
        name: deliveryPartner.name,
        phone: deliveryPartner.email
      }
    });

    await order.save();

    console.log(`✅ Order ${order.orderNumber} assigned to ${deliveryPartner.name}`);

    res.json({ message: 'Delivery partner assigned successfully', order });
  } catch (error) {
    console.error('❌ Error assigning delivery partner:', error);
    res.status(500).json({ message: 'Failed to assign delivery partner' });
  }
});

apiRouter.get('/admin/delivery-partners', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admins only.' });
    }

    const deliveryPartners = await User.find({ role: 'delivery_partner' })
      .select('name email company isActive createdAt');

    res.json(deliveryPartners);
  } catch (error) {
    console.error('❌ Error fetching delivery partners:', error);
    res.status(500).json({ message: 'Failed to fetch delivery partners' });
  }
});

apiRouter.put('/admin/users/:userId/status', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admins only.' });
    }

    const { userId } = req.params;
    const { isActive } = req.body;

    const user = await User.findByIdAndUpdate(
      userId,
      { isActive },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    console.log(`✅ User ${user.email} status updated: ${isActive ? 'active' : 'inactive'}`);

    res.json({ message: 'User status updated', user });

  } catch (err) {
    console.error('❌ Error updating user status:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/* ===================== MANUFACTURER ROUTES ===================== */

apiRouter.post('/products/buy-raw', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'manufacturers') {
      return res.status(403).json({ message: 'Access denied. Manufacturers only.' });
    }

    const { productId, quantity, externalTxHash, blockchainReceipt } = req.body;

    if (!productId || !quantity || quantity <= 0) {
      return res.status(400).json({ message: 'Invalid purchase data' });
    }

    const product = await Product.findById(productId).populate('supplierId');
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    if (product.quantity < quantity) {
      return res.status(400).json({ 
        message: `Not enough stock. Available: ${product.quantity}` 
      });
    }

    const totalAmount = product.price * quantity;

    const manufacturer = await User.findById(req.user.userId);
    if (!manufacturer) {
      return res.status(404).json({ message: 'Manufacturer not found' });
    }

    const purchasedMaterial = new PurchasedMaterial({
      productId: product._id,
      originalProductId: product._id,
      productName: product.name,
      manufacturerId: manufacturer._id,
      manufacturerName: manufacturer.name,
      supplierId: product.supplierId._id,
      supplierName: product.supplierId.name,
      quantity: quantity,
      price: totalAmount,
      image: product.image,
      location: product.location,
      txHash: externalTxHash || `TX-${Date.now()}`,
      status: 'available',
      purchasedAt: new Date()
    });

    await purchasedMaterial.save();

    const transaction = new Transaction({
      productId: product._id,
      productName: product.name,
      buyerId: manufacturer._id,
      buyerName: manufacturer.name,
      sellerId: product.supplierId._id,
      sellerName: product.supplierId.name,
      quantity: quantity,
      amount: totalAmount,
      txHash: externalTxHash || `TX-${Date.now()}`,
      status: 'completed',
      timestamp: new Date()
    });

    await transaction.save();

    product.quantity -= quantity;
    await product.save();

    console.log(`✅ Material purchased: ${manufacturer.name} bought ${quantity} units of ${product.name}`);

    res.json({
      message: 'Material purchased successfully',
      purchasedMaterial,
      transaction,
      remainingStock: product.quantity
    });

  } catch (err) {
    console.error('❌ Error purchasing material:', err);
    res.status(500).json({ 
      message: 'Server error',
      error: err.message 
    });
  }
});

apiRouter.get('/manufacturer/purchases', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'manufacturers') {
      return res.status(403).json({ message: 'Access denied. Manufacturers only.' });
    }

    const transactions = await Transaction.find({ buyerId: req.user.userId })
      .populate('productId')
      .populate('sellerId', 'name email company')
      .sort({ timestamp: -1 });

    res.json(transactions);

  } catch (err) {
    console.error('❌ Error fetching purchases:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

apiRouter.get('/manufacturer/bought-materials', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'manufacturers') {
      return res.status(403).json({ message: 'Access denied. Manufacturers only.' });
    }

    const materials = await PurchasedMaterial.find({ 
      manufacturerId: req.user.userId,
      status: 'available'
    })
      .populate('supplierId', 'name email company')
      .sort({ purchasedAt: -1 });

    res.json(materials);

  } catch (err) {
    console.error('❌ Error fetching bought materials:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/* ===================== MANUFACTURER ROUTES - CREATE PRODUCT ===================== */

apiRouter.post('/manufacturer/create-product', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    if (req.user.role !== 'manufacturers') {
      return res.status(403).json({ message: 'Access denied. Manufacturers only.' });
    }

    const { name, description, quantity, price, materialId, quantityUsed } = req.body;

    if (!name || !description || !quantity || !price || !materialId || !quantityUsed) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'Product image is required' });
    }

    const material = await PurchasedMaterial.findById(materialId);
    if (!material) {
      return res.status(404).json({ message: 'Material not found' });
    }

    if (material.manufacturerId.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'You do not own this material' });
    }

    if (material.status !== 'available') {
      return res.status(400).json({ message: 'Material has already been used' });
    }

    if (parseInt(quantityUsed) > material.quantity) {
      return res.status(400).json({ 
        message: `Cannot use more units than available. Available: ${material.quantity}` 
      });
    }

    const manufacturer = await User.findById(req.user.userId);
    if (!manufacturer) {
      return res.status(404).json({ message: 'Manufacturer not found' });
    }

    const manufacturedProduct = new ManufacturedProduct({
      name,
      description,
      price: parseFloat(price),
      quantity: parseInt(quantity),
      image: req.file.path,
      manufacturerId: manufacturer._id,
      manufacturerName: manufacturer.name,
      company: manufacturer.company,
      rawMaterials: [{
        materialId: material._id,
        materialName: material.productName,
        quantity: parseInt(quantityUsed)
      }],
      status: 'available'
    });

    await manufacturedProduct.save();

    // Update material quantity instead of marking as used completely
    material.quantity -= parseInt(quantityUsed);
    
    if (material.quantity === 0) {
      material.status = 'used';
    }
    // If there's remaining quantity, status remains 'available'
    
    await material.save();

    console.log(`✅ Product manufactured: ${manufacturer.name} created ${name} using ${quantityUsed} units of ${material.productName}`);

    res.json({
      message: 'Product manufactured successfully',
      product: manufacturedProduct,
      material: {
        remaining: material.quantity,
        status: material.status
      }
    });

  } catch (err) {
    console.error('❌ Error manufacturing product:', err);
    res.status(500).json({ 
      message: 'Server error',
      error: err.message 
    });
  }
});

/* ===================== MANUFACTURER COMBINE MATERIALS ===================== */

apiRouter.post('/manufacturer/manufacture-combined', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    if (req.user.role !== 'manufacturers') {
      return res.status(403).json({ message: 'Access denied. Manufacturers only.' });
    }

    const { name, description, quantity, price, materialIds, quantitiesUsed } = req.body;

    if (!name || !description || !quantity || !price || !materialIds || !quantitiesUsed) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'Product image is required' });
    }

    let parsedMaterialIds;
    let parsedQuantitiesUsed;
    
    try {
      parsedMaterialIds = JSON.parse(materialIds);
      parsedQuantitiesUsed = JSON.parse(quantitiesUsed);
    } catch (err) {
      return res.status(400).json({ message: 'Invalid material IDs or quantities format' });
    }

    if (!Array.isArray(parsedMaterialIds) || parsedMaterialIds.length < 2 || parsedMaterialIds.length > 3) {
      return res.status(400).json({ message: 'Please select 2-3 materials to combine' });
    }

    if (parsedMaterialIds.length !== parsedQuantitiesUsed.length) {
      return res.status(400).json({ message: 'Material IDs and quantities must match' });
    }

    const manufacturer = await User.findById(req.user.userId);
    if (!manufacturer) {
      return res.status(404).json({ message: 'Manufacturer not found' });
    }

    const materials = await PurchasedMaterial.find({ 
      _id: { $in: parsedMaterialIds } 
    });

    if (materials.length !== parsedMaterialIds.length) {
      return res.status(404).json({ message: 'One or more materials not found' });
    }

    // Validate each material
    for (let i = 0; i < materials.length; i++) {
      const material = materials[i];
      const quantityUsed = parseInt(parsedQuantitiesUsed[i]);

      if (material.manufacturerId.toString() !== req.user.userId) {
        return res.status(403).json({ 
          message: `You do not own the material: ${material.productName}` 
        });
      }

      if (material.status !== 'available') {
        return res.status(400).json({ 
          message: `Material "${material.productName}" has already been used` 
        });
      }

      if (quantityUsed > material.quantity) {
        return res.status(400).json({ 
          message: `Cannot use ${quantityUsed} units of "${material.productName}". Available: ${material.quantity}` 
        });
      }
    }

    const rawMaterialsArray = materials.map((material, index) => ({
      materialId: material._id,
      materialName: material.productName,
      quantity: parseInt(parsedQuantitiesUsed[index])
    }));

    const manufacturedProduct = new ManufacturedProduct({
      name,
      description,
      price: parseFloat(price),
      quantity: parseInt(quantity),
      image: req.file.path,
      manufacturerId: manufacturer._id,
      manufacturerName: manufacturer.name,
      company: manufacturer.company,
      rawMaterials: rawMaterialsArray,
      status: 'available'
    });

    await manufacturedProduct.save();

    // Update each material quantity
    for (let i = 0; i < materials.length; i++) {
      const material = materials[i];
      const quantityUsed = parseInt(parsedQuantitiesUsed[i]);
      
      material.quantity -= quantityUsed;
      
      if (material.quantity === 0) {
        material.status = 'used';
      }
      
      await material.save();
    }

    console.log(`✅ Combined product manufactured: ${manufacturer.name} created ${name} from ${materials.length} materials`);

    res.json({
      message: 'Combined product manufactured successfully',
      product: manufacturedProduct,
      materialsUsed: materials.length
    });

  } catch (err) {
    console.error('❌ Error manufacturing combined product:', err);
    res.status(500).json({ 
      message: 'Server error',
      error: err.message 
    });
  }
});

/* ===================== WALLET ROUTES ===================== */

apiRouter.put('/users/wallet', authenticateToken, async (req, res) => {
  try {
    const { walletAddress } = req.body;

    if (!walletAddress) {
      return res.status(400).json({ message: 'Wallet address is required' });
    }

    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { walletAddress },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    console.log(`✅ Wallet updated for ${user.email}: ${walletAddress}`);

    res.json({
      message: 'Wallet address updated successfully',
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        company: user.company
      }
    });
    
  } catch (err) {
    console.error('❌ Error updating wallet:', err);
    res.status(500).json({ 
      message: 'Server error',
      error: err.message 
    });
  }
});

// Apply the router to the app
app.use('/api', apiRouter);

/* ===================== HEALTH ===================== */
app.get('/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1;
  res.json({
    status: 'ok',
    mongodb: dbStatus,
    timestamp: new Date().toISOString()
  });
});

/* ===================== ERROR HANDLING ===================== */

app.use('*', (req, res) => {
  console.log(`❌ Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method,
    message: `The route ${req.originalUrl} does not exist on this server`
  });
});

app.use((err, req, res, next) => {
  console.error('❌ Server error:', err.stack);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
    timestamp: new Date().toISOString()
  });
});


// ========== 6. GET REFUND STATISTICS ==========
apiRouter.get('/manufacturer/refunds-summary', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'manufacturers') {
      return res.status(403).json({ message: 'Access denied. Manufacturers only.' });
    }

    // Ensure we're using ObjectId for the query
    let manufacturerObjectId;
    try {
      manufacturerObjectId = mongoose.Types.ObjectId.isValid(req.user.userId) 
        ? new mongoose.Types.ObjectId(req.user.userId)
        : req.user.userId;
    } catch (e) {
      manufacturerObjectId = req.user.userId;
    }

    const refunds = await Refund.find({ manufacturerId: manufacturerObjectId });

    const stats = {
      total: refunds.length,
      pending: refunds.filter(r => r.status === 'pending').length,
      processing: refunds.filter(r => r.status === 'processing').length,
      completed: refunds.filter(r => r.status === 'completed').length,
      rejected: refunds.filter(r => r.status === 'rejected').length,
      failed: refunds.filter(r => r.status === 'failed').length,
      totalRefundAmount: refunds.reduce((sum, r) => sum + r.totalAmount, 0),
      completedRefundAmount: refunds.filter(r => r.status === 'completed').reduce((sum, r) => sum + r.totalAmount, 0),
      pendingRefundAmount: refunds.filter(r => r.status === 'pending' || r.status === 'processing').reduce((sum, r) => sum + r.totalAmount, 0)
    };

    console.log(`📊 Refund stats for manufacturer ${req.user.userId}:`, stats);

    res.json({
      success: true,
      stats: stats
    });

  } catch (err) {
    console.error('❌ Error fetching refund stats:', err);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch refund statistics',
      error: err.message 
    });
  }
});

// Debug endpoint to check why refunds aren't showing
apiRouter.get('/debug/check-manufacturer-refunds', authenticateToken, async (req, res) => {
  try {
    const manufacturerId = req.user.userId;
    
    console.log('🔍 Checking refunds for manufacturer:', manufacturerId);
    
    // 1. Check all refunds in database
    const allRefunds = await Refund.find({});
    console.log('📊 Total refunds in system:', allRefunds.length);
    
    // 2. Check refunds with your manufacturerId
    const myRefunds = await Refund.find({ manufacturerId: manufacturerId });
    console.log('📊 Refunds with your manufacturerId:', myRefunds.length);
    
    // 3. Check if any orders have return_requested status
    const returnOrders = await Order.find({ 
      'returnRequest.status': 'refund_requested'
    }).populate('items.product');
    
    console.log('📊 Orders with refund_requested:', returnOrders.length);
    
    // 4. Check your manufactured products
    const myProducts = await ManufacturedProduct.find({ 
      manufacturerId: manufacturerId 
    });
    
    console.log('📊 Your manufactured products:', myProducts.length);
    
    res.json({
      manufacturerId,
      totalRefunds: allRefunds.length,
      myRefunds: myRefunds.length,
      myRefundsList: myRefunds.map(r => ({
        orderNumber: r.orderNumber,
        amount: r.totalAmount,
        status: r.status,
        manufacturerId: r.manufacturerId
      })),
      returnOrders: returnOrders.length,
      myProducts: myProducts.length,
      debug: 'Check if refunds have correct manufacturerId'
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/* ===================== SERVER ===================== */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════╗
║   🚀 Server running on port ${PORT}        ║
║   📊 MongoDB: ${mongoose.connection.readyState === 1 ? '✅ Connected' : '❌ Disconnected'}             ║
║   🌐 API: http://localhost:${PORT}/api     ║
╚════════════════════════════════════════════╝
  `);
});