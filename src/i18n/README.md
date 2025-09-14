# Sistema de Internacionalización Dinámico

Este sistema de internacionalización está diseñado para ser completamente dinámico y soportar cualquier cantidad de idiomas sin necesidad de modificar código.

## 🚀 Características

- **Detección automática**: El sistema detecta automáticamente todos los idiomas disponibles en la carpeta `src/messages/`
- **Configuración dinámica**: No necesitas modificar código para agregar nuevos idiomas
- **Compatible con Edge Runtime**: Funciona perfectamente con middleware de Next.js
- **Soporte completo**: Incluye nombres de idiomas, banderas y códigos de idioma para más de 100 idiomas
- **Fallback inteligente**: Si un idioma no está configurado, usa el idioma por defecto
- **Detección de idioma**: Detecta automáticamente el idioma preferido del usuario

## 📁 Estructura

```
src/
├── i18n/
│   ├── config.ts          # Configuración dinámica de idiomas
│   ├── routing.ts         # Configuración de rutas de next-intl
│   ├── request.ts         # Configuración de solicitudes
│   └── README.md          # Este archivo
├── messages/
│   ├── en.json           # Traducciones en inglés
│   ├── es.json           # Traducciones en español
│   └── [idioma].json     # Nuevos idiomas se agregan aquí
└── components/
    └── LanguageSelector.tsx # Selector de idioma dinámico
```

## 🌍 Agregar un Nuevo Idioma

### Método 1: Usando el Script Automático (Recomendado)

```bash
# Agregar francés
npm run add-language fr

# Agregar alemán
npm run add-language de

# Agregar chino
npm run add-language zh
```

**O usando el script directamente:**
```bash
node scripts/add-language.js fr
```

### Método 2: Manual

1. **Crear archivo de traducción**:
   ```bash
   # Copiar el archivo de plantilla
   cp src/messages/en.json src/messages/fr.json
   ```

2. **Traducir el contenido**:
   - Abrir `src/messages/fr.json`
   - Traducir todos los valores de string al nuevo idioma
   - Mantener todas las claves exactamente iguales
   - Mantener la estructura JSON

3. **Actualizar la configuración**:
   ```bash
   npm run update-locales
   ```

4. **¡Listo!** El sistema detectará automáticamente el nuevo idioma.

## 🔧 Configuración

### Idiomas Soportados

El sistema incluye soporte para más de 100 idiomas con:
- Nombres nativos de idiomas
- Banderas de países
- Códigos de idioma estándar

### Idioma por Defecto

El idioma por defecto se configura en `src/i18n/config.ts`:

```typescript
export const defaultLocale: Locale = 'es'; // Cambiar aquí si necesario
```

### Detección de Idioma

El sistema detecta el idioma del usuario en este orden:
1. **URL de origen**: Si viene de una página con prefijo de idioma
2. **Header Accept-Language**: Idioma preferido del navegador
3. **Idioma por defecto**: Si no se puede detectar

## 📝 Estructura de Archivos de Traducción

```json
{
  "common": {
    "loading": "Loading...",
    "save": "Save",
    "cancel": "Cancel"
  },
  "navigation": {
    "dashboard": "Dashboard",
    "machines": "Machines"
  },
  "errors": {
    "notFound": "Not found",
    "notFoundDescription": "The page you are looking for does not exist.",
    "goBackHome": "Go back home"
  }
}
```

## 🎯 Uso en Componentes

```tsx
import { useTranslations, useLanguage } from '@/hooks/useTranslations';

function MyComponent() {
  const { t } = useTranslations();
  const { locale, locales, getLocaleName, getLocaleFlag } = useLanguage();
  
  return (
    <div>
      <h1>{t('common.title')}</h1>
      <p>Current language: {getLocaleName(locale)} {getLocaleFlag(locale)}</p>
    </div>
  );
}
```

## 🔄 Actualización Automática

### Scripts Disponibles

```bash
# Agregar un nuevo idioma (automático)
npm run add-language <código-idioma>

# Actualizar configuración con idiomas detectados
npm run update-locales

# Ejemplos
npm run add-language de    # Agregar alemán
npm run add-language zh    # Agregar chino
npm run add-language pt    # Agregar portugués
```

### Actualización Manual

Si agregas idiomas manualmente, ejecuta:
```bash
npm run update-locales
```

El sistema se actualiza automáticamente cuando:
- Se ejecuta `npm run add-language`
- Se ejecuta `npm run update-locales`
- Se reinicia el servidor de desarrollo

## 🚨 Solución de Problemas

### El nuevo idioma no aparece
1. Verificar que el archivo esté en `src/messages/[código].json`
2. Verificar que el archivo tenga formato JSON válido
3. Reiniciar el servidor de desarrollo

### Error de traducción faltante
1. Verificar que la clave existe en el archivo de idioma
2. Verificar que la estructura JSON es correcta
3. El sistema usará el idioma por defecto como fallback

### Problemas de detección de idioma
1. Verificar que el código de idioma sea válido (2-3 caracteres)
2. Verificar que esté en la lista de idiomas soportados
3. El sistema usará el idioma por defecto si no puede detectar

## 📚 Idiomas Incluidos

El sistema incluye soporte para idiomas de:
- **Europa**: Inglés, Español, Francés, Alemán, Italiano, Portugués, Ruso, etc.
- **Asia**: Chino, Japonés, Coreano, Hindi, Tailandés, Vietnamita, etc.
- **América**: Inglés, Español, Portugués, Francés
- **África**: Árabe, Swahili, etc.
- **Oceanía**: Inglés, Maori, etc.

Y muchos más idiomas regionales y locales.

## 🎉 ¡Disfruta de la Internacionalización!

Con este sistema, puedes agregar cualquier idioma simplemente creando un archivo de traducción. ¡No más modificaciones de código para soportar nuevos idiomas!