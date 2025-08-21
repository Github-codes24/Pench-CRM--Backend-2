const ErrorHandler = require("../utils/errorhendler");

module.exports = (theFunc) => {
  return async (req, res, next) => {
    try {
      await theFunc(req, res); // ✅ next pass nahi karna hoga controller me
    } catch (err) {
      next(
        err instanceof Error
          ? err
          : new ErrorHandler(err.message || "Something went wrong", 500)
      );
    }
  };
};
