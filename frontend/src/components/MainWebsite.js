import React, { useState, useEffect } from 'react';
import { Package, Shield, TrendingUp, Users, Search, Scan, CheckCircle, ArrowRight, Globe, Lock, Zap, LogOut } from 'lucide-react';

export default function MainWebsite() {
  const [productId, setProductId] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [user, setUser] = useState(null);

  // Check if user is logged in on component mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (token && userData) {
      try {
        setUser(JSON.parse(userData));
      } catch (err) {
        console.error('Error parsing user data:', err);
        // Clear invalid user data
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
  }, []);

  const handleSearch = () => {
    if (productId) {
      // Redirect to verification page with product ID
      window.location.href = `/verify?id=${productId}`;
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
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
              <a href="#home" className="text-gray-700 hover:text-blue-600 font-medium transition">Home</a>
              <a href="#features" className="text-gray-700 hover:text-blue-600 font-medium transition">Features</a>
              <a href="#how-it-works" className="text-gray-700 hover:text-blue-600 font-medium transition">How It Works</a>
              <a href="#verify" className="text-gray-700 hover:text-blue-600 font-medium transition">Verify Product</a>
            </div>
            {user ? (
              <div className="flex items-center space-x-4">
                <div className="text-right hidden sm:block">
                  <div className="font-semibold text-gray-900">{user.name}</div>
                  <div className="text-sm text-gray-600">{user.company}</div>
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
                <a href="#verify" className="px-8 py-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition flex items-center">
                  Verify Product <ArrowRight className="ml-2" size={20} />
                </a>
                <a href="#how-it-works" className="px-8 py-4 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:border-blue-600 hover:text-blue-600 transition">
                  Learn More
                </a>
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
            <a href="#verify" className="px-8 py-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition">
              Verify Product
            </a>
            <button
              onClick={handleLogout}
              className="px-8 py-4 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:border-blue-600 hover:text-blue-600 transition"
            >
              Switch Account
            </button>
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
                <li><a href="#features" className="hover:text-white">Features</a></li>
                <li><a href="#how-it-works" className="hover:text-white">How It Works</a></li>
                <li><a href="#verify" className="hover:text-white">Verify Product</a></li>
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
