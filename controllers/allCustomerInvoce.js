const Customer = require("../models/coustomerModel");
const ErrorHandler = require("../utils/errorhendler");
const catchAsyncErrors = require("../middlewares/catchAsyncErrors");
const Invoice = require("../models/invoicesModel");
const generateInvoiceNumber = require("../utils/generateInvoiceNumber");
const { formatDate } = require("../utils/dateUtils");
const { processCustomerInvoice } = require("../service/invoiceService");
const { generateInvoicePDF } = require("../service/pdfService");
const { uploadBufferToCloudinary } = require("../service/cloudinaryService");

exports.allCustomerInvoices = catchAsyncErrors(async (req, res, next) => {
  let {
    name,
    phoneNumber,
    status,
    startDate,
    endDate,
    sort = "-createdAt",
    page = 1,
    limit = 10,
  } = req.query;

  let query = {};

  if (name) {
    query.name = { $regex: name, $options: "i" };
  }

  if (phoneNumber) {
    query.phoneNumber = { $regex: phoneNumber, $options: "i" };
  }

  if (status) {
    query["products.status"] = status;
  }

  if (startDate && endDate) {
    query.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
  }

  page = parseInt(page);
  limit = parseInt(limit);
  const skip = (page - 1) * limit;

  const customers = await Customer.find(query)
    .select("name phoneNumber products createdAt")
    .sort(sort)
    .skip(skip)
    .limit(limit);

  if (!customers || customers.length === 0) {
    return next(new ErrorHandler("No customers found", 404));
  }

  const formattedCustomers = customers.map((cust) => {
    const firstProduct = cust.products[0];
    return {
      id: cust._id,
      name: cust.name,
      phoneNumber: cust.phoneNumber,
      startDate: firstProduct?.startDate || null,
      subscriptionPlan: firstProduct?.subscriptionPlan || "None",
      totalAmount: cust.products.reduce(
        (acc, p) => acc + (p.totalPrice || 0),
        0
      ),
      status: "Unpaid", // agar aapko product ka actual status chahiye to ye dynamic bana sakte ho
    };
  });

  const total = await Customer.countDocuments(query);

  res.status(200).json({
    success: true,
    count: formattedCustomers.length,
    page,
    totalPages: Math.ceil(total / limit),
    totalCustomers: total,
    customers: formattedCustomers,
  });
});

exports.generateInvoiceForCustomer = async (req, res, next) => {
  try {
    const { customerId } = req.body;

    if (!customerId) {
      return next(new ErrorHandler("Customer ID is required", 400));
    }

    // Fetch customer with subscription products
    const customer = await Customer.findById(customerId).populate(
      "products.product"
    );
    if (!customer) {
      return next(new ErrorHandler("Customer not found", 404));
    }

    if (!customer.products || customer.products.length === 0) {
      return next(new ErrorHandler("Customer has no products", 404));
    }

    // Hardcoded default values
    const DairyAddress = `17, S Ambazari Rd, Madhav Nagar,<br />Nagpur 440010,<br />Maharashtra`;
    const defaultGST = "3215658686786767";

    // Aggregate product data
    const productMap = {};
    customer.products.forEach((item) => {
      const p = item.product;
      const key = p.productCode;

      if (!productMap[key]) {
        productMap[key] = {
          productName: p.productName,
          productCode: p.productCode,
          description: p.description,
          size: p.size,
          quantity: item.quantity || 0,
          price: p.price,
          total: (item.quantity || 0) * p.price,
        };
      } else {
        productMap[key].quantity += item.quantity || 0;
        productMap[key].total += (item.quantity || 0) * p.price;
      }
    });

    const productsArray = Object.values(productMap);

    // Calculate subtotal & totalAmount
    const subtotal = productsArray.reduce((acc, p) => acc + p.total, 0);
    const totalAmount = subtotal;

    // 🔹 Check if invoice already exists for this customer
    let invoice = await Invoice.findOne({ customer: customer._id });

    if (invoice) {
      // Update existing invoice
      invoice.totalAmount = totalAmount;
      invoice.subTotal = subtotal;
      invoice.status = "Unpaid";
      invoice.issueDate = new Date();
      await invoice.save();
    } else {
      // Create new invoice with unique invoice number
      const invoiceNumber = generateInvoiceNumber();
      invoice = await Invoice.create({
        invoiceNumber,
        customer: customer._id,
        totalAmount,
        subTotal: subtotal,
        issueDate: new Date(),
        status: "Unpaid",
      });
    }

    // Prepare payload (ye PDF me jayega)
    const payload = {
      invoiceNumber: invoice.invoiceNumber,
      customerName: customer.name,
      customerAddress: customer.address,
      DairyAddress,
      GST: defaultGST,
      issueDate: formatDate(invoice.issueDate),
      products: productsArray,
      subtotal,
      totalAmount,
      status: invoice.status,
    };

    // 🔹 Generate PDF
    const pdfBuffer = await generateInvoicePDF(payload);

    // 🔹 Upload to Cloudinary
    const cloudResult = await uploadBufferToCloudinary(
      pdfBuffer,
      `invoice_${invoice.invoiceNumber}`
    );

    // 🔹 Save PDF URL in DB
    invoice.pdfUrl = cloudResult.secure_url;
    await invoice.save();

    // Final response
    res.status(200).json({
      success: true,
      invoice: {
        ...payload,
        pdfUrl: invoice.pdfUrl,
      },
    });
  } catch (err) {
    next(
      err instanceof Error
        ? err
        : new ErrorHandler(err.message || "Something went wrong", 500)
    );
  }
};

exports.generateMonthlyInvoices = async (req, res, next) => {
  try {
    // 🔹 Get all customers
    const customers = await Customer.find().populate("products.product");

    if (!customers || customers.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "No customers found" });
    }

    let results = [];
    for (const customer of customers) {
      const invoice = await processCustomerInvoice(customer);

      // 🔹 Send to WhatsApp (dummy function for now)
      await sendInvoiceOnWhatsApp(customer.phoneNumber, invoice.pdf);

      results.push({ customer: customer.name, pdfUrl: invoice.pdf });
    }

    res.status(200).json({
      success: true,
      message: "Monthly invoices generated and sent via WhatsApp",
      results,
    });
  } catch (err) {
    next(err);
  }
};

// exports.bulkSendInvoices = catchAsync(async (req, res, next) => {
//   const { customerIds } = req.body;

//   if (!Array.isArray(customerIds) || customerIds.length === 0) {
//     return next(new ErrorHandler("Customer IDs are required", 400));
//   }

//   const invoices = await Invoice.find({
//     customer: { $in: customerIds },
//   }).populate("customer", "name phoneNumber");

//   if (!invoices || invoices.length === 0) {
//     return next(new ErrorHandler("No invoices found for given customers", 404));
//   }

//   const results = await Promise.allSettled(
//     invoices.map(async (invoice) => {
//       if (!invoice.customer?.phoneNumber) {
//         throw new Error(
//           `Customer ${invoice.customer?.name || ""} has no phone number`
//         );
//       }

//       const payload = {
//         messaging_product: "whatsapp",
//         to: invoice.customer.phoneNumber,
//         type: "document",
//         document: {
//           link: invoice.pdf,
//           caption: `This is your one month schema.\nInvoice No: ${invoice.invoiceNumber}`,
//           filename: `${invoice.customer.name}-invoice.pdf`,
//         },
//       };

//       const resp = await axios.post(
//         `${WHATSAPP_API_URL}/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
//         payload,
//         {
//           headers: {
//             Authorization: `Bearer ${WHATSAPP_TOKEN}`,
//             "Content-Type": "application/json",
//           },
//         }
//       );

//       return {
//         customer: invoice.customer.name,
//         status: "sent",
//         data: resp.data,
//       };
//     })
//   );

//   res.status(200).json({
//     success: true,
//     message: "Bulk invoices processed",
//     results,
//   });
// });
