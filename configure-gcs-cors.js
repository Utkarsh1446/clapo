const { Storage } = require('@google-cloud/storage');
require('dotenv').config({ path: '.env' });

async function configureCors() {
  try {
    console.log('🔧 Configuring CORS for GCS bucket...');

    // Check if GCS is configured
    if (!process.env.GCS_PROJECT_ID || !process.env.GCS_BUCKET_NAME || !process.env.GCS_CLIENT_EMAIL || !process.env.GCS_PRIVATE_KEY) {
      console.error('❌ Missing GCS environment variables');
      process.exit(1);
    }

    const privateKey = process.env.GCS_PRIVATE_KEY;
    const formattedKey = privateKey.replace(/\\n/g, '\n');

    const storage = new Storage({
      projectId: process.env.GCS_PROJECT_ID,
      credentials: {
        client_email: process.env.GCS_CLIENT_EMAIL,
        private_key: formattedKey,
      },
    });

    const bucketName = process.env.GCS_BUCKET_NAME || 'clapo_media_bucket';
    const bucket = storage.bucket(bucketName);

    // Configure CORS
    const corsConfiguration = [
      {
        origin: ['https://clapo.vercel.app', 'https://*.vercel.app', 'http://localhost:3000'],
        method: ['GET', 'HEAD', 'PUT', 'POST', 'DELETE'],
        responseHeader: ['Content-Type', 'x-goog-acl', 'x-goog-content-length-range'],
        maxAgeSeconds: 3600,
      },
    ];

    await bucket.setCorsConfiguration(corsConfiguration);

    console.log('✅ CORS configuration applied successfully');
    console.log('Configuration:', JSON.stringify(corsConfiguration, null, 2));
    process.exit(0);
  } catch (error) {
    console.error('❌ CORS configuration error:', error);
    console.error('Error stack:', error.stack);
    process.exit(1);
  }
}

configureCors();
