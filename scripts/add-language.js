#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Get the language code from command line arguments
const languageCode = process.argv[2];

if (!languageCode) {
  console.error('❌ Please provide a language code. Usage: node scripts/add-language.js <language-code>');
  console.error('Example: node scripts/add-language.js fr');
  process.exit(1);
}

// Validate language code format (2-3 characters)
if (!/^[a-z]{2,3}$/.test(languageCode)) {
  console.error('❌ Invalid language code format. Please use 2-3 lowercase letters (e.g., fr, de, zh)');
  process.exit(1);
}

const messagesDir = path.join(process.cwd(), 'src', 'messages');
const templateFile = path.join(messagesDir, 'en.json');
const newFile = path.join(messagesDir, `${languageCode}.json`);

// Check if messages directory exists
if (!fs.existsSync(messagesDir)) {
  console.error('❌ Messages directory not found. Please run this script from the project root.');
  process.exit(1);
}

// Check if template file exists
if (!fs.existsSync(templateFile)) {
  console.error('❌ Template file (en.json) not found.');
  process.exit(1);
}

// Check if language file already exists
if (fs.existsSync(newFile)) {
  console.error(`❌ Language file for '${languageCode}' already exists.`);
  process.exit(1);
}

try {
  // Read the template file
  const templateContent = fs.readFileSync(templateFile, 'utf8');
  const templateData = JSON.parse(templateContent);
  
  // Create a copy with placeholder values
  const newData = JSON.parse(JSON.stringify(templateData));
  
  // Add a comment at the top indicating this is a new language file
  const newContent = `{
  "_comment": "Translation file for ${languageCode.toUpperCase()}. Please translate all values to ${languageCode.toUpperCase()}.",
  "_instructions": "1. Translate all string values to ${languageCode.toUpperCase()}\\n2. Keep all keys unchanged\\n3. Maintain the same JSON structure\\n4. Remove this comment block when done",
  ${JSON.stringify(newData, null, 2).slice(1, -1)}
}`;
  
  // Write the new file
  fs.writeFileSync(newFile, newContent, 'utf8');
  
  console.log(`✅ Language file created: src/messages/${languageCode}.json`);
  console.log(`📝 Please translate all values to ${languageCode.toUpperCase()}`);
  
  // Update the config file with the new language
  try {
    const { execSync } = require('child_process');
    execSync('node scripts/update-locales.js', { stdio: 'inherit' });
    console.log(`🔧 Config updated! The system will now use this new language!`);
  } catch (error) {
    console.log(`⚠️  Language file created, but config update failed. Please run: node scripts/update-locales.js`);
  }
  
} catch (error) {
  console.error('❌ Error creating language file:', error.message);
  process.exit(1);
}
