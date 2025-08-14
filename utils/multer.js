const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../utils/cloudinaryConfig"); // adjust path if needed

const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|mp4|mkv|mp3|wav|aac|pdf/;
    const mimeType = allowedTypes.test(file.mimetype);
    const extName = allowedTypes.test(file.originalname.toLowerCase());

    if (mimeType && extName) {
        return cb(null, true);
    } else {
        cb(new Error("Only image, video, audio, or PDF files are allowed!"), false);
    }
};

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: "products", // folder in Cloudinary
        resource_type: "auto", // auto-detect type (image/video/raw)
        format: async (req, file) => file.mimetype.split("/")[1], // auto extension
        public_id: (req, file) => Date.now() + "-" + file.originalname.split('.')[0],
    },
});

const upload = multer({ storage, fileFilter });

module.exports = upload;
