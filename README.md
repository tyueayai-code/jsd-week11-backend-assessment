#  Assessment (Shopping Cart)

โปรเจกต์ Fullstack Web Application สำหรับจัดการรายการสินค้า (Products) ด้วย Express.js API และ React (Vite)

 รันโปรเจ็คแบบ local 

### 1. ฝั่ง Backend server — Port 3000
### 2.ฝั่ง Frontend ผ่าน jsd-backend-assessment

##  ฟีเจอร์หลักของ React Frontend

- Fetch & Render ดึงข้อมูลสินค้าจาก API ด้วย useEffect และแสดงผลในตาราง
- Live Search & Filter ค้นหาสินค้าแบบเรียลไทม์ผ่าน Query String (`/products?search=...`)
- Add Product:  ฟอร์มเพิ่มสินค้าใหม่ อัปเดต React State ทันทีโดยไม่ต้อง Reload หน้าเว็บ
- Inline Edit:  แก้ไขราคาสินค้าและจำนวนได้โดยตรงในตาราง
- Delete Product: ลบสินค้าพร้อมกล่องยืนยัน และตัดรายการออกจากตารางทันที
- Loading State แสดง Spinner ขณะรอการเชื่อมต่อ
- Error State & Retry  มีแบนเนอร์แจ้งเตือนสีแดงพร้อมปุ่ม Retry หาก Server ไม่ได้เปิดอยู่
