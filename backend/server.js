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

// Request logging middleware
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
    enum: ['admin', 'suppliers', 'manufacturers', 'customers'],
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
  unit: { type: String, default: 'pieces' }, // Unit of measurement
  price: { type: Number, required: true }, // Price in INR
  image: { type: String, required: true },
  
  // Google Map Location
  location: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    address: { type: String, required: true }
  },

  // supplier reference
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
  price: { type: Number, required: true }, // Price per unit in INR
  image: { type: String, required: true },
  
  // Location from original product
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
  amount: { type: Number, required: true }, // Amount in INR
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
  price: { type: Number, required: true }, // Price in INR
  quantity: { type: Number, required: true },
  image: { type: String, required: true },
  
  // Additional product images for gallery
  galleryImages: {
    type: [String],
    default: []
  },
  
  // Detailed product information
  productDetails: {
    brand: { type: String, default: '' },
    type: { type: String, default: '' },
    maxShelfLife: { type: String, default: '' },
    isPerishable: { type: Boolean, default: false },
    isOrganic: { type: Boolean, default: false },
    usedFor: { type: String, default: '' },
    packOf: { type: Number, default: 1 },
    unit: { type: String, default: 'kg' }, // kg, pieces, liters, etc.
    specifications: { type: String, default: '' },
    manufacture: { type: String, default: '' }
  },
  
  // Control visibility on customer page
  isVisibleToCustomers: {
    type: Boolean,
    default: true
  },
  
  // Discount information
  discount: {
    percentage: { type: Number, default: 0 },
    originalPrice: { type: Number, default: 0 }
  },
  
  // Product ratings
  rating: {
    average: { type: Number, default: 0 },
    count: { type: Number, default: 0 }
  },
  
  // Location from original material
  location: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    address: { type: String, required: true }
  },
  
  materialId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'PurchasedMaterial',
    required: false // Made optional for combined products
  },
  manufacturerId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: true 
  },
  manufacturerName: { type: String, required: true },
  company: { type: String, required: true },
  
  // Array to store names of materials used in combination
  usedMaterials: { 
    type: [String], 
    default: [] 
  },
  // Array to store IDs of materials used in combination
  usedMaterialIds: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: 'PurchasedMaterial',
    default: []
  },
  status: { 
    type: String, 
    enum: ['active', 'sold_out', 'discontinued'], 
    default: 'active' 
  },
  createdAt: { type: Date, default: Date.now }
});

const ManufacturedProduct = mongoose.model('ManufacturedProduct', manufacturedProductSchema);

/* ===================== AUTH MIDDLEWARE ===================== */

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    console.log('❌ No token provided');
    return res.status(401).json({ message: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      console.log('❌ Invalid token:', err.message);
      return res.status(403).json({ message: 'Invalid or expired token' });
    }
    req.user = user;
    console.log('✅ User authenticated:', user.email);
    next();
  });
};

const authorizeRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    console.log(`❌ Access denied for role: ${req.user.role}`);
    return res
      .status(403)
      .json({ message: 'Access denied. Insufficient permissions.' });
  }
  next();
};

/* ===================== API ROUTES ===================== */
const apiRouter = express.Router();

/* --- Auth Routes --- */
apiRouter.post('/auth/register', async (req, res) => {
  try {
    const { name, email, password, company, role } = req.body;
    console.log('📝 Registration attempt:', { name, email, company, role });

    if (!name || !email || !password || !company) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    if (await User.findOne({ email })) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const user = new User({
      name,
      email,
      password,
      company,
      role: role || 'suppliers'
    });

    await user.save();
    console.log('✅ User registered successfully:', email);

    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({ token, user });
  } catch (err) {
    console.error('❌ Registration error:', err);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

apiRouter.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('🔐 Login attempt:', email);

    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      console.log('❌ Invalid credentials for:', email);
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    user.lastLogin = new Date();
    await user.save();

    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log('✅ User logged in successfully:', email);
    res.json({ token, user });
  } catch (err) {
    console.error('❌ Login error:', err);
    res.status(500).json({ message: 'Server error during login' });
  }
});

/* --- Product Routes --- */

// SUPPLIER: Add product with location
apiRouter.post(
  '/products',
  authenticateToken,
  authorizeRole('suppliers'),
  upload.single('image'),
  async (req, res) => {
    try {
      const { name, quantity, price, unit, description, lat, lng, address } = req.body;
      const user = await User.findById(req.user.id);

      console.log('📦 Adding product:', { name, quantity, unit, price, supplierId: user._id });

      if (!req.file) {
        console.log('❌ No image uploaded');
        return res.status(400).json({ message: 'Image is required' });
      }

      // Validate location data
      if (!lat || !lng || !address) {
        return res.status(400).json({ message: 'Location information is required' });
      }

      console.log('📸 Image uploaded to Cloudinary:', req.file.path);

      const product = new Product({
        name,
        description: description || '',
        quantity: parseInt(quantity),
        unit: unit || 'pieces',
        price: parseFloat(price), // Store in INR
        image: req.file.path,
        location: {
          lat: parseFloat(lat),
          lng: parseFloat(lng),
          address: address
        },
        supplierId: user._id,
        supplierName: user.name,
        company: user.company
      });

      await product.save();
      console.log('✅ Product saved to database:', product._id);
      res.status(201).json(product);
    } catch (err) {
      console.error('❌ Error adding product:', err);
      res.status(500).json({ message: 'Error adding product', error: err.message });
    }
  }
);

