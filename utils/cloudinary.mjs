import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

// Test connection
const testConnection = async () => {
  try {
    const result = await cloudinary.api.ping();
    console.log('✅ Connected to Cloudinary');
    return true;
  } catch (error) {
    console.error('❌ Cloudinary connection error:', error.message);
    return false;
  }
};

// Test connection on startup
testConnection();

// Upload image
export const uploadImage = async (file) => {
  try {
    const result = await cloudinary.uploader.upload(file, {
      folder: 'blog_images',
      use_filename: true,
      unique_filename: true,
      overwrite: true,
      transformation: [
        { width: 1200, height: 630, crop: 'fill' },
        { quality: 'auto' }
      ]
    });
    return result.secure_url;
  } catch (error) {
    console.error('Error uploading to cloudinary:', error);
    throw error;
  }
};

// Delete image
export const deleteImage = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error('Error deleting from cloudinary:', error);
    throw error;
  }
};

export default cloudinary; 