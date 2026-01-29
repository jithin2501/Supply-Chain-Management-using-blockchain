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

// MANUFACTURER: Get all available materials
apiRouter.get('/products/available', authenticateToken, async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.json(products);
  } catch (err) {
    console.error('❌ Error fetching products:', err);
    res.status(500).json({ message: 'Error fetching products' });
  }
});

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
        supplierName: p.supplierName
      }))
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