// SUPPLIER: Get ONLY my materials
apiRouter.get(
  '/products/mine',
  authenticateToken,
  authorizeRole('suppliers'),
  async (req, res) => {
    try {
      console.log('📋 Fetching products for supplier ID:', req.user.id);

      const products = await Product.find({
        supplierId: req.user.id
      }).sort({ createdAt: -1 });

      console.log(`✅ Found ${products.length} products for user ${req.user.email}`);
      res.json(products);
    } catch (err) {
      console.error('❌ Error fetching inventory:', err);
      res.status(500).json({ message: 'Error fetching your inventory', error: err.message });
    }
  }
);

// SUPPLIER: Update material
apiRouter.put(
  '/products/:id',
  authenticateToken,
  authorizeRole('suppliers'),
  upload.single('image'),
  async (req, res) => {
    try {
      const { name, quantity, price, unit, description, lat, lng, address } = req.body;
      const updateData = { 
        name, 
        quantity: parseInt(quantity), 
        unit: unit || 'pieces',
        price: parseFloat(price),
        description: description || ''
      };

      console.log('✏️ Updating product:', req.params.id);

      // Add location if provided
      if (lat && lng && address) {
        updateData.location = {
          lat: parseFloat(lat),
          lng: parseFloat(lng),
          address: address
        };
      }

      if (req.file) {
        updateData.image = req.file.path;
        console.log('📸 Updated image:', req.file.path);
      }

      const product = await Product.findOneAndUpdate(
        { _id: req.params.id, supplierId: req.user.id },
        updateData,
        { new: true }
      );

      if (!product) {
        return res.status(404).json({ message: 'Material not found or unauthorized' });
      }

      console.log('✅ Product updated successfully:', product._id);
      res.json(product);
    } catch (err) {
      console.error('❌ Error updating material:', err);
      res.status(500).json({ message: 'Error updating material', error: err.message });
    }
  }
);

// SUPPLIER: Delete material
apiRouter.delete(
  '/products/:id',
  authenticateToken,
  authorizeRole('suppliers'),
  async (req, res) => {
    try {
      console.log('🗑️ Deleting product:', req.params.id);

      const product = await Product.findOneAndDelete({
        _id: req.params.id,
        supplierId: req.user.id
      });

      if (!product) {
        return res.status(404).json({ message: 'Material not found' });
      }

      console.log('✅ Product deleted successfully');
      res.json({ message: 'Material deleted successfully' });
    } catch (err) {
      console.error('❌ Error deleting material:', err);
      res.status(500).json({ message: 'Error deleting material' });
    }
  }
);

// MANUFACTURER: Get all available materials (raw materials from suppliers)
apiRouter.get(
  '/products/available',
  authenticateToken,
  async (req, res) => {
    try {
      console.log(`\n🔍 [AVAILABLE PRODUCTS] Request from: ${req.user.role} - ${req.user.email} (ID: ${req.user.id})`);
      
      // If user is manufacturer, return raw materials from suppliers
      if (req.user.role === 'manufacturers') {
        console.log(`📦 [STEP 1] Fetching ALL products with quantity > 0`);
        // First, get all products with quantity > 0
        const allProducts = await Product.find({ 
          quantity: { $gt: 0 } 
        }).sort({ createdAt: -1 });
        
        console.log(`✅ Found ${allProducts.length} total products with stock > 0`);
        
        return res.json(allProducts);
      }
      
      // If user is customer, return manufactured products (only visible ones)
      if (req.user.role === 'customers') {
        const products = await ManufacturedProduct.find({
          status: 'active',
          quantity: { $gt: 0 },
          isVisibleToCustomers: true // Only show visible products
        })
        .populate('manufacturerId', 'name company walletAddress email')  // ✅ Include walletAddress
        .sort({ createdAt: -1 });
        console.log(`✅ Customer ${req.user.email}: ${products.length} available visible products`);
        
        return res.json(products);
      }
      
      // For other roles, return empty array
      res.json([]);
    } catch (err) {
      console.error('❌ Error fetching products:', err);
      res.status(500).json({ message: 'Error fetching products', error: err.message });
    }
  }
);

// Get single product detail (for customers)
apiRouter.get(
  '/products/:id/detail',
  authenticateToken,
  async (req, res) => {
    try {
      const product = await ManufacturedProduct.findById(req.params.id);
      
      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }

      // If customer, only allow visible products
      if (req.user.role === 'customers' && !product.isVisibleToCustomers) {
        return res.status(403).json({ message: 'Product not available' });
      }

      res.json(product);
    } catch (err) {
      console.error('❌ Error fetching product detail:', err);
      res.status(500).json({ 
        message: 'Error fetching product detail', 
        error: err.message 
      });
    }
  }
);

