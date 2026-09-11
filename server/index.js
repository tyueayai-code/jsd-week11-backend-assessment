require('dotenv').config();
const dns = require('dns');
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const Product = require('./models/Product');

// แก้ปัญหา querySrv ECONNREFUSED บน Windows เมื่อเชื่อมต่อ mongodb+srv://
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
  // ignore if not supported
}

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;


// Middleware Section


// 1. CORS Middleware
app.use(cors());

// 2. Built-in express.json() Middleware
app.use(express.json());

// 3. Custom Middleware: Request Logger
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.originalUrl}`);
  next();
});

// ==========================================
// Database Connection & In-Memory Fallback
// ==========================================
let isMongoConnected = false;

// ข้อมูลเริ่มต้นสำหรับ In-Memory (ใช้เมื่อ MongoDB ยังเชื่อมต่อไม่ได้)
let memoryProducts = [
  { id: "1", name: "Wireless Mouse", price: 29.99, quantity: 5 },
  { id: "2", name: "Mechanical Keyboard", price: 89.99, quantity: 2 },
  { id: "3", name: "USB-C Hub", price: 19.99, quantity: 8 }
];

if (MONGODB_URI) {
  mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 5000 })
    .then(async () => {
      isMongoConnected = true;
      console.log('✅ Connected to MongoDB Atlas successfully!');
      
      // Seed initial products if collection is empty
      const count = await Product.countDocuments();
      if (count === 0) {
        await Product.insertMany([
          { name: "Wireless Mouse", price: 29.99, quantity: 5 },
          { name: "Mechanical Keyboard", price: 89.99, quantity: 2 },
          { name: "USB-C Hub", price: 19.99, quantity: 8 }
        ]);
        console.log('🌱 Seeded initial products into MongoDB Atlas.');
      }
    })
    .catch(err => {
      isMongoConnected = false;
      console.error('❌ MongoDB Connection Error:', err.message);
      console.warn('⚠️ Server will run with In-Memory data store until MongoDB credentials are confirmed.');
    });
} else {
  console.warn('⚠️ Warning: MONGODB_URI not found in .env, running with In-Memory store.');
}

// ==========================================
// Routes (Dual Mode: MongoDB & In-Memory)
// ==========================================

// 1. GET /products - คืนค่า products ทั้งหมด พร้อมรองรับ query string
app.get('/products', async (req, res, next) => {
  try {
    const { search, sort } = req.query;

    if (isMongoConnected) {
      let filter = {};
      if (search) {
        filter.name = { $regex: search.trim(), $options: 'i' };
      }

      let query = Product.find(filter);
      if (sort === 'price_asc') query = query.sort({ price: 1 });
      else if (sort === 'price_desc') query = query.sort({ price: -1 });

      const result = await query;
      return res.status(200).json(result);
    }

    // In-Memory Fallback
    let result = [...memoryProducts];
    if (search) {
      const keyword = search.trim().toLowerCase();
      result = result.filter(item => item.name.toLowerCase().includes(keyword));
    }
    if (sort === 'price_asc') result.sort((a, b) => a.price - b.price);
    else if (sort === 'price_desc') result.sort((a, b) => b.price - a.price);

    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

// 2. GET /products/:id - คืนค่า product ตัวเดียวตาม ID
app.get('/products/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    if (isMongoConnected) {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(404).json({ error: `Product with ID '${id}' not found` });
      }
      const product = await Product.findById(id);
      if (!product) {
        return res.status(404).json({ error: `Product with ID '${id}' not found` });
      }
      return res.status(200).json(product);
    }

    // In-Memory Fallback
    const product = memoryProducts.find(item => item.id === id);
    if (!product) {
      return res.status(404).json({ error: `Product with ID '${id}' not found` });
    }
    res.status(200).json(product);
  } catch (err) {
    next(err);
  }
});

// 3. POST /products - เพิ่ม product ใหม่
app.post('/products', async (req, res, next) => {
  try {
    const { name, price, quantity } = req.body;

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

    if (isMongoConnected) {
      const newProduct = await Product.create({
        name: name.trim(),
        price: numericPrice,
        quantity: numericQuantity
      });
      return res.status(201).json(newProduct);
    }

    // In-Memory Fallback
    const newProduct = {
      id: String(Date.now()),
      name: name.trim(),
      price: numericPrice,
      quantity: numericQuantity
    };
    memoryProducts.push(newProduct);
    res.status(201).json(newProduct);
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({ error: err.message });
    }
    next(err);
  }
});

// 4. PUT /products/:id - แก้ไข product ที่มีอยู่
app.put('/products/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, price, quantity } = req.body;
    const updateData = {};

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim() === '') {
        return res.status(400).json({ error: "Field 'name' cannot be empty" });
      }
      updateData.name = name.trim();
    }

    if (price !== undefined) {
      const numericPrice = Number(price);
      if (isNaN(numericPrice) || numericPrice < 0) {
        return res.status(400).json({ error: "Field 'price' must be a positive number" });
      }
      updateData.price = numericPrice;
    }

    if (quantity !== undefined) {
      const numericQuantity = Number(quantity);
      if (isNaN(numericQuantity) || numericQuantity < 0) {
        return res.status(400).json({ error: "Field 'quantity' must be a non-negative number" });
      }
      updateData.quantity = numericQuantity;
    }

    if (isMongoConnected) {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(404).json({ error: `Product with ID '${id}' not found` });
      }

      const updatedProduct = await Product.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
      );

      if (!updatedProduct) {
        return res.status(404).json({ error: `Product with ID '${id}' not found` });
      }

      return res.status(200).json(updatedProduct);
    }

    // In-Memory Fallback
    const index = memoryProducts.findIndex(item => item.id === id);
    if (index === -1) {
      return res.status(404).json({ error: `Product with ID '${id}' not found` });
    }

    const existing = memoryProducts[index];
    const updated = {
      ...existing,
      name: name !== undefined ? name.trim() : existing.name,
      price: price !== undefined ? Number(price) : existing.price,
      quantity: quantity !== undefined ? Number(quantity) : existing.quantity
    };
    memoryProducts[index] = updated;
    res.status(200).json(updated);
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({ error: err.message });
    }
    next(err);
  }
});

// 5. DELETE /products/:id - ลบ product
app.delete('/products/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    if (isMongoConnected) {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(404).json({ error: `Product with ID '${id}' not found` });
      }

      const deletedProduct = await Product.findByIdAndDelete(id);
      if (!deletedProduct) {
        return res.status(404).json({ error: `Product with ID '${id}' not found` });
      }

      return res.status(200).json({
        message: "Product deleted successfully",
        product: deletedProduct
      });
    }

    // In-Memory Fallback
    const index = memoryProducts.findIndex(item => item.id === id);
    if (index === -1) {
      return res.status(404).json({ error: `Product with ID '${id}' not found` });
    }

    const [deletedProduct] = memoryProducts.splice(index, 1);
    res.status(200).json({
      message: "Product deleted successfully",
      product: deletedProduct
    });
  } catch (err) {
    next(err);
  }
});

// ==========================================
// 404 Handler for undefined routes
// ==========================================
app.use((req, res) => {
  res.status(404).json({ error: `Cannot ${req.method} ${req.originalUrl}` });
});

// ==========================================
// Error-Handling Middleware
// ==========================================
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
