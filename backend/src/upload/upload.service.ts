import { Injectable, BadRequestException } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';

@Injectable()
export class UploadService {
  constructor() {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'mock_cloud',
      api_key: process.env.CLOUDINARY_API_KEY || 'mock_key',
      api_secret: process.env.CLOUDINARY_API_SECRET || 'mock_secret',
    });
  }

  getUploadSignature(targetFolder: string) {
    const allowedFolders = ['nexaris/products', 'nexaris/reviews'];
    if (!allowedFolders.includes(targetFolder)) {
      throw new BadRequestException('Invalid upload folder path.');
    }

    const timestamp = Math.round(new Date().getTime() / 1000);
    const paramsToSign = {
      timestamp,
      folder: targetFolder,
    };

    const signature = cloudinary.utils.api_sign_request(
      paramsToSign,
      process.env.CLOUDINARY_API_SECRET || 'mock_secret',
    );

    return {
      signature,
      timestamp,
      apiKey: process.env.CLOUDINARY_API_KEY || 'mock_key',
      cloudName: process.env.CLOUDINARY_CLOUD_NAME || 'mock_cloud',
      folder: targetFolder,
    };
  }
}
