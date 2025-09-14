#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Function to get all available locales from messages directory
function getAvailableLocales() {
  try {
    const messagesDir = path.join(process.cwd(), 'src', 'messages');
    const files = fs.readdirSync(messagesDir);
    return files
      .filter(file => file.endsWith('.json'))
      .map(file => file.replace('.json', ''))
      .sort();
  } catch {
    // Fallback to default locales if messages directory doesn't exist
    return ['en', 'es'];
  }
}

// Function to update the config file with detected locales
function updateConfigFile(locales) {
  const configPath = path.join(process.cwd(), 'src', 'i18n', 'config.ts');
  
  // Read the current config file
  let configContent = fs.readFileSync(configPath, 'utf8');
  
  // Create the new locales array
  const localesArray = `['${locales.join("', '")}'] as const`;
  
  // Replace the locales definition
  configContent = configContent.replace(
    /export const locales = \[.*?\] as const;/s,
    `export const locales = ${localesArray};`
  );
  
  // Write the updated config file
  fs.writeFileSync(configPath, configContent, 'utf8');
  
  console.log(`✅ Updated locales in config: ${locales.join(', ')}`);
}

// Main execution
const availableLocales = getAvailableLocales();
updateConfigFile(availableLocales);

console.log(`🌍 Detected ${availableLocales.length} languages: ${availableLocales.join(', ')}`);
console.log('📝 Config file updated successfully!');
