import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  
  // 🚀 VİTE PROXY AYARI BURAYA EKLENİYOR
  server: {
    proxy: {
      // Frontend'den gelen tüm '/api' ile başlayan istekleri yakala
      '/api': {
        // İsteği Backend sunucusunun çalıştığı adrese yönlendir
        target: 'http://localhost:5058', 
        // 🚨 NOT: Kendi Backend portunuzu buraya girin!
        
        // Host başlığını değiştirmeden Backend'e göndermek için (çoğu .NET projesi için gerekli)
        changeOrigin: true, 
        
        // Opsiyonel: Eğer Backend'inizde yol '/api' yerine farklı bir şeyle başlıyorsa
        // rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
});