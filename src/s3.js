import express from "express";
import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);


const s3Client = new S3Client({
  endpoint: "https://blr1.digitaloceanspaces.com",
  forcePathStyle: false,
  region: "blr1",
  credentials: {
    accessKeyId: `DO00MLT7TCG3TDZZUYBP`, 
    secretAccessKey: `B8zfHHoSQAE0dgxwGuygEAEyjgt4mfcazHk+MeFdxtU`, 
  },
});

export default s3Client;


app.get("/fetch-vatika-banner", async (req, res) => {
  const bucketName = "inframantra";
  const folderName = "Vatika/"; 
  const cdnEndpoint = "https://inframantra.blr1.cdn.digitaloceanspaces.com"; 

  const params = {
    Bucket: bucketName,
    Prefix: folderName,
    MaxKeys: 5,
  };

  try {
    const data = await s3Client.send(new ListObjectsV2Command(params));

    const files = data.Contents
      ? data.Contents.map((file) => ({
          key: file.Key,
          url: `${cdnEndpoint}/${file.Key}`,
        }))
      : [];

    res.json({ files });
  } catch (err) {
    console.error("Error", err);
    res.status(500).json({ error: "Error fetching files" });
  }
});

app.get("/fetch-vatika-gallery", async (req, res) => {
  const bucketName = "inframantra";
  const folderName = "Vatika/"; 
  const cdnEndpoint = "https://inframantra.blr1.cdn.digitaloceanspaces.com"; 

  const params = {
    Bucket: bucketName,
    Prefix: folderName,
    StartAfter: `${folderName}5th_image_key`, 
  };

  try {
    const data = await s3Client.send(new ListObjectsV2Command(params));
    const files = data.Contents
      ? data.Contents.filter((file) => file.Key !== folderName).map((file) => ({
          key: file.Key,
          url: `${cdnEndpoint}/${file.Key}`,
        }))
      : [];

    res.json({ files });
  } catch (err) {
    console.error("Error", err);
    res.status(500).json({ error: "Error fetching files" });
  }
});

// app.listen(PORT, () => {
//   console.log(`Server is running on port ${PORT}`);
// });
