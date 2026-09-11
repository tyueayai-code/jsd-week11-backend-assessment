import { useState, useEffect } from 'react';
import './App.css';

// 1. ดึง Base URL ของ API จาก Environment Variable (.env)
// ป้องกันการ Hardcode URL เพื่อให้สลับระหว่าง Dev/Production ได้ง่าย
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function App() {
  // ==========================================
  // State Management
  // ==========================================
  // UI State: ข้อมูลที่ React ถือไว้เพื่อนำมา render บนหน้าจอ
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // State สำหรับฟอร์มเพิ่มสินค้าใหม่ (Add Product)
  const [newProduct, setNewProduct] = useState({
    name: '',
    price: '',
    quantity: 1
  });
  const [formError, setFormError] = useState('');

  // State สำหรับการค้นหา (Query String ?search=)
  const [searchTerm, setSearchTerm] = useState('');

  // State สำหรับการแก้ไขสินค้า (Edit Mode)
  const [editingId, setEditingId] = useState(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    price: '',
    quantity: 1
  });

  // Data Fetching (Read)
  // ฟังก์ชันดึงข้อมูลสินค้าจาก Express API
  const fetchProducts = async (query = '') => {
    setLoading(true);
    setError(null);
    try {
      const url = query 
        ? `${API_URL}/products?search=${encodeURIComponent(query)}`
        : `${API_URL}/products`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status} (${response.statusText})`);
      }

      const data = await response.json();
      setProducts(data); // Sync ข้อมูลจาก Server มาไว้ที่ UI State
    } catch (err) {
      console.error('Fetch error:', err);
      // ดักจับ error กรณี Server ปิดอยู่ หรือยิงไม่ผ่าน
      setError(
        err.message.includes('Failed to fetch')
          ? ' ไม่สามารถเชื่อมต่อกับ Server ได้ กรุณาตรวจสอบว่า Express Server เปิดอยู่หรือไม่ (http://localhost:3000)'
          : ` เกิดข้อผิดพลาด: ${err.message}`
      );
    } finally {
      setLoading(false);
    }
  };

  // useEffect ค้นหาอัตโนมัติเมื่อพิมพ์คำค้นหา (Live Search พร้อม debounce 300ms)
  // และยังทำหน้าที่โหลดข้อมูลทั้งหมดครั้งแรกตอนเปิดหน้าเว็บด้วย
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchProducts(searchTerm);
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  // Create (Add Product - POST /products)
  
  const handleAddProduct = async (e) => {
    e.preventDefault(); // ป้องกันไม่ให้ Browser รีเฟรชหน้าเว็บ!
    setFormError('');

    // ตรวจสอบเบื้องต้นฝั่ง Client
    if (!newProduct.name.trim()) {
      setFormError('กรุณากรอกชื่อสินค้า');
      return;
    }
    if (newProduct.price === '' || Number(newProduct.price) < 0) {
      setFormError('กรุณากรอกราคาที่มากกว่าหรือเท่ากับ 0');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: newProduct.name,
          price: Number(newProduct.price),
          quantity: Number(newProduct.quantity) || 1
        })
      });

      const result = await response.json();

      if (!response.ok) {
        setFormError(result.error || 'ไม่สามารถเพิ่มสินค้าได้');
        return;
      }

      // Sync State ทันทีโดยไม่ต้อง Reload หน้าเว็บ:
      // เอาสินค้าใหม่ที่เพิ่งได้จาก server (มี id แล้ว) ไปต่อท้าย array เดิม
      setProducts((prevProducts) => [...prevProducts, result]);

      // เคลียร์ฟอร์ม
      setNewProduct({ name: '', price: '', quantity: 1 });
    } catch (err) {
      setFormError('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    }
  };

  // Delete (DELETE /products/:id)
  
  const handleDeleteProduct = async (id) => {
    if (!window.confirm('คุณแน่ใจหรือไม่ว่าต้องการลบสินค้านี้?')) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/products/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const result = await response.json();
        alert(result.error || 'ลบสินค้าไม่สำเร็จ');
        return;
      }

      // Sync State ทันที: กรองเอาสินค้าที่มี id ตรงกับที่ลบออกไปจาก UI State
      setProducts((prevProducts) => prevProducts.filter((item) => item.id !== id));
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    }
  };

  // Update (PUT /products/:id)
  
  const startEditing = (product) => {
    setEditingId(product.id);
    setEditFormData({
      name: product.name,
      price: product.price,
      quantity: product.quantity
    });
  };

  const cancelEditing = () => {
    setEditingId(null);
  };

  const handleUpdateProduct = async (id) => {
    if (!editFormData.name.trim()) {
      alert('ชื่อสินค้าต้องไม่เว้นว่าง');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/products/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: editFormData.name,
          price: Number(editFormData.price),
          quantity: Number(editFormData.quantity)
        })
      });

      const updatedProduct = await response.json();

      if (!response.ok) {
        alert(updatedProduct.error || 'อัปเดตไม่สำเร็จ');
        return;
      }

      // Sync State ทันที: ค้นหาสินค้าชิ้นนั้นแล้วแทนที่ด้วยข้อมูลใหม่ที่ server ส่งกลับมา
      setProducts((prevProducts) =>
        prevProducts.map((item) => (item.id === id ? updatedProduct : item))
      );

      setEditingId(null); // ปิดโหมดแก้ไข
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการอัปเดตสินค้า');
    }
  };

  
  // Search Form Submit
  
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchProducts(searchTerm);
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    fetchProducts('');
  };

  // คำนวณสรุปข้อมูลในตะกร้า
  const totalItems = products.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = products.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <div className="container">
      <header className="header">
        <h1>🛒 Shopping Cart & Products Manager</h1>
        <p className="subtitle">
          เชื่อมต่อกับ Express API บน <code>{API_URL}</code>
        </p>
      </header>

      {/* แถบแจ้งเตือนเมื่อเกิด Error */}
      {error && (
        <div className="error-banner">
          <p>{error}</p>
          <button className="retry-btn" onClick={() => fetchProducts(searchTerm)}>
            🔄 ลองเชื่อมต่อใหม่ (Retry)
          </button>
        </div>
      )}

      {/* แถบค้นหาสินค้า (Query String) */}
      <section className="card search-section">
        <form onSubmit={handleSearchSubmit} className="search-form">
          <input
            type="text"
            placeholder=" ค้นหาชื่อสินค้า (เช่น Mouse, Keyboard)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input"
          />
          <button type="submit" className="btn btn-primary">
            ค้นหา
          </button>
          {searchTerm && (
            <button type="button" onClick={handleClearSearch} className="btn btn-secondary">
              ล้างคำค้นหา
            </button>
          )}
        </form>
      </section>

      {/* ฟอร์มเพิ่มสินค้าใหม่ (POST) */}
      <section className="card form-section">
        <h2> เพิ่มสินค้าใหม่ (Add Product)</h2>
        {formError && <div className="form-error">{formError}</div>}
        <form onSubmit={handleAddProduct} className="product-form">
          <div className="form-group">
            <label>ชื่อสินค้า (Name) *</label>
            <input
              type="text"
              placeholder="เช่น Ergonomic Mouse"
              value={newProduct.name}
              onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
              className="input"
            />
          </div>

          <div className="form-group">
            <label>ราคา (Price - USD) *</label>
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="เช่น 29.99"
              value={newProduct.price}
              onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
              className="input"
            />
          </div>

          <div className="form-group">
            <label>จำนวน (Quantity) *</label>
            <input
              type="number"
              min="1"
              value={newProduct.quantity}
              onChange={(e) => setNewProduct({ ...newProduct, quantity: e.target.value })}
              className="input"
            />
          </div>

          <button type="submit" className="btn btn-success submit-btn">
            บันทึกสินค้า
          </button>
        </form>
      </section>

      {/* ส่วนแสดงรายการสินค้า (Products List) */}
      <section className="card list-section">
        <div className="list-header">
          <h2> รายการสินค้าทั้งหมด ({products.length} รายการ)</h2>
          <div className="summary-badges">
            <span className="badge">รวมชิ้น: {totalItems}</span>
            <span className="badge badge-accent">มูลค่ารวม: ${totalPrice.toFixed(2)}</span>
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>กำลังโหลดข้อมูลสินค้าจาก API...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="empty-state">
            <p>ยังไม่มีสินค้าในระบบ หรือไม่พบสินค้าที่ค้นหา</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="product-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>ชื่อสินค้า</th>
                  <th>ราคา ($)</th>
                  <th>จำนวน</th>
                  <th>รวม ($)</th>
                  <th>การจัดการ</th>
                </tr>
              </thead>
              <tbody>
                {products.map((item) => {
                  const isEditing = editingId === item.id;
                  return (
                    <tr key={item.id} className={isEditing ? 'row-editing' : ''}>
                      <td>
                        <small className="product-id">{item.id}</small>
                      </td>

                      {isEditing ? (
                        <>
                          <td>
                            <input
                              type="text"
                              value={editFormData.name}
                              onChange={(e) =>
                                setEditFormData({ ...editFormData, name: e.target.value })
                              }
                              className="input input-sm"
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={editFormData.price}
                              onChange={(e) =>
                                setEditFormData({ ...editFormData, price: e.target.value })
                              }
                              className="input input-sm"
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              min="0"
                              value={editFormData.quantity}
                              onChange={(e) =>
                                setEditFormData({ ...editFormData, quantity: e.target.value })
                              }
                              className="input input-sm"
                            />
                          </td>
                          <td>${(editFormData.price * editFormData.quantity || 0).toFixed(2)}</td>
                          <td>
                            <div className="action-buttons">
                              <button
                                onClick={() => handleUpdateProduct(item.id)}
                                className="btn btn-sm btn-success"
                              >
                                บันทึก
                              </button>
                              <button
                                onClick={cancelEditing}
                                className="btn btn-sm btn-secondary"
                              >
                                ยกเลิก
                              </button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="product-name">{item.name}</td>
                          <td>${Number(item.price).toFixed(2)}</td>
                          <td>{item.quantity}</td>
                          <td>${(Number(item.price) * Number(item.quantity)).toFixed(2)}</td>
                          <td>
                            <div className="action-buttons">
                              <button
                                onClick={() => startEditing(item)}
                                className="btn btn-sm btn-warning"
                              >
                                แก้ไข
                              </button>
                              <button
                                onClick={() => handleDeleteProduct(item.id)}
                                className="btn btn-sm btn-danger"
                              >
                                ลบ
                              </button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export default App;
