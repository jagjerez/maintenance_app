# Sistema de Mantenimiento

Una aplicación completa de gestión de mantenimiento preventivo y correctivo construida con Next.js, MongoDB y TailwindCSS.

## Características

- **Dashboard completo** con estadísticas y resumen del sistema
- **Gestión de órdenes de trabajo** con estados (pendiente, en progreso, completada)
- **CRUD completo** para todas las entidades:
  - Modelos de máquina
  - Máquinas
  - Gamas de mantenimiento
  - Operaciones
  - Órdenes de trabajo
- **Formulario avanzado** para crear órdenes de trabajo con creación dinámica de datos
- **Propiedades dinámicas** para máquinas y modelos
- **UI responsiva** con TailwindCSS
- **Validación** con Zod en frontend y backend
- **Notificaciones** con react-hot-toast
- **Almacenamiento de archivos** con soporte para Vercel Blob (producción) y MinIO (desarrollo)

## Tecnologías

- **Frontend**: Next.js 15 (App Router), React 19, TypeScript
- **Backend**: Next.js API Routes
- **Base de datos**: MongoDB con Mongoose
- **UI**: TailwindCSS, Lucide React
- **Validación**: Zod
- **Formularios**: React Hook Form
- **Notificaciones**: React Hot Toast

## Configuración

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar MongoDB

Crea un archivo `.env.local` en la raíz del proyecto:

```env
STORAGE_MONGODB_URI=mongodb://localhost:27017/maintenance_app
```

Para MongoDB Atlas:
```env
STORAGE_MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/maintenance_app?retryWrites=true&w=majority
```

### 3. Configurar almacenamiento de archivos

Para desarrollo local con MinIO:
```bash
# Iniciar MinIO
npm run minio:start

# Configurar MinIO
npm run minio:setup
```

### 4. Ejecutar la aplicación

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

### 5. Verificar configuración

Verifica el estado del almacenamiento de archivos:
```bash
curl http://localhost:3000/api/blob-storage/health
```

## Estructura del Proyecto

```
src/
├── app/                    # App Router de Next.js
│   ├── api/               # API Routes
│   │   ├── machines/
│   │   ├── operations/
│   │   └── locations/
│   ├── machines/          # Páginas de máquinas
│   ├── operations/        # Páginas de operaciones
│   ├── locations/         # Páginas de ubicaciones
│   └── page.tsx          # Dashboard principal
├── components/            # Componentes reutilizables
│   ├── Form.tsx          # Componentes de formulario
│   ├── DataTable.tsx     # Tabla de datos
│   ├── Modal.tsx         # Modal
│   ├── DynamicProperties.tsx # Propiedades dinámicas
│   └── Navigation.tsx    # Navegación
├── lib/                  # Utilidades
│   ├── db.ts            # Conexión a MongoDB
│   ├── validations.ts   # Esquemas de validación Zod
│   └── utils.ts         # Utilidades generales
└── models/              # Modelos de Mongoose
    ├── Machine.ts
    ├── Operation.ts
    └── Location.ts
```

## Uso

### Dashboard
El dashboard principal muestra:
- Estadísticas generales del sistema
- Resumen de máquinas, operaciones y ubicaciones
- Acciones rápidas
- Vista de árbol de ubicaciones

### Gestión de Máquinas
- CRUD completo para máquinas
- Propiedades dinámicas personalizables
- Asociación con ubicaciones y operaciones

### Gestión de Operaciones
- CRUD completo para operaciones
- Tipos de datos flexibles (texto, fecha, booleano, etc.)
- Reutilización en múltiples máquinas

### Gestión de Ubicaciones
- Estructura jerárquica de ubicaciones
- Vista de árbol interactiva
- Asociación con máquinas

## Características Avanzadas

### Propiedades Dinámicas
- Agregar propiedades clave-valor personalizadas
- Útil para datos específicos de cada máquina
- Validación completa con Zod

### Integración de Datos
- Importación masiva desde Excel/CSV
- Plantillas predefinidas
- Procesamiento en cola

## Desarrollo

### Agregar nuevas entidades
1. Crear modelo en `src/models/`
2. Crear validaciones en `src/lib/validations.ts`
3. Crear API routes en `src/app/api/`
4. Crear páginas en `src/app/`

### Personalizar UI
- Modificar componentes en `src/components/`
- Ajustar estilos con TailwindCSS
- Agregar nuevos iconos de Lucide React

## Despliegue

### Vercel (Recomendado)
1. Conecta tu repositorio a Vercel
2. Configura la variable de entorno `STORAGE_MONGODB_URI`
3. Despliega automáticamente

### Docker
```bash
docker build -t maintenance-app .
docker run -p 3000:3000 -e STORAGE_MONGODB_URI=your_connection_string maintenance-app
```

## Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.
