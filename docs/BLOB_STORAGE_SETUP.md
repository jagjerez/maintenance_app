# Configuración de Blob Storage

Este proyecto soporta dos tipos de almacenamiento de archivos:
- **Vercel Blob** (producción)
- **MinIO** (desarrollo local)

## Configuración por Entorno

### Desarrollo Local (MinIO)

1. **Iniciar MinIO con Docker Compose:**
   ```bash
   npm run minio:start
   # o
   docker-compose up -d
   ```

2. **Configurar MinIO:**
   ```bash
   npm run minio:setup
   ```

3. **Configurar variables de entorno en `.env.local`:**
   ```env
   BLOB_STORAGE_TYPE=minio
   MINIO_ENDPOINT=localhost
   MINIO_PORT=9000
   MINIO_USE_SSL=false
   MINIO_ACCESS_KEY=minioadmin
   MINIO_SECRET_KEY=minioadmin
   MINIO_BUCKET_NAME=maintenance-app
   ```

4. **Acceder a la consola de MinIO:**
   - URL: http://localhost:9001
   - Usuario: `minioadmin`
   - Contraseña: `minioadmin`

### Producción (Vercel Blob)

1. **Configurar variables de entorno:**
   ```env
   BLOB_STORAGE_TYPE=vercel
   APP_READ_WRITE_TOKEN=tu_token_de_vercel_blob
   ```

2. **Obtener token de Vercel Blob:**
   - Ve a [Vercel Dashboard](https://vercel.com/dashboard)
   - Selecciona tu proyecto
   - Ve a "Storage" → "Blob"
   - Crea un nuevo token con permisos de lectura y escritura

## Uso en el Código

El servicio de blob storage se usa a través de la función `uploadBlob`:

```typescript
import { uploadBlob } from '@/lib/blobStorage';

// Subir un archivo
const result = await uploadBlob('filename.jpg', file, {
  access: 'public',
  addRandomSuffix: true
});

console.log(result.url); // URL del archivo subido
```

## API de Blob Storage

### `uploadBlob(filename, file, options)`

Sube un archivo al almacenamiento configurado.

**Parámetros:**
- `filename`: Nombre del archivo
- `file`: Archivo (File o Buffer)
- `options`: Opciones de subida
  - `access`: 'public' | 'private' (solo Vercel Blob)
  - `addRandomSuffix`: boolean

**Retorna:**
```typescript
{
  url: string;        // URL pública del archivo
  filename: string;   // Nombre final del archivo
  size: number;       // Tamaño en bytes
  type: string;       // Tipo MIME
}
```

### `deleteBlob(filename)`

Elimina un archivo del almacenamiento.

### `getStorageType()`

Retorna el tipo de almacenamiento actual ('vercel' o 'minio').

### `isMinioAvailable()`

Verifica si MinIO está disponible y funcionando.

## Rutas de API Actualizadas

### `/api/upload` - Subida de imágenes
- Soporta MinIO y Vercel Blob
- Validación de tipos de archivo (JPEG, PNG, GIF, WebP)
- Límite de tamaño: 10MB

### `/api/integration/upload` - Subida de archivos de integración
- Soporta MinIO y Vercel Blob
- Validación de tipos de archivo (CSV, XLSX, XLS)
- Creación automática de trabajos de integración

## Scripts Disponibles

```bash
# Iniciar MinIO
npm run minio:start

# Detener MinIO
npm run minio:stop

# Configurar MinIO (crear bucket, políticas, etc.)
npm run minio:setup
```

## Troubleshooting

### MinIO no se conecta
1. Verifica que Docker esté ejecutándose
2. Ejecuta `docker-compose up -d`
3. Verifica los logs: `docker-compose logs minio`

### Error de permisos en MinIO
1. Ejecuta `npm run minio:setup`
2. Verifica que el bucket existe en la consola de MinIO

### Archivos no se suben
1. Verifica las variables de entorno
2. Verifica que `BLOB_STORAGE_TYPE` esté configurado correctamente
3. Revisa los logs de la aplicación

## Migración entre Entornos

Para cambiar entre MinIO y Vercel Blob:

1. **Cambiar a MinIO:**
   ```env
   BLOB_STORAGE_TYPE=minio
   # Configurar variables de MinIO
   ```

2. **Cambiar a Vercel Blob:**
   ```env
   BLOB_STORAGE_TYPE=vercel
   APP_READ_WRITE_TOKEN=tu_token
   ```

3. **Reiniciar la aplicación:**
   ```bash
   npm run dev
   ```

## Consideraciones de Seguridad

### MinIO (Desarrollo)
- Usa credenciales por defecto solo en desarrollo
- En producción, cambia las credenciales por defecto
- Considera usar SSL/TLS

### Vercel Blob (Producción)
- Mantén el token seguro
- No expongas el token en el código
- Usa variables de entorno de Vercel

## Monitoreo

### MinIO
- Consola web: http://localhost:9001
- Métricas de uso y almacenamiento
- Logs de acceso

### Vercel Blob
- Dashboard de Vercel
- Métricas de uso
- Facturación basada en uso
