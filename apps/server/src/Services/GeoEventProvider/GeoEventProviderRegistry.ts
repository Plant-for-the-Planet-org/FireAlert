import {GeoEventProviderRegistry} from '../implementations/GeoEventProviderRegistry';
import NasaGeoEventProvider from './ProviderClass/NasaGeoEventProviderClass';
import GOES16GeoEventProvider from './ProviderClass/GOES16GeoEventProviderClass';
// import additional GeoEvent provider implementations below

// Create the registry instance
const registry = new GeoEventProviderRegistry();

// Register providers with validation
try {
  registry.register(new NasaGeoEventProvider(), {validate: true});
  registry.register(new GOES16GeoEventProvider(), {validate: true});
  // add new alert providers here
} catch (error) {
  console.error('Failed to register GeoEvent providers:', error);
  throw error;
}

// Export the registry instance
export default registry;
