/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      // Локальный бэкенд (загруженные фото и обложки).
      { protocol: 'http', hostname: 'localhost' },
      // Аватары OAuth (VK/Yandex) и любые внешние https-изображения.
      { protocol: 'https', hostname: '**' },
    ],
  },
};

module.exports = nextConfig;
