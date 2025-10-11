export const IMAGE_PATH = 'images';
export const BILL_PATH = 'bills';
export const ORIGINAL_PATH = 'originals';
export const EXCEL_PATH = 'excels';
export const CSV_PATH = 'csvs';
export const THUMBNAIL_PATH = 'thumbnails';
export const THUMBNAIL_PATH_2X = 'thumbnails_2x';

export const getJwtSecret = () => process.env.JWT_SECRET ?? '';

export const getRegion = () => {
  const region = process.env.REGION;
  if (!region) throw new Error('Missing REGION env variable');
  return region;
};

export const getAwsAccessKey = () => {
  const region = process.env.AWS_ACCESS_KEY_ID;
  if (!region) throw new Error('Missing AWS_ACCESS_KEY_ID env variable');
  return region;
};

export const getAwsSecretAccessKey = () => {
  const region = process.env.AWS_SECRET_ACCESS_KEY;
  if (!region) throw new Error('Missing AWS_SECRET_ACCESS_KEY env variable');
  return region;
};

export const getImageUploadBucket = () => {
  const bucket = process.env.IMAGE_UPLOAD_BUCKET;
  if (!bucket) throw new Error('Missing IMAGE_UPLOAD_BUCKET env variable');
  return bucket;
};

export const getFilePath = () => {
  return `https://${getImageUploadBucket()}.s3.${getRegion()}.amazonaws.com`;
};

export const S3_GENERAL_IMAGES_PATH = 'general/images';
