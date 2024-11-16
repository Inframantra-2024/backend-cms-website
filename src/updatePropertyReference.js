import mongoose from 'mongoose';
import { Property } from './models/property.model.js'
import { SubLocality } from './models/subLocality.model.js';
import { Locality } from './models/locality.model.js';
import { City } from './models/city.model.js';
import { State } from './models/state.model.js';

const updatePropertyReferences = async () => {
  try {
    await mongoose.connect('mongodb+srv://doadmin:K3u1F5q40y26zHj8@inframantra-db-0ac3dfb0.mongo.ondigitalocean.com/inframantra?tls=true&authSource=admin&replicaSet=inframantra-db', { useNewUrlParser: true, useUnifiedTopology: true });

    const properties = await Property.find();

    for (const property of properties) {
      const { _id, subLocality, locality, city, state } = property;

      // Update SubLocality
      if (subLocality) {
        await SubLocality.findByIdAndUpdate(subLocality, { $addToSet: { properties: _id } });
      }

      // Update Locality
      if (locality) {
        await Locality.findByIdAndUpdate(locality, { $addToSet: { properties: _id } });
      }

      // Update City
      if (city) {
        await City.findByIdAndUpdate(city, { $addToSet: { properties: _id } });
      }

      // Update State
      if (state) {
        await State.findByIdAndUpdate(state, { $addToSet: { properties: _id } });
      }
    }

    console.log('Property references updated successfully');
  } catch (error) {
    console.error('Error updating property references:', error);
  } finally {
    mongoose.connection.close();
  }
};

updatePropertyReferences();