// MANUFACTURER: Purchase product (raw material from supplier) with quantity selection
apiRouter.post(
  '/products/buy-raw',
  authenticateToken,
  authorizeRole('manufacturers'),
  async (req, res) => {
    try {
      const { productId, quantity, externalTxHash } = req.body;
      
      console.log(`\n🛒 [PURCHASE ATTEMPT] Manufacturer: ${req.user.email} (ID: ${req.user.id})`);
      console.log(`   Product ID: ${productId}`);
      console.log(`   Quantity: ${quantity}`);
      console.log(`   TX Hash: ${externalTxHash}`);
      
      // Validate required fields
      if (!productId || !externalTxHash || !quantity) {
        return res.status(400).json({ 
          message: 'Product ID, quantity and transaction hash are required' 
        });
      }

      const quantityToBuy = parseInt(quantity);
      if (quantityToBuy <= 0) {
        return res.status(400).json({ 
          message: 'Quantity must be greater than 0' 
        });
      }

      // Find product
      const product = await Product.findById(productId);
      if (!product) {
        console.log(`❌ Product not found: ${productId}`);
        return res.status(404).json({ message: 'Product not found' });
      }

      console.log(`✅ Found product: "${product.name}" (ID: ${product._id})`);
      console.log(`📊 Available quantity: ${product.quantity}`);
      
      // Check stock
      if (product.quantity < quantityToBuy) {
        console.log(`❌ Insufficient stock: ${product.quantity} available, ${quantityToBuy} requested`);
        return res.status(400).json({ 
          message: `Insufficient stock. Only ${product.quantity} units available` 
        });
      }


      // Find buyer
      const buyer = await User.findById(req.user.id);
      if (!buyer) {
        console.log(`❌ Buyer not found: ${req.user.id}`);
        return res.status(404).json({ message: 'Buyer not found' });
      }

      // Find seller
      const seller = await User.findById(product.supplierId);
      if (!seller) {
        console.log(`❌ Seller not found: ${product.supplierId}`);
        return res.status(404).json({ message: 'Seller not found' });
      }

      console.log(`✅ Buyer: ${buyer.email}, Seller: ${seller.email}`);
      
      // Update product quantity (reduce by purchased quantity)
      const originalQuantity = product.quantity;
      product.quantity -= quantityToBuy;
      await product.save();
      console.log(`📊 Updated product quantity: ${originalQuantity} -> ${product.quantity}`);

      // Calculate total amount in INR
      const totalAmount = product.price * quantityToBuy;

      // Create transaction record
      const transaction = new Transaction({
        productId: product._id,
        productName: product.name,
        buyerId: buyer._id,
        buyerName: buyer.name,
        sellerId: seller._id,
        sellerName: seller.name,
        quantity: quantityToBuy,
        amount: totalAmount,
        txHash: externalTxHash,
        status: 'completed'
      });

      await transaction.save();
      console.log(`✅ Transaction saved: ${transaction._id}`);

      // Create purchased material record for this manufacturer
      await PurchasedMaterial.create({
        productId: product._id,
        originalProductId: product._id,
        productName: product.name,
        manufacturerId: buyer._id,
        manufacturerName: buyer.name,
        supplierId: seller._id,
        supplierName: seller.name,
        quantity: quantityToBuy,
        price: product.price, // Price per unit in INR
        image: product.image,
        location: product.location, // Copy location from original product
        txHash: externalTxHash,
        status: 'available',
        purchasedAt: new Date()
      });
      console.log(`✅ PurchasedMaterial record created`);


      console.log('🎉 PURCHASE COMPLETE:', {
        product: product.name,
        quantity: quantityToBuy,
        pricePerUnit: product.price,
        totalAmount: totalAmount,
        buyer: buyer.email,
        seller: seller.email,
        txHash: externalTxHash,
        remainingStock: product.quantity
      });

      // Return success response
      res.status(200).json({
        message: 'Purchase successful',
        transaction: transaction,
        purchasedQuantity: quantityToBuy,
        remainingStock: product.quantity,
        productId: product._id
      });

    } catch (err) {
      console.error('❌ Purchase error:', err);
      res.status(500).json({ 
        message: 'Error processing purchase', 
        error: err.message 
      });
    }
  }
);

/* --- Supplier Routes --- */

// SUPPLIER: Get purchased materials (materials that have been sold to manufacturers)
apiRouter.get(
  '/supplier/purchased-materials',
  authenticateToken,
  authorizeRole('suppliers'),
  async (req, res) => {
    try {
      console.log(`📦 Fetching purchased materials for supplier: ${req.user.email} (ID: ${req.user.id})`);
      
      // Find all purchased materials where this supplier is the original seller
      const purchasedMaterials = await PurchasedMaterial.find({ 
        supplierId: req.user.id
      }).sort({ purchasedAt: -1 });
      
      console.log(`✅ Found ${purchasedMaterials.length} purchased materials for supplier ${req.user.email}`);
      
      res.json(purchasedMaterials);
    } catch (err) {
      console.error('❌ Error fetching purchased materials:', err);
      res.status(500).json({ 
        message: 'Error fetching purchased materials', 
        error: err.message 
      });
    }
  }
);

// SUPPLIER: Get payment receipts (transactions where supplier sold materials)
apiRouter.get(
  '/supplier/receipts',
  authenticateToken,
  authorizeRole('suppliers'),
  async (req, res) => {
    try {
      console.log(`🧾 Fetching payment receipts for supplier: ${req.user.email} (ID: ${req.user.id})`);
      
      // Find all transactions where this supplier is the seller
      const receipts = await Transaction.find({ 
        sellerId: req.user.id,
        status: 'completed'
      }).sort({ timestamp: -1 });
      
      console.log(`✅ Found ${receipts.length} payment receipts for supplier ${req.user.email}`);
      
      res.json(receipts);
    } catch (err) {
      console.error('❌ Error fetching payment receipts:', err);
      res.status(500).json({ 
        message: 'Error fetching payment receipts', 
        error: err.message 
      });
    }
  }
);

