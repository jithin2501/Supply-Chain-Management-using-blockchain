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
    price: '',
    unit: 'pieces',
    lat: '',
    lng: '',
    address: ''
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

  // FIXED: Filter products to show only those with quantity > 0 (available inventory)
  const getAvailableProducts = () => {
    return products.filter(product => product.quantity > 0);
  };

  // Get available (unpurchased) products
  const availableProducts = getAvailableProducts();

  const handleAddProduct = async (e) => {
    e.preventDefault();
    const storedToken = localStorage.getItem('token');
    
    if (!image) return alert('Please upload an image');
    
    // Debug log
    console.log('Form Data:', formData);
    
    if (!formData.lat || !formData.lng || !formData.address) {
      console.log('Missing location:', { lat: formData.lat, lng: formData.lng, address: formData.address });
      return alert('Please provide location information');
    }
    
    setLoading(true);
    const formDataObj = new FormData();
    formDataObj.append('name', formData.name);
    formDataObj.append('quantity', formData.quantity);
    formDataObj.append('price', formData.price);
    formDataObj.append('unit', formData.unit);
    formDataObj.append('lat', formData.lat);
    formDataObj.append('lng', formData.lng);
    formDataObj.append('address', formData.address);
    formDataObj.append('image', image);

    try {
      const response = await fetch(`${API_URL}/products`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${storedToken}` },
        body: formDataObj
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to add product');
      }

      await fetchMyProducts();
      setShowAddModal(false);
      setImage(null);
      setFormData({ name: '', quantity: '', price: '', unit: 'pieces', lat: '', lng: '', address: '' });
    } catch (err) {
      console.error('Error adding product:', err);
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditProduct = async (e) => {
    e.preventDefault();
    const storedToken = localStorage.getItem('token');
    
    if (!formData.lat || !formData.lng || !formData.address) {
      return alert('Please provide location information');
    }
    
    setLoading(true);
    const formDataObj = new FormData();
    formDataObj.append('name', formData.name);
    formDataObj.append('quantity', formData.quantity);
    formDataObj.append('price', formData.price);
    formDataObj.append('unit', formData.unit);
    formDataObj.append('lat', formData.lat);
    formDataObj.append('lng', formData.lng);
    formDataObj.append('address', formData.address);
    if (image) formDataObj.append('image', image);

    try {
      const response = await fetch(`${API_URL}/products/${editingProduct._id}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${storedToken}` },
        body: formDataObj
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update product');
      }

      await fetchMyProducts();
      setShowEditModal(false);
      setEditingProduct(null);
      setImage(null);
      setFormData({ name: '', quantity: '', price: '', unit: 'pieces', lat: '', lng: '', address: '' });
    } catch (err) {
      console.error('Error updating product:', err);
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduct = async (id) => {
    if (!window.confirm('Are you sure you want to delete this material?')) return;
    
    const storedToken = localStorage.getItem('token');
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/products/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${storedToken}` }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete product');
      }

      await fetchMyProducts();
    } catch (err) {
      console.error('Error deleting product:', err);
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  const openEditModal = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      quantity: product.quantity.toString(),
      price: product.price.toString(),
      unit: product.unit || 'pieces',
      lat: product.location?.coordinates?.[1]?.toString() || '',
      lng: product.location?.coordinates?.[0]?.toString() || '',
      address: product.location?.address || ''
    });
    setShowEditModal(true);
  };

  // Calculate totals
  const totalMaterialsListed = products.length;
  const totalStockUnits = products.reduce((sum, p) => sum + (p.quantity || 0), 0);
  const totalInventoryValue = products.reduce((sum, p) => sum + ((p.quantity || 0) * (p.price || 0)), 0);

  // Calculate purchased materials stats
  const totalMaterialsSold = purchasedMaterials.length;
  const totalUnitsSold = purchasedMaterials.reduce((sum, pm) => sum + (pm.quantity || 0), 0);
  const totalValueSold = purchasedMaterials.reduce((sum, pm) => sum + ((pm.quantity || 0) * (pm.price || 0)), 0);

  // Calculate payment receipts stats
  const totalReceipts = paymentReceipts.length;
  const totalRevenue = paymentReceipts.reduce((sum, r) => sum + (r.totalAmount || 0), 0);
  const completedSales = paymentReceipts.filter(r => r.status === 'completed').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      {/* Top Navigation */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Truck className="text-blue-600" size={32} />
              <span className="text-2xl font-bold text-gray-900">Supplier Hub</span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition"
            >
              <LogOut size={20} />
              <span className="font-semibold">Logout</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex gap-6">
          {/* Sidebar */}
          <div className="w-64 bg-white rounded-2xl shadow-sm p-6 h-fit sticky top-24">
            <div className="space-y-2">
              <button
                onClick={() => setActiveSection('inventory')}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition ${
                  activeSection === 'inventory'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <LayoutDashboard size={20} />
                <span className="font-semibold">Inventory Overview</span>
              </button>

              <button
                onClick={() => setActiveSection('materials')}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition ${
                  activeSection === 'materials'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Box size={20} />
                <span className="font-semibold">Manage Materials</span>
              </button>

              <button
                onClick={() => setActiveSection('purchased')}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition ${
                  activeSection === 'purchased'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <ShoppingCart size={20} />
                <span className="font-semibold">Purchased Materials</span>
              </button>

              <button
                onClick={() => setActiveSection('receipts')}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition ${
                  activeSection === 'receipts'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Receipt size={20} />
                <span className="font-semibold">Payment Receipts</span>
              </button>
            </div>
          </div>

          {/* Main Section */}
          <div className="flex-1">
            {/* Inventory Overview */}
            {activeSection === 'inventory' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-3xl font-bold text-gray-900">Inventory Overview</h2>
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition"
                  >
                    <Plus size={20} />
                    <span>Add New Material</span>
                  </button>
                </div>

                {/* Stats Cards */}
                <div className="grid md:grid-cols-3 gap-6 mb-8">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-2xl border border-blue-200">
                    <div className="flex items-center justify-between mb-4">
                      <Box className="text-blue-600" size={32} />
                      <span className="text-3xl font-bold text-gray-900">{totalMaterialsListed}</span>
                    </div>
                    <p className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Total Materials Listed</p>
                  </div>

                  <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-2xl border border-green-200">
                    <div className="flex items-center justify-between mb-4">
                      <Archive className="text-green-600" size={32} />
                      <span className="text-3xl font-bold text-gray-900">{totalStockUnits}</span>
                    </div>
                    <p className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Total Stock Units</p>
                  </div>

                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-2xl border border-purple-200">
                    <div className="flex items-center justify-between mb-4">
                      <Truck className="text-purple-600" size={32} />
                      <span className="text-3xl font-bold text-gray-900">₹{totalInventoryValue.toFixed(2)}</span>
                    </div>
                    <p className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Total Inventory Value</p>
                  </div>
                </div>

                {/* Available Products Grid */}
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {loading && (
                    <div className="col-span-full flex items-center justify-center py-20">
                      <Loader2 className="animate-spin text-blue-600" size={48} />
                    </div>
                  )}

                  {!loading && availableProducts.length > 0 && availableProducts.map((product) => (
                    <div key={product._id} className="bg-white rounded-2xl shadow-md overflow-hidden hover:shadow-xl transition">
                      <div className="relative h-48 bg-gray-200">
                        <img
                          src={product.image}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-3 right-3 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold">
                          In Stock
                        </div>
                      </div>

                      <div className="p-5">
                        <h3 className="text-xl font-bold text-gray-900 mb-3">{product.name}</h3>

                        <div className="space-y-2 mb-4">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Stock Available:</span>
                            <span className="font-bold text-gray-900">{product.quantity} {product.unit || 'units'}</span>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Price per Unit:</span>
                            <span className="font-bold text-green-600">₹{product.price}</span>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Total Value:</span>
                            <span className="font-bold text-blue-600">₹{(product.quantity * product.price).toFixed(2)}</span>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => openEditModal(product)}
                            className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
                          >
                            <Edit size={16} />
                            <span>Edit</span>
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(product._id)}
                            className="flex items-center justify-center px-4 py-2 bg-red-100 text-red-600 rounded-lg font-semibold hover:bg-red-200 transition"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {!loading && availableProducts.length === 0 && (
                    <div className="col-span-full bg-white p-20 rounded-3xl border-2 border-dashed border-gray-200 text-center">
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
              </div>
            )}

            {/* Manage Materials Section */}
            {activeSection === 'materials' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-3xl font-bold text-gray-900">Manage Materials</h2>
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition"
                  >
                    <Plus size={20} />
                    <span>Add New Material</span>
                  </button>
                </div>

                {/* Materials Table */}
                <div className="bg-white rounded-2xl shadow-md overflow-hidden">
                  {loading && (
                    <div className="flex items-center justify-center py-20">
                      <Loader2 className="animate-spin text-blue-600" size={48} />
                    </div>
                  )}

                  {!loading && availableProducts.length > 0 && (
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Material Details</th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Stock</th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Price</th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {availableProducts.map((product) => (
                          <tr key={product._id} className="hover:bg-gray-50 transition">
                            <td className="px-6 py-4">
                              <div className="flex items-center space-x-4">
                                <img
                                  src={product.image}
                                  alt={product.name}
                                  className="w-16 h-16 rounded-lg object-cover"
                                />
                                <div>
                                  <p className="font-bold text-gray-900">{product.name}</p>
                                  <p className="text-sm text-gray-500">{product.location?.address || 'No address'}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="font-bold text-gray-900">{product.quantity} {product.unit || 'units'}</span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="font-bold text-green-600">₹{product.price}</span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex gap-2">
                                <button
                                  onClick={() => openEditModal(product)}
                                  className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition"
                                >
                                  <Edit size={16} />
                                </button>
                                <button
                                  onClick={() => handleDeleteProduct(product._id)}
                                  className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  {!loading && availableProducts.length === 0 && (
                    <div className="p-20 text-center">
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
              </div>
            )}

            {/* Purchased Materials Section */}
            {activeSection === 'purchased' && (
              <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-6">Purchased Materials</h2>

                {/* Stats Cards */}
                <div className="grid md:grid-cols-3 gap-6 mb-8">
                  <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-2xl border border-orange-200">
                    <div className="flex items-center justify-between mb-4">
                      <ShoppingCart className="text-orange-600" size={32} />
                      <span className="text-3xl font-bold text-gray-900">{totalMaterialsSold}</span>
                    </div>
                    <p className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Materials Sold</p>
                  </div>

                  <div className="bg-gradient-to-br from-teal-50 to-teal-100 p-6 rounded-2xl border border-teal-200">
                    <div className="flex items-center justify-between mb-4">
                      <Box className="text-teal-600" size={32} />
                      <span className="text-3xl font-bold text-gray-900">{totalUnitsSold}</span>
                    </div>
                    <p className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Total Units Sold</p>
                  </div>

                  <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-6 rounded-2xl border border-indigo-200">
                    <div className="flex items-center justify-between mb-4">
                      <DollarSign className="text-indigo-600" size={32} />
                      <span className="text-3xl font-bold text-gray-900">₹{totalValueSold.toFixed(2)}</span>
                    </div>
                    <p className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Total Value Sold</p>
                  </div>
                </div>

                {/* Purchased Materials Grid */}
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {purchasedMaterials.length > 0 && purchasedMaterials.map((material) => (
                    <div key={material._id} className="bg-white rounded-2xl shadow-md overflow-hidden hover:shadow-xl transition">
                      <div className="relative h-48 bg-gray-200">
                        <img
                          src={material.image}
                          alt={material.productName}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-3 right-3 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center space-x-1">
                          <CheckCircle size={14} />
                          <span>SOLD</span>
                        </div>
                      </div>

                      <div className="p-5">
                        <h3 className="text-xl font-bold text-gray-900 mb-3">{material.productName}</h3>

                        <div className="space-y-2 mb-4">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600 flex items-center">
                              <User size={14} className="mr-1" />
                              Buyer:
                            </span>
                            <span className="font-semibold text-gray-900">{material.manufacturerName || 'N/A'}</span>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Quantity Sold:</span>
                            <span className="font-bold text-gray-900">{material.quantity} units</span>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Price per Unit:</span>
                            <span className="font-bold text-green-600">₹{material.price}</span>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Total Amount:</span>
                            <span className="font-bold text-blue-600">₹{(material.quantity * material.price).toFixed(2)}</span>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600 flex items-center">
                              <Calendar size={14} className="mr-1" />
                              Date Purchased:
                            </span>
                            <span className="text-sm font-medium text-gray-900">
                              {new Date(material.purchasedAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {purchasedMaterials.length === 0 && (
                    <div className="col-span-full bg-white p-20 rounded-3xl border-2 border-dashed border-gray-200 text-center">
                      <ShoppingCart className="mx-auto text-gray-300 mb-6" size={64} />
                      <h3 className="text-2xl font-bold text-gray-900 mb-2">No Purchased Materials</h3>
                      <p className="text-gray-500">Materials purchased by manufacturers will appear here.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Payment Receipts Section */}
            {activeSection === 'receipts' && (
              <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-6">Payment Receipts</h2>

                {/* Stats Cards */}
                <div className="grid md:grid-cols-3 gap-6 mb-8">
                  <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-2xl border border-green-200">
                    <div className="flex items-center justify-between mb-4">
                      <Receipt className="text-green-600" size={32} />
                      <span className="text-3xl font-bold text-gray-900">{totalReceipts}</span>
                    </div>
                    <p className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Total Receipts</p>
                  </div>

                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-2xl border border-blue-200">
                    <div className="flex items-center justify-between mb-4">
                      <DollarSign className="text-blue-600" size={32} />
                      <span className="text-3xl font-bold text-gray-900">₹{totalRevenue.toFixed(2)}</span>
                    </div>
                    <p className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Total Revenue</p>
                  </div>

                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-2xl border border-purple-200">
                    <div className="flex items-center justify-between mb-4">
                      <CheckCircle className="text-purple-600" size={32} />
                      <span className="text-3xl font-bold text-gray-900">{completedSales}</span>
                    </div>
                    <p className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Completed Sales</p>
                  </div>
                </div>

                {/* Receipts Table */}
                <div className="bg-white rounded-2xl shadow-md overflow-hidden">
                  {paymentReceipts.length > 0 && (
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                            <div className="flex items-center space-x-2">
                              <Package size={16} />
                              <span>Product</span>
                            </div>
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                            <div className="flex items-center space-x-2">
                              <User size={16} />
                              <span>Buyer</span>
                            </div>
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                            <div className="flex items-center space-x-2">
                              <Tag size={16} />
                              <span>Amount</span>
                            </div>
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Quantity</th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                            <div className="flex items-center space-x-2">
                              <Calendar size={16} />
                              <span>Date</span>
                            </div>
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Status</th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Blockchain</th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {paymentReceipts.map((receipt) => (
                          <tr key={receipt._id} className="hover:bg-gray-50 transition">
                            <td className="px-6 py-4">
                              <div className="font-semibold text-gray-900">{receipt.productName}</div>
                              <div className="text-xs text-gray-500">{receipt.buyerName || 'Manufacturer'}</div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="font-medium text-gray-900">{receipt.buyerId?.name || receipt.buyerName}</div>
                              <div className="text-xs text-gray-500">{receipt.buyerId?.company || 'Manufacturer'}</div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="font-bold text-green-600">₹{receipt.totalAmount?.toFixed(2) || '0.00'}</span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="font-medium text-gray-900">{receipt.quantity} units</span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm text-gray-900">
                                {new Date(receipt.timestamp).toLocaleDateString()}
                              </div>
                              <div className="text-xs text-gray-500">
                                {new Date(receipt.timestamp).toLocaleTimeString()}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                receipt.status === 'completed' 
                                  ? 'bg-green-100 text-green-700' 
                                  : 'bg-yellow-100 text-yellow-700'
                              }`}>
                                {receipt.status === 'completed' ? '✓ COMPLETED' : 'PENDING'}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              {receipt.txHash ? (
                                <a
                                  href={`https://etherscan.io/tx/${receipt.txHash}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center space-x-1 text-blue-600 hover:text-blue-800 text-xs"
                                >
                                  <ExternalLink size={12} />
                                  <span>View TX</span>
                                </a>
                              ) : (
                                <span className="text-xs text-gray-400">No TX</span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <button className="flex items-center space-x-1 text-blue-600 hover:text-blue-800 font-semibold text-sm">
                                <ExternalLink size={14} />
                                <span>View TX</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  {paymentReceipts.length === 0 && (
                    <div className="p-20 text-center">
                      <Receipt className="mx-auto text-gray-300 mb-6" size={64} />
                      <h3 className="text-2xl font-bold text-gray-900 mb-2">No Payment Receipts</h3>
                      <p className="text-gray-500">Transaction receipts will appear here when materials are sold.</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal */}
      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[100] backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full relative max-h-[90vh] overflow-y-auto">
            <button 
              onClick={() => { 
                setShowAddModal(false); 
                setShowEditModal(false); 
                setImage(null);
                setFormData({ name: '', quantity: '', price: '', unit: 'pieces', lat: '', lng: '', address: '' });
              }}
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
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Quantity</label>
                  <input
                    type="number" name="quantity" value={formData.quantity} onChange={handleInputChange}
                    placeholder="Enter quantity" required min="0" step="any"
                    className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Unit</label>
                  <select
                    name="unit" value={formData.unit} onChange={handleInputChange}
                    required
                    className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="pieces">Pieces</option>
                    <option value="kg">Kilograms (kg)</option>
                    <option value="tons">Tons</option>
                    <option value="liters">Liters</option>
                    <option value="boxes">Boxes</option>
                    <option value="units">Units</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Price per Unit (₹ INR)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-bold">₹</span>
                  <input
                    type="number" name="price" value={formData.price} onChange={handleInputChange}
                    placeholder="0.00" required min="0" step="0.01"
                    className="w-full p-3 pl-8 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              {/* Location Fields */}
              <div className="space-y-3 bg-gray-50 p-4 rounded-xl">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-gray-700">Location Information</label>
                  <button
                    type="button"
                    onClick={() => {
                      if (navigator.geolocation) {
                        setLoading(true);
                        navigator.geolocation.getCurrentPosition(
                          async (position) => {
                            const { latitude, longitude } = position.coords;
                            
                            // Use reverse geocoding to get address
                            try {
                              const response = await fetch(
                                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
                              );
                              const data = await response.json();
                              
                              setFormData(prev => ({
                                ...prev,
                                lat: latitude.toString(),
                                lng: longitude.toString(),
                                address: data.display_name || `${latitude}, ${longitude}`
                              }));
                            } catch (error) {
                              console.error('Error getting address:', error);
                              setFormData(prev => ({
                                ...prev,
                                lat: latitude.toString(),
                                lng: longitude.toString(),
                                address: `${latitude}, ${longitude}`
                              }));
                            } finally {
                              setLoading(false);
                            }
                          },
                          (error) => {
                            console.error('Geolocation error:', error);
                            alert('Unable to get location. Please enter manually.');
                            setLoading(false);
                          }
                        );
                      } else {
                        alert('Geolocation is not supported by your browser');
                      }
                    }}
                    disabled={loading}
                    className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Getting...' : '📍 Use My Location'}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="number" step="any" name="lat" value={formData.lat} onChange={handleInputChange}
                    placeholder="Latitude" required
                    className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                  <input
                    type="number" step="any" name="lng" value={formData.lng} onChange={handleInputChange}
                    placeholder="Longitude" required
                    className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
                <input
                  type="text" name="address" value={formData.address} onChange={handleInputChange}
                  placeholder="Full Address" required
                  className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
              
              <div className="border-2 border-dashed p-6 rounded-2xl text-center cursor-pointer hover:bg-gray-50">
                <input
                  type="file" onChange={e => setImage(e.target.files[0])}
                  accept="image/*"
                  className="hidden" id="file-upload"
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