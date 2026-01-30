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
  quantity: { type: Number, required: true },
  price: { type: Number, required: true },
  image: { type: String, required: true },

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
  price: { type: Number, required: true },
  image: { type: String, required: true },
  txHash: { type: String, required: true, unique: true },
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
  materialId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Transaction',
    required: true 
  },
  manufacturerId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: true 
  },
  manufacturerName: { type: String, required: true },
  company: { type: String, required: true },
  txHash: { type: String, required: true, unique: true },
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
// Create a router for all /api endpoints to ensure consistent routing
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

// SUPPLIER: Add product
apiRouter.post(
  '/products',
  authenticateToken,
  authorizeRole('suppliers'),
  upload.single('image'),
  async (req, res) => {
    try {
      const { name, quantity, price } = req.body;
      const user = await User.findById(req.user.id);

      console.log('📦 Adding product:', { name, quantity, price, supplierId: user._id });

      if (!req.file) {
        console.log('❌ No image uploaded');
        return res.status(400).json({ message: 'Image is required' });
      }

      const product = new Product({
        name,
        quantity,
        price,
        image: req.file.path,
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
      const { name, quantity, price } = req.body;
      const updateData = { name, quantity, price };

      console.log('✏️ Updating product:', req.params.id);

      if (req.file) updateData.image = req.file.path;

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
// FIXED VERSION: Filter out materials the manufacturer has already purchased
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
        
        console.log(`📜 [STEP 2] Fetching transactions for manufacturer ID: ${req.user.id}`);
        // Get all transactions for this manufacturer
        const manufacturerTransactions = await Transaction.find({ 
          buyerId: req.user.id,
          status: 'completed'
        });
        
        console.log(`✅ Manufacturer has ${manufacturerTransactions.length} completed transactions`);
        
        // Log all transactions for debugging
        manufacturerTransactions.forEach((tx, index) => {
          console.log(`   Transaction ${index + 1}: Product ID: ${tx.productId}, Name: "${tx.productName}"`);
        });
        
        // Create a Set of product IDs that the manufacturer has already purchased
        const purchasedProductIds = new Set();
        manufacturerTransactions.forEach(transaction => {
          if (transaction.productId) {
            const productIdStr = transaction.productId.toString();
            purchasedProductIds.add(productIdStr);
            console.log(`   Added to purchased set: ${productIdStr}`);
          }
        });
        
        console.log(`🛒 Purchased product IDs (${purchasedProductIds.size}):`, Array.from(purchasedProductIds));
        
        console.log(`⚡ [STEP 3] Filtering products...`);
        // Filter out products that the manufacturer has already purchased
        const filteredProducts = [];
        const removedProducts = [];
        
        allProducts.forEach(product => {
          const productIdStr = product._id.toString();
          if (purchasedProductIds.has(productIdStr)) {
            removedProducts.push({
              id: productIdStr,
              name: product.name,
              reason: 'Already purchased'
            });
          } else {
            filteredProducts.push(product);
          }
        });
        
        console.log(`✅ FILTERING RESULTS:`);
        console.log(`   Total products in system: ${allProducts.length}`);
        console.log(`   Products removed (already purchased): ${removedProducts.length}`);
        console.log(`   Products available for purchase: ${filteredProducts.length}`);
        
        if (removedProducts.length > 0) {
          console.log(`   Removed products:`);
          removedProducts.forEach(p => console.log(`     - ${p.name} (ID: ${p.id})`));
        }
        
        console.log(`   Available products:`);
        filteredProducts.forEach(p => console.log(`     - ${p.name} (ID: ${p._id})`));
        
        return res.json(filteredProducts);
      }
      
      // If user is customer, return manufactured products
      if (req.user.role === 'customers') {
        const products = await ManufacturedProduct.find({
          status: 'active',
          quantity: { $gt: 0 }
        }).sort({ createdAt: -1 });
        console.log(`✅ Customer ${req.user.email}: ${products.length} available products`);
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

// MANUFACTURER: Purchase product (raw material from supplier)
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
      if (!productId || !externalTxHash) {
        return res.status(400).json({ 
          message: 'Product ID and transaction hash are required' 
        });
      }

      // Find product
      const product = await Product.findById(productId);
      if (!product) {
        console.log(`❌ Product not found: ${productId}`);
        return res.status(404).json({ message: 'Product not found' });
      }

      console.log(`✅ Found product: "${product.name}" (ID: ${product._id})`);
      
      // Check stock
      if (product.quantity < quantity) {
        console.log(`❌ Insufficient stock: ${product.quantity} available, ${quantity} requested`);
        return res.status(400).json({ message: 'Insufficient stock' });
      }

      // Check if manufacturer has already purchased this product
      console.log(`🔍 Checking for existing purchase of product ${product._id} by manufacturer ${req.user.id}`);
      const existingPurchase = await Transaction.findOne({
        buyerId: req.user.id,
        productId: product._id,
        status: 'completed'
      });
      
      if (existingPurchase) {
        console.log(`❌ Manufacturer already purchased this product on ${existingPurchase.timestamp}`);
        return res.status(400).json({ 
          message: 'You have already purchased this material' 
        });
      }
      console.log(`✅ No existing purchase found, proceeding...`);

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
      
      // Update product quantity
      console.log(`📊 Updating product quantity: ${product.quantity} -> ${product.quantity - quantity}`);
      product.quantity -= quantity;
      await product.save();

      // Create transaction record
      const transaction = new Transaction({
        productId: product._id,
        productName: product.name,
        buyerId: buyer._id,
        buyerName: buyer.name,
        sellerId: seller._id,
        sellerName: seller.name,
        quantity: quantity,
        amount: product.price * quantity,
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
        quantity: quantity,
        price: product.price,
        image: product.image,
        txHash: externalTxHash,
        status: 'available',
        purchasedAt: new Date()
      });
      console.log(`✅ PurchasedMaterial record created`);

      // Auto-create manufactured product
      await ManufacturedProduct.create({
        name: `${product.name} - Manufactured`,
        description: 'Auto-created after raw material purchase',
        price: product.price * 2,
        quantity: quantity,
        materialId: transaction._id,
        manufacturerId: buyer._id,
        manufacturerName: buyer.name,
        company: buyer.company,
        txHash: externalTxHash,
        status: 'active'
      });
      console.log(`✅ ManufacturedProduct auto-created`);

      console.log('🎉 PURCHASE COMPLETE:', {
        product: product.name,
        productId: product._id,
        buyer: buyer.email,
        seller: seller.email,
        txHash: externalTxHash
      });

      // Return success response
      res.status(200).json({
        message: 'Purchase successful',
        transaction: transaction,
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

// MANUFACTURER: Get purchased materials
apiRouter.get(
  '/manufacturer/purchased-materials',
  authenticateToken,
  authorizeRole('manufacturers'),
  async (req, res) => {
    try {
      const purchasedMaterials = await PurchasedMaterial.find({ 
        manufacturerId: req.user.id,
        status: 'available'
      }).sort({ purchasedAt: -1 });
      
      res.json(purchasedMaterials);
    } catch (err) {
      console.error('❌ Error fetching purchased materials:', err);
      res.status(500).json({ message: 'Error fetching purchased materials', error: err.message });
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
      purchases.forEach(p => {
        console.log(`   - ${p.productName} (ID: ${p.productId}) - ${p.timestamp}`);
      });
      
      res.json(purchases);
    } catch (err) {
      console.error('❌ Error fetching purchases:', err);
      res.status(500).json({ message: 'Error fetching purchase history', error: err.message });
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

// CUSTOMER: Purchase manufactured product
apiRouter.post(
  '/products/buy-final',
  authenticateToken,
  authorizeRole('customers'),
  async (req, res) => {
    try {
      const { productId, quantity, externalTxHash } = req.body;
      
      if (!productId || !externalTxHash) {
        return res.status(400).json({ 
          message: 'Product ID and transaction hash are required' 
        });
      }

      // Find product (manufactured product)
      const product = await ManufacturedProduct.findById(productId);
      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }

      // Check stock
      if (product.quantity < quantity) {
        return res.status(400).json({ message: 'Insufficient stock' });
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
      product.quantity -= quantity;
      if (product.quantity === 0) {
        product.status = 'sold_out';
      }
      await product.save();

      // Create customer transaction record
      const customerTransaction = new Transaction({
        productId: product._id,
        productName: product.name,
        buyerId: buyer._id,
        buyerName: buyer.name,
        sellerId: seller._id,
        sellerName: seller.name,
        quantity: quantity,
        amount: product.price * quantity,
        txHash: externalTxHash,
        status: 'completed'
      });

      await customerTransaction.save();

      console.log('✅ Customer purchase recorded:', {
        product: product.name,
        buyer: buyer.email,
        seller: seller.email,
        txHash: externalTxHash
      });

      res.status(200).json({
        message: 'Purchase successful',
        transaction: customerTransaction
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
      const purchases = await Transaction.find({ buyerId: req.user.id })
        .sort({ timestamp: -1 });
      
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

/* --- Debug / Verification Routes --- */

apiRouter.get('/debug/products', authenticateToken, async (req, res) => {
  try {
    const allProducts = await Product.find();
    res.json({
      total: allProducts.length,
      products: allProducts.map(p => ({
        id: p._id,
        name: p.name,
        supplierId: p.supplierId,
        supplierName: p.supplierName,
        quantity: p.quantity
      }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Debug manufactured products
apiRouter.get('/debug/manufactured-products', authenticateToken, async (req, res) => {
  try {
    const products = await ManufacturedProduct.find();
    res.json({
      total: products.length,
      products: products.map(p => ({
        id: p._id,
        name: p.name,
        manufacturerId: p.manufacturerId,
        manufacturerName: p.manufacturerName,
        quantity: p.quantity,
        status: p.status
      }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Debug purchased materials
apiRouter.get('/debug/purchased-materials', authenticateToken, async (req, res) => {
  try {
    const materials = await PurchasedMaterial.find();
    res.json({
      total: materials.length,
      materials: materials.map(m => ({
        id: m._id,
        productId: m.productId,
        productName: m.productName,
        manufacturerId: m.manufacturerId,
        manufacturerName: m.manufacturerName,
        supplierName: m.supplierName,
        quantity: m.quantity,
        status: m.status
      }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Debug: Get manufacturer's purchased product IDs
apiRouter.get('/debug/manufacturer-purchased/:manufacturerId', authenticateToken, async (req, res) => {
  try {
    const transactions = await Transaction.find({ 
      buyerId: req.params.manufacturerId 
    });
    
    const purchasedMaterials = await PurchasedMaterial.find({ 
      manufacturerId: req.params.manufacturerId 
    });
    
    res.json({
      transactions: transactions.map(t => ({
        id: t._id,
        productId: t.productId?.toString(),
        productName: t.productName,
        txHash: t.txHash,
        timestamp: t.timestamp
      })),
      purchasedMaterials: purchasedMaterials.map(p => ({
        id: p._id,
        productId: p.productId?.toString(),
        productName: p.productName,
        txHash: p.txHash
      })),
      manufacturerId: req.params.manufacturerId,
      transactionCount: transactions.length,
      purchasedMaterialCount: purchasedMaterials.length
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Debug: Check if product is purchased by manufacturer
apiRouter.get('/debug/check-purchase/:manufacturerId/:productId', authenticateToken, async (req, res) => {
  try {
    const transaction = await Transaction.findOne({
      buyerId: req.params.manufacturerId,
      productId: req.params.productId,
      status: 'completed'
    });
    
    const purchasedMaterial = await PurchasedMaterial.findOne({
      manufacturerId: req.params.manufacturerId,
      productId: req.params.productId
    });
    
    res.json({
      manufacturerId: req.params.manufacturerId,
      productId: req.params.productId,
      hasTransaction: !!transaction,
      hasPurchasedMaterial: !!purchasedMaterial,
      transaction: transaction ? {
        id: transaction._id,
        timestamp: transaction.timestamp,
        txHash: transaction.txHash
      } : null,
      purchasedMaterial: purchasedMaterial ? {
        id: purchasedMaterial._id,
        status: purchasedMaterial.status
      } : null
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
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