const jwt = require("jsonwebtoken");

const sendToken = (user, statusCode, res) => {
    const jwtExpire = process.env.JWT_EXPIRE || "5d";
    const cookieExpireDays = parseInt(jwtExpire) || 5; // Default 5 days if parseInt fails

    const token = jwt.sign(
        { id: user._id },
        process.env.JWT_SECRET || "HFFNSJGKFDAUGJDGDNBJ444GDGGhbhFGDU",
        { expiresIn: jwtExpire }
    );

    const options = {
        expires: new Date(Date.now() + cookieExpireDays * 24 * 60 * 60 * 1000), // ✅ Date object
        httpOnly: true,
    };

    res.status(statusCode)
        .cookie("token", token, options)
        .json({
            success: true,
            token,
            user,
        });
};

module.exports = sendToken;

