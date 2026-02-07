import React, { useState, useEffect } from 'react';
import { 
  ShoppingCart, Package, LogOut, Search, ArrowLeft, 
  Star, Plus, Minus, X, Trash2, Wallet, ShieldCheck,
  Database, CheckCircle2, MapPin, User, Phone, ChevronDown,
  Users, UserCheck, CreditCard
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
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [showAccountSelectModal, setShowAccountSelectModal] = useState(false);
  
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [isMetaMaskInstalled, setIsMetaMaskInstalled] = useState(false);
  const [txStatus, setTxStatus] = useState(null);
  const [txStep, setTxStep] = useState(0);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [loadingAccounts, setLoadingAccounts] = useState(false);

  const [deliveryAddress, setDeliveryAddress] = useState({
    name: '',
    phone: '',
    street: '',
    city: '',
    state: '',
    pincode: ''
  });

  const [productReviews, setProductReviews] = useState({
    reviews: [],
    averageRating: 0,
    totalReviews: 0
  });

  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const steps = [
    { title: "Connecting Wallet", icon: Wallet },
    { title: "Waiting for Signature", icon: ShieldCheck },
    { title: "Mining Transaction", icon: Database },
    { title: "Finalizing Purchase", icon: CheckCircle2 }
  ];

  useEffect(() => {
    const savedCart = localStorage.getItem(`cart_${user._id}`);
    if (savedCart) {
      setCart(JSON.parse(savedCart));
    }

    // Load previously selected account
    const savedAccount = localStorage.getItem(`selected_account_${user._id}`);
    if (savedAccount) {
      setSelectedAccount(savedAccount);
    }
  }, [user._id]);

  useEffect(() => {
    if (cart.length > 0) {
      localStorage.setItem(`cart_${user._id}`, JSON.stringify(cart));
    } else {
      localStorage.removeItem(`cart_${user._id}`);
    }
  }, [cart, user._id]);

  useEffect(() => {
    if (window.ethereum) {
      setIsMetaMaskInstalled(true);
      
      const handleAccountsChanged = (accounts) => {
        if (accounts.length > 0) {
          setAccounts(accounts);
          // If we have a previously selected account that still exists, keep it
          if (selectedAccount && accounts.includes(selectedAccount)) {
            setSelectedAccount(selectedAccount);
            localStorage.setItem(`selected_account_${user._id}`, selectedAccount);
          } else if (accounts.length > 0) {
            // Otherwise select the first account
            setSelectedAccount(accounts[0]);
            localStorage.setItem(`selected_account_${user._id}`, accounts[0]);
          }
        } else {
          setAccounts([]);
          setSelectedAccount(null);
          localStorage.removeItem(`selected_account_${user._id}`);
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
              setAccounts(accounts);
              const savedAccount = localStorage.getItem(`selected_account_${user._id}`);
              if (savedAccount && accounts.includes(savedAccount)) {
                setSelectedAccount(savedAccount);
              } else {
                setSelectedAccount(accounts[0]);
                localStorage.setItem(`selected_account_${user._id}`, accounts[0]);
              }
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
  }, []);

  useEffect(() => {
    if (selectedProduct && showDetailModal) {
      fetchProductReviews(selectedProduct._id);
    }
  }, [selectedProduct, showDetailModal]);

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

  const fetchProductReviews = async (productId) => {
    try {
      const response = await fetch(`${API_URL}/products/${productId}/reviews`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) throw new Error('Failed to fetch reviews');
      
      const data = await response.json();
      setProductReviews(data);
    } catch (error) {
      console.error('Error fetching product reviews:', error);
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

  const fetchAccounts = async () => {
    if (!isMetaMaskInstalled) {
      alert('Please install MetaMask to proceed with checkout');
      window.open('https://metamask.io/download/', '_blank');
      return;
    }

    try {
      setLoadingAccounts(true);
      
      // First request permission to access accounts
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      });
      
      if (accounts && accounts.length > 0) {
        setAccounts(accounts);
        setShowAccountSelectModal(true);
      } else {
        alert('No accounts found in MetaMask. Please add an account.');
      }
    } catch (err) {
      console.error('Error fetching accounts:', err);
      if (err.code === 4001) {
        alert('You rejected the connection request. Please approve to continue.');
      } else {
        alert('Failed to connect to MetaMask');
      }
    } finally {
      setLoadingAccounts(false);
    }
  };

  const selectAccount = (account) => {
    setSelectedAccount(account);
    localStorage.setItem(`selected_account_${user._id}`, account);
    setShowAccountSelectModal(false);
  };

  const disconnectWallet = () => {
    setAccounts([]);
    setSelectedAccount(null);
    localStorage.removeItem(`selected_account_${user._id}`);
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    setLoadingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
          );
          const data = await response.json();
          
          const address = data.address || {};
          
          setDeliveryAddress(prev => ({
            ...prev,
            street: `${address.road || ''} ${address.house_number || ''}`.trim() || data.display_name,
            city: address.city || address.town || address.village || '',
            state: address.state || '',
            pincode: address.postcode || ''
          }));
          
          alert('Location loaded successfully! Please verify the details.');
        } catch (error) {
          console.error('Error getting address:', error);
          alert('Could not fetch address details. Please enter manually.');
        } finally {
          setLoadingLocation(false);
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        setLoadingLocation(false);
        
        if (error.code === error.PERMISSION_DENIED) {
          alert('Location permission denied. Please enable location access in your browser settings.');
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          alert('Location information unavailable. Please enter address manually.');
        } else if (error.code === error.TIMEOUT) {
          alert('Location request timed out. Please try again.');
        } else {
          alert('Unable to get location. Please enter address manually.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  const handleCheckout = async () => {
    if (!selectedAccount) {
      // Show account selection modal
      await fetchAccounts();
      return;
    }

    setShowCart(false);
    setShowAddressModal(true);
  };

  const proceedToPayment = () => {
    if (!deliveryAddress.name || !deliveryAddress.phone || !deliveryAddress.street || 
        !deliveryAddress.city || !deliveryAddress.state || !deliveryAddress.pincode) {
      alert('Please fill in all delivery address fields');
      return;
    }

    setShowAddressModal(false);
    setShowCheckout(true);
    processPayment();
  };

  const processPayment = async () => {
    setTxStatus('processing');
    setTxStep(0);

    try {
      setTxStep(1);
      
      // Check if we still have permission
      const currentAccounts = await window.ethereum.request({ method: 'eth_accounts' });
      if (currentAccounts.length === 0 || !currentAccounts.includes(selectedAccount)) {
        // Re-request permission if needed
        const accounts = await window.ethereum.request({ 
          method: 'eth_requestAccounts' 
        });
        
        if (!accounts.includes(selectedAccount)) {
          // User selected a different account or denied permission
          setShowAccountSelectModal(true);
          setTxStatus(null);
          setTxStep(0);
          return;
        }
      }

      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      console.log('🌐 Current network chainId:', chainId);
      
      const totalAmount = getTotalPrice();
      const ethAmount = (totalAmount * 0.000002).toFixed(6);
      const weiAmount = Math.floor(parseFloat(ethAmount) * 1e18);

      setTxStep(2);
      
      const transactionParameters = {
        to: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
        from: selectedAccount,
        value: '0x' + weiAmount.toString(16),
        gas: '0x5208',
      };

      console.log('📤 Sending transaction:', transactionParameters);

      const txHash = await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [transactionParameters],
      });

      console.log('✅ Transaction submitted! Hash:', txHash);
      console.log(`🔗 View on Etherscan: https://sepolia.etherscan.io/tx/${txHash}`);

      setTxStep(3);
      
      console.log('⏳ Waiting for transaction to be mined...');
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
          console.log('Checking transaction status...', attempts);
          await new Promise(resolve => setTimeout(resolve, 1000));
          attempts++;
        }
      }

      if (!receipt) {
        console.log('⚠️ Transaction is taking longer than expected, but it should be confirmed soon.');
        console.log('Proceeding with order creation...');
      }

      const orderItems = cart.map(item => ({
        product: item._id,
        quantity: item.quantity,
        price: item.price
      }));

      const response = await fetch(`${API_URL}/orders/create`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          items: orderItems,
          totalAmount: getTotalPrice(),
          deliveryAddress,
          paymentDetails: {
            walletAddress: selectedAccount,
            paymentMethod: 'metamask',
            transactionHash: txHash,
            blockchainReceipt: receipt,
            network: chainId,
            amountInEth: ethAmount,
            amountInWei: weiAmount.toString()
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Backend error:', errorData);
        throw new Error(errorData.message || 'Failed to create order');
      }

      const data = await response.json();
      console.log('✅ Order created successfully:', data);

      setTxStatus('success');
      
      setTimeout(() => {
        setCart([]);
        localStorage.removeItem(`cart_${user._id}`);
        setShowCheckout(false);
        setTxStatus(null);
        setTxStep(0);
        alert(`Order placed successfully!\n\nOrder Number: ${data.orderNumber}\nTransaction Hash: ${txHash}`);
        navigate('/customer/orders');
      }, 2000);

    } catch (error) {
      console.error('❌ Transaction error:', error);
      setTxStatus('error');
      setTimeout(() => {
        setShowCheckout(false);
        setTxStatus(null);
        setTxStep(0);
        
        let errorMessage = 'Payment failed. Please try again.';
        if (error.message.includes('User denied')) {
          errorMessage = 'Transaction rejected. You cancelled the transaction.';
        } else if (error.message.includes('insufficient funds')) {
          errorMessage = 'Insufficient funds in your wallet.';
        } else if (error.message.includes('Wallet connection required')) {
          errorMessage = 'Please connect your MetaMask wallet.';
        }
        
        alert(errorMessage);
      }, 2000);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem(`cart_${user._id}`);
    localStorage.removeItem(`selected_account_${user._id}`);
    window.location.href = '/login';
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (product.description && product.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const formatAddress = (address) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

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
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <LogOut size={20} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Package className="animate-spin text-blue-600" size={48} />
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-20">
            <Package size={64} className="mx-auto text-gray-400 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No products found</h2>
            <p className="text-gray-600">Try adjusting your search</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredProducts.map((product) => (
              <div
                key={product._id}
                className="bg-white rounded-2xl shadow-sm overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => fetchProductDetail(product._id)}
              >
                <div className="aspect-square bg-gray-100 overflow-hidden">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover hover:scale-105 transition-transform"
                  />
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-gray-900 mb-2 line-clamp-2">{product.name}</h3>
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">{product.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-blue-600">₹{product.price}</span>
                    <div className="text-sm text-gray-600">
                      <Package size={14} className="inline mr-1" />
                      {product.quantity} available
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Product Detail Modal */}
      {showDetailModal && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between z-10">
              <h2 className="text-2xl font-bold text-gray-900">Product Details</h2>
              <button
                onClick={() => setShowDetailModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6">
              <div className="grid md:grid-cols-2 gap-8">
                {/* Product Images */}
                <div>
                  <div className="aspect-square bg-gray-100 rounded-2xl overflow-hidden mb-4">
                    <img
                      src={selectedProduct.image}
                      alt={selectedProduct.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {selectedProduct.galleryImages && selectedProduct.galleryImages.length > 0 && (
                    <div className="grid grid-cols-4 gap-2">
                      {selectedProduct.galleryImages.map((img, idx) => (
                        <div key={idx} className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                          <img src={img} alt={`Gallery ${idx + 1}`} className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Product Info */}
                <div>
                  <h3 className="text-3xl font-bold text-gray-900 mb-4">{selectedProduct.name}</h3>
                  <p className="text-gray-600 mb-6">{selectedProduct.description}</p>

                  {/* Product Rating */}
                  <div className="flex items-center mb-4">
                    <div className="flex items-center mr-4">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          size={20}
                          className={
                            star <= Math.floor(productReviews.averageRating)
                              ? 'fill-yellow-400 text-yellow-400'
                              : star <= productReviews.averageRating
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-gray-300'
                          }
                        />
                      ))}
                      <span className="ml-2 font-semibold text-gray-700">
                        {productReviews.averageRating}/5
                      </span>
                    </div>
                    <span className="text-gray-600 text-sm">
                      ({productReviews.totalReviews} reviews)
                    </span>
                  </div>

                  <div className="mb-6">
                    <div className="flex items-baseline space-x-3 mb-4">
                      <span className="text-4xl font-bold text-blue-600">₹{selectedProduct.price}</span>
                      <span className="text-gray-600">per unit</span>
                    </div>
                    <div className="text-sm text-gray-600">
                      <Package size={16} className="inline mr-2" />
                      {selectedProduct.quantity} units available
                    </div>
                  </div>

                  {/* Quantity Selector */}
                  <div className="mb-6">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Quantity</label>
                    <div className="flex items-center space-x-4">
                      <button
                        onClick={() => setPurchaseQuantity(Math.max(1, purchaseQuantity - 1))}
                        className="w-10 h-10 border rounded-lg hover:bg-gray-100 flex items-center justify-center"
                      >
                        <Minus size={20} />
                      </button>
                      <span className="text-2xl font-bold w-16 text-center">{purchaseQuantity}</span>
                      <button
                        onClick={() => setPurchaseQuantity(Math.min(selectedProduct.quantity, purchaseQuantity + 1))}
                        className="w-10 h-10 border rounded-lg hover:bg-gray-100 flex items-center justify-center"
                      >
                        <Plus size={20} />
                      </button>
                    </div>
                    <p className="text-sm text-gray-600 mt-2">
                      Total: ₹{(selectedProduct.price * purchaseQuantity).toFixed(2)}
                    </p>
                  </div>

                  {/* Product Details */}
                  <div className="space-y-3 mb-6">
                    <h4 className="font-semibold text-gray-900">Product Information</h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      {selectedProduct.productDetails?.brand && (
                        <div>
                          <p className="text-gray-600">Brand</p>
                          <p className="font-semibold">{selectedProduct.productDetails.brand}</p>
                        </div>
                      )}
                      {selectedProduct.productDetails?.category && (
                        <div>
                          <p className="text-gray-600">Category</p>
                          <p className="font-semibold">{selectedProduct.productDetails.category}</p>
                        </div>
                      )}
                      {selectedProduct.productDetails?.weight && (
                        <div>
                          <p className="text-gray-600">Weight</p>
                          <p className="font-semibold">{selectedProduct.productDetails.weight}</p>
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
                    className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold text-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2 mb-6"
                  >
                    <ShoppingCart size={24} />
                    <span>Add to Cart</span>
                  </button>

                  {/* Product Reviews Section */}
                  <div className="border-t pt-6">
                    <h4 className="font-semibold text-gray-900 mb-4">Customer Reviews</h4>
                    
                    {productReviews.reviews.length === 0 ? (
                      <div className="text-center py-8">
                        <Star size={40} className="mx-auto text-gray-300 mb-3" />
                        <p className="text-gray-600">No reviews yet. Be the first to review!</p>
                      </div>
                    ) : (
                      <div className="space-y-4 max-h-60 overflow-y-auto pr-2">
                        {productReviews.reviews.map((review, idx) => (
                          <div key={idx} className="bg-gray-50 p-4 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Star
                                    key={star}
                                    size={16}
                                    className={
                                      star <= review.rating
                                        ? 'fill-yellow-400 text-yellow-400 mr-1'
                                        : 'text-gray-300 mr-1'
                                    }
                                  />
                                ))}
                              </div>
                              <span className="text-sm text-gray-500">
                                {new Date(review.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="font-medium text-gray-900">{review.customerName}</p>
                            {review.comment && (
                              <p className="text-gray-600 text-sm mt-2">{review.comment}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
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
                    
                    {/* Wallet Connection Section */}
                    {selectedAccount ? (
                      <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <Wallet size={18} className="text-green-600" />
                            <span className="text-sm font-semibold text-green-900">MetaMask Connected</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => setShowAccountSelectModal(true)}
                              className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
                            >
                              Switch Account
                            </button>
                            <button
                              onClick={disconnectWallet}
                              className="text-xs text-red-600 hover:text-red-800 font-semibold"
                            >
                              Disconnect
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 mt-2">
                          <UserCheck size={14} className="text-gray-500" />
                          <p className="text-xs font-medium text-gray-700">
                            {formatAddress(selectedAccount)}
                          </p>
                        </div>
                        {accounts.length > 1 && (
                          <p className="text-xs text-gray-500 mt-1">
                            {accounts.length - 1} other account{accounts.length > 2 ? 's' : ''} available
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <div className="flex items-center space-x-2 mb-2">
                          <Wallet size={18} className="text-yellow-600" />
                          <span className="text-sm font-semibold text-yellow-900">Wallet Not Connected</span>
                        </div>
                        <p className="text-xs text-gray-600 mb-3">
                          Connect your MetaMask wallet to proceed with checkout
                        </p>
                        <button
                          onClick={fetchAccounts}
                          disabled={loadingAccounts}
                          className="w-full py-2 bg-yellow-600 text-white rounded-lg font-semibold hover:bg-yellow-700 transition text-sm flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {loadingAccounts ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                              <span>Connecting...</span>
                            </>
                          ) : (
                            <>
                              <Wallet size={16} />
                              <span>Connect MetaMask</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                    
                    <button
                      onClick={handleCheckout}
                      disabled={!selectedAccount}
                      className="w-full py-4 bg-green-600 text-white rounded-xl font-bold text-lg hover:bg-green-700 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <CreditCard size={24} />
                      <span>Checkout with MetaMask</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Account Selection Modal */}
      {showAccountSelectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <Users size={24} className="text-blue-600" />
                <h2 className="text-2xl font-bold text-gray-900">Select Account</h2>
              </div>
              <button
                onClick={() => setShowAccountSelectModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X size={24} />
              </button>
            </div>

            <p className="text-gray-600 mb-6 text-center">
              Choose which MetaMask account to use for this transaction
            </p>

            {loadingAccounts ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-gray-600 mt-4">Loading accounts...</p>
              </div>
            ) : accounts.length === 0 ? (
              <div className="text-center py-12">
                <Users size={48} className="mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600">No accounts found</p>
                <p className="text-sm text-gray-500 mt-2">Please add accounts to your MetaMask wallet</p>
              </div>
            ) : (
              <div className="space-y-3 mb-6 max-h-60 overflow-y-auto pr-2">
                {accounts.map((account, index) => (
                  <button
                    key={account}
                    onClick={() => selectAccount(account)}
                    className={`w-full p-4 rounded-xl flex items-center space-x-4 transition-all ${
                      selectedAccount === account
                        ? 'bg-blue-50 border-2 border-blue-500'
                        : 'border border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                    }`}
                  >
                    <div className={`p-3 rounded-full ${selectedAccount === account ? 'bg-blue-600' : 'bg-gray-200'}`}>
                      <UserCheck size={20} className={selectedAccount === account ? 'text-white' : 'text-gray-600'} />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-gray-900">
                          Account {index + 1}
                        </h3>
                        {selectedAccount === account && (
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                            Selected
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 font-mono">{formatAddress(account)}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            <div className="bg-blue-50 p-4 rounded-lg mb-6">
              <p className="text-sm text-blue-800 text-center">
                You can switch between accounts in MetaMask and refresh this page to see updated accounts
              </p>
            </div>

            <button
              onClick={() => setShowAccountSelectModal(false)}
              className="w-full py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition"
            >
              {selectedAccount ? 'Continue with Selected Account' : 'Cancel'}
            </button>
          </div>
        </div>
      )}

      {/* Delivery Address Modal */}
      {showAddressModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-8 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Delivery Address</h2>
            
            {selectedAccount && (
              <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Wallet size={18} className="text-green-600" />
                  <span className="text-sm font-semibold text-green-900">Connected Account:</span>
                  <span className="text-sm font-mono text-gray-700">{formatAddress(selectedAccount)}</span>
                </div>
              </div>
            )}
            
            <button
              onClick={getCurrentLocation}
              disabled={loadingLocation}
              className="w-full mb-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <MapPin size={20} />
              <span>{loadingLocation ? 'Getting Location...' : '📍 Use Current Location'}</span>
            </button>
            
            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Full Name *
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="text"
                      value={deliveryAddress.name}
                      onChange={(e) => setDeliveryAddress({...deliveryAddress, name: e.target.value})}
                      placeholder="John Doe"
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Phone Number *
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="tel"
                      value={deliveryAddress.phone}
                      onChange={(e) => setDeliveryAddress({...deliveryAddress, phone: e.target.value})}
                      placeholder="+91 9876543210"
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Street Address *
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 text-gray-400" size={18} />
                  <input
                    type="text"
                    value={deliveryAddress.street}
                    onChange={(e) => setDeliveryAddress({...deliveryAddress, street: e.target.value})}
                    placeholder="123 Main Street, Apartment 4B"
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    City *
                  </label>
                  <input
                    type="text"
                    value={deliveryAddress.city}
                    onChange={(e) => setDeliveryAddress({...deliveryAddress, city: e.target.value})}
                    placeholder="Mumbai"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    State *
                  </label>
                  <input
                    type="text"
                    value={deliveryAddress.state}
                    onChange={(e) => setDeliveryAddress({...deliveryAddress, state: e.target.value})}
                    placeholder="Maharashtra"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    PIN Code *
                  </label>
                  <input
                    type="text"
                    value={deliveryAddress.pincode}
                    onChange={(e) => setDeliveryAddress({...deliveryAddress, pincode: e.target.value})}
                    placeholder="400001"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="mt-8 bg-gray-50 p-4 rounded-lg">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Items ({getTotalItems()})</span>
                <span>₹{getTotalPrice()}</span>
              </div>
              <div className="flex justify-between text-lg font-bold text-gray-900 pt-2 border-t">
                <span>Total Amount</span>
                <span>₹{getTotalPrice()}</span>
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowAddressModal(false);
                  setShowCart(true);
                }}
                className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
              >
                Back to Cart
              </button>
              <button
                onClick={proceedToPayment}
                className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
              >
                Proceed to Payment
              </button>
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

            <div className="mb-4 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center space-x-2">
                <Wallet size={18} className="text-blue-600" />
                <span className="text-sm font-semibold text-blue-900">Using Account:</span>
                <span className="text-sm font-mono text-gray-700">{formatAddress(selectedAccount)}</span>
              </div>
            </div>

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
                  Order Placed Successfully!
                </p>
                <p className="text-gray-600">
                  Redirecting to orders page...
                </p>
              </div>
            )}

            {txStatus === 'error' && (
              <div className="text-center">
                <p className="text-xl font-bold text-red-600 mb-2">
                  Payment Failed
                </p>
                <p className="text-gray-600">Please try again</p>
                <button
                  onClick={() => {
                    setShowCheckout(false);
                    setTxStatus(null);
                    setShowCart(true);
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