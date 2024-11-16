import mongoose from "mongoose";

const connectDB = async () => {
  try {
    const databaseUrl = "mongodb+srv://doadmin:K3u1F5q40y26zHj8@inframantra-db-0ac3dfb0.mongo.ondigitalocean.com/inframantra?tls=true&authSource=admin&replicaSet=inframantra-db"
    const connectionInstance = await mongoose.connect(
      // "mongodb+srv://shiwang:9QcdZQB8DApkwhCr@cluster0.j4aqvap.mongodb.net/property-testing?retryWrites=true&w=majority/property-testing",
      // "mongodb+srv://doadmin:K3u1F5q40y26zHj8@inframantra-db-0ac3dfb0.mongo.ondigitalocean.com/inframantra?tls=true&authSource=admin&replicaSet=inframantra-db",
      "mongodb://localhost:27017/Testing",
      {
        retryWrites: true,
        writeConcern: { w: "majority" },
      }
    );
    console.log(
      `\n MongoDB connected !! DB HOST: ${connectionInstance.connection.host}`
    );
  } catch (error) {
    console.log("MONGODB connection FAILED ", error);
    process.exit(1);
  }
};

export default connectDB;

