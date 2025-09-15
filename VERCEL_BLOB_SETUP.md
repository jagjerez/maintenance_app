# Vercel Blob Setup

Para que la funcionalidad de subida de imágenes funcione correctamente, necesitas configurar Vercel Blob:

## 1. Obtener el token de Vercel Blob

1. Ve a [Vercel Dashboard](https://vercel.com/dashboard)
2. Selecciona tu proyecto
3. Ve a la sección "Storage" → "Blob"
4. Crea un nuevo token con permisos de lectura y escritura
5. Copia el token generado

## 2. Configurar variables de entorno

Crea un archivo `.env.local` en la raíz del proyecto con:

```env
# Vercel Blob Storage
APP_READ_WRITE_TOKEN=tu_token_de_vercel_blob_aqui

# NextAuth (si no está configurado)
NEXTAUTH_SECRET=tu_secreto_nextauth_aqui
NEXTAUTH_URL=http://localhost:3000

# Database (si no está configurado)
STORAGE_MONGODB_URI=tu_string_de_conexion_mongodb_aqui
```

## 3. Desplegar en Vercel

Si vas a desplegar en Vercel:

1. Ve a la configuración del proyecto en Vercel Dashboard
2. Añade la variable de entorno `APP_READ_WRITE_TOKEN` con tu token
3. Redespliega la aplicación

## 4. Funcionalidades implementadas

- ✅ Subida de imágenes con drag & drop
- ✅ Validación de tipos de archivo (PNG, JPG, GIF, WebP)
- ✅ Validación de tamaño máximo (10MB)
- ✅ Preview de imágenes subidas
- ✅ Eliminación de imágenes
- ✅ Integración completa con el modal de mantenimiento
- ✅ Traducciones en inglés, español y francés

## 5. Uso

1. Abre una orden de trabajo
2. Haz clic en "Realizar Mantenimiento"
3. En la sección "Imágenes de la Orden de Trabajo":
   - Arrastra y suelta una imagen, o
   - Haz clic en el área de subida para seleccionar archivos
4. Las imágenes se subirán automáticamente a Vercel Blob
5. Puedes eliminar imágenes haciendo hover y clic en el botón de eliminar
