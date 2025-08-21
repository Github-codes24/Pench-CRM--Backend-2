const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Schema for issued bottles
const bottleSchema = new mongoose.Schema({
    type: {
        type: String,
        required: [true, 'Bottle type is required.'],
        enum: ['1/2 Litre', '1 Litre']
    },
    quantity: {
        type: Number,
        required: [true, 'Bottle quantity is required.'],
        min: [1, 'Quantity must be at least 1.']
    }
}, { _id: false });

// Main schema for the Delivery Boy
const deliveryBoySchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Name is required.'],
        trim: true
    },
    email: {
        type: String,
        required: [true, 'Email is required.'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please fill a valid email address']
    },
    phoneNumber: {
        type: String,
        required: [true, 'Phone number is required.'],
        unique: true,
        trim: true,
        match: [/^[0-9]{10}$/, 'Please fill a valid 10-digit phone number']
    },
    address: {
        type: String,
        required: [true, 'Address is required.'],
        trim: true
    },
    password: {
        type: String,
        required: [true, 'Password is required.'],
        minlength: [6, 'Password must be at least 6 characters long.']
    },
    assignedAreas: {
        type: [String]
    },
    issuedBottles: {
        type: [bottleSchema],
        default: []
    }
}, { timestamps: true });

// Pre-save hook to hash the password before saving
deliveryBoySchema.pre('save', async function(next) {
    if (!this.isModified('password')) {
        return next();
    }
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

const DeliveryBoy = mongoose.model('DeliveryBoy', deliveryBoySchema);

module.exports = DeliveryBoy;