/**
 * Test configuration
 */

export const config = {
  baseUrl: process.env.API_BASE_URL || 'https://kalender-dev.schlatter.net',
  apiPath: '/api2',

  // Test users from users.json
  testUser: 'Nils',
  adminUser: 'Christian',
  otherUser: 'Helmi',

  // Test date range (far future to avoid conflicts)
  testDateStart: '2099-01-01',
  testDateEnd: '2099-12-31',
} as const;

export const getApiUrl = (path: string) => {
  return `${config.baseUrl}${config.apiPath}${path}`;
};
