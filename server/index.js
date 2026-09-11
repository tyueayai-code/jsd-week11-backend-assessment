const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// ==========================================
// Middleware Section
// ==========================================

// 1. CORS Middleware
// ช่วยให้ frontend (เช่น React ที่รันบน port 5173) สามารถส่ง request ข้าม origin มายัง API ที่ port 3000 ได้
app.use(cors());

// 2. Built-in express.json() Middleware
// แปลง incoming request body ที่มี Content-Type: application/json ให้อยู่ในรูป JavaScript object เข้าถึงผ่าน `req.body`
// ถ้าไม่ใส่ตัวนี้ `req.body` จะกลายเป็น `undefined`
app.use(express.json());

// 3. Custom Middleware: Request Logger
// ทำงานทุกครั้งที่มี request วิ่งเข้ามา เพื่อบันทึกเวลา, HTTP Method และ URL
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.originalUrl}`);
  next(); // ต้องเรียก next() เสมอ เพื่อส่งต่อไปยัง middleware หรือ route ถัดไป
});

// ==========================================
// In-Memory Data Store
// ==========================================
// เก็บข้อมูล products ไว้ใน array ใน memory ชั่วคราว (เมื่อ restart server ข้อมูลจะกลับเป็นค่าเริ่มต้น)
let products = [
  { id: "1", name: "Wireless Mouse", price: 29.99, quantity: 5 },
  { id: "2", name: "Mechanical Keyboard", price: 89.99, quantity: 2 },
  { id: "3", name: "USB-C Hub", price: 19.99, quantity: 8 }
];

// ==========================================
// Routes
// ==========================================

// 1. GET /products - คืนค่า products ทั้งหมด พร้อมรองรับ query string (?search=... & ?sort=...)
app.get('/products', (req, res) => {
  let result = [...products];
  const { search, sort } = req.query;

  // กรองตามชื่อสินค้าถ้ามีการระบุ ?search=
  if (search) {
    const keyword = search.trim().toLowerCase();
    result = result.filter(item => item.name.toLowerCase().includes(keyword));
  }

  // เรียงลำดับตามราคาถ้ามีการระบุ ?sort=price_asc หรือ ?sort=price_desc
  if (sort === 'price_asc') {
    result.sort((a, b) => a.price - b.price);
  } else if (sort === 'price_desc') {
    result.sort((a, b) => b.price - a.price);
  }

  res.status(200).json(result);
});

// 2. GET /products/:id - คืนค่า product ตัวเดียวตาม ID
app.get('/products/:id', (req, res) => {
  const { id } = req.params;
  const product = products.find(item => item.id === id);

  if (!product) {
    return res.status(404).json({ error: `Product with ID '${id}' not found` });
  }

  res.status(200).json(product);
});

// 3. POST /products - เพิ่ม product ใหม่
app.post('/products', (req, res) => {
  const { name, price, quantity } = req.body;

  // Validation: ตรวจสอบความถูกต้องของข้อมูล
  if (!name || typeof name !== 'string' || name.trim() === '') {
    return res.status(400).json({ error: "Field 'name' is required and must be a non-empty string" });
  }

  const numericPrice = Number(price);
  if (price === undefined || price === null || isNaN(numericPrice) || numericPrice < 0) {
    return res.status(400).json({ error: "Field 'price' is required and must be a positive number" });
  }

  const numericQuantity = quantity !== undefined ? Number(quantity) : 1;
  if (isNaN(numericQuantity) || numericQuantity < 0) {
    return res.status(400).json({ error: "Field 'quantity' must be a valid non-negative number" });
  }

  // สร้าง product ชิ้นใหม่พร้อมสร้าง ID เป็น string
  const newProduct = {
    id: String(Date.now()),
    name: name.trim(),
    price: numericPrice,
    quantity: numericQuantity
  };

  products.push(newProduct);
  // HTTP 201 Created บ่งบอกว่า resource ถูกสร้างสำเร็จ
  res.status(201).json(newProduct);
});

// 4. PUT /products/:id - แก้ไข product ที่มีอยู่
app.put('/products/:id', (req, res) => {
  const { id } = req.params;
  const productIndex = products.findIndex(item => item.id === id);

  if (productIndex === -1) {
    return res.status(404).json({ error: `Product with ID '${id}' not found` });
  }

  const { name, price, quantity } = req.body;

  // Validation ในกรณีที่มีการส่งค่านั้นๆ มาแก้ไข
  if (name !== undefined) {
    if (typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({ error: "Field 'name' cannot be empty" });
    }
  }

  if (price !== undefined) {
    const numericPrice = Number(price);
    if (isNaN(numericPrice) || numericPrice < 0) {
      return res.status(400).json({ error: "Field 'price' must be a positive number" });
    }
  }

  if (quantity !== undefined) {
    const numericQuantity = Number(quantity);
    if (isNaN(numericQuantity) || numericQuantity < 0) {
      return res.status(400).json({ error: "Field 'quantity' must be a non-negative number" });
    }
  }

  // อัปเดตข้อมูลเฉพาะ field ที่ส่งมา
  const existingProduct = products[productIndex];
  const updatedProduct = {
    ...existingProduct,
    name: name !== undefined ? name.trim() : existingProduct.name,
    price: price !== undefined ? Number(price) : existingProduct.price,
    quantity: quantity !== undefined ? Number(quantity) : existingProduct.quantity
  };

  products[productIndex] = updatedProduct;
  res.status(200).json(updatedProduct);
});

// 5. DELETE /products/:id - ลบ product
app.delete('/products/:id', (req, res) => {
  const { id } = req.params;
  const productIndex = products.findIndex(item => item.id === id);

  if (productIndex === -1) {
    return res.status(404).json({ error: `Product with ID '${id}' not found` });
  }

  const [deletedProduct] = products.splice(productIndex, 1);
  res.status(200).json({
    message: "Product deleted successfully",
    product: deletedProduct
  });
});

// ==========================================
// 404 Handler for undefined routes
// ==========================================
app.use((req, res) => {
  res.status(404).json({ error: `Cannot ${req.method} ${req.originalUrl}` });
});

// ==========================================
// Error-Handling Middleware (4 arguments)
// ==========================================
// วางไว้ท้ายสุดของ middleware chain เพื่อดักจับข้อผิดพลาดที่ไม่คาดคิด
app.use((err, req, res, next) => {
  console.error("Unhandled Server Error:", err);
  res.status(500).json({
    error: "Internal Server Error",
    message: err.message
  });
});

// ==========================================
// Server Listener
// ==========================================
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

