# Data Integration Feature

Esta funcionalidad permite importar datos masivamente desde archivos Excel (.xlsx, .xls) o CSV a través de una interfaz web intuitiva.

## Características

- **Subida de archivos**: Soporte para archivos Excel y CSV
- **Plantillas descargables**: Plantillas predefinidas para cada tipo de datos
- **Procesamiento en background**: Los archivos se procesan de forma asíncrona
- **Seguimiento de estado**: Estados de pendiente, procesando, completado y fallido
- **Manejo de errores**: Visualización detallada de errores por fila
- **Almacenamiento en blob**: Los archivos se almacenan en Vercel Blob

## Tipos de datos soportados

### 1. Locations (Ubicaciones)
- **Campos requeridos**: name
- **Campos opcionales**: description, parentId
- **Ejemplo de estructura jerárquica**:
  ```
  Plant A (raíz)
  ├── Line 1 (hijo de Plant A)
  │   ├── Station 1 (hijo de Line 1)
  │   └── Station 2 (hijo de Line 1)
  └── Line 2 (hijo de Plant A)
      └── Station 3 (hijo de Line 2)
  ```

### 2. Machine Models (Modelos de Máquinas)
- **Campos requeridos**: name, manufacturer, brand, year
- **Campos opcionales**: properties (JSON string)
- **Ejemplo de properties**: `{"power":"100kW","weight":"500kg"}`

### 3. Machines (Máquinas)
- **Campos requeridos**: model, location
- **Campos opcionales**: description, properties (JSON string)
- **Nota**: El campo `model` debe coincidir con un modelo existente, y `location` debe coincidir con una ubicación existente

### 4. Maintenance Ranges (Rangos de Mantenimiento)
- **Campos requeridos**: name, description, type
- **Campos opcionales**: frequency, startDate, startTime, daysOfWeek
- **Tipos válidos**: preventive, corrective
- **Frecuencias válidas**: daily, monthly, yearly
- **daysOfWeek**: Números separados por comas (0=domingo, 1=lunes, etc.)

## Uso

1. **Acceder a la página**: Navegar a `/integration` en la aplicación
2. **Seleccionar tipo de datos**: Elegir el tipo de datos a importar
3. **Descargar plantilla**: Usar las plantillas CSV o Excel como referencia
4. **Preparar archivo**: Llenar el archivo con los datos siguiendo la estructura de la plantilla
5. **Subir archivo**: Seleccionar el archivo y hacer clic en "Upload File"
6. **Monitorear progreso**: Ver el estado del procesamiento en la tabla de historial
7. **Revisar errores**: Si hay errores, hacer clic en "View Errors" para ver detalles

## Estados del procesamiento

- **Pending**: Archivo subido, esperando procesamiento
- **Processing**: Archivo siendo procesado
- **Completed**: Procesamiento completado exitosamente
- **Failed**: Error durante el procesamiento

## Manejo de errores

Los errores se muestran por fila e incluyen:
- Número de fila
- Campo con error
- Valor que causó el error
- Mensaje descriptivo del error

## Limitaciones

- Tamaño máximo de archivo: Limitado por Vercel Blob (generalmente 4.5MB)
- Procesamiento: Los archivos grandes pueden tomar más tiempo
- Validaciones: Se aplican las mismas validaciones que en la interfaz web

## Archivos de configuración

- **Modelo**: `src/models/IntegrationJob.ts`
- **Página**: `src/app/[locale]/integration/page.tsx`
- **Procesador**: `src/lib/fileProcessor.ts`
- **APIs**: `src/app/api/integration/`
- **Plantillas**: `public/templates/`

## Dependencias adicionales

- `xlsx`: Para procesar archivos Excel
- `csv-parser`: Para procesar archivos CSV
- `@vercel/blob`: Para almacenamiento de archivos