// SUPPLIER: Delete a payment receipt
apiRouter.delete(
  '/supplier/receipts/:receiptId',
  authenticateToken,
  authorizeRole('suppliers'),
  async (req, res) => {
    try {
      const { receiptId } = req.params;
      
      console.log(`🗑️ Delete receipt request: ${receiptId} by supplier ${req.user.email} (ID: ${req.user.id})`);

      // Validate ObjectId format
      if (!mongoose.Types.ObjectId.isValid(receiptId)) {
        console.log(`❌ Invalid ObjectId format: ${receiptId}`);
        return res.status(400).json({ 
          message: 'Invalid receipt ID format' 
        });
      }

      // Find the receipt and verify it belongs to this supplier
      const receipt = await Transaction.findOne({
        _id: receiptId,
        sellerId: req.user.id
      });

      if (!receipt) {
        return res.status(404).json({ 
          message: 'Receipt not found or unauthorized' 
        });
      }

      // Delete the receipt
      await Transaction.deleteOne({ _id: receiptId });

      console.log(`✅ Receipt deleted: ${receiptId} by supplier ${req.user.email}`);

      res.json({ 
        message: 'Receipt deleted successfully',
        receiptId 
      });

    } catch (err) {
      console.error('❌ Error deleting receipt:', err);
      res.status(500).json({ 
        message: 'Error deleting receipt', 
        error: err.message 
      });
    }
  }
);

/* --- Manufacturer Routes --- */

// MANUFACTURER: Get purchased materials
apiRouter.get(
  '/manufacturer/purchased-materials',
  authenticateToken,
  authorizeRole('manufacturers'),
  async (req, res) => {
    try {
      const purchasedMaterials = await PurchasedMaterial.find({ 
        manufacturerId: req.user.id
      }).sort({ purchasedAt: -1 });
      
      console.log(`📦 Purchased materials for ${req.user.email}: ${purchasedMaterials.length} items`);
      
      res.json(purchasedMaterials);
    } catch (err) {
      console.error('❌ Error fetching purchased materials:', err);
      res.status(500).json({ message: 'Error fetching purchased materials', error: err.message });
    }
  }
);

// MANUFACTURER: Get bought materials (same as purchased materials, different naming)
apiRouter.get(
  '/manufacturer/bought-materials',
  authenticateToken,
  authorizeRole('manufacturers'),
  async (req, res) => {
    try {
      const boughtMaterials = await PurchasedMaterial.find({ 
        manufacturerId: req.user.id
      }).sort({ purchasedAt: -1 });
      
      console.log(`📦 Bought materials for ${req.user.email}: ${boughtMaterials.length} items`);
      
      res.json(boughtMaterials);
    } catch (err) {
      console.error('❌ Error fetching bought materials:', err);
      res.status(500).json({ message: 'Error fetching bought materials', error: err.message });
    }
  }
);

// MANUFACTURER: Get purchase history (raw materials bought)
apiRouter.get(
  '/manufacturer/purchases',
  authenticateToken,
  authorizeRole('manufacturers'),
  async (req, res) => {
    try {
      const purchases = await Transaction.find({ buyerId: req.user.id })
        .sort({ timestamp: -1 })
        .populate('productId', 'name image');
      
      console.log(`📜 Purchase history for ${req.user.email}: ${purchases.length} transactions`);
      
      res.json(purchases);
    } catch (err) {
      console.error('❌ Error fetching purchases:', err);
      res.status(500).json({ message: 'Error fetching purchase history', error: err.message });
    }
  }
);

// MANUFACTURER: Create a new product from purchased material (with image upload) - UPDATED
apiRouter.post(
  '/manufacturer/create-product',
  authenticateToken,
  authorizeRole('manufacturers'),
  upload.single('image'),
  async (req, res) => {
    try {
      const { materialId, name, description, price, quantity } = req.body;
      
      console.log('🏭 Create product request:', {
        materialId,
        name,
        quantity,
        price,
        manufacturer: req.user.email,
        hasImage: !!req.file
      });

      if (!materialId || !name || !description || !price || !quantity) {
        return res.status(400).json({ 
          message: 'All fields are required' 
        });
      }

      if (!req.file) {
        return res.status(400).json({ message: 'Product image is required' });
      }

      // Verify the material belongs to this manufacturer
      const material = await PurchasedMaterial.findOne({
        _id: materialId,
        manufacturerId: req.user.id,
        status: 'available'
      });

      if (!material) {
        return res.status(404).json({ 
          message: 'Material not found, unauthorized, or already used' 
        });
      }

      // Get manufacturer details
      const manufacturer = await User.findById(req.user.id);
      if (!manufacturer) {
        return res.status(404).json({ message: 'Manufacturer not found' });
      }

      // Handle location with better validation
      let location = material.location;
      
      if (!location || 
          location.lat === undefined || 
          location.lng === undefined || 
          !location.address) {
        console.warn('⚠️ Material has incomplete location, using defaults:', location);
        location = {
          lat: 0,
          lng: 0,
          address: 'Location not specified'
        };
      }

      // Update purchased material status to used
      material.status = 'used';
      await material.save();

      // Generate tx hash
      const txHash = `0x${Date.now().toString(16)}${Math.random().toString(16).substr(2, 8)}`;

      const product = new ManufacturedProduct({
        name,
        description,
        price: parseFloat(price),
        quantity: parseInt(quantity),
        image: req.file.path,
        location: {
          lat: parseFloat(location.lat),
          lng: parseFloat(location.lng),
          address: location.address.toString()
        },
        materialId: material._id,
        manufacturerId: manufacturer._id,
        manufacturerName: manufacturer.name,
        company: manufacturer.company,
        txHash: txHash,
        status: 'active'
      });

      await product.save();

      console.log('✅ Product created:', {
        productId: product._id,
        name: product.name,
        manufacturer: manufacturer.email,
        fromMaterial: material.productName
      });

      res.status(201).json(product);
    } catch (err) {
      console.error('❌ Error creating product:', err);
      console.error('❌ Error stack:', err.stack);
      res.status(500).json({ 
        message: 'Error creating product', 
        error: err.message,
        details: process.env.NODE_ENV === 'development' ? err.stack : undefined
      });
    }
  }
);

// MANUFACTURER: Create a new product from purchased material
apiRouter.post(
  '/manufacturer/products',
  authenticateToken,
  authorizeRole('manufacturers'),
  async (req, res) => {
    try {
      const { materialId, name, description, price, quantity, externalTxHash } = req.body;
      
      if (!materialId || !name || !description || !price || !quantity || !externalTxHash) {
        return res.status(400).json({ 
          message: 'All fields including transaction hash are required' 
        });
      }

      // Verify the material belongs to this manufacturer
      const material = await PurchasedMaterial.findOne({
        _id: materialId,
        manufacturerId: req.user.id,
        status: 'available'
      });

      if (!material) {
        return res.status(404).json({ 
          message: 'Material not found or unauthorized' 
        });
      }

      // Update purchased material status to used
      material.status = 'used';
      await material.save();

      const manufacturer = await User.findById(req.user.id);

      const product = new ManufacturedProduct({
        name,
        description,
        price: parseFloat(price),
        quantity: parseInt(quantity),
        image: material.image,
        location: material.location, // Copy location from purchased material
        materialId: material._id,
        manufacturerId: manufacturer._id,
        manufacturerName: manufacturer.name,
        company: manufacturer.company,
        txHash: externalTxHash,
        status: 'active'
      });

      await product.save();

      console.log('✅ Product created:', {
        name,
        manufacturer: manufacturer.email,
        txHash: externalTxHash
      });

      res.status(201).json({
        message: 'Product created successfully',
        product: product
      });

    } catch (err) {
      console.error('❌ Product creation error:', err);
      res.status(500).json({ 
        message: 'Error creating product', 
        error: err.message 
      });
    }
  }
);

// Get all products for a manufacturer
apiRouter.get(
  '/manufacturer/products',
  authenticateToken,
  authorizeRole('manufacturers'),
  async (req, res) => {
    try {
      const products = await ManufacturedProduct.find({
        manufacturerId: req.user.id
      }).sort({ createdAt: -1 });

      res.json(products);
    } catch (err) {
      console.error('❌ Error fetching products:', err);
      res.status(500).json({ 
        message: 'Error fetching products', 
        error: err.message 
      });
    }
  }
);

// Update a product
apiRouter.put(
  '/manufacturer/products/:id',
  authenticateToken,
  authorizeRole('manufacturers'),
  async (req, res) => {
    try {
      const { name, description, price, quantity } = req.body;
      
      const product = await ManufacturedProduct.findOneAndUpdate(
        { 
          _id: req.params.id,
          manufacturerId: req.user.id 
        },
        { 
          name, 
          description, 
          price: parseFloat(price), 
          quantity: parseInt(quantity) 
        },
        { new: true }
      );

      if (!product) {
        return res.status(404).json({ 
          message: 'Product not found or unauthorized' 
        });
      }

      res.json(product);
    } catch (err) {
      console.error('❌ Error updating product:', err);
      res.status(500).json({ 
        message: 'Error updating product', 
        error: err.message 
      });
    }
  }
);

// Delete a product
apiRouter.delete(
  '/manufacturer/products/:id',
  authenticateToken,
  authorizeRole('manufacturers'),
  async (req, res) => {
    try {
      const product = await ManufacturedProduct.findOneAndDelete({
        _id: req.params.id,
        manufacturerId: req.user.id
      });

      if (!product) {
        return res.status(404).json({ 
          message: 'Product not found or unauthorized' 
        });
      }

      res.json({ message: 'Product deleted successfully' });
    } catch (err) {
      console.error('❌ Error deleting product:', err);
      res.status(500).json({ 
        message: 'Error deleting product', 
        error: err.message 
      });
    }
  }
);

// Toggle product visibility for customers
apiRouter.patch(
  '/manufacturer/products/:id/toggle-visibility',
  authenticateToken,
  authorizeRole('manufacturers'),
  async (req, res) => {
    try {
      const product = await ManufacturedProduct.findOne({
        _id: req.params.id,
        manufacturerId: req.user.id
      });

      if (!product) {
        return res.status(404).json({ 
          message: 'Product not found or unauthorized' 
        });
      }

      product.isVisibleToCustomers = !product.isVisibleToCustomers;
      await product.save();

      res.json({ 
        message: `Product ${product.isVisibleToCustomers ? 'shown' : 'hidden'} on customer page`,
        product 
      });
    } catch (err) {
      console.error('❌ Error toggling visibility:', err);
      res.status(500).json({ 
        message: 'Error toggling visibility', 
        error: err.message 
      });
    }
  }
);

// Update product details (including gallery, specifications, etc.)
apiRouter.patch(
  '/manufacturer/products/:id/details',
  authenticateToken,
  authorizeRole('manufacturers'),
  upload.array('galleryImages', 5), // Allow up to 5 additional images
  async (req, res) => {
    try {
      const product = await ManufacturedProduct.findOne({
        _id: req.params.id,
        manufacturerId: req.user.id
      });

      if (!product) {
        return res.status(404).json({ 
          message: 'Product not found or unauthorized' 
        });
      }

      // Update basic fields if provided
      if (req.body.name) product.name = req.body.name;
      if (req.body.description) product.description = req.body.description;
      if (req.body.price) product.price = parseFloat(req.body.price);
      if (req.body.quantity) product.quantity = parseInt(req.body.quantity);

      // Update product details
      if (req.body.productDetails) {
        const details = typeof req.body.productDetails === 'string' 
          ? JSON.parse(req.body.productDetails) 
          : req.body.productDetails;
        
        product.productDetails = {
          ...product.productDetails,
          ...details
        };
      }

      // Update discount if provided
      if (req.body.discount) {
        const discount = typeof req.body.discount === 'string' 
          ? JSON.parse(req.body.discount) 
          : req.body.discount;
        
        product.discount = discount;
      }

      // Add gallery images if uploaded
      if (req.files && req.files.length > 0) {
        const newImages = req.files.map(file => file.path);
        product.galleryImages = [...product.galleryImages, ...newImages];
      }

      await product.save();

      res.json({ 
        message: 'Product details updated successfully',
        product 
      });
    } catch (err) {
      console.error('❌ Error updating product details:', err);
      res.status(500).json({ 
        message: 'Error updating product details', 
        error: err.message 
      });
    }
  }
);

