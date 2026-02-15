export const isDevelopment = process.env.NODE_ENV !== 'production';

export const environment = {
  isDevelopment,
  isProduction: !isDevelopment,
  nodeEnv: isDevelopment ? 'development' : 'production',
};
