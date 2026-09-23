# YTMigration 📺

Asistente PWA en español para transferir suscripciones a canales y listas de reproducción entre dos cuentas de YouTube de forma **100% privada, segura y directamente desde el navegador**.

🌐 **Aplicación publicada en GitHub Pages:** [https://mosqueteroweb.github.io/Ytmigration/](https://mosqueteroweb.github.io/Ytmigration/)

---

## ✨ Características

- **100% en el cliente:** No requiere servidores intermediarios, bases de datos externas ni servicios de terceros. Toda la comunicación se realiza directamente entre tu navegador y la API de YouTube.
- **Seguridad y Privacidad:**
  - Los tokens OAuth 2.0 residen **únicamente en la memoria volátil** de la sesión.
  - Nunca se almacenan tokens en GitHub, `localStorage`, `IndexedDB` ni cachés del Service Worker.
  - El identificador OAuth de Google Cloud se guarda localmente en el navegador.
- **Resiliencia ante cuotas e interrupciones:**
  - Control de cuota diaria de YouTube Data API v3 (10.000 unidades diarias).
  - Throttling automático (~800 ms entre peticiones) para evitar bloqueos por tasa de peticiones.
  - Pausa y reanudación limpia ante expiración de token o agotamiento de cuota.
  - Detección y omisión limpia de vídeos eliminados o privados sin romper la migración.
- **Persistencia y Respaldo:**
  - Cola y avance respaldados en IndexedDB (`Dexie.js`).
  - Exportación e importación de sesiones en archivos JSON (sin credenciales) para migrar en varios días o cambiar de dispositivo.

---

## 🛠️ Configuración de Google Cloud OAuth (Paso a Paso)

Para conectar tus cuentas desde el navegador se utiliza un **ID de Cliente OAuth 2.0** de tu propio proyecto en Google Cloud (completamente gratuito):

1. Accede a [Google Cloud Console](https://console.cloud.google.com/) y crea un proyecto nuevo (por ejemplo: `YouTube Migration`).
2. En el menú lateral, ve a **APIs y servicios > Biblioteca**, busca **YouTube Data API v3** y pulsa **Habilitar**.
3. En **Pantalla de consentimiento de OAuth**:
   - Selecciona el tipo de usuario **Externo** y pulsa *Crear*.
   - Rellena el nombre de la app (ej: `YTMigration`) y tu correo de contacto.
   - En la sección **Usuarios de prueba**, añade **ambas cuentas de Google** (la cuenta de origen y la de destino).
4. En **Credenciales**:
   - Pulsa **Crear credenciales > ID de cliente de OAuth**.
   - Tipo de aplicación: **Aplicación web**.
   - En **Orígenes autorizados de JavaScript**, añade:
     - `https://mosqueteroweb.github.io` (para la versión en producción)
     - `http://localhost:5173` (para desarrollo local)
   *(Nota: Google no admite rutas con subcarpetas ni barras finales en los orígenes de JavaScript).*
5. Copia el **ID de cliente** generado (tiene formato `...apps.googleusercontent.com`) e introdúcelo en la pantalla inicial de YTMigration.

---

## 💻 Desarrollo Local

```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev

# Compilar para producción
npm run build
```

---

## 🚀 Despliegue en GitHub Pages

El repositorio incluye un flujo automatizado en `.github/workflows/deploy.yml`. Cada vez que se realiza un push a la rama `main`, la aplicación se compila y se despliega automáticamente en GitHub Pages.

---

## 📄 Licencia

MIT