// Remove gallery image
apiRouter.delete(
  '/manufacturer/products/:id/gallery/:imageIndex',
  authenticateToken,
  authorizeRole('manufacturers'),
  async (req, res) => {
    try {
      const product = await ManufacturedProduct.findOne({
        _id: req.params.id,
        manufacturerId: req.user.id
      });

      if (!product) {
        return res.status(404).json({ 
          message: 'Product not found or unauthorized' 
        });
      }

      const imageIndex = parseInt(req.params.imageIndex);
      if (imageIndex < 0 || imageIndex >= product.galleryImages.length) {
        return res.status(400).json({ message: 'Invalid image index' });
      }

      product.galleryImages.splice(imageIndex, 1);
      await product.save();

      res.json({ 
        message: 'Gallery image removed successfully',
        product 
      });
    } catch (err) {
      console.error('❌ Error removing gallery image:', err);
      res.status(500).json({ 
        message: 'Error removing gallery image', 
        error: err.message 
      });
    }
  }
);

// CUSTOMER: Purchase manufactured product
apiRouter.post(
  '/products/buy-final',
  authenticateToken,
  authorizeRole('customers'),
  async (req, res) => {
    try {
      const { productId, quantity, externalTxHash } = req.body;
      
      if (!productId || !externalTxHash || !quantity) {
        return res.status(400).json({ 
          message: 'Product ID, quantity and transaction hash are required' 
        });
      }

      const quantityToBuy = parseInt(quantity);

      // Find product (manufactured product)
      const product = await ManufacturedProduct.findById(productId);
      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }

      // Check stock
      if (product.quantity < quantityToBuy) {
        return res.status(400).json({ 
          message: `Insufficient stock. Only ${product.quantity} units available` 
        });
      }

      // Find buyer (customer)
      const buyer = await User.findById(req.user.id);
      if (!buyer) {
        return res.status(404).json({ message: 'Buyer not found' });
      }

      // Find seller (manufacturer)
      const seller = await User.findById(product.manufacturerId);
      if (!seller) {
        return res.status(404).json({ message: 'Manufacturer not found' });
      }

      // Update product quantity
      product.quantity -= quantityToBuy;
      if (product.quantity === 0) {
        product.status = 'sold_out';
      }
      await product.save();

      // Calculate total amount in INR
      const totalAmount = product.price * quantityToBuy;

      // Create customer transaction record
      const customerTransaction = new Transaction({
        productId: product._id,
        productName: product.name,
        buyerId: buyer._id,
        buyerName: buyer.name,
        sellerId: seller._id,
        sellerName: seller.name,
        quantity: quantityToBuy,
        amount: totalAmount,
        txHash: externalTxHash,
        status: 'completed'
      });

      await customerTransaction.save();

      console.log('✅ Customer purchase recorded:', {
        product: product.name,
        quantity: quantityToBuy,
        totalAmount: totalAmount,
        buyer: buyer.email,
        seller: seller.email,
        txHash: externalTxHash
      });

      res.status(200).json({
        message: 'Purchase successful',
        transaction: customerTransaction,
        purchasedQuantity: quantityToBuy,
        remainingStock: product.quantity
      });

    } catch (err) {
      console.error('❌ Purchase error:', err);
      res.status(500).json({ 
        message: 'Error processing purchase', 
        error: err.message 
      });
    }
  }
);

// CUSTOMER: Get purchase history
apiRouter.get(
  '/customer/purchases',
  authenticateToken,
  authorizeRole('customers'),
  async (req, res) => {
    try {
      console.log(`📋 Fetching purchases for customer: ${req.user.email} (ID: ${req.user.id})`);
      
      const purchases = await Transaction.find({ buyerId: req.user.id })
        .sort({ timestamp: -1 });
      
      console.log(`✅ Found ${purchases.length} purchases for customer ${req.user.email}`);
      
      res.json(purchases);
    } catch (err) {
      console.error('❌ Error fetching customer purchases:', err);
      res.status(500).json({ 
        message: 'Error fetching purchase history', 
        error: err.message 
      });
    }
  }
); 

// DELETE a purchase from customer history
apiRouter.delete(
  '/customer/purchases/:purchaseId',
  authenticateToken,
  authorizeRole('customers'),
  async (req, res) => {
    try {
      const { purchaseId } = req.params;
      
      console.log(`🗑️ Delete request for purchase: ${purchaseId} by user ${req.user.email} (ID: ${req.user.id})`);

      // Validate ObjectId format
      if (!mongoose.Types.ObjectId.isValid(purchaseId)) {
        console.log(`❌ Invalid ObjectId format: ${purchaseId}`);
        return res.status(400).json({ 
          message: 'Invalid purchase ID format' 
        });
      }

      // Find the purchase and verify it belongs to this customer
      const purchase = await Transaction.findOne({
        _id: purchaseId,
        buyerId: req.user.id
      });

      if (!purchase) {
        return res.status(404).json({ 
          message: 'Purchase not found or unauthorized' 
        });
      }

      // Delete the purchase
      await Transaction.deleteOne({ _id: purchaseId });

      console.log(`✅ Purchase deleted: ${purchaseId} by customer ${req.user.email}`);

      res.json({ 
        message: 'Purchase deleted successfully',
        purchaseId 
      });

    } catch (err) {
      console.error('❌ Error deleting purchase:', err);
      res.status(500).json({ 
        message: 'Error deleting purchase', 
        error: err.message 
      });
    }
  }
);

