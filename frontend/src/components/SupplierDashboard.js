import React, { useState, useEffect, useCallback } from 'react';
import { 
  Package, Plus, LayoutDashboard, Truck, LogOut, 
  Edit, Trash2, Box, X, Image as ImageIcon, Loader2, ArrowRight,
  Receipt, DollarSign, CheckCircle, ExternalLink, Calendar, User,
  ShoppingCart, Archive, Tag
} from 'lucide-react';

// Ensure this matches your backend port exactly
const API_URL = 'http://localhost:5000/api';

export default function SupplierDashboard() {
  const [products, setProducts] = useState([]);
  const [purchasedMaterials, setPurchasedMaterials] = useState([]);
  const [paymentReceipts, setPaymentReceipts] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [activeSection, setActiveSection] = useState('inventory');
  const [loading, setLoading] = useState(false);
  
  // Form States
  const [image, setImage] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    quantity: '',
    price: ''
  });

  // Fetch only the products belonging to this supplier
  const fetchMyProducts = useCallback(async () => {
    const storedToken = localStorage.getItem('token');
    
    if (!storedToken) {
      console.warn("⚠️ No token found. Redirecting to login or stopping fetch.");
      return;
    }
    
    setLoading(true);
    try {
      console.log("🔍 Fetching products from:", `${API_URL}/products/mine`);
      
      const response = await fetch(`${API_URL}/products/mine`, { 
        headers: { 
          'Authorization': `Bearer ${storedToken}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text(); 
        console.error(`❌ Server Error ${response.status}:`, errorText);
        // If unauthorized, clear local storage and redirect
        if (response.status === 401 || response.status === 403) {
          handleLogout();
        }
        return;
      }

      const data = await response.json();
      console.log("✅ Data received:", data);
      
      // Ensure we always set an array
      setProducts(Array.isArray(data) ? data : (data.products || []));
    } catch (err) {
      console.error('❌ Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Run fetch on mount
  useEffect(() => {
    fetchMyProducts();
  }, [fetchMyProducts]);

  // Fetch payment receipts (transactions where this supplier sold materials)
  const fetchPaymentReceipts = useCallback(async () => {
    const storedToken = localStorage.getItem('token');
    
    if (!storedToken) {
      console.warn("⚠️ No token found for fetching receipts.");
      return;
    }
    
    try {
      console.log("🧾 Fetching payment receipts from:", `${API_URL}/supplier/receipts`);
      
      const response = await fetch(`${API_URL}/supplier/receipts`, { 
        headers: { 
          'Authorization': `Bearer ${storedToken}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text(); 
        console.error(`❌ Server Error ${response.status}:`, errorText);
        if (response.status === 401 || response.status === 403) {
          handleLogout();
        }
        return;
      }

      const data = await response.json();
      console.log("✅ Payment receipts received:", data);
      
      setPaymentReceipts(Array.isArray(data) ? data : (data.receipts || []));
    } catch (err) {
      console.error('❌ Fetch receipts error:', err);
    }
  }, []);

  // Fetch purchased materials (materials that have been sold)
  const fetchPurchasedMaterials = useCallback(async () => {
    const storedToken = localStorage.getItem('token');
    
    if (!storedToken) {
      console.warn("⚠️ No token found for fetching purchased materials.");
      return;
    }
    
    try {
      console.log("📦 Fetching purchased materials from:", `${API_URL}/supplier/purchased-materials`);
      
      const response = await fetch(`${API_URL}/supplier/purchased-materials`, { 
        headers: { 
          'Authorization': `Bearer ${storedToken}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text(); 
        console.error(`❌ Server Error ${response.status}:`, errorText);
        if (response.status === 401 || response.status === 403) {
          handleLogout();
        }
        return;
      }

      const data = await response.json();
      console.log("✅ Purchased materials received:", data);
      
      setPurchasedMaterials(Array.isArray(data) ? data : (data.materials || []));
    } catch (err) {
      console.error('❌ Fetch purchased materials error:', err);
    }
  }, []);

  // Run fetch on mount
  useEffect(() => {
    fetchMyProducts();
    fetchPurchasedMaterials();
    fetchPaymentReceipts();
  }, [fetchMyProducts, fetchPurchasedMaterials, fetchPaymentReceipts]);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Filter products to show only those NOT purchased (not in purchasedMaterials)
  const getAvailableProducts = () => {
    const purchasedProductIds = purchasedMaterials.map(pm => pm.productId?.toString() || pm.originalProductId?.toString());
    return products.filter(product => !purchasedProductIds.includes(product._id?.toString()));
  };

  // Get available (unpurchased) products
  const availableProducts = getAvailableProducts();

  const handleAddProduct = async (e) => {
    e.preventDefault();
    const storedToken = localStorage.getItem('token');
    
    if (!image) return alert('Please upload an image');
    
    setLoading(true);
    const data = new FormData();
    data.append('name', formData.name);
    data.append('quantity', formData.quantity);
    data.append('price', formData.price);
    data.append('image', image);

    try {
      const response = await fetch(`${API_URL}/products`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${storedToken}` },
        body: data
      });

      if (response.ok) {
        const newProduct = await response.json();
        console.log("✅ Product added successfully:", newProduct);
        
        // Optimistic UI update
        setProducts(prev => [newProduct, ...prev]);
        
        setShowAddModal(false);
        setFormData({ name: '', quantity: '', price: '' });
        setImage(null);
        
        // Refresh full list from server to ensure database sync
        setTimeout(() => fetchMyProducts(), 300);
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to add material');
      }
    } catch (err) {
      console.error('Error adding product:', err);
      alert('Connection error while adding material');
    } finally {
      setLoading(false);
    }
  };

  const handleEditProduct = async (e) => {
    e.preventDefault();
    const storedToken = localStorage.getItem('token');
    
    setLoading(true);
    const data = new FormData();
    data.append('name', formData.name);
    data.append('quantity', formData.quantity);
    data.append('price', formData.price);
    if (image) data.append('image', image);

    try {
      const response = await fetch(`${API_URL}/products/${editingProduct._id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${storedToken}` },
        body: data
      });

      if (response.ok) {
        const updatedProduct = await response.json();
        setProducts(prev => prev.map(p => p._id === updatedProduct._id ? updatedProduct : p));
        
        setShowEditModal(false);
        setEditingProduct(null);
        setImage(null);
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to update material');
      }
    } catch (err) {
      console.error('Error updating product:', err);
      alert('Connection error while updating material');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduct = async (id) => {
    const storedToken = localStorage.getItem('token');
    if (!window.confirm('Are you sure you want to delete this material?')) return;
    
    try {
      const response = await fetch(`${API_URL}/products/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${storedToken}` }
      });

      if (response.ok) {
        setProducts(prev => prev.filter(p => p._id !== id));
      } else {
        alert('Failed to delete material');
      }
    } catch (err) {
      console.error('Error deleting product:', err);
      alert('Error deleting material');
    }
  };

  const handleDeleteReceipt = async (receiptId) => {
    const storedToken = localStorage.getItem('token');
    if (!window.confirm('Are you sure you want to delete this payment receipt? This action cannot be undone.')) return;
    
    try {
      const response = await fetch(`${API_URL}/supplier/receipts/${receiptId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${storedToken}` }
      });

      if (response.ok) {
        setPaymentReceipts(prev => prev.filter(r => r._id !== receiptId));
        alert('Receipt deleted successfully');
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to delete receipt');
      }
    } catch (err) {
      console.error('Error deleting receipt:', err);
      alert('Error deleting receipt');
    }
  };

  const openEditModal = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      quantity: product.quantity,
      price: product.price
    });
    setShowEditModal(true);
  };

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = '/login';
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-lg p-6 flex flex-col justify-between fixed h-full z-10">
        <div>
          <div className="flex items-center space-x-2 mb-8">
            <Truck className="text-blue-600" size={32} />
            <h1 className="text-xl font-bold text-gray-900">Supplier Hub</h1>
          </div>

          <nav className="space-y-2">
            <button
              onClick={() => setActiveSection('inventory')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition ${
                activeSection === 'inventory' ? 'bg-blue-50 text-blue-600 shadow-sm' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <LayoutDashboard size={20} />
              <span className="font-medium">Inventory Overview</span>
            </button>
            <button
              onClick={() => setActiveSection('materials')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition ${
                activeSection === 'materials' ? 'bg-blue-50 text-blue-600 shadow-sm' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Package size={20} />
              <span className="font-medium">Manage Materials</span>
            </button>
            <button
              onClick={() => setActiveSection('purchased')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition ${
                activeSection === 'purchased' ? 'bg-blue-50 text-blue-600 shadow-sm' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <ShoppingCart size={20} />
              <span className="font-medium">Purchased Materials</span>
            </button>
            <button
              onClick={() => setActiveSection('payments')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition ${
                activeSection === 'payments' ? 'bg-blue-50 text-blue-600 shadow-sm' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Receipt size={20} />
              <span className="font-medium">Payment Receipts</span>
            </button>
          </nav>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center space-x-2 text-red-600 hover:bg-red-50 p-3 rounded-lg transition"
        >
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </div>

      {/* Main Content */}
      <div className="ml-64 flex-1">
        {loading && products.length === 0 ? (
          <div className="flex items-center justify-center h-screen">
            <Loader2 className="animate-spin text-blue-600" size={48} />
          </div>
        ) : (
          <div className="p-8">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900">
                {activeSection === 'inventory' ? 'Inventory Overview' : 
                 activeSection === 'materials' ? 'Manage Materials' : 
                 activeSection === 'purchased' ? 'Purchased Materials' :
                 'Payment Receipts'}
              </h2>
              {(activeSection === 'materials' || activeSection === 'inventory') && (
                <button
                  onClick={() => setShowAddModal(true)}
                  className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition shadow-lg"
                >
                  <Plus size={20} />
                  <span>Add New Material</span>
                </button>
              )}
            </div>

            {/* Stats Cards */}
            {activeSection === 'inventory' && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 bg-blue-50 rounded-xl">
                        <Box className="text-blue-600" size={24} />
                      </div>
                      <span className="text-3xl font-bold text-gray-900">{availableProducts.length}</span>
                    </div>
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Total Materials Listed</h3>
                  </div>

                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 bg-green-50 rounded-xl">
                        <Package className="text-green-600" size={24} />
                      </div>
                      <span className="text-3xl font-bold text-gray-900">
                        {availableProducts.reduce((sum, p) => sum + Number(p.quantity), 0)}
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Total Stock Units</h3>
                  </div>

                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 bg-purple-50 rounded-xl">
                        <Truck className="text-purple-600" size={24} />
                      </div>
                      <span className="text-3xl font-bold text-gray-900">
                        ${availableProducts.reduce((sum, p) => sum + (Number(p.price) * Number(p.quantity)), 0).toFixed(2)}
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Total Inventory Value</h3>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {availableProducts.map(product => (
                    <div key={product._id} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition">
                      <img src={product.image} alt={product.name} className="w-full h-48 object-cover" />
                      <div className="p-6">
                        <h3 className="text-xl font-bold text-gray-900 mb-2">{product.name}</h3>
                        <div className="space-y-2 mb-4">
                          <p className="text-sm text-gray-600">
                            Stock: <span className="font-semibold text-gray-900">{product.quantity} units</span>
                          </p>
                          <p className="text-sm text-gray-600">
                            Price: <span className="font-semibold text-gray-900">${product.price}</span>
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => openEditModal(product)}
                            className="flex-1 flex items-center justify-center space-x-2 bg-blue-50 text-blue-600 px-4 py-2 rounded-lg font-semibold hover:bg-blue-100 transition"
                          >
                            <Edit size={16} />
                            <span>Edit</span>
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(product._id)}
                            className="flex-1 flex items-center justify-center space-x-2 bg-red-50 text-red-600 px-4 py-2 rounded-lg font-semibold hover:bg-red-100 transition"
                          >
                            <Trash2 size={16} />
                            <span>Delete</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Table View */}
            {activeSection === 'materials' && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Material Details</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Stock</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Price</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {availableProducts.map(product => (
                      <tr key={product._id} className="hover:bg-gray-50 transition">
                        <td className="px-6 py-4 flex items-center space-x-4">
                          <img src={product.image} className="w-12 h-12 rounded-xl object-cover" alt="" />
                          <div className="font-bold text-gray-900">{product.name}</div>
                        </td>
                        <td className="px-6 py-4 font-semibold text-gray-600">{product.quantity} units</td>
                        <td className="px-6 py-4 font-bold text-gray-900">${product.price}</td>
                        <td className="px-6 py-4 text-right space-x-2">
                          <button onClick={() => openEditModal(product)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">
                            <Edit size={18} />
                          </button>
                          <button onClick={() => handleDeleteProduct(product._id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
                            <Trash2 size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Purchased Materials Section */}
            {activeSection === 'purchased' && (
              <>
                {/* Stats Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <div className="bg-gradient-to-br from-orange-50 to-amber-50 p-6 rounded-2xl shadow-sm border border-orange-100">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 bg-white rounded-xl shadow-sm">
                        <ShoppingCart className="text-orange-600" size={24} />
                      </div>
                      <span className="text-3xl font-bold text-gray-900">{purchasedMaterials.length}</span>
                    </div>
                    <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Materials Sold</h3>
                  </div>

                  <div className="bg-gradient-to-br from-teal-50 to-cyan-50 p-6 rounded-2xl shadow-sm border border-teal-100">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 bg-white rounded-xl shadow-sm">
                        <Archive className="text-teal-600" size={24} />
                      </div>
                      <span className="text-3xl font-bold text-gray-900">
                        {purchasedMaterials.reduce((sum, m) => sum + (m.quantity || 0), 0)}
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Total Units Sold</h3>
                  </div>

                  <div className="bg-gradient-to-br from-emerald-50 to-green-50 p-6 rounded-2xl shadow-sm border border-emerald-100">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 bg-white rounded-xl shadow-sm">
                        <DollarSign className="text-emerald-600" size={24} />
                      </div>
                      <span className="text-3xl font-bold text-gray-900">
                        ${purchasedMaterials.reduce((sum, m) => sum + (m.price * m.quantity), 0).toFixed(2)}
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Total Value Sold</h3>
                  </div>
                </div>

                {/* Purchased Materials Grid */}
                {purchasedMaterials.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {purchasedMaterials.map((material) => (
                      <div key={material._id} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition">
                        <div className="relative">
                          <img src={material.image} alt={material.productName} className="w-full h-48 object-cover" />
                          <div className="absolute top-3 right-3">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-green-500 text-white shadow-lg">
                              <CheckCircle size={12} className="mr-1" />
                              SOLD
                            </span>
                          </div>
                        </div>
                        <div className="p-6">
                          <h3 className="text-xl font-bold text-gray-900 mb-3">{material.productName}</h3>
                          
                          <div className="space-y-2 mb-4">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">Buyer:</span>
                              <span className="font-bold text-gray-900">{material.manufacturerName}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">Quantity Sold:</span>
                              <span className="font-bold text-gray-900">{material.quantity} units</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">Price per Unit:</span>
                              <span className="font-bold text-gray-900">${material.price}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">Total Amount:</span>
                              <span className="font-bold text-green-600 text-lg">${(material.price * material.quantity).toFixed(2)}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm pt-2 border-t border-gray-100">
                              <span className="text-gray-600">Date Purchased:</span>
                              <span className="font-medium text-gray-700">
                                {new Date(material.purchasedAt).toLocaleDateString('en-US', { 
                                  month: 'short', 
                                  day: 'numeric', 
                                  year: 'numeric' 
                                })}
                              </span>
                            </div>
                          </div>

                          {material.txHash && (
                            <a
                              href={`https://etherscan.io/tx/${material.txHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-center space-x-2 w-full bg-blue-50 text-blue-600 px-4 py-2.5 rounded-lg font-semibold hover:bg-blue-100 transition group"
                            >
                              <ExternalLink size={16} />
                              <span>View on Blockchain</span>
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white p-20 rounded-3xl border-2 border-dashed border-gray-200 text-center">
                    <ShoppingCart className="mx-auto text-gray-300 mb-6" size={64} />
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">No Purchased Materials Yet</h3>
                    <p className="text-gray-500 mb-6">When manufacturers buy your materials, they will appear here.</p>
                    <div className="inline-flex items-center space-x-2 px-6 py-3 bg-orange-50 text-orange-600 rounded-lg font-medium">
                      <Archive size={20} />
                      <span>Materials are tracked on blockchain</span>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Payment Receipts Section */}
            {activeSection === 'payments' && (
              <>
                {/* Stats Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-2xl shadow-sm border border-green-100">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 bg-white rounded-xl shadow-sm">
                        <Receipt className="text-green-600" size={24} />
                      </div>
                      <span className="text-3xl font-bold text-gray-900">{paymentReceipts.length}</span>
                    </div>
                    <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Total Receipts</h3>
                  </div>

                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-2xl shadow-sm border border-blue-100">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 bg-white rounded-xl shadow-sm">
                        <DollarSign className="text-blue-600" size={24} />
                      </div>
                      <span className="text-3xl font-bold text-gray-900">
                        ${paymentReceipts.reduce((sum, r) => sum + (r.amount || 0), 0).toFixed(2)}
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Total Revenue</h3>
                  </div>

                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-6 rounded-2xl shadow-sm border border-purple-100">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 bg-white rounded-xl shadow-sm">
                        <CheckCircle className="text-purple-600" size={24} />
                      </div>
                      <span className="text-3xl font-bold text-gray-900">
                        {paymentReceipts.filter(r => r.status === 'completed').length}
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Completed Sales</h3>
                  </div>
                </div>

                {/* Receipts Table */}
                {paymentReceipts.length > 0 ? (
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                          <tr>
                            <th className="px-6 py-4 text-xs font-bold text-gray-600 uppercase tracking-widest">
                              <div className="flex items-center space-x-2">
                                <Package size={14} />
                                <span>Product</span>
                              </div>
                            </th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-600 uppercase tracking-widest">
                              <div className="flex items-center space-x-2">
                                <User size={14} />
                                <span>Buyer</span>
                              </div>
                            </th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-600 uppercase tracking-widest">
                              <div className="flex items-center space-x-2">
                                <DollarSign size={14} />
                                <span>Amount</span>
                              </div>
                            </th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-600 uppercase tracking-widest">Quantity</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-600 uppercase tracking-widest">
                              <div className="flex items-center space-x-2">
                                <Calendar size={14} />
                                <span>Date</span>
                              </div>
                            </th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-600 uppercase tracking-widest">Status</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-600 uppercase tracking-widest">Blockchain</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-600 uppercase tracking-widest text-center">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {paymentReceipts.map((receipt, idx) => (
                            <tr key={receipt._id || idx} className="hover:bg-blue-50/30 transition-colors">
                              <td className="px-6 py-4">
                                <div className="font-bold text-gray-900">{receipt.productName}</div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-sm text-gray-700 font-medium">{receipt.buyerName}</div>
                                <div className="text-xs text-gray-500">Manufacturer</div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="font-bold text-green-600 text-lg">${receipt.amount?.toFixed(2)}</div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="font-semibold text-gray-700">{receipt.quantity} units</div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-sm text-gray-600">
                                  {new Date(receipt.timestamp).toLocaleDateString('en-US', { 
                                    month: 'short', 
                                    day: 'numeric', 
                                    year: 'numeric' 
                                  })}
                                </div>
                                <div className="text-xs text-gray-400">
                                  {new Date(receipt.timestamp).toLocaleTimeString('en-US', { 
                                    hour: '2-digit', 
                                    minute: '2-digit' 
                                  })}
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                                  receipt.status === 'completed' 
                                    ? 'bg-green-100 text-green-700 border border-green-200' 
                                    : receipt.status === 'pending'
                                    ? 'bg-yellow-100 text-yellow-700 border border-yellow-200'
                                    : 'bg-red-100 text-red-700 border border-red-200'
                                }`}>
                                  {receipt.status === 'completed' && <CheckCircle size={12} className="mr-1" />}
                                  {receipt.status?.toUpperCase()}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                {receipt.txHash && (
                                  <a
                                    href={`https://etherscan.io/tx/${receipt.txHash}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 transition group"
                                  >
                                    <div className="flex items-center space-x-1 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition">
                                      <ExternalLink size={14} />
                                      <span className="text-xs font-medium">View TX</span>
                                    </div>
                                  </a>
                                )}
                              </td>
                              <td className="px-6 py-4 text-center">
                                <button
                                  onClick={() => handleDeleteReceipt(receipt._id)}
                                  className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition"
                                  title="Delete receipt"
                                >
                                  <Trash2 size={18} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white p-20 rounded-3xl border-2 border-dashed border-gray-200 text-center">
                    <Receipt className="mx-auto text-gray-300 mb-6" size={64} />
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">No Payment Receipts Yet</h3>
                    <p className="text-gray-500 mb-6">When manufacturers purchase your materials, payment receipts will appear here.</p>
                    <div className="inline-flex items-center space-x-2 px-6 py-3 bg-blue-50 text-blue-600 rounded-lg font-medium">
                      <CheckCircle size={20} />
                      <span>All transactions are verified on blockchain</span>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Empty State */}
            {availableProducts.length === 0 && !loading && activeSection === 'inventory' && (
              <div className="bg-white p-20 rounded-3xl border-2 border-dashed border-gray-200 text-center">
                <Box className="mx-auto text-gray-300 mb-6" size={64} />
                <h3 className="text-2xl font-bold text-gray-900 mb-2">No Available Materials</h3>
                <p className="text-gray-500 mb-4">
                  {purchasedMaterials.length > 0 
                    ? "All your materials have been purchased! Check the 'Purchased Materials' section." 
                    : "Add your first material to start selling to manufacturers."}
                </p>
              </div>
            )}
            {availableProducts.length === 0 && !loading && activeSection === 'materials' && (
              <div className="bg-white p-20 rounded-3xl border-2 border-dashed border-gray-200 text-center">
                <Box className="mx-auto text-gray-300 mb-6" size={64} />
                <h3 className="text-2xl font-bold text-gray-900 mb-2">No Available Materials</h3>
                <p className="text-gray-500 mb-4">
                  {purchasedMaterials.length > 0 
                    ? "All your materials have been purchased! Check the 'Purchased Materials' section." 
                    : "Add your first material to start selling to manufacturers."}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal */}
      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[100] backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full relative">
            <button 
              onClick={() => { setShowAddModal(false); setShowEditModal(false); setImage(null); }}
              className="absolute top-5 right-5 text-gray-400 hover:text-gray-600"
            >
              <X size={24} />
            </button>
            
            <h3 className="text-2xl font-bold mb-6">
              {showAddModal ? 'Post New Material' : 'Edit Material'}
            </h3>

            <form onSubmit={showAddModal ? handleAddProduct : handleEditProduct} className="space-y-4">
              <input
                type="text" name="name" value={formData.name} onChange={handleInputChange}
                placeholder="Material Name" required
                className="w-full p-4 border rounded-2xl outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="number" name="quantity" value={formData.quantity} onChange={handleInputChange}
                  placeholder="Stock" required
                  className="w-full p-4 border rounded-2xl outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="number" name="price" value={formData.price} onChange={handleInputChange}
                  placeholder="Price ($)" required
                  className="w-full p-4 border rounded-2xl outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="border-2 border-dashed p-6 rounded-2xl text-center cursor-pointer hover:bg-gray-50">
                <input
                  type="file" onChange={e => setImage(e.target.files[0])}
                  className="hidden" id="file-upload"
                  required={showAddModal}
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <ImageIcon className="mx-auto text-blue-600 mb-2" size={32} />
                  <span className="text-sm font-semibold">{image ? image.name : 'Upload Photo'}</span>
                </label>
              </div>
              <button
                type="submit" disabled={loading}
                className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold hover:bg-blue-700 disabled:bg-blue-300"
              >
                {loading ? 'Processing...' : showAddModal ? 'Post Marketplace' : 'Save Changes'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}