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
│   │   ├── machine-models/
│   │   ├── machines/
│   │   ├── operations/
│   │   ├── maintenance-ranges/
│   │   └── work-orders/
│   ├── work-orders/       # Páginas de órdenes de trabajo
│   ├── machines/          # Páginas de máquinas
│   ├── machine-models/    # Páginas de modelos
│   ├── maintenance-ranges/# Páginas de gamas
│   ├── operations/        # Páginas de operaciones
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
    ├── MachineModel.ts
    ├── Machine.ts
    ├── Operation.ts
    ├── MaintenanceRange.ts
    └── WorkOrder.ts
```

## Uso

### Dashboard
El dashboard principal muestra:
- Estadísticas generales del sistema
- Resumen de órdenes de trabajo por estado
- Acciones rápidas
- Lista de órdenes recientes

### Gestión de Órdenes de Trabajo
- **Crear**: Formulario completo con selección de máquina y gama de mantenimiento
- **Listar**: Tabla con filtros por estado y tipo
- **Editar**: Actualizar estado y detalles
- **Eliminar**: Confirmación antes de eliminar

### Gestión de Máquinas y Modelos
- CRUD completo para modelos de máquina
- CRUD completo para máquinas
- Propiedades dinámicas para ambos

### Gamas de Mantenimiento y Operaciones
- Gestión de gamas de mantenimiento (preventivo/correctivo)
- Gestión de operaciones individuales
- Asociación de operaciones a gamas

## Características Avanzadas

### Formulario de Orden de Trabajo
- Selección de máquina existente o creación de nueva
- Selección de gama de mantenimiento o creación de nueva
- Creación de operaciones en el momento
- Validación completa con Zod

### Propiedades Dinámicas
- Agregar propiedades clave-valor personalizadas
- Útil para datos específicos de cada máquina o modelo

### Estados de Órdenes
- **Pendiente**: Orden creada, esperando inicio
- **En Progreso**: Orden en ejecución
- **Completada**: Orden finalizada

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
