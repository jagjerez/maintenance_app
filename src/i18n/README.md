# Sistema de Internacionalización (i18n)

Este proyecto utiliza `next-intl` para manejar la internacionalización y soportar múltiples idiomas.

## Idiomas Soportados

- **Español (es)** - Idioma por defecto
- **Inglés (en)**

## Estructura de Archivos

```
src/
├── i18n/
│   ├── config.ts          # Configuración de idiomas
│   ├── request.ts         # Configuración de next-intl
│   └── README.md          # Esta documentación
├── messages/
│   ├── es.json           # Traducciones en español
│   └── en.json           # Traducciones en inglés
└── hooks/
    └── useTranslations.ts # Hook personalizado para traducciones
```

## Uso

### 1. Usar traducciones en componentes

```tsx
import { useTranslations } from '@/hooks/useTranslations';

export default function MyComponent() {
  const { t } = useTranslations();
  
  return (
    <div>
      <h1>{t('navigation.dashboard')}</h1>
      <p>{t('common.loading')}</p>
    </div>
  );
}
```

### 2. Usar el selector de idiomas

El selector de idiomas ya está incluido en la navegación principal. Los usuarios pueden cambiar el idioma haciendo clic en el selector que muestra la bandera y nombre del idioma actual.

### 3. Agregar nuevas traducciones

1. Agrega las nuevas claves en `src/messages/es.json`:
```json
{
  "nuevaSeccion": {
    "nuevaClave": "Texto en español"
  }
}
```

2. Agrega las traducciones correspondientes en `src/messages/en.json`:
```json
{
  "nuevaSeccion": {
    "nuevaClave": "Text in English"
  }
}
```

3. Usa la nueva traducción en tu componente:
```tsx
const { t } = useTranslations();
return <p>{t('nuevaSeccion.nuevaClave')}</p>;
```

### 4. Traducciones con parámetros

Para traducciones que necesitan parámetros dinámicos:

```json
{
  "errors": {
    "minLength": "Debe tener al menos {min} caracteres"
  }
}
```

```tsx
const { t } = useTranslations();
return <p>{t('errors.minLength', { min: 6 })}</p>;
```

## Configuración

### Agregar un nuevo idioma

1. Agrega el nuevo idioma en `src/i18n/config.ts`:
```typescript
export const locales = ['en', 'es', 'fr'] as const;
export type Locale = (typeof locales)[number];

export const localeNames: Record<Locale, string> = {
  en: 'English',
  es: 'Español',
  fr: 'Français'
};

export const localeFlags: Record<Locale, string> = {
  en: '🇺🇸',
  es: '🇪🇸',
  fr: '🇫🇷'
};
```

2. Crea el archivo de traducciones `src/messages/fr.json`
3. Actualiza el middleware si es necesario

## Rutas

El sistema maneja automáticamente las rutas con prefijos de idioma:
- `/es/` - Páginas en español
- `/en/` - Páginas en inglés
- `/` - Redirige al idioma por defecto (español)

## Notas Importantes

- Todas las páginas deben estar dentro del directorio `[locale]` para funcionar con el sistema de idiomas
- El middleware maneja automáticamente la redirección y detección de idioma
- Las traducciones se cargan automáticamente según el idioma de la URL
- El idioma se persiste en la URL, permitiendo compartir enlaces en idiomas específicos
