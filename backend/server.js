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
    enum: ['pending', 'confirmed', 'processing', 'out_for_delivery', 'near_location', 'delivered', 'cancelled', 'returned'],
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
  deliveryPartner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  assignedAt: { type: Date, default: null },
  deliveredAt: { type: Date, default: null },
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
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' }
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

    if (order.status !== 'out_for_delivery') {
      return res.status(400).json({ message: 'OTP can only be generated when order is out for delivery' });
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

    order.status = 'delivered';
    order.deliveredAt = new Date();
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
    res.status(500).json({ message: 'Failed to verify OTP' });
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

    res.json({ totalDeliveries, completedToday, pending });
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

    const order = await Order.findOne({ 
      _id: orderId, 
      deliveryPartner: req.user.userId 
    }).populate('deliveryPartner', 'name email');

    if (!order) {
      return res.status(404).json({ message: 'Order not found or not assigned to you' });
    }

    const validTransitions = {
      'confirmed': ['out_for_delivery'],
      'out_for_delivery': ['near_location', 'delivered'],
      'near_location': ['delivered']
    };

    if (!validTransitions[order.status]?.includes(status)) {
      return res.status(400).json({ message: 'Invalid status transition' });
    }

    order.status = status;
    
    const statusMessages = {
      'out_for_delivery': 'Package is out for delivery',
      'near_location': 'Delivery partner is near your location',
      'delivered': 'Package has been delivered'
    };

    order.trackingHistory.push({
      status,
      message: statusMessages[status] || `Status updated to ${status}`,
      timestamp: new Date(),
      deliveryPartner: {
        name: order.deliveryPartner.name,
        phone: order.deliveryPartner.email
      }
    });

    if (status === 'delivered') {
      order.deliveredAt = new Date();
    }

    await order.save();

    console.log(`✅ Order ${order.orderNumber} status updated to ${status}`);

    res.json({ message: 'Order status updated successfully', order });
  } catch (error) {
    console.error('❌ Error updating order status:', error);
    res.status(500).json({ message: 'Failed to update order status' });
  }
});

apiRouter.post('/orders/:orderId/return', authenticateToken, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { reason } = req.body;

    const order = await Order.findOne({ 
      _id: orderId, 
      customer: req.user.userId 
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.status !== 'delivered') {
      return res.status(400).json({ message: 'Can only return delivered orders' });
    }

    const deliveredDate = new Date(order.deliveredAt);
    const currentDate = new Date();
    const daysDiff = Math.floor((currentDate - deliveredDate) / (1000 * 60 * 60 * 24));
    
    if (daysDiff > 14) {
      return res.status(400).json({ message: 'Return period has expired (14 days)' });
    }

    order.returnRequest = {
      requested: true,
      reason,
      requestedAt: new Date(),
      status: 'pending'
    };

    order.trackingHistory.push({
      status: 'return_requested',
      message: `Return requested: ${reason}`,
      timestamp: new Date()
    });

    await order.save();

    console.log(`✅ Return requested for order ${order.orderNumber}`);

    res.json({ message: 'Return request submitted successfully', order });
  } catch (error) {
    console.error('❌ Error requesting return:', error);
    res.status(500).json({ message: 'Failed to submit return request' });
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

apiRouter.post('/manufacturer/create-product', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    if (req.user.role !== 'manufacturers') {
      return res.status(403).json({ message: 'Access denied. Manufacturers only.' });
    }

    const { name, description, quantity, price, materialId } = req.body;

    if (!name || !description || !quantity || !price || !materialId) {
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
        quantity: material.quantity
      }],
      status: 'available'
    });

    await manufacturedProduct.save();

    material.status = 'used';
    await material.save();

    console.log(`✅ Product manufactured: ${manufacturer.name} created ${name}`);

    res.json({
      message: 'Product manufactured successfully',
      product: manufacturedProduct
    });

  } catch (err) {
    console.error('❌ Error manufacturing product:', err);
    res.status(500).json({ 
      message: 'Server error',
      error: err.message 
    });
  }
});

apiRouter.post('/manufacturer/manufacture-combined', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    if (req.user.role !== 'manufacturers') {
      return res.status(403).json({ message: 'Access denied. Manufacturers only.' });
    }

    const { name, description, quantity, price, materialIds } = req.body;

    if (!name || !description || !quantity || !price || !materialIds) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'Product image is required' });
    }

    let parsedMaterialIds;
    try {
      parsedMaterialIds = JSON.parse(materialIds);
    } catch (err) {
      return res.status(400).json({ message: 'Invalid material IDs format' });
    }

    if (!Array.isArray(parsedMaterialIds) || parsedMaterialIds.length < 2 || parsedMaterialIds.length > 3) {
      return res.status(400).json({ message: 'Please select 2-3 materials to combine' });
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

    for (const material of materials) {
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
    }

    const rawMaterialsArray = materials.map(material => ({
      materialId: material._id,
      materialName: material.productName,
      quantity: material.quantity
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

    await PurchasedMaterial.updateMany(
      { _id: { $in: parsedMaterialIds } },
      { $set: { status: 'used' } }
    );

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

apiRouter.put('/user/wallet', authenticateToken, async (req, res) => {
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