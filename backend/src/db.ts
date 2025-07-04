// Connexion à MongoDB (à placer dans un fichier séparé, ex: db.ts)
import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || '');
    console.log('MongoDB connecté');
  } catch (err) {
    console.error('Erreur connexion MongoDB', err);
    process.exit(1);
  }
};

export default connectDB;
