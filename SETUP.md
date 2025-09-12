# Configuración de la Aplicación de Mantenimiento

## Variables de Entorno Requeridas

Crea un archivo `.env.local` en la raíz del proyecto con las siguientes variables:

```env
# MongoDB
MONGODB_URI=mongodb://localhost:27017/maintenance_app

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here

# App Configuration
NODE_ENV=development
```

## Instalación

1. Instala las dependencias:
```bash
npm install
```

2. Configura las variables de entorno en `.env.local`

3. Ejecuta la aplicación:
```bash
npm run dev
```

## Configuración Inicial

1. **Crear una Empresa**: Primero necesitas crear una empresa desde la API o directamente en la base de datos.

2. **Registrar Usuario**: Una vez creada la empresa, puedes registrar usuarios que pertenezcan a esa empresa.

3. **Iniciar Sesión**: Los usuarios pueden iniciar sesión con sus credenciales.

## Características Implementadas

- ✅ Autenticación con NextAuth
- ✅ Multi-empresa con aislamiento de datos
- ✅ Modo oscuro con next-themes
- ✅ CRUDs completos para todas las entidades
- ✅ Protección de rutas
- ✅ Personalización de tema por empresa
- ✅ Roles de usuario (admin, user)
- ✅ Validaciones con Zod
- ✅ Toasts de notificación

## Estructura de la Base de Datos

- **Company**: Información de la empresa y configuración de tema
- **User**: Usuarios con roles y pertenencia a empresa
- **MachineModel**: Modelos de máquinas
- **Machine**: Máquinas individuales
- **Operation**: Operaciones de mantenimiento
- **MaintenanceRange**: Gamas de mantenimiento (conjunto de operaciones)
- **WorkOrder**: Órdenes de trabajo

Todas las entidades están asociadas a una empresa (companyId) para garantizar el aislamiento de datos.
