function isSameDay(date1, date2) {
    // Convert both dates to local date strings for comparison
    return date1.toDateString() === date2.toDateString();
}

function isWeekday(date) {
    const day = date.getDay();
    return day >= 1 && day <= 5; // Monday to Friday
}

function isWeekend(date) {
    const day = date.getDay();
    return day === 0 || day === 6; // Saturday or Sunday
}

function normalizeDate(date) {
    // Create a new date object and set time to midnight in local timezone
    const normalized = new Date(date);
    normalized.setHours(0, 0, 0, 0);
    return normalized;
}

function shouldDeliverOnDate(product, targetDate) {
    console.log(product,"prodyc")
    const startDate = normalizeDate(product.startDate);
    const endDate = normalizeDate(product.endDate);
    const normalizedTargetDate = normalizeDate(targetDate);

    // Check if within subscription period
    if (normalizedTargetDate < startDate || normalizedTargetDate > endDate) return false;

    switch (product.deliveryDays) {
        case "Daily":
            return true;

        case "Alternate Days":
            // Calculate days difference from start date
            const daysDiff = Math.floor((normalizedTargetDate - startDate) / (1000 * 60 * 60 * 24));
            return daysDiff % 2 === 0;

        case "Monday to Friday":
            return isWeekday(normalizedTargetDate);

        case "Weekends":
            return isWeekend(normalizedTargetDate);

        case "Custom":
            if (!product.customDeliveryDates || product.customDeliveryDates.length === 0) {
                return false;
            }

            return product.customDeliveryDates.some(customDate => {
                try {
                    const customDateObj = normalizeDate(customDate);
                    return isSameDay(customDateObj, normalizedTargetDate);
                } catch (error) {
                    console.error('Error parsing custom delivery date:', error);
                    return false;
                }
            });

        default:
            return false;
    }
}

function formatOrderResponse(customers, targetDate, deliveryBoyId) {
    const orders = [];
    const normalizedTargetDate = normalizeDate(targetDate);
    console.log('Normalized Target Date:', normalizedTargetDate);
    console.log('customers', customers);

    for (const customer of customers) {
        // Check if customer has products array
        if (!customer.products || !Array.isArray(customer.products)) {
            continue;
        }

        for (const product of customer.products) {
            console.log(product,"product")
            // Check if product has required fields and is assigned to this delivery boy
            if (!product ||

                !product.product) {
                continue;
            }
  console.log(product,"product1")
            try {
                if (shouldDeliverOnDate(product, normalizedTargetDate)) {
                    orders.push({
                        orderId: product._id,
                        customer: {
                            _id: customer._id,
                            name: customer.name || 'N/A',
                            phoneNumber: customer.phoneNumber || 'N/A',
                            address: customer.address || 'N/A',
                            userProfile: customer.userProfile || null,
                            gender: customer.gender || 'N/A'
                        },
                        product: {
                            _id: product.product._id,
                            name: product.product.productName || 'Unknown Product',
                            description: product.product.description || '',
                            quantity: product.quantity || 0,
                            price: product.product.price || 0
                        },
                        subscription: {
                            plan: product.subscriptionPlan || 'N/A',
                            deliveryDays: product.deliveryDays || 'N/A',
                            startDate: product.startDate,
                            endDate: product.endDate,
                            customDeliveryDates: product.customDeliveryDates || []
                        },
                        financials: {
                            totalPrice: product.totalPrice || 0,
                            amountPaid: product.amountPaidTillDate || 0,
                            amountDue: product.amountDue || 0
                        },
                        deliveryInfo: {
                            deliveryBoy: customer.deliveryBoy.name,
                            deliveryDate: normalizedTargetDate.toISOString().split('T')[0],
                            mobile: customer.phoneNumber.name// YYYY-MM-DD format

                        },
                        timestamps: {
                            createdAt: product.createdAt,
                            updatedAt: product.updatedAt
                        }
                    });
                }
            } catch (error) {
                console.error('Error processing product:', error);
                // Continue with other products instead of failing completely
                continue;
            }
        }
    }

    return orders;
}

module.exports = {
    isSameDay,
    isWeekday,
    isWeekend,
    normalizeDate,
    shouldDeliverOnDate,
    formatOrderResponse
};