// MANUFACTURER: Manufacture product from combined materials (2-3 materials) - COMPLETELY UPDATED
apiRouter.post(
  '/manufacturer/manufacture-combined',
  authenticateToken,
  authorizeRole('manufacturers'),
  upload.single('image'),
  async (req, res) => {
    try {
      console.log('🔍 STARTING COMBINED MANUFACTURING PROCESS');
      console.log('📦 Request body:', req.body);
      console.log('🖼️ File uploaded:', req.file ? `Yes - ${req.file.originalname}` : 'No');
      console.log('👤 User:', req.user.email, 'ID:', req.user.id);
      
      const { name, description, quantity, price, materialIds } = req.body;
      
      // Validate required fields
      if (!name || !description || !quantity || !price || !materialIds) {
        console.log('❌ Missing required fields:', { 
          name: !!name, 
          description: !!description, 
          quantity: !!quantity, 
          price: !!price, 
          materialIds: !!materialIds 
        });
        return res.status(400).json({ 
          message: 'All fields are required including material IDs',
          required: ['name', 'description', 'quantity', 'price', 'materialIds']
        });
      }

      // Validate image
      if (!req.file) {
        console.log('❌ No image file provided');
        return res.status(400).json({ 
          message: 'Product image is required' 
        });
      }

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(req.file.mimetype)) {
        console.log('❌ Invalid file type:', req.file.mimetype);
        return res.status(400).json({ 
          message: 'Only JPEG, PNG and WebP images are allowed' 
        });
      }

      // Parse material IDs
      let parsedMaterialIds;
      try {
        parsedMaterialIds = JSON.parse(materialIds);
        console.log('✅ Parsed material IDs:', parsedMaterialIds);
      } catch (parseError) {
        console.log('❌ Error parsing materialIds:', parseError);
        return res.status(400).json({ 
          message: 'Invalid material IDs format. Should be a JSON array.' 
        });
      }
      
      // Validate number of materials
      if (!Array.isArray(parsedMaterialIds)) {
        console.log('❌ materialIds is not an array:', typeof parsedMaterialIds);
        return res.status(400).json({ 
          message: 'Material IDs must be an array' 
        });
      }
      
      if (parsedMaterialIds.length < 2 || parsedMaterialIds.length > 3) {
        console.log('❌ Invalid number of materials:', parsedMaterialIds.length);
        return res.status(400).json({ 
          message: 'You must select 2-3 materials to combine' 
        });
      }

      // Find all selected materials
      console.log('🔍 Looking for materials with IDs:', parsedMaterialIds);
      const materials = await PurchasedMaterial.find({
        _id: { $in: parsedMaterialIds },
        manufacturerId: req.user.id,
        status: 'available'
      });

      console.log(`✅ Found ${materials.length} materials out of ${parsedMaterialIds.length} requested`);

      // Check if all materials were found
      if (materials.length !== parsedMaterialIds.length) {
        const foundIds = materials.map(m => m._id.toString());
        const missingIds = parsedMaterialIds.filter(id => !foundIds.includes(id));
        console.log('❌ Missing materials IDs:', missingIds);
        
        return res.status(404).json({ 
          message: 'Some materials not found or already used',
          missingIds: missingIds
        });
      }

      // Log found materials
      materials.forEach((material, index) => {
        console.log(`📦 Material ${index + 1}:`, {
          id: material._id,
          name: material.productName,
          status: material.status,
          hasLocation: !!material.location,
          location: material.location
        });
      });

      // Get manufacturer details
      const manufacturer = await User.findById(req.user.id);
      if (!manufacturer) {
        console.log('❌ Manufacturer not found:', req.user.id);
        return res.status(404).json({ message: 'Manufacturer not found' });
      }
      console.log('✅ Manufacturer found:', manufacturer.email);

      // Find location from materials
      let location = {
        lat: 28.6139,  // Default to Delhi coordinates
        lng: 77.2090,
        address: 'Default location'
      };

      // Try to get location from first material with valid location
      for (const material of materials) {
        if (material.location && 
            material.location.lat !== undefined && 
            material.location.lng !== undefined && 
            material.location.address) {
          
          console.log('📍 Found valid location in material:', material.productName);
          location = {
            lat: Number(material.location.lat) || 28.6139,
            lng: Number(material.location.lng) || 77.2090,
            address: String(material.location.address) || 'Default location'
          };
          break;
        }
      }
      
      console.log('✅ Using location:', location);

      // Validate numeric inputs
      const parsedQuantity = parseInt(quantity);
      const parsedPrice = parseFloat(price);
      
      if (isNaN(parsedQuantity) || parsedQuantity <= 0) {
        return res.status(400).json({ 
          message: 'Quantity must be a positive number' 
        });
      }
      
      if (isNaN(parsedPrice) || parsedPrice <= 0) {
        return res.status(400).json({ 
          message: 'Price must be a positive number' 
        });
      }

      // Generate a unique transaction hash
      const txHash = `0x${Date.now().toString(16)}${Math.random().toString(16).substr(2, 8)}`;
      console.log('🔗 Generated transaction hash:', txHash);

      // Create manufactured product
      const manufacturedProduct = new ManufacturedProduct({
        name: String(name),
        description: String(description),
        price: parsedPrice,
        quantity: parsedQuantity,
        image: req.file.path, // Cloudinary URL
        location: {
          lat: location.lat,
          lng: location.lng,
          address: location.address
        },
        materialId: materials[0]._id, // Reference to first material (for compatibility)
        manufacturerId: manufacturer._id,
        manufacturerName: manufacturer.name,
        company: manufacturer.company,
        status: 'active',
        usedMaterials: materials.map(m => m.productName),
        usedMaterialIds: materials.map(m => m._id) // Store all material IDs

      });

      console.log('💾 Saving manufactured product to database...');
      await manufacturedProduct.save();
      console.log('✅ Manufactured product saved:', manufacturedProduct._id);

      // Mark all used materials as 'used'
      console.log('🔄 Updating material status to "used"...');
      await PurchasedMaterial.updateMany(
        { _id: { $in: parsedMaterialIds } },
        { $set: { status: 'used' } }
      );
      console.log('✅ Materials marked as used');

      console.log('🎉 COMBINED MANUFACTURING COMPLETE!');
      console.log('📊 Summary:', {
        productId: manufacturedProduct._id,
        productName: manufacturedProduct.name,
        materialsUsed: materials.map(m => m.productName),
        manufacturer: manufacturer.email,
        quantity: manufacturedProduct.quantity,
        price: manufacturedProduct.price,
        location: manufacturedProduct.location
      });

      res.status(201).json({
        message: 'Product manufactured successfully from combined materials',
        product: manufacturedProduct,
        materialsUsed: materials.map(m => ({
          id: m._id,
          name: m.productName
        }))
      });

    } catch (err) {
      console.error('❌ COMBINED MANUFACTURING ERROR:', err);
      console.error('❌ Error name:', err.name);
      console.error('❌ Error message:', err.message);
      console.error('❌ Error stack:', err.stack);
      console.error('❌ Request details:', {
        body: req.body,
        file: req.file,
        user: req.user,
        timestamp: new Date().toISOString()
      });
      
      res.status(500).json({ 
        message: 'Error manufacturing combined product',
        error: err.message,
        errorType: err.name,
        details: process.env.NODE_ENV === 'development' ? err.stack : undefined,
        timestamp: new Date().toISOString()
      });
    }
  }
);

