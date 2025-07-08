const ErrorHandler = require("../utils/errorhandler");
     
module.exports = (err,req,res,next) => {
 err.statusCode = err.statusCode || 500 ;
 err.messege = err.messege || "Internal Server Error";


 //wrong Mongodb Id error 
 if(err.name === "CastError"){
  const messege = `Resource not found. Inavalid: ${err.path}`;
  err = new ErrorHandler(messege,400);
}

//Mongoose duplicate key error
if(err.code === 11000){
  const message = `Duplicate ${Object.keys(err.keyValue)} Entered`
  err = new ErrorHandler(message,400);
}

 //wrong JWT error 
 if(err.name === "JsonWebTokenError"){
  const messege = `Json Web Token is invalid, try again `;
  err = new ErrorHandler(messege,400);
 }


 //JWT EXPIRE ERROR 
 if(err.name === "TokenExpiredError"){
  const messege = `Json Web Token isExpired, try again `;
  err = new ErrorHandler(messege,400);
 }


  res.status(err.statusCode).json({
    success:false,
    messege:err.stack,
  });
};