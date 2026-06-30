// lib/comment-utils.ts

export const getOptimizedImage = (url: string) => {
  if (!url) return '';
  let cleanUrl = url.trim();
  if (cleanUrl.includes('res.cloudinary.com') && !cleanUrl.includes('f_auto')) {
    return cleanUrl.replace('/image/upload/', '/image/upload/w_100,h_100,c_fill,f_auto,q_auto/');
  }
  return cleanUrl;
};

const BAD_WORDS = ["anjing", "bangsat", "kontol", "babi", "memek", "jembut", "ngentot", "bgsd", "njing", "tolol", "goblok"];

export const containsBadWords = (text: string) => {
  const lowerText = text.toLowerCase().replace(/[^a-z0-9 ]/g, ''); 
  const words = lowerText.split(/\s+/); 
  return BAD_WORDS.some(badWord => words.includes(badWord) || lowerText.includes(badWord));
};

export const formatTimeAgo = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return "Baru saja";
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}j`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}h`;
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
};
