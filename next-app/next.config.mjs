/** @type {import('next').NextConfig} */
const nextConfig = {
    // Desactivar exportación estática en Vercel para permitir que se compilen y funcionen las Serverless API Routes (/api)
    output: process.env.VERCEL ? undefined : 'export',
    images: {
        unoptimized: true,
    },
};

export default nextConfig;
