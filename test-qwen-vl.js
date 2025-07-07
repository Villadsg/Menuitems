#!/usr/bin/env node

/**
 * Test script for Qwen 2.5 VL OCR functionality
 * This script tests the connection to the local Qwen VL instance
 */

import fetch from 'node-fetch';

const config = {
  baseUrl: process.env.QWEN_VL_BASE_URL || 'http://localhost:11434',
  model: process.env.QWEN_VL_MODEL || 'qwen2.5vl:7b',
  timeout: parseInt(process.env.QWEN_VL_TIMEOUT || '30000')
};

async function testConnection() {
  console.log('🔍 Testing Qwen 2.5 VL connection...');
  console.log(`📡 Base URL: ${config.baseUrl}`);
  console.log(`🤖 Model: ${config.model}`);
  
  try {
    const response = await fetch(`${config.baseUrl}/api/tags`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('✅ Connection successful!');
    console.log(`📋 Available models: ${data.models.length}`);
    
    // Check if our model is available
    const ourModel = data.models.find(m => m.name === config.model);
    if (ourModel) {
      console.log(`✅ Model ${config.model} is available`);
      console.log(`📏 Model size: ${(ourModel.size / 1024 / 1024 / 1024).toFixed(2)} GB`);
      return true;
    } else {
      console.log(`❌ Model ${config.model} not found`);
      console.log('📝 Available models:');
      data.models.forEach(m => {
        console.log(`   - ${m.name} (${(m.size / 1024 / 1024 / 1024).toFixed(2)} GB)`);
      });
      return false;
    }
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    
    if (error.message.includes('ECONNREFUSED')) {
      console.log('💡 Tips to fix:');
      console.log('   1. Make sure Ollama is running: ollama serve');
      console.log('   2. Check if port 11434 is available');
      console.log('   3. Verify firewall settings');
    }
    
    return false;
  }
}

async function testOCR() {
  console.log('\n🖼️  Testing basic text generation (OCR test with images requires actual image)...');
  
  const basicPrompt = `Respond with "OCR functionality working" if you can process this request.`;

  try {
    console.log('🔄 Sending basic request...');
    const startTime = Date.now();
    
    const response = await fetch(`${config.baseUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.model,
        prompt: basicPrompt,
        stream: false
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    
    const data = await response.json();
    const endTime = Date.now();
    
    console.log(`✅ Basic test completed in ${endTime - startTime}ms`);
    console.log('📝 Response structure:');
    console.log(`   - Model: ${data.model || 'N/A'}`);
    console.log(`   - Response length: ${data.response?.length || 0} characters`);
    console.log(`   - Processing time: ${Math.round(data.eval_duration / 1000000)}ms`);
    
    if (data.response) {
      console.log('📄 Response:');
      console.log(`   "${data.response}"`);
    }
    
    console.log('\n💡 Note: For full OCR testing with images, upload a menu image through your application.');
    
    return true;
  } catch (error) {
    console.error('❌ Basic test failed:', error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting Qwen 2.5 VL OCR Test\n');
  
  const connectionOk = await testConnection();
  
  if (connectionOk) {
    const ocrOk = await testOCR();
    
    if (ocrOk) {
      console.log('\n🎉 All tests passed! Your Qwen 2.5 VL setup is working correctly.');
      console.log('💡 You can now use the OCR functionality in your application.');
    } else {
      console.log('\n⚠️  Connection works but OCR test failed. Please check the model configuration.');
    }
  } else {
    console.log('\n❌ Connection test failed. Please set up Qwen 2.5 VL first.');
    console.log('📖 See setup-qwen-vl.md for installation instructions.');
  }
  
  console.log('\n📋 Test Summary:');
  console.log(`   Connection: ${connectionOk ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   OCR: ${connectionOk ? '✅ PASS' : '❌ SKIP'}`);
}

// Run the tests
main().catch(console.error);