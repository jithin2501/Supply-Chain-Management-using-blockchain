import React, { useState, useEffect } from 'react';
import { 
  ShoppingCart, Package, LogOut, Search, ArrowLeft, 
  Star, Plus, Minus, X, Trash2, Wallet, ShieldCheck,
  Database, CheckCircle2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const API_URL = 'http://localhost:5000/api';

export default function CustomerProductsPage() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [purchaseQuantity, setPurchaseQuantity] = useState(1);
  const [cart, setCart] = useState([]);
  const [showCart, setShowCart] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  
  // MetaMask & Transaction states
  const [account, setAccount] = useState(null);
  const [isMetaMaskInstalled, setIsMetaMaskInstalled] = useState(false);
  const [txStatus, setTxStatus] = useState(null);
  const [txStep, setTxStep] = useState(0);

  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const steps = [
    { title: "Connecting MetaMask", icon: Wallet },
    { title: "Waiting for Signature", icon: ShieldCheck },
    { title: "Mining Transaction", icon: Database },
    { title: "Finalizing Purchase", icon: CheckCircle2 }
  ];

  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem(`cart_${user._id}`);
    if (savedCart) {
      setCart(JSON.parse(savedCart));
    }
  }, [user._id]);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    if (cart.length > 0) {
      localStorage.setItem(`cart_${user._id}`, JSON.stringify(cart));
    } else {
      localStorage.removeItem(`cart_${user._id}`);
    }
  }, [cart, user._id]);

  // Check for MetaMask
  useEffect(() => {
    if (window.ethereum) {
      setIsMetaMaskInstalled(true);
      
      const handleAccountsChanged = (accounts) => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          localStorage.setItem(`wallet_${user._id}`, accounts[0]);
        } else {
          setAccount(null);
          localStorage.removeItem(`wallet_${user._id}`);
        }
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      
      const checkInitialConnection = async () => {
        try {
          const permissions = await window.ethereum.request({
            method: 'wallet_getPermissions'
          });
          
          const hasAccountsPermission = permissions.some(
            perm => perm.parentCapability === 'eth_accounts'
          );
          
          if (hasAccountsPermission) {
            const accounts = await window.ethereum.request({ 
              method: 'eth_accounts' 
            });
            if (accounts.length > 0) {
              setAccount(accounts[0]);
              localStorage.setItem(`wallet_${user._id}`, accounts[0]);
            }
          }
        } catch (err) {
          console.error('Error checking MetaMask connection:', err);
        }
      };

      checkInitialConnection();

      return () => {
        if (window.ethereum.removeListener) {
          window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        }
      };
    }
  }, [user._id]);

  useEffect(() => {
    fetchProducts();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/products/available`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) throw new Error('Failed to fetch products');
      
      const data = await response.json();
      setProducts(data);
    } catch (error) {
      console.error('Error fetching products:', error);
      alert('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const fetchProductDetail = async (productId) => {
    try {
      const response = await fetch(`${API_URL}/products/${productId}/detail`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) throw new Error('Failed to fetch product detail');
      
      const data = await response.json();
      setSelectedProduct(data);
      setPurchaseQuantity(1);
      setShowDetailModal(true);
    } catch (error) {
      console.error('Error fetching product detail:', error);
      alert('Failed to load product details');
    }
  };

  const addToCart = (product, quantity) => {
    const existingItem = cart.find(item => item._id === product._id);
    
    if (existingItem) {
      setCart(cart.map(item =>
        item._id === product._id
          ? { ...item, quantity: item.quantity + quantity }
          : item
      ));
    } else {
      setCart([...cart, { ...product, quantity }]);
    }
    
    setShowDetailModal(false);
    alert(`Added ${quantity} ${product.name} to cart!`);
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item._id !== productId));
  };

  const updateCartQuantity = (productId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }
    
    setCart(cart.map(item =>
      item._id === productId
        ? { ...item, quantity: newQuantity }
        : item
    ));
  };

  const getTotalPrice = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const getTotalItems = () => {
    return cart.reduce((total, item) => total + item.quantity, 0);
  };

  const connectWallet = async () => {
    if (!isMetaMaskInstalled) {
      alert('Please install MetaMask to proceed with checkout');
      window.open('https://metamask.io/download/', '_blank');
      return;
    }

    try {
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      });
      setAccount(accounts[0]);
      localStorage.setItem(`wallet_${user._id}`, accounts[0]);
    } catch (err) {
      console.error('Error connecting wallet:', err);
      alert('Failed to connect MetaMask');
    }
  };


  const handleCheckout = async () => {
    if (!account) {
      await connectWallet();
      return;
    }

    setShowCart(false);
    setShowCheckout(true);
    setTxStatus('processing');
    setTxStep(0);

    try {
      // Step 1: Connect MetaMask
      setTxStep(0);
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Step 2: Request signature
      setTxStep(1);
      
      // ============= SIMPLIFIED: Use hardcoded wallet like manufacturer dashboard =============
      // For demo/testing: Use a fixed test wallet address
      // In production, replace with actual payment processing wallet
      const primaryManufacturerWallet = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8'; // Test wallet
      
      const totalAmount = getTotalPrice();
      // Convert to ETH (adjust conversion rate: ₹1 = 0.000002 ETH)
      const ethAmount = (totalAmount * 0.000002).toFixed(6);
      const weiAmount = Math.floor(parseFloat(ethAmount) * 1e18);
      
      console.log(`💸 Total: ₹${totalAmount} = ${ethAmount} ETH`);
      console.log(`📤 Sending to test wallet: ${primaryManufacturerWallet}`);
      // ============= END FIX =============

      const txHash = await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [{
          from: account,
          to: primaryManufacturerWallet, // ✅ NOW USING ACTUAL MANUFACTURER WALLET
          // eslint-disable-next-line no-undef
          value: '0x' + BigInt(weiAmount).toString(16),
          gas: '0x5208',
        }],
      });

      console.log('✅ Transaction submitted! Hash:', txHash);

      // Step 3: Mining
      setTxStep(2);
      
      // Wait for transaction confirmation
      let receipt = null;
      let attempts = 0;
      const maxAttempts = 60;
      
      while (!receipt && attempts < maxAttempts) {
        try {
          receipt = await window.ethereum.request({
            method: 'eth_getTransactionReceipt',
            params: [txHash],
          });
          
          if (receipt) {
            console.log('✅ Transaction mined!', receipt);
            if (receipt.status === '0x0') {
              throw new Error('Transaction failed on blockchain');
            }
            break;
          }
          
          await new Promise(resolve => setTimeout(resolve, 1000));
          attempts++;
        } catch (err) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          attempts++;
        }
      }

      // Step 4: Finalize
      setTxStep(3);
      
      // Process each item in cart
      for (const item of cart) {
        await fetch(`${API_URL}/products/buy-final`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            productId: item._id,
            quantity: item.quantity,
            externalTxHash: txHash,
            blockchainReceipt: receipt,
            manufacturerWallet: primaryManufacturerWallet
          })
        });
      }

      setTxStatus('success');
      
      // Clear cart after successful purchase
      setTimeout(() => {
        setCart([]);
        setShowCheckout(false);
        setTxStatus(null);
        alert(`✅ Purchase completed successfully!\n\n💰 Paid: ${ethAmount} ETH\n🔗 Tx Hash: ${txHash}`);
        fetchProducts();
      }, 2000);

    } catch (err) {
      console.error('❌ Checkout error:', err);
      setTxStatus('error');
      
      let errorMessage = 'Transaction failed';
      
      if (err.code === 4001) {
        errorMessage = '❌ Transaction rejected by user';
      } else if (err.code === -32603) {
        errorMessage = '❌ Insufficient funds for transaction';
      } else if (err.code === -32002) {
        errorMessage = '❌ Transaction request already pending in MetaMask';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setTimeout(() => {
        setShowCheckout(false);
        setTxStatus(null);
        alert(errorMessage);
      }, 1000);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem(`cart_${user._id}`);
    window.location.href = '/login';
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (product.description && product.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/main')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft size={20} />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Products</h1>
                <p className="text-sm text-gray-600">Browse our collection</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 w-64"
                />
              </div>

              {/* Cart Button */}
              <button
                onClick={() => setShowCart(!showCart)}
                className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ShoppingCart size={24} />
                {cart.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {getTotalItems()}
                  </span>
                )}
              </button>
              
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <LogOut size={20} />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            <Package size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">No products found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product) => {
              const discountPercentage = product.discount?.percentage || 0;
              const originalPrice = product.discount?.originalPrice || 0;

              return (
                <div
                  key={product._id}
                  onClick={() => fetchProductDetail(product._id)}
                  className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all cursor-pointer border border-gray-200 overflow-hidden group"
                >
                  {/* Product Image */}
                  <div className="relative h-64 bg-gray-100">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    {discountPercentage > 0 && (
                      <div className="absolute top-3 left-3 bg-green-600 text-white px-3 py-1 rounded-full text-sm font-bold">
                        {discountPercentage}% OFF
                      </div>
                    )}
                    {product.rating?.average > 0 && (
                      <div className="absolute top-3 right-3 bg-white px-2 py-1 rounded-lg flex items-center space-x-1 shadow-sm">
                        <Star size={14} className="fill-yellow-400 text-yellow-400" />
                        <span className="text-sm font-semibold">{product.rating.average.toFixed(1)}</span>
                      </div>
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="p-4">
                    {/* Brand */}
                    {product.productDetails?.brand && (
                      <p className="text-xs text-gray-500 mb-1">{product.productDetails.brand}</p>
                    )}

                    {/* Product Name */}
                    <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 h-12">
                      {product.name}
                    </h3>

                    {/* Price */}
                    <div className="flex items-center space-x-2 mb-3">
                      <span className="text-2xl font-bold text-gray-900">
                        ₹{product.price}
                      </span>
                      {originalPrice > 0 && (
                        <>
                          <span className="text-sm text-gray-500 line-through">
                            ₹{originalPrice}
                          </span>
                          <span className="text-sm text-green-600 font-semibold">
                            {discountPercentage}% off
                          </span>
                        </>
                      )}
                    </div>

                    {/* Quantity Info */}
                    {product.productDetails?.unit && (
                      <p className="text-sm text-gray-600 mb-3">
                        {product.productDetails.packOf > 1 
                          ? `Pack of ${product.productDetails.packOf}` 
                          : `Per ${product.productDetails.unit}`}
                      </p>
                    )}

                    {/* Add to Cart Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        fetchProductDetail(product._id);
                      }}
                      className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
                    >
                      <ShoppingCart size={18} />
                      <span>Add Item</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Product Detail Modal */}
      {showDetailModal && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between z-10">
              <h2 className="text-xl font-bold text-gray-900">Product Details</h2>
              <button
                onClick={() => setShowDetailModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6">
              <div className="grid md:grid-cols-2 gap-8">
                {/* Left: Image and Description */}
                <div>
                  {/* Main Image */}
                  <div className="bg-gray-100 rounded-xl overflow-hidden mb-4">
                    <img
                      src={selectedProduct.image}
                      alt={selectedProduct.name}
                      className="w-full h-96 object-cover"
                    />
                  </div>

                  {/* Gallery Images */}
                  {selectedProduct.galleryImages && selectedProduct.galleryImages.length > 0 && (
                    <div className="grid grid-cols-4 gap-2 mb-4">
                      {selectedProduct.galleryImages.map((img, index) => (
                        <div key={index} className="bg-gray-100 rounded-lg overflow-hidden">
                          <img
                            src={img}
                            alt={`Gallery ${index + 1}`}
                            className="w-full h-24 object-cover cursor-pointer hover:opacity-75"
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Description */}
                  <div className="bg-gray-50 rounded-xl p-4">
                    <h3 className="font-bold text-gray-900 mb-2">Description</h3>
                    <p className="text-gray-700 text-sm whitespace-pre-wrap">
                      {selectedProduct.description || 'No description available'}
                    </p>
                  </div>
                </div>

                {/* Right: Product Info */}
                <div>
                  {/* Product Name */}
                  <h1 className="text-3xl font-bold text-gray-900 mb-4">
                    {selectedProduct.name}
                  </h1>

                  {/* Price */}
                  <div className="bg-blue-50 rounded-xl p-4 mb-6">
                    <div className="flex items-baseline space-x-3 mb-2">
                      <span className="text-4xl font-bold text-gray-900">
                        ₹{selectedProduct.price}
                      </span>
                      {selectedProduct.discount?.originalPrice > 0 && (
                        <>
                          <span className="text-xl text-gray-500 line-through">
                            ₹{selectedProduct.discount.originalPrice}
                          </span>
                          <span className="text-xl text-green-600 font-bold">
                            {selectedProduct.discount.percentage}% OFF
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Quantity Selection */}
                  <div className="mb-6">
                    <p className="font-semibold text-gray-900 mb-3">Selected Quantity:</p>
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => setPurchaseQuantity(Math.max(1, purchaseQuantity - 1))}
                        className="p-2 border rounded-lg hover:bg-gray-100"
                      >
                        <Minus size={18} />
                      </button>
                      <span className="text-xl font-bold px-4">{purchaseQuantity}</span>
                      <button
                        onClick={() => setPurchaseQuantity(Math.min(selectedProduct.quantity, purchaseQuantity + 1))}
                        className="p-2 border rounded-lg hover:bg-gray-100"
                      >
                        <Plus size={18} />
                      </button>
                      <span className="text-sm text-gray-600">
                        {selectedProduct.productDetails?.unit || 'units'}
                      </span>
                    </div>
                  </div>

                  {/* Product Highlights */}
                  <div className="bg-gray-50 rounded-xl p-4 mb-6">
                    <h3 className="font-bold text-gray-900 mb-3">Product highlights</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {selectedProduct.productDetails?.brand && (
                        <div>
                          <p className="text-gray-600">Brand</p>
                          <p className="font-semibold">{selectedProduct.productDetails.brand}</p>
                        </div>
                      )}
                      {selectedProduct.productDetails?.type && (
                        <div>
                          <p className="text-gray-600">Type</p>
                          <p className="font-semibold">{selectedProduct.productDetails.type}</p>
                        </div>
                      )}
                      {selectedProduct.productDetails?.maxShelfLife && (
                        <div>
                          <p className="text-gray-600">Maximum Shelf Life</p>
                          <p className="font-semibold">{selectedProduct.productDetails.maxShelfLife}</p>
                        </div>
                      )}
                      {selectedProduct.productDetails?.packOf && (
                        <div>
                          <p className="text-gray-600">Pack of</p>
                          <p className="font-semibold">{selectedProduct.productDetails.packOf}</p>
                        </div>
                      )}
                      {selectedProduct.productDetails?.isPerishable !== undefined && (
                        <div>
                          <p className="text-gray-600">Is Perishable</p>
                          <p className="font-semibold">
                            {selectedProduct.productDetails.isPerishable ? 'Yes' : 'No'}
                          </p>
                        </div>
                      )}
                      {selectedProduct.productDetails?.isOrganic !== undefined && (
                        <div>
                          <p className="text-gray-600">Organic</p>
                          <p className="font-semibold">
                            {selectedProduct.productDetails.isOrganic ? 'Yes' : 'No'}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Add to Cart Button */}
                  <button
                    onClick={() => addToCart(selectedProduct, purchaseQuantity)}
                    className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold text-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
                  >
                    <ShoppingCart size={24} />
                    <span>Add to Cart</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cart Sidebar */}
      {showCart && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-end">
          <div className="bg-white w-full max-w-md h-full overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between z-10">
              <h2 className="text-xl font-bold text-gray-900">
                Shopping Cart ({getTotalItems()} items)
              </h2>
              <button
                onClick={() => setShowCart(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-4">
              {cart.length === 0 ? (
                <div className="text-center py-12">
                  <ShoppingCart size={48} className="mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600">Your cart is empty</p>
                </div>
              ) : (
                <>
                  <div className="space-y-4 mb-6">
                    {cart.map((item) => (
                      <div key={item._id} className="bg-gray-50 rounded-lg p-4">
                        <div className="flex gap-4">
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-20 h-20 object-cover rounded-lg"
                          />
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900 mb-1">{item.name}</h3>
                            <p className="text-sm text-gray-600 mb-2">₹{item.price} each</p>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => updateCartQuantity(item._id, item.quantity - 1)}
                                  className="p-1 border rounded hover:bg-gray-200"
                                >
                                  <Minus size={14} />
                                </button>
                                <span className="font-semibold">{item.quantity}</span>
                                <button
                                  onClick={() => updateCartQuantity(item._id, item.quantity + 1)}
                                  className="p-1 border rounded hover:bg-gray-200"
                                >
                                  <Plus size={14} />
                                </button>
                              </div>
                              <button
                                onClick={() => removeFromCart(item._id)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </div>
                        </div>
                        <div className="mt-2 pt-2 border-t border-gray-200">
                          <p className="text-right font-bold text-gray-900">
                            Subtotal: ₹{item.price * item.quantity}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="border-t pt-4 mb-4">
                    <div className="flex justify-between text-xl font-bold text-gray-900 mb-4">
                      <span>Total:</span>
                      <span>₹{getTotalPrice()}</span>
                    </div>
                    
                    <button
                      onClick={handleCheckout}
                      className="w-full py-4 bg-green-600 text-white rounded-xl font-bold text-lg hover:bg-green-700 transition-colors flex items-center justify-center space-x-2"
                    >
                      <Wallet size={24} />
                      <span>{account ? 'Checkout with MetaMask' : 'Connect MetaMask'}</span>
                    </button>

                    {account && (
                      <p className="text-xs text-gray-600 mt-2 text-center">
                        Connected: {account.slice(0, 6)}...{account.slice(-4)}
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Checkout Modal (Transaction Progress) */}
      {showCheckout && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
              Processing Payment
            </h2>

            <div className="space-y-4 mb-8">
              {steps.map((step, index) => {
                const Icon = step.icon;
                const isActive = index === txStep;
                const isCompleted = index < txStep;
                const isFailed = txStatus === 'error' && index === txStep;

                return (
                  <div
                    key={index}
                    className={`flex items-center space-x-4 p-4 rounded-lg transition-all ${
                      isActive
                        ? 'bg-blue-50 border-2 border-blue-500'
                        : isCompleted
                        ? 'bg-green-50'
                        : isFailed
                        ? 'bg-red-50'
                        : 'bg-gray-50'
                    }`}
                  >
                    <div
                      className={`p-3 rounded-full ${
                        isActive
                          ? 'bg-blue-600 text-white'
                          : isCompleted
                          ? 'bg-green-600 text-white'
                          : isFailed
                          ? 'bg-red-600 text-white'
                          : 'bg-gray-300 text-gray-600'
                      }`}
                    >
                      <Icon size={24} className={isActive ? 'animate-pulse' : ''} />
                    </div>
                    <div>
                      <p
                        className={`font-semibold ${
                          isActive || isCompleted || isFailed
                            ? 'text-gray-900'
                            : 'text-gray-500'
                        }`}
                      >
                        {step.title}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {txStatus === 'success' && (
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 size={32} className="text-green-600" />
                </div>
                <p className="text-xl font-bold text-green-600 mb-2">
                  Purchase Successful!
                </p>
                <p className="text-gray-600">
                  Your transaction has been completed
                </p>
              </div>
            )}

            {txStatus === 'error' && (
              <div className="text-center">
                <p className="text-xl font-bold text-red-600 mb-2">
                  Transaction Failed
                </p>
                <p className="text-gray-600">Please try again</p>
                <button
                  onClick={() => {
                    setShowCheckout(false);
                    setTxStatus(null);
                  }}
                  className="mt-4 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}