/* --- Admin Routes --- */
apiRouter.get(
  '/admin/users',
  authenticateToken,
  authorizeRole('admin'),
  async (req, res) => {
    try {
      const users = await User.find().select('-password');
      res.json({ users });
    } catch (err) {
      res.status(500).json({ message: 'Error fetching users' });
    }
  }
);

apiRouter.get(
  '/admin/stats',
  authenticateToken,
  authorizeRole('admin'),
  async (req, res) => {
    try {
      const totalUsers = await User.countDocuments();
      const activeUsers = await User.countDocuments({ isActive: true });
      const usersByRole = await User.aggregate([
        { $group: { _id: '$role', count: { $sum: 1 } } }
      ]);

      res.json({
        totalUsers,
        activeUsers,
        inactiveUsers: totalUsers - activeUsers,
        usersByRole
      });
    } catch (err) {
      res.status(500).json({ message: 'Error fetching stats' });
    }
  }
);

/* ===================== WALLET ROUTES ===================== */

// GET user's wallet address
apiRouter.get('/users/:userId/wallet', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    
    console.log(`🔍 Fetching wallet for user: ${userId}`);
    
    const user = await User.findById(userId).select('walletAddress name role company');
    
    if (!user) {
      console.log(`❌ User not found: ${userId}`);
      return res.status(404).json({ 
        message: 'User not found',
        walletAddress: null 
      });
    }
    
    console.log(`✅ User found: ${user.name}, wallet: ${user.walletAddress || 'not set'}`);
    
    res.json({ 
      walletAddress: user.walletAddress || null,
      name: user.name,
      role: user.role,
      company: user.company
    });
    
  } catch (err) {
    console.error('❌ Error fetching user wallet:', err);
    res.status(500).json({ 
      message: 'Server error',
      error: err.message 
    });
  }
});

// UPDATE user's wallet address
apiRouter.put('/users/wallet', authenticateToken, async (req, res) => {
  try {
    const { walletAddress } = req.body;
    
    console.log(`💳 Updating wallet for user: ${req.user.id}`);
    console.log(`💳 New wallet address: ${walletAddress}`);
    
    // Validate
    if (!walletAddress) {
      return res.status(400).json({ message: 'Wallet address is required' });
    }
    
    if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return res.status(400).json({ message: 'Invalid Ethereum wallet address format' });
    }
    
    if (walletAddress === '0x0000000000000000000000000000000000000000') {
      return res.status(400).json({ message: 'Cannot use burn address as wallet' });
    }
    
    // Update
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { walletAddress },
      { new: true }
    ).select('walletAddress name role company');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    console.log(`✅ Wallet updated for ${user.name}: ${walletAddress}`);
    
    res.json({ 
      message: 'Wallet address saved successfully',
      walletAddress: user.walletAddress,
      user: {
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

// Catch-all for undefined routes
app.use('*', (req, res) => {
  console.log(`❌ Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method,
    message: `The route ${req.originalUrl} does not exist on this server`
  });
});

// Global error handler
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

module.exports = app;