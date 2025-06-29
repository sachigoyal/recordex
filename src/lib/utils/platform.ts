export const isWindows = () => {
  return navigator.userAgent.toLowerCase().includes('windows');
};

export const isMacOS = () => {
  return navigator.userAgent.toLowerCase().includes('mac');
};

export const isLinux = () => {
  return navigator.userAgent.toLowerCase().includes('linux');
};

export const getPlatform = () => {
  if (isWindows()) return 'windows';
  if (isMacOS()) return 'macos';
  if (isLinux()) return 'linux';
  return 'unknown';
}; 