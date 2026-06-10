// Dynamically set the API base URL based on the current window location
// This ensures that devices on the same network connecting via an IP (e.g. 192.168.x.x)
// will correctly route requests to that IP instead of their own localhosts.

export const API_BASE_URL = `${window.location.protocol}//${window.location.hostname}:5000`;
