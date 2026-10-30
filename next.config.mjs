/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Para el servidor, permitir todos los módulos nativos
      config.externals.push("playwright")
    } else {
      // Para el cliente, excluir completamente playwright
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        path: false,
        stream: false,
        util: false,
        os: false,
        child_process: false,
      }
    }
    return config
  },
}

export default nextConfig
