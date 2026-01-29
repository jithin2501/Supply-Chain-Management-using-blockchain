import React, { useState, useEffect, useCallback } from 'react';
import { 
  Package, Plus, LayoutDashboard, Truck, LogOut, 
  Edit, Trash2, Box, X, Image as ImageIcon, Loader2, ArrowRight
} from 'lucide-react';

// Ensure this matches your backend port exactly
const API_URL = 'http://localhost:5000/api';

export default function SupplierDashboard() {
  const [products, setProducts] = useState([]);
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

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

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
                {activeSection === 'inventory' ? 'Inventory Overview' : 'Manage Materials'}
              </h2>
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition shadow-lg"
              >
                <Plus size={20} />
                <span>Add New Material</span>
              </button>
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
                      <span className="text-3xl font-bold text-gray-900">{products.length}</span>
                    </div>
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Total Materials Listed</h3>
                  </div>

                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 bg-green-50 rounded-xl">
                        <Package className="text-green-600" size={24} />
                      </div>
                      <span className="text-3xl font-bold text-gray-900">
                        {products.reduce((sum, p) => sum + Number(p.quantity), 0)}
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
                        ${products.reduce((sum, p) => sum + (Number(p.price) * Number(p.quantity)), 0).toFixed(2)}
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Total Inventory Value</h3>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {products.map(product => (
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
                    {products.map(product => (
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

            {/* Empty State */}
            {products.length === 0 && !loading && (
              <div className="bg-white p-20 rounded-3xl border-2 border-dashed border-gray-200 text-center">
                <Box className="mx-auto text-gray-300 mb-6" size={64} />
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Inventory is Empty</h3>
                <p className="text-gray-500">Add your first material to start selling to manufacturers.</p>
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