/** @type {import('next').NextConfig} */
//const nextConfig = {};

//module.exports = nextConfig;

/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
      remotePatterns: [
        {
          protocol: 'https',
          hostname: 'kfkreohqyvlcdqehhfvg.supabase.co',
          port: '',
          pathname: '/storage/v1/object/public/**',
        },
      ],
    },
  };
  
  module.exports = nextConfig;