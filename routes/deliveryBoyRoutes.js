const express = require('express');
const router = express.Router();
const { 
    addDeliveryBoy, 
    getDeliveryBoys, 
    getDeliveryBoyById, 
    updateDeliveryBoy,
    deleteDeliveryBoy 
} = require('../controllers/deliveryBoyController');


router.post('/create-delivery-boy', addDeliveryBoy);

router.get('/get-all-delivery-boys', getDeliveryBoys);

router.get('/get-delivery-boy/:id', getDeliveryBoyById);

router.put('/update-delivery-boy/:id', updateDeliveryBoy);

router.delete('/delete-delivery-boy/:id', deleteDeliveryBoy);

module.exports = router;
