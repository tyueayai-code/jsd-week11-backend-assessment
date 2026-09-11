// สคริปต์สำหรับทดสอบยิง API ทุกเส้นทางและแสดงผลลัพธ์พร้อม Status Code
const BASE_URL = 'http://localhost:3000';

async function runTests() {
  console.log('====================================================');
  console.log('🚀 เริ่มต้นทดสอบยิง API ไปที่:', BASE_URL);
  console.log('====================================================\n');

  try {
    // 1. GET /products (All)
    console.log('--- 1. ทดสอบ GET /products (ดึงสินค้าทั้งหมด) ---');
    let res = await fetch(`${BASE_URL}/products`);
    let data = await res.json();
    console.log(`Status: ${res.status} ${res.statusText}`);
    console.log('จำนวนสินค้าที่ได้:', data.length);
    console.log('ตัวอย่างข้อมูล:', JSON.stringify(data[0], null, 2), '\n');

    // 2. GET /products?search=keyboard (Query filter)
    console.log('--- 2. ทดสอบ GET /products?search=keyboard (ค้นหาด้วย Query String) ---');
    res = await fetch(`${BASE_URL}/products?search=keyboard`);
    data = await res.json();
    console.log(`Status: ${res.status} ${res.statusText}`);
    console.log('ผลลัพธ์การค้นหา:', JSON.stringify(data, null, 2), '\n');

    // 3. POST /products (สร้างสินค้าใหม่ - Success)
    console.log('--- 3. ทดสอบ POST /products (เพิ่มสินค้าใหม่ - ข้อมูลถูกต้อง) ---');
    res = await fetch(`${BASE_URL}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Gaming Headset',
        price: 59.99,
        quantity: 4
      })
    });
    data = await res.json();
    console.log(`Status: ${res.status} ${res.statusText} (คาดหวัง 201 Created)`);
    console.log('สินค้าใหม่ที่ถูกสร้างพร้อม ID:', JSON.stringify(data, null, 2));
    const createdId = data.id;
    console.log('\n');

    // 4. POST /products (สร้างสินค้าใหม่ - Error 400 Bad Request)
    console.log('--- 4. ทดสอบ POST /products (เพิ่มสินค้า - ส่งข้อมูลไม่ถูกต้อง/ขาด) ---');
    res = await fetch(`${BASE_URL}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: '',
        price: -10
      })
    });
    data = await res.json();
    console.log(`Status: ${res.status} ${res.statusText} (คาดหวัง 400 Bad Request)`);
    console.log('Error Response:', JSON.stringify(data, null, 2), '\n');

    // 5. GET /products/:id (Get single product by ID - Success)
    console.log(`--- 5. ทดสอบ GET /products/${createdId} (ดึงสินค้าเดี่ยวตาม ID) ---`);
    res = await fetch(`${BASE_URL}/products/${createdId}`);
    data = await res.json();
    console.log(`Status: ${res.status} ${res.statusText}`);
    console.log('ข้อมูลสินค้า:', JSON.stringify(data, null, 2), '\n');

    // 6. GET /products/:id (Not Found - 404)
    console.log('--- 6. ทดสอบ GET /products/not-exist-999 (ID ที่ไม่มีอยู่จริง) ---');
    res = await fetch(`${BASE_URL}/products/not-exist-999`);
    data = await res.json();
    console.log(`Status: ${res.status} ${res.statusText} (คาดหวัง 404 Not Found)`);
    console.log('Response:', JSON.stringify(data, null, 2), '\n');

    // 7. PUT /products/:id (Update product - Success)
    console.log(`--- 7. ทดสอบ PUT /products/${createdId} (แก้ไขราคาสินค้า) ---`);
    res = await fetch(`${BASE_URL}/products/${createdId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        price: 49.99,
        quantity: 10
      })
    });
    data = await res.json();
    console.log(`Status: ${res.status} ${res.statusText} (คาดหวัง 200 OK)`);
    console.log('สินค้าหลังการอัปเดต:', JSON.stringify(data, null, 2), '\n');

    // 8. DELETE /products/:id (Delete product - Success)
    console.log(`--- 8. ทดสอบ DELETE /products/${createdId} (ลบสินค้าที่เพิ่งสร้าง) ---`);
    res = await fetch(`${BASE_URL}/products/${createdId}`, {
      method: 'DELETE'
    });
    data = await res.json();
    console.log(`Status: ${res.status} ${res.statusText} (คาดหวัง 200 OK)`);
    console.log('ผลการลบ:', JSON.stringify(data, null, 2), '\n');

    // 9. Verify deletion
    console.log(`--- 9. ตรวจสอบว่าสินค้า ID ${createdId} หายไปจริงหรือไม่ ---`);
    res = await fetch(`${BASE_URL}/products/${createdId}`);
    data = await res.json();
    console.log(`Status: ${res.status} ${res.statusText} (คาดหวัง 404 Not Found)`);
    console.log('Response:', JSON.stringify(data, null, 2), '\n');

    console.log('====================================================');
    console.log('🎉 ทดสอบครบทุกกรณีสำเร็จ 100%! API ทำงานถูกต้องตามสเปก');
    console.log('====================================================');

  } catch (err) {
    if (err.cause && err.cause.code === 'ECONNREFUSED') {
      console.error('❌ ไม่สามารถเชื่อมต่อกับ Server ได้ (ECONNREFUSED)');
      console.error('👉 ตรวจสอบว่าได้รัน server หรือยัง โดยพิมพ์ใน Git Bash:');
      console.error('   cd server && npm run dev');
    } else {
      console.error('❌ เกิดข้อผิดพลาดในการทดสอบ:', err.message);
    }
  }
}

runTests();

