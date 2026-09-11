const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Field 'name' is required"],
      trim: true
    },
    price: {
      type: Number,
      required: [true, "Field 'price' is required"],
      min: [0, "Price must be positive"]
    },
    quantity: {
      type: Number,
      default: 1,
      min: [0, "Quantity must be non-negative"]
    }
  },
  {
    timestamps: true,
    // เปลี่ยน _id ของ MongoDB ให้เป็น id เพื่อให้ฝั่ง React Frontend ใช้งานได้ทันที
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      }
    }
  }
);

module.exports = mongoose.model('Product', productSchema);