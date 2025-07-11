// utils/whatsappFormatter.js
exports.generateInvoiceMessage = (invoice) => {
  const message = `
🧾 *Invoice From Pench*
----------------------------------
📄 *Invoice ID:* ${invoice.invoiceId}
📅 *Date:* ${new Date(invoice.createdAt).toLocaleDateString()}
👤 *Customer:* ${invoice.customerName}
📦 *Subscription:* ${invoice.subscriptionPlan || "N/A"}
💰 *Amount:* ₹${invoice.price}
💳 *Status:* ${invoice.paymentStatus}
📝 *Payment Mode:* ${invoice.paymentMode || "N/A"}

📍 *Address:* ${invoice.customer?.address || "Not Available"}
☎️ *Phone:* ${invoice.customer?.phoneNumber || "Not Available"}

Thank you for your business!
- Pench Team
`.trim();

  return encodeURIComponent(message); // WhatsApp-safe format
};
