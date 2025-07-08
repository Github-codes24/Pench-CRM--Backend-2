const jwt = require("jsonwebtoken");
const { JWT_SECRET, JWT_EXPIRE } = process.env; 

const sendToken = (user, statusCode, res) => {
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || "HFFNSJGKFDAUGJDGDNBJ444GDGGhbhFGDU", { expiresIn: process.env.JWT_EXPIRE || "5d" });

    const options = {
        expires: new Date(Date.now() + parseInt(process.env.JWT_EXPIRE) * 24 * 60 * 60 * 1000), 
        httpOnly: true,
    };

    res.status(statusCode).cookie("token", token, options).json({
        success: true,
        token,
        user,
    });
};

module.exports = sendToken;
