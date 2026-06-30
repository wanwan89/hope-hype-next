export const BAD_WORDS = ["anjing", "bangsat", "kontol", "babi", "memek", "jembut", "ngentot", "bgsd", "njing", "tolol", "goblok"];

export const containsBadWords = (text: string) => {
  const lowerText = text.toLowerCase().replace(/[^a-z0-9 ]/g, ''); 
  const words = lowerText.split(/\s+/); 
  return BAD_WORDS.some(badWord => words.includes(badWord) || lowerText.includes(badWord));
};

export const getOptimizedImage = (url: string) => {
  if (!url) return '';
  let cleanUrl = url.trim();
  if (cleanUrl.includes('res.cloudinary.com') && !cleanUrl.includes('f_auto')) {
    return cleanUrl.replace('/image/upload/', '/image/upload/w_100,h_100,c_fill,f_auto,q_auto/');
  }
  return cleanUrl;
};
