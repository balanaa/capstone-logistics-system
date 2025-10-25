/**
 * Detects if the user is on a mobile device (phone or tablet)
 * Uses user agent detection to identify actual mobile devices
 * regardless of screen size
 */
export const isMobileDevice = () => {
  // Check if we're in a browser environment
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false;
  }

  const userAgent = navigator.userAgent || navigator.vendor || window.opera;

  // Check for mobile device patterns in user agent
  const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile|tablet|kindle|silk|playbook/i;
  
  return mobileRegex.test(userAgent.toLowerCase());
};

