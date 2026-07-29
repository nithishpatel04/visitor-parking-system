const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1';
const client = new S3Client({ region });

function getBucketName() {
  return process.env.INCIDENT_ATTACHMENTS_BUCKET || '';
}

async function createUploadUrl({ bucket, key, contentType }) {
  const command = new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType });
  return getSignedUrl(client, command, { expiresIn: 300 });
}

async function createDownloadUrl({ bucket, key }) {
  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  return getSignedUrl(client, command, { expiresIn: 300 });
}

module.exports = { client, getBucketName, createUploadUrl, createDownloadUrl };
