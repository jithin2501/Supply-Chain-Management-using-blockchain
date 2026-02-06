import React, { useState, useEffect } from 'react';
import { 
  Package, Shield, TrendingUp, Users, Search, Scan, CheckCircle, 
  ArrowRight, Globe, Lock, Zap, LogOut, ShoppingBag, Filter, Wallet,
  ShieldCheck, Database, CheckCircle2, Link as LinkIcon, Clock, AlertCircle,
  RefreshCw, ShoppingCart, Factory, ChevronRight, Truck
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const API_URL = 'http://localhost:5000/api';

// Custom Loader
function LoaderCircle({ size = 24, className = "" }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

export default function MainWebsite() {
  const navigate = useNavigate();
  const [productId, setProductId] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [user, setUser] = useState(null);
  const [products, setProducts] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeSection, setActiveSection] = useState('home');
  const [account, setAccount] = useState(null);
  const [isMetaMaskInstalled, setIsMetaMaskInstalled] = useState(false);

  // Get token and user data directly from localStorage
  const token = localStorage.getItem('token');
  const userData = JSON.parse(localStorage.getItem('user') || '{}');

  // Check if user is logged in and get user data - ONLY ONCE
  useEffect(() => {
    if (token && userData) {
      try {
        setUser(userData);
      } catch (err) {
        console.error('Error parsing user data:', err);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
  }, []); // Empty dependency array - run only once

  // Check for MetaMask
  useEffect(() => {
    if (window.ethereum) {
      setIsMetaMaskInstalled(true);
      const savedAccount = localStorage.getItem(`wallet_${userData._id}`);
      
      window.ethereum.request({ method: 'eth_accounts' })
        .then(accounts => {
          if (accounts.length > 0 && accounts[0] === savedAccount) {
            setAccount(accounts[0]);
          }
        });

      const handleAccountsChanged = (accounts) => {
        const currentSaved = localStorage.getItem(`wallet_${userData._id}`);
        if (accounts.length > 0 && accounts[0] === currentSaved) {
          setAccount(accounts[0]);
        } else {
          setAccount(null);
        }
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      
      return () => {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      };
    }
  }, [userData._id]);

  const connectWallet = async () => {
    if (!window.ethereum) return alert("Please install MetaMask!");
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const connectedAccount = accounts[0];
      
      setAccount(connectedAccount);
      localStorage.setItem(`wallet_${userData._id}`, connectedAccount);
      
    } catch (err) {
      console.error("Wallet connection failed:", err);
    }
  };

  const disconnectWallet = () => {
    setAccount(null);
    localStorage.removeItem(`wallet_${userData._id}`);
  };

  // Fetch available products for customers
  const fetchAvailableProducts = async () => {
    if (!token) return;
    
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/products/available`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      // This fetches manufactured products
      setProducts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error loading available products:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch customer purchases
  const fetchPurchases = async () => {
    if (!token) return;
    
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/customer/purchases`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setPurchases(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error loading purchases:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch data when user role is customers
  useEffect(() => {
    if (user && user.role === 'customers' && token) {
      fetchAvailableProducts();
      fetchPurchases();
    } else {
      // Reset states if not a customer
      setProducts([]);
      setPurchases([]);
    }
  }, [user]); // Only depend on user, not token

  const handleSearch = () => {
    if (productId) {
      window.location.href = `/verify?id=${productId}`;
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    if (userData._id) {
      localStorage.removeItem(`wallet_${userData._id}`);
    }
    window.location.href = '/login';
  };

  // Navigation click handlers
  const scrollToSection = (sectionId) => {
    setActiveSection(sectionId);
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed w-full bg-white/95 backdrop-blur-sm shadow-sm z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Package className="text-blue-600" size={32} />
              <span className="text-2xl font-bold text-gray-900">ChainTrack</span>
            </div>
            <div className="hidden md:flex space-x-8">
              <button
                onClick={() => scrollToSection('home')}
                className={`${activeSection === 'home' ? 'text-blue-600' : 'text-gray-700'} hover:text-blue-600 font-medium transition`}
              >
                Home
              </button>
              <button
                onClick={() => navigate('/customer/products')}
                className="text-gray-700 hover:text-blue-600 font-medium transition flex items-center gap-2"
              >
                <Search size={18} />
                Search Products
              </button>
              <button
                onClick={() => navigate('/customer/orders')}
                className="text-gray-700 hover:text-blue-600 font-medium transition flex items-center gap-2"
              >
                <Truck size={18} />
                Orders
              </button>
              <button
                onClick={() => scrollToSection('features')}
                className={`${activeSection === 'features' ? 'text-blue-600' : 'text-gray-700'} hover:text-blue-600 font-medium transition`}
              >
                Features
              </button>
              <button
                onClick={() => scrollToSection('how-it-works')}
                className={`${activeSection === 'how-it-works' ? 'text-blue-600' : 'text-gray-700'} hover:text-blue-600 font-medium transition`}
              >
                How It Works
              </button>
            </div>
            <div className="flex items-center space-x-4">
              {user ? (
                <>
                  <div className="hidden md:flex items-center space-x-3">
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900">{user.name}</p>
                      <p className="text-xs text-gray-600 capitalize">{user.role}</p>
                    </div>
                    <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="px-4 py-2 text-gray-700 hover:text-red-600 transition flex items-center space-x-2"
                  >
                    <LogOut size={18} />
                    <span>Logout</span>
                  </button>
                </>
              ) : (
                <a
                  href="/login"
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
                >
                  Sign In
                </a>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section id="home" className="pt-32 pb-20 px-6 bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
                Track Every Step of Your Supply Chain
              </h1>
              <p className="text-xl text-gray-600 mb-8">
                Blockchain-powered transparency ensuring product authenticity from manufacturer to your doorstep.
              </p>
              <div className="flex flex-wrap gap-4">
                {user && user.role === 'customers' ? (
                  <>
                    <button
                      onClick={() => navigate('/customer/products')}
                      className="px-8 py-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition flex items-center"
                    >
                      Browse Products
                      <ArrowRight className="ml-2" size={20} />
                    </button>
                    <button
                      onClick={() => navigate('/customer/orders')}
                      className="px-8 py-4 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:border-blue-600 hover:text-blue-600 transition"
                    >
                      View Orders
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => scrollToSection('verify')}
                      className="px-8 py-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition flex items-center"
                    >
                      Verify Product
                      <ArrowRight className="ml-2" size={20} />
                    </button>
                    <button
                      onClick={() => scrollToSection('how-it-works')}
                      className="px-8 py-4 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:border-blue-600 hover:text-blue-600 transition"
                    >
                      Learn More
                    </button>
                  </>
                )}
              </div>

              {/* Quick Stats */}
              <div className="mt-12 grid grid-cols-3 gap-6">
                <div>
                  <div className="text-3xl font-bold text-blue-600">10K+</div>
                  <div className="text-sm text-gray-600">Products Tracked</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-blue-600">500+</div>
                  <div className="text-sm text-gray-600">Active Partners</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-blue-600">99.9%</div>
                  <div className="text-sm text-gray-600">Accuracy Rate</div>
                </div>
              </div>
            </div>

            {/* Hero Image/Illustration */}
            <div className="relative">
              <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-8 shadow-2xl">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 mb-4">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
                      <Package className="text-blue-600" size={24} />
                    </div>
                    <div className="text-white">
                      <div className="font-bold">Product #12345</div>
                      <div className="text-sm text-blue-100">Organic Coffee Beans</div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center text-white text-sm">
                      <CheckCircle className="mr-2 text-green-400" size={16} />
                      Manufacturer Verified
                    </div>
                    <div className="flex items-center text-white text-sm">
                      <CheckCircle className="mr-2 text-green-400" size={16} />
                      Quality Checked
                    </div>
                    <div className="flex items-center text-white text-sm">
                      <CheckCircle className="mr-2 text-green-400" size={16} />
                      In Transit
                    </div>
                  </div>
                </div>
                
                {/* Blockchain visualization */}
                <div className="grid grid-cols-4 gap-2">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                    <div key={i} className="bg-white/20 backdrop-blur-sm h-12 rounded animate-pulse" style={{ animationDelay: `${i * 0.1}s` }}></div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Why Choose ChainTrack?</h2>
            <p className="text-xl text-gray-600">Enterprise-grade blockchain technology made simple</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-8 border border-gray-200 rounded-xl hover:shadow-lg transition">
              <div className="w-14 h-14 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <Shield className="text-blue-600" size={28} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Immutable Records</h3>
              <p className="text-gray-600">
                Every transaction recorded permanently on the blockchain. No tampering, complete transparency.
              </p>
            </div>
            <div className="p-8 border border-gray-200 rounded-xl hover:shadow-lg transition">
              <div className="w-14 h-14 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <TrendingUp className="text-green-600" size={28} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Real-Time Tracking</h3>
              <p className="text-gray-600">
                Monitor your products at every stage. Live updates from manufacturing to delivery.
              </p>
            </div>
            <div className="p-8 border border-gray-200 rounded-xl hover:shadow-lg transition">
              <div className="w-14 h-14 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <Users className="text-purple-600" size={28} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Multi-Stakeholder</h3>
              <p className="text-gray-600">
                Connect suppliers, manufacturers, distributors, and customers in one ecosystem.
              </p>
            </div>
            <div className="p-8 border border-gray-200 rounded-xl hover:shadow-lg transition">
              <div className="w-14 h-14 bg-red-100 rounded-lg flex items-center justify-center mb-4">
                <Lock className="text-red-600" size={28} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Secure & Private</h3>
              <p className="text-gray-600">
                Military-grade encryption. Your data is protected with the latest security protocols.
              </p>
            </div>
            <div className="p-8 border border-gray-200 rounded-xl hover:shadow-lg transition">
              <div className="w-14 h-14 bg-yellow-100 rounded-lg flex items-center justify-center mb-4">
                <Zap className="text-yellow-600" size={28} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Lightning Fast</h3>
              <p className="text-gray-600">
                Instant verification and updates. No waiting, no delays in tracking your products.
              </p>
            </div>
            <div className="p-8 border border-gray-200 rounded-xl hover:shadow-lg transition">
              <div className="w-14 h-14 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
                <Globe className="text-indigo-600" size={28} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Global Reach</h3>
              <p className="text-gray-600">
                Track products across borders. Support for international supply chains.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 px-6 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">How It Works</h2>
            <p className="text-xl text-gray-600">Simple, secure, and seamless tracking in 4 steps</p>
          </div>
          <div className="grid md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">1</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Register Product</h3>
              <p className="text-gray-600">Manufacturer creates product record on blockchain with all details</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">2</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Track Journey</h3>
              <p className="text-gray-600">Each stakeholder logs updates as product moves through supply chain</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">3</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Verify Quality</h3>
              <p className="text-gray-600">Temperature, location, and quality checks recorded in real-time</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">4</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Consumer Scans</h3>
              <p className="text-gray-600">End customer verifies authenticity and views complete product history</p>
            </div>
          </div>
        </div>
      </section>

      {/* Verify Product Section */}
      <section id="verify" className="py-20 px-6 bg-gradient-to-br from-blue-600 to-indigo-700 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-4">Verify Your Product Now</h2>
          <p className="text-xl text-blue-100 mb-8">Enter Product ID or scan QR code to view complete supply chain history</p>
          
          <div className="bg-white rounded-xl p-8 shadow-2xl">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="text-left">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Enter Product ID</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={productId}
                    onChange={(e) => setProductId(e.target.value)}
                    placeholder="e.g., 12345"
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                  />
                  <button
                    onClick={handleSearch}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition flex items-center"
                  >
                    <Search size={20} />
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-center">
                <div className="text-gray-400">OR</div>
              </div>
              <div className="md:col-span-2">
                <button
                  onClick={() => setShowScanner(true)}
                  className="w-full px-6 py-4 border-2 border-blue-600 text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition flex items-center justify-center"
                >
                  <Scan className="mr-2" size={20} />
                  Scan QR Code
                </button>
              </div>
            </div>
            
            {showScanner && (
              <div className="mt-6 p-6 bg-gray-50 rounded-lg">
                <p className="text-gray-700 mb-4">QR Scanner will appear here</p>
                <p className="text-sm text-gray-600">Install html5-qrcode library for camera access</p>
                <button
                  onClick={() => setShowScanner(false)}
                  className="mt-4 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Close Scanner
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">Ready to Transform Your Supply Chain?</h2>
          <p className="text-xl text-gray-600 mb-8">Join hundreds of companies already using ChainTrack</p>
          <div className="flex flex-wrap gap-4 justify-center">
            {user ? (
              <>
                {user.role === 'customers' ? (
                  <button
                    onClick={() => navigate('/customer/products')}
                    className="px-8 py-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
                  >
                    Browse Products
                  </button>
                ) : (
                  <button
                    onClick={handleLogout}
                    className="px-8 py-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
                  >
                    Go to Dashboard
                  </button>
                )}
                <button
                  onClick={handleLogout}
                  className="px-8 py-4 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:border-blue-600 hover:text-blue-600 transition"
                >
                  Switch Account
                </button>
              </>
            ) : (
              <>
                <a href="/login" className="px-8 py-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition">
                  Get Started
                </a>
                <button
                  onClick={() => scrollToSection('features')}
                  className="px-8 py-4 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:border-blue-600 hover:text-blue-600 transition"
                >
                  Learn More
                </button>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Package size={28} />
                <span className="text-xl font-bold">ChainTrack</span>
              </div>
              <p className="text-gray-400">Blockchain-powered supply chain transparency for the modern world.</p>
            </div>
            <div>
              <h3 className="font-bold mb-4">Product</h3>
              <ul className="space-y-2 text-gray-400">
                <li><button onClick={() => scrollToSection('features')} className="hover:text-white">Features</button></li>
                <li><button onClick={() => scrollToSection('how-it-works')} className="hover:text-white">How It Works</button></li>
                <li><button onClick={() => scrollToSection('verify')} className="hover:text-white">Verify Product</button></li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold mb-4">Company</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">About Us</a></li>
                <li><a href="#" className="hover:text-white">Careers</a></li>
                <li><a href="#" className="hover:text-white">Contact</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold mb-4">Legal</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white">Terms of Service</a></li>
                <li><a href="#" className="hover:text-white">Cookie Policy</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center text-gray-400">
            <p>&copy; 2024 ChainTrack. All rights reserved. Powered by Blockchain Technology.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}