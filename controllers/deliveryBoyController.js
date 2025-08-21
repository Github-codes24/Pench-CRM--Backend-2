const DeliveryBoy = require('../models/deliveryBoyModel');
const bcrypt = require('bcryptjs');

//  Add a new delivery boy
const addDeliveryBoy = async (req, res) => {
    try {
        const {
            name,
            email,
            phoneNumber,
            address,
            password,
            assignedAreas,
            issuedBottles
        } = req.body;

        // Basic validation
        if (!name || !email || !phoneNumber || !address || !password) {
            return res.status(400).json({ message: 'Please fill all required fields.' });
        }

        // Check if user already exists
        const existingDeliveryBoy = await DeliveryBoy.findOne({ $or: [{ email }, { phoneNumber }] });
        if (existingDeliveryBoy) {
            return res.status(400).json({ message: 'Delivery boy with this email or phone number already exists.' });
        }

        // Create a new delivery boy instance
        const newDeliveryBoy = new DeliveryBoy({
            name,
            email,
            phoneNumber,
            address,
            password,
            // assignedAreas can be a comma-separated string from the form
            assignedAreas: assignedAreas ? assignedAreas.split(',').map(area => area.trim()) : [],
            issuedBottles
        });

        // Save the new delivery boy to the database
        const savedDeliveryBoy = await newDeliveryBoy.save();

        // Respond with the created user (omitting the password)
        const userResponse = { ...savedDeliveryBoy._doc };
        delete userResponse.password;

        res.status(201).json({
            message: 'Delivery boy added successfully!',
            deliveryBoy: userResponse
        });

    } catch (error) {
        // Handle validation errors or other issues
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};


const getDeliveryBoys = async (req, res) => {
    try {
        const deliveryBoys = await DeliveryBoy.find().select('-password');
        res.status(200).json({
            message: "got all delivery boys",
            count: deliveryBoys.length,
            deliveryBoys
        });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

const getDeliveryBoyById = async (req, res) => {
    try{
        const { id } = req.params;

        const deliveryBoy = await DeliveryBoy.findById(id).select("-password");

        if(!deliveryBoy){
            return res.status(404).send({
                message: "Delivery boy not found",
                success: false
            })
        }

        res.status(200).send({
            message: "Delivery boy fetched successfully!",
            success: true,
            deliveryBoy
        })
    }catch(err){
        res.status(500).send({
            message: err.message,
            success: false
        })
    }
}

const updateDeliveryBoy = async (req, res) => {
    try {
        const { name, email, phoneNumber, address, password, assignedAreas, issuedBottles } = req.body;

        const deliveryBoy = await DeliveryBoy.findById(req.params.id);

        if (!deliveryBoy) {
            return res.status(404).json({ message: 'Delivery boy not found.' });
        }

        // Prepare the update object
        const updateData = {
            name: name || deliveryBoy.name,
            email: email || deliveryBoy.email,
            phoneNumber: phoneNumber || deliveryBoy.phoneNumber,
            address: address || deliveryBoy.address,
            assignedAreas: assignedAreas ? assignedAreas.split(',').map(area => area.trim()) : deliveryBoy.assignedAreas,
            issuedBottles: issuedBottles || deliveryBoy.issuedBottles
        };

        // If a new password is provided, hash it before updating
        if (password) {
            const salt = await bcrypt.genSalt(10);
            updateData.password = await bcrypt.hash(password, salt);
        }

        const updatedDeliveryBoy = await DeliveryBoy.findByIdAndUpdate(
            req.params.id,
            { $set: updateData },
            { new: true, runValidators: true }
        ).select('-password');

        res.status(200).json({
            message: 'Delivery boy updated successfully!',
            deliveryBoy: updatedDeliveryBoy
        });

    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

const deleteDeliveryBoy = async (req, res) => {
    try {
        const deliveryBoy = await DeliveryBoy.findById(req.params.id);

        if (!deliveryBoy) {
            return res.status(404).json({ message: 'Delivery boy not found.' });
        }

        await deliveryBoy.deleteOne(); 

        res.status(200).json({ message: 'Delivery boy removed successfully.' });

    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};


module.exports = {
    addDeliveryBoy,
    getDeliveryBoys,
    getDeliveryBoyById,
    updateDeliveryBoy,
    deleteDeliveryBoy
};
