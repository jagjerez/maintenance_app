#!/usr/bin/env node

/**
 * Script to start local cron for development
 * This ensures the cron is running when developing locally
 */

import fetch from 'node-fetch';

const API_BASE = process.env.NEXTAUTH_URL || 'http://localhost:3000';

async function startLocalCron() {
  try {
    console.log('🔄 Starting local cron...');
    
    const response = await fetch(`${API_BASE}/api/cron/local`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ action: 'start' })
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Local cron started successfully');
      console.log(`📊 Status: ${data.message}`);
    } else {
      const error = await response.json();
      console.error('❌ Failed to start local cron:', error.error);
    }
  } catch (error) {
    console.error('❌ Error starting local cron:', error.message);
  }
}

async function checkCronStatus() {
  try {
    const response = await fetch(`${API_BASE}/api/cron/local`);
    
    if (response.ok) {
      const data = await response.json();
      console.log(`📊 Cron status: ${data.message}`);
      return data.isActive;
    }
  } catch (error) {
    console.error('❌ Error checking cron status:', error.message);
  }
  
  return false;
}

async function main() {
  console.log('🚀 Local Cron Manager');
  console.log('==================');
  
  const isActive = await checkCronStatus();
  
  if (!isActive) {
    await startLocalCron();
  } else {
    console.log('✅ Local cron is already running');
  }
  
  console.log('\n📝 Available commands:');
  console.log('  - Start:  curl -X POST http://localhost:3000/api/cron/local -d \'{"action":"start"}\'');
  console.log('  - Stop:   curl -X POST http://localhost:3000/api/cron/local -d \'{"action":"stop"}\'');
  console.log('  - Process: curl -X POST http://localhost:3000/api/cron/local -d \'{"action":"process"}\'');
  console.log('  - Status: curl http://localhost:3000/api/cron/local');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { startLocalCron, checkCronStatus };
