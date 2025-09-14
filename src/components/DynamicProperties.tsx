'use client';
import { Plus, X } from 'lucide-react';
import { DynamicProperty } from '@/lib/validations';
import { useTranslations } from '@/hooks/useTranslations';

interface DynamicPropertiesProps {
  properties: DynamicProperty[];
  onChange: (properties: DynamicProperty[]) => void;
  className?: string;
}

export default function DynamicProperties({ 
  properties, 
  onChange, 
  className = '' 
}: DynamicPropertiesProps) {
  const { t } = useTranslations();
  const addProperty = () => {
    onChange([...properties, { key: '', value: '' }]);
  };

  const removeProperty = (index: number) => {
    const newProperties = properties.filter((_, i) => i !== index);
    onChange(newProperties);
  };

  const updateProperty = (index: number, field: 'key' | 'value', value: string) => {
    const newProperties = [...properties];
    newProperties[index] = { ...newProperties[index], [field]: value };
    onChange(newProperties);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">
          {t("dynamicProperties.title")}
        </label>
        <button
          type="button"
          onClick={addProperty}
          className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Plus className="h-4 w-4 mr-1" />
          {t("dynamicProperties.add")}
        </button>
      </div>

      {properties.map((property, index) => (
        <div key={index} className="flex gap-2">
          <input
            type="text"
            placeholder={t("placeholders.key")}
            value={property.key}
            onChange={(e) => updateProperty(index, 'key', e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
          <input
            type="text"
            placeholder={t("placeholders.value")}
            value={property.value}
            onChange={(e) => updateProperty(index, 'value', e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
          <button
            type="button"
            onClick={() => removeProperty(index)}
            className="inline-flex items-center px-3 py-2 border border-red-300 shadow-sm text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}

      {properties.length === 0 && (
        <p className="text-sm text-gray-500 italic">
          {t("dynamicProperties.noProperties")}
        </p>
      )}
    </div>
  );
}
