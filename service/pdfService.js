const pdf = require("html-pdf");
const path = require("path");
const ejs = require("ejs");
const fs = require("fs");
const { formatDate } = require("../utils/dateUtils");
const { formatDateToDDMMYYYY } = require("../utils/parsedDateAndDay");

async function generateInvoicePDF(invoice) {
  return new Promise((resolve, reject) => {
    try {
      const templatePath = path.join(
        __dirname,
        "../public/templates/invoice-template.ejs"
      );

      // Format dates
      const formattedDate = formatDate(invoice.createdAt || new Date());
      const dueDate = formatDate(
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      ); // 7 days from now

      // Format period dates
      const periodStart = invoice.period?.startDate
        ? formatDateToDDMMYYYY(invoice.period.startDate)
        : formatDateToDDMMYYYY(new Date());
      const periodEnd = invoice.period?.endDate
        ? formatDateToDDMMYYYY(invoice.period.endDate)
        : formatDateToDDMMYYYY(new Date());

      // Prepare partial payment data if applicable
      const partialPayment =
        invoice.payment?.status === "Partially Paid"
          ? {
              partialPaymentAmount: invoice.totals?.paidAmount || 0,
              balanceAmount: invoice.totals?.balanceAmount || 0,
              partialPaymentDays:
                Math.ceil(
                  (invoice.period?.endDate - invoice.period?.startDate) /
                    (1000 * 60 * 60 * 24)
                ) / 2,
            }
          : null;

      // Prepare delivery stats (if available from getCustomerData)
      const deliveryStats = invoice.deliveryStats || null;

      // Read CSS file
      const cssPath = path.join(
        __dirname,
        "../public/templates/invoice-styles.css"
      );
      const cssContent = fs.readFileSync(cssPath, "utf8");

      // Render the EJS template
      ejs.renderFile(
        templatePath,
        {
          invoice,
          formattedDate,
          dueDate,
          periodStart,
          periodEnd,
          partialPayment,
          deliveryStats,
        },
        (err, html) => {
          if (err) {
            reject(err);
            return;
          }

          // Inject CSS into HTML
          const htmlWithCSS = html.replace(
            "</head>",
            `<style>${cssContent}</style></head>`
          );

          // PDF options
          const options = {
            format: "A4",
            border: {
              top: "0.5in",
              right: "0.5in",
              bottom: "0.5in",
              left: "0.5in",
            },
            header: {
              height: "0.5in",
              contents: "",
            },
            footer: {
              height: "0.5in",
              contents: "",
            },
            type: "pdf",
            quality: "75",
            renderDelay: 2000,
            timeout: 30000,
            phantomArgs: ["--ignore-ssl-errors=true", "--web-security=false"],
          };

          // Generate PDF
          pdf.create(htmlWithCSS, options).toBuffer((err, buffer) => {
            if (err) {
              reject(err);
              return;
            }
            resolve(buffer);
          });
        }
      );
    } catch (error) {
      reject(error);
    }
  });
}

module.exports = { generateInvoicePDF };
