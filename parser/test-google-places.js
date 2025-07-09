import { config } from './src/config.js';
import { webEnrichmentService } from './src/web-enrichment-service.js';
import fs from 'fs';
import path from 'path';

async function testGooglePlacesAPI() {
  console.log('🧪 Testing Google Places API (New) Configuration');
  
  // Test 1: Check if API key is configured
  if (!config.googlePlaces?.apiKey) {
    console.error('❌ Google Places API key not configured');
    console.log('   Please set GOOGLE_PLACES_API_KEY in your .env file');
    return;
  }
  
  console.log('✅ Google Places API key configured');
  
  // Test 2: Try to search for a well-known place
  try {
    console.log('🔍 Testing Places Search...');
    const results = await webEnrichmentService.searchGooglePlaces('Ancho Honey Maine', 1);
    
    // Save full response to JSON file in logs folder
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `google-places-response-${timestamp}.json`;
    const filepath = path.join('./logs', filename);
    
    // Ensure logs directory exists
    if (!fs.existsSync('./logs')) {
      fs.mkdirSync('./logs', { recursive: true });
    }
    
    // Write full response to file
    fs.writeFileSync(filepath, JSON.stringify(results, null, 2));
    console.log(`💾 Full API response saved to: ${filepath}`);
    
    if (results.length > 0) {
      console.log('✅ Places Search successful!');
      console.log(`   Found: ${results[0].name} - ${results[0].formatted_address}`);
      
      // Test 3: Try to get place details
      console.log('📋 Testing Place Details...');
      const details = await webEnrichmentService.getPlaceDetails(results[0].place_id);
      
      if (Object.keys(details).length > 0) {
        console.log('✅ Place Details successful!');
        console.log(`   Address: ${details.address || 'N/A'}`);
        console.log(`   Phone: ${details.phone || 'N/A'}`);
        console.log(`   Website: ${details.website || 'N/A'}`);
      } else {
        console.warn('⚠️  Place Details returned empty (may be normal)');
      }
      
    } else {
      console.warn('⚠️  No places found - this may indicate an issue');
    }
    
  } catch (error) {
    console.error('❌ API Test failed:', error.message);
    
    if (error.message.includes('403')) {
      console.log('   This usually means:');
      console.log('   - API key is invalid');
      console.log('   - Places API is not enabled in your Google Cloud Console');
      console.log('   - API key lacks proper permissions');
    } else if (error.message.includes('400')) {
      console.log('   This usually means:');
      console.log('   - Invalid request format');
      console.log('   - Missing required parameters');
    }
    
    return;
  }
  
  console.log('\n🎉 Google Places API is working correctly!');
  console.log('   You can now run: npm run parse');
}

testGooglePlacesAPI().catch(console.error); 