import { defineConfig } from 'vite'

export default defineConfig({
    server: {
        open: true
    },
    base: '/minecraft-game/',
    build: {
        outDir: 'dist',
        assetsDir: 'assets',
        sourcemap: true,
        rollupOptions: {
            output: {
                manualChunks: undefined
            }
        }
    }
}) 