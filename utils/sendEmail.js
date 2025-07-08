const nodeMailer = require("nodemailer");

const sendEmail = async (options) => {
    const transporter = nodeMailer.createTransport({
        host: process.env.SMPT_HOST,
        port: process.env.SMPT_PORT || 587,
        secure: false,
        service:process.env.SMPT_SERVICE,
        auth: {
            user: process.env.SMPT_MAIL ,
            pass: process.env.SMPT_PASSWORD,
        },
    });
    // transporter.sendMail(mailOptions, (error, info) => {
    //     if (error) {
    //         console.error("Send Mail Error:", error);
    //     } else {
    //         console.log("Message sent:", info.response);
    //     }
    // });

    const mailOptions = {
        from :process.env.SMPT_MAIL,
        to: options.email,
        subject: options.subject,
        text: options.message,
    };

  await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;