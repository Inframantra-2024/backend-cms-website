import express from 'express';
import axios from 'axios';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { PDFDocument } from 'pdf-lib';

const router = express.Router();

router.post('/convert', async (req, res) => {
    const { pdfUrl } = req.body;

    try {
        // Fetch PDF from URL
        const response = await axios.get(pdfUrl, { responseType: 'arraybuffer' });
        const pdfBytes = response.data;

        // Load the PDF
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const numPages = pdfDoc.getPageCount();

        const outputDir = path.join(__dirname, '../public/output');

        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const promises = [];

        for (let i = 0; i < numPages; i++) {
            promises.push(convertPageToImage(pdfDoc, i, outputDir));
        }

        await Promise.all(promises);

        res.json({ message: 'PDF converted to images', numPages });
    } catch (error) {
        res.status(500).json({ message: 'Failed to convert PDF', error: error.message });
    }
});

async function convertPageToImage(pdfDoc, pageIndex, outputDir) {
    const page = pdfDoc.getPage(pageIndex);
    const { width, height } = page.getSize();

    const pdfBytes = await pdfDoc.save();
    const imageBuffer = await sharp(pdfBytes)
        .extract({ width, height, left: 0, top: pageIndex * height })
        .resize({ width: 600 })
        .png()
        .toBuffer();

    const outputFilePath = path.join(outputDir, `page-${pageIndex + 1}.png`);
    fs.writeFileSync(outputFilePath, imageBuffer);
}

export default router;
