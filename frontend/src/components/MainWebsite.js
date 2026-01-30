import React, { useState, useEffect } from 'react';
import { 
  Package, Shield, TrendingUp, Users, Search, Scan, CheckCircle, 
  ArrowRight, Globe, Lock, Zap, LogOut, ShoppingBag, Filter, Wallet,
  ShieldCheck, Database, CheckCircle2, Link as LinkIcon, Clock, AlertCircle,
  RefreshCw, ShoppingCart, Factory, ChevronRight
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
                className={`font-medium transition ${activeSection === 'home' ? 'text-blue-600' : 'text-gray-700 hover:text-blue-600'}`}
              >
                Home
              </button>
              {user?.role === 'customers' && (
                <button
                  onClick={() => navigate('/customer/products')}
                  className={`font-medium transition ${activeSection === 'products' ? 'text-blue-600' : 'text-gray-700 hover:text-blue-600'}`}
                >
                  Products
                </button>
              )}
              <button
                onClick={() => scrollToSection('features')}
                className={`font-medium transition ${activeSection === 'features' ? 'text-blue-600' : 'text-gray-700 hover:text-blue-600'}`}
              >
                Features
              </button>
              <button
                onClick={() => scrollToSection('how-it-works')}
                className={`font-medium transition ${activeSection === 'how-it-works' ? 'text-blue-600' : 'text-gray-700 hover:text-blue-600'}`}
              >
                How It Works
              </button>
              <button
                onClick={() => scrollToSection('verify')}
                className={`font-medium transition ${activeSection === 'verify' ? 'text-blue-600' : 'text-gray-700 hover:text-blue-600'}`}
              >
                Verify Product
              </button>
            </div>
            {user ? (
              <div className="flex items-center space-x-4">
                {user.role === 'customers' && account && (
                  <div className="flex items-center space-x-2">
                    <div className="text-right hidden sm:block">
                      <div className="text-xs text-gray-500">Wallet Connected</div>
                      <div className="text-[10px] font-mono text-green-600 truncate">{account.substring(0, 10)}...</div>
                    </div>
                    <button
                      onClick={disconnectWallet}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                    >
                      <LogOut size={18} />
                    </button>
                  </div>
                )}
                <div className="text-right hidden sm:block">
                  <div className="font-semibold text-gray-900">{user.name}</div>
                  <div className="text-sm text-gray-600 capitalize">{user.role}</div>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                >
                  <LogOut size={18} />
                  <span>Logout</span>
                </button>
              </div>
            ) : (
              <a href="/login" className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition">
                Login
              </a>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section id="home" className="pt-32 pb-20 px-6 bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
                Trust Every Step of Your Supply Chain
              </h1>
              <p className="text-xl text-gray-600 mb-8">
                Blockchain-powered transparency from origin to consumer. Track, verify, and trust every product in real-time.
              </p>
              <div className="flex flex-wrap gap-4">
                {user?.role === 'customers' ? (
                  <button
                    onClick={() => navigate('/customer/products')}
                    className="px-8 py-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition flex items-center"
                  >
                    Browse Products <ArrowRight className="ml-2" size={20} />
                  </button>
                ) : (
                  <button
                    onClick={() => scrollToSection('how-it-works')}
                    className="px-8 py-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition flex items-center"
                  >
                    Browse Products <ArrowRight className="ml-2" size={20} />
                  </button>
                )}
                <button
                  onClick={() => scrollToSection('how-it-works')}
                  className="px-8 py-4 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:border-blue-600 hover:text-blue-600 transition"
                >
                  Learn More
                </button>
              </div>
              <div className="mt-8 flex items-center space-x-8">
                <div>
                  <div className="text-3xl font-bold text-blue-600">10K+</div>
                  <div className="text-gray-600">Products Tracked</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-blue-600">500+</div>
                  <div className="text-gray-600">Verified Partners</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-blue-600">99.9%</div>
                  <div className="text-gray-600">Accuracy</div>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-8 shadow-2xl">
                <div className="bg-white rounded-xl p-6 space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                      <CheckCircle className="text-green-600" size={24} />
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">Product Verified</div>
                      <div className="text-sm text-gray-600">Organic Strawberries</div>
                    </div>
                  </div>
                  <div className="space-y-2 pl-6 border-l-2 border-blue-200">
                    <div className="text-sm">
                      <div className="font-medium text-gray-700">✓ Harvested: Smith Farm, CA</div>
                      <div className="text-gray-500">2 days ago</div>
                    </div>
                    <div className="text-sm">
                      <div className="font-medium text-gray-700">✓ Temperature: 4.5°C</div>
                      <div className="text-gray-500">Within safe range</div>
                    </div>
                    <div className="text-sm">
                      <div className="font-medium text-gray-700">✓ Certified Organic</div>
                      <div className="text-gray-500">USDA Verified</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Products CTA Section - UPDATED */}
      {user?.role === 'customers' && (
        <section id="products" className="py-20 px-6 bg-white">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">Shop Blockchain-Verified Products</h2>
              <p className="text-xl text-gray-600">Purchase products with complete supply chain transparency</p>
            </div>

            {/* Products Preview Grid */}
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <LoaderCircle className="animate-spin text-blue-600" size={48} />
              </div>
            ) : products.length > 0 ? (
              <div className="mb-12">
                <h3 className="text-2xl font-bold text-gray-900 mb-6">Featured Products</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {products.slice(0, 3).map(product => (
                    <div key={product._id} className="bg-white rounded-2xl shadow-sm border overflow-hidden hover:shadow-lg transition">
                      <div className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <Package className="text-blue-600" size={32} />
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${product.quantity > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {product.quantity > 0 ? `${product.quantity} in stock` : 'Sold Out'}
                          </span>
                        </div>
                        <h4 className="text-xl font-bold text-gray-900 mb-2">{product.name}</h4>
                        <p className="text-sm text-gray-600 mb-4 line-clamp-2">{product.description}</p>
                        <div className="mb-4">
                          <p className="text-[10px] font-bold text-gray-400 uppercase">Manufacturer</p>
                          <p className="text-sm font-semibold">{product.company || product.manufacturerName}</p>
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase">Price</p>
                            <p className="text-2xl font-black text-gray-900">${product.price}</p>
                          </div>
                          <button 
                            onClick={() => navigate('/customer/products')}
                            className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition flex items-center space-x-2"
                          >
                            <span>View Details</span>
                            <ArrowRight size={18} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mb-12 bg-white p-12 rounded-2xl border-2 border-dashed border-gray-200 text-center">
                <Factory className="mx-auto text-gray-300 mb-4" size={64} />
                <p className="text-gray-600">No products available yet. Manufacturers are creating blockchain-verified products.</p>
              </div>
            )}

            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-3xl p-8 md:p-12">
              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div>
                  <h3 className="text-3xl font-bold text-gray-900 mb-4">Ready to Shop?</h3>
                  <p className="text-gray-600 mb-6">
                    Browse our collection of blockchain-verified products. Each product comes with a complete,
                    immutable history from manufacturer to shelf.
                  </p>
                  <div className="space-y-4">
                    <div className="flex items-start space-x-3">
                      <CheckCircle className="text-green-500 mt-0.5" size={20} />
                      <div>
                        <p className="font-medium text-gray-900">Full Transparency</p>
                        <p className="text-sm text-gray-600">View complete supply chain history</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <CheckCircle className="text-green-500 mt-0.5" size={20} />
                      <div>
                        <p className="font-medium text-gray-900">Blockchain Verified</p>
                        <p className="text-sm text-gray-600">Every transaction recorded on-chain</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <CheckCircle className="text-green-500 mt-0.5" size={20} />
                      <div>
                        <p className="font-medium text-gray-900">Secure Payments</p>
                        <p className="text-sm text-gray-600">Pay with MetaMask for added security</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="text-center">
                  <div className="inline-block bg-white p-8 rounded-2xl shadow-lg">
                    <ShoppingBag className="mx-auto text-blue-600 mb-4" size={64} />
                    <h4 className="text-2xl font-bold text-gray-900 mb-2">Marketplace Access</h4>
                    <p className="text-gray-600 mb-6">Connect your wallet to start shopping</p>
                    <button
                      onClick={() => navigate('/customer/products')}
                      className="w-full px-8 py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition flex items-center justify-center space-x-2"
                    >
                      <span>Go to Marketplace</span>
                      <ChevronRight size={20} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Purchase History */}
            {purchases.length > 0 && (
              <div className="mt-16">
                <h3 className="text-2xl font-bold text-gray-900 mb-6">Your Recent Purchases</h3>
                <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                          <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Product</th>
                          <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Manufacturer</th>
                          <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Amount</th>
                          <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-right">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {purchases.slice(0, 3).map(purchase => (
                          <tr key={purchase._id} className="hover:bg-blue-50/30 transition">
                            <td className="px-6 py-4">
                              <div className="font-bold text-gray-900">{purchase.productName}</div>
                              {purchase.txHash && (
                                <a 
                                  href={`https://etherscan.io/tx/${purchase.txHash}`} 
                                  target="_blank" 
                                  rel="noreferrer"
                                  className="flex items-center space-x-1 text-blue-600 hover:underline text-xs"
                                >
                                  <LinkIcon size={10} />
                                  <span>View on Blockchain</span>
                                </a>
                              )}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600">{purchase.sellerName}</td>
                            <td className="px-6 py-4 font-bold text-gray-900">${purchase.amount}</td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end text-xs text-gray-400">
                                <Clock size={12} className="mr-1" />
                                {new Date(purchase.timestamp).toLocaleDateString()}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {purchases.length > 3 && (
                      <div className="p-4 text-center border-t border-gray-100">
                        <button
                          onClick={() => navigate('/customer/products')}
                          className="text-blue-600 hover:text-blue-700 font-medium flex items-center justify-center space-x-1 mx-auto"
                        >
                          <span>View all {purchases.length} purchases</span>
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Features Section */}
      <section id="features" className="py-20 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Why Choose ChainTrack?</h2>
            <p className="text-xl text-gray-600">Blockchain technology meets supply chain management</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-8 border border-gray-200 rounded-xl hover:shadow-lg transition">
              <div className="w-14 h-14 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <Shield className="text-blue-600" size={28} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">100% Transparency</h3>
              <p className="text-gray-600">
                Every step recorded on blockchain. Immutable, tamper-proof records you can trust.
              </p>
            </div>
            <div className="p-8 border border-gray-200 rounded-xl hover:shadow-lg transition">
              <div className="w-14 h-14 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <TrendingUp className="text-green-600" size={28} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Real-Time Tracking</h3>
              <p className="text-gray-600">
                Monitor your products 24/7. Get instant updates on location, temperature, and status.
              </p>
            </div>
            <div className="p-8 border border-gray-200 rounded-xl hover:shadow-lg transition">
              <div className="w-14 h-14 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <Users className="text-purple-600" size={28} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Multi-Stakeholder</h3>
              <p className="text-gray-600">
                Seamless collaboration between manufacturers, logistics, warehouses, and retailers.
              </p>
            </div>
            <div className="p-8 border border-gray-200 rounded-xl hover:shadow-lg transition">
              <div className="w-14 h-14 bg-yellow-100 rounded-lg flex items-center justify-center mb-4">
                <Zap className="text-yellow-600" size={28} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Smart Automation</h3>
              <p className="text-gray-600">
                Automated payments, alerts, and quality checks powered by smart contracts.
              </p>
            </div>
            <div className="p-8 border border-gray-200 rounded-xl hover:shadow-lg transition">
              <div className="w-14 h-14 bg-red-100 rounded-lg flex items-center justify-center mb-4">
                <Lock className="text-red-600" size={28} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Anti-Counterfeit</h3>
              <p className="text-gray-600">
                Verify authenticity instantly. Protect your brand and customers from fake products.
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