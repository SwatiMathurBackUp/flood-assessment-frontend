import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
      react(),
          tailwindcss(),
              VitePWA({
                    registerType: 'autoUpdate',
                          manifest: {
                                  name: 'Flood Damage Assessment',
                                          short_name: 'FloodAssess',
                                                  description: 'Madison County Flood Damage Assessment Tool',
                                                          theme_color: '#1a2332',
                                                                  background_color: '#1a2332',
                                                                          display: 'standalone',
                                                                                  orientation: 'portrait',
                                                                                          start_url: '/',
                                                                                                  icons: [
                                                                                                            { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
                                                                                                                      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' }
                                                                                                                              ]
                                                                                                                                    },
                                                                                                                                          workbox: {
                                                                                                                                                  globPatterns: ['**/*.{js,css,html,ico,png,svg}']
                                                                                                                                                        }
                                                                                                                                                            })
                                                                                                                                                              ],
                                                                                                                                                                server: {
                                                                                                                                                                    host: true,
                                                                                                                                                                        port: 5173,
                                                                                                                                                                              historyApiFallback: true 
                                                                                                                                                                                }
                                                                                                                                